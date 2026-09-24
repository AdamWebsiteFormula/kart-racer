// Every recorded sound and song in the game, with the exact ElevenLabs prompt that made it.
// This file is the provenance record for CREDITS.md: change a prompt, remake the file.
// Ids match src/audio/types.ts SfxId (sound effects) and the music ids in src/audio/samples.ts.
// Rules: original sounds only, no franchise names, no voices or words. No human voice at all:
// no crowd, cheer, chant or shout (the racers' own yelps and horns are creature and toy noises).
// Every song is instrumental: its prompt says so and every request forces it (songBody).

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
  { id: 'shift', seconds: 2.2, prompt: 'A big magical world-changing sting for a cartoon race track transforming: a deep rising rumble swelling into a huge airy whoosh sweep, then a bright sparkly shimmer. Dramatic and exciting, short. No music, no voice.' },
  // the Knockout cut: through to the next round, or out
  { id: 'koSafe', seconds: 2, prompt: 'A short bright arcade success sting for making it through to the next round of a cartoon race: a quick rising three-note synth-brass call ending on a sparkly chord. Cheerful. No voice.' },
  { id: 'koOut', seconds: 2.2, prompt: 'A short gentle arcade sting for being knocked out of a cartoon race: a slow descending four-note muted trombone phrase, a little sad but friendly and funny, soft ending. No voice.' },
  { id: 'finishLow', seconds: 2.2, prompt: 'A short friendly nice-try jingle for finishing a cartoon race in a lower place: soft marimba and muted trumpet, cheerful but modest, gentle ending. No voice.' },
  // pickups and items
  { id: 'balloon', seconds: 0.6, prompt: `A party balloon popping: one crisp rubber pop with a tiny sparkly twinkle after it. ${CARTOON}` },
  { id: 'coin', seconds: 0.5, prompt: 'A bright arcade coin pickup: two quick high metallic chime notes, clean and satisfying. No voice.' },
  // remade 24 Sept 2026: the first was a 5 ms click, so spiky that at a level you could hear it
  // over the music it pushed the output past −1 dB true peak; a tick with a note has body
  { id: 'rouletteTick', seconds: 0.5, influence: 0.6, prompt: 'One single short bright wooden tock with a clear pitched note, like a prize wheel peg knocking once: a tiny marimba-like tick. Dry, no echo, no music, no voice.' },
  { id: 'itemReady', seconds: 0.9, prompt: 'A magical sparkly shimmer when a mystery prize is revealed: a quick glittering bell arpeggio going up. Short. No voice.' },
  { id: 'throw', seconds: 0.6, prompt: `A quick throwing whoosh: an object flung forward through the air, airy swish. ${CARTOON}` },
  { id: 'kite', seconds: 1.3, prompt: `A paper kite launching and flying away fast: fluttering flapping whoosh with a playful rising whistle. ${CARTOON}` },
  // retaken 24 Sept 2026 (same prompt): the old take tagged as a coin dropping; the kept one as a knock
  { id: 'drop', seconds: 0.6, prompt: `A small object dropped onto a road: soft plop and a little rubbery bounce. ${CARTOON}` },
  { id: 'shieldUp', seconds: 1, prompt: `A magical bubble shield forming: shimmering rising whoosh with a soft glassy ring. ${CARTOON}` },
  { id: 'shieldPop', seconds: 0.8, prompt: `A magical soap bubble shield bursting into sparkles: glassy pop and a glittering shatter. ${CARTOON}` },
  { id: 'shieldEnd', seconds: 0.8, prompt: `A magical bubble shield fading away on its own: a soft glassy shimmer dissolving downward, gentle and quiet. ${CARTOON}` },
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
  { id: 'anchor', seconds: 1.1, prompt: `A heavy ship anchor thrown forward on a chain: a metal chain rattling out fast, then a solid clank as it hooks on. ${CARTOON}` },
  { id: 'slingshot', seconds: 0.8, prompt: `A stretchy rubber slingshot release: a twangy snap and a fast whoosh past. ${CARTOON}` },
  { id: 'mouse', seconds: 1.2, prompt: `A wind-up clockwork toy mouse let go: a few quick winding key clicks, a tiny squeak, then fast scurrying tin feet. ${CARTOON}` },
  { id: 'blocked', seconds: 0.6, prompt: `A thrown toy bouncing off a shield: a quick hollow plastic clonk with a small ricochet ping. ${CARTOON}` },
  { id: 'denied', seconds: 0.5, influence: 0.6, prompt: 'A short soft negative arcade sound: one low muted two-note bloop going down, friendly, not harsh. No voice.' },
  { id: 'trail', seconds: 0.5, influence: 0.6, prompt: 'A small toy being grabbed and held behind a go-kart: one quick plastic click and a tiny rattle. No music, no voice.' },
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
  { id: 'boost1', seconds: 0.7, prompt: 'A short small turbo boost for a toy go-kart: one quick jet whoosh burst. No music, no voice.' },
  { id: 'boost2', seconds: 1, prompt: 'A strong turbo boost for a go-kart: rushing jet burst with a rising whoosh. No music, no voice.' },
  { id: 'boost3', seconds: 1.4, prompt: 'A big powerful turbo boost for a go-kart: roaring jet blast with a rising whoosh and a crackling flame. No music, no voice.' },
  { id: 'boostPad', seconds: 0.9, prompt: 'A go-kart driving over a glowing speed boost pad: an electric zap and a fast rising whoosh. Arcade style. No music, no voice.' },
  // the trick itself, the moment the button is pressed in the air
  { id: 'trick', seconds: 0.7, prompt: `A go-kart doing a quick mid-air flip trick: a fast spinning air whoosh swish with a tiny sparkle. ${CARTOON}` },
  { id: 'boostTrick', seconds: 0.8, prompt: `A stylish mid-air trick: quick sparkling swoosh with a twinkle chime. ${CARTOON}` },
  // remade 24 Sept 2026 at 1.6 s: the 1.2 s take was cut off at full level
  { id: 'boostStart', seconds: 1.6, prompt: 'A perfect rocket start in a kart race: a sharp small engine rev, then a turbo whoosh launching forward that fades away completely at the end. No music, no voice.' },
  { id: 'slipstream', seconds: 1, prompt: "A go-kart slingshotting out of another kart's slipstream: a rushing wind whoosh that swells and snaps forward past the listener, airy and fast. No music, no voice." },
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
  { id: 'horn:sprocket', seconds: 1, prompt: 'A wind-up tin toy horn: a quick tick-tock tick-tock, then one small bell ding. No voice.' },
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
