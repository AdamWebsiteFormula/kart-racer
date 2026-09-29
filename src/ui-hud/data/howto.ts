// How to Play (title and pause menus): the controls, every item in a line (design §8), the course
// creatures (design §6; none since 25 Sept 2026) and the tricks worth knowing. US English, short and plain. text.test.ts
// checks the numbers and colors here against the game's own (items, kart schema, touch buttons).

import { UI } from '../constants.ts';

/** a small count in words, as the tips say it */
const COUNT_WORDS: readonly string[] = ['none', 'one', 'two', 'three', 'four', 'five'];

/** `touch`: the phone and tablet controls, named as the on-screen buttons read (render/touch.ts); `gas`: the row Auto-accelerate changes */
export const CONTROLS: readonly { action: string; keys: string; pad: string; touch: string; gas?: true }[] = Object.freeze([
  { action: 'Steer', keys: 'A / D or ← / →', pad: 'Left stick or D-pad', touch: 'Left pad' },
  { action: 'Gas', keys: 'W or ↑', pad: 'RT', touch: 'On by itself', gas: true },
  { action: 'Brake / reverse', keys: 'S or ↓', pad: 'LT', touch: 'BRAKE' },
  { action: 'Hop and drift', keys: 'Shift or Space', pad: 'A', touch: 'DRIFT' },
  { action: 'Use item (hold to keep it behind you)', keys: 'E or X', pad: 'X', touch: 'ITEM' },
  { action: 'Look back (throw backward)', keys: 'Q', pad: 'B', touch: 'LOOK' },
  { action: 'Horn', keys: 'H', pad: 'Y', touch: '—' },
  // (words, not ⏸: that one is an emoji on some phones)
  { action: 'Pause', keys: 'Esc or P', pad: 'Start', touch: 'Pause button, top right' },
  // a browser takes fullscreen only from a key or a tap (fullscreen.ts): no pad button
  { action: 'Fullscreen', keys: 'F', pad: '—', touch: 'In Settings' },
]);

/** With Auto-accelerate on (Settings), after the Gas row's keys and pad button: the gas key still earns the start boost in the countdown. */
export const AUTO_GAS_NOTE = '(automatic from GO)';

/** One line per item, in the order the game lists them (items/data.ts). */
export const ITEM_LINES: Readonly<Record<string, string>> = Object.freeze({
  beachBall: 'Fire a laser bolt ahead. It bounces off the sides three times.',
  homingKite: 'Locks on to the racer in front of you and chases them down.',
  oilCan: 'Leave a slick behind you. Whoever drives in slows to half speed.',
  decoyBalloon: 'Looks just like a real balloon, but spins out whoever grabs it. Watch for a red light.',
  airHorn: 'An energy pulse all around you: clears items and spins racers nearby.',
  bubble: 'A force field that stops one hit, for up to 8 seconds.',
  fizzPop: 'One big burst of speed, even off the road.',
  tripleFizz: 'Three bursts of speed, and faster drift sparks.',
  fogBank: 'Shorts out everyone ahead: they slow down and lose their items. Works from 5th place back.',
  strikeBall: 'Become a jet: fly on your own, knock racers aside and end with a sonic boom.',
  pogoSpring: 'Blast up over trouble. Press again in the air to dive back down.',
  grappleAnchor: 'Lock on to the racer ahead, reel in, then slingshot past.',
  windUpMouse: 'Zips ahead, weaving, and bumps up to three racers.',
});

/** The key to the Item labels setting (Settings), under the items: each item's letter as its slot shows it (icons.ts glyph). */
export const LETTERS_LEAD = 'Item labels (turn them on in Settings):';

/**
 * A line per course creature (design §6), under "Course creatures" in How to Play. None races since
 * 25 Sept 2026 (Adam: extras out until they can move like real 3D characters), so the list is empty
 * and How to Play shows no such section (render/screens.ts). A creature's line comes back with it;
 * the six as they read until then: `git show af81e8d:src/ui-hud/data/howto.ts`.
 */
export const CREATURES: readonly { name: string; track: string; line: string }[] = Object.freeze([]);

export const TIPS: readonly string[] = Object.freeze([
  // the driving aids first (Settings, game/assist.ts): a new player's way in
  'New to racing? In Settings, Steering assist keeps you on the road near the edges, and Auto-accelerate holds the gas for you from GO.',
  'Hold drift through a turn: the sparks go blue, orange, then purple. Let go for a boost.',
  'Press the gas the moment the 2 appears for a start boost. On a phone, put a thumb on the screen then.',
  // as many as the HUD has slots (UI.itemSlots; Adam, 28 Sept 2026: "Yes, 3 item slots.")
  `Pop a balloon for an item. You can hold ${COUNT_WORDS[UI.itemSlots] ?? UI.itemSlots}. A gold pair of balloons gives you two at once.`,
  // the speed pickups are gears (Adam, 26 Sept 2026: "not coins"); the sim still counts them as coins
  'Grab gears to tune up your kart: a little more top speed, up to 10. A hit spins you out and knocks 2 gears loose.',
  'Stay right behind a racer for 2 seconds: their slipstream gives you a boost.',
  'Off a ramp or a bump, press drift in the air for a trick boost when you land.',
  'When the leader starts the last lap, the track changes. Watch for the banner.',
]);
