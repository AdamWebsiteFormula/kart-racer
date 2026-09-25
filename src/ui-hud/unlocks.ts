// Design §10 unlocks: deterministic and visible, computed only from the save's counters and
// results (docs/schemas/save.schema.json), granted once into save.unlocked so the reveal fires once.
// Skins and bodies are cosmetic only: the racer owns the class. Pure.
import { CUPS } from './data/catalog.ts';
import { medalFor, type MedalTimes } from './screens/menus.ts';
import type { Save } from './store.ts';

export type UnlockKind = 'skin' | 'body' | 'mirror';
/** `use`: where to use it once unlocked (the Unlocks screen says so) */
export interface Unlock { id: string; kind: UnlockKind; name: string; how: string; use: string }

/** ultra turbos (tier-3 drift boosts, the purple ones) for Sprocket's alt skin; the Unlocks screen says "purple drift boosts" */
export const ULTRA_TURBOS_FOR_SPROCKET = 10;

export const UNLOCKS: readonly Unlock[] = Object.freeze([
  { id: 'pip-alt', kind: 'skin', name: "Pip's Berry paint", how: 'Get gold in Time Trial on every Sunrise Cup track', use: 'Pick Pip on the racer screen, then Paint: Berry.' },
  { id: 'boulder-alt', kind: 'skin', name: "Boulder's Frost paint", how: 'Win a Knockout', use: 'Pick Boulder on the racer screen, then Paint: Frost.' },
  { id: 'sprocket-alt', kind: 'skin', name: "Sprocket's Mint paint", how: `Fire ${ULTRA_TURBOS_FOR_SPROCKET} purple drift boosts`, use: 'Pick Sprocket on the racer screen, then Paint: Mint.' },
  { id: 'classic', kind: 'body', name: 'Classic body', how: 'Finish a Grand Prix', use: 'Pick any racer, then Body: Classic.' },
  { id: 'buggy', kind: 'body', name: 'Buggy body', how: 'Race a Knockout to the end', use: 'Pick any racer, then Body: Buggy.' },
  { id: 'mirror', kind: 'mirror', name: 'Mirror mode', how: 'Get gold in Time Trial on every track', use: 'Quick Race or Grand Prix: turn on Mirror next to 150cc.' },
]);

const SUNRISE = CUPS.find((c) => c.id === 'sunrise')?.trackIds ?? [];
const ALL_TRACKS = CUPS.flatMap((c) => c.trackIds);

/** Gold on this track now: the best time graded against today's medal times (a medal saved under older ones goes stale). */
function gold(save: Save, trackId: string, medalTimes: ReadonlyMap<string, MedalTimes>): boolean {
  const tt = save.timeTrial[trackId];
  if (!tt) return false;
  const times = medalTimes.get(trackId);
  return (times ? medalFor(tt.bestMs, times) : tt.medal) === 'gold';
}

/** Is this unlock earned by the save as it stands? */
export function earned(u: Unlock, save: Save, medalTimes: ReadonlyMap<string, MedalTimes>): boolean {
  switch (u.id) {
    case 'pip-alt': return SUNRISE.length > 0 && SUNRISE.every((t) => gold(save, t, medalTimes));
    case 'boulder-alt': return Object.values(save.knockout).some((k) => k.won);
    case 'sprocket-alt': return save.stats.ultraTurbos >= ULTRA_TURBOS_FOR_SPROCKET;
    case 'classic': return Object.values(save.grandPrix).some((byCc) => Object.values(byCc).some((g) => g.finished));
    case 'buggy': return Object.values(save.knockout).some((k) => k.finished);
    case 'mirror': return ALL_TRACKS.length > 0 && ALL_TRACKS.every((t) => gold(save, t, medalTimes));
    default: return false;
  }
}

/** Already granted (in save.unlocked). */
export function isUnlocked(u: Unlock, save: Save): boolean {
  if (u.kind === 'mirror') return save.unlocked.mirror;
  return (u.kind === 'skin' ? save.unlocked.skins : save.unlocked.bodies).includes(u.id);
}

/** Grant every unlock at once (the dev console's `kart.unlockAll()`, for testing the rewards). Mutates save.unlocked. */
export function grantAll(save: Save): void {
  for (const u of UNLOCKS) {
    if (isUnlocked(u, save)) continue;
    if (u.kind === 'mirror') save.unlocked.mirror = true;
    else (u.kind === 'skin' ? save.unlocked.skins : save.unlocked.bodies).push(u.id);
  }
}

/** Grant everything earned and not yet granted. Mutates save.unlocked; returns the new ones (for the reveal). Never takes one back. */
export function grantUnlocks(save: Save, medalTimes: ReadonlyMap<string, MedalTimes>): Unlock[] {
  const out: Unlock[] = [];
  for (const u of UNLOCKS) {
    if (isUnlocked(u, save) || !earned(u, save, medalTimes)) continue;
    if (u.kind === 'mirror') save.unlocked.mirror = true;
    else (u.kind === 'skin' ? save.unlocked.skins : save.unlocked.bodies).push(u.id);
    out.push(u);
  }
  return out;
}

export interface UnlockRow { id: string; name: string; how: string; use: string; unlocked: boolean }
/** The Unlocks list: every unlock, granted or not, with how to get it. */
export function unlockRows(save: Save): UnlockRow[] {
  return UNLOCKS.map((u) => ({ id: u.id, name: u.name, how: u.how, use: u.use, unlocked: isUnlocked(u, save) }));
}
