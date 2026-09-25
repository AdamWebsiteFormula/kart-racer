// Text formatters. Pure.
const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

/** M:SS.ss; negative clamps to 0:00.00 */
export function formatTime(seconds: number): string {
  if (!(seconds > 0)) return '0:00.00';
  const hundredths = Math.round(seconds * 100);
  const m = Math.floor(hundredths / 6000);
  const s = (hundredths - m * 6000) / 100;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`;
}

export function formatMs(ms: number): string {
  return ms < 0 ? '—' : formatTime(ms / 1000);
}

export function ordinal(rank: number): string {
  if (rank >= 1 && rank <= ORDINALS.length) return ORDINALS[rank - 1];
  const n = Math.max(0, Math.round(rank));
  const t = n % 100;
  const suffix = t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** the number part and the suffix apart, for the big HUD numeral */
export function ordinalParts(rank: number): { n: string; suffix: string } {
  const o = ordinal(rank);
  const m = /^(\d+)(\D+)$/.exec(o);
  return m ? { n: m[1], suffix: m[2] } : { n: o, suffix: '' };
}

/** Two digits, as the coin counter shows its count (05, 10); never negative */
export function twoDigits(n: number): string {
  const v = Math.max(0, Math.round(n));
  return v < 10 ? `0${v}` : `${v}`;
}

/** +1.23 behind, −0.50 ahead, in seconds */
export function formatGap(seconds: number): string {
  const sign = seconds < 0 ? '−' : '+';
  return `${sign}${Math.abs(seconds).toFixed(2)}`;
}

/** A Time Trial time against the best it raced: "−1.37" ahead, "+0.85" behind; `words` for assistive tech */
export interface BestDelta { text: string; ahead: boolean; words: string }

/** `ms` against `bestMs`, as a Time Trial shows it at a lap line and on its results: seconds to the hundredth, signed. */
export function bestDelta(ms: number, bestMs: number): BestDelta {
  const d = ms - bestMs, s = Math.abs(d / 1000).toFixed(2);
  return { text: formatGap(d / 1000), ahead: d < 0, words: `${s} seconds ${d < 0 ? 'ahead of' : 'behind'} your best` };
}

/** Speed in miles per hour: the game is written for US players (Adam, 24 Sept 2026). */
export function mph(metresPerSecond: number): number {
  return Math.round(Math.abs(metresPerSecond) * 2.2369363);
}
