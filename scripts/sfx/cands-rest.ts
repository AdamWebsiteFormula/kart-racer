// Candidates for every sound the other batches left (29-30 Sept 2026: Adam, "Keep going until you've gotten all the
// sounds on here I need to listen to"): the stings (final lap, win, lower place, knockout in and out, the Final Lap
// Shift), the eight racers' horns and hit yelps, the goose, crab and sky whale, the spin-out and the yeti's throw.
// The packs hold no brass fanfare and no goose, cat, fox, otter or walrus, so those are built from what is there
// (designed risers, braams, bells, bird whistles, squeaks, a dog's bark, motorcycle horns): Adam judges them by ear
// against the ElevenLabs takes. Sources: the Sonniss GDC 2026 bundle (free for games, no credit), 99Sounds' packs,
// Lentikula (CC0), Nox Sound (CC0). The raw files live only in the private repo AdamWebsiteFormula/rascal-sfx-source.
//   RASCAL_SFX_PACKS=/home/user/rascal-sfx-source/packs python3 scripts/sfx/build.py --recipes=scripts/sfx/cands-rest.ts --out=<dir>
import { cap, lvl, OUT } from './parts.ts';
import type { Fx, Layer, Recipe } from './types.ts';

const S1 = 'Sonniss.com-GDC2026-GameAudioBundle1of5__1_', S2 = 'Sonniss.com-GDC2026-GameAudioBundle2of5', S3 = 'Sonniss.com-GDC2026-GameAudioBundle3of5', S5 = 'Sonniss.com-GDC2026-GameAudioBundle5of5';
const P = (bundle: string, lib: string, f: string) => ({ pack: `${bundle}/${lib}/${f}.wav` });
const NN = (f: string) => ({ pack: `99_Sound_Effects/99 Sound Effects/WAV/${f}.wav` });
const SCI = '99Sounds_Sci-Fi_Sound_Effects/99Sounds Sci-Fi Sound Effects';
const SF = (p: string) => ({ pack: `${SCI}/Rescopic Sound - Sci-Fi Energy Weapons (99Sounds Version)/Audio Files/${p}.wav` });
const PX = (p: string) => ({ pack: `${SCI}/Rescopic Sound - Parallax (99Sounds Version)/Audio Files/${p}.wav` });
const RAW = (f: string) => ({ pack: `99S011_Sound_Design_Tools/#99S011 Sound Design Tools/Raw Foley/${f}.wav` });
const FOOT = (kind: string, f: string) => ({ pack: `Essentials_Series_NOX_SOUND/Essentials_Series_NOX_SOUND/Footsteps_Essentials_NOX_SOUND/Footsteps_${kind}/${f}.wav` });
const EARTH = (n: number) => ({ pack: `Druid_Spell_Impacts_Pack/Earth Spell Impacts/Earth Spell Impact ${n}.wav` });

const HONDA_HORN = P(S5, 'SoundBits - Motorcycles - Honda', 'VEHHorn_Honda CB500F Horn Long 02_SNDBTS_MCH');
const KAWA_HORN = P(S5, 'SoundBits - Motorcycles - Kawasaki', 'VEHHorn_Kawasaki Ninja ZX 10R Horn Single 03_SNDBTS_MCK');
const BRAAM = P(S3, 'Jake Fielding - Cinematic Horn Braams', 'DSGNBram____Cinematic Horn Braam, Epic, Cinematic, Dark, Instrument, Huge-67');
const BELLS = P(S1, '344 Audio - Christmas Vol. 1', 'MAGMisc_Magic Christmas Bells 2_344 Audio_Christmas');
const TWINKLE = P(S2, 'Cinematic Sound Design - User Interface', 'Button Arp Twinkle');
const PLUCKS = P(S2, 'Cinematic Sound Design - User Interface', 'Interface Plucks Happy');
const ARP_DOWN = P(S2, 'Cinematic Sound Design - System & UI Feedback Elements', 'Interface Arp Reveal Down Long');
const KALIMBA = P(S2, 'CB_Sounddesign - Applicable Sounds - Organic UI and Building Games SFX', 'UIMisc_Kalimba 3 Up_CB Sounddesign_APPlicable Sounds');
const MAGIC = P(S2, 'CB_Sounddesign - Applicable Sounds - Organic UI and Building Games SFX', 'GAMEMisc_Magic Creation 23_CB Sounddesign_APPlicable Sounds');
const BIRD = P(S2, 'CB_Sounddesign - Applicable Sounds - Organic UI and Building Games SFX', 'TOONMisc_Bird Flutes 3_CB Sounddesign_APPlicable Sounds');
const SQUEAK = P(S2, 'Epic Stock Media - HD Game Materials', 'ICEFric_Dry Ice Squeak Metal Animal Mouse Imitation Short 07_ESM_HDGM');
const TAP = P(S2, 'Epic Stock Media - HD Game Materials', 'METLImpt_Metal Old File Impact Tap Against Tire Iron Metallic Hit 01_ESM_HDGM');
const BOING = P(S2, 'Cinematic Sound Design - UI Interaction Elements', 'Accept Boing Crunch');
const DIZZY = P(S2, 'Cinematic Sound Design - Cartoon Bloopers', 'Cartoon Confused Dizzy');
const DEBRIS = P(S2, 'Cinematic Sound Design - Colossal Impacts', 'Woosh Debris');
const DIAL = P(S1, '344 Audio - Antique Telephone', 'COMTelph_Antique Telephone Rotary Dial Number  9_344 Audio_Antiques - Telephone');
const BARKS = P(S1, '344 Audio - Dog Vocalisations Vol. 1', 'ANMLDog_Dog Barks, Multiple, Indoors, Perspective,_344 Audio_Dog Vocalisations_02');
const DOWNER = P(S1, '344 Audio - Bass Drops & Downers Vol. 1', 'DSGNBass_Bass Drop & Downer Fast 16_344 Audio_Bass Drops & Downers');
const BUBBLE = P(S1, '344 Audio - Elemental Palette Designed Vol. 1', 'WATRMisc_Water, Liquid Impact, Bubble, Sci Fi, Hit 04_344 Audio_Elemental Palette Designed Vol 1');
const GUST = P(S1, '344 Audio - Elemental Palette Designed Vol. 1', 'WINDDsgn_Wind, Rush, Whoosh, Long x5 01_344 Audio_Elemental Palette Designed Vol 1');
const CARDS = P(S1, '344 Audio - Casino Cards Vol. 1', 'GAMECas_Pick Up Multiple Cards At Once 5_344 Audio_Casino Cards Vol 1');
const BEEP = P(S3, 'InMotionAudio - Medical Thermometer', 'BEEPMed_Thermometer_Beep11_InMotionAudio_MedicalThermometer');
const PAPER = P(S2, 'Cinematic Sound Design - Paper Foley', 'A4 Printing Paper Rattle Page Turn Tail');
const SKID = P(S5, 'SoundBits - Motorcycles - Honda', 'VEHSkid_Honda CB500F Engine Start Tires Skidding Stop 02_SNDBTS_MCH');

const L = (src: { pack: string }, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src, fx: [...fx, ...lvl(db)] });
const T = (from: number, len: number, extra: Fx[] = []): Fx[] => [{ op: 'trim', from }, ...extra, ...cap(len)];
const SUB = (db: number, len: number, at = 0): Layer => L(NN('Sub - Mini Impact'), db, [{ op: 'lp', hz: 220 }, ...cap(len)], at);
const MASTER: Fx[] = [{ op: 'hp', hz: 35 }, { op: 'comp', threshold: -16, ratio: 2.5, attack: 0.004, release: 0.15 }, OUT];
const WIDE: Fx[] = [{ op: 'hp', hz: 35 }, { op: 'reverb', seconds: 1.4, mix: 0.12, pre: 0.01, hp: 300, lp: 9000, damp: 0.5 }, { op: 'comp', threshold: -16, ratio: 2, attack: 0.01, release: 0.2 }, OUT];
/** a sting ends where the one it replaces did (the results song waits for it: samples.ts STING_SECONDS), its tail faded */
const fit = (len: number): Fx[] => [WIDE[0], WIDE[1], { op: 'trim', to: len }, { op: 'fade', out: Math.min(0.6, len * 0.25) }, WIDE[2], OUT];
const r = (id: string, brief: string, layers: Layer[], master: Fx[] = MASTER): Recipe => ({ id, brief, why: 'candidate, 30 Sept 2026', layers, master });

export const RECIPES: readonly Recipe[] = [
  // ---- stings
  r('finalLap', 'The final lap begins: a fast rising energy charge that bursts into a big, bright hit and rings out, about two and a half seconds. Exciting, edgy and modern.', [
    L(SF('Source Sounds/Charge Up/DSGNRise_Charge Up FM 01_RSCPC_SFEW'), -2, T(0.5, 1.62, [{ op: 'fade', in: 0.3 }])),
    L(NN('Impact - Jaw Breaker'), 0, T(0.36, 1.0), 1.6),
    L(BELLS, -8, T(2.15, 0.9), 1.62),
  ], fit(2.45)),
  r('finish', 'The player wins the race: a glittering rising run of notes, a happy burst of bright plucks, then a long shimmer of bells, about four seconds. Triumphant and bright.', [
    L(TWINKLE, 0, cap(1.0)),
    L(PLUCKS, -1, cap(0.8), 0.7),
    L(PLUCKS, -3, [{ op: 'pitch', st: 5 }, ...cap(0.8)], 1.05),
    L(MAGIC, -4, T(0.35, 2.6), 1.3),
    L(BELLS, -6, T(2.15, 2.2), 1.6),
  ], fit(4.0)),
  r('finishLow', 'The player finishes outside the winning places: a friendly, gentle falling run of soft notes, a little shrug, about two seconds. Kind, not sad.', [
    L(ARP_DOWN, 0, cap(1.2)),
    L(KALIMBA, -6, [{ op: 'pitch', st: -5 }, ...cap(0.5)], 1.05),
  ], fit(2.2)),
  r('koSafe', 'Knockout mode: the player made the cut: a bright upward kalimba run into a magical sparkling rise, relief and a win, about two seconds.', [
    L(KALIMBA, 0, cap(0.5)),
    L(MAGIC, -2, T(0.3, 1.9), 0.3),
  ], fit(2.3)),
  r('koOut', 'Knockout mode: the player is knocked out: a deep, soft, falling bass drop with a gentle low tone, friendly and never harsh, about two seconds.', [
    L(DOWNER, 0, T(0.08, 2.1, [{ op: 'lp', hz: 2500 }])),
    L(ARP_DOWN, -8, [{ op: 'pitch', st: -7 }, ...cap(1.1)], 0.15),
  ], fit(2.2)),
  r('shift', 'The Final Lap Shift: the whole track transforms: a huge dark braam swells for two seconds, a sweeping debris whoosh, then a magical sparkling shimmer that rings to the end, four and a half seconds.', [
    L(BRAAM, 0, T(0.1, 2.6, [{ op: 'fade', in: 0.25 }])),
    L(DEBRIS, -2, T(0.3, 1.5), 1.7),
    L(MAGIC, -3, T(0.3, 2.6), 1.9),
    L(BELLS, -6, T(2.15, 2.3), 2.2),
  ], fit(4.45)),
  // ---- the eight horns (the player's horn button), each in the racer's character
  r('horn:pip', "Pip's horn (a hummingbird courier on a scooter): two quick, high, chirpy honks and a tiny bell ping.", [
    L(KAWA_HORN, 0, [{ op: 'pitch', st: 7 }, ...cap(0.18)]),
    L(KAWA_HORN, 0, [{ op: 'pitch', st: 7 }, ...cap(0.2)], 0.2),
    L(PX('Pings/SCIMisc_Ping 10_RSCPC_PX'), -8, [{ op: 'pitch', st: 12 }, ...cap(0.3)], 0.38),
  ]),
  r('horn:momo', "Momo's horn (a cat mechanic's stripped-down buggy): one rolling engine-rev honk, a purr and a growl.", [
    L({ pack: 'performance-cars-free-sample-pack-mutedio/performance-cars-free-sample-pack-mutedio/004-performance-cars-mutedio.wav' }, 0, cap(1.0)),
    L(HONDA_HORN, -8, [{ op: 'pitch', st: -5 }, ...cap(0.35)], 0.05),
  ]),
  r('horn:nova', "Nova's horn (a dreamy moth astronaut): three soft, shimmering chime tones going up.", [
    L(PX('Pings/SCIMisc_Ping 21_RSCPC_PX'), 0, cap(0.5)),
    L(PX('Pings/SCIMisc_Ping 21_RSCPC_PX'), -1, [{ op: 'pitch', st: 4 }, ...cap(0.5)], 0.18),
    L(PX('Pings/SCIMisc_Ping 21_RSCPC_PX'), -2, [{ op: 'pitch', st: 7 }, ...cap(0.62)], 0.36),
  ], fit(1.0)),
  r('horn:juniper', "Juniper's horn (a fox park ranger with a whistle): one bright, trilling whistle blast.", [
    L(BIRD, 0, cap(0.78)),
  ]),
  r('horn:otto', "Otto's horn (an otter lifeguard with a rescue float): two squeaky rubber-toy squeezes.", [
    L(SQUEAK, 0, T(0.22, 0.3)),
    L(SQUEAK, 0, T(0.22, 0.35, [{ op: 'pitch', st: 2 }]), 0.38),
  ]),
  r('horn:sprocket', "Sprocket's horn (a wind-up robot toy): a quick ratchet of clicks like a key being wound, then one bright little ding.", [
    L(DIAL, 0, T(0.8, 0.7, [{ op: 'pitch', st: 5 }])),
    L(PX('Pings/SCIMisc_Ping 10_RSCPC_PX'), -3, [{ op: 'pitch', st: 12 }, ...cap(0.35)], 0.62),
  ]),
  r('horn:boulder', "Boulder's horn (a gentle rock golem in a stone monster truck): a deep, rumbling, grinding honk.", [
    L(HONDA_HORN, 0, [{ op: 'pitch', st: -12 }, { op: 'lp', hz: 3000 }, ...cap(1.15)]),
    L(EARTH(2), -8, cap(1.1)),
  ]),
  r('horn:gus', "Big Gus's horn (a walrus chef's food truck): one long, low, booming foghorn blast.", [
    L(BRAAM, 0, T(0.15, 1.28, [{ op: 'fade', in: 0.05 }])),
    L(HONDA_HORN, -10, [{ op: 'pitch', st: -17 }, ...cap(1.1)]),
  ]),
  // ---- the eight hit yelps (no words: each racer's creature sound)
  r('yelp:pip', 'Pip is hit: one quick, high, startled bird chirp, very short.', [
    L(BIRD, 0, [{ op: 'pitch', st: 5 }, ...cap(0.45)]),
  ]),
  r('yelp:momo', 'Momo is hit: one short, grumpy, squeaky yowl, very short.', [
    L(SQUEAK, 0, T(0.2, 0.62, [{ op: 'pitch', st: -7 }])),
  ]),
  r('yelp:nova', 'Nova is hit: a quick papery flutter of wings and one tiny, glassy chime, very short.', [
    L(PAPER, -2, T(0.15, 0.5)),
    L(NN('Short - Digital Crystal'), 0, T(0.04, 0.5), 0.05),
  ]),
  r('yelp:juniper', 'Juniper is hit: one short, surprised yip, very short.', [
    L(BARKS, 0, T(0.19, 0.42, [{ op: 'pitch', st: 5 }])),
  ]),
  r('yelp:otto', 'Otto is hit: one quick, squeaky, surprised chirp, very short.', [
    L(SQUEAK, 0, T(0.24, 0.42, [{ op: 'pitch', st: 3 }])),
  ]),
  r('yelp:sprocket', 'Sprocket is hit: a quick springy boing and a surprised electronic bleep, very short.', [
    L(BOING, 0, cap(0.45)),
    L(BEEP, -4, [{ op: 'pitch', st: 3 }, ...cap(0.2)], 0.2),
  ]),
  r('yelp:boulder', 'Boulder is hit: a low, rocky oof of a thump with a clatter of pebbles, very short.', [
    L(EARTH(3), 0, cap(0.6)),
    L(FOOT('Gravel', 'Footsteps_Gravel_Jump/Footsteps_Jump_Land_02'), -4, cap(0.45), 0.08),
  ]),
  r('yelp:gus', 'Big Gus is hit: one short, deep, hoarse honk-bellow with a wet, gurgly bubble, very short.', [
    L(HONDA_HORN, 0, [{ op: 'pitch', st: -14 }, { op: 'lp', hz: 1800 }, ...cap(0.5)]),
    L(BUBBLE, -4, [{ op: 'pitch', st: -7 }, ...cap(0.6)], 0.05),
  ]),
  // ---- hazards and effects
  r('honk', 'A giant grumpy goose charges the karts: two loud, blaring honks and a flurry of flapping.', [
    L(HONDA_HORN, 0, [{ op: 'pitch', st: 3 }, { op: 'bend', st: [[0, 0], [0.3, -2]] }, ...cap(0.35)]),
    L(HONDA_HORN, 0, [{ op: 'pitch', st: 4 }, { op: 'bend', st: [[0, 0], [0.35, -3]] }, ...cap(0.42)], 0.42),
    L(PAPER, -6, T(0.1, 1.1), 0.1),
  ]),
  r('crabClack', 'A giant crab snaps its big claws: three quick, hard clacks and clicky scuttling legs, about a second.', [
    L(TAP, 0, T(0.12, 0.22, [{ op: 'pitch', st: -5 }])),
    L(TAP, 0, T(0.12, 0.22, [{ op: 'pitch', st: -4 }]), 0.16),
    L(TAP, -1, T(0.12, 0.3, [{ op: 'pitch', st: -6 }]), 0.32),
    L(CARDS, -6, cap(0.4), 0.5),
  ]),
  r('whaleSong', 'The sky whale calls: a long, soft, deep sweeping tone that rises and falls, with a gentle shimmer, about two and a half seconds.', [
    L(PX('Pings/SCIMisc_Ping 28_RSCPC_PX'), 0, [{ op: 'pitch', st: -12 }, { op: 'bend', st: [[0, -2], [1.0, 3], [2.4, -3]] }, ...cap(2.45)]),
    L(BELLS, -12, T(2.15, 1.5), 0.6),
  ], fit(2.5)),
  r('tailSlap', "The sky whale's tail sweeps the road: a big airy gust of a whoosh and a soft, thunderous thump.", [
    L(GUST, 0, cap(1.0)),
    L(PX('Whooshes/WHSH_Whoosh Fused Large 34_RSCPC_PX'), -3, T(0.75, 0.8), 0.25),
    SUB(-2, 0.9, 0.45),
  ]),
  r('spin', 'A kart spins out: a short tire screech winding down in pitch, air whirling round and a comic dizzy wobble, about a second.', [
    L(SKID, -2, T(4.0, 0.9, [{ op: 'hp', hz: 500 }, { op: 'bend', st: [[0, 0], [0.9, -6]] }])),
    L(NN('Short - Swish'), -4, T(0.35, 0.3), 0.05),
    L(NN('Short - Swish'), -6, T(0.35, 0.3, [{ op: 'pitch', st: -3 }]), 0.35),
    L(DIZZY, -2, cap(1.0), 0.25),
  ]),
  r('yetiThrow', 'A big friendly yeti heaves a giant snowball onto the road: snow crunching as it winds up, then a heavy whoosh as it flies.', [
    L(FOOT('Snow', 'Footsteps_Snow_Jump/Footsteps_Snow_Hard_Jump_Start_01'), 0, cap(0.4)),
    L(FOOT('Snow', 'Footsteps_Snow_Jump/Footsteps_Snow_Hard_Jump_Land_02'), -2, cap(0.35), 0.18),
    L(PX('Whooshes/WHSH_Whoosh Fused Large 03_RSCPC_PX'), -1, T(0.8, 0.95), 0.35),
  ]),
];
