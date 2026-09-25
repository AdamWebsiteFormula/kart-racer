import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { BASE } from '../kart-controller/constants.ts';
import { createKartState, type KartState } from '../kart-controller/types.ts';
import { TIER_RGB } from './flames.ts';
import { EMBER, MARK, PUFF, SMOKE, SPARK, streaksPerKart } from './kartfx.ts';
import { Vfx } from './vfx.ts';

const RACERS = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];

/** A kart driving along +Z at `speed`, drifting at `tier` (0: not drifting). */
function driver(racerId: string, x: number, speed: number, tier: number, mine = false): KartState {
  const k = createKartState({ racerId, isPlayer: mine, position: [x, 0, 0], heading: 0 });
  k.speed = speed;
  k.grounded = true;
  k.drift.active = tier > 0;
  k.drift.direction = 1;
  k.drift.tier = tier;
  return k;
}

/** Run `secs` of 60 fps frames, moving the karts along +Z. */
function run(vfx: Vfx, karts: KartState[], secs: number, player?: KartState): void {
  const dt = 1 / 60;
  for (let i = 0; i < secs * 60; i++) {
    for (const k of karts) k.position[2] += k.speed * dt;
    const cam = [0, 3, (player ?? karts[0]).position[2] - 6];
    vfx.frame(dt, dt, i * dt, karts, player, cam, false);
  }
}

/** Every live particle of a pool: [x, y, z] and its colour. */
function live(pool: Vfx['glow']): { p: number[]; c: number[] }[] {
  const a = pool.mesh.geometry.getAttribute('aOffset').array as Float32Array;
  const col = pool.mesh.geometry.getAttribute('aColor').array as Float32Array;
  const out: { p: number[]; c: number[] }[] = [];
  for (let i = 0; i < pool.count; i++) out.push({ p: [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]], c: [col[i * 4], col[i * 4 + 1], col[i * 4 + 2]] });
  return out;
}

describe('drift sparks (Mario Kart World: small, crisp, coloured by tier, from the rear wheels)', () => {
  it('a whole pack drifting at the top tier and boosting keeps the streaks under a small cap', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const karts = RACERS.map((id, i) => driver(id, (i - 4) * 3, 24, 3, i === 0));
    for (const k of karts) { k.boost.source = 'item'; k.boost.remaining = 30; k.boost.multiplier = 1.4; }
    run(vfx, karts, 3, karts[0]);
    const n = vfx.kartFx.sparks.count;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(RACERS.length * streaksPerKart() + 8);
    expect(streaksPerKart()).toBeLessThanOrEqual(30); // the old round sparks: 70 a second for up to 0.45 s, 31 a kart
    // fewer than the old 70 round sparks a second each, and a rival's fewer still
    expect(SPARK.rate[3]).toBeLessThan(70);
    expect(SPARK.rate[3] * SPARK.life[1]).toBeLessThan(70 * 0.45); // and shorter-lived: fewer alive at once
    expect(SPARK.rate[3] * SPARK.rival).toBeLessThan(40);
  });

  it('none while a drift is still charging, and a rival throws fewer than you', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const charging = driver('pip', 0, 24, 0);
    charging.drift.active = true;
    run(vfx, [charging], 1, charging);
    expect(vfx.kartFx.sparks.count).toBe(0);
    const mine = new Vfx(new Scene(), new PerspectiveCamera()), theirs = new Vfx(new Scene(), new PerspectiveCamera());
    const a = driver('pip', 0, 24, 2, true), b = driver('pip', 0, 24, 2);
    run(mine, [a], 1, a);
    run(theirs, [b], 1, undefined);
    expect(theirs.kartFx.sparks.count).toBeLessThan(mine.kartFx.sparks.count);
  });

  it('spray behind the rear wheels and stay there: never ahead of the kart, never far behind it', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const k = driver('juniper', 0, 25, 2, true);
    run(vfx, [k], 1.5, k);
    const pts = live(vfx.kartFx.sparks);
    expect(pts.length).toBeGreaterThan(3);
    for (const { p } of pts) {
      const along = p[2] - k.position[2];
      expect(along).toBeLessThan(0); // behind the kart's middle (the wheels are 0.6 m back)
      expect(along).toBeGreaterThan(-4.5); // a short trail, not a stream down the road
      expect(Math.abs(p[0] - k.position[0])).toBeLessThan(2.5);
    }
  });

  it('burn in the tier\'s color (blue, orange, purple), some white-hot (the tires\' glow is the kart\'s own star)', () => {
    for (const tier of [1, 2, 3]) {
      const vfx = new Vfx(new Scene(), new PerspectiveCamera());
      const k = driver('otto', 0, 22, tier, true);
      const tc = TIER_RGB[tier - 1].map((x) => x * SPARK.gain), top = tc.indexOf(Math.max(...tc));
      let tinted = 0, all = 0, pts: ReturnType<typeof live> = [];
      for (let f = 0; f < 40; f++) {
        run(vfx, [k], 0.05, k);
        pts = live(vfx.kartFx.sparks);
        all += pts.length;
        tinted += pts.filter(({ c }) => c.every((x, i) => Math.abs(x - tc[i]) < 1e-4)).length;
        // the dominant channel of every spark is the tier's (a white-hot one keeps its hue)
        for (const { c } of pts) expect(Math.max(...c)).toBeCloseTo(c[top], 5);
      }
      expect(tinted / all, `tier ${tier}`).toBeGreaterThan(0.6);
      // the tires' own glow is a star on the kart's mesh (flames.ts), not a stack of discs in the glow pool
      expect(vfx.glow.count).toBe(0);
    }
    // blue, orange and purple are three distinct hues: blue's top channel is blue, orange's red, purple's blue with red
    expect(TIER_RGB[0][2]).toBeGreaterThan(TIER_RGB[0][0]);
    expect(TIER_RGB[1][0]).toBeGreaterThan(TIER_RGB[1][2]);
    expect(TIER_RGB[2][0]).toBeGreaterThan(TIER_RGB[2][1] * 3);
  });

  it('a tier-up throws a spray of needles from both tires; reduced motion has none, and half the specks', () => {
    const count = (reduced: boolean, tier: number) => {
      const vfx = new Vfx(new Scene(), new PerspectiveCamera());
      const k = driver('pip', 0, 24, tier, true);
      vfx.frame(1 / 120, 1 / 120, 0, [k], k, [0, 3, -6], reduced);
      return vfx.kartFx.sparks.count;
    };
    // the first frame at a new tier: the needles (the steady specks come a few a frame)
    expect(count(false, 2)).toBeGreaterThanOrEqual(SPARK.burst.count * 2);
    expect(count(true, 2)).toBeLessThan(SPARK.burst.count);
    const steady = (reduced: boolean) => {
      const vfx = new Vfx(new Scene(), new PerspectiveCamera());
      const k = driver('pip', 0, 24, 1, true);
      let n = 0;
      for (let i = 0; i < 120; i++) { k.position[2] += 0.2; vfx.frame(1 / 60, 1 / 60, i / 60, [k], k, [0, 3, k.position[2] - 6], reduced); if (i > 30) n += vfx.kartFx.sparks.count; }
      return n;
    };
    expect(steady(true)).toBeLessThan(steady(false) * 0.7);
  });

  it('letting go of a drift throws a last spray in the mini-turbo\'s color, and the boost a handful of flakes', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const k = driver('otto', 0, 24, 2, true);
    const frame = (i: number) => { k.position[2] += 0.4; vfx.frame(1 / 60, 1 / 60, i / 60, [k], k, [0, 3, k.position[2] - 6], false); };
    for (let i = 0; i < 60; i++) frame(i);
    const before = vfx.kartFx.sparks.count;
    k.drift.active = false; k.drift.tier = 0;
    k.boost.source = 'drift'; k.boost.remaining = BASE.boostSeconds[1]; k.boost.multiplier = 1.3;
    frame(60);
    const orange = TIER_RGB[1].map((x) => x * SPARK.gain);
    const pts = live(vfx.kartFx.sparks);
    expect(pts.length - before).toBeGreaterThanOrEqual(SPARK.release * 2 + EMBER.burst - 4);
    expect(pts.filter(({ c }) => c.every((x, i) => Math.abs(x - orange[i]) < 1e-4)).length).toBeGreaterThan(SPARK.release / 2);
  });

  it('boost embers trail the pipes a short way in the flame\'s colour', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const k = driver('gus', 0, 25, 0, true);
    k.drift.active = true; k.drift.tier = 2; k.grounded = false; // a drift held to orange (in the air: no sparks)...
    run(vfx, [k], 0.1, k);
    k.drift.active = false; k.boost.source = 'drift'; k.boost.remaining = 1.5; k.boost.multiplier = 1.3; // ...let go
    run(vfx, [k], 0.5, k);
    const pts = live(vfx.kartFx.sparks);
    expect(pts.length).toBeGreaterThan(3);
    expect(pts.length).toBeLessThanOrEqual(Math.ceil(EMBER.rate * EMBER.life[1]) + 2);
    for (const { p, c } of pts) {
      expect(p[2] - k.position[2]).toBeLessThan(0);
      expect(p[2] - k.position[2]).toBeGreaterThan(-4);
      expect(c[0]).toBeGreaterThan(c[2]); // orange, not the racer's red-only or a blue
    }
  });
});

describe('the pipes\' breath', () => {
  /** a kart standing still, then launching hard: the puffs it leaves in the soft pool */
  it('a small, faint gray-blue puff at idle, quicker ones on a hard launch; none while cruising or boosting', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const k = driver('gus', 0, 0, 0, true);
    let t = 0;
    const run = (secs: number, accel = 0) => {
      let most = 0;
      for (let i = 0; i < secs * 60; i++) { k.speed += accel / 60; k.position[2] += k.speed / 60; t += 1 / 60; vfx.frame(1 / 60, 1 / 60, t, [k], k, [0, 3, k.position[2] - 6], false); most = Math.max(most, vfx.soft.count); }
      return most;
    };
    const idle = run(2);
    expect(idle).toBeGreaterThan(0);
    expect(idle).toBeLessThanOrEqual(Math.ceil(PUFF.idleRate * PUFF.life * 1.2) + 1);
    for (const { c } of live(vfx.soft)) { expect(c[2]).toBeGreaterThan(c[0]); expect(Math.max(...c)).toBeLessThan(1); } // gray-blue, never glowing
    const launch = run(0.5, 12);
    expect(launch).toBeGreaterThan(idle);
    vfx.soft.clear();
    k.speed = 25;
    expect(run(1)).toBe(0); // cruising: nothing
    k.speed = 0; k.boost.source = 'start'; k.boost.remaining = 5; vfx.soft.clear();
    expect(run(1)).toBe(0); // a start boost burns, it does not puff
    // faint: at most PUFF.launchAlpha opaque
    k.boost.source = 'none'; k.boost.remaining = 0; k.speed = 0; vfx.soft.clear();
    run(0.3);
    const a = vfx.soft.mesh.geometry.getAttribute('aColor').array as Float32Array;
    for (let i = 0; i < vfx.soft.count; i++) expect(a[i * 4 + 3]).toBeLessThanOrEqual(PUFF.launchAlpha + 1e-6);
  });
});

describe('a drift\'s tire smoke', () => {
  it('faint white puffs at the rear tires while drifting on the road, none off it or off the drift', () => {
    const smoke = (surface: KartState['surface'], drifting: boolean) => {
      const vfx = new Vfx(new Scene(), new PerspectiveCamera());
      const k = driver('momo', 0, 20, drifting ? 1 : 0, true);
      k.drift.active = drifting;
      k.surface = surface;
      run(vfx, [k], 0.5, k);
      return vfx.soft;
    };
    const road = smoke('road', true);
    expect(road.count).toBeGreaterThan(2);
    const a = road.mesh.geometry.getAttribute('aColor').array as Float32Array;
    for (let i = 0; i < road.count; i++) {
      expect(a[i * 4 + 3]).toBeLessThanOrEqual(SMOKE.alpha + 1e-6); // faint
      expect(a[i * 4 + 2]).toBeLessThan(1); // never glowing
    }
    expect(smoke('road', false).count).toBe(0);
    // off-road the dust takes over (its own puffs), no smoke on top of it
    const dirt = smoke('dirt', true);
    const d = dirt.mesh.geometry.getAttribute('aColor').array as Float32Array;
    expect(dirt.count).toBeGreaterThan(0);
    for (let i = 0; i < dirt.count; i++) expect([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]].every((x, j) => Math.abs(x - SMOKE.color[j]) < 1e-4)).toBe(false);
  });
});

describe('tyre marks', () => {
  it('are laid a segment per MARK.spacing metres a wheel moves (not per frame), fading in at the drift\'s start', () => {
    const vfx = new Vfx(new Scene(), new PerspectiveCamera());
    const k = driver('pip', 0, 20, 1, true);
    const ink = vfx.skids.mesh.geometry.getAttribute('aInk').array as Float32Array;
    const birth = vfx.skids.mesh.geometry.getAttribute('aBirth').array as Float32Array;
    run(vfx, [k], 1, k); // 20 m of drifting
    let quads = 0;
    for (let q = 0; q < birth.length / 4; q++) if (birth[q * 4] > -1e5) quads++;
    const perWheel = quads / 2;
    // each segment is at least MARK.spacing long, and at most that plus one frame of travel (1/3 m at 20 m/s)
    expect(perWheel).toBeLessThanOrEqual(20 / MARK.spacing);
    expect(perWheel).toBeGreaterThan(20 / (MARK.spacing + 1 / 3) - 2);
    expect(ink[0]).toBe(0); // the first mark starts from nothing
    expect(ink[(quads - 1) * 4 + 2]).toBe(1); // and is full once the drift has run MARK.rampIn
  });
});
