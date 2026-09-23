// Review regressions for ramps: a ramp stops at the road edge (no invisible wedge, no launch
// on the shoulder), backing into a ramp's lip is a wall, and projectiles ride over ramps and bumps.
import { describe, expect, it } from 'vitest';
import frostbiteJson from '../track-builder/tracks/frostbite-pass.json';
import { buildTrack, type Track } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { cloneDef, OVAL } from '../race-manager/__tests__/fixtures.ts';
import { give, go, kart, placeAt, press, setup, tick } from '../items/__tests__/harness.ts';
import type { ItemEvent } from '../items/types.ts';
import { makeConstants } from './constants.ts';
import { jumpLift, lateralOffset, stepGround } from './ground.ts';
import { SIM_DT, stepKart, stepKarts } from './step.ts';
import { createKartState, headingOf, NEUTRAL_INPUT, type KartEvent, type KartState, type TrackJump, type TrackQuery } from './types.ts';
import { makeOval } from './__tests__/oval-stub.ts';

const c = makeConstants('medium', 150);
const DT = SIM_DT;

/** A kart on the road at t, `lateral` metres right of the centreline, facing down the road. */
function kartAt(track: TrackQuery, t: number, lateral: number, speed: number): KartState {
  const p = track.sample(t, lateral, 0);
  const s = createKartState({ racerId: 'x', position: [...p.position], heading: headingOf(p.tangent), t });
  s.speed = speed;
  return s;
}

/** Height above the plain road the kart stands at (the ramp or bump under it, or nothing). */
function liftUnder(track: TrackQuery, s: KartState): number {
  const { lateral } = lateralOffset(track, s.t, s.position, s.branch);
  return s.position[1] - track.sample(s.t, lateral, s.branch).groundY;
}

function frostbite(): { track: Track; ski: TrackJump } {
  const track = buildTrack(frostbiteJson as TrackDefinition);
  const ski = track.jumps.find((j) => j.id === 'ski-jump');
  if (!ski) throw new Error('no ski-jump on Frostbite Pass');
  return { track, ski };
}

describe('a ramp stops at the road edge', () => {
  it('a ramp adds no height past the kerb line; a bump still rounds off at the kerbs', () => {
    const track = makeOval({ jumps: [
      { id: 'r', t: 0.06, launch: 6, shape: 'ramp', run: 5, rise: 0.8 },
      { id: 'b', t: 0.2, launch: 4.5, shape: 'hump', run: 8, rise: 1, edge: 1.6 },
    ] });
    const hw = track.sample(0.06, 0).halfWidth; // 8 m
    const onWedge = 0.06 - 2.5 / track.length; // halfway up the ramp: 0.4 m
    expect(jumpLift(track, onWedge, 0, 0, hw)).toBeCloseTo(0.4, 6);
    expect(jumpLift(track, onWedge, 0, hw - 0.1, hw)).toBeCloseTo(0.4, 6);
    // one step past the kerb line either side there is no wedge
    expect(jumpLift(track, onWedge, 0, hw + 0.1, hw)).toBe(0);
    expect(jumpLift(track, onWedge, 0, -hw - 0.1, hw)).toBe(0);
    // the bump's crest is full height in the middle, half height halfway through its edge, gone at the kerb
    expect(jumpLift(track, 0.2, 0, 0, hw)).toBeCloseTo(1, 6);
    expect(jumpLift(track, 0.2, 0, hw - 0.8, hw)).toBeCloseTo(0.5, 6);
    expect(jumpLift(track, 0.2, 0, hw, hw)).toBe(0);
    expect(jumpLift(track, 0.2, 0, hw + 1, hw)).toBe(0);
  });

  it('Frostbite Pass: a kart on the open shoulder beside the ski jump neither climbs nor launches; one on the ramp does both', () => {
    const { track, ski } = frostbite();
    const hw = track.sample(ski.t, 0).halfWidth;
    const start = ski.t - 8 / track.length;

    // on the open right shoulder, 2 m past the road edge (loose ground, not over the cliff)
    const beside = kartAt(track, start, hw + 2, 20);
    expect(track.sample(start, hw + 2).overCliff).toBeFalsy();
    const ev: KartEvent[] = [];
    let climbed = 0;
    for (let i = 0; i < 120; i++) {
      stepGround(beside, track, c, DT, ev);
      expect(beside.grounded).toBe(true);
      climbed = Math.max(climbed, liftUnder(track, beside));
    }
    expect(beside.t).toBeGreaterThan(ski.t + 5 / track.length); // it drove past the lip line
    expect(lateralOffset(track, beside.t, beside.position).lateral).toBeGreaterThan(hw); // still on the shoulder
    expect(ev.filter((e) => e.type === 'launched')).toEqual([]);
    expect(climbed).toBeLessThan(0.02);

    // control: the same run on the ramp itself climbs the wedge and flies
    const on = kartAt(track, start, 2, 20);
    const ev2: KartEvent[] = [];
    let peak = 0;
    for (let i = 0; i < 120 && on.airborne.fromJumpId === undefined; i++) {
      stepGround(on, track, c, DT, ev2);
      if (on.grounded) peak = Math.max(peak, liftUnder(track, on));
    }
    expect(ev2.some((e) => e.type === 'launched' && e.jumpId === 'ski-jump')).toBe(true);
    expect(peak).toBeGreaterThan(0.6);
  });
});

describe("a ramp's lip is a wall from behind", () => {
  it('backing into the lip stops the kart where it was (wall, no 0.8 m step up); forward over it still launches', () => {
    const jumps: TrackJump[] = [
      { id: 'r', t: 0.06, launch: 6, shape: 'ramp', run: 5, rise: 0.8 },
      { id: 'b', t: 0.3, launch: 4.5, shape: 'hump', run: 8, rise: 1, edge: 1.6 },
    ];
    const track = makeOval({ jumps });
    const L = track.length;

    // reversing at 5 m/s from 10 cm past the lip, on the ramp
    const s = kartAt(track, 0.06 + 0.1 / L, 0, -5);
    const ev: KartEvent[] = [];
    let walled = false, highest = 0;
    for (let i = 0; i < 30; i++) {
      const before = [...s.position], tBefore = s.t;
      const tickEv: KartEvent[] = [];
      stepGround(s, track, c, DT, tickEv);
      ev.push(...tickEv);
      highest = Math.max(highest, s.position[1]);
      if (tickEv.some((e) => e.type === 'wall')) {
        walled = true;
        // put back exactly where it was, dead stop
        expect(s.position[0]).toBe(before[0]);
        expect(s.position[2]).toBe(before[2]);
        expect(s.t).toBe(tBefore);
        expect(s.speed).toBe(0);
        expect(s.lateralVelocity).toBe(0);
        expect(s.grounded).toBe(true);
      }
    }
    expect(walled).toBe(true);
    expect(s.t).toBeGreaterThan(0.06); // never got behind the lip
    expect(highest).toBeLessThan(0.02); // never hopped up onto the wedge
    expect(ev.some((e) => e.type === 'launched')).toBe(false);

    // beside the ramp (past the kerb line) the lip line is nothing: it backs straight over
    const beside = kartAt(track, 0.06 + 0.1 / L, 9, -5);
    const evB: KartEvent[] = [];
    for (let i = 0; i < 30; i++) stepGround(beside, track, c, DT, evB);
    expect(evB.some((e) => e.type === 'wall')).toBe(false);
    expect(beside.t).toBeLessThan(0.06);

    // a trick bump is not a wall from either side
    const hump = kartAt(track, 0.3 + 0.1 / L, 0, -5);
    const evH: KartEvent[] = [];
    for (let i = 0; i < 30; i++) stepGround(hump, track, c, DT, evH);
    expect(evH.some((e) => e.type === 'wall')).toBe(false);
    expect(hump.t).toBeLessThan(0.3);

    // forward over the lip still launches, and is no wall
    const fwd = kartAt(track, 0.05, 0, 25);
    const evF: KartEvent[] = [];
    for (let i = 0; i < 200 && fwd.airborne.fromJumpId === undefined; i++) stepGround(fwd, track, c, DT, evF);
    expect(evF.some((e) => e.type === 'launched' && e.jumpId === 'r')).toBe(true);
    expect(evF.some((e) => e.type === 'wall')).toBe(false);
  });

  it('Frostbite Pass: reversing into the ski jump lip with the brake held is a wall every time, never a climb', () => {
    const { track, ski } = frostbite();
    const s = kartAt(track, ski.t + 0.3 / track.length, 2, 0);
    const input = { ...NEUTRAL_INPUT, brake: 1 };
    const ev: KartEvent[] = [];
    let highest = 0;
    for (let i = 0; i < 240; i++) {
      ev.push(...stepKart(s, input, track, c, DT));
      highest = Math.max(highest, liftUnder(track, s));
    }
    expect(ev.filter((e) => e.type === 'wall').length).toBeGreaterThan(0);
    expect(s.t).toBeGreaterThan(ski.t); // still in front of the lip
    expect(s.grounded).toBe(true);
    expect(highest).toBeLessThan(0.02);
    expect(ev.some((e) => e.type === 'launched')).toBe(false);
  });

  it('Frostbite Pass: a kart shoved a hair behind the lip by another kart is not trapped there; throttle drives it off the lip', () => {
    const { track, ski } = frostbite();
    const L = track.length;
    // a stopped kart 5 mm past the lip, another stopped kart 1 m ahead of it, overlapping
    const a = kartAt(track, ski.t + 0.005 / L, 2, 0);
    const b = kartAt(track, ski.t + 1 / L, 2, 0);
    const consts = [c, c];
    const inputs = [{ ...NEUTRAL_INPUT }, { ...NEUTRAL_INPUT }];
    // the pair eases apart and the bump shoves a backward
    for (let i = 0; i < 120; i++) stepKarts([a, b], inputs, track, consts, DT);
    // then a floors it for 2 s: it should drive up off the lip and fly
    inputs[0] = { ...NEUTRAL_INPUT, throttle: 1 };
    let walls = 0, launched = false;
    for (let i = 0; i < 240 && !launched; i++) {
      const ev = stepKarts([a, b], inputs, track, consts, DT)[0];
      walls += ev.filter((e) => e.type === 'wall').length;
      launched ||= ev.some((e) => e.type === 'launched' && e.jumpId === 'ski-jump');
    }
    expect(walls).toBeLessThan(5);
    expect(launched).toBe(true);
  });
});

describe('projectiles ride over ramps and bumps', () => {
  // the race-manager oval with a trick bump to be let go on, a second bump and a ramp further on
  const base = buildTrack(OVAL);
  const L0 = base.length;
  const def = cloneDef(OVAL);
  def.jumps = [
    { id: 'crest', t: 0.1, launch: 4.5, shape: 'hump' },
    { id: 'bump', t: 0.1 + 20 / L0, launch: 4.5, shape: 'hump' },
    { id: 'ramp', t: 0.1 + 40 / L0, launch: 5, shape: 'ramp' },
  ];

  for (const id of ['beachBall', 'homingKite', 'windUpMouse']) {
    it(`${id}: let go on a bump crest it starts a bump higher, and it flies over the next bump and up the ramp`, () => {
      const h = setup({ n: 1, def });
      go(h);
      const { track } = h;
      const cfg = h.items.cfg;
      const jumpT = (jid: string): number => (track.jumps.find((j) => j.id === jid) as TrackJump).t;
      const liftOf = (pos: readonly number[], t: number): number => pos[1] - track.sample(t, 0, 0).groundY - cfg.projectileHeight;

      // stand so the spawn point (spawnAheadMetres ahead) is the crest
      placeAt(track, kart(h, 0), jumpT('crest') - cfg.spawnAheadMetres / track.length, 0);
      give(h, 0, id);
      const ev: ItemEvent[] = press(h, 0);
      const spawn = ev.find((e) => e.type === 'projectileSpawn');
      expect(spawn).toBeDefined();
      const p = h.items.state.projectiles[0];
      expect(p).toBeDefined();
      if (spawn?.type !== 'projectileSpawn') return;
      expect(liftOf(spawn.position, jumpT('crest'))).toBeGreaterThan(0.95);

      // fly it on: the highest it rides over the second bump and on the ramp's wedge
      const inWindow = (t: number, jid: string, before: number, after: number): boolean => {
        const d = (t - jumpT(jid)) * track.length;
        return d > -before && d < after;
      };
      let overBump = 0, onRamp = 0;
      for (let i = 0; i < 240 && h.items.state.projectiles.includes(p); i++) {
        tick(h);
        const lift = liftOf(p.position, p.t);
        // exactly the road plus what the bump or ramp adds where it is
        expect(lift).toBeCloseTo(jumpLift(track, p.t, p.branch, p.lateral, track.sample(p.t, 0, p.branch).halfWidth), 9);
        if (inWindow(p.t, 'bump', 4, 4)) overBump = Math.max(overBump, lift);
        if (inWindow(p.t, 'ramp', 5, 0)) onRamp = Math.max(onRamp, lift);
      }
      expect(overBump).toBeGreaterThan(0.95); // about the bump's 1 m rise
      expect(overBump).toBeLessThanOrEqual(1 + 1e-9);
      expect(onRamp).toBeGreaterThan(0.7); // near the lip's 0.8 m
      expect(onRamp).toBeLessThanOrEqual(0.8 + 1e-9);
    });
  }
});
