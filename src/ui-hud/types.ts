// ui-hud types. No DOM, no Three.js.
import type { SpeedClass } from '../kart-controller/types.ts';
import type { RaceMode } from '../race-manager/types.ts';

export type Screen =
  | 'boot' | 'title' | 'modeSelect' | 'rosterSelect' | 'cupSelect' | 'trackSelect'
  | 'racing' | 'results' | 'gpTable' | 'knockoutCut' | 'podium';

export type Overlay = 'pause' | 'settings' | 'credits' | 'howTo' | 'unlocks';

/** The six navigation actions every input maps onto. */
export type NavAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back';

export interface AppState {
  screen: Screen;
  /** overlay stack, top last */
  overlays: Overlay[];
  mode: RaceMode | null;
  racerId: string;
  speedClass: SpeedClass;
  cupId: string | null;
  /** the track picked for a Quick Race or a Time Trial */
  trackId: string | null;
  /** a series (Grand Prix or Knockout) has another race after this results screen */
  seriesHasNext: boolean;
  /** the series is over and its podium ceremony follows the standings or the cut (design §9) */
  podiumNext?: boolean;
  /** Mirror mode on (design §10): Quick Race and Grand Prix run the track reflected left to right */
  mirrored: boolean;
}

export type AppAction =
  | { type: 'boot' }
  | { type: 'start' }
  | { type: 'pickMode'; mode: RaceMode }
  | { type: 'pickRacer'; racerId: string }
  | { type: 'setSpeedClass'; speedClass: SpeedClass }
  | { type: 'toggleMirror' }
  | { type: 'pickCup'; cupId: string }
  | { type: 'pickTrack'; trackId: string }
  | { type: 'raceFinished'; seriesHasNext: boolean; podium?: boolean }
  | { type: 'continue' }
  /** the results of a one-off race (Quick Race, Time Trial, Daily): the same race again (a Time Trial's Retry; the Daily as today's) */
  | { type: 'raceAgain' }
  /** a Quick Race's results: on to `trackId` (the next built track in catalog order), everything else as it was */
  | { type: 'nextTrack'; trackId: string }
  /** a Quick Race's or a Time Trial's results: back to the track screen, or to the racer screen, to pick again */
  | { type: 'changeTrack' }
  | { type: 'changeRacer' }
  | { type: 'back' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'quit' }
  | { type: 'openSettings' }
  | { type: 'openCredits' }
  | { type: 'openUnlocks' }
  | { type: 'openHowTo' };

/** A screen's focusable entries as rows of ids. Disabled ids are skipped by movement. */
export interface FocusModel {
  rows: string[][];
  disabled?: readonly string[];
}
