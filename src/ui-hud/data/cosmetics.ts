// The unlockable looks as the menus name them (design §5, §10): three alt paints, each for one racer,
// and the kart bodies. Cosmetic only: the racer owns the class. The ids are the unlock ids
// (unlocks.ts) and art-pipeline's (paints.ts PAINTS, bodies.ts BODY_IDS); art.test.ts checks they agree.

/** `swatch`: the paint's two colours as a body wears them (art-pipeline kart.ts bodyColours; cosmetics.test checks they match) */
export interface SkinCard { id: string; racerId: string; name: string; swatch: readonly [string, string] }
export interface BodyCard { id: string; name: string }

export const SKINS: readonly SkinCard[] = Object.freeze([
  { id: 'pip-alt', racerId: 'pip', name: 'Berry', swatch: ['#ce30ba', '#ffca54'] },
  { id: 'boulder-alt', racerId: 'boulder', name: 'Frost', swatch: ['#8ea4ba', '#eef4f8'] },
  { id: 'sprocket-alt', racerId: 'sprocket', name: 'Mint', swatch: ['#a9edd8', '#b0614e'] },
]);

/** 'standard' is each racer's own signature kart, always there; the rest are unlocked. */
export const BODIES: readonly BodyCard[] = Object.freeze([
  { id: 'standard', name: 'Standard' },
  { id: 'classic', name: 'Classic' },
  { id: 'buggy', name: 'Buggy' },
]);

export const DEFAULT_PAINT = 'default';
export const DEFAULT_BODY = 'standard';
/** the name of a racer's own colours in the paint picker */
export const DEFAULT_PAINT_NAME = 'Original';

export const skinCard = (id: string): SkinCard | undefined => SKINS.find((s) => s.id === id);
export const isBody = (id: unknown): boolean => BODIES.some((b) => b.id === id);
export const skinsFor = (racerId: string): SkinCard[] => SKINS.filter((s) => s.racerId === racerId);
