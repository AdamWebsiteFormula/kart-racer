// UI constants (docs/sops/ui-hud.md Constants). Durations in ms unless the name says seconds.
/** The game's name, in the two lines the logo stacks. One place to rename it. */
export const GAME_TITLE = Object.freeze(['Rascal', 'Rally!'] as const);

export const UI = Object.freeze({
  bannerHoldSeconds: 2.2,
  bannerFadeMs: 260,
  flashMs: 180,
  staggerResultsMs: 120,
  staggerRosterMs: 40,
  /** a screen change's transition (ui.css `--t-wipe`): the screen coming slides in over this; keys, clicks and the pad wait it out (dropped, never queued) */
  wipeMs: 240,
  /** the screen going leaves faster than the one coming arrives (ui.css `--t-wipe-out`) */
  wipeOutMs: 150,
  /** a racer card the pointer rests on this long is the one on show (the garage dresses it); one it only passes over on the way to the rows below is not */
  hoverDressMs: 150,
  popEasing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  minimapHz: 30,
  minimapMaxDpr: 2,
  playerDotPx: 6.5,
  aiDotPx: 4.5,
  dotStrokePx: 2.5,
  /** a rival's round face on the minimap, as a fraction of the map's width (23 px on the 210 px map: MKW's
   *  are 20-24 px at 1080p), so a pack reads as a stack of faces; the player's is bigger. Never under minimapFaceMinPx */
  minimapFace: 0.11,
  minimapPlayerFace: 0.14,
  minimapFaceMinPx: 12,
  /** a face's ring (the racer's color; white for the player's) and the ink rim round it, CSS px */
  minimapRingPx: 2,
  minimapPlayerRingPx: 3,
  minimapRimPx: 1.5,
  repeatDelayMs: 180,
  repeatRateMs: 90,
  /** the Grand Prix standings' totals count up from the old ones this long (ui.css `--t-count`) */
  countUpMs: 700,
  /**
   * The Grand Prix standings after a race (Mario Kart World): the rows come in on this stagger as they
   * stood before it, each with the points just won beside its total; the totals count up from this long
   * after the screen opens; this long after the count, the rows that change hands flip over into the new
   * order, one place after another down the list (a flip lasts `flipMs`, ui.css `--t-flip`).
   */
  staggerStandingsMs: 50,
  standingsCountAtMs: 700,
  standingsFlipGapMs: 250,
  flipMs: 440,
  flipStaggerMs: 70,
  /** a solo run's lap line (Mario Kart World's Time Trial): the lap just run pops by the timer with its time, and
   *  against the best run at that line (the running total), for this long of race time (a pause holds it) */
  lapPopSeconds: 2.5,
  /** the Knockout cut screen's line (CUT, dashed, across the list) draws in this long after the last row starts coming in */
  cutLineLagMs: 360,
  /** finish → results: FINISH! and its lines leave first (UI.wipeOutMs); the results come in this much later
   *  than a screen coming usually does, once they have gone (ui.css: the results stage's `--lag`) */
  finishLagMs: 100,
  reducedMotionMs: 1,
  /** the rolling item slot changes name this often; wall time drives it (cosmetic only) */
  rouletteFlickerMs: 90,
  /** a gamepad stick past this counts as a direction */
  stickDeadZone: 0.5,
  /** up or down past the first or last stop scrolls a tall panel this far (px) */
  panelScrollPx: 120,
  /** the stylesheet's short-screen block (a phone on its side): the title and pause buttons sit two by two there, and so do their focus grids */
  shortScreenQuery: '(max-height: 500px)',
  /** a window this short (a laptop's 1366x657, a phone on its side) sets the end buttons in one line (ui.css), and their focus grid is one row: two rows of them hid the 7th and 8th places */
  endOneLineQuery: '(max-height: 700px)',
  /** a new end screen (results, standings, the cut) ignores confirms this long: a double click on Continue skipped the Grand Prix standings (audit 24 Sept 2026) */
  endScreenGuardMs: 300,
  /** a confirm (a real key or click, or a pad's A) this soon after any screen or dialog opened is ignored: Enter pressed twice on the title picked Quick Race unseen (sweep, 24 Sept 2026) */
  screenGuardMs: 180,
});
