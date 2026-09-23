// View models for the menu screens: title, mode, roster, cup, pause, settings. Each returns the
// entries to draw and the focus grid that navigates them.
import { ARCHETYPES } from '../../kart-controller/constants.ts';
import type { SpeedClass } from '../../kart-controller/types.ts';
import type { RaceMode } from '../../race-manager/types.ts';
import { CAST } from '../data/cast.ts';
import { CUPS, KNOCKOUT_SETS, playableTracks, trackCard, type CupCard } from '../data/catalog.ts';
import type { Save, Settings } from '../store.ts';
import type { FocusModel } from '../types.ts';

export interface Entry { id: string; label: string; sub?: string; disabled?: boolean; badge?: string }
export interface MenuVM { title: string; entries: Entry[]; focus: FocusModel }

const grid = (rows: Entry[][]): FocusModel => ({
  rows: rows.map((r) => r.map((e) => e.id)),
  disabled: rows.flat().filter((e) => e.disabled).map((e) => e.id),
});

export function titleMenu(): MenuVM {
  const entries: Entry[] = [
    { id: 'start', label: 'Race!' },
    { id: 'settings', label: 'Settings' },
    { id: 'credits', label: 'Credits' },
  ];
  return { title: 'Kart Racer', entries, focus: grid([[entries[0]], [entries[1]], [entries[2]]]) };
}

export const MODES: readonly { mode: RaceMode; label: string; sub: string }[] = Object.freeze([
  { mode: 'quick', label: 'Quick Race', sub: 'One track, eight racers' },
  { mode: 'grandPrix', label: 'Grand Prix', sub: 'Three tracks, points and stars' },
  { mode: 'knockout', label: 'Knockout', sub: 'Eight start. Two finish.' },
  { mode: 'timeTrial', label: 'Time Trial', sub: 'Just you and the clock' },
  { mode: 'daily', label: 'Daily Challenge', sub: 'One seed a day, same for everyone' },
]);

export function modeMenu(available: ReadonlySet<RaceMode>): MenuVM {
  const entries = MODES.map((m) => ({ id: m.mode, label: m.label, sub: m.sub, disabled: !available.has(m.mode), badge: available.has(m.mode) ? undefined : 'Soon' }));
  // three across, matching the .modes grid, so the arrows move the way the cards sit
  return { title: 'Pick a mode', entries, focus: grid([entries.slice(0, 3), entries.slice(3)]) };
}

/** A stat multiplier as a 0.1–1 bar: medium sits at 0.6, each 6 % is one fifth. */
export function statBar(stat: number): number {
  return Math.min(1, Math.max(0.1, (3 + stat / 0.06) / 5));
}

export interface RacerCardVM { id: string; name: string; archetype: string; species: string; personality: string; kart: string; accent: string; secondary: string; stats: { label: string; value: number }[] }
export interface RosterVM { cards: RacerCardVM[]; classes: Entry[]; focus: FocusModel }

export const SPEED_CLASSES: readonly { cc: SpeedClass; label: string; sub: string }[] = Object.freeze([
  { cc: 50, label: '50cc', sub: 'Easy' },
  { cc: 100, label: '100cc', sub: 'Normal' },
  { cc: 150, label: '150cc', sub: 'Hard' },
]);

export function rosterMenu(selectedCc: SpeedClass): RosterVM {
  const cards = CAST.map((c) => {
    const a = ARCHETYPES[c.archetype];
    return {
      id: c.id, name: c.name, archetype: c.archetype[0].toUpperCase() + c.archetype.slice(1), species: c.species,
      personality: c.personality, kart: c.kart, accent: c.accent, secondary: c.secondary,
      stats: [
        { label: 'Speed', value: statBar(a.speed) }, { label: 'Accel', value: statBar(a.accel) },
        { label: 'Handling', value: statBar(a.handling) }, { label: 'Weight', value: statBar(a.weight) },
      ],
    };
  });
  const classes = SPEED_CLASSES.map((s) => ({ id: `cc${s.cc}`, label: s.label, sub: s.sub, badge: s.cc === selectedCc ? '●' : undefined }));
  const ids = cards.map((c) => c.id);
  return { cards, classes, focus: { rows: [ids.slice(0, 4), ids.slice(4, 8), classes.map((c) => c.id)] } };
}

export interface CupEntry extends Entry { tracks: { id: string; name: string; bg: string; accent: string; built: boolean }[]; plays: string[] }
export interface CupVM { title: string; cups: CupEntry[]; focus: FocusModel }

export function cupMenu(mode: 'grandPrix' | 'knockout', built: ReadonlySet<string>, save: Save, cc: SpeedClass): CupVM {
  const list: readonly CupCard[] = mode === 'grandPrix' ? CUPS : KNOCKOUT_SETS;
  const cups = list.map((c) => {
    const plays = playableTracks(c.trackIds, built);
    const done = mode === 'grandPrix' ? save.grandPrix[c.id]?.[String(cc)] : undefined;
    const ko = mode === 'knockout' ? save.knockout[c.id] : undefined;
    const badge = done ? '★'.repeat(done.stars) + '☆'.repeat(3 - done.stars) : ko?.won ? 'Won' : undefined;
    return {
      id: c.id, label: c.name, disabled: plays.length === 0, badge,
      sub: plays.length === 0 ? 'Tracks coming soon' : undefined,
      tracks: c.trackIds.map((id) => { const t = trackCard(id)!; return { id, name: t.name, bg: t.bg, accent: t.accent, built: built.has(id) }; }),
      plays,
    };
  });
  return { title: mode === 'grandPrix' ? 'Pick a cup' : 'Pick a Knockout', cups, focus: grid([cups]) };
}

export function pauseMenu(): MenuVM {
  const entries: Entry[] = [
    { id: 'resume', label: 'Resume' }, { id: 'restart', label: 'Restart' },
    { id: 'settings', label: 'Settings' }, { id: 'credits', label: 'Credits' }, { id: 'quit', label: 'Quit race' },
  ];
  return { title: 'Paused', entries, focus: grid(entries.map((e) => [e])) };
}

// ---- settings ----
export type SettingId = 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'quality' | 'resolutionScale' | 'reducedMotion' | 'iconLabels';
export interface SettingRow { id: SettingId; label: string; value: string; fraction?: number }

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function settingsMenu(s: Settings): { title: string; rows: SettingRow[]; focus: FocusModel } {
  const rows: SettingRow[] = [
    { id: 'masterVolume', label: 'Master volume', value: pct(s.masterVolume), fraction: s.masterVolume },
    { id: 'musicVolume', label: 'Music', value: pct(s.musicVolume), fraction: s.musicVolume },
    { id: 'sfxVolume', label: 'Sound effects', value: pct(s.sfxVolume), fraction: s.sfxVolume },
    { id: 'quality', label: 'Graphics', value: s.quality === 'auto' ? 'Auto' : s.quality === 'high' ? 'High' : 'Low' },
    { id: 'resolutionScale', label: 'Resolution', value: pct(s.resolutionScale), fraction: (s.resolutionScale - 0.5) / 0.5 },
    { id: 'reducedMotion', label: 'Reduce motion', value: s.reducedMotion === 'auto' ? 'Follow system' : s.reducedMotion === 'on' ? 'On' : 'Off' },
    { id: 'iconLabels', label: 'Item letters', value: s.iconLabels ? 'On' : 'Off' },
  ];
  return { title: 'Settings', rows, focus: { rows: [...rows.map((r) => [r.id]), ['done']] } };
}

const cycle = <T,>(opts: readonly T[], v: T, dir: number): T => opts[(opts.indexOf(v) + dir + opts.length) % opts.length];
const step = (v: number, dir: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v + dir * 0.1)) * 10) / 10;

/** Left/right (dir −1/+1) or confirm (dir +1) on a settings row. Pure; returns a new object. */
export function adjustSetting(s: Settings, id: SettingId, dir: -1 | 1): Settings {
  switch (id) {
    case 'masterVolume': case 'musicVolume': case 'sfxVolume': return { ...s, [id]: step(s[id], dir, 0, 1) };
    case 'resolutionScale': return { ...s, resolutionScale: step(s.resolutionScale, dir, 0.5, 1) };
    case 'quality': return { ...s, quality: cycle(['auto', 'high', 'low'] as const, s.quality, dir) };
    case 'reducedMotion': return { ...s, reducedMotion: cycle(['auto', 'on', 'off'] as const, s.reducedMotion, dir) };
    case 'iconLabels': return { ...s, iconLabels: !s.iconLabels };
  }
}
