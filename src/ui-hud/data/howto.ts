// How to Play (title and pause menus): the controls, every item in a line (design §8), the course
// creatures (design §6) and the tricks worth knowing. US English, short and plain.

export const CONTROLS: readonly { action: string; keys: string; pad: string }[] = Object.freeze([
  { action: 'Steer', keys: 'A / D or ← / →', pad: 'Left stick' },
  { action: 'Gas', keys: 'W or ↑', pad: 'RT' },
  { action: 'Brake / reverse', keys: 'S or ↓', pad: 'LT' },
  { action: 'Hop and drift', keys: 'Shift or Space', pad: 'A' },
  { action: 'Use item (hold to keep it behind you)', keys: 'E, X or Ctrl', pad: 'X' },
  { action: 'Look back (throw backward)', keys: 'Q', pad: 'B' },
  { action: 'Horn', keys: 'H', pad: 'Y' },
  { action: 'Pause', keys: 'Esc or P', pad: 'Start' },
]);

/** One line per item, in the order the game lists them (items/data.ts). */
export const ITEM_LINES: Readonly<Record<string, string>> = Object.freeze({
  beachBall: 'Throw it ahead. It bounces off the walls three times.',
  homingKite: 'Flies after the racer in front of you.',
  oilCan: 'Leave a slick behind you. It slows whoever drives in.',
  decoyBalloon: 'Looks just like a real balloon. It pops on whoever grabs it.',
  airHorn: 'A blast all around you: clears items and spins racers nearby.',
  bubble: 'A shield that stops one hit.',
  fizzPop: 'One big burst of speed.',
  tripleFizz: 'Three bursts of speed, and faster drift sparks.',
  fogBank: 'Slows everyone ahead and takes their items. From 5th place back.',
  strikeBall: 'Become a bowling ball: roll on your own and knock racers flying.',
  pogoSpring: 'Boing over trouble. Press again in the air to slam down.',
  grappleAnchor: 'Hook the racer ahead, reel in, then slingshot past.',
  windUpMouse: 'Scurries ahead and bumps up to three racers.',
});

export const CREATURES: readonly { name: string; track: string; line: string }[] = Object.freeze([
  { name: 'Rumblesaur', track: 'Canyon Rush', line: 'Rears up, then stomps. Hop over the shock ring.' },
  { name: 'Yeti', track: 'Frostbite Pass', line: 'Throws snowballs. The shadow shows where one lands.' },
  { name: 'Kraken', track: 'Boardwalk Nights', line: 'A dark line warns where its tentacle slams.' },
  { name: 'Giant crab', track: 'Harbor Loop', line: 'Scuttles across the road and back.' },
  { name: 'Giant goose', track: 'Meadow Run', line: 'Honks, then charges down the road at you.' },
  { name: 'Sky whale', track: 'Skyline Circuit', line: 'Its tail slap blows a gust across the road.' },
]);

export const TIPS: readonly string[] = Object.freeze([
  'Hold drift through a turn: the sparks go blue, orange, then rainbow. Let go for a boost.',
  'Press the gas the moment the 2 appears for a rocket start. On a phone, put your thumbs on the screen then.',
  'Pop a balloon for an item. You can hold two. Gold balloons give you both at once.',
  'Off a ramp, press drift in the air for a trick boost when you land.',
  'On the last lap every track changes. Watch for the banner.',
]);
