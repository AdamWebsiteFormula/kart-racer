// Drive the real GameAudio (bus, director, samples, engines, songs, voice lines) through a real headless
// 8-kart race into the offline Web Audio, and write the mix, its stems and a per-cue log. No sound plays.
// Every racer line said is logged (`barks`), with the race's moments a line could have been said at
// (`moments`); CENSUS=1 runs the same race and the same GameAudio without the DSP (no WAVs), to count
// the lines of many races quickly (barks.mix.ts reads the logs).
import { it } from 'vitest';
import fs from 'node:fs';
import { OUT, ROOT, wavFor } from './paths.ts';
import { OfflineCtx, setTag, writeWav, QUANTUM, CURRENT_TAG, type Node, type DynamicsCompressorNode } from './webaudio.ts';
import { Chain, kCoefs, bandCoefs } from './dsp.ts';
import { AiDriver } from '../../../src/ai-driver/index.ts';
import { simTick, type SimParts } from '../../../src/game/simtick.ts';
import { Items } from '../../../src/items/items.ts';
import { SIM_DT } from '../../../src/kart-controller/step.ts';
import { NEUTRAL_INPUT, type Vec3 } from '../../../src/kart-controller/types.ts';
import { makeConstants } from '../../../src/kart-controller/constants.ts';
import { RaceManager } from '../../../src/race-manager/index.ts';
import type { RaceConfig } from '../../../src/race-manager/types.ts';
import { buildTrack } from '../../../src/track-builder/track.ts';
import { CAST } from '../../../src/ui-hud/data/cast.ts';
import { GameAudio } from '../../../src/audio/audio.ts';
import { AudioBus } from '../../../src/audio/bus.ts';
import { finishLine, type Listener } from '../../../src/audio/director.ts';
import { songForTrack } from '../../../src/audio/music/patterns.ts';
import { SampleBank } from '../../../src/audio/samples.ts';
import { Barker, BARKS } from '../../../src/audio/barks.ts';
import type { BarkCue } from '../../../src/audio/types.ts';
import type { RaceEvent } from '../../../src/race-manager/types.ts';
import type { ItemEvent } from '../../../src/items/types.ts';

const TRACK = process.env.TRACK ?? 'harbour-loop';
const PLAYER = process.env.PLAYER ?? 'pip';
const TAG = process.env.TAG ?? 'before';
const SEED = Number(process.env.SEED ?? 11);
const CENSUS = !!process.env.CENSUS;
const FS = 44100, HOP = 441; // 10 ms hops
const RESULTS_AFTER = 2.5;
const SILENT = [new Float32Array(QUANTUM), new Float32Array(QUANTUM)];
const WORLD = new Set(['roar', 'stomp', 'yetiThrow', 'snowThud', 'krakenRise', 'krakenSlam', 'crabClack', 'honk', 'whaleSong', 'tailSlap', 'ventWarn', 'geyser', 'steamVent', 'bounce', 'pop']);

const handlers: Record<string, (() => void)[]> = {};
(globalThis as any).addEventListener = (ev: string, f: () => void) => { (handlers[ev] ??= []).push(f); };
(globalThis as any).document = { hidden: false };

const manifest = JSON.parse(fs.readFileSync(`${ROOT}public/audio/manifest.json`, 'utf8'));
const voices = JSON.parse(fs.readFileSync(`${ROOT}public/audio/voice.json`, 'utf8'));
const fakeFetch = async (url: string) => {
  if (url.endsWith('manifest.json')) return { ok: true, json: async () => manifest };
  if (url.endsWith('voice.json')) return { ok: true, json: async () => voices };
  const f = wavFor(url.replace(/^\//, ''));
  if (!f) return { ok: false };
  const b = fs.readFileSync(f);
  return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
};

interface CueRec { id: string; t: number; gain: number; pan: number; cls: string; played: boolean; q0: number; k: Chain[]; b: Chain[]; kh: number[]; bh: number[]; peak: number }

it(`render ${TRACK}`, async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const def = JSON.parse(fs.readFileSync(`${ROOT}src/track-builder/tracks/${TRACK}.json`, 'utf8'));
  const cast = [...CAST.filter((c) => c.id === PLAYER), ...CAST.filter((c) => c.id !== PLAYER)];
  const config: RaceConfig = { mode: 'quick', trackId: def.id, speedClass: 150, seed: SEED, racers: cast.map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: c.id === PLAYER })) };
  const track = buildTrack(def);
  const manager = new RaceManager(track, config);
  const items = new Items(track, manager);
  const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
  ai.drivePlayer = true;
  const pi = manager.playerIndex;
  const parts: SimParts = { manager, items, ai, inputs: manager.state.karts.map(() => ({ ...NEUTRAL_INPUT })), playerIndex: pi, playerSlot: { ...NEUTRAL_INPUT } };
  const st = manager.state;
  const topSpeed = makeConstants(config.racers[pi].archetype, 150).topSpeed;
  const ear: Vec3 = [0, 0, 0];
  const l: Listener = { playerId: PLAYER, position: ear, heading: 0, positionOf: (id) => st.karts.find((k) => k.racerId === id)?.position };

  const Ctor = class extends OfflineCtx { constructor() { super(FS); } };
  const bus = new AudioBus(Ctor as any);
  const bank = new SampleBank('/', fakeFetch as any);
  const audio = new GameAudio(bus, bank);
  audio.setVolumes(process.env.FULL ? { master: 1, music: 1, sfx: 1, voice: 1 } : { master: 0.8, music: 0.7, sfx: 0.8, voice: 0.8 });
  // the lines' chances rolled from the race's seed (the game's barker is seeded by the clock)
  (audio as any).barker = new Barker(SEED);
  handlers.keydown[0]();
  const ctx = bus.ctx as unknown as OfflineCtx;
  await bank.load(ctx as any);
  await bank.loadVoices(ctx as any);
  if (CENSUS) {
    // the same race and the same GameAudio, the clock stepped without the DSP: nothing is rendered
    const c = ctx as any;
    c.renderQuantum = () => { c.q++; c.currentTime = c.q * QUANTUM / c.sampleRate; for (const f of c.cbs.splice(0)) f(); return SILENT; };
  }
  // every line said, and every moment a line could have been said at (the player's, and a rival's
  // with its distance from the ear)
  const barks: (BarkCue & { t: number; own: boolean; seconds: number })[] = [];
  const say = (audio as any).say.bind(audio);
  (audio as any).say = (b: BarkCue, own: boolean) => {
    const s = bank.voiceLine(b.racerId, b.bark, b.n);
    barks.push({ ...b, t: ctx.currentTime, own, seconds: s ? s.end - s.start : 0 });
    const prev = CURRENT_TAG;
    setTag('voice');
    say(b, own);
    setTag(prev);
  };
  const moments: { t: number; racerId: string; kind: string; d: number; by?: string; detail?: string | number }[] = [];
  const dist = (id: string) => { const p = l.positionOf(id); return p ? Math.hypot(p[0] - ear[0], p[2] - ear[2]) : Infinity; };
  const moment = (racerId: string, kind: string, extra: { by?: string; detail?: string | number } = {}) =>
    moments.push({ t: ctx.currentTime, racerId, kind, d: racerId === PLAYER ? 0 : Math.round(dist(racerId) * 10) / 10, ...extra });
  let rank: number | null = st.trackers[pi].shownRank;
  const noteMoments = (race: readonly RaceEvent[], its: readonly ItemEvent[]) => {
    for (const e of race) {
      if (e.type === 'lap') moment(e.racerId, 'lap', { detail: e.isFinal ? 'final' : e.lap });
      else if (e.type === 'finish') moment(e.racerId, 'finish', { detail: e.rank });
      else if (e.type === 'positionChange' && e.racerId === PLAYER) { if (rank !== null && e.rank !== rank) moment(PLAYER, e.rank < rank ? 'pass' : 'passed', { detail: e.rank }); rank = e.rank; }
      else if (e.type === 'kart') {
        const k = e.event;
        if (k.type === 'trick' || k.type === 'hit' || k.type === 'bump' || k.type === 'wall') moment(e.racerId, k.type, k.type === 'bump' ? { by: k.otherId } : {});
        else if (k.type === 'boostStart') moment(e.racerId, `boost:${k.source}`, { detail: Math.round(k.seconds * 100) / 100 });
      }
    }
    for (const e of its) {
      if (e.type === 'hit') moment(e.racerId, 'itemHit', { by: e.byRacerId, detail: e.itemId });
      else if (e.type === 'itemUsed') moment(e.racerId, 'itemUse', { detail: e.itemId });
    }
  };

  const maxQ = Math.ceil(260 * FS / QUANTUM), N = maxQ * QUANTUM;
  const mk = () => (CENSUS ? [new Float32Array(0), new Float32Array(0)] : [new Float32Array(N), new Float32Array(N)]);
  const stems = { music: mk(), engine: mk(), cues: mk(), voice: mk(), out: mk() };
  const add = (dst: Float32Array[], b: Float32Array[], q: number) => { const o = q * QUANTUM; for (let c = 0; c < 2; c++) { const s = b[Math.min(c, b.length - 1)], d = dst[c]; for (let i = 0; i < QUANTUM; i++) d[o + i] += s[i]; } };
  let q = 0;
  const cues: CueRec[] = [];
  const kc = kCoefs(FS), bc = bandCoefs(FS);
  (bus.master as unknown as Node).onInput = (from, b) => { if (from === (bus.musicFilter as unknown)) add(stems.music, b, q); };
  (bus.voice as unknown as Node).onInput = (_from, b) => add(stems.voice, b, q);
  const extraStats: Record<string, { blocks: number; power: number }> = {};
  const extraOf = new Map<unknown, string>();
  (bus.sfx as unknown as Node).onInput = (from, b) => {
    if (from.tag === 'engine') {
      add(stems.engine, b, q);
      const lp = (audio as any).loopPlayer;
      if (lp?.extras) for (const [id, x] of lp.extras) extraOf.set(x.g, id);
      const id = extraOf.get(from);
      if (id) { let p = 0; for (const c of b) for (let i = 0; i < QUANTUM; i++) p += c[i] * c[i]; p /= QUANTUM * b.length; if (p > 1e-9) { const e = (extraStats[id] ??= { blocks: 0, power: 0 }); e.blocks++; e.power += p; } }
      return;
    }
    add(stems.cues, b, q);
    if (typeof from.tag !== 'number') return;
    const c = cues[from.tag];
    if (!c.played) { c.played = true; c.q0 = q; }
    for (let i = 0; i < QUANTUM; i++) {
      const hop = Math.floor(((q - c.q0) * QUANTUM + i) / HOP);
      let pk = 0, pb = 0;
      for (let ch = 0; ch < 2; ch++) {
        const x = b[Math.min(ch, b.length - 1)][i];
        if (Math.abs(x) > c.peak) c.peak = Math.abs(x);
        const y = c.k[ch].run(x), z = c.b[ch].run(x);
        pk += y * y; pb += z * z;
      }
      c.kh[hop] = (c.kh[hop] ?? 0) + pk / HOP; c.bh[hop] = (c.bh[hop] ?? 0) + pb / HOP;
    }
  };
  const origSfx = audio.sfx.bind(audio);
  (audio as any).sfx = (id: string, gain = 1, pan = 0, pitch = 1) => {
    const prev = CURRENT_TAG;
    const cls = WORLD.has(id) ? 'world' : gain > 0.61 || /^(count|go|lap|finalLap|finish|finishLow|shift|gainPlace|losePlace|wrongWay|respawn|itemReady|coin|hitConfirm|rouletteTick|horn:.*|ui.*|koOut|koSafe)$/.test(id) ? 'player' : 'rival';
    cues.push({ id, t: ctx.currentTime, gain, pan, cls, played: false, q0: 0, k: [new Chain(kc), new Chain(kc)], b: [new Chain(bc), new Chain(bc)], kh: [], bh: [], peak: 0 });
    setTag(cues.length - 1);
    const v = origSfx(id as any, gain, pan, pitch);
    setTag(prev);
    return v;
  };
  const lim = ctx.destination.inputs[0] as DynamicsCompressorNode, comp = lim.inputs[0] as DynamicsCompressorNode; if (!(comp as any).makeup) throw new Error("graph");
  const grComp: number[] = [], grLim: number[] = [];

  const flush = () => new Promise((r) => setImmediate(r));
  const renderTo = (t: number) => {
    while (q * QUANTUM < t * FS && q < maxQ) {
      const b = ctx.renderQuantum();
      if (!CENSUS) { add(stems.out, b, q); grComp.push(comp.reduction); grLim.push(lim.reduction); }
      q++;
    }
  };
  audio.newRace(songForTrack(def.id), def.id, st.trackers[pi].shownRank, finishLine(config), true);
  await flush(); await flush();
  const marks: Record<string, number> = {};
  let racing = true, overFor = 0, tick = 0;
  for (; q < maxQ; tick++) {
    const ev = simTick(parts, null);
    const k = st.karts[pi];
    ear[0] = k.position[0] - Math.sin(k.heading) * 12; ear[1] = k.position[1]; ear[2] = k.position[2] - Math.cos(k.heading) * 12;
    l.heading = k.heading;
    for (const e of ev.race) {
      if (e.type === 'go') marks.go = ctx.currentTime;
      if (e.type === 'lap' && e.racerId === PLAYER && e.isFinal) marks.finalLap = ctx.currentTime;
      if (e.type === 'finish' && e.racerId === PLAYER) marks.finish = ctx.currentTime;
      if (e.type === 'trackChanged') marks.shift = ctx.currentTime;
    }
    if (racing) { noteMoments(ev.race, ev.items); audio.tick(ev.race, ev.items, l); }
    if (st.phase === 'finished') overFor += SIM_DT;
    if (racing && overFor > RESULTS_AFTER) { racing = false; marks.results = ctx.currentTime; audio.play('results'); }
    if (tick % 2 === 0) {
      setTag('engine');
      audio.engines(k, parts.inputs[pi].throttle, topSpeed, st.karts, l, racing);
      setTag('misc');
      if (racing) audio.input(k, parts.inputs[pi]);
    }
    renderTo((tick + 1) * SIM_DT);
    if (tick % 4 === 0) await flush();
    if (!racing && (CENSUS || ctx.currentTime > marks.results + 6)) break;
  }
  clearInterval((audio as any).timer);
  const n = q * QUANTUM;
  const said = { track: TRACK, player: PLAYER, seed: SEED, census: CENSUS, marks, rules: BARKS, barks, moments };
  fs.mkdirSync(`${OUT}/barks`, { recursive: true });
  fs.writeFileSync(`${OUT}/barks/${TAG}-${TRACK}-${PLAYER}-s${SEED}.json`, JSON.stringify(said));
  console.log(`${TRACK} ${PLAYER} seed ${SEED}: ${barks.length} lines (${barks.filter((b) => b.own).length} the player's) in ${((marks.finish ?? ctx.currentTime) - (marks.go ?? 0)).toFixed(0)} s of race: ${barks.map((b) => `${b.t.toFixed(1)} ${b.racerId}:${b.bark}`).join(', ')}`);
  if (CENSUS) return;
  for (const [name, s] of Object.entries(stems)) writeWav(`${OUT}/${TAG}-${TRACK}-${name}.wav`, s.map((c) => c.subarray(0, n)), FS, fs);
  const log = {
    track: TRACK, player: PLAYER, seconds: n / FS, marks, masterGain: (bus.master as any).gain.value,
    makeup: { comp: comp.makeup(), lim: lim.makeup() },
    grComp, grLim, extras: Object.fromEntries(Object.entries(extraStats).map(([k, v]) => [k, { seconds: v.blocks * QUANTUM / FS, meanDb: 10 * Math.log10(v.power / v.blocks) }])),
    cues: cues.map((c) => ({ id: c.id, t: c.t, gain: c.gain, pan: c.pan, cls: c.cls, played: c.played, start: c.q0 * QUANTUM / FS, kh: c.kh, bh: c.bh, peak: c.peak })),
  };
  fs.writeFileSync(`${OUT}/${TAG}-${TRACK}.json`, JSON.stringify(log));
  console.log(`rendered ${(n / FS).toFixed(1)} s, ${cues.length} cues (${cues.filter((c) => c.played).length} played), marks ${JSON.stringify(marks)}`);
}, 1_800_000);
