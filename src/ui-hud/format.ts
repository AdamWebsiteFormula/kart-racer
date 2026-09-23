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

/** +1.23 behind, −0.50 ahead, in seconds */
export function formatGap(seconds: number): string {
  const sign = seconds < 0 ? '−' : '+';
  return `${sign}${Math.abs(seconds).toFixed(2)}`;
}

export function kmh(metresPerSecond: number): number {
  return Math.round(Math.abs(metresPerSecond) * 3.6);
}
