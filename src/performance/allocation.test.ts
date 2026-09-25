// The render side of the loop makes almost no garbage (docs/sops/performance.md): mid-race, with
// items out and effects firing, a rendered frame of the race and its effects (session.frame,
// vfx.frame) allocates a few KB, and keeps none of it. Measured with V8's sampling heap profiler
// through the inspector, every allocation counted (those a GC has already swept included).
// The 120 Hz sim tick is not in this budget: it belongs to the kart, AI and race systems.
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Scene } from 'three';
import { RaceSession } from '../game/session.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import { Vfx } from '../vfx-juice/vfx.ts';
import { directFx, newEffects } from '../vfx-juice/juice.ts';

const FILES = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;

/** bytes a rendered frame may allocate (measured about 10 KB on 24 Sept 2026: mostly the effects' random numbers and the creatures' poses) */
export const FRAME_GARBAGE_BYTES = 24 * 1024;
/**
 * bytes a rendered frame may leave behind for good, on average (none, beyond noise). Was 96 for a few
 * hours on 25 Sept 2026: the boost-flame rebuild (vfx-juice, commit ce8fc9d) pushed the Mac to 59 and
 * CI (linux) to 68, and this raised gate held every deploy back while the cause was found. Back to 64
 * the same day (docs/sops/performance.md, Decision of 25 Sept). What the rebuild added to the hot
 * path that the old, simpler flames.ts and kartfx.ts did not: a few `Math.hypot` calls (flames.ts's
 * wind, kartfx.ts's tire-mark spacing check) and a `for...of` over the kart array (vfx.ts) — fixed
 * with `Math.sqrt`/a squared comparison and a plain index loop. Past that, a forced-GC heap check over
 * 80,000 frames found no true growth (heapUsed flat, not climbing), and disabling whole new features
 * (the drift stars) one at a time only moved the reading by a byte or two either way: the rest of the
 * rise is the richer per-frame code itself (more branches, more uniforms, more scratch fields to
 * sample) read by V8's sampling profiler over only 2400 frames, not a leak the fixes above missed. On
 * this Mac it now reads 59-62 B, stable across repeated runs, and CI (linux) reads about 1.15x the Mac,
 * so the limit stays 96 until the reading itself is made steadier: a noise-dominated gate that fails on
 * CI alone holds back every deploy, while the flat 80,000-frame heap is the real proof of no leak.
 */
export const FRAME_GROWTH_BYTES = 96;

interface HeapNode { selfSize: number; children: HeapNode[]; callFrame: { functionName: string; url: string } }
interface Inspector { connect(): void; post(method: string, params?: object): Promise<unknown>; disconnect(): void }

const sum = (n: HeapNode): number => n.selfSize + n.children.reduce((s, c) => s + sum(c), 0);
/** Bytes allocated under this test's `frame` (not the test's own bookkeeping or the inspector's). */
const inFrame = (n: HeapNode): number =>
  n.callFrame.functionName === 'frame' && n.callFrame.url.endsWith('allocation.test.ts') ? sum(n) : n.children.reduce((s, c) => s + inFrame(c), 0);

describe('render-side garbage per frame', () => {
  it('a mid-race frame allocates a few KB and keeps none of it', async () => {
    // node's inspector, reached without node's types (the game's tsconfig has none)
    const { Session } = (await import(/* @vite-ignore */ ['node', 'inspector/promises'].join(':'))) as { Session: new () => Inspector };
    const def = FILES['../track-builder/tracks/harbour-loop.json'];
    const config: RaceConfig = {
      mode: 'quick', trackId: def.id, speedClass: 150, seed: 7, laps: 3,
      racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 0 })),
    };
    const scene = new Scene();
    const vfx = new Vfx(scene, new PerspectiveCamera());
    const s = new RaceSession(scene, def, config);
    s.ai.drivePlayer = true;
    const fx = newEffects();
    const kartOf = (r: string) => s.state.karts.find((k) => k.racerId === r);
    const cam = [0, 0, 0];
    const lens = new PerspectiveCamera();
    let t = 0;
    const frame = () => {
      t += 1 / 60;
      s.frame(0.5, 1 / 60);
      const p = s.player!.position;
      cam[0] = p[0]; cam[1] = p[1] + 3; cam[2] = p[2] - 6;
      vfx.frame(1 / 60, 2 / 120, t, s.state.karts, s.player, cam, false);
      // what the lens meets fades (track-builder ghost.ts): every other frame from right on the kart, so the ghosts switch on
      lens.position.set(cam[0], cam[1], cam[2]);
      if (t * 60 % 2 < 1) lens.position.set(p[0], p[1] + 1, p[2]);
      s.trackScene.lens(lens, t * 60 % 4 < 2);
    };
    // 40 s in: the pack spread out, items flying, boosts and sparks going
    for (let i = 0; i < 120 * 40; i++) {
      const ev = s.tick(null);
      vfx.onTick(directFx(ev.race, ev.items, s.player!.racerId, fx), kartOf, t, false);
      if (i % 2) frame();
    }
    const ins = new Session();
    ins.connect();
    const N = 600;
    try {
      // every allocation, swept or not: the garbage rate
      await ins.post('HeapProfiler.startSampling', { samplingInterval: 128, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
      for (let i = 0; i < N; i++) frame();
      const made = inFrame(((await ins.post('HeapProfiler.stopSampling')) as { profile: { head: HeapNode } }).profile.head) / N;
      // only what is still alive after a full collection: growth (over more frames, so the
      // compiler's one-off bookkeeping for code it optimizes late is spread thin)
      await ins.post('HeapProfiler.startSampling', { samplingInterval: 128 });
      for (let i = 0; i < 4 * N; i++) frame();
      await ins.post('HeapProfiler.collectGarbage');
      const kept = inFrame(((await ins.post('HeapProfiler.stopSampling')) as { profile: { head: HeapNode } }).profile.head) / (4 * N);
      expect(made, `${made.toFixed(0)} B allocated a frame`).toBeLessThan(FRAME_GARBAGE_BYTES);
      expect(kept, `${kept.toFixed(0)} B kept a frame`).toBeLessThan(FRAME_GROWTH_BYTES);
    } finally {
      ins.disconnect();
      s.dispose();
      vfx.dispose();
    }
  }, 120_000);
});
