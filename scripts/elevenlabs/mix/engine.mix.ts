// The player's engine through the real game code, rendered offline (nothing plays): the countdown with the gas
// held from the 2 (a rocket start), then the race's AI driving the player (it accelerates, drifts, boosts and lets
// off), for ENGINE_SECONDS after the go. The engine loops can be swapped for a candidate set (ENGINE_DIR: a folder
// holding engine-idle.mp3, engine-mid.mp3, engine-high.mp3, decoded as the shipped ones are), and every value the
// game hands its LoopEngine each frame is logged (rpm, level, class pitch and boost rev, brightness, the limiter),
// so a live engine (src/audio/engineCore.ts) can be rendered from the very same drive.
//   ./node_modules/.bin/vitest run --config scripts/elevenlabs/mix/vitest.config.mts engine
// TAG names the outputs (<MIX_OUT>/<TAG>-engine.wav, -wheels.wav, -ctl.json); TRACK, PLAYER, SEED as render.mix.ts.
import { it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { OUT, ROOT, wavFor } from './paths.ts';
import { OfflineCtx, setTag, writeWav, QUANTUM, type Node } from './webaudio.ts';
import { AiDriver } from '../../../src/ai-driver/index.ts';
import { simTick, type SimParts } from '../../../src/game/simtick.ts';
import { Items } from '../../../src/items/items.ts';
import { SIM_DT } from '../../../src/kart-controller/step.ts';
import { NEUTRAL_INPUT, type InputState, type Vec3 } from '../../../src/kart-controller/types.ts';
import { makeConstants } from '../../../src/kart-controller/constants.ts';
import { EngineRev } from '../../../src/kart-controller/rev.ts';
import { GO_TICK, RaceManager } from '../../../src/race-manager/index.ts';
import type { RaceConfig } from '../../../src/race-manager/types.ts';
import { buildTrack } from '../../../src/track-builder/track.ts';
import { CAST } from '../../../src/ui-hud/data/cast.ts';
import { GameAudio } from '../../../src/audio/audio.ts';
import { AudioBus } from '../../../src/audio/bus.ts';
import { finishLine, type Listener } from '../../../src/audio/director.ts';
import { songForTrack } from '../../../src/audio/music/patterns.ts';
import { LoopEngine, SampleBank } from '../../../src/audio/samples.ts';
import { engineDrive } from '../../../src/audio/engine.ts';

const TRACK = process.env.TRACK ?? 'harbour-loop';
const PLAYER = process.env.PLAYER ?? 'pip';
const TAG = process.env.TAG ?? 'current';
const SEED = Number(process.env.SEED ?? 11);
const DIR = process.env.ENGINE_DIR;
const AFTER = Number(process.env.ENGINE_SECONDS ?? 17);
const FS = 44100;
const GO = GO_TICK * SIM_DT;

const handlers: Record<string, (() => void)[]> = {};
(globalThis as any).addEventListener = (ev: string, f: () => void) => { (handlers[ev] ??= []).push(f); };
(globalThis as any).document = { hidden: false };
const manifest = JSON.parse(fs.readFileSync(`${ROOT}public/audio/manifest.json`, 'utf8'));

/** A candidate loop, decoded with afconvert as the shipped files are (paths.ts wavFor). */
function candidateWav(name: string): string | null {
  if (!DIR) return null;
  const mp3 = `${DIR}/${name}.mp3`;
  if (!fs.existsSync(mp3)) return null;
  const wav = `${os.tmpdir()}/rascal-engine-${TAG}-${name}.wav`;
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEF32', mp3, wav]);
  return wav;
}

const fakeFetch = async (url: string) => {
  if (url.endsWith('manifest.json')) return { ok: true, json: async () => manifest };
  const m = /audio\/sfx\/(engine-(idle|mid|high))\.mp3$/.exec(url);
  const f = (m && candidateWav(m[1])) || wavFor(url.replace(/^\//, ''));
  if (!f) return { ok: false };
  const b = fs.readFileSync(f);
  return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
};

it(`engine ${TAG}`, async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const def = JSON.parse(fs.readFileSync(`${ROOT}src/track-builder/tracks/${TRACK}.json`, 'utf8'));
  const cast = [...CAST.filter((c) => c.id === PLAYER), ...CAST.filter((c) => c.id !== PLAYER)];
  const config: RaceConfig = { mode: 'quick', trackId: def.id, speedClass: 150, seed: SEED, racers: cast.map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: c.id === PLAYER })) };
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  const pi = manager.playerIndex, st = manager.state;
  const parts: SimParts = { manager, items, ai, inputs: st.karts.map(() => ({ ...NEUTRAL_INPUT })), playerIndex: pi, playerSlot: { ...NEUTRAL_INPUT } };
  const topSpeed = makeConstants(config.racers[pi].archetype, 150).topSpeed;
  const revs = st.karts.map((_, i) => new EngineRev(makeConstants(config.racers[i].archetype, 150)));
  const ear: Vec3 = [0, 0, 0];
  const l: Listener = { playerId: PLAYER, position: ear, heading: 0, positionOf: (id) => st.karts.find((k) => k.racerId === id)?.position };
  const Ctor = class extends OfflineCtx { constructor() { super(FS); } };
  const bus = new AudioBus(Ctor as any);
  const bank = new SampleBank('/', fakeFetch as any);
  const audio = new GameAudio(bus, bank);
  audio.setVolumes({ master: 0.8, music: 0.7, sfx: 0.8 });
  handlers.keydown[0]();
  const ctx = bus.ctx as unknown as OfflineCtx;
  await bank.load(ctx as any);
  audio.newRace(songForTrack(def.id), def.id, st.trackers[pi].shownRank, finishLine(config), true);
  // every value the game hands the player's engine, per frame (LoopEngine.set's arguments)
  const ctl: number[][] = [];
  let drive = 0;
  const origSet = LoopEngine.prototype.set;
  LoopEngine.prototype.set = function (this: LoopEngine, ...a: Parameters<LoopEngine['set']>) {
    if (this === (audio as any).loopPlayer) ctl.push([a[0], a[1], a[2], a[3] ?? 0, a[6] ?? 1, a[7] ?? 1, a[8] ?? 0, drive]);
    return origSet.apply(this, a);
  };
  const seconds = GO + AFTER, maxQ = Math.ceil((seconds * FS) / QUANTUM), N = maxQ * QUANTUM;
  const mine = new Float32Array(N), wheels = new Float32Array(N);
  let q = 0;
  (bus.sfx as unknown as Node).onInput = (from, b) => {
    const o = q * QUANTUM, lp = (audio as any).loopPlayer;
    if (from.tag !== 'engine' || !lp) return;
    const dst = from === lp.lp ? mine : wheels;
    for (let c = 0; c < b.length; c++) for (let i = 0; i < QUANTUM; i++) dst[o + i] += b[c][i] / b.length;
  };
  const input: InputState = { ...NEUTRAL_INPUT };
  for (let tick = 0; q < maxQ; tick++) {
    const t = tick * SIM_DT;
    // the grid: the gas held from the 2 (the start boost); after the go, the race's AI drives the player
    ai.drivePlayer = t >= GO;
    input.throttle = t >= 1.0 ? 1 : 0;
    simTick(parts, t >= GO ? null : input);
    for (let i = 0; i < revs.length; i++) revs[i].tick(st.karts[i], parts.inputs[i], SIM_DT, st.goTick - (st.tick - 1));
    const k = st.karts[pi];
    ear[0] = k.position[0] - Math.sin(k.heading) * 6; ear[1] = k.position[1]; ear[2] = k.position[2] - Math.cos(k.heading) * 6;
    l.heading = k.heading;
    if (tick % 2 === 0) {
      setTag('engine');
      drive = engineDrive(parts.inputs[pi].throttle, revs[pi]);
      audio.engines(k, parts.inputs[pi].throttle, topSpeed, st.karts, l, true, revs);
      setTag('misc');
    }
    while (q * QUANTUM < (tick + 1) * SIM_DT * FS && q < maxQ) { ctx.renderQuantum(); q++; }
  }
  LoopEngine.prototype.set = origSet;
  clearInterval((audio as any).timer);
  writeWav(`${OUT}/${TAG}-engine.wav`, [mine], FS, fs);
  writeWav(`${OUT}/${TAG}-wheels.wav`, [wheels], FS, fs);
  fs.writeFileSync(`${OUT}/${TAG}-ctl.json`, JSON.stringify({ fs: FS, keys: ['t', 'rpm', 'level', 'screech', 'pitch', 'bright', 'limit', 'drive'], rows: ctl.map((r) => r.map((x) => +x.toFixed(5))) }));
}, 1_800_000);
