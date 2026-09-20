import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../kart-controller/step.ts';
import type { KartEvent } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { ActiveHazard } from '../track-builder/types.ts';
import { RACE } from './constants.ts';
import { stepHazards } from './hazards.ts';
import { OVAL, placeAt, spawnKart } from './__tests__/fixtures.ts';
import type { RaceEvent } from './types.ts';

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

  it('spin hits a coinless kart once per cooldown, and only slows a kart with coins', () => {
    const k = onHazard('spinner');
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.s.status.spinRemaining).toBe(k.c.hitSpinSeconds);
    expect(k.events).toEqual([{ type: 'hazardHit', racerId: 'k0', hazardId: 'spinner', hit: 'spin' }]);
    expect(k.kartEvents[0]).toMatchObject({ type: 'hit', kind: 'hazard', spun: true });
    for (let i = 0; i < 10; i++) stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.events.length).toBe(1);
    const rich = onHazard('spinner', 5);
    stepHazards(rich.s, rich.tr, rich.c, active, SIM_DT, rich.events, rich.kartEvents);
    expect(rich.s.status.spinRemaining).toBe(0);
    expect(rich.s.coins).toBe(5 - rich.c.hitCoinsLost);
    expect(rich.s.status.slowedTo).toBe(rich.c.coinShield.slowedTo);
  });

  it('cooldown expires after hazardCooldownSeconds', () => {
    const k = onHazard('spinner');
    const ticks = Math.round(RACE.hazardCooldownSeconds / SIM_DT);
    for (let i = 0; i < ticks; i++) stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.events.length).toBe(1);
    stepHazards(k.s, k.tr, k.c, active, SIM_DT, k.events, k.kartEvents);
    expect(k.events.length).toBe(2);
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
