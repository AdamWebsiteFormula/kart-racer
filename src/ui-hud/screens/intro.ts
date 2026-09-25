// The course intro's title card (game/intro.ts flies the camera): the track's name big, its cup over
// it, and a line saying which race this is, with the player's racer in the corner. Pure.
import type { SpeedClass } from '../../kart-controller/types.ts';
import type { RaceMode } from '../../race-manager/types.ts';
import { castCard } from '../data/cast.ts';
import { CUPS, KNOCKOUT_SETS, trackCard } from '../data/catalog.ts';
import { seedDate } from './results.ts';

export interface IntroCardInput {
  trackId: string;
  /** the track file's name, when the catalog has no card for it */
  trackName?: string;
  mode: RaceMode;
  speedClass: SpeedClass;
  mirrored?: boolean;
  racerId: string | null;
  /** a Grand Prix's cup or a Knockout's set */
  seriesId?: string | null;
  /** which race of the series this is (0-based) and how many it has */
  race?: { index: number; count: number };
  /** Knockout: how many go through this round */
  cutLine?: number;
  /** Daily Challenge: its seed (YYYYMMDD) */
  dailySeed?: number;
  /** a touch screen: "Tap to skip" */
  touch?: boolean;
}

export interface IntroCardVM {
  /** the cup (or Knockout set) over the name */
  cup: string;
  name: string;
  /** which race: "Race 1 of 3 · 150cc", "Round 2 of 3 · Top 4 go through", "Time Trial" */
  sub: string;
  racer: { id: string; name: string; accent: string } | null;
  /** how to skip, in the words of the last input used (the stylesheet shows one: `data-input`); on a touch screen both are the tap's */
  skip: { keys: string; pad: string };
  /** the track card's colors: the ribbon behind the name */
  bg: string;
  accent: string;
}

/** How to skip the intro: a keyboard player may have a pad in hand too; a pad player has only buttons; a touch screen taps. */
export const INTRO_SKIP = Object.freeze({ keys: 'Press any key or button to skip', pad: 'Press any button to skip', touch: 'Tap to skip' });

const MODE_NAMES: Readonly<Record<RaceMode, string>> = { quick: 'Quick Race', grandPrix: 'Grand Prix', knockout: 'Knockout', timeTrial: 'Time Trial', daily: 'Daily Challenge' };

export function introCard(i: IntroCardInput): IntroCardVM {
  const card = trackCard(i.trackId);
  const series = i.mode === 'knockout' ? KNOCKOUT_SETS.find((s) => s.id === i.seriesId) : i.mode === 'grandPrix' ? CUPS.find((c) => c.id === i.seriesId) : undefined;
  const cup = series?.name ?? CUPS.find((c) => c.trackIds.includes(i.trackId))?.name ?? '';
  const parts: string[] = [];
  const r = i.race;
  if (i.mode === 'grandPrix') parts.push(r ? `Race ${r.index + 1} of ${r.count}` : MODE_NAMES.grandPrix, `${i.speedClass}cc`);
  else if (i.mode === 'knockout') {
    const final = r !== undefined && r.index >= r.count - 1;
    parts.push(r ? (final ? 'Final round' : `Round ${r.index + 1} of ${r.count}`) : MODE_NAMES.knockout);
    parts.push(final || !i.cutLine ? 'Win it all' : `Top ${i.cutLine} go through`);
  } else if (i.mode === 'daily') parts.push(MODE_NAMES.daily, ...(i.dailySeed ? [seedDate(i.dailySeed)] : []));
  else if (i.mode === 'timeTrial') parts.push(MODE_NAMES.timeTrial);
  else parts.push(MODE_NAMES.quick, `${i.speedClass}cc`);
  if (i.mirrored) parts.push('Mirror');
  const c = i.racerId ? castCard(i.racerId) : undefined;
  return {
    cup, name: card?.name ?? i.trackName ?? i.trackId, sub: parts.join(' · '),
    racer: c ? { id: c.id, name: c.name, accent: c.accent } : null,
    skip: i.touch ? { keys: INTRO_SKIP.touch, pad: INTRO_SKIP.touch } : { keys: INTRO_SKIP.keys, pad: INTRO_SKIP.pad },
    bg: card?.bg ?? '#1b1b2f', accent: card?.accent ?? '#ffd23f',
  };
}
