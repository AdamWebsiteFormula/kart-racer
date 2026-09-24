// The garage on the racer screen (design §10 rewards): once unlocked, pick a paint for the racer
// that has one and a body for any racer. Pure view models over the save; nothing here draws.
// A choice shows only when there is something unlocked to choose.
import type { RaceMode } from '../race-manager/types.ts';
import { BODIES, DEFAULT_BODY, DEFAULT_PAINT, DEFAULT_PAINT_NAME, skinsFor } from './data/cosmetics.ts';
import { nameOf } from './data/cast.ts';
import type { Save, Settings } from './store.ts';

export type ChoiceId = 'paint' | 'body';
export interface Choice { id: ChoiceId; label: string; value: string; options: { id: string; name: string }[]; index: number }
export interface GarageVM { racerId: string; racerName: string; choices: Choice[] }

/** A racer's paints the save can use: their own colours, then each unlocked alt. */
function paints(save: Save, racerId: string): { id: string; name: string }[] {
  return [{ id: DEFAULT_PAINT, name: DEFAULT_PAINT_NAME }, ...skinsFor(racerId).filter((s) => save.unlocked.skins.includes(s.id)).map((s) => ({ id: s.id, name: s.name }))];
}

function bodies(save: Save): { id: string; name: string }[] {
  return BODIES.filter((b) => b.id === DEFAULT_BODY || save.unlocked.bodies.includes(b.id)).map((b) => ({ id: b.id, name: b.name }));
}

/** The paint and body this racer races in (only ever unlocked ones: the store checks on load). */
export function lookFor(save: Save, racerId: string): { paint?: string; body?: string } {
  const paint = save.settings.skinByRacer[racerId];
  const body = save.settings.selectedBodyId;
  return {
    ...(paint && paints(save, racerId).some((p) => p.id === paint) ? { paint } : {}),
    ...(body !== DEFAULT_BODY && bodies(save).some((b) => b.id === body) ? { body } : {}),
  };
}

/** The garage for this racer: a Paint choice when they have an alt unlocked, a Body choice once any body is. */
export function garageModel(save: Save, racerId: string): GarageVM {
  const choices: Choice[] = [];
  const look = lookFor(save, racerId);
  const p = paints(save, racerId);
  if (p.length > 1) {
    const i = Math.max(0, p.findIndex((x) => x.id === (look.paint ?? DEFAULT_PAINT)));
    choices.push({ id: 'paint', label: 'Paint', value: p[i].name, options: p, index: i });
  }
  const b = bodies(save);
  if (b.length > 1) {
    const i = Math.max(0, b.findIndex((x) => x.id === (look.body ?? DEFAULT_BODY)));
    choices.push({ id: 'body', label: 'Body', value: b[i].name, options: b, index: i });
  }
  return { racerId, racerName: nameOf(racerId), choices };
}

/** Step a choice left (−1) or right (+1) for this racer, wrapping. Pure: returns new settings. */
export function stepChoice(save: Save, racerId: string, id: ChoiceId, dir: -1 | 1): Settings {
  const c = garageModel(save, racerId).choices.find((x) => x.id === id);
  if (!c) return save.settings;
  const next = c.options[(c.index + dir + c.options.length) % c.options.length].id;
  if (id === 'body') return { ...save.settings, selectedBodyId: next };
  const skinByRacer = { ...save.settings.skinByRacer };
  if (next === DEFAULT_PAINT) delete skinByRacer[racerId]; else skinByRacer[racerId] = next;
  return { ...save.settings, skinByRacer };
}

/** Mirror mode runs Quick Race and Grand Prix (never a leaderboard mode, never Knockout), once unlocked. */
export const mirrorAllowed = (save: Save, mode: RaceMode | null): boolean => save.unlocked.mirror && (mode === 'quick' || mode === 'grandPrix');
