// audio types. Pure data; no Web Audio here.

export type SfxId =
  | 'count' | 'go' | 'lap' | 'finalLap' | 'finish' | 'finishLow'
  | 'balloon' | 'coin' | 'rouletteTick' | 'itemReady'
  | 'throw' | 'kite' | 'drop' | 'shieldUp' | 'shieldPop' | 'airHorn' | 'fog' | 'rocket'
  | 'hit' | 'spin' | 'boost1' | 'boost2' | 'boost3' | 'boostPad' | 'boostTrick' | 'boostStart'
  | 'tierUp' | 'hop' | 'land' | 'wall' | 'bump' | 'wrongWay' | 'gainPlace' | 'losePlace'
  | 'respawn' | 'uiMove' | 'uiConfirm' | 'uiBack'
  | 'horn:pip' | 'horn:momo' | 'horn:nova' | 'horn:juniper' | 'horn:otto' | 'horn:sprocket' | 'horn:boulder' | 'horn:gus';

export type SongId = 'title' | 'raceSunrise' | 'raceSummit' | 'results';

/** One sound to play now. `gain` 0–1 on top of the patch's own level; `pan` −1..1. */
export interface Cue { sfx: SfxId; gain: number; pan: number }

/** Music-side reactions to the race. */
export type MusicCue = { type: 'finalLap' } | { type: 'drums'; on: boolean } | { type: 'duck' } | { type: 'song'; song: SongId };
