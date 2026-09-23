// ui-hud public surface.
export { UiRoot, type RaceFrame, type RaceOver, type RacePlan, type UiHost } from './ui.ts';
export { browserBackend, type Settings } from './store.ts';
export { GAME_TITLE, GAME_TAGLINE, UI } from './constants.ts';
export { TRACKS, trackCard, CUPS, KNOCKOUT_SETS } from './data/catalog.ts';
export { CAST, castCard, accentOf, nameOf } from './data/cast.ts';
export * from './types.ts';
