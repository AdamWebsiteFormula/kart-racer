// Minimap dots: which karts show, where, how big and in what colour. Pure; the canvas draws it.
import type { KartState } from '../kart-controller/types.ts';
import type { Minimap } from '../track-builder/minimap.ts';
import { UI } from './constants.ts';

export interface MinimapDot { u: number; v: number; colour: string; radius: number; player: boolean; dim: boolean; rank: number }

/**
 * Dots in paint order: AI first (back to front by rank), the player last so it is never hidden.
 * `out` is reused frame to frame: its dot objects are rewritten in place, never reallocated.
 */
export function minimapDots(
  karts: readonly KartState[], map: Pick<Minimap, 'toMinimap'>, colourOf: (racerId: string) => string, out: MinimapDot[] = [],
): MinimapDot[] {
  let n = 0;
  for (const k of karts) {
    if (k.isGhost) continue;
    const d = out[n] ?? (out[n] = { u: 0, v: 0, colour: '', radius: 0, player: false, dim: false, rank: 0 });
    const [u, v] = map.toMinimap(k.position);
    d.u = u; d.v = v; d.colour = colourOf(k.racerId); d.rank = k.rank;
    d.radius = k.isPlayer ? UI.playerDotPx : UI.aiDotPx;
    d.player = k.isPlayer; d.dim = k.finishTick !== undefined;
    n++;
  }
  out.length = n;
  // insertion sort (8 entries, nearly sorted): AI by rank descending, the player last
  const key = (d: MinimapDot) => (d.player ? Infinity : -d.rank); // ascending: back markers first
  for (let i = 1; i < n; i++) {
    const x = out[i];
    let j = i - 1;
    while (j >= 0 && key(out[j]) > key(x)) { out[j + 1] = out[j]; j--; }
    out[j + 1] = x;
  }
  return out;
}

/** A cheap signature of the outlines, so the static road layer is only re-stroked when a shortcut opens or closes. */
export function outlineKey(map: Pick<Minimap, 'outlines'>): string {
  // the first and middle points identify the track itself, so a new track with the same
  // branch layout never reuses the old road layer
  return map.outlines.map((o) => {
    const m = (o.left.length >> 2) << 1;
    return `${o.branch}:${o.open ? 1 : 0}:${o.left.length}:${o.left[0]?.toFixed(4)},${o.left[1]?.toFixed(4)}:${o.left[m]?.toFixed(4)},${o.left[m + 1]?.toFixed(4)}`;
  }).join('|');
}
