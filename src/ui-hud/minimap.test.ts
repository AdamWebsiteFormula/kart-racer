import { describe, expect, it } from 'vitest';
import { createKartState } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import harbour from '../track-builder/tracks/harbour-loop.json';
import type { TrackDefinition } from '../track-builder/types.ts';
import { UI } from './constants.ts';
import { minimapDots, outlineKey } from './minimap.ts';

const track = buildTrack(harbour as TrackDefinition);

describe('minimap', () => {
  it('karts at the grid map inside the unit square; the player is bigger and painted last; ghosts hidden; finished dimmed', () => {
    const g = track.spawnGrid;
    const karts = [0, 1, 2, 3].map((i) => {
      const k = createKartState({ racerId: `k${i}`, isPlayer: i === 1, isGhost: i === 3, position: [...g[i].position] });
      k.rank = i + 1;
      return k;
    });
    karts[2].finishTick = 100;
    const dots = minimapDots(karts, track.minimap, () => '#fff');
    expect(dots.length).toBe(3);
    for (const d of dots) { expect(d.u).toBeGreaterThanOrEqual(0); expect(d.u).toBeLessThanOrEqual(1); expect(d.v).toBeGreaterThanOrEqual(0); expect(d.v).toBeLessThanOrEqual(1); }
    expect(dots.at(-1)!.player).toBe(true);
    expect(dots.at(-1)!.radius).toBe(UI.playerDotPx);
    // each dot names its racer, whose face the map draws once the art is in
    expect(dots.map((d) => d.racerId).sort()).toEqual(['k0', 'k1', 'k2']);
    expect(dots.at(-1)!.racerId).toBe('k1');
    expect(dots.find((d) => d.rank === 3)!.dim).toBe(true);
    expect(dots[0].rank).toBeGreaterThan(dots[1].rank); // AI back to front
    // reused, not reallocated
    const again = minimapDots(karts, track.minimap, () => '#fff', dots);
    expect(again).toBe(dots);
    expect(again[0]).toBe(dots[0]);
  });

  it('a different track with the same layout gets a different road key', () => {
    const fake = { outlines: track.minimap.outlines.map((o) => ({ ...o, left: o.left.map((x) => x * 0.5) })) };
    expect(outlineKey(fake)).not.toBe(outlineKey(track.minimap));
  });

  it('the static layer key changes only when a shortcut opens or closes', () => {
    const a = outlineKey(track.minimap);
    track.setLap(1);
    expect(outlineKey(track.minimap)).toBe(a);
    const b = track.branches.byId('beach')!;
    b.forcedOpen = !b.open;
    track.setLap(2);
    expect(outlineKey(track.minimap)).not.toBe(a);
    b.forcedOpen = undefined;
  });
});
