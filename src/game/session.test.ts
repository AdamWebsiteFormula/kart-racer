// A Final Lap Shift's sky change in a live session (detail review 2026-09-24): the dome fades, and
// the fog, the horizon ring and the pickups follow it instead of keeping the day's colours.
import { describe, expect, it } from 'vitest';
import { Color, Scene, type BufferAttribute, type Mesh, type ShaderMaterial } from 'three';
import { lightOf, SKIES, SKY_FADE } from '../art-pipeline/index.ts';
import type { RaceConfig } from '../race-manager/types.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { CAST } from '../ui-hud/data/cast.ts';
import canyon from '../track-builder/tracks/canyon-rush.json';
import { RaceSession } from './session.ts';

describe('the sky change at a Final Lap Shift', () => {
  it('eases the fog to the new horizon over the fade and recolours the far ring for the new light', () => {
    const def = canyon as unknown as TrackDefinition;
    const config: RaceConfig = {
      mode: 'quick', trackId: def.id, speedClass: 150, seed: 1, laps: 3,
      racers: CAST.map((c) => ({ racerId: c.id, archetype: c.archetype, isPlayer: false })),
    };
    const s = new RaceSession(new Scene(), def, config);
    expect(s.skyLight).toBe(lightOf('canyon-day'));
    const ring = s.farRing!.getObjectByName('horizon-rings') as Mesh;
    const col = ring.geometry.getAttribute('color') as BufferAttribute;
    const before = Float32Array.from(col.array as Float32Array);
    const day = s.horizon.clone(), dusk = new Color(SKIES['canyon-dusk'].horizon);

    s.changeSky('canyon-dusk');
    expect(s.skyLight).toBe(lightOf('canyon-dusk'));
    // half way through the fade: between the two
    s.frame(0, SKY_FADE / 2);
    expect(s.horizon.equals(day)).toBe(false);
    expect(s.horizon.equals(dusk)).toBe(false);
    // at the end: the new sky's horizon, and a ring no longer in its day colours
    s.frame(0, SKY_FADE);
    expect(s.horizon.equals(dusk)).toBe(true);
    let moved = 0;
    for (let i = 0; i < before.length; i++) moved = Math.max(moved, Math.abs((col.array as Float32Array)[i] - before[i]));
    expect(moved).toBeGreaterThan(0.1);
    s.dispose();
  }, 120_000); // CI runs about 3.5x slower than the Mac
});

describe('the karts\' flames on the grid', () => {
  it('the rivals\' flames draw in one call (vfx-juice flameBatch.ts); yours on their own mesh; all 8 revving is 2 draws, not 8', () => {
    const def = canyon as unknown as TrackDefinition;
    const config: RaceConfig = {
      mode: 'quick', trackId: def.id, speedClass: 150, seed: 1, laps: 3,
      racers: CAST.map((c, i) => ({ racerId: c.id, archetype: c.archetype, isPlayer: i === 7 })),
    };
    const s = new RaceSession(new Scene(), def, config);
    const own: Mesh[] = [];
    s.views.forEach((v) => v.root.traverse((o) => { if (o.name === 'exhaust-flame') own.push(o as Mesh); }));
    expect(own).toHaveLength(8);
    const drawn = own.filter((m) => (m.material as ShaderMaterial).visible);
    expect(drawn).toHaveLength(1);
    expect(s.views[s.playerIndex].root.getObjectByName('exhaust-flame')).toBe(drawn[0]);
    const batch = [] as Mesh[];
    s.views[0].root.parent!.traverse((o) => { if (o.name === 'exhaust-flames') batch.push(o as Mesh); });
    expect(batch).toHaveLength(1);
    // every engine revving on the grid (the AI presses on the 2, the player's autopilot too): the batch shows, drawing 7
    s.ai.drivePlayer = true;
    for (let t = 0; t < 2.9 * 120 && s.state.phase === 'countdown'; t++) { s.tick(null); s.frame(1, 1 / 120); }
    expect(s.state.phase).toBe('countdown');
    expect(own.filter((m) => m.visible).length).toBeGreaterThan(4);
    expect(batch[0].visible).toBe(true);
    s.dispose();
  }, 120_000);
});
