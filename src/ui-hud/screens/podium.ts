// The podium ceremony's overlay (design §9, §12): what the HUD layer shows over the 3D ceremony
// (game/podium.ts). A headline for the player's result, the series under it, the three places in
// the order they stand (2nd, 1st, 3rd, as the audience sees them), the player's own place when they
// are not up there (Mario Kart World shows the podium to everyone), their stars after a Grand
// Prix, and Continue. Pure.
import { grandPrixTable, starThresholdsFor } from '../../race-manager/series.ts';
import type { GrandPrixState, KnockoutState } from '../../race-manager/types.ts';
import { accentOf, nameOf } from '../data/cast.ts';
import { CUPS, KNOCKOUT_SETS } from '../data/catalog.ts';
import { ordinal } from '../format.ts';

export interface PodiumPlace { place: number; label: string; racerId: string; name: string; accent: string; player: boolean }

export interface PodiumVM {
  headline: string;
  sub: string;
  /** the steps left to right as the audience sees them: 2nd, 1st, 3rd (fewer in a smaller field) */
  places: PodiumPlace[];
  /** the player's own place when it is off the podium ("You placed 5th"), else '' */
  mine: string;
  /** a Grand Prix: the player's stars, 0 to 3; null after a Knockout */
  stars: number | null;
}

/** The order the steps stand in, by place: 2nd, 1st, 3rd. */
const STAND_ORDER = [1, 0, 2];

/**
 * `top`: the podium, 1st to 3rd (race-manager series.ts podiumOf); `gp` or `ko`: the finished series,
 * for the player's own place and stars.
 */
export function podiumModel(top: readonly string[], playerId: string | null, series: { gp?: GrandPrixState; ko?: KnockoutState }): PodiumVM {
  const { gp, ko } = series;
  let place = 0;
  let stars: number | null = null;
  let sub = '';
  if (gp) {
    const table = grandPrixTable(gp, starThresholdsFor(gp.trackIds.length));
    place = table.rows.find((r) => r.racerId === playerId)?.rank ?? 0;
    stars = playerId ? table.stars : null;
    sub = `${CUPS.find((c) => c.id === gp.cupId)?.name ?? 'Grand Prix'} · ${gp.speedClass}cc`;
  } else if (ko) {
    place = (playerId && ko.placings[playerId]) || 0;
    sub = `${KNOCKOUT_SETS.find((c) => c.id === ko.setId)?.name ?? 'Knockout'} · ${ko.speedClass}cc`;
  }
  const what = gp ? 'the cup' : 'the Knockout';
  const headline = !playerId || !place ? 'The podium'
    : place === 1 ? (gp ? 'Cup winner!' : 'Knockout champion!')
    : place <= 3 ? `${ordinal(place)} in ${what}!`
    : 'Congratulations to the winners!';
  const places = STAND_ORDER.filter((i) => i < top.length).map((i) => ({
    place: i + 1, label: ordinal(i + 1), racerId: top[i], name: nameOf(top[i]), accent: accentOf(top[i]), player: top[i] === playerId,
  }));
  const mine = place > 3 ? `You placed ${ordinal(place)}` : '';
  return { headline, sub, places, mine, stars };
}
