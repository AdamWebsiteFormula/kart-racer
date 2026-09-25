// A race built before its racers' model files were in (24 Sept 2026: on Fast 4G a race picked in the
// first 5.5 s kept the code-built karts to the flag): the waiting racers are named, a model that lands
// is built beside the race as the race would build it, and swapped in with the animation carrying on.
import { describe, expect, it } from 'vitest';
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial, Scene, type Material } from 'three';
import { RACER_MODELS } from '../art-pipeline/index.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import harbour from '../track-builder/tracks/harbour-loop.json';
import { RaceSession } from './session.ts';

/** A stand-in model file: one textured-looking mesh (a standard material, shared as the loader marks it). */
function template(): Group {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3));
  const m = new MeshStandardMaterial({ color: 0x2ec4b6 });
  m.userData.shared = true;
  const root = new Group();
  root.add(new Mesh(g, m));
  return root;
}
const materials = (root: { traverse(f: (o: unknown) => void): void }) => {
  const out: Material[] = [];
  root.traverse((o) => { const m = (o as Mesh).material; if (m) out.push(...(Array.isArray(m) ? m : [m])); });
  return out;
};

describe('racer models that land while the race loads', () => {
  it('names the waiting racers (the player first), stages a landed model beside the race, then swaps it in', () => {
    const def = harbour as unknown as TrackDefinition;
    const config: RaceConfig = {
      mode: 'quick', trackId: def.id, speedClass: 150, seed: 1, laps: 3,
      racers: [...CAST].reverse().map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: c.id === 'nova' })),
    };
    const scene = new Scene();
    const s = new RaceSession(scene, def, config);
    const waiting = s.waitingForModels();
    expect(waiting[0], 'the player\'s racer first').toBe('nova');
    expect(new Set(waiting)).toEqual(new Set(CAST.map((c) => c.id)));

    // two models land: the player's and a rival's
    const templates = (RACER_MODELS as unknown as { templates: Map<string, Group> }).templates;
    templates.set('nova', template());
    templates.set('pip', template());
    try {
      const staging = new Group();
      const pi = s.playerIndex, ri = s.config.racers.findIndex((r) => r.racerId === 'pip');
      const oldPlayer = s.views[pi].chassis, oldRival = s.views[ri].chassis;
      expect(s.stageModels(new Set(['nova', 'pip', 'gus']), staging), 'only the ones whose models are in').toBe(2);
      expect(staging.children).toHaveLength(2);
      // staged as the race would build them: the player's own materials, the rival's see-through copies (hidden), flames on both
      const player = staging.children.find((c) => c.name === 'racer-nova')!, rival = staging.children.find((c) => c.name === 'racer-pip')!;
      expect(materials(player).some((m) => m instanceof MeshStandardMaterial && m.userData.shared === false)).toBe(true);
      expect(rival.getObjectByName('ghost')).toBeDefined();
      expect(player.getObjectByName('exhaust-flame')).toBeDefined();
      // nothing in the race changed yet
      expect(s.views[pi].chassis).toBe(oldPlayer);

      expect(s.swapInModels().sort()).toEqual(['nova', 'pip']);
      expect(staging.children).toHaveLength(0);
      expect(s.views[pi].chassis).toBe(player);
      expect(s.views[ri].chassis).toBe(rival);
      expect(player.parent).toBe(s.views[pi].root);
      expect(oldPlayer.parent, 'the code-built kart is gone').toBeNull();
      expect(oldRival.parent).toBeNull();
      expect(s.waitingForModels()).not.toContain('nova');
      expect(s.waitingForModels()).not.toContain('pip');
      expect(s.waitingForModels()).toContain('gus');
      // the race runs on with them: ticks, frames, the animation on the new chassis
      for (let i = 0; i < 5; i++) s.tick(null);
      s.frame(0.5, 1 / 60);
      expect(Number.isFinite(s.views[pi].chassis.rotation.x)).toBe(true);
      // swapping again changes nothing
      expect(s.swapInModels()).toEqual([]);
    } finally {
      templates.delete('nova');
      templates.delete('pip');
      s.dispose();
    }
  }, 120_000);
});
