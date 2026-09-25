// The ten karts as the menus show them (design §5, §10; docs/plans/kart-combos.md): each racer's signature
// kart, then Classic and Buggy, unlockable twins of two of them (the same stats, so an unlock changes the
// look, never the speed). The ids, names, owners and twins are the sim's table (kart-controller karts.ts,
// from kart.schema.json); the card lines, the unlocks and the colors the pictures wear are the menus' own.
// The numbers are read through data/kartStats.ts.
import { KARTS as TABLE } from '../../kart-controller/karts.ts';
import { castCard } from './cast.ts';
import { skinCard } from './cosmetics.ts';

/**
 * `owner`: the racer whose signature kart it is (a twin has none: it wears the racer's own colors, as the
 * art draws the shared bodies); `twinOf`: the kart whose stats a twin has; `line`: the card's line (a twin
 * has its twin's: they drive the same); `unlock`: the unlock that opens a twin (unlocks.ts, unlocked.bodies).
 */
export interface KartCard { id: string; name: string; owner: string | null; twinOf?: string; line: string; unlock?: 'classic' | 'buggy' }

/** Each kart's line on its card: how it drives (design §5's character column). */
const LINES: Readonly<Record<string, string>> = Object.freeze({
  scooter: 'Zips off the line',
  scrap: 'Nimble everywhere, low top speed',
  pod: 'Turns on a dime',
  wagon: 'The all-rounder, hard to push',
  skimmer: 'Jumps off the line, wide in bends',
  windup: 'Quick on straights, stiff in bends',
  stomper: 'Heavy, slow to get going',
  snacktruck: 'Top speed, turns like a truck',
});

/** The twins and the unlocks that open them (design §10: Classic for finishing a Grand Prix, Buggy for racing a Knockout to the end). */
const UNLOCKED_BY: Readonly<Record<string, 'classic' | 'buggy'>> = Object.freeze({ classic: 'classic', buggy: 'buggy' });

/** The ten, in the Kart screen's order (the sim's: the eight signature karts in racer order, then the twins). */
export const KARTS: readonly KartCard[] = Object.freeze(TABLE.map((k): KartCard => Object.freeze({
  id: k.id, name: k.name, owner: k.owner ?? null, ...(k.twinOf ? { twinOf: k.twinOf } : {}),
  line: LINES[k.id] ?? LINES[k.twinOf ?? ''] ?? '', ...(UNLOCKED_BY[k.id] ? { unlock: UNLOCKED_BY[k.id] } : {}),
})));

export const KART_IDS: readonly string[] = Object.freeze(KARTS.map((k) => k.id));
export const kartCard = (id: string | null | undefined): KartCard | undefined => KARTS.find((k) => k.id === id);
export const isKart = (id: unknown): id is string => typeof id === 'string' && KART_IDS.includes(id);
export const kartName = (id: string): string => kartCard(id)?.name ?? id;

/** A racer's own (signature) kart; undefined for an id that is no racer. */
export const ownKart = (racerId: string): string | undefined => KARTS.find((k) => k.owner === racerId)?.id;

/** The kart a racer races in: the one chosen (settings.selectedKartId), else their own (design §5: absent = own kart). */
export function kartFor(racerId: string, chosen: string | null | undefined): string {
  return isKart(chosen) ? chosen : ownKart(racerId) ?? KARTS[0].id;
}

/** A twin that is still locked in this save (unlocked.bodies keeps the unlock ids: the plan keeps its name). */
export const kartLocked = (k: KartCard, unlockedBodies: readonly string[]): boolean => !!k.unlock && !unlockedBodies.includes(k.unlock);

/** The name a card says the owner by: their full cast name, as everywhere else ("Big Gus's kart"; Adam's cast table). */
const ownerName = (racerId: string): string => castCard(racerId)?.name ?? racerId;

/** The card's second line: whose kart it is ("Big Gus's kart"), or what a twin is ("Same stats as the Wind-Up Racer"). */
export function byLine(k: KartCard): string {
  if (k.twinOf) return `Same stats as the ${kartName(k.twinOf)}`;
  return k.owner ? `${ownerName(k.owner)}'s kart` : '';
}

/**
 * A kart's two colors as its picture wears them: a signature kart its owner's (design §4), a twin the racer's
 * own, or their alt paint's (the art paints the shared bodies so: art-pipeline bodyColours; the paint's swatch
 * is those two colors, cosmetics.test checks).
 */
export function kartColors(k: KartCard, racerId: string, paintId?: string): readonly [string, string] {
  const skin = paintId ? skinCard(paintId) : undefined;
  if (!k.owner && skin && skin.racerId === racerId) return skin.swatch;
  const c = castCard(k.owner ?? racerId);
  return [c?.accent ?? '#FFFFFF', c?.secondary ?? '#1B1B2F'];
}

/** The two twins' unlocks as the Unlocks list names them once karts are picked (UI.kartPick): karts, not bodies. */
export const KART_UNLOCK_WORDS: Readonly<Record<'classic' | 'buggy', { name: string; use: string }>> = Object.freeze({
  classic: { name: 'Classic kart', use: 'Pick any racer, then the Classic kart.' },
  buggy: { name: 'Buggy kart', use: 'Pick any racer, then the Buggy kart.' },
});
