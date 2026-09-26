// audio types. Pure data; no Web Audio here.

export type SfxId =
  | 'count' | 'go' | 'lap' | 'finalLap' | 'finish' | 'finishLow'
  | 'balloon' | 'coin' | 'rouletteTick' | 'itemReady'
  | 'throw' | 'kite' | 'drop' | 'shieldUp' | 'shieldPop' | 'airHorn' | 'fog'
  | 'fizz' | 'strikeRoll' | 'strike' | 'boing' | 'slam' | 'anchor' | 'slingshot' | 'mouse' | 'blocked' | 'denied' | 'trail'
  | 'roar' | 'stomp' | 'yetiThrow' | 'snowThud' | 'krakenRise' | 'krakenSlam' | 'crabClack' | 'honk' | 'whaleSong' | 'tailSlap'
  | 'claw' | 'clawDrop'
  | 'loop'
  | 'shift' | 'koOut' | 'koSafe' | 'trick' | 'bounce' | 'pop' | 'shieldEnd'
  | 'ventWarn' | 'geyser' | 'steamVent'
  | 'hit' | 'hitConfirm' | 'spin' | 'boost1' | 'boost2' | 'boost3' | 'boostPad' | 'boostTrick' | 'boostStart'
  | 'slipstream' | 'tierUp' | 'tierUp2' | 'tierUp3' | 'hop' | 'land' | 'wall' | 'bump' | 'wrongWay' | 'gainPlace' | 'losePlace'
  | 'respawn' | 'uiMove' | 'uiConfirm' | 'uiBack'
  | 'horn:pip' | 'horn:momo' | 'horn:nova' | 'horn:juniper' | 'horn:otto' | 'horn:sprocket' | 'horn:boulder' | 'horn:gus'
  | 'yelp:pip' | 'yelp:momo' | 'yelp:nova' | 'yelp:juniper' | 'yelp:otto' | 'yelp:sprocket' | 'yelp:boulder' | 'yelp:gus';

export type SongId = 'title' | 'raceSunrise' | 'raceSummit' | 'results';

/** One sound to play now. `gain` 0–1 on top of the patch's own level; `pan` −1..1; `rate` a pitch factor (1 when absent). */
export interface Cue { sfx: SfxId; gain: number; pan: number; rate?: number }

/**
 * A racer's voice line ("bark"; Adam, 26 Sept 2026: "the characters also occasionally make verbal
 * expressions", as in Mario Kart World). The moments follow Mario Kart 8's voice bank (select, rocket
 * start, dash, jump, attack, overtake, damage, goal top and rank-out, first place); `lap` and `sorry`
 * are two racers' own habits from design §4 (Sprocket counts laps aloud, Boulder apologizes after ramming).
 */
export type Bark = 'select' | 'start' | 'boost' | 'trick' | 'hitRival' | 'overtake' | 'hit' | 'win' | 'good' | 'lose' | 'lap' | 'sorry';

/** One voice line to say now: whose, which moment, which take (0-based), how loud and where from (as a Cue). */
export interface BarkCue { racerId: string; bark: Bark; n: number; gain: number; pan: number }

/** Music-side reactions to the race. */
export type MusicCue = { type: 'finalLap' } | { type: 'drums'; on: boolean } | { type: 'duck' } | { type: 'song'; song: SongId }
  /** the player crossed the line: the race song stops for the sting (`win`: the fanfare, else the nice-try jingle) */
  | { type: 'finish'; win: boolean };
