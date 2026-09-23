// Every recorded sound and song in the game, with the exact ElevenLabs prompt that made it.
// This file is the provenance record for CREDITS.md: change a prompt, remake the file.
// Ids match src/audio/types.ts SfxId (sound effects) and the music ids in src/audio/samples.ts.
// Rules: original sounds only, no franchise names, no voices or words.

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
  { id: 'finishLow', seconds: 2.2, prompt: 'A short friendly nice-try jingle for finishing a cartoon race in a lower place: soft marimba and muted trumpet, cheerful but modest, gentle ending. No voice.' },
  // pickups and items
  { id: 'balloon', seconds: 0.6, prompt: `A party balloon popping: one crisp rubber pop with a tiny sparkly twinkle after it. ${CARTOON}` },
  { id: 'coin', seconds: 0.5, prompt: 'A bright arcade coin pickup: two quick high metallic chime notes, clean and satisfying. No voice.' },
  { id: 'rouletteTick', seconds: 0.5, influence: 0.6, prompt: 'One single very short dry plastic click, like a prize wheel peg ticking once. No echo.' },
  { id: 'itemReady', seconds: 0.9, prompt: 'A magical sparkly shimmer when a mystery prize is revealed: a quick glittering bell arpeggio going up. Short. No voice.' },
  { id: 'throw', seconds: 0.6, prompt: `A quick throwing whoosh: an object flung forward through the air, airy swish. ${CARTOON}` },
  { id: 'kite', seconds: 1.3, prompt: `A paper kite launching and flying away fast: fluttering flapping whoosh with a playful rising whistle. ${CARTOON}` },
  { id: 'drop', seconds: 0.6, prompt: `A small object dropped onto a road: soft plop and a little rubbery bounce. ${CARTOON}` },
  { id: 'shieldUp', seconds: 1, prompt: `A magical bubble shield forming: shimmering rising whoosh with a soft glassy ring. ${CARTOON}` },
  { id: 'shieldPop', seconds: 0.8, prompt: `A magical soap bubble shield bursting into sparkles: glassy pop and a glittering shatter. ${CARTOON}` },
  { id: 'airHorn', seconds: 1.2, prompt: 'A loud comedic stadium air horn: one long cartoon honk blast. No voice.' },
  { id: 'fog', seconds: 1.5, prompt: `A thick cloud of smoke puffing out: soft rushing whoosh and a hissing puff. ${CARTOON}` },
  { id: 'rocket', seconds: 1.3, prompt: `A firework rocket launching: fizzing sparkly whoosh, then a small crackle. ${CARTOON}` },
  { id: 'hit', seconds: 0.8, prompt: `A go-kart getting bonked by a thrown toy: bouncy boing with a small plastic crash. ${CARTOON}` },
  { id: 'spin', seconds: 1.3, prompt: `A go-kart spinning out: a descending slide whistle over a short tyre squeal. ${CARTOON}` },
  // boosts: the drift tiers grow
  { id: 'boost1', seconds: 0.7, prompt: 'A short small turbo boost for a toy go-kart: one quick jet whoosh burst. No music, no voice.' },
  { id: 'boost2', seconds: 1, prompt: 'A strong turbo boost for a go-kart: rushing jet burst with a rising whoosh. No music, no voice.' },
  { id: 'boost3', seconds: 1.4, prompt: 'A big powerful turbo boost for a go-kart: roaring jet blast with a rising whoosh and a crackling flame. No music, no voice.' },
  { id: 'boostPad', seconds: 0.9, prompt: 'A go-kart driving over a glowing speed boost pad: an electric zap and a fast rising whoosh. Arcade style. No music, no voice.' },
  { id: 'boostTrick', seconds: 0.8, prompt: `A stylish mid-air trick: quick sparkling swoosh with a twinkle chime. ${CARTOON}` },
  { id: 'boostStart', seconds: 1.2, prompt: 'A perfect rocket start in a kart race: a sharp small engine rev, then a turbo whoosh launching forward. No music, no voice.' },
  { id: 'tierUp', seconds: 0.5, influence: 0.5, prompt: 'A tiny crackling electric spark: one short bright sizzle zap. No music, no voice.' },
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
  { id: 'uiBack', seconds: 0.5, influence: 0.5, prompt: 'A soft menu back sound: one short low bubbly pop going down, arcade game menu. No voice.' },
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

/** File name for an id: colons are not safe in file names on every system. */
export const fileFor = (id: string): string => `${id.replace(/:/g, '-')}.mp3`;
