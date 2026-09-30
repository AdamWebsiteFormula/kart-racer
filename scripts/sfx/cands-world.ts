// Candidates for the road surfaces and the track hazards (29 Sept 2026: Adam, "The existing sounds on the game are super
// cheap. I need a complete sound effects overhaul"). Surfaces are 3 s seamless loops under the engine: gravel from a
// car's tires on gravel (SoundBits' Mad Mustang Mercury, Sonniss GDC 2026), ice from 99Sounds' frozen waterfall
// (Sound Design Tools), the rail from its metal dragging, and snow, sand and planks built from dense runs of Nox
// Sound's recorded footsteps (Essentials), which no tire recording in the packs covers. Hazards from the same packs
// plus Lentikula's spell impacts (CC0), 344 Audio's Dinosaurs and Epic Stock Media's water impact (Sonniss GDC 2026).
// The raw files live in the private repo AdamWebsiteFormula/rascal-sfx-source; only the finished mixes ship.
//   RASCAL_SFX_PACKS=/home/user/rascal-sfx-source/packs python3 scripts/sfx/build.py --recipes=scripts/sfx/cands-world.ts --out=<dir>
import { cap, lvl, OUT } from './parts.ts';
import type { Fx, Layer, Recipe } from './types.ts';

const RAW = (f: string) => ({ pack: `99S011_Sound_Design_Tools/#99S011 Sound Design Tools/Raw Foley/${f}.wav` });
const NN = (f: string) => ({ pack: `99_Sound_Effects/99 Sound Effects/WAV/${f}.wav` });
const FOOT = (kind: string, f: string) => ({ pack: `Essentials_Series_NOX_SOUND/Essentials_Series_NOX_SOUND/Footsteps_Essentials_NOX_SOUND/Footsteps_${kind}/${f}.wav` });
const GRAVEL = { pack: 'Sonniss.com-GDC2026-GameAudioBundle5of5/SoundBits - Cars - Mad Mustang Mercury/VEHSkid_Tire Skids on Gravel 15 06_SNDBTS_CRS-MMM.wav' };
const DRIVE = { pack: 'Sonniss.com-GDC2026-GameAudioBundle5of5/SoundBits - Cars - Mad Mustang Mercury/VEHCar_Various Driving at Slow Speed 15 06_SNDBTS_CRS-MMM.wav' };
const WATER = { pack: 'Sonniss.com-GDC2026-GameAudioBundle2of5/Epic Stock Media - Elemental Mutation Whooshes and Impacts/WATRImpt_Impact Water Deep Submerge Bubble Drown Ship Hit 05_ESM_EMWI.wav' };
const BUBBLES = { pack: 'Sonniss.com-GDC2026-GameAudioBundle2of5/Cinematic Sound Design - Cartoon & Animation Vol 2/Cartoon Bubbles Short.wav' };
const TREX = { pack: 'Sonniss.com-GDC2026-GameAudioBundle1of5__1_/344 Audio - Dinosaurs Vol. 1/ANMLRept_T Rex_344 Audio_Dinosaurs.wav' };
const SPELL = (kind: string, n: number) => ({ pack: `Basic_Spell_Impacts/${kind} Spell Impacts/${kind} Spell Impact ${n}.wav` });
const EARTH = (n: number) => ({ pack: `Druid_Spell_Impacts_Pack/Earth Spell Impacts/Earth Spell Impact ${n}.wav` });

const L = (src: { pack: string }, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src, fx: [...fx, ...lvl(db)] });
const SUB = (db: number, len: number, at = 0): Layer => L(NN('Sub - Mini Impact'), db, [{ op: 'lp', hz: 220 }, ...cap(len)], at);
const MASTER: Fx[] = [{ op: 'hp', hz: 35 }, { op: 'comp', threshold: -16, ratio: 2.5, attack: 0.004, release: 0.15 }, OUT];
const r = (id: string, brief: string, layers: Layer[], master: Fx[] = MASTER): Recipe => ({ id, brief, why: 'candidate, 29 Sept 2026', layers, master });
const surface = (id: string, brief: string, layers: Layer[], master: Fx[] = []): Recipe =>
  ({ id, brief, why: 'candidate, 29 Sept 2026', loop: 3, xfade: 0.1, layers, master: [...master, { op: 'comp', threshold: -18, ratio: 2, attack: 0.005, release: 0.15 }, OUT] });

/** a steady texture from single recorded steps: every `step` seconds over 3.3 s, cycling the takes, the level and
 *  the timing nudged by a fixed pattern so it never ticks like a clock */
const JIT = [0, 0.3, -0.2, 0.45, -0.35, 0.15, -0.1, 0.4, -0.45, 0.2, -0.3, 0.05];
const GAIN = [0, -3, -1, -4, -2, -1.5, -3.5, -0.5, -2.5, -4.5, -1, -2];
const steps = (files: { pack: string }[], step: number, db: number, fx: Fx[] = []): Layer[] =>
  Array.from({ length: Math.ceil(3.3 / step) }, (_, i) =>
    L(files[i % files.length], db + GAIN[i % GAIN.length], fx, Math.max(0, i * step + JIT[i % JIT.length] * step * 0.5)));
const n2 = (i: number) => String(i).padStart(2, '0');
const SNOW = Array.from({ length: 11 }, (_, i) => FOOT('Snow', `Footsteps_Snow_Run/Footsteps_Snow_Hard_Run_${n2(i + 1)}`));
const WOOD = Array.from({ length: 10 }, (_, i) => FOOT('Wood', `Footsteps_Wood_Run/Footsteps_Wood_Run_${n2(i + 1)}`));
const SAND = Array.from({ length: 5 }, (_, i) => FOOT('Sand', `Footsteps_Sand_Jump/Footsteps_Sand_Jump_Land_${n2(i + 1)}`));

export const RECIPES: readonly Recipe[] = [
  // ---- surfaces
  surface('offroad', 'Tires rolling fast over grass and loose gravel: a rough, steady crunchy rumble, no engine.', [
    L(GRAVEL, 0, [{ op: 'trim', from: 27.9, to: 31.1 }, { op: 'mono' }]),
  ], [{ op: 'hp', hz: 80 }]),
  surface('offroad-sand', 'Tires rolling fast through soft sand: a soft, hissing, crunchy sand rush, steady, no engine.', [
    ...steps(SAND, 0.07, -2, [{ op: 'lp', hz: 7000 }]),
    L(GRAVEL, -8, [{ op: 'trim', from: 27.9, to: 31.1 }, { op: 'hp', hz: 2500 }, { op: 'mono' }]),
  ], [{ op: 'hp', hz: 150 }]),
  surface('offroad-snow', 'Tires rolling fast through fresh snow: an unbroken soft crunching hiss, steady, no engine.', [
    ...steps(SNOW, 0.06, 0),
  ], [{ op: 'hp', hz: 120 }, { op: 'lp', hz: 9000 }]),
  surface('road-ice', 'Tires gliding fast over smooth ice: a thin, glassy hiss with small icy crackles, steady, no engine.', [
    L(RAW('frozenwaterfall_4'), 0, [{ op: 'trim', to: 3.2 }, { op: 'mono' }]),
  ], [{ op: 'hp', hz: 400 }]),
  surface('road-wood', 'Rolling fast over boardwalk planks: a steady hollow wooden rumble with quick, even plank clatters, no engine.', [
    ...steps(WOOD, 0.11, -2, [{ op: 'hp', hz: 150 }, ...cap(0.2)]),
    L(DRIVE, -6, [{ op: 'trim', from: 5.1, to: 8.3 }, { op: 'lp', hz: 350 }, { op: 'mono' }]),
  ]),
  surface('rail-grind', 'Grinding fast along a metal rail: a bright, steady metal scrape with crackling sparks, no engine.', [
    L(RAW('metaldragging'), 0, [{ op: 'trim', from: 0.7, to: 3.9 }, { op: 'mono' }]),
    L({ pack: '99Sounds_Electromagnetic_Fields/99Sounds Electromagnetic Fields/Sounds/FTUS - Electromagnetic Fields 08.wav' }, -8, [{ op: 'trim', from: 1.2, to: 4.4 }, { op: 'hp', hz: 2500 }, { op: 'mono' }]),
  ], [{ op: 'hp', hz: 200 }]),
  // ---- hazards
  r('geyser', 'A geyser erupts: a sudden powerful blast of water shooting up, then a hissing spray raining down, under two seconds.', [
    L(SPELL('Water', 1), 0, [{ op: 'trim', from: 0.2 }, ...cap(1.7)]),
    L(NN('Swish - Nice And Clean'), -9, [{ op: 'trim', from: 0.3 }, { op: 'hp', hz: 2000 }, ...cap(1.5)], 0.15),
    SUB(-6, 0.8),
  ]),
  r('steamVent', 'A steam vent blasts open: a sharp, loud hiss and roar of steam shooting skyward, then fading, under two seconds.', [
    L(NN('Swish - Nice And Clean'), 0, [{ op: 'trim', from: 0.2 }, { op: 'hp', hz: 900 }, ...cap(1.75)]),
    SUB(-8, 0.6),
  ]),
  r('ventWarn', 'A hot spring about to erupt: deep bubbling and gurgling rising fast over a low rumble, about a second.', [
    L(BUBBLES, 0, [{ op: 'pitch', st: -5 }, ...cap(1.1)]),
    L(BUBBLES, -4, [{ op: 'pitch', st: -2 }, ...cap(0.9)], 0.3),
    L(WATER, -8, [{ op: 'reverse' }, { op: 'trim', from: 0.9 }, { op: 'lp', hz: 1200 }, ...cap(1.2)]),
  ]),
  r('roar', 'A huge rock dinosaur roars: a deep, booming, rumbling roar, big but playful, about two seconds.', [
    L(TREX, 0, [{ op: 'trim', from: 0.25 }, { op: 'pitch', st: 2 }, ...cap(2.2)]),
  ]),
  r('stomp', 'A giant dinosaur foot stomps the ground: one massive deep boom, rocks rattling and a rolling rumble fading away.', [
    L(EARTH(1), 0, cap(1.75)),
    SUB(-2, 1.2),
  ]),
  r('snowThud', 'A giant snowball lands on the road: a heavy soft thump and crunchy snow spraying, about a second.', [
    L(FOOT('Snow', 'Footsteps_Snow_Jump/Footsteps_Snow_Hard_Jump_Land_01'), 0, [{ op: 'pitch', st: -5 }, ...cap(0.8)]),
    L(FOOT('Snow', 'Footsteps_Snow_Jump/Footsteps_Snow_Hard_Jump_Land_03'), -4, cap(0.5), 0.04),
    SUB(-3, 0.8),
  ]),
  r('krakenRise', 'A giant sea creature rises out of the water: deep bubbling, sloshing water and a low rumble, under two seconds.', [
    L(WATER, 0, [{ op: 'reverse' }, { op: 'trim', from: 0.4 }, ...cap(1.75)]),
    L(BUBBLES, -6, [{ op: 'pitch', st: -7 }, ...cap(0.9)], 0.5),
  ]),
  r('krakenSlam', 'A giant tentacle slams down on boardwalk planks: a huge wet slap, wood cracking and a big splash, about a second and a half.', [
    L(WATER, 0, cap(1.45)),
    L(FOOT('Wood', 'Footsteps_Wood_Jump/Footsteps_Wood_Jump_Land_01'), -3, [{ op: 'pitch', st: -7 }, ...cap(0.6)]),
    SUB(-3, 0.9),
  ]),
  r('clawDrop', 'A claw opens and drops a kart onto the road: a springy metal clack and a solid bump, under a second.', [
    L(RAW('metalclang_1'), 0, cap(0.5)),
    L(FOOT('Metal', 'Footsteps_Metal_Jump/Footsteps_MetalV1_Jump_Land_01'), -3, cap(0.5), 0.22),
    SUB(-6, 0.5, 0.22),
  ]),
  r('claw', 'A fairground claw machine: a motor whirring as the claw drops, a clunky metal grab, then a whirring lift, about two seconds.', [
    L(RAW('servomovement_1'), 0, [{ op: 'lp', hz: 7000 }, ...cap(0.9)]),
    L(RAW('metalclang_2'), -2, [{ op: 'trim', from: 0.5 }, ...cap(0.5)], 0.85),
    L(RAW('servomovement_2'), -1, [{ op: 'trim', from: 0.6 }, { op: 'pitch', st: 2 }, { op: 'lp', hz: 7000 }, ...cap(0.8)], 1.3),
  ]),
  r('loop', 'A kart races round a coaster loop: a rising whoosh up and over with a rattling track under it, about two seconds.', [
    L(NN('Whoosh - Land Speeder'), 0, [{ op: 'trim', from: 0.3 }, ...cap(2.35)]),
    L(RAW('rumblingmetal'), -8, [{ op: 'hp', hz: 300 }, ...cap(2.2)]),
  ]),
];
