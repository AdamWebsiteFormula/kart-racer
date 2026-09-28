// The sci-fi item sounds, candidates for Adam's listening (28 Sept 2026: the 13 items reskinned as sci-fi with the same
// rules and internal ids; Adam: "Do everything in your power not to make anything sound cheap... Raise the bar", items
// "a little more edgy than Mario Kart World", rated G "just in a cool way"). Built by scifi/cand.py into
// ~/.cache/rascal-sfx/candidates/item-<id>/, never over the shipped files. Each is layered: recorded material (Freesound
// CC0, the approved packs) for weight and air, synthesis (synth.py) for the sci-fi voice, space from impulse responses.
// No gunfire, no voices. A winner moves into scripts/sfx/recipes.ts (its own block) and build.py imports synth.py.
import type { Cand } from './parts.ts';
import { LASER } from './cands/laser.ts';
import { ROCKET } from './cands/rocket.ts';
import { DROPS } from './cands/drops.ts';
import { FIELD } from './cands/field.ts';
import { POWER } from './cands/power.ts';
import { JET } from './cands/jet.ts';
import { BEAM } from './cands/beam.ts';

/** When each sound plays: the shipped ids, and the new ids proposed for the sci-fi items (wiring in the report). */
export const MOMENTS: Record<string, { item: string; when: string; newId?: boolean; wiring?: string; ears?: string[] }> = {
  throw: { item: 'Laser Blaster (beachBall)', when: 'The player fires the Laser Blaster: a bolt shoots ahead (or behind) and ricochets off the road edge 3 times.',
    ears: ['a sci-fi laser blaster shot, pew', 'a gunshot', 'a whoosh', 'a spring boing', 'an explosion'] },
  bounce: { item: 'Laser Blaster (beachBall)', when: 'A laser bolt ricochets off the road edge (up to 3 times), heard from where it happens (0.6 gain).',
    ears: ['a laser bolt ricocheting off metal with a bright zing', 'a bullet ricochet', 'a bell ding', 'a spring boing', 'a click'] },
  pop: { item: 'all projectiles and dropped items', when: 'A bolt, rocket, drone, mine or slick fizzles out or is destroyed (projectilePop, groundPop), small, heard from where it happens (0.5 gain).',
    ears: ['a small soft sci-fi energy pop and fizzle', 'a balloon popping', 'a gunshot', 'a click', 'a bubble popping'] },
  kite: { item: 'Homing Rocket (homingKite)', when: 'The player launches the Homing Rocket: it fires off after the kart ahead.',
    ears: ['a small rocket launching and flying away', 'a gunshot', 'an explosion', 'a whoosh', 'a car engine'] },
  rocketBoom: { item: 'Homing Rocket (homingKite)', newId: true, when: 'The Homing Rocket hits its target: a big, bright energy explosion, heard from the kart it hits.',
    wiring: "director.ts: on an item `hit` whose itemId is 'homingKite', also push('rocketBoom', e.racerId) (spatial, like the hit); MIX_DB 0; a big sound (the music dips).",
    ears: ['a big bright sci-fi energy explosion', 'a bomb explosion with debris', 'a gunshot', 'fireworks', 'thunder'] },
  drop: { item: 'Oil Slick (oilCan)', when: 'The player drops the Oil Slick behind the kart (until mineDrop is wired, the Decoy Mine too).',
    ears: ['a canister dropping and thick oil splattering on the road', 'a gunshot', 'a footstep', 'a water splash', 'a door slam'] },
  mineDrop: { item: 'Decoy Mine (decoyBalloon)', newId: true, when: 'The player drops a Decoy Mine behind the kart: it clamps to the road and arms.',
    wiring: "director.ts ITEM_USE: decoyBalloon: 'mineDrop' (drop stays the Oil Slick's). MIX_DB -1.",
    ears: ['a small device clamping to the ground and arming with beeps', 'a gunshot', 'a doorbell', 'a phone notification', 'a metal clank'] },
  mineBeep: { item: 'Decoy Mine (decoyBalloon)', newId: true, when: 'A Decoy Mine blinks and beeps while a kart is near it, heard from the mine (repeating about every 0.5 s, faster within 5 m).',
    wiring: "audio layer: each tick, for ground items with itemId 'decoyBalloon' within ~15 m of the listener, at('mineBeep', position, 0.5) on a timer (0.5 s, 0.25 s within 5 m), like the roulette ticks; its light blinks on the same beat. MIX_DB -6.",
    ears: ['a short electronic warning beep', 'a phone ringtone', 'a bird chirp', 'a microwave beep', 'a doorbell'] },
  mineBurst: { item: 'Decoy Mine (decoyBalloon)', newId: true, when: 'A kart runs into a Decoy Mine: it bursts in an energy pop, heard from the kart it hits.',
    wiring: "director.ts: on an item `hit` whose itemId is 'decoyBalloon', also push('mineBurst', e.racerId). MIX_DB -1.",
    ears: ['a small sci-fi energy burst with electric crackle', 'a bomb explosion', 'a gunshot', 'a balloon popping', 'fireworks'] },
  airHorn: { item: 'Shockwave (airHorn)', when: 'The Shockwave: an energy pulse ring blasts out 6 m around the player, clearing items and spinning karts; big; the music dips.',
    ears: ['a powerful sci-fi energy shockwave pulse', 'an air horn', 'an explosion', 'a gunshot', 'a whoosh'] },
  shieldUp: { item: 'Energy Shield (bubble)', when: 'The Energy Shield switches on around the kart.',
    ears: ['a sci-fi force field powering up', 'a doorbell', 'a magic spell', 'a car engine', 'a vacuum cleaner'] },
  shieldHum: { item: 'Energy Shield (bubble)', newId: true, when: "While the Energy Shield is up (up to 8 s): a gentle hum from the player's kart.",
    wiring: "a loop started on shieldUp and stopped on shieldPop or shieldEnd, the player's own shield only (rivals' shields stay silent), like the surface loops. MIX_DB about -10: under everything.",
    ears: ['a soft humming sci-fi force field', 'an electric shaver', 'a choir singing', 'a refrigerator hum', 'an engine idling'] },
  shieldPop: { item: 'Energy Shield (bubble)', when: 'The Energy Shield absorbs a hit and breaks.',
    ears: ['a sci-fi force field absorbing a hit and shattering', 'glass breaking', 'a gunshot', 'a bell', 'an explosion'] },
  shieldEnd: { item: 'Energy Shield (bubble)', when: 'The Energy Shield runs out (8 s) and switches off (quiet, secondary).',
    ears: ['a sci-fi force field powering down', 'a phone notification', 'a car engine stopping', 'a whistle', 'a door closing'] },
  fizz: { item: 'Nitro and Triple Nitro (fizzPop, tripleFizz)', when: 'The player fires Nitro (each charge of Triple Nitro too): a canister cracks and a blue flame boost shoots the kart forward.',
    ears: ['a nitro canister cracking and a blue flame boost roaring', 'a gunshot', 'a soda can opening', 'a car engine revving', 'an explosion'] },
  fog: { item: 'EMP Blast (fogBank)', when: 'The EMP Blast: an electric pulse crackles over the karts ahead (heard by the player who fires it, and by each kart it hits).',
    ears: ['an electromagnetic pulse with electric crackling', 'thunder', 'an explosion', 'a gunshot', 'radio static'] },
  strikeRoll: { item: 'Jet Mode (strikeBall)', when: 'Jet Mode starts: a jet engine spools up and lights, and the kart flies down the road for 5 s.',
    ears: ['a jet engine spooling up and igniting', 'a vacuum cleaner', 'an explosion', 'a car engine', 'a hair dryer'] },
  jetLoop: { item: 'Jet Mode (strikeBall)', newId: true, when: "While Jet Mode flies (5 s): the afterburner's roar and turbine whine.",
    wiring: "a loop started on powerStart (itemId 'strikeBall') and stopped on powerEnd (a short fade); the player's own at full level, a near rival's from its kart like the engines. MIX_DB about -4.",
    ears: ['a jet engine afterburner roaring', 'a vacuum cleaner', 'a waterfall', 'a hair dryer', 'wind'] },
  strike: { item: 'Jet Mode (strikeBall)', when: 'Jet Mode ends in a sonic-boom burst that spins the karts around it; a big payoff; the music dips.',
    ears: ['a sonic boom', 'a gunshot', 'a bomb explosion', 'thunder', 'fireworks'] },
  boing: { item: 'Jump Jets (pogoSpring)', when: 'Jump Jets: a thruster kick launches the kart 4 m up.',
    ears: ['a short burst of rocket thrusters launching upward', 'a spring boing', 'a gunshot', 'a whoosh', 'an explosion'] },
  slam: { item: 'Jump Jets (pogoSpring)', when: 'Jump Jets: the thruster dive slams the kart down onto the road and bumps the karts nearby; the music dips.',
    ears: ['a heavy sci-fi ground slam impact with a shockwave', 'an explosion', 'a gunshot', 'a door slam', 'a drum hit'] },
  anchor: { item: 'Tractor Beam (grappleAnchor)', when: 'The Tractor Beam locks onto the kart ahead (up to 50 m) and switches on.',
    ears: ['a sci-fi tractor beam locking on and humming', 'a phone ringtone', 'a gunshot', 'a car horn', 'a vacuum cleaner'] },
  beamLoop: { item: 'Tractor Beam (grappleAnchor)', newId: true, when: 'The Tractor Beam hums while it reels the player in (tetherStart to tetherEnd).',
    wiring: "a loop from tetherStart to tetherEnd for the player (a near rival's from its kart, quieter). MIX_DB about -6.",
    ears: ['a pulsing sci-fi tractor beam hum', 'an alarm siren', 'a choir', 'a vacuum cleaner', 'an engine'] },
  slingshot: { item: 'Tractor Beam (grappleAnchor)', when: 'The Tractor Beam lets go and slingshots the player past the kart ahead with a boost.',
    ears: ['a sci-fi energy release and a fast whoosh past', 'a gunshot', 'a slingshot rubber band', 'an explosion', 'a car horn'] },
  mouse: { item: 'Seeker Drone (windUpMouse)', when: 'The player launches the Seeker Drone: it spins up, zips off along the road and bumps up to 3 karts.',
    ears: ['a small hovering drone zipping away', 'a mosquito', 'a gunshot', 'a vacuum cleaner', 'a motorbike'] },
  blocked: { item: 'held items', when: 'An item held behind the kart blocks a shot from behind (both are destroyed).',
    ears: ['a small sci-fi energy deflection with a metal clank', 'a gunshot', 'a door knock', 'a bell', 'glass breaking'] },
  trail: { item: 'held items', when: 'The player holds an item behind the kart as a shield (hold to trail): it locks on.',
    ears: ['a small mechanical click as something locks into place', 'a gunshot', 'a camera shutter', 'a door knock', 'a phone notification'] },
};

export const RECIPES: readonly Cand[] = [...LASER, ...ROCKET, ...DROPS, ...FIELD, ...POWER, ...JET, ...BEAM];
