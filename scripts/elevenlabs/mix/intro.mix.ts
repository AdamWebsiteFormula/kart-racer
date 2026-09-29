// A race start rendered offline (docs/sops/audio.md, 28 Sept 2026: the course intro's music): the menus' title
// song, the pick (the menu's confirm and the pick's sting), the race loading, the course intro's flight under its
// music, the countdown on the real sim and the GO, through the real GameAudio and the real recordings into the
// offline Web Audio, fed as main.ts feeds it. Reports the music's level (and the cues') every 50 ms from the pick
// to past the GO, with the moments marked, and checks the intro's music is silent at the countdown's first beep.
// Nothing is played: WAV stems and a JSON report are written (MIX_OUT).
//   ./node_modules/.bin/vitest run --config scripts/elevenlabs/mix/vitest.config.mts intro
// TRACK (a comma list; all six by default), FLIGHT=short (Time Trial's and the Daily's 2.5 s) and SKIP=<s> (skipped then).
import { expect, it } from 'vitest';
import fs from 'node:fs';
import { OUT, ROOT, wavFor } from './paths.ts';
import { OfflineCtx, writeWav, QUANTUM, type Node } from './webaudio.ts';
import { Chain, kCoefs, lufs } from './dsp.ts';
import { AiDriver } from '../../../src/ai-driver/index.ts';
import { simTick, type SimParts } from '../../../src/game/simtick.ts';
import { INTRO } from '../../../src/game/intro.ts';
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
import { AUDIO } from '../../../src/audio/constants.ts';
import { finishLine, type Listener } from '../../../src/audio/director.ts';
import { songForTrack } from '../../../src/audio/music/patterns.ts';
import { SampleBank } from '../../../src/audio/samples.ts';

const TRACKS = (process.env.TRACK ?? 'harbour-loop,meadow-run,canyon-rush,frostbite-pass,boardwalk-nights,skyline-circuit').split(',');
const FLIGHT = Object.values(process.env.FLIGHT === 'short' ? INTRO.short : INTRO.full).reduce((a, b) => a + b, 0);
const SKIP = process.env.SKIP ? Number(process.env.SKIP) : null;
const PLAYER = 'pip', SEED = 11, FS = 44100;
/** the menus before the pick, and the race loading after it (its shaders compiling while the title card sits on ink) */
const MENUS = 3, LOAD = 0.8;
/** a level hop (s) */
const HOP = 0.05;

const handlers: Record<string, (() => void)[]> = {};
(globalThis as any).addEventListener = (ev: string, f: () => void) => { (handlers[ev] ??= []).push(f); };
(globalThis as any).document = { hidden: false };
const manifest = JSON.parse(fs.readFileSync(`${ROOT}public/audio/manifest.json`, 'utf8'));
const fakeFetch = async (url: string) => {
  if (url.endsWith('manifest.json')) return { ok: true, json: async () => manifest };
  if (url.endsWith('voice.json')) return { ok: false };
  const f = wavFor(url.replace(/^\//, ''));
  if (!f) return { ok: false };
  const b = fs.readFileSync(f);
  return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
};
const flush = () => new Promise((r) => setImmediate(r));

for (const TRACK of TRACKS) {
  it(`the race start on ${TRACK}: the pick, the intro's music under the flight, silent at the first beep, the race song on the go`, async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const def = JSON.parse(fs.readFileSync(`${ROOT}src/track-builder/tracks/${TRACK}.json`, 'utf8'));
    const cast = [...CAST.filter((c) => c.id === PLAYER), ...CAST.filter((c) => c.id !== PLAYER)];
    const config: RaceConfig = { mode: 'quick', trackId: def.id, speedClass: 150, seed: SEED, racers: cast.map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: c.id === PLAYER })) };
    const track = buildTrack(def);
    const manager = new RaceManager(track, config);
    const items = new Items(track, manager);
    const ai = new AiDriver(track, config, manager.state, { itemRoles: items.roles });
    ai.drivePlayer = true;
    const pi = manager.playerIndex, st = manager.state;
    const parts: SimParts = { manager, items, ai, inputs: st.karts.map(() => ({ ...NEUTRAL_INPUT })), playerIndex: pi, playerSlot: { ...NEUTRAL_INPUT } };
    const topSpeed = makeConstants(config.racers[pi].archetype, 150).topSpeed;
    const ear: Vec3 = [0, 0, 0];
    const l: Listener = { playerId: PLAYER, position: ear, heading: 0, positionOf: (id) => st.karts.find((k) => k.racerId === id)?.position };
    const follow = () => { const k = st.karts[pi]; ear[0] = k.position[0] - Math.sin(k.heading) * 12; ear[1] = k.position[1]; ear[2] = k.position[2] - Math.cos(k.heading) * 12; l.heading = k.heading; };

    const Ctor = class extends OfflineCtx { constructor() { super(FS); } };
    const bus = new AudioBus(Ctor as any);
    const bank = new SampleBank('/', fakeFetch as any);
    const audio = new GameAudio(bus, bank);
    audio.setVolumes({ master: 0.8, music: 0.7, sfx: 0.8, voice: 0.8 });
    handlers.keydown.at(-1)!(); // this GameAudio's own unlock (each one adds its listeners)
    const ctx = bus.ctx as unknown as OfflineCtx;
    await bank.load(ctx as any);

    // the stems: the music (into the master, after its bus: its slider, duck, pocket and low-pass), the cues, the mix
    const N = Math.ceil((MENUS + LOAD + FLIGHT + 3 + 6) * FS / QUANTUM) * QUANTUM;
    const stems = { music: [new Float32Array(N), new Float32Array(N)], cues: [new Float32Array(N), new Float32Array(N)], out: [new Float32Array(N), new Float32Array(N)] };
    let q = 0;
    const add = (dst: Float32Array[], b: Float32Array[]) => { const o = q * QUANTUM; if (o + QUANTUM > N) return; for (let c = 0; c < 2; c++) { const s = b[Math.min(c, b.length - 1)], d = dst[c]; for (let i = 0; i < QUANTUM; i++) d[o + i] += s[i]; } };
    (bus.master as unknown as Node).onInput = (from, b) => { if (from === (bus.musicFilter as unknown)) add(stems.music, b); };
    (bus.sfx as unknown as Node).onInput = (_from, b) => add(stems.cues, b);
    const renderTo = async (t: number) => { while (q * QUANTUM < t * FS && (q + 1) * QUANTUM <= N) { add(stems.out, ctx.renderQuantum()); q++; if (q % 64 === 0) await flush(); } };
    const engines = (on: boolean) => { follow(); audio.engines(st.karts[pi], parts.inputs[pi].throttle, topSpeed, st.karts, l, on); };

    // the menus: the title song
    const marks: Record<string, number> = {};
    audio.play('title');
    await flush(); await flush();
    await renderTo(MENUS);
    // the pick: the menu's confirm, the pick's sting (main.ts host.startRace), the race loading (load: newRace)
    marks.pick = ctx.currentTime;
    audio.ui('confirm');
    audio.raceChosen();
    audio.newRace(songForTrack(def.id), def.id, st.trackers[pi].shownRank, finishLine(config), true);
    for (let i = 0; i < 8; i++) await flush();
    await renderTo(marks.pick + LOAD);
    // the flight's first frame (main.ts step: intro.moving), its music; the engines idle on the grid meanwhile
    marks.flight = ctx.currentTime;
    audio.courseIntro(FLIGHT);
    for (let i = 0; i < 8; i++) await flush();
    const over = marks.flight + (SKIP ?? FLIGHT);
    while (ctx.currentTime < over - 1e-9) { engines(true); await renderTo(Math.min(over, ctx.currentTime + 1 / 60)); }
    // the flight over (or skipped): the countdown from this frame (main.ts endIntro), then the race
    audio.introOver();
    marks.countdown = ctx.currentTime;
    for (let tick = 0; ; tick++) {
      const ev = simTick(parts, null);
      for (const e of ev.race) {
        if (e.type === 'countdown' && marks.firstBeep === undefined) marks.firstBeep = ctx.currentTime;
        if (e.type === 'go') marks.go = ctx.currentTime;
      }
      audio.tick(ev.race, ev.items, l);
      if (tick % 2 === 0) { engines(true); audio.input(st.karts[pi], parts.inputs[pi]); }
      await renderTo(marks.countdown + (tick + 1) * SIM_DT);
      if (tick % 8 === 0) await flush();
      if (marks.go !== undefined && ctx.currentTime > marks.go + 5) break;
    }
    clearInterval((audio as any).timer);

    // the levels: K-weighted power per 50 ms hop (a momentary level in LUFS), of the music and of the cues
    const hop = Math.round(HOP * FS), n = Math.floor(q * QUANTUM / hop);
    const level = (chs: Float32Array[]) => {
      const ks = [new Chain(kCoefs(FS)), new Chain(kCoefs(FS))], out: number[] = [];
      for (let h = 0; h < n; h++) {
        let p = 0;
        for (let c = 0; c < 2; c++) for (let i = h * hop; i < (h + 1) * hop; i++) { const y = ks[c].run(chs[c][i]); p += y * y; }
        out.push(Math.max(-99, Math.round(lufs(p / hop) * 10) / 10));
      }
      return out;
    };
    const music = level(stems.music), cues = level(stems.cues);
    const at = (t: number) => Math.min(n - 1, Math.floor(t / HOP));
    const cue = (audio as any).introCue as { endsAt: number } | null;
    const report = {
      track: TRACK, flight: FLIGHT, skip: SKIP, marks, introEnds: cue?.endsAt ?? null, hop: HOP, music, cues,
      // the loudest the music is in each stretch
      peaks: {
        menus: Math.max(...music.slice(at(1), at(marks.pick))),
        load: Math.max(...music.slice(at(marks.pick + 0.5), at(marks.flight))),
        flight: Math.max(...music.slice(at(marks.flight), at(marks.countdown))),
        countdown: Math.max(...music.slice(at(marks.firstBeep), at(marks.go))),
        race: Math.max(...music.slice(at(marks.go + 0.2), at(marks.go + 4))),
      },
    };
    const tag = `intro-${TRACK}${process.env.FLIGHT === 'short' ? '-short' : ''}${SKIP !== null ? `-skip${SKIP}` : ''}`;
    fs.writeFileSync(`${OUT}/${tag}.json`, JSON.stringify(report));
    for (const [name, s] of Object.entries(stems)) writeWav(`${OUT}/${tag}-${name}.wav`, s.map((c) => c.subarray(0, q * QUANTUM)), FS, fs);
    const fmt = (t: number) => (t - marks.pick).toFixed(2);
    console.log(`${TRACK} (${FLIGHT.toFixed(1)} s flight${SKIP !== null ? `, skipped at ${SKIP} s` : ''}): pick 0, flight ${fmt(marks.flight)}, intro silent ${cue ? fmt(cue.endsAt) : '-'}, first beep ${fmt(marks.firstBeep)}, go ${fmt(marks.go)} (s after the pick); music peaks (LUFS, 50 ms): ${JSON.stringify(report.peaks)}`);
    // the checks the render is for: music under the flight, silent at the first beep and through the countdown, the race song after the go
    expect(report.peaks.flight, 'music under the flight').toBeGreaterThan(-40);
    // (skipped: the countdown comes at once, under the skip's fast fade)
    const quiet = SKIP === null ? marks.firstBeep - HOP : marks.firstBeep + AUDIO.intro.skipFade + 0.05 + HOP;
    expect(Math.max(...music.slice(at(quiet), at(marks.go) + 1)), 'no music from just before the first beep (a skip: its fade) to the go').toBeLessThan(-70);
    expect(report.peaks.race, 'the race song after the go').toBeGreaterThan(-40);
    if (SKIP === null) expect(cue!.endsAt).toBeLessThanOrEqual(marks.firstBeep - AUDIO.intro.breath + 0.03);
  }, 600_000);
}
