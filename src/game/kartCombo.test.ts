// Any racer in any kart, in the race (design §5, K6, 25 Sept 2026): the player's chosen kart builds
// a combo (art-pipeline rigged.ts buildComboTemplate) once its own template and the kart owner's are
// both in, one draw and one shadow draw, never the kart owner's own driver, and the race actually
// steps on the chosen kart's constants (kart-controller karts.ts comboStats): a changed-kart race
// differs from the same racer in their own kart.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Scene, type Mesh, type Object3D, type SkinnedMesh } from 'three';
import { RACER_MODELS } from '../art-pipeline/index.ts';
import type { RiggedTemplate } from '../art-pipeline/rigged.ts';
import { riggedTemplate } from '../art-pipeline/__tests__/parts.ts';
import { makeConstants } from '../kart-controller/constants.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import harbour from '../track-builder/tracks/harbour-loop.json';
import type { TrackDefinition } from '../track-builder/types.ts';
import { RaceSession } from './session.ts';

const def = harbour as unknown as TrackDefinition;
const rigs = (RACER_MODELS as unknown as { rigs: Map<string, RiggedTemplate> }).rigs;
let pip: RiggedTemplate, juniper: RiggedTemplate;

beforeAll(async () => {
  [pip, juniper] = await Promise.all([riggedTemplate('pip'), riggedTemplate('juniper')]);
  rigs.set('pip', pip);
  rigs.set('juniper', juniper);
}, 120_000);
afterAll(() => { rigs.delete('pip'); rigs.delete('juniper'); });

function draws(o: Object3D): { draws: number; shadow: number } {
  let d = 0, s = 0;
  o.traverseVisible((x) => { const m = x as Mesh; if (!m.isMesh) return; d++; if (m.castShadow) s++; });
  return { draws: d, shadow: s };
}

/** `mode: 'quick', racers: [{racerId, isPlayer: true, kartId?}, {racerId: other}]`, both on real parts. */
function configWith(kartId: string | undefined): RaceConfig {
  return {
    mode: 'quick', trackId: def.id, speedClass: 150, seed: 7, laps: 1,
    racers: [
      { racerId: 'juniper', archetype: 'medium', isPlayer: true, ...(kartId ? { kartId } : {}) },
      { racerId: 'pip', archetype: 'light', isPlayer: false },
    ],
  };
}

describe('a race with a chosen kart (design §5, K6)', () => {
  it("Juniper races in Pip's Parcel Scooter: one draw and one shadow draw, a rigged skinned mesh", () => {
    const s = new RaceSession(new Scene(), def, configWith('scooter'));
    const root = s.views[0].chassis;
    expect(root.getObjectByName('rigged')).toBeDefined();
    const c = draws(root);
    expect(c.draws).toBe(1);
    expect(c.shadow).toBe(1);
    expect((root.getObjectByName('rigged') as SkinnedMesh).isSkinnedMesh).toBe(true);
    // the flames burn from Pip's own measured pipes (art-pipeline kart.ts exhaustFor), not Juniper's own kart's
    expect(root.userData.exhaust).toBeDefined();
    s.dispose();
  });

  it('no kart chosen: still Juniper, in her own Timber Wagon (unchanged: the ship switch defaults everyone to their own)', () => {
    const s = new RaceSession(new Scene(), def, configWith(undefined));
    const root = s.views[0].chassis;
    expect(root.getObjectByName('rigged')).toBeDefined();
    expect(draws(root)).toEqual({ draws: 1, shadow: 1 });
    s.dispose();
  });

  it('the race actually steps on the chosen kart\'s constants: a changed-kart race differs from the same racer in their own kart', () => {
    const own = new RaceSession(new Scene(), def, configWith(undefined));
    const changed = new RaceSession(new Scene(), def, configWith('scooter'));
    expect(changed.manager.consts[0].kartId).toBe('scooter');
    expect(own.manager.consts[0].kartId).toBe('wagon'); // Juniper's own
    expect(changed.manager.consts[0].topSpeed).not.toBe(own.manager.consts[0].topSpeed);
    expect(changed.manager.consts[0].accel).not.toBe(own.manager.consts[0].accel);
    // exactly the sim's own combine rule (kart-controller karts.ts), not a picture-only difference
    expect(changed.manager.consts[0]).toEqual(makeConstants('medium', 150, 'juniper', 'scooter'));
    own.dispose();
    changed.dispose();
  });

  it('an unknown kart id: falls back to the racer\'s own kart (kartFor), never throws', () => {
    const s = new RaceSession(new Scene(), def, configWith('not-a-kart'));
    expect(s.manager.consts[0].kartId).toBe('wagon');
    expect(draws(s.views[0].chassis)).toEqual({ draws: 1, shadow: 1 });
    s.dispose();
  });
});
