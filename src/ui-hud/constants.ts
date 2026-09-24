// UI constants (docs/sops/ui-hud.md Constants). Durations in ms unless the name says seconds.
/** The game's name, in the two lines the logo stacks. One place to rename it. */
export const GAME_TITLE = Object.freeze(['Rascal', 'Rally!'] as const);

export const UI = Object.freeze({
  bannerHoldSeconds: 2.2,
  /** the controls strip stays this long after the go (it shows through the countdown) */
  keysHintSeconds: 3.5,
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
  /** up or down past the first or last stop scrolls a tall panel this far (px) */
  panelScrollPx: 120,
  /** the stylesheet's short-screen block (a phone on its side): the title and pause buttons sit two by two there, and so do their focus grids */
  shortScreenQuery: '(max-height: 500px)',
  /** a new end screen (results, standings, the cut) ignores confirms this long: a double click on Continue skipped the Grand Prix standings (audit 24 Sept 2026) */
  endScreenGuardMs: 300,
});
