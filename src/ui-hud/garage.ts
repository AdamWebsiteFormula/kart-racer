// The garage on the racer screen (design §10 rewards): a paint for the racer that has an alt, and a
// body for any racer. Every option is shown, each with a swatch; one still locked wears a lock and
// says how to earn it, and only unlocked ones can be chosen. Pure view models over the save.
import type { RaceMode } from '../race-manager/types.ts';
import { castCard, nameOf } from './data/cast.ts';
import { BODIES, DEFAULT_BODY, DEFAULT_PAINT, DEFAULT_PAINT_NAME, skinsFor } from './data/cosmetics.ts';
import { isKart, kartCard, kartLocked } from './data/karts.ts';
import type { Save, Settings } from './store.ts';
import { UNLOCKS } from './unlocks.ts';

export type ChoiceId = 'paint' | 'body';
/** `swatch`: a paint's two colours, or a body's id (the renderer draws its outline); `hint`: how to unlock a locked one */
export interface ChoiceOption { id: string; name: string; locked: boolean; hint?: string; swatch: readonly [string, string] | string }
export interface Choice { id: ChoiceId; label: string; value: string; options: ChoiceOption[]; index: number }
/** `paintName`, `bodyName`: what the racer wears now, for the hero turntable's caption; `kartId`: with karts picked, the kart they are in (the caption names it) */
export interface GarageVM { racerId: string; racerName: string; paintName: string; bodyName: string; choices: Choice[]; kartId?: string }

const how = (id: string) => UNLOCKS.find((u) => u.id === id)?.how;

/** A racer's paints: their own colours, then each alt, locked or not. */
function paints(save: Save, racerId: string): ChoiceOption[] {
  const c = castCard(racerId);
  const own: ChoiceOption = { id: DEFAULT_PAINT, name: DEFAULT_PAINT_NAME, locked: false, swatch: [c?.accent ?? '#ffffff', c?.secondary ?? '#ffffff'] };
  return [own, ...skinsFor(racerId).map((s) => {
    const locked = !save.unlocked.skins.includes(s.id);
    return { id: s.id, name: s.name, locked, swatch: s.swatch, ...(locked ? { hint: how(s.id) } : {}) };
  })];
}

function bodies(save: Save): ChoiceOption[] {
  return BODIES.map((b) => {
    const locked = b.id !== DEFAULT_BODY && !save.unlocked.bodies.includes(b.id);
    return { id: b.id, name: b.name, locked, swatch: b.id, ...(locked ? { hint: how(b.id) } : {}) };
  });
}

/**
 * The paint and body this racer races in (only ever unlocked ones: the store checks on load too). `kartId`:
 * with karts picked (UI.kartPick) the kart they race in, whose shared body (Classic, Buggy) is the one drawn:
 * the garage's Body row is gone then, and the old body is never read.
 */
export function lookFor(save: Save, racerId: string, kartId?: string): { paint?: string; body?: string } {
  const paint = save.settings.skinByRacer[racerId];
  const twin = kartId !== undefined && isKart(kartId) && kartCard(kartId)!.unlock && !kartLocked(kartCard(kartId)!, save.unlocked.bodies) ? kartId : undefined;
  const body = kartId !== undefined ? twin ?? DEFAULT_BODY : save.settings.selectedBodyId;
  return {
    ...(paint && paints(save, racerId).some((p) => p.id === paint && !p.locked) ? { paint } : {}),
    ...(body !== DEFAULT_BODY && bodies(save).some((b) => b.id === body && !b.locked) ? { body } : {}),
  };
}

/**
 * The garage for this racer: Paint when they have an alt (locked or not), and Body. `kartId`: with karts picked
 * (UI.kartPick) the kart they race in: no Body row then (Classic and Buggy are karts on the Kart screen).
 */
export function garageModel(save: Save, racerId: string, kartId?: string): GarageVM {
  const choices: Choice[] = [];
  const look = lookFor(save, racerId, kartId);
  const p = paints(save, racerId);
  const pi = Math.max(0, p.findIndex((x) => x.id === (look.paint ?? DEFAULT_PAINT)));
  if (p.length > 1) choices.push({ id: 'paint', label: 'Paint', value: p[pi].name, options: p, index: pi });
  const b = bodies(save);
  const bi = Math.max(0, b.findIndex((x) => x.id === (look.body ?? DEFAULT_BODY)));
  if (kartId === undefined) choices.push({ id: 'body', label: 'Body', value: b[bi].name, options: b, index: bi });
  return { racerId, racerName: nameOf(racerId), paintName: p[pi].name, bodyName: b[bi].name, choices, ...(kartId !== undefined ? { kartId } : {}) };
}

/** Step a choice left (−1) or right (+1) for this racer, over the unlocked options, wrapping. Pure: returns new settings. */
export function stepChoice(save: Save, racerId: string, id: ChoiceId, dir: -1 | 1): Settings {
  const c = garageModel(save, racerId).choices.find((x) => x.id === id);
  if (!c) return save.settings;
  const open = c.options.filter((o) => !o.locked);
  const at = Math.max(0, open.findIndex((o) => o.id === c.options[c.index].id));
  const next = open[(at + dir + open.length) % open.length].id;
  if (id === 'body') return { ...save.settings, selectedBodyId: next };
  const skinByRacer = { ...save.settings.skinByRacer };
  if (next === DEFAULT_PAINT) delete skinByRacer[racerId]; else skinByRacer[racerId] = next;
  return { ...save.settings, skinByRacer };
}

/** Choose one option outright (a tap on its swatch); a locked or unknown one changes nothing. Pure. */
export function setChoice(save: Save, racerId: string, id: ChoiceId, optionId: string): Settings {
  const c = garageModel(save, racerId).choices.find((x) => x.id === id);
  const o = c?.options.find((x) => x.id === optionId);
  if (!c || !o || o.locked) return save.settings;
  if (id === 'body') return { ...save.settings, selectedBodyId: optionId };
  const skinByRacer = { ...save.settings.skinByRacer };
  if (optionId === DEFAULT_PAINT) delete skinByRacer[racerId]; else skinByRacer[racerId] = optionId;
  return { ...save.settings, skinByRacer };
}

/** Mirror mode runs Quick Race and Grand Prix (never a leaderboard mode, never Knockout), once unlocked. */
export const mirrorAllowed = (save: Save, mode: RaceMode | null): boolean => save.unlocked.mirror && (mode === 'quick' || mode === 'grandPrix');
