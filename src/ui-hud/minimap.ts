// Minimap dots: which karts show, where, how big and in what colour. Pure; the canvas draws it.
import type { KartState } from '../kart-controller/types.ts';
import type { Minimap } from '../track-builder/minimap.ts';
import { UI } from './constants.ts';

export interface MinimapDot { u: number; v: number; colour: string; radius: number; player: boolean; dim: boolean; rank: number }

/** Dots in paint order: AI first (back to front by rank), the player last so it is never hidden. */
export function minimapDots(
  karts: readonly KartState[], map: Pick<Minimap, 'toMinimap'>, colourOf: (racerId: string) => string, out: MinimapDot[] = [],
): MinimapDot[] {
  out.length = 0;
  let player: MinimapDot | null = null;
  for (const k of karts) {
    if (k.isGhost) continue;
    const [u, v] = map.toMinimap(k.position);
    const dot: MinimapDot = {
      u, v, colour: colourOf(k.racerId), rank: k.rank,
      radius: k.isPlayer ? UI.playerDotPx : UI.aiDotPx,
      player: k.isPlayer, dim: k.finishTick !== undefined,
    };
    if (k.isPlayer) player = dot; else out.push(dot);
  }
  out.sort((a, b) => b.rank - a.rank);
  if (player) out.push(player);
  return out;
}

/** A cheap signature of the outlines, so the static road layer is only re-stroked when a shortcut opens or closes. */
export function outlineKey(map: Pick<Minimap, 'outlines'>): string {
  return map.outlines.map((o) => `${o.branch}:${o.open ? 1 : 0}:${o.left.length}`).join('|');
}
