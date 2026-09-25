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
