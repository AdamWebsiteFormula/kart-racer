import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../kart-controller/step.ts';
import { buildTrack } from '../track-builder/track.ts';
import { RACE } from './constants.ts';
import { indexFeatures, initTimers, stepPickups } from './pickups.ts';
import { HARBOUR_LOOP, OVAL, spawnKart } from './__tests__/fixtures.ts';
import type { RaceEvent } from './types.ts';

const track = buildTrack(OVAL);
const fi = indexFeatures(track);

describe('pickups', () => {
  it('indexes balloons and coins by feature', () => {
    expect(fi.pickups.length).toBe(2);
    expect(fi.coins.length).toBe(2);
    const { pickupStates, coinStates } = initTimers(fi);
    expect(pickupStates).toEqual([{ respawnRemaining: 0 }, { respawnRemaining: 0 }]);
    expect(coinStates.length).toBe(2);
  });

  it('a balloon pops once, fires pickup once, and respawns after pickupRespawnSeconds', () => {
    const k = spawnKart(track, 0);
    const { pickupStates, coinStates } = initTimers(fi);
    k.s.position = [...track.features[fi.pickups[0]].position];
    const events: RaceEvent[] = [];
    const ticks = Math.round(RACE.pickupRespawnSeconds / SIM_DT);
    for (let i = 0; i < ticks; i++) stepPickups(fi, pickupStates, coinStates, track, [k.s], [k.c], SIM_DT, events);
    expect(events).toEqual([{ type: 'pickup', racerId: 'k0', index: 0 }]);
    stepPickups(fi, pickupStates, coinStates, track, [k.s], [k.c], SIM_DT, events);
    expect(events.length).toBe(2);
  });

  it('coins add one up to the cap; a second kart on the same spot gets nothing', () => {
    const a = spawnKart(track, 0), b = spawnKart(track, 1, 'k1');
    const { pickupStates, coinStates } = initTimers(fi);
    const pos = track.features[fi.coins[0]].position;
    a.s.position = [...pos]; b.s.position = [...pos];
    a.s.coins = a.c.coinCap;
    const events: RaceEvent[] = [];
    stepPickups(fi, pickupStates, coinStates, track, [a.s, b.s], [a.c, b.c], SIM_DT, events);
    expect(a.s.coins).toBe(a.c.coinCap);
    expect(b.s.coins).toBe(0);
    expect(events).toEqual([{ type: 'coin', racerId: 'k0', coins: a.c.coinCap }]);
  });

  it('a balloon on a closed shortcut cannot be popped by a kart still on that branch', () => {
    const hl = buildTrack(HARBOUR_LOOP);
    const hfi = indexFeatures(hl);
    const idx = [...hfi.pickups, ...hfi.coins].find((i) => hl.features[i].branch > 0)!;
    expect(idx).toBeDefined();
    const f = hl.features[idx];
    const k = spawnKart(hl, 0);
    k.s.position = [...f.position];
    k.s.branch = f.branch;
    const { pickupStates, coinStates } = initTimers(hfi);
    const events: RaceEvent[] = [];
    const branch = hl.branches.list[f.branch];
    branch.forcedOpen = false;
    stepPickups(hfi, pickupStates, coinStates, hl, [k.s], [k.c], SIM_DT, events);
    expect(events).toEqual([]);
    branch.forcedOpen = true;
    stepPickups(hfi, pickupStates, coinStates, hl, [k.s], [k.c], SIM_DT, events);
    expect(events.length).toBe(1);
  });

  it('a kart on another branch, a ghost or a finished kart does not pop', () => {
    const k = spawnKart(track, 0);
    const { pickupStates, coinStates } = initTimers(fi);
    k.s.position = [...track.features[fi.pickups[0]].position];
    k.s.branch = 1;
    const events: RaceEvent[] = [];
    stepPickups(fi, pickupStates, coinStates, track, [k.s], [k.c], SIM_DT, events);
    k.s.branch = 0; k.s.isGhost = true;
    stepPickups(fi, pickupStates, coinStates, track, [k.s], [k.c], SIM_DT, events);
    k.s.isGhost = false; k.s.finishTick = 100;
    stepPickups(fi, pickupStates, coinStates, track, [k.s], [k.c], SIM_DT, events);
    expect(events).toEqual([]);
  });
});
