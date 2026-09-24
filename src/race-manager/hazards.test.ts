import { describe, expect, it } from 'vitest';
import { SIM_DT, stepKart } from '../kart-controller/step.ts';
import { NEUTRAL_INPUT, type KartEvent } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { ActiveHazard } from '../track-builder/types.ts';
import { RACE } from './constants.ts';
import { stepHazards } from './hazards.ts';
import { OVAL, placeAt, spawnKart } from './__tests__/fixtures.ts';
import type { RaceEvent } from './types.ts';
import { dist3 } from './util.ts';

const track = buildTrack(OVAL);
const active = track.activeHazards(0);
const byId = (id: string) => active.find((h) => h.id === id)!;

function onHazard(id: string, coins = 0) {
  const k = spawnKart(track, 0);
  const h = byId(id);
  k.s.position = [...h.position];
  k.s.t = track.nearestTGlobal(h.position);
  k.s.coins = coins;
  return { ...k, h, events: [] as RaceEvent[], kartEvents: [] as KartEvent[] };
}

describe('hazards', () => {
  it('the fixture exposes all four kinds', () => {
    expect(active.map((h) => h.id).sort()).toEqual(['bumper', 'gust', 'slower', 'spinner']);
  });

  it('an intangible kart is not pushed by a gust', () => {
    const k = onHazard('gust');
    k.s.status.intangibleRemaining = 0.5;
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect([k.s.speed, k.s.lateralVelocity]).toEqual([0, 0]);
    k.s.status.intangibleRemaining = 0;
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(Math.abs(k.s.speed) + Math.abs(k.s.lateralVelocity)).toBeGreaterThan(0);
  });

  it('a shock wave along the ground misses a kart in the air (a hop clears the Rumblesaur ring)', () => {
    const k = onHazard('spinner');
    const ring: ActiveHazard[] = [{ ...byId('spinner'), id: 'ring', ground: true }];
    k.s.grounded = false;
    stepHazards(k.s, k.tr, k.c, ring, SIM_DT, k.events, k.kartEvents);
    expect(k.s.status.spinRemaining).toBe(0);
    k.s.grounded = true;
    stepHazards(k.s, k.tr, k.c, ring, SIM_DT, k.events, k.kartEvents);
    expect(k.s.status.spinRemaining).toBeGreaterThan(0);
  });

  it('a finished kart coasting through a hazard is left alone', () => {
    const k = onHazard('spinner');
    k.s.finishTick = 100;
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.s.status.spinRemaining).toBe(0);
    expect(k.events).toEqual([]);
  });

  // coin buffer off (Adam, 24 Sept 2026): a kart with coins spins too, and loses hitCoinsLost
  it('spin hits a kart once per cooldown, coins or not', () => {
    const k = onHazard('spinner');
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.s.status.spinRemaining).toBe(k.c.hitSpinSeconds);
    expect(k.events).toEqual([{ type: 'hazardHit', racerId: 'k0', hazardId: 'spinner', hit: 'spin' }]);
    expect(k.kartEvents[0]).toMatchObject({ type: 'hit', kind: 'hazard', spun: true });
    for (let i = 0; i < 10; i++) stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.events.length).toBe(1);
    const rich = onHazard('spinner', 5);
    stepHazards(rich.s, rich.tr, rich.c, active, SIM_DT, rich.events, rich.kartEvents);
    expect(rich.s.status.spinRemaining).toBe(rich.c.hitSpinSeconds);
    expect(rich.s.coins).toBe(5 - rich.c.hitCoinsLost);
  });

  it('cooldown expires after hazardCooldownSeconds', () => {
    const k = onHazard('spinner');
    const ticks = Math.round(RACE.hazardCooldownSeconds / SIM_DT);
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    k.s.status.spinRemaining = 0; // the spin is over
    k.s.position = [...byId('bumper').position]; // out of the spinner (the bumper waits on the cooldown too)
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    k.s.position = [...k.h.position]; // and back in
    for (let i = 2; i < ticks; i++) stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.events.length).toBe(1);
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.events.length).toBe(2);
  });

  it('a spinning kart is not hit, and a hazard does not hit again until the kart has left it', () => {
    const k = onHazard('spinner');
    k.s.status.spinRemaining = 0.5; // spun by an item on the way in
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.events).toEqual([]);
    k.s.status.spinRemaining = 0;
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.events.length).toBe(1);
    k.s.status.spinRemaining = 0;
    k.tr.hazardCooldownRemaining = 0;
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.events.length).toBe(1); // still inside it
    k.s.position = [...byId('gust').position];
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.tr.hazardInside).toBeUndefined();
    k.s.position = [...k.h.position];
    k.tr.hazardCooldownRemaining = 0;
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.events.length).toBe(2); // came back: a new hit
  });

  it('a coinless kart stopped in a static hazard is spun once and drives out (bug hunt 2: the Boardwalk teacups)', () => {
    // the race order: the kart steps, then the hazards. The spin bleeds speed to 0 and used to end on
    // the tick the cooldown did (both 1 s), so the teacup spun it again every second for the rest of the race
    const k = onHazard('spinner');
    const tan = track.sample(k.s.t, 0, 0).tangent;
    k.s.heading = Math.atan2(tan[0], tan[2]);
    const gas = { ...NEUTRAL_INPUT, throttle: 1 };
    for (let i = 0; i < Math.round(5 / SIM_DT); i++) {
      stepKart(k.s, gas, track, k.c, SIM_DT);
      stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    }
    expect(k.events.map((e) => e.type)).toEqual(['hazardHit']);
    expect(dist3(k.s.position, k.h.position)).toBeGreaterThan(k.h.radius + k.c.kartRadius);
    expect(k.s.speed).toBeGreaterThan(RACE.stuckSpeed);
  });

  it('slow sets the slow status; bump adds lateral away from the centre; intangible karts are skipped', () => {
    const slow = onHazard('slower');
    stepHazards(slow.s, slow.tr, slow.c, active, SIM_DT, slow.events, slow.kartEvents);
    expect(slow.s.status.slowedTo).toBe(RACE.hazardSlowTo);
    expect(slow.s.status.slowRemaining).toBe(RACE.hazardSlowSeconds);
    const bump = onHazard('bumper');
    placeAt(track, bump.s, track.nearestTGlobal(bump.h.position), 0.5); // half a metre right of the centre
    stepHazards(bump.s, bump.tr, bump.c, active, SIM_DT, bump.events, bump.kartEvents);
    expect(bump.s.lateralVelocity).toBeCloseTo(RACE.hazardBumpLateral, 6);
    const ghost = onHazard('spinner');
    ghost.s.status.intangibleRemaining = 1;
    stepHazards(ghost.s, ghost.tr, ghost.c, active, SIM_DT, ghost.events, ghost.kartEvents);
    expect(ghost.events).toEqual([]);
  });

  it('a gust pushes every tick with no cooldown and no event', () => {
    const k = onHazard('gust');
    const h = k.h as ActiveHazard;
    expect(h.push).toBeDefined();
    for (let i = 0; i < 3; i++) stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    const mag = Math.hypot(k.s.speed, k.s.lateralVelocity);
    expect(mag).toBeCloseTo(Math.hypot(h.push![0], h.push![2]) * SIM_DT * 3, 6);
    expect(k.events).toEqual([]);
    expect(k.tr.hazardCooldownRemaining).toBe(0);
  });

  it('a kart away from every hazard is untouched', () => {
    const k = spawnKart(track, 0);
    const events: RaceEvent[] = [];
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, events, []);
    expect(events).toEqual([]);
  });
});
