// The screen flow as a pure reducer. Every transition is an action, so a test can walk the
// whole graph with no browser (docs/sops/ui-hud.md test 1).
import type { AppAction, AppState, Overlay } from './types.ts';

export function initialApp(): AppState {
  return { screen: 'boot', overlays: [], mode: null, racerId: 'pip', speedClass: 100, cupId: null, trackId: null, seriesHasNext: false };
}

export const needsCup = (s: AppState) => s.mode === 'grandPrix' || s.mode === 'knockout';
/** Quick Race and Time Trial race one track the player picks (Daily picks its own). */
export const needsTrack = (s: AppState) => s.mode === 'quick' || s.mode === 'timeTrial';
export const topOverlay = (s: AppState): Overlay | undefined => s.overlays[s.overlays.length - 1];
export const isPaused = (s: AppState) => s.screen === 'racing' && s.overlays.length > 0;

const push = (s: AppState, o: Overlay): AppState => (topOverlay(s) === o ? s : { ...s, overlays: [...s.overlays, o] });
const pop = (s: AppState): AppState => ({ ...s, overlays: s.overlays.slice(0, -1) });

export function reduce(s: AppState, a: AppAction): AppState {
  // overlays capture everything except the actions that act on them
  if (s.overlays.length) {
    switch (a.type) {
      case 'back': case 'resume': return a.type === 'resume' ? { ...s, overlays: [] } : pop(s);
      case 'openSettings': return push(s, 'settings');
      case 'openCredits': return push(s, 'credits');
      case 'openUnlocks': return s.screen === 'title' ? push(s, 'unlocks') : s;
      case 'openHowTo': return push(s, 'howTo');
      // no restart in a Grand Prix or Knockout: it redid a finished race for its points or its win
      case 'restart': return s.screen === 'racing' && s.mode !== 'grandPrix' && s.mode !== 'knockout' ? { ...s, overlays: [] } : s;
      case 'quit': return { ...s, overlays: [], screen: 'modeSelect', seriesHasNext: false };
      default: return s;
    }
  }
  switch (a.type) {
    case 'boot': return s.screen === 'boot' ? { ...s, screen: 'title' } : s;
    case 'start': return s.screen === 'title' ? { ...s, screen: 'modeSelect' } : s;
    case 'pickMode': return s.screen === 'modeSelect' ? { ...s, mode: a.mode, cupId: null, trackId: null, screen: 'rosterSelect' } : s;
    case 'setSpeedClass': return { ...s, speedClass: a.speedClass };
    case 'pickRacer':
      if (s.screen !== 'rosterSelect') return s;
      return { ...s, racerId: a.racerId, screen: needsCup(s) ? 'cupSelect' : needsTrack(s) ? 'trackSelect' : 'racing' };
    case 'pickCup': return s.screen === 'cupSelect' ? { ...s, cupId: a.cupId, screen: 'racing' } : s;
    case 'pickTrack': return s.screen === 'trackSelect' ? { ...s, trackId: a.trackId, screen: 'racing' } : s;
    case 'raceFinished': return s.screen === 'racing' ? { ...s, screen: 'results', seriesHasNext: a.seriesHasNext } : s;
    case 'continue':
      if (s.screen === 'results') {
        if (s.mode === 'grandPrix') return { ...s, screen: 'gpTable' };
        if (s.mode === 'knockout') return { ...s, screen: 'knockoutCut' };
        return { ...s, screen: 'modeSelect' };
      }
      if (s.screen === 'gpTable' || s.screen === 'knockoutCut') {
        return s.seriesHasNext ? { ...s, screen: 'racing' } : { ...s, screen: 'modeSelect', seriesHasNext: false };
      }
      return s;
    case 'pause': return s.screen === 'racing' ? push(s, 'pause') : s;
    case 'openSettings': return s.screen === 'title' || s.screen === 'modeSelect' ? push(s, 'settings') : s;
    case 'openCredits': return s.screen === 'title' ? push(s, 'credits') : s;
    case 'openUnlocks': return s.screen === 'title' ? push(s, 'unlocks') : s;
    case 'openHowTo': return s.screen === 'title' ? push(s, 'howTo') : s;
    case 'back':
      switch (s.screen) {
        case 'modeSelect': return { ...s, screen: 'title' };
        case 'rosterSelect': return { ...s, screen: 'modeSelect' };
        case 'cupSelect': return { ...s, screen: 'rosterSelect' };
        case 'trackSelect': return { ...s, screen: 'rosterSelect' };
        case 'racing': return push(s, 'pause');
        default: return s;
      }
    default: return s;
  }
}
