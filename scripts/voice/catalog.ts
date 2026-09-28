// Every racer voice line ("bark") in the game, with the voice and the direction that made it. The
// provenance record: change a line or a direction, remake its takes (generate.ts), judge them
// (judge.ts) and rebuild the files (build.ts). The game reads public/audio/voice.json (build.ts).
// Rules: original lines only, US English, rated G, short (a word or a short phrase, like Mario Kart's
// barks); no franchise catchphrase and nothing that imitates a known character or person (the test
// holds a list); every racer's lines come from their personality in docs/design.md §4.
import type { Bark } from '../../src/audio/types.ts';

/** Gemini text to speech (26 Sept 2026: judged against 2.5 Pro TTS on the same lines, it won every character). */
export const MODEL = 'gemini-3.8-flash-tts';

export interface CastVoice {
  name: string;
  /** Gemini's prebuilt voice, picked by the judge from three per racer (26 Sept 2026) */
  voice: string;
  /** the text-to-speech model when not MODEL: 3.8 Flash Lite matched Flash for Boulder only (9 and 9, one clip each; Gus 3 to 9, Otto 7 to 9) */
  model?: string;
  /** how much longer than the usual pace a take may run (a slow talker): generate.ts's length check */
  pace?: number;
  /** who they are and how they sound: the prompt's audio profile */
  profile: string;
  lines: Partial<Record<Bark, readonly string[]>>;
}

/** Where each kind of line is said, and how: the prompt's scene and direction. */
export const MOMENTS: Readonly<Record<Bark, { scene: string; style: string }>> = {
  select: { scene: 'On the racer select screen, NAME has just been picked and greets the player, excited to race.', style: 'The character\'s signature line, full of personality, a short exclamation with cartoon timing.' },
  start: { scene: 'The lights turn green and NAME nails a perfect rocket start.', style: 'A thrilled burst of energy. Very short.' },
  boost: { scene: 'NAME\'s kart fires a big drift boost and surges forward.', style: 'Exhilarated, riding the speed. Very short.' },
  trick: { scene: 'NAME flies off a ramp and spins a trick in mid-air.', style: 'A joyful shout in the air. Very short, like one breath.' },
  hitRival: { scene: 'NAME\'s thrown item just hit a rival and spun them out.', style: 'A playful, good-natured gloat, never mean. Short.' },
  overtake: { scene: 'NAME zooms past a rival.', style: 'Cheeky and confident, tossed over the shoulder. Short.' },
  hit: { scene: 'NAME\'s kart just got hit and spins out.', style: 'A startled cartoon yelp: surprised, not hurt. Very short.' },
  win: { scene: 'NAME crosses the finish line in first place.', style: 'Overjoyed, triumphant. Short.' },
  good: { scene: 'NAME finishes the race in second or third place.', style: 'Pleased and upbeat. Short.' },
  lose: { scene: 'NAME finishes the race near the back.', style: 'Disappointed but a good sport. Short.' },
  lap: { scene: 'NAME crosses the line and announces the lap.', style: 'Precise and proud, a clockwork announcement. Short.' },
  sorry: { scene: 'NAME bumps into a smaller racer by accident.', style: 'Sheepish and kind, a quick apology. Very short.' },
};

export const CAST: Readonly<Record<string, CastVoice>> = {
  pip: {
    name: 'Pip', voice: 'Fenrir',
    profile: 'A tiny hummingbird courier (male) in a bright cartoon kart-racing game: very high, light and quick, bubbly and fast-talking, never stops moving, like the zippy sidekick in an animated family movie.',
    lines: {
      select: ['Special delivery!', 'Pip\'s on the way!'],
      start: ['Zoom!', 'And we\'re off!'],
      boost: ['Zippity-zoom!', 'Full throttle!'],
      trick: ['Airmail!', 'Loop-de-loo!', 'Yeah-yeah-yeah!'],
      hitRival: ['Gotcha!', 'Package delivered!', 'Signed and sealed!'],
      overtake: ['Coming through!', 'Express lane!', 'Zip zip, passing!'],
      hit: ['Aah, my feathers!', 'My parcels!', 'Ow, ow!'],
      win: ['Delivered on time!', 'First class!'],
      good: ['Not bad, not bad!'],
      lose: ['Return to sender...', 'Aw, late again!'],
    },
  },
  momo: {
    name: 'Momo', voice: 'Erinome',
    profile: 'A cool cat mechanic (female) in overalls in a bright cartoon kart-racing game: dry, deadpan, competent, a little smug, relaxed; friendly underneath.',
    lines: {
      select: ['Tuned and ready.', 'Let\'s get to work.'],
      start: ['Clean launch.', 'Go time.'],
      boost: ['Now we\'re purring.', 'Tuned it myself.'],
      trick: ['Nice.', 'Stuck it.', 'Mrrow!'],
      hitRival: ['Called it.', 'Maintenance issue.', 'Oops. My bad.'],
      overtake: ['Too easy.', 'Move over.', 'Excuse me.'],
      hit: ['Hey!', 'Ugh, my paint.', 'Hmph!'],
      win: ['Right on schedule.', 'Easy win.'],
      good: ['Could be worse.'],
      lose: ['Needs a tune-up.', 'Hmph. Rematch.'],
    },
  },
  nova: {
    name: 'Nova', voice: 'Aoede',
    profile: 'A dreamy moth astronaut (female) in a bright cartoon kart-racing game: soft, airy and wonder-struck, a little spacey, drawn to bright lights; sweet and gentle.',
    lines: {
      select: ['Ready for liftoff!', 'To the lights!'],
      start: ['Liftoff!', 'Here I float!'],
      boost: ['Ooh, shiny!', 'Warp speed!'],
      trick: ['Weightless!', 'So many stars!', 'Floating!'],
      hitRival: ['Bullseye!', 'Twinkle, twinkle!', 'Oops, stardust!'],
      overtake: ['Lights ahead!', 'Pardon me!', 'Drifting by!'],
      hit: ['Oh, my wings!', 'Eek!', 'Ouch!'],
      win: ['I reached the lights!', 'Out of this world!'],
      good: ['So pretty!'],
      lose: ['Lost in space...', 'Aw, moondust.'],
    },
  },
  juniper: {
    name: 'Juniper', voice: 'Autonoe',
    profile: 'A fox park ranger (female) in a bright cartoon kart-racing game: cheerful, bright and upbeat rule-follower with a secretly fierce competitive streak.',
    lines: {
      select: ['Ranger Juniper, reporting!', 'Buckle up, everyone!'],
      start: ['Trail\'s open!', 'By the book!'],
      boost: ['Full speed ahead!', 'Now we\'re talking!'],
      trick: ['Yee-haw!', 'Hup!', 'Stick the landing!'],
      hitRival: ['Ticket for you!', 'Fair and square!', 'Ranger rules!'],
      overtake: ['Passing on the left!', 'Keep right!', 'Stay in your lane!'],
      hit: ['Hey, no fair!', 'Yipe!', 'Rude!'],
      win: ['Gold star for me!', 'Top of the trail!'],
      good: ['Good effort, team!'],
      lose: ['Next time, for sure!', 'Aw, shucks.'],
    },
  },
  otto: {
    name: 'Otto', voice: 'Achird',
    profile: 'An otter lifeguard (male) in a bright cartoon kart-racing game: laid-back, sunny surfer vibe, easygoing and friendly, waves at everyone.',
    lines: {
      select: ['Surf\'s up!', 'Hey, everybody!'],
      start: ['Let\'s ride!', 'Catch the wave!'],
      boost: ['Riding the wave!', 'Silky smooth!'],
      trick: ['Hang loose!', 'Nice and easy!', 'Cruising!'],
      hitRival: ['Wipeout!', 'Splash!', 'Heh, sorry, dude!'],
      overtake: ['Later, dude!', 'See ya!', 'Coming through, pals!'],
      hit: ['Gnarly wipeout!', 'Glub!', 'Bummer!'],
      win: ['What a ride!', 'Best day ever!'],
      good: ['Pretty sweet!'],
      lose: ['Eh, no worries.', 'Bummer, dude.'],
    },
  },
  sprocket: {
    name: 'Sprocket', voice: 'Rasalgethi',
    profile: 'A wind-up toy robot in a bright cartoon kart-racing game: literal-minded, precise and clipped, a cheerful clockwork toy with a slightly mechanical cadence; counts laps aloud.',
    lines: {
      select: ['Sprocket, fully wound!', 'Systems ready!'],
      start: ['Launch sequence: go!', 'Tick-tock, go!'],
      boost: ['Maximum torque!', 'Speed plus one!'],
      trick: ['Rotation complete!', 'Flip executed!', 'Airborne! Beep!'],
      hitRival: ['Target reached.', 'Direct hit. Beep boop.', 'Calculated.'],
      overtake: ['Position improved.', 'Passing. Excuse me.', 'Plus one place!'],
      hit: ['Error! Error!', 'Gears rattled!', 'Ow. That was a hit.'],
      win: ['Result: first place!', 'Victory computed!'],
      good: ['Acceptable result.'],
      lose: ['Recalculating...', 'Needs more winding.'],
      // in order: said at the start of lap two, and of the last lap
      lap: ['Lap two!', 'Final lap!'],
    },
  },
  boulder: {
    name: 'Boulder', voice: 'Charon', model: 'gemini-3.8-flash-lite-tts', pace: 1.4,
    profile: 'A big round friendly rock golem (male) in a bright cartoon kart-racing game: very low, slow, gentle and rumbly, a soft-hearted giant who apologizes after bumping anyone.',
    lines: {
      select: ['Hello, friends!', 'Boulder, ready to roll.'],
      start: ['Rolling!', 'Here I rumble!'],
      boost: ['Rumble rumble!', 'Big push!'],
      trick: ['Oh my, I\'m flying!', 'Heave-ho!', 'Up we go!'],
      hitRival: ['Oh no, sorry!', 'Oops! My fault!', 'Sorry, friend!'],
      overtake: ['Pardon me, friend.', 'Excuse me, coming through.', 'Big rock passing!'],
      hit: ['Oof!', 'Oh, pebbles!', 'Ow, my moss!'],
      win: ['I did it! Thank you all!', 'Hooray! Hugs for everyone!'],
      good: ['That was fun!'],
      lose: ['Oh well. Good race, friends.', 'Aww, pebbles.'],
      sorry: ['Oops! Sorry!', 'So sorry!'],
    },
  },
  gus: {
    // pace 1.3 and quick, punchy delivery (27 Sept 2026): his booming readings ran past the length check,
    // and every rejected take spent a request of the TTS model's 100 a day (the 27 Sept run ran out on him).
    // Positive words only (28 Sept 2026): 'never a "ho ho ho"' put it in 3 of 16 takes (heard as Santa), and the
    // judge heard most others as flat; Google's TTS guide advises against negative instructions and long directions.
    // "Jolly" went too: a "ho ho" still came in 1 of 5 takes without the words, a deep jolly giant reads as Santa.
    name: 'Big Gus', voice: 'Algenib', pace: 1.3,
    profile: 'A huge, friendly walrus chef (male) in a bright cartoon kart-racing game: deep, booming and warm, generous, loves feeding everyone. He calls out every line fast, loud and happy, like a cheerful chef shouting orders across a busy kitchen.',
    lines: {
      select: ['Big Gus is cooking!', 'Who\'s hungry?'],
      start: ['Order up!', 'Soup\'s on!'],
      boost: ['Turn up the heat!', 'Sizzle!'],
      trick: ['Flip the pancake!', 'Ha-ha, airborne!', 'Up she goes!'],
      hitRival: ['Ha-ha! Taste test!', 'Bon appétit!', 'Hot delivery!'],
      overtake: ['Hot plate coming through!', 'Make way for the chef!', 'Out of my kitchen!'],
      hit: ['My soufflé!', 'Oh no, the soup!', 'Oof!'],
      win: ['Dinner is served!', 'Chef\'s kiss!'],
      good: ['Delicious race!'],
      lose: ['Burnt the toast...', 'Ah, seconds next time!'],
    },
  },
};

/** The text-to-speech prompt for one line: audio profile, scene, direction, then the words alone. */
export function prompt(racerId: string, bark: Bark, line: string): string {
  const c = CAST[racerId];
  const m = MOMENTS[bark];
  return `# AUDIO PROFILE: ${c.name}\n${c.profile}\n\n## THE SCENE\n${m.scene.replace('NAME', c.name)}\n\n### DIRECTOR'S NOTES\nStyle: ${m.style} Say only the transcript, nothing else.\n\n#### TRANSCRIPT\n${line}`;
}

/** Every line as a job: racer, bark, its index among that bark's lines, the words; `key` names its files. */
export function allLines(): { key: string; racerId: string; bark: Bark; n: number; line: string }[] {
  const out: { key: string; racerId: string; bark: Bark; n: number; line: string }[] = [];
  for (const [racerId, c] of Object.entries(CAST)) {
    for (const [bark, lines] of Object.entries(c.lines) as [Bark, readonly string[]][]) {
      lines.forEach((line, n) => out.push({ key: `${racerId}-${bark}-${n + 1}`, racerId, bark, n, line }));
    }
  }
  return out;
}
