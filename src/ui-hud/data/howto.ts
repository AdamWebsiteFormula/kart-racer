// How to Play (title and pause menus): the controls, every item in a line (design §8), the course
// creatures (design §6) and the tricks worth knowing. US English, short and plain. text.test.ts
// checks the numbers and colors here against the game's own (items, kart schema, touch buttons).

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
  beachBall: 'Throw it ahead. It bounces off the sides three times.',
  homingKite: 'Flies after the racer in front of you.',
  oilCan: 'Leave a slick behind you. Whoever drives in slows to half speed.',
  decoyBalloon: 'Looks just like a real balloon, but spins out whoever grabs it.',
  airHorn: 'A blast all around you: clears items and spins racers nearby.',
  bubble: 'A shield that stops one hit, for up to 8 seconds.',
  fizzPop: 'One big burst of speed, even off the road.',
  tripleFizz: 'Three bursts of speed, and faster drift sparks.',
  fogBank: 'Slows everyone ahead and takes their items. Works from 5th place back.',
  strikeBall: 'Become a bowling ball: roll on your own and knock racers flying.',
  pogoSpring: 'Boing over trouble. Press again in the air to slam down.',
  grappleAnchor: 'Hook the racer ahead, reel in, then slingshot past.',
  windUpMouse: 'Scurries ahead and bumps up to three racers.',
});

/** The key to the Item labels setting (Settings), under the items: each item's letter as its slot shows it (icons.ts glyph). */
export const LETTERS_LEAD = 'Item labels (turn them on in Settings):';

export const CREATURES: readonly { name: string; track: string; line: string }[] = Object.freeze([
  { name: 'Rumblesaur', track: 'Canyon Rush', line: 'Rears up, then stomps. Hop over the shock ring.' },
  { name: 'Yeti', track: 'Frostbite Pass', line: 'Throws snowballs. The shadow shows where one lands.' },
  { name: 'Kraken', track: 'Boardwalk Nights', line: 'A dark line warns where its tentacle slams.' },
  { name: 'Giant crab', track: 'Harbor Loop', line: 'Scuttles across the road and back.' },
  { name: 'Giant goose', track: 'Meadow Run', line: 'Honks, then charges down the road at you.' },
  { name: 'Sky whale', track: 'Skyline Circuit', line: 'Its tail slap blows a gust across the road.' },
]);

export const TIPS: readonly string[] = Object.freeze([
  // the driving aids first (Settings, game/assist.ts): a new player's way in
  'New to racing? In Settings, Steering assist keeps you on the road near the edges, and Auto-accelerate holds the gas for you from GO.',
  'Hold drift through a turn: the sparks go blue, orange, then purple. Let go for a boost.',
  'Press the gas the moment the 2 appears for a start boost. On a phone, put a thumb on the screen then.',
  'Pop a balloon for an item. You can hold two. A gold pair of balloons gives you two at once.',
  'Grab coins for a little more top speed, up to 10. A hit spins you out and costs 2 coins.',
  'Stay right behind a racer for 2 seconds: their slipstream gives you a boost.',
  'Off a ramp or a bump, press drift in the air for a trick boost when you land.',
  'When the leader starts the last lap, the track changes. Watch for the banner.',
]);
