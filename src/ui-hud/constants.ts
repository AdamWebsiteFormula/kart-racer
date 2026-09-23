// UI constants (docs/sops/ui-hud.md Constants). Durations in ms unless the name says seconds.
/** The game's name, in the two lines the logo stacks. One place to rename it. */
export const GAME_TITLE = Object.freeze(['Rascal', 'Rally!'] as const);
export const GAME_TAGLINE = 'Eight racers. Six worlds. Every final lap, the track fights back.';

export const UI = Object.freeze({
  bannerHoldSeconds: 2.2,
  bannerFadeMs: 260,
  flashMs: 180,
  staggerResultsMs: 120,
  staggerRosterMs: 40,
  wipeMs: 280,
  popEasing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  minimapHz: 30,
  minimapMaxDpr: 2,
  playerDotPx: 6.5,
  aiDotPx: 4.5,
  dotStrokePx: 2.5,
  repeatDelayMs: 180,
  repeatRateMs: 90,
  countUpMs: 700,
  reducedMotionMs: 1,
  /** the rolling item slot changes name this often; wall time drives it (cosmetic only) */
  rouletteFlickerMs: 90,
  /** a gamepad stick past this counts as a direction */
  stickDeadZone: 0.5,
});
