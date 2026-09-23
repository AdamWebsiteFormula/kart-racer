// Colour tables for the scene layer. Biome background/accent follow design.md §6;
// the track JSON `environment.palette` overrides them. Plain RGB tuples (0..1) so the
// ribbon builder can write vertex colours without allocating three.js Colors.
import type { Biome, Surface, TrackDefinition } from '../types.ts';

export type Rgb = readonly [number, number, number];

export interface TrackPalette {
  background: Rgb;
  accent: Rgb;
  shoulder: Rgb;
  ground: Rgb;
  kerbA: Rgb;
  kerbB: Rgb;
  barrier: Rgb;
  decor: Rgb;
  surfaces: Readonly<Record<Surface, Rgb>>;
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

const SURFACE_COLOURS: Readonly<Record<Surface, Rgb>> = Object.freeze({
  road: hexToRgb('#5c5f6b'),
  dirt: hexToRgb('#c9a46b'),
  mud: hexToRgb('#6e5137'),
  ice: hexToRgb('#cfe9f7'),
  boost: hexToRgb('#ffb347'),
  rail: hexToRgb('#b0b8c8'),
});

/**
 * background / accent / shoulder / ground / decor per biome (design.md §6), plus each place's own
 * road and kerb stripes, so no two tracks share a road (planks on the boardwalk, gold in the sky).
 */
const BIOMES: Readonly<Record<Biome, { bg: string; accent: string; shoulder: string; ground: string; decor: string; road: string; kerbA: string; kerbB: string }>> = Object.freeze({
  harbour: { bg: '#f3e5c8', accent: '#ff6f61', shoulder: '#e6d3a3', ground: '#3aa7d9', decor: '#4f9a4a', road: '#5c5f6b', kerbA: '#e04848', kerbB: '#f4f4f4' },
  meadow: { bg: '#bfe7ff', accent: '#ffd23f', shoulder: '#6db94f', ground: '#5aa842', decor: '#3f7f34', road: '#67625c', kerbA: '#ffc93c', kerbB: '#f4f4f4' },
  canyon: { bg: '#f7c59f', accent: '#2ec4b6', shoulder: '#d98c5f', ground: '#c8623c', decor: '#8a4b2a', road: '#8a5942', kerbA: '#2ec4b6', kerbB: '#f4f4f4' },
  frost: { bg: '#f4f8ff', accent: '#ff4fa3', shoulder: '#eef4fb', ground: '#dbe7f5', decor: '#2f5f8f', road: '#6f8299', kerbA: '#ff4fa3', kerbB: '#f4f4f4' },
  boardwalk: { bg: '#12213f', accent: '#ff3fd8', shoulder: '#4a3b5c', ground: '#1d3557', decor: '#ff3fd8', road: '#a0714b', kerbA: '#2ee6ff', kerbB: '#ff3fd8' },
  skyline: { bg: '#ffd3b0', accent: '#f5b700', shoulder: '#f7e7dc', ground: '#ffe9d6', decor: '#f5b700', road: '#6d6a8a', kerbA: '#f5b700', kerbB: '#fff6e0' },
  temple: { bg: '#d8f0d0', accent: '#ffa62b', shoulder: '#6b8f4e', ground: '#4f7a3a', decor: '#8c6b3f', road: '#7a7466', kerbA: '#ffa62b', kerbB: '#f4f4f4' },
  foundry: { bg: '#3a3a44', accent: '#ff7a1a', shoulder: '#5a5a60', ground: '#2c2c33', decor: '#7a7a85', road: '#4a4a52', kerbA: '#ff7a1a', kerbB: '#2c2c33' },
});

/** Biomes whose road is planks: the road material gets a plank-gap texture along the track. */
export const PLANKED: ReadonlySet<Biome> = new Set<Biome>(['boardwalk']);

export function paletteFor(def: TrackDefinition): TrackPalette {
  const b = BIOMES[def.biome] ?? BIOMES.harbour;
  const p = def.environment?.palette ?? {};
  return {
    background: hexToRgb(p.background ?? b.bg),
    accent: hexToRgb(p.accent ?? b.accent),
    shoulder: hexToRgb(b.shoulder),
    ground: hexToRgb(b.ground),
    kerbA: hexToRgb(b.kerbA),
    kerbB: hexToRgb(b.kerbB),
    barrier: hexToRgb('#f4f4f4'),
    decor: hexToRgb(b.decor),
    surfaces: { ...SURFACE_COLOURS, road: hexToRgb(b.road) },
  };
}
