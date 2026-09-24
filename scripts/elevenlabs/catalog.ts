// Every recorded sound and song in the game, with the exact ElevenLabs prompt that made it.
// This file is the provenance record for CREDITS.md: change a prompt, remake the file.
// Ids match src/audio/types.ts SfxId (sound effects) and the music ids in src/audio/samples.ts.
// Rules: original sounds only, no franchise names, no voices or words. No human voice at all:
// no crowd, cheer, chant or shout (the racers' own yelps and horns are creature and toy noises).
// Every song is instrumental: its prompt says so and every request forces it (songBody).
// A remade sound keeps its new take only when the local ear (scripts/ear, nothing played) agrees:
// its own prompt ranks near the top among all of them, the listener model describes it right, CLAP
// picks the intended sound among plain alternatives (or the entry says why not), and nothing about
// it reads as a weapon.

export interface SfxSpec {
  id: string;
  prompt: string;
  /** 0.5–30 s */
  seconds: number;
  /** ElevenLabs makes it loop seamlessly (engines, screech) */
  loop?: boolean;
  /** 0–1, how literally to follow the prompt (API default 0.3) */
  influence?: number;
}

export interface SongSpec { id: string; prompt: string; seconds: number; bpm: number }

const CARTOON = 'Bright cartoon video game style, clean and punchy, no music, no voice.';

export const SFX: readonly SfxSpec[] = [
  // race flow
  { id: 'count', seconds: 0.5, influence: 0.6, prompt: 'One single short bright electronic beep, a racing start light countdown tone. Clean synth, one beep only, no echo.' },
  { id: 'go', seconds: 1.2, prompt: 'A bright powerful racing start horn: one short high synth horn blast with a sparkly shimmer tail. Arcade game style, energetic. No voice.' },
  { id: 'lap', seconds: 0.8, prompt: 'A short cheerful arcade chime for completing a lap: three quick rising bell and marimba notes. Bright and clean. No voice.' },
  { id: 'finalLap', seconds: 2, prompt: 'A short exciting brass fanfare sting announcing the final lap of a cartoon kart race: quick rising trumpet notes and a cymbal swell. No voice.' },
  { id: 'finish', seconds: 3.5, prompt: 'A triumphant short victory fanfare for winning a cartoon kart race: bright brass section, snare roll and a cymbal crash, joyful ending chord. No voice.' },
  // the Final Lap Shift (design §2): the whole track changes at once
  // remade 24 Sept 2026 at 4.5 s: the 2.2 s take was a whoosh under a second long, which the judge
  // (Gemini Pro) heard as a menu transition; the Final Lap Shift is the game's signature moment.
  // Fourteen takes over four prompts; the judge's pick scored 10/10 on the brief, 9/10 on the moment
  { id: 'shift', seconds: 4.5, influence: 0.55, prompt: 'Cinematic cartoon transformation sound, four and a half seconds long: a deep low rumble that grows louder and rises steadily through the first two seconds into a huge sweeping whoosh, then a magical sparkling chime shimmer that twinkles and rings out until the very end. Grand, exciting and family-friendly. No music, no voice.' },
  // the Knockout cut: through to the next round, or out
  { id: 'koSafe', seconds: 2, prompt: 'A short bright arcade success sting for making it through to the next round of a cartoon race: a quick rising three-note synth-brass call ending on a sparkly chord. Cheerful. No voice.' },
  { id: 'koOut', seconds: 2.2, prompt: 'A short gentle arcade sting for being knocked out of a cartoon race: a slow descending four-note muted trombone phrase, a little sad but friendly and funny, soft ending. No voice.' },
  { id: 'finishLow', seconds: 2.2, prompt: 'A short friendly nice-try jingle for finishing a cartoon race in a lower place: soft marimba and muted trumpet, cheerful but modest, gentle ending. No voice.' },
  // pickups and items
  { id: 'balloon', seconds: 0.6, prompt: `A party balloon popping: one crisp rubber pop with a tiny sparkly twinkle after it. ${CARTOON}` },
  // remade 24 Sept 2026 (the ears heard a click and a hammer on metal): the chime is the point
  { id: 'coin', seconds: 0.5, influence: 0.6, prompt: 'A classic arcade coin pickup: a bright, sparkly two-note chime going up, like a tiny glockenspiel. Clean and short. No voice.' },
  // remade 24 Sept 2026: the first was a 5 ms click, so spiky that at a level you could hear it
  // over the music it pushed the output past −1 dB true peak; a tick with a note has body
  { id: 'rouletteTick', seconds: 0.5, influence: 0.6, prompt: 'One single short bright wooden tock with a clear pitched note, like a prize wheel peg knocking once: a tiny marimba-like tick. Dry, no echo, no music, no voice.' },
  { id: 'itemReady', seconds: 0.9, prompt: 'A magical sparkly shimmer when a mystery prize is revealed: a quick glittering bell arpeggio going up. Short. No voice.' },
  { id: 'throw', seconds: 0.6, prompt: `A quick throwing whoosh: an object flung forward through the air, airy swish. ${CARTOON}` },
  // remade 24 Sept 2026 (the whistle took over: both ears heard a slide whistle): the flutter is the point
  { id: 'kite', seconds: 1.3, influence: 0.7, prompt: `A paper kite caught by the wind: a fast, soft papery fluttering that rises as it lifts off and drifts up and away on a light breeze. ${CARTOON}` },
  // retaken 24 Sept 2026 (same prompt): the old take tagged as a coin dropping; the kept one as a knock
  { id: 'drop', seconds: 0.6, prompt: `A small object dropped onto a road: soft plop and a little rubbery bounce. ${CARTOON}` },
  { id: 'shieldUp', seconds: 1, prompt: `A magical bubble shield forming: shimmering rising whoosh with a soft glassy ring. ${CARTOON}` },
  { id: 'shieldPop', seconds: 0.8, prompt: `A magical soap bubble shield bursting into sparkles: glassy pop and a glittering shatter. ${CARTOON}` },
  // remade 24 Sept 2026 (the ears heard a boing and a pop)
  { id: 'shieldEnd', seconds: 0.8, influence: 0.6, prompt: `A magic shield fading away: a soft, gentle glassy shimmer of tiny twinkling chimes drifting downward and dissolving into silence. ${CARTOON}` },
  // a thrown beach ball off a wall; a ball or a dropped toy popping
  // remade 24 Sept 2026: the first came out 25 dB under the others and still sat under the mix at full gain.
  // Four takes were measured and scored by the local ear (no playback): two came out near-silent,
  // and of the two full ones the one kept tagged least as a metal clang
  { id: 'bounce', seconds: 0.5, influence: 0.6, prompt: `A big inflatable beach ball smacking hard into a wall right next to the listener: one loud, full, punchy hollow rubber thwock with a short springy boing. ${CARTOON}` },
  { id: 'pop', seconds: 0.5, influence: 0.5, prompt: `A small toy popping and vanishing: one soft rubbery pop with a tiny puff of air. ${CARTOON}` },
  { id: 'airHorn', seconds: 1.2, prompt: 'A loud comedic stadium air horn: one long cartoon honk blast. No voice.' },
  { id: 'fog', seconds: 1.5, prompt: `A thick cloud of smoke puffing out: soft rushing whoosh and a hissing puff. ${CARTOON}` },
  // the new items (design §8, 23 Sept 2026)
  { id: 'fizz', seconds: 1.2, prompt: `A shaken soda bottle cap popping off, then a strong fizzy foam blast spraying out: a pop, then a rushing carbonated fizz whoosh. ${CARTOON}` },
  { id: 'strikeRoll', seconds: 2, prompt: `A giant heavy bowling ball starting to roll fast down a wooden lane: a deep rumbling thunder that builds and speeds up. ${CARTOON}` },
  { id: 'strike', seconds: 1.8, prompt: `A bowling strike: a heavy ball crashing into wooden pins, a loud clattering scatter of pins, then a short sparkly celebration chime. ${CARTOON}` },
  { id: 'boing', seconds: 1, prompt: `A big cartoon spring launching something high into the air: one long exaggerated wobbly boing. ${CARTOON}` },
  { id: 'slam', seconds: 1.1, prompt: `A heavy cartoon ground pound: a quick falling whoosh, then a deep booming thud with a short rumble. ${CARTOON}` },
  // remade 24 Sept 2026 (the ears heard a door slam and an explosion): the chain leads
  { id: 'anchor', seconds: 1.1, influence: 0.6, prompt: `A metal chain rattling fast as it is thrown out, links clinking and jangling, then one heavy metal clank as the anchor hooks on. ${CARTOON}` },
  { id: 'slingshot', seconds: 0.8, prompt: `A stretchy rubber slingshot release: a twangy snap and a fast whoosh past. ${CARTOON}` },
  { id: 'mouse', seconds: 1.2, prompt: `A wind-up clockwork toy mouse let go: a few quick winding key clicks, a tiny squeak, then fast scurrying tin feet. ${CARTOON}` },
  { id: 'blocked', seconds: 0.6, prompt: `A thrown toy bouncing off a shield: a quick hollow plastic clonk with a small ricochet ping. ${CARTOON}` },
  { id: 'denied', seconds: 0.5, influence: 0.6, prompt: 'A short soft negative arcade sound: one low muted two-note bloop going down, friendly, not harsh. No voice.' },
  // remade 24 Sept 2026 (the ears heard a zap and a dropped coin): the take kept ranks 1st on the
  // intent check and reads as a pen click, though CLAP still hears every quick click as a zap
  { id: 'trail', seconds: 0.5, influence: 0.6, prompt: 'One quick light plastic click-clack, like a toy snapping into a holder behind a go-kart, with a tiny soft rattle. No music, no voice.' },
  // the course creatures (design §6)
  { id: 'roar', seconds: 2.2, prompt: `A huge friendly cartoon dinosaur made of rock roaring: a deep booming rocky roar with a playful rumbling growl at the end. ${CARTOON}` },
  { id: 'stomp', seconds: 1.8, prompt: `A giant dinosaur foot stomping the ground: one massive deep boom, rocks rattling and a rolling rumble fading away. ${CARTOON}` },
  { id: 'yetiThrow', seconds: 1.2, prompt: `A big furry cartoon yeti heaving a giant snowball: a playful effort grunt and a heavy whoosh. ${CARTOON}` },
  { id: 'snowThud', seconds: 1, prompt: `A giant snowball landing on a road: a heavy soft thump and crunchy snow spraying. ${CARTOON}` },
  { id: 'krakenRise', seconds: 1.8, prompt: `A giant friendly sea creature rising out of the water: deep bubbling, sloshing water and a low rumble. ${CARTOON}` },
  { id: 'krakenSlam', seconds: 1.5, prompt: `A giant tentacle slamming down on wooden boardwalk planks: a huge wet slap, wood creaking and a big splash. ${CARTOON}` },
  { id: 'crabClack', seconds: 1, prompt: `A giant cartoon crab snapping its big claws: three quick hard clacks and clicky scuttling legs. ${CARTOON}` },
  { id: 'honk', seconds: 1.2, prompt: `A giant grumpy cartoon goose honking: two loud angry honks and flapping wings. ${CARTOON}` },
  { id: 'whaleSong', seconds: 2.5, prompt: 'A gentle giant whale calling through the sky: a long soft deep magical whale song with a sparkly shimmer. No music, no voice.' },
  { id: 'tailSlap', seconds: 1.5, prompt: `A giant whale tail swooshing through clouds: a big airy whoosh and a soft thunderous slap of wind. ${CARTOON}` },
  // the rescue claw (race-manager respawn.ts)
  { id: 'claw', seconds: 2.2, prompt: `A fairground claw machine: an electric motor whirring as the claw drops on its cable, a clunky metal grab, then a whirring lift. ${CARTOON}` },
  // launch vents (track-builder hazards.ts, type vent): the warning, then the blast
  { id: 'ventWarn', seconds: 1.2, prompt: `A hot spring about to erupt: deep bubbling and gurgling rising fast, a low rumble underneath. ${CARTOON}` },
  { id: 'geyser', seconds: 1.8, prompt: `A geyser erupting: a sudden powerful whoosh of water blasting straight up, then a hissing spray raining down. ${CARTOON}` },
  { id: 'steamVent', seconds: 1.8, prompt: `A steam vent in the snow blasting open: a sharp loud hiss and roar of steam shooting skyward, then fading. ${CARTOON}` },
  // the loop-the-loop (kart-controller loop.ts): the ride round the neon ring
  // (remade 24 Sept 2026: the first asked for a crowd shouting at the top)
  { id: 'loop', seconds: 2.4, prompt: `A small go-kart racing round a roller-coaster loop: a rising whoosh up and over, a rattling coaster track and a bright rising whistle at the top. ${CARTOON}` },
  { id: 'clawDrop', seconds: 0.8, prompt: `A toy claw opening and dropping a small go-kart onto a road: a springy metal clack and a soft rubbery bump. ${CARTOON}` },
  { id: 'hit', seconds: 0.8, prompt: `A go-kart getting bonked by a thrown toy: bouncy boing with a small plastic crash. ${CARTOON}` },
  // your own item landed on a rival, however far ahead (the attacker's payoff)
  { id: 'hitConfirm', seconds: 0.7, prompt: 'A satisfying cartoon score sound when your thrown toy hits a rival far away: a punchy rubbery thwack and a bright two-note chime going up. Short. No music, no voice.' },
  { id: 'spin', seconds: 1.3, prompt: `A go-kart spinning out: a descending slide whistle over a short tyre squeal. ${CARTOON}` },
  // boosts: the drift tiers grow
  // remade 24 Sept 2026: the first takes rang like a bell, a beep and a train horn to both ears;
  // a boost is air: each tier a bigger whoosh than the last
  { id: 'boost1', seconds: 0.7, influence: 0.6, prompt: 'A quick soft whoosh of rushing air as a small go-kart darts forward: one short airy swoosh that fades fast. No music, no voice.' },
  { id: 'boost2', seconds: 1, influence: 0.6, prompt: 'A strong whoosh of rushing air as a go-kart surges forward: a big airy swoosh swelling up with a deep rumble underneath, then fading. No music, no voice.' },
  { id: 'boost3', seconds: 1.4, influence: 0.6, prompt: 'A huge rushing whoosh as a go-kart rockets forward on a burst of fire: a deep powerful swoosh of wind with crackling, sizzling flames, swelling and then fading away. No music, no voice.' },
  { id: 'boostPad', seconds: 0.9, prompt: 'A go-kart driving over a glowing speed boost pad: an electric zap and a fast rising whoosh. Arcade style. No music, no voice.' },
  // the trick itself, the moment the button is pressed in the air
  { id: 'trick', seconds: 0.7, prompt: `A go-kart doing a quick mid-air flip trick: a fast spinning air whoosh swish with a tiny sparkle. ${CARTOON}` },
  { id: 'boostTrick', seconds: 0.8, prompt: `A stylish mid-air trick: quick sparkling swoosh with a twinkle chime. ${CARTOON}` },
  // remade 24 Sept 2026 at 1.6 s: the 1.2 s take was cut off at full level
  { id: 'boostStart', seconds: 1.6, prompt: 'A perfect rocket start in a kart race: a sharp small engine rev, then a turbo whoosh launching forward that fades away completely at the end. No music, no voice.' },
  // remade 24 Sept 2026: the first take sounded like a gun being reloaded (never in a G-rated game)
  { id: 'slipstream', seconds: 1, influence: 0.6, prompt: "Wind rushing past a speeding go-kart: a smooth airy whoosh that swells and rushes by as the kart zooms out of another kart's slipstream. Soft, fast and airy. No music, no voice." },
  // the drift spark tiers (blue, orange, purple): each a bigger, higher zap than the last
  { id: 'tierUp', seconds: 0.5, influence: 0.5, prompt: 'A tiny crackling electric spark: one short bright sizzle zap. No music, no voice.' },
  { id: 'tierUp2', seconds: 0.6, influence: 0.5, prompt: 'A bright crackling electric spark charging up: a quick sizzle zap with a short rising fizz, bigger and higher than a tiny spark. No music, no voice.' },
  { id: 'tierUp3', seconds: 0.8, influence: 0.5, prompt: 'A powerful electric spark surging to full charge: a sharp crackling zap, a fast rising sizzle and a sparkly shimmer on top. Short. No music, no voice.' },
  // driving
  { id: 'hop', seconds: 0.5, prompt: `A small springy hop of a go-kart: light boing with a quick suspension creak. ${CARTOON}` },
  { id: 'land', seconds: 0.6, prompt: 'A go-kart landing on asphalt after a small jump: a solid rubbery thump with a tyre chirp. No music, no voice.' },
  { id: 'wall', seconds: 0.6, prompt: 'A go-kart bumping into a padded track barrier: a dull soft thud and a short plastic scrape. No music, no voice.' },
  { id: 'bump', seconds: 0.5, prompt: `Two go-karts bumping into each other: one rubbery bonk. ${CARTOON}` },
  { id: 'wrongWay', seconds: 1.2, prompt: 'A warning alert: two-tone buzzer beeps repeating twice. Arcade game alarm, friendly not scary. No voice.' },
  { id: 'gainPlace', seconds: 0.5, influence: 0.5, prompt: 'A quick positive upward blip: two rising bright notes, arcade game, very short. No voice.' },
  { id: 'losePlace', seconds: 0.5, influence: 0.5, prompt: 'A quick soft downward blip: two falling notes, arcade game, very short. No voice.' },
  { id: 'respawn', seconds: 1.2, prompt: 'A magical reappear sound: a rising sparkle chime with a soft whoosh, something gently placed back. No voice.' },
  // menus
  { id: 'uiMove', seconds: 0.5, influence: 0.6, prompt: 'A very short soft menu cursor tick: one light plastic click, arcade game menu. No echo, no voice.' },
  { id: 'uiConfirm', seconds: 0.5, influence: 0.5, prompt: 'A bright menu confirm sound: a cheerful two-note chime going up, arcade game menu, short. No voice.' },
  // remade 24 Sept 2026: the first came out 27 dB under full scale
  { id: 'uiBack', seconds: 0.5, influence: 0.5, prompt: 'A clear menu back sound: one short bubbly pop going down, arcade game menu, clean, present and not too quiet. No voice.' },
  // horns, one per racer (design §5)
  { id: 'horn:pip', seconds: 0.7, prompt: 'A cartoon car horn that sounds like a hummingbird: two quick high chirpy honks with a bicycle bell ring. No voice.' },
  { id: 'horn:momo', seconds: 1, prompt: 'A cartoon car horn that is a cat purr blended with a small engine rev: one rolling purr-rev honk. No words.' },
  { id: 'horn:nova', seconds: 1, prompt: 'A dreamy space chime car horn: three soft shimmering bell tones going up. No voice.' },
  { id: 'horn:juniper', seconds: 0.8, prompt: 'A park ranger pea whistle: one bright trilling whistle blast. No voice.' },
  { id: 'horn:otto', seconds: 0.8, prompt: 'A squeaky rubber pool-float toy honk: two squeaky squeezes. Cartoon car horn. No voice.' },
  // remade 24 Sept 2026 (the ears heard only a bell, or a dropped coin): the ticking leads
  { id: 'horn:sprocket', seconds: 1, influence: 0.6, prompt: 'A wind-up clockwork toy: a fast run of small ticking clicks like a tiny clock being wound, then one bright little bell ding. No voice.' },
  { id: 'horn:boulder', seconds: 1.2, prompt: 'A deep friendly rock horn: a low grinding, rumbling stone honk. Cartoon car horn. No words.' },
  { id: 'horn:gus', seconds: 1.3, prompt: 'A deep ship foghorn: one long low booming blast. Cartoon car horn. No voice.' },
  // hit yelps, one per racer (design §11): creature noises, never words
  { id: 'yelp:pip', seconds: 0.5, prompt: 'A tiny cartoon hummingbird startled squeak: one quick high chirp of surprise. No words.' },
  { id: 'yelp:momo', seconds: 0.7, prompt: 'A cartoon cat grumpy startled meow: one short annoyed mrrow. No words.' },
  { id: 'yelp:nova', seconds: 0.6, prompt: 'A soft dreamy cartoon moth surprised: a quick wing flutter and a tiny high coo. No words.' },
  { id: 'yelp:juniper', seconds: 0.5, prompt: 'A cartoon fox short surprised yip. One yip only. No words.' },
  { id: 'yelp:otto', seconds: 0.5, prompt: 'A cartoon otter squeaky surprised chirp. One chirp only. No words.' },
  { id: 'yelp:sprocket', seconds: 0.6, prompt: 'A little wind-up robot toy glitching: a quick springy boing and a surprised electronic bleep. No words.' },
  { id: 'yelp:boulder', seconds: 0.7, prompt: 'A big friendly rock creature low surprised oof grunt with a pebble clatter. No words.' },
  { id: 'yelp:gus', seconds: 0.7, prompt: 'A big cartoon walrus surprised deep honking bark. One bark only. No words.' },
  // loops: the engine at three speeds (plan §7.4) and the drift screech
  { id: 'engine-idle', seconds: 4, loop: true, prompt: 'A small go-kart petrol engine idling steadily at low RPM. Continuous and even, no revving, no other sounds.' },
  { id: 'engine-mid', seconds: 4, loop: true, prompt: 'A small go-kart petrol engine running steadily at medium RPM. Continuous and even, no gear changes, no revving, no other sounds.' },
  { id: 'engine-high', seconds: 4, loop: true, prompt: 'A small go-kart petrol engine held at high RPM, full throttle, a steady continuous buzzing whine. Even, no gear changes, no other sounds.' },
  { id: 'drift', seconds: 3, loop: true, prompt: 'The continuous tyre screech of a go-kart drifting sideways on asphalt. Steady and even, no engine, no other sounds.' },
  // under the wheels off the road (dirt and mud surfaces)
  { id: 'offroad', seconds: 3, loop: true, prompt: 'The continuous rumble of small go-kart tires rolling fast over grass and loose dirt: a rough crunchy gravel rumble with light pebble rattles. Steady and even, no engine, no other sounds.' },
  // what the wheels roll on, per course (24 Sept 2026, src/audio/engine.ts wheelSound): the land beside the road
  // on the sand and snow courses, the boardwalk's planks, the frozen lake's ice and the skyline's rails
  { id: 'offroad-sand', seconds: 3, loop: true, prompt: 'The continuous sound of small go-kart tires rolling fast through soft beach sand: a soft hissing, crunchy sand rush with fine grit spraying. Steady and even, no engine, no other sounds.' },
  { id: 'offroad-snow', seconds: 3, loop: true, influence: 0.5, prompt: 'The continuous, perfectly steady sound of small go-kart tires rolling fast through fresh snow: an unbroken soft crunching snow hiss with light powder spray, constant level, no pauses or footsteps. No engine, no other sounds.' },
  { id: 'road-ice', seconds: 3, loop: true, prompt: 'The continuous sound of small go-kart tires gliding fast over smooth ice: a thin glassy hiss with faint icy crackles. Steady and even, no engine, no other sounds.' },
  { id: 'road-wood', seconds: 3, loop: true, prompt: 'The continuous sound of a small go-kart rolling fast over wooden boardwalk planks: a steady hollow wooden rumble with quick even plank clatters. No engine, no other sounds.' },
  { id: 'rail-grind', seconds: 3, loop: true, prompt: 'The continuous sound of a small cartoon kart grinding fast along a metal rail: a bright steady metallic scraping grind with crackling sparks. Even, no engine, no music, no voice.' },
  // the drift sparks under the wheels, pitched and louder with each spark tier (blue, orange, purple)
  { id: 'sparks', seconds: 3, loop: true, prompt: 'The continuous crackle of bright electric sparks spraying from spinning go-kart wheels: a steady sizzling, fizzing electric crackle. Even, no engine, no music, no voice.' },
];

const SONG_TAIL = 'Constant driving energy from the first second, no intro, no fade-out, so it loops. Instrumental, no vocals.';

// design §11: Sunrise Cup = brass/ska, Summit Cup = synth-brass/funk, finale = orchestral pop
export const SONGS: readonly SongSpec[] = [
  { id: 'title', seconds: 64, bpm: 128, prompt: 'Title-screen theme for a bright cartoon kart racing video game. Sunny, catchy pop-rock: punchy brass lead melody, funky slap bass, bright electric guitar chops, glockenspiel sparkles, handclaps and driving drums. 128 BPM, G major. Upbeat, heroic and fun. Steady energy the whole way and it ends as it began, so it loops. Instrumental, no vocals.' },
  { id: 'race-harbour', seconds: 96, bpm: 150, prompt: `High-energy ska racing music for a sunny seaside cartoon kart race. Offbeat skanking guitar, a tight trumpet and trombone section playing a catchy lead, bouncy walking bass, fast snare fills, steel-drum sparkles. 150 BPM, F major. ${SONG_TAIL}` },
  { id: 'race-meadow', seconds: 96, bpm: 146, prompt: `Joyful brass-and-banjo racing music for a countryside cartoon kart race past windmills and meadows. Rolling banjo, a bright brass section lead, fiddle answers, offbeat ska guitar, bouncing bass, stomping drums. 146 BPM, D major. ${SONG_TAIL}` },
  { id: 'race-frost', seconds: 96, bpm: 140, prompt: `Funky racing music for a snowy mountain cartoon kart race. A synth-brass lead melody, slap funk bass, clavinet and wah guitar, sleigh bells and glockenspiel, tight punchy drums. 140 BPM, E major. Cool, bouncy and fast. ${SONG_TAIL}` },
  { id: 'race-boardwalk', seconds: 96, bpm: 140, prompt: `Neon night-carnival racing music for a cartoon kart race on a seaside boardwalk. Synth-brass stabs, funky synth bass, bright arpeggiated synths, a playful carnival organ hook, disco-funk drums with claps. 140 BPM, A major. Glittering, fun and fast. ${SONG_TAIL}` },
  { id: 'race-finale', seconds: 96, bpm: 160, prompt: `Soaring orchestral-pop racing music for the final track of a cartoon kart racing cup. A heroic brass fanfare melody, fast sweeping strings, harp runs, timpani hits, driving rock drums and electric bass. 160 BPM, E-flat major. Epic, triumphant and fun. ${SONG_TAIL}` },
  { id: 'results', seconds: 32, bpm: 100, prompt: 'A short happy results-screen loop for a cartoon kart racing game. A relaxed funky groove: electric piano, muted brass accents, bass, finger snaps and light drums. 100 BPM, C major. Warm and cheerful, and it ends as it began, so it loops. Instrumental, no vocals.' },
];

/**
 * Where each sound plays in the game: the brief the ears judge a recording against (scripts/ear
 * judge.mjs), beside its prompt. Every sound effect has one.
 */
export const MOMENT: Readonly<Record<string, string>> = Object.freeze({
  count: 'The countdown before the start: one beep each second for 3, 2, 1, heard by everyone at full level.',
  go: 'GO: the race starts and all eight karts launch; the race music comes in right after it.',
  lap: 'The player starts a new lap (not the last): a quick, friendly marker, once or twice a race.',
  finalLap: 'The player starts their final lap: a fanfare while the race music pauses for two seconds and then comes back faster (the classic final-lap lift).',
  finish: 'The player crosses the finish line in a winning place: the victory sting plays alone after the race music fades, then the results music follows.',
  shift: "The Final Lap Shift, the game's signature twist: when the race leader starts the last lap, the whole track transforms for everyone at once (a tide floods the beach, a storm rolls in, a bridge collapses, a blizzard freezes the lake, fireworks turn a Ferris wheel into a ramp, sky bridges retract). The music dips under it. It must feel big, epic and magical, a world changing, never like a menu click.",
  koSafe: 'Knockout mode: the player made the cut and goes through to the next round; plays over the cut screen.',
  koOut: 'Knockout mode: the player is knocked out; a gentle, friendly "aw, next time" sting over the cut screen, never harsh.',
  finishLow: 'The player finishes outside the winning places: a friendly nice-try jingle, playing alone after the race music fades.',
  balloon: 'The player drives through an item balloon to get an item (pickups are balloons, not boxes): very frequent, several times a lap; rivals’ pops are quieter.',
  coin: 'The player picks up a coin on the road (coins add a little top speed): frequent.',
  rouletteTick: 'The item roulette after a pickup: one tick per slot, quick at first and slowing over 1.5 s before the item is revealed; each tick cuts the one before.',
  itemReady: "The item roulette stops: the player's new item is revealed and ready to use.",
  throw: 'The player throws a Beach Ball (a bouncy projectile) forward or backward.',
  kite: 'The player launches a Homing Kite, which flies off after the kart ahead.',
  drop: 'The player drops an Oil Can or a Decoy Balloon behind the kart onto the road.',
  shieldUp: "The player's Bubble shield forms around the kart.",
  shieldPop: 'A Bubble shield bursts as it blocks a hit.',
  shieldEnd: 'A Bubble shield fades away on its own when its time runs out (quiet, secondary).',
  bounce: 'A thrown Beach Ball bounces off a wall (a small sound heard from where it happens).',
  pop: 'A thrown ball or a dropped item pops and disappears (a small sound heard from where it happens).',
  airHorn: 'The Air Horn item: a blast that shoves nearby karts aside and clears nearby items; big, loud and comic; the music dips under it.',
  fog: 'The Fog Bank item: a cloud puffs out and covers the karts ahead.',
  fizz: 'The Fizz Pop item: a shaken soda sprays a burst of fizz that shoots the kart forward (also the Triple Fizz).',
  strikeRoll: 'The Strike Ball item: the kart rides inside a giant bowling ball rolling fast down the track.',
  strike: 'The Strike Ball bursts and scatters the karts around it like bowling pins; a big payoff; the music dips.',
  boing: 'The Pogo Spring item launches the kart high into the air.',
  slam: 'The Pogo Spring kart slams down onto the road and bumps the karts nearby; the music dips.',
  anchor: 'The Grapple Anchor item: an anchor on a chain thrown forward hooks the kart ahead and reels the player in.',
  slingshot: "The Grapple Anchor's tether ends and slingshots the player forward past the kart ahead.",
  mouse: 'The Wind-Up Mouse item: a clockwork toy mouse is let go and scurries along the road after rivals.',
  blocked: 'An item trailing behind a kart blocks a projectile from behind (both pop).',
  denied: 'The player presses the item button but the item cannot fire right now: a soft, friendly "no".',
  trail: 'The player holds an item behind the kart as a shield (hold to trail).',
  roar: "Canyon Rush's friendly rock dinosaur (the Rumblesaur) rears up and roars as a warning before it stomps; heard from twice as far as other sounds.",
  stomp: 'The Rumblesaur stomps and shakes the road; big and heavy; the music dips.',
  yetiThrow: "Frostbite Pass's yeti winds up and hurls a giant snowball onto the road.",
  snowThud: "The yeti's giant snowball lands on the road and rolls.",
  krakenRise: "Boardwalk Nights' friendly kraken rises out of the water beside the boardwalk, a warning.",
  krakenSlam: "The kraken's tentacle slams down on the boardwalk planks; the music dips.",
  crabClack: 'A giant crab on Harbour Loop snaps its claws while it waits to scuttle across the road.',
  honk: 'A giant grumpy goose on Meadow Run charges and honks at the karts.',
  whaleSong: "Skyline Circuit's sky whale calls as a warning before its tail sweeps the road.",
  tailSlap: "The sky whale's tail sweeps across the road in a great gust.",
  claw: 'The rescue claw: a fairground claw lowers, grabs a kart that fell off the course and lifts it back.',
  clawDrop: 'The rescue claw lets go and drops the kart back onto the road.',
  ventWarn: 'A launch vent (a hot spring on Canyon Rush, a steam vent on Frostbite Pass) is about to erupt: the warning before it blasts karts upward.',
  geyser: 'A hot-spring geyser erupts and launches karts into the air.',
  steamVent: 'A steam vent in the snow erupts and launches karts into the air.',
  loop: "Boardwalk Nights' neon loop-the-loop: the kart rides up and round a coaster ring and comes out with a small boost.",
  hit: "The player's kart is bonked by an item (slowed, not spun); the music briefly ducks behind a low-pass.",
  hitConfirm: "The player's own item hits a rival, however far ahead: the attacker's satisfying payoff.",
  spin: 'A kart is hit and spins out.',
  boost1: 'The drift mini-turbo, tier 1 (blue sparks): the small boost when the player lets go of a short drift; very frequent, nearly every corner; the engine revs with it; each tier must sound bigger than the last.',
  boost2: 'The drift mini-turbo, tier 2 (orange sparks): a strong boost after a longer drift; frequent; clearly bigger than tier 1.',
  boost3: 'The drift mini-turbo, tier 3 (purple sparks): the biggest drift boost after a long drift; the most exciting of the three.',
  boostPad: 'The kart drives over a glowing boost pad on the road (frequent).',
  trick: 'The player does a mid-air trick off a ramp (the moment the trick button is pressed).',
  boostTrick: 'The small boost as the kart lands after a successful trick.',
  boostStart: 'A perfect rocket start (the gas timed right in the countdown): the kart launches at the GO.',
  slipstream: 'The player has drafted behind another kart and slingshots out of its slipstream with a burst of speed.',
  tierUp: 'While drifting, the sparks charge to tier 1 (blue): a small bright zap (a spark crackle loop runs under it).',
  tierUp2: 'While drifting, the sparks charge to tier 2 (orange): a bigger, higher zap than tier 1.',
  tierUp3: 'While drifting, the sparks charge to tier 3 (purple): the biggest, highest zap.',
  hop: 'The kart hops to start a drift (very frequent).',
  land: 'The kart lands after a hop or a jump (frequent).',
  wall: 'The kart bumps a padded track barrier.',
  bump: 'Two karts bump into each other (very frequent in the pack).',
  wrongWay: 'The player is driving the wrong way: a friendly warning alert.',
  gainPlace: 'The player moves up a place (frequent): a small positive blip.',
  losePlace: 'The player drops a place (frequent): a small, soft downward blip.',
  respawn: "The player's kart is placed back on the course after falling off.",
  uiMove: 'Menu: the cursor moves between options.',
  uiConfirm: 'Menu: an option is confirmed.',
  uiBack: 'Menu: back or cancel.',
  'engine-idle': "The player's engine at idle: a loop crossfaded with the mid and high loops by rpm and pitched with it, for minutes on end; a small cartoon kart, not a motorcycle.",
  'engine-mid': "The player's engine at medium rpm: a loop crossfaded by rpm and pitched with it, for minutes; a small cartoon kart; rivals use it too, panned.",
  'engine-high': "The player's engine at high rpm: a loop crossfaded by rpm and pitched with it, heard most of every race; a small cartoon kart, never grating.",
  drift: 'The tire screech loop while drifting, under the engine; heard at every corner.',
  offroad: 'The tire rumble loop off the road on grass and dirt (Meadow Run), rising with speed.',
  'offroad-sand': 'The tire loop off the road on sand (Harbour Loop, Canyon Rush), rising with speed.',
  'offroad-snow': 'The tire loop off the road in snow (Frostbite Pass), rising with speed.',
  'road-ice': "The wheels gliding over Frostbite Pass's frozen lake.",
  'road-wood': "The wheels rolling on Boardwalk Nights' wooden planks, the whole race, quietly under the engine.",
  'rail-grind': "Grinding along Skyline Circuit's rail, the one trick surface.",
  sparks: 'The drift sparks crackling under the wheels while drifting, louder and higher with each spark tier.',
  'horn:pip': 'The horn of Pip, a fast-talking hummingbird courier (light kart), when the player presses the horn button: it should fit the character.',
  'yelp:pip': 'The yelp of Pip, a fast-talking hummingbird courier (light kart) when their kart is hit: a creature noise, never a word; heard with every hit.',
  'horn:momo': 'The horn of Momo, a deadpan cat mechanic (light kart), when the player presses the horn button: it should fit the character.',
  'yelp:momo': 'The yelp of Momo, a deadpan cat mechanic (light kart) when their kart is hit: a creature noise, never a word; heard with every hit.',
  'horn:nova': 'The horn of Nova, a dreamy moth astronaut (light kart), when the player presses the horn button: it should fit the character.',
  'yelp:nova': 'The yelp of Nova, a dreamy moth astronaut (light kart) when their kart is hit: a creature noise, never a word; heard with every hit.',
  'horn:juniper': 'The horn of Juniper, a rule-following fox park ranger (medium kart), when the player presses the horn button: it should fit the character.',
  'yelp:juniper': 'The yelp of Juniper, a rule-following fox park ranger (medium kart) when their kart is hit: a creature noise, never a word; heard with every hit.',
  'horn:otto': 'The horn of Otto, a laid-back otter lifeguard (medium kart), when the player presses the horn button: it should fit the character.',
  'yelp:otto': 'The yelp of Otto, a laid-back otter lifeguard (medium kart) when their kart is hit: a creature noise, never a word; heard with every hit.',
  'horn:sprocket': 'The horn of Sprocket, a literal-minded wind-up robot (medium kart), when the player presses the horn button: it should fit the character.',
  'yelp:sprocket': 'The yelp of Sprocket, a literal-minded wind-up robot (medium kart) when their kart is hit: a creature noise, never a word; heard with every hit.',
  'horn:boulder': 'The horn of Boulder, a gentle rock golem (heavy kart), when the player presses the horn button: it should fit the character.',
  'yelp:boulder': 'The yelp of Boulder, a gentle rock golem (heavy kart) when their kart is hit: a creature noise, never a word; heard with every hit.',
  'horn:gus': 'The horn of Big Gus, a booming walrus chef (heavy kart), when the player presses the horn button: it should fit the character.',
  'yelp:gus': 'The yelp of Big Gus, a booming walrus chef (heavy kart) when their kart is hit: a creature noise, never a word; heard with every hit.',
});

/** Where each song plays. */
export const SONG_MOMENT: Readonly<Record<string, string>> = Object.freeze({
  title: 'The title screen and menus: the first thing a player hears; sunny, catchy and heroic.',
  'race-harbour': 'Race theme for Harbour Loop (Sunrise Cup opener): a sunny seaside town with piers and a lighthouse.',
  'race-meadow': 'Race theme for Meadow Run: rolling farmland, windmills and hay bales.',
  'race-frost': 'Race theme for Frostbite Pass: a snowy mountain village and an ice lake.',
  'race-boardwalk': 'Race theme for Boardwalk Nights: a night-time seaside carnival, neon and a Ferris wheel.',
  'race-finale': 'Race theme for the cup finales, Canyon Rush (red-rock desert, rope bridges, mine) and Skyline Circuit (cloud islands, airships, sky bridges).',
  results: 'The results screen after a race: relaxed and cheerful while the standings show.',
});

/** The sound-effect request generate.ts sends. */
export function sfxBody(s: SfxSpec): { text: string; duration_seconds: number; prompt_influence: number; loop: boolean; model_id: string } {
  return { text: s.prompt, duration_seconds: s.seconds, prompt_influence: s.influence ?? 0.35, loop: s.loop ?? false, model_id: 'eleven_text_to_sound_v2' };
}

/**
 * The song request generate.ts sends. Always instrumental: the flag is in the type, so no song can
 * be made with singing (Adam, 24 Sept 2026: no singing or vocals in any song).
 */
export function songBody(s: SongSpec, model: string): { prompt: string; music_length_ms: number; model_id: string; force_instrumental: true } {
  return { prompt: s.prompt, music_length_ms: s.seconds * 1000, model_id: model, force_instrumental: true };
}

/** File name for an id: colons are not safe in file names on every system. */
export const fileFor = (id: string): string => `${id.replace(/:/g, '-')}.mp3`;
