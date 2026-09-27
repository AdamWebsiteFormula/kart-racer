// View models for the menu screens: title, mode, roster, cup, pause, settings. Each returns the
// entries to draw and the focus grid that navigates them.
import type { SpeedClass } from '../../kart-controller/types.ts';
import type { RaceMode } from '../../race-manager/types.ts';
import { GAME_TITLE } from '../constants.ts';
import { CAST } from '../data/cast.ts';
import { CUPS, KNOCKOUT_SETS, playableTracks, trackCard, TRACKS, type CupCard } from '../data/catalog.ts';
import { formatMs } from '../format.ts';
import type { Save, Settings } from '../store.ts';
import { move } from '../focus.ts';
import type { FocusModel, NavAction } from '../types.ts';
import type { GarageVM } from '../garage.ts';
import { ownKart } from '../data/karts.ts';
import { comboStats } from '../data/kartStats.ts';
import { panelWords, statPanel, type StatPanelVM } from './stats.ts';

export interface Entry { id: string; label: string; sub?: string; disabled?: boolean; badge?: string }
export interface MenuVM { title: string; entries: Entry[]; focus: FocusModel }

const grid = (rows: Entry[][]): FocusModel => ({
  rows: rows.map((r) => r.map((e) => e.id)),
  disabled: rows.flat().filter((e) => e.disabled).map((e) => e.id),
});

/** Two by two on a short screen (UI.shortScreenQuery), as the stylesheet sets the buttons, else one column. */
const column = (entries: Entry[], twoByTwo: boolean): FocusModel => {
  const rows: Entry[][] = [];
  const n = twoByTwo ? 2 : 1;
  for (let i = 0; i < entries.length; i += n) rows.push(entries.slice(i, i + n));
  return grid(rows);
};

/**
 * The title's menu: one band under another down the left, as Mario Kart World's main menu sets its own (design §12,
 * 26 Sept 2026); on a phone on its side too, the logo beside them (menus.css), so the focus runs up and down everywhere.
 */
export function titleMenu(): MenuVM {
  const entries: Entry[] = [
    { id: 'start', label: 'Race!' },
    { id: 'howTo', label: 'How to Play' },
    { id: 'unlocks', label: 'Unlocks' },
    { id: 'settings', label: 'Settings' },
    { id: 'credits', label: 'Credits' },
  ];
  return { title: GAME_TITLE.join(' '), entries, focus: column(entries, false) };
}

export const MODES: readonly { mode: RaceMode; label: string; sub: string }[] = Object.freeze([
  { mode: 'quick', label: 'Quick Race', sub: 'One track, eight racers' },
  { mode: 'grandPrix', label: 'Grand Prix', sub: 'Three tracks, points and stars' },
  { mode: 'knockout', label: 'Knockout', sub: 'Eight start. Cuts every race. One wins.' },
  { mode: 'timeTrial', label: 'Time Trial', sub: 'No items: race your ghost for medals' },
  { mode: 'daily', label: 'Daily Challenge', sub: "Today's track, the same for everyone" },
]);

export function modeMenu(available: ReadonlySet<RaceMode>): MenuVM {
  const entries = MODES.map((m) => ({ id: m.mode, label: m.label, sub: m.sub, disabled: !available.has(m.mode), badge: available.has(m.mode) ? undefined : 'Soon' }));
  // one band under another down the left, as Mario Kart World's mode menu (design §12, 26 Sept 2026): up and down
  // move, and left and right step through them too (listStep)
  return { title: 'Pick a mode', entries, focus: column(entries, false) };
}

/**
 * Left and right on a one-column list (the Mode screen's bands): a step back or on through it, as up and down go,
 * wrapping and past any not open yet, so a pad's stick or the arrows either way run through the modes. Null for
 * up and down (the plain grid's move) and for a list that is not one column.
 */
export function listStep(focus: FocusModel, cur: string, dir: NavAction): string | null {
  if ((dir !== 'left' && dir !== 'right') || focus.rows.some((r) => r.length !== 1)) return null;
  return move(focus, cur, dir === 'right' ? 'down' : 'up');
}

/** A stat multiplier as a 0.1–1 bar: medium sits at 0.6, each 6 % is one fifth. */
export function statBar(stat: number): number {
  return Math.min(1, Math.max(0.1, (3 + stat / 0.06) / 5));
}

/**
 * A racer tile: only the racer's face shows (Mario Kart World's roster tiles are the racers alone: no class, no
 * words, no bars; Adam, 26 Sept 2026: "it shouldn't even appear unless you press a button"); the rest is for its
 * label. `words`: the racer's own four stats (in their own kart: their class) for a screen reader ("Speed 2 of
 * 10. Accel 8 of 10. …"), on the stats panel's scale.
 */
export interface RacerCardVM { id: string; name: string; archetype: string; species: string; personality: string; kart: string; accent: string; secondary: string; stats: { label: string; value: number }[]; words: string }
/**
 * `garage`: the paint (and, with karts not picked, body) choices for the racer being dressed (garage.ts); a row in
 * the grid only when it has any. `panel`: the stats (shown by the Stats button): the racer on show in the kart
 * they would race in, as a ghost over the combo chosen now (screens/stats.ts statPanel); `kartName`: that kart,
 * for the name's line.
 */
export interface RosterVM { cards: RacerCardVM[]; focus: FocusModel; garage?: GarageVM; panel?: StatPanelVM; kartName?: string }

export const SPEED_CLASSES: readonly { cc: SpeedClass; label: string; sub: string }[] = Object.freeze([
  { cc: 50, label: '50cc', sub: 'Easy' },
  { cc: 100, label: '100cc', sub: 'Normal' },
  { cc: 150, label: '150cc', sub: 'Hard' },
]);

/**
 * The speed class row, where Mario Kart World asks for it: after the cup (its 50cc, 100cc and 150cc badges take
 * the cup emblems' place on the cup screen: stills from youtube.com/watch?v=_9JZhslBy3E; "the next menu after
 * selecting a cup also shows your best ranking for each individual engine class", gamefaqs.gamespot.com/boards/
 * 507486-mario-kart-world/80993143), so ours sits under the cups (Grand Prix, Knockout) and under the tracks
 * (Quick Race), and the Racer screen is the racers alone. Time Trial and Daily always run at 150cc (the
 * leaderboard replays them so: soloConfig): no row. `mirror`: the Mirror switch's state, at the row's end, when
 * Mirror is unlocked and the mode takes it (garage.ts mirrorAllowed); absent, no switch.
 */
export function speedRow(mode: RaceMode | null, selectedCc: SpeedClass, mirror?: boolean): Entry[] {
  if (mode === 'timeTrial' || mode === 'daily') return [];
  const row: Entry[] = SPEED_CLASSES.map((s) => ({ id: `cc${s.cc}`, label: s.label, sub: s.sub, badge: s.cc === selectedCc ? '●' : undefined }));
  if (mirror !== undefined) row.push({ id: 'mirror', label: 'Mirror', sub: mirror ? 'On' : 'Off', badge: mirror ? '●' : undefined });
  return row;
}

/**
 * The Racer screen: the eight racers' tiles, four by two. `extras.garage`: the paint and body choices, a row
 * under the tiles when it has any; `extras.panel` and `kartName`: the stats and the kart the racer on show
 * would race in. `oneRow`: a short screen (a phone on its side, UI.shortScreenQuery) sets the eight in one
 * row, and so does the grid.
 */
export function rosterMenu(extras: { garage?: GarageVM; panel?: StatPanelVM; kartName?: string } = {}, oneRow = false): RosterVM {
  const cards = CAST.map((c): RacerCardVM => {
    const own = statPanel(comboStats(c.id, ownKart(c.id)));
    return {
      id: c.id, name: c.name, archetype: c.archetype[0].toUpperCase() + c.archetype.slice(1), species: c.species,
      personality: c.personality, kart: c.kart, accent: c.accent, secondary: c.secondary,
      stats: own.rows.map((r) => ({ label: r.label, value: r.value })), words: panelWords(own),
    };
  });
  const ids = cards.map((c) => c.id);
  const rows = oneRow ? [ids] : [ids.slice(0, 4), ids.slice(4, 8)];
  const garage = extras.garage;
  if (garage?.choices.length) rows.push(garage.choices.map((c) => c.id));
  return {
    cards, focus: { rows }, ...(garage ? { garage } : {}),
    ...(extras.panel ? { panel: extras.panel } : {}), ...(extras.kartName ? { kartName: extras.kartName } : {}),
  };
}

/** The ids on the racer screen that are racer cards. */
const CARD_IDS: ReadonlySet<string> = new Set(CAST.map((c) => c.id));

/**
 * How the focus moves on the racer screen, where the rows under the cards (Paint, Body, the class)
 * belong to the racer on show (`dressed`). Moving down to them must never change who that is: down
 * from Pip used to land on Otto's card first and put Otto on show (sweep, 24 Sept 2026). So:
 * - down from any card goes straight to the first row under the cards, the racer on show kept;
 * - left and right run through all eight cards in reading order, wrapping, so every card is a
 *   press or two away without going down;
 * - up from a card moves to the other row of cards (round inside them); with one row of cards it is the plain grid's;
 * - from the rows under the cards, a move that would land on a card lands on the racer on show:
 *   up from the first row, or down past the last one round to the top.
 * Returns null for a move the plain grid (focus.ts move) makes as it is.
 */
export function rosterMove(focus: FocusModel, cur: string, dir: NavAction, dressed: string): string | null {
  const cardRows = focus.rows.filter((r) => r.some((id) => CARD_IDS.has(id))).length;
  const cards = focus.rows.slice(0, cardRows).flat();
  const at = cards.indexOf(cur);
  if (at >= 0) {
    const r = focus.rows.findIndex((row) => row.includes(cur));
    const col = focus.rows[r].indexOf(cur);
    const nearest = (row: readonly string[]) => row[Math.min(col, row.length - 1)];
    if (dir === 'left' || dir === 'right') return cards[(at + (dir === 'right' ? 1 : -1) + cards.length) % cards.length];
    if (dir === 'down') { const below = focus.rows[cardRows]; return below?.length ? nearest(below) : null; }
    if (dir === 'up' && cardRows > 1) return nearest(focus.rows[(r + cardRows - 1) % cardRows]);
    return null;
  }
  if (dir !== 'up' && dir !== 'down') return null;
  const next = move(focus, cur, dir);
  return CARD_IDS.has(next) && cards.includes(dressed) ? dressed : null;
}

export interface CupEntry extends Entry { tracks: { id: string; name: string; bg: string; accent: string; built: boolean }[]; plays: string[] }
/** `classes`: the speed class row under the cups (speedRow), the stars on each cup for the class chosen there */
export interface CupVM { title: string; cups: CupEntry[]; classes: Entry[]; focus: FocusModel }

/** `mirror`: the Mirror switch's state for the class row, when the mode takes it (absent: no switch) */
export function cupMenu(mode: 'grandPrix' | 'knockout', built: ReadonlySet<string>, save: Save, cc: SpeedClass, mirror?: boolean): CupVM {
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
  const classes = speedRow(mode, cc, mirror);
  return { title: mode === 'grandPrix' ? 'Pick a cup' : 'Pick a Knockout', cups, classes, focus: grid(classes.length ? [cups, classes] : [cups]) };
}

/** `medal`: a Time Trial card's best medal (its badge in the corner); absent for none */
export interface TrackEntry extends Entry { biome: string; bg: string; accent: string; medal?: MedalWon }
/** A row of tracks under its cup's name (the Track screen sets them by cup, as MKW heads each cup's courses with its name). */
export interface TrackGroup { id: string; name: string; tracks: TrackEntry[] }
/** `classes`: the speed class row under the tracks (Quick Race; speedRow), none for a Time Trial. `groups`: the tracks by cup, a row each */
export interface TrackVM { title: string; tracks: TrackEntry[]; groups: TrackGroup[]; classes: Entry[]; focus: FocusModel }

/** A track's Time Trial medal times (its track file's `medalTimesMs`). */
export interface MedalTimes { gold: number; silver: number; bronze: number }
export type Medal = 'none' | 'bronze' | 'silver' | 'gold';
/** A medal won, best first. */
export type MedalWon = Exclude<Medal, 'none'>;
export const MEDALS: readonly MedalWon[] = Object.freeze(['gold', 'silver', 'bronze']);
/** A time on the line is the medal's: the times are "at most". */
export function medalFor(ms: number, m: MedalTimes): Medal {
  return ms <= m.gold ? 'gold' : ms <= m.silver ? 'silver' : ms <= m.bronze ? 'bronze' : 'none';
}
/** "Gold", "Silver", "Bronze" */
export const medalLabel = (m: MedalWon): string => `${m[0].toUpperCase()}${m.slice(1)}`;

/** A Time Trial run against the track's medal times: the medal it won, and each medal's time, reached or not (the results screen's ladder). */
export interface MedalLadderVM { won: Medal; steps: { medal: MedalWon; label: string; time: string; reached: boolean }[] }
export function medalLadder(ms: number, m: MedalTimes): MedalLadderVM {
  return { won: medalFor(ms, m), steps: MEDALS.map((k) => ({ medal: k, label: medalLabel(k), time: formatMs(m[k]), reached: ms <= m[k] })) };
}

/**
 * Every built track in cup order, a row for each cup under its name (a track in no cup: a last row of its own); a
 * Time Trial card shows your best time and its medal, graded against the track's medal times now (a medal saved
 * under older times goes stale). `speed`: the class chosen (and the Mirror switch's state, where the mode takes
 * it) for the class row under the tracks (speedRow: Quick Race only); absent, no row.
 */
export function trackMenu(mode: RaceMode, built: ReadonlySet<string>, save: Save, medalTimes: ReadonlyMap<string, MedalTimes>, speed?: { cc: SpeedClass; mirror?: boolean }): TrackVM {
  const tracks: TrackEntry[] = TRACKS.filter((t) => built.has(t.id)).map((t) => {
    const best = mode === 'timeTrial' ? save.timeTrial[t.id] : undefined;
    const times = medalTimes.get(t.id);
    const m = best && times ? medalFor(best.bestMs, times) : 'none';
    const medal = m !== 'none' ? ` · ${medalLabel(m)}` : '';
    return {
      id: t.id, label: t.name, biome: t.biome, bg: t.bg, accent: t.accent, sub: best ? `Best ${formatMs(best.bestMs)}${medal}` : undefined,
      ...(m !== 'none' ? { medal: m } : {}),
    };
  });
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const groups: TrackGroup[] = CUPS.map((c) => ({ id: c.id, name: c.name, tracks: c.trackIds.flatMap((id) => byId.get(id) ?? []) }));
  const loose = tracks.filter((t) => !CUPS.some((c) => c.trackIds.includes(t.id)));
  if (loose.length) groups.push({ id: 'more', name: '', tracks: loose });
  const shown = groups.filter((g) => g.tracks.length);
  const rows: Entry[][] = shown.map((g) => g.tracks);
  const classes = speed ? speedRow(mode, speed.cc, speed.mirror) : [];
  if (classes.length) rows.push(classes);
  return { title: mode === 'timeTrial' ? 'Time Trial: pick a track' : 'Pick a track', tracks, groups: shown, classes, focus: grid(rows) };
}

/** `canRestart`: false in a Grand Prix or Knockout, where a restart would redo a finished race for its points or its win (audit 24 Sept 2026) */
export function pauseMenu(twoByTwo = false, canRestart = true): MenuVM {
  const entries: Entry[] = [
    { id: 'resume', label: 'Resume' }, ...(canRestart ? [{ id: 'restart', label: 'Restart' }] : []), { id: 'howTo', label: 'How to Play' },
    { id: 'settings', label: 'Settings' }, { id: 'credits', label: 'Credits' }, { id: 'quit', label: 'Quit race' },
  ];
  return { title: 'Paused', entries, focus: column(entries, twoByTwo) };
}

// ---- settings ----
export type SettingId = 'autoAccelerate' | 'steeringAssist' | 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'voiceVolume' | 'quality' | 'resolutionScale' | 'fullscreen' | 'reducedMotion' | 'iconLabels';
/** `help`: one short line on what the row does (the panel shows the focused row's, as MKW's options do) */
export interface SettingRow { id: SettingId; label: string; value: string; fraction?: number; help: string }

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * What each setting does, in a line (sweep 25 Sept 2026: the panel listed them with no word on any).
 * Graphics and Reduce motion say what the value on show does (main.ts applyRender: Auto has the
 * performance governor trade resolution, then shadows and effects, for a smooth frame rate; Low turns
 * the shadows and the post effects off). Item labels is the colorblind-safe letter on the held item (icons.ts glyph).
 * The two driving aids come first, for a new player (MKW's options lead with theirs): game/assist.ts.
 */
export const SETTING_HELP = Object.freeze({
  autoAccelerate: 'The gas stays down for you from GO. Brake still works.',
  steeringAssist: "Nudges you back from the road's edge. You still steer.",
  fullscreen: 'Fills the whole screen. Press F anytime to switch.',
  masterVolume: 'Every sound in the game: music and effects together.',
  musicVolume: 'The songs in the menus and on every track.',
  sfxVolume: 'Engines, drifts, items, horns and menu clicks.',
  voiceVolume: 'What racers shout on tricks, hits, passes and finishes.',
  quality: { auto: 'Auto picks the best look your device can keep smooth.', high: 'Shadows and every effect on. Best on a fast device.', low: 'No shadows or screen effects, for a smoother race.' },
  resolutionScale: 'How sharp the picture is. Lower it if the race stutters.',
  reducedMotion: { auto: "Follows your device's own reduce motion setting.", on: 'Calmer camera and screens: no swoops, shakes or slides.', off: 'Full motion: camera swoops, shakes and screen slides.' },
  iconLabels: 'A letter on your item, to tell items apart at a glance.',
});
/** Done's line: nothing waits to be saved */
export const DONE_HELP = 'Changes save as you make them.';

const onOff = (on: boolean) => (on ? 'On' : 'Off');

/**
 * `fullscreen`: whether the page is fullscreen now (fullscreen.ts fullscreenState: the browser holds it,
 * never the save), or null where the browser has none (iPhone Safari), and then there is no row for it.
 */
export function settingsMenu(s: Settings, fullscreen: boolean | null = null): { title: string; rows: SettingRow[]; focus: FocusModel } {
  const H = SETTING_HELP;
  const rows: SettingRow[] = [
    { id: 'autoAccelerate', label: 'Auto-accelerate', value: onOff(s.autoAccelerate), help: H.autoAccelerate },
    // (our own words, as racing games say it: the MKW option goes by Nintendo's name)
    { id: 'steeringAssist', label: 'Steering assist', value: onOff(s.steeringAssist), help: H.steeringAssist },
    { id: 'masterVolume', label: 'Master volume', value: pct(s.masterVolume), fraction: s.masterVolume, help: H.masterVolume },
    { id: 'musicVolume', label: 'Music', value: pct(s.musicVolume), fraction: s.musicVolume, help: H.musicVolume },
    { id: 'sfxVolume', label: 'Sound effects', value: pct(s.sfxVolume), fraction: s.sfxVolume, help: H.sfxVolume },
    { id: 'voiceVolume', label: 'Voices', value: pct(s.voiceVolume), fraction: s.voiceVolume, help: H.voiceVolume },
    { id: 'quality', label: 'Graphics', value: s.quality === 'auto' ? 'Auto' : s.quality === 'high' ? 'High' : 'Low', help: H.quality[s.quality] },
    { id: 'resolutionScale', label: 'Resolution', value: pct(s.resolutionScale), fraction: (s.resolutionScale - 0.5) / 0.5, help: H.resolutionScale },
    ...(fullscreen === null ? [] : [{ id: 'fullscreen' as const, label: 'Fullscreen', value: onOff(fullscreen), help: H.fullscreen }]),
    { id: 'reducedMotion', label: 'Reduce motion', value: s.reducedMotion === 'auto' ? 'Follow system' : s.reducedMotion === 'on' ? 'On' : 'Off', help: H.reducedMotion[s.reducedMotion] },
    // "Item letters" said what it drew, not what it is for (sweep 25 Sept 2026)
    { id: 'iconLabels', label: 'Item labels', value: s.iconLabels ? 'On' : 'Off', help: H.iconLabels },
  ];
  return { title: 'Settings', rows, focus: { rows: [...rows.map((r) => [r.id]), ['done']] } };
}

const cycle = <T,>(opts: readonly T[], v: T, dir: number): T => opts[(opts.indexOf(v) + dir + opts.length) % opts.length];
const step = (v: number, dir: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v + dir * 0.1)) * 10) / 10;

/** Left/right (dir −1/+1) or confirm (dir +1) on a settings row. Pure; returns a new object. Fullscreen is the browser's, not the save's: unchanged here (UiRoot asks the browser). */
export function adjustSetting(s: Settings, id: SettingId, dir: -1 | 1): Settings {
  switch (id) {
    case 'autoAccelerate': return { ...s, autoAccelerate: !s.autoAccelerate };
    case 'steeringAssist': return { ...s, steeringAssist: !s.steeringAssist };
    case 'fullscreen': return s;
    case 'masterVolume': case 'musicVolume': case 'sfxVolume': case 'voiceVolume': return { ...s, [id]: step(s[id], dir, 0, 1) };
    case 'resolutionScale': return { ...s, resolutionScale: step(s.resolutionScale, dir, 0.5, 1) };
    case 'quality': return { ...s, quality: cycle(['auto', 'high', 'low'] as const, s.quality, dir) };
    case 'reducedMotion': return { ...s, reducedMotion: cycle(['auto', 'on', 'off'] as const, s.reducedMotion, dir) };
    case 'iconLabels': return { ...s, iconLabels: !s.iconLabels };
  }
}
