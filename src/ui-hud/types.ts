// ui-hud types. No DOM, no Three.js.
import type { SpeedClass } from '../kart-controller/types.ts';
import type { RaceMode } from '../race-manager/types.ts';

export type Screen =
  | 'boot' | 'title' | 'modeSelect' | 'rosterSelect' | 'cupSelect'
  | 'racing' | 'results' | 'gpTable' | 'knockoutCut';

export type Overlay = 'pause' | 'settings' | 'credits';

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
  /** a series (Grand Prix or Knockout) has another race after this results screen */
  seriesHasNext: boolean;
}

export type AppAction =
  | { type: 'boot' }
  | { type: 'start' }
  | { type: 'pickMode'; mode: RaceMode }
  | { type: 'pickRacer'; racerId: string }
  | { type: 'setSpeedClass'; speedClass: SpeedClass }
  | { type: 'pickCup'; cupId: string }
  | { type: 'raceFinished'; seriesHasNext: boolean }
  | { type: 'continue' }
  | { type: 'back' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'restart' }
  | { type: 'quit' }
  | { type: 'openSettings' }
  | { type: 'openCredits' };

/** A screen's focusable entries as rows of ids. Disabled ids are skipped by movement. */
export interface FocusModel {
  rows: string[][];
  disabled?: readonly string[];
}
