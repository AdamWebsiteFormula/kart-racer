// Any racer in any kart (design §5): the AI plans every kart on the same constants the race manager
// steps it with, built from its racer and kart, so the autopilot after the finish drives the
// player's real combo and an AI racer drives its own kart.
import { describe, expect, it } from 'vitest';
import type { KartConstants } from '../kart-controller/constants.ts';
import { RaceManager } from '../race-manager/race.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import { AiDriver } from './driver.ts';
import { HARBOUR_LOOP } from './__tests__/fixtures.ts';

describe('AiDriver: any racer in any kart', () => {
  it("plans each kart on the race manager's own constants: the player's combo, each AI in its kart", () => {
    const track = buildTrack(HARBOUR_LOOP);
    const config: RaceConfig = {
      mode: 'quick', trackId: HARBOUR_LOOP.id, speedClass: 100, seed: 5,
      racers: [
        { racerId: 'nova', archetype: 'light', isPlayer: true, kartId: 'snacktruck' },
        { racerId: 'boulder', archetype: 'heavy' },
        { racerId: 'otto', archetype: 'medium', kartId: 'otto-has-no-such-kart' },
        { racerId: 'k0', archetype: 'heavy', kartId: 'scrap' },
      ],
    };
    const rm = new RaceManager(track, config);
    const ai = new AiDriver(track, config, rm.state);
    const planned = (ai as unknown as { consts: KartConstants[] }).consts;
    expect(planned).toEqual(rm.consts);
    expect(planned.map((c) => c.kartId)).toEqual(['snacktruck', 'stomper', 'skimmer', '']);
    expect(planned[0].topSpeed).toBeGreaterThan(planned[2].topSpeed); // Nova in the Snack Truck: +2 steps of speed on her class
  });
});
