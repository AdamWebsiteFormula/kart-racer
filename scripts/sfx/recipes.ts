// The game's built sounds: every sound here is made by scripts/sfx/build.py from these recipes, out of the
// approved packs (Kenney's Impact, Interface, UI, Casino and Sci-Fi Sounds, CC0; the VSCO-2 Community Edition
// glockenspiel, xylophone and marimba, CC0), the game's own earlier ElevenLabs takes (pinned to commit 979e511,
// so a take stays buildable after its file is replaced) and seeded code synthesis. This file is their provenance
// record, as scripts/elevenlabs/catalog.ts is for the ElevenLabs sounds: change a recipe, rebuild
// (~/.cache/rascal-ear/venv/bin/python scripts/sfx/build.py <id>), and the tests hold public/audio/sfx and
// scripts/sfx/built.json to it (src/audio/provenance.test.ts). parts.ts has the building blocks for new ones.
// Each recipe won a blind one-clip-per-request hearing against the sound it replaced (Gemini Pro, docs/sops/audio.md).
// Rules as for the catalog: original sounds only, no franchise sound or look-alike, no voices or words.
// The overhaul of 29 Sept 2026 (Adam: "The existing sounds on the game are super cheap"): candidates built from the
// free packs in the private repo AdamWebsiteFormula/rascal-sfx-source live in cands-*.ts; one Adam passes by ear goes
// in approved.ts with his verdict (scripts/sfx/approve.py) and takes its id's place here.
import { APPROVED } from './approved.ts';
import { RECIPES as AMBIENCE } from './cands-ambience.ts';
import { RECIPES as BOOST } from './cands-boost.ts';
import { RECIPES as DRIVE } from './cands-drive.ts';
import { RECIPES as ENGINE } from './cands-engine.ts';
import { RECIPES as ITEMS } from './cands-items.ts';
import { RECIPES as UI } from './cands-ui.ts';
import { RECIPES as WORLD } from './cands-world.ts';
import type { Recipe } from './types.ts';

const CANDIDATES: readonly Recipe[] = [...ITEMS, ...ENGINE, ...DRIVE, ...BOOST, ...UI, ...WORLD, ...AMBIENCE];

const BASE: readonly Recipe[] = [
  {
    id: "boost1",
    brief: "A drift mini-turbo boost, tier 1 of 3, in a polished cartoon kart racing game: the instant the player releases a short drift, the kart darts forward with a quick, punchy burst of exhaust flame and rushing air. Bright, snappy and satisfying, the smallest of the three boosts, about half a second. No voice, nothing that sounds like a weapon.",
    why: "27 Sept 2026 (Adam, 26 Sept, of the boost: 'I just don't like the sound it makes'). Judged alone by Gemini Pro against the same brief, twice: the shipped take 4/3 then 3/2 ('a quick, airy puff... like a mouth-made popping noise'), this 10/10 then 9/9 ('a quick, snappy burst of rushing air and flame-like whoosh'). The game's own whoosh keeps a 50 ms swell into its peak, the steam-vent blast pitched down is the flame, the boost pad's zap the spark. Local ear: CLAP picks the intended whoosh of air and flame (0.73) over an explosion, a gunshot and a boing; AST: bang, whoosh.",
    layers: [
      { src: { git: "979e511", path: "public/audio/sfx/boost2.mp3" }, fx: [{ op: "trim", from: 0.16 }, { op: "pitch", st: 2 }, { op: "fade", in: 0.004 }, { op: "env", pts: [[0, 1], [0.22200000000000003, 0.7], [0.45, 0]] }, { op: "trim", to: 0.45 }, { op: "normalize", db: 0 }, { op: "gain", db: 0 }] },
      { src: { git: "979e511", path: "public/audio/sfx/steamVent.mp3" }, fx: [{ op: "pitch", st: -2 }, { op: "lp", hz: 7000 }, { op: "env", pts: [[0, 0.3], [0.01, 1], [0.1, 0.75], [0.18000000000000002, 0.3], [0.36000000000000004, 0]] }, { op: "trim", to: 0.45 }, { op: "normalize", db: 0 }, { op: "gain", db: -7 }] },
      { at: 0, src: { git: "979e511", path: "public/audio/sfx/boostPad.mp3" }, fx: [{ op: "trim", from: 0.02, to: 0.12 }, { op: "fade", out: 0.05 }, { op: "normalize", db: 0 }, { op: "gain", db: -12 }] },
    ],
    master: [{ op: "hp", hz: 50 }, { op: "peak", hz: 3000, db: 2, q: 0.8 }, { op: "comp", threshold: -14, ratio: 2.5, attack: 0.004, release: 0.12 }, { op: "limit", ceiling: -1 }],
  },
  {
    id: "boost2",
    brief: "A drift mini-turbo boost, tier 2 of 3, in a polished cartoon kart racing game: the instant the player releases a longer drift, the kart surges forward with a punchy burst of exhaust flame and a rushing whoosh of air. Bright, exciting and satisfying, clearly bigger than the tier-1 boost, under a second. No voice, nothing that sounds like a weapon.",
    why: "27 Sept 2026. Judged alone, twice: the shipped take 4/3 then 5/4 ('a quick, bright, airy whoosh or sweep... resembling a UI transition'), this 9/9 then 10/10 ('a punchy, bright whoosh with a fiery pop at the start'). The flame is the game's steam-vent blast pitched down 5 semitones, the whoosh the old tier-3 take from its peak, the zing the rocket start's front. On the documented override (both scores 7 or more and at least 3 over the shipped, nothing voice- or weapon-like in the judge's hearing): CLAP ranks 'an explosion' first, AST hears a bang and a burst.",
    layers: [
      { src: { git: "979e511", path: "public/audio/sfx/steamVent.mp3" }, fx: [{ op: "pitch", st: -5 }, { op: "lp", hz: 6000 }, { op: "lowshelf", hz: 300, db: 4 }, { op: "env", pts: [[0, 1], [0.001, 1], [0.08, 0.8], [0.3, 0.3], [0.6000000000000001, 0]] }, { op: "trim", to: 0.75 }, { op: "normalize", db: 0 }, { op: "gain", db: -2 }] },
      { src: { git: "979e511", path: "public/audio/sfx/boost3.mp3" }, fx: [{ op: "trim", from: 0.1 }, { op: "fade", in: 0.004 }, { op: "env", pts: [[0, 1], [0.375, 0.6], [0.75, 0]] }, { op: "trim", to: 0.75 }, { op: "normalize", db: 0 }, { op: "gain", db: 0 }] },
      { at: 0, src: { git: "979e511", path: "public/audio/sfx/boostStart.mp3" }, fx: [{ op: "trim", to: 0.22 }, { op: "fade", out: 0.08 }, { op: "normalize", db: 0 }, { op: "gain", db: -10 }] },
    ],
    master: [{ op: "hp", hz: 50 }, { op: "peak", hz: 3000, db: 2, q: 0.8 }, { op: "comp", threshold: -14, ratio: 2.5, attack: 0.004, release: 0.12 }, { op: "limit", ceiling: -1 }],
  },
  {
    id: "boost3",
    brief: "A drift mini-turbo boost, tier 3 of 3 (the biggest), in a polished cartoon kart racing game: the instant the player releases a long drift, the kart blasts forward with a big burst of exhaust flame, a powerful rushing whoosh of air and a trail of glittering sparks. Thrilling and satisfying, the biggest of the three boosts, about a second. No voice, nothing that sounds like a weapon.",
    why: "27 Sept 2026. Judged alone, twice: the shipped take 2/2 then 3/2 ('a short, gentle, airy whoosh... like a simple UI swipe'), this 9/9 twice ('a rapid ascending synthetic sweep that bursts into a bright, sparkling whoosh of energy'). The tier-2 recipe made bigger and warmer: the blast pitched down 6 semitones and darker, a low thump, the drift sparks trailing. On the override: CLAP ranks 'an explosion' first, AST whoosh and burst, nothing voice- or weapon-like.",
    layers: [
      { src: { git: "979e511", path: "public/audio/sfx/steamVent.mp3" }, fx: [{ op: "pitch", st: -6 }, { op: "lp", hz: 4200 }, { op: "lowshelf", hz: 300, db: 4 }, { op: "env", pts: [[0, 1], [0.001, 1], [0.08, 0.8], [0.42, 0.3], [0.8400000000000001, 0]] }, { op: "trim", to: 1.05 }, { op: "normalize", db: 0 }, { op: "gain", db: -2 }] },
      { src: { git: "979e511", path: "public/audio/sfx/boost3.mp3" }, fx: [{ op: "trim", from: 0.1 }, { op: "fade", in: 0.004 }, { op: "env", pts: [[0, 1], [0.525, 0.6], [1.05, 0]] }, { op: "trim", to: 1.05 }, { op: "normalize", db: 0 }, { op: "gain", db: 0 }] },
      { at: 0, src: { git: "979e511", path: "public/audio/sfx/boostStart.mp3" }, fx: [{ op: "trim", to: 0.22 }, { op: "lp", hz: 7000 }, { op: "fade", out: 0.08 }, { op: "normalize", db: 0 }, { op: "gain", db: -8 }] },
      { at: 0, src: { git: "979e511", path: "public/audio/sfx/tailSlap.mp3" }, fx: [{ op: "trim", to: 0.3 }, { op: "lp", hz: 450 }, { op: "fade", out: 0.1 }, { op: "normalize", db: 0 }, { op: "gain", db: -6 }] },
      { at: 0.12, src: { git: "979e511", path: "public/audio/sfx/sparks.mp3" }, fx: [{ op: "trim", to: 0.9 }, { op: "hp", hz: 2500 }, { op: "lp", hz: 9000 }, { op: "env", pts: [[0, 0], [0.05, 1], [0.5, 0.6], [0.9, 0]] }, { op: "normalize", db: 0 }, { op: "gain", db: -11 }] },
    ],
    master: [{ op: "hp", hz: 50 }, { op: "highshelf", hz: 5000, db: -2 }, { op: "comp", threshold: -14, ratio: 2.5, attack: 0.004, release: 0.12 }, { op: "limit", ceiling: -1 }],
  },
  {
    id: "uiMove",
    brief: "A menu cursor moving between options in a polished cartoon kart racing game: a very short, soft, pleasant tick with a tiny musical tone. Tactile and premium, never harsh; heard constantly in the menus. No voice.",
    why: "27 Sept 2026 (Adam, 26 Sept: the menus 'look really cheap'). Judged alone: the shipped click 4/4 ('a dry, mechanical double-click similar to a computer mouse'), this 10/10 ('a very short, soft, slightly tonal plucky tick'); the second pair tied 10/10 and 10/10, so this one scored 10/10 in all three hearings where the shipped one swung 4 to 10 (and plays 4.4 dB under the common level: its spike hits the peak ceiling). A marimba G6 (the menus are in G major, the title song's key) with Kenney's softest tick in front. On the override: CLAP hears a drum, as it does any short tick.",
    layers: [
      { at: 0, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_F5_loud_01.wav" }, fx: [{ op: "pitch", st: 2.02 }, { op: "env", pts: [[0, 1], [0.041999999999999996, 0.55], [0.12, 0]] }, { op: "trim", to: 0.12 }, { op: "normalize", db: 0 }, { op: "gain", db: 0 }] }, // G6 marimba
      { at: 0, src: { pack: "kenney/kenney_interface-sounds/Audio/tick_001.ogg" }, fx: [{ op: "normalize", db: 0 }, { op: "gain", db: -16 }] },
    ],
    master: [{ op: "limit", ceiling: -1 }],
  },
  {
    id: "boostPad",
    brief: "The kart drives over a glowing boost pad in a polished cartoon kart racing game: an instant zappy charge and a rushing burst of air and flame as the kart shoots forward. Bright, exciting and clean, heard many times a race, under a second. No voice, nothing that sounds like a weapon.",
    why: "27 Sept 2026. Judged alone: the shipped take 5/4 ('a quick synthesized burst of air... a vacuum swoosh'), this 10/10 then 8/9 ('a quick, bright, ascending synthetic zap that suggests a burst of speed'). The rocket start's zing, the old tier-2 whoosh a tone up from its peak, the steam-vent flame under it: the drift boosts' family.",
    layers: [
      { at: 0, src: { git: "979e511", path: "public/audio/sfx/boostStart.mp3" }, fx: [{ op: "trim", to: 0.25 }, { op: "fade", out: 0.08 }, { op: "normalize", db: 0 }, { op: "gain", db: -4 }] },
      { src: { git: "979e511", path: "public/audio/sfx/boost2.mp3" }, fx: [{ op: "trim", from: 0.12 }, { op: "pitch", st: 1 }, { op: "fade", in: 0.004 }, { op: "env", pts: [[0, 1], [0.35, 0.6], [0.7, 0]] }, { op: "trim", to: 0.7 }, { op: "normalize", db: 0 }, { op: "gain", db: 0 }] },
      { src: { git: "979e511", path: "public/audio/sfx/steamVent.mp3" }, fx: [{ op: "pitch", st: -3 }, { op: "lp", hz: 6000 }, { op: "lowshelf", hz: 300, db: 4 }, { op: "env", pts: [[0, 1], [0.001, 1], [0.08, 0.8], [0.24, 0.3], [0.48, 0]] }, { op: "trim", to: 0.6 }, { op: "normalize", db: 0 }, { op: "gain", db: -5 }] },
    ],
    master: [{ op: "hp", hz: 50 }, { op: "peak", hz: 3000, db: 2, q: 0.8 }, { op: "comp", threshold: -14, ratio: 2.5, attack: 0.004, release: 0.12 }, { op: "limit", ceiling: -1 }],
  },
  {
    id: "spin",
    brief: "A kart is hit and spins out in a polished cartoon kart racing game: the bonk of the hit, then a playful cartoon spin-out: a tire screech winding down, air whirling round and a comic falling tune. Clearly comic, about a second. No voice, nothing like an animal.",
    why: "27 Sept 2026. Judged alone: the shipped take 1/2 ('a loud, continuous and realistic tire screeching', no bonk and nothing comic; the local ears heard its whistle as a horse neighing), this 10/10 then 9/9 ('a cartoon bonk followed by a falling slide-whistle-like synth tone and a wobbly spring sound'). The bonk, the drift squeal bent down 5 semitones as the kart slows, two swishes of air and a marimba run falling down the G major scale. Local ear: CLAP picks the intended spin-out (0.48) over a horse, a siren, a bird, a whistle; neutral likeness check: no famous game sound (1/10).",
    layers: [
      { at: 0, src: { pack: "kenney/kenney_impact-sounds/Audio/impactPunch_heavy_000.ogg" }, fx: [{ op: "normalize", db: 0 }, { op: "gain", db: -2 }] },
      { src: { git: "979e511", path: "public/audio/sfx/drift.mp3" }, fx: [{ op: "trim", from: 0.3, to: 1.4700000000000002 }, { op: "bend", st: [[0, 0], [0.9, -5]] }, { op: "env", pts: [[0, 0], [0.02, 1], [0.45, 0.7], [0.9, 0]] }, { op: "trim", to: 0.9 }, { op: "normalize", db: 0 }, { op: "gain", db: -3 }] },
      { at: 0.02, src: { git: "979e511", path: "public/audio/sfx/throw.mp3" }, fx: [{ op: "trim", from: 0.07 }, { op: "pitch", st: 0 }, { op: "pan", pos: -0.5 }, { op: "normalize", db: 0 }, { op: "gain", db: -6 }] },
      { at: 0.3, src: { git: "979e511", path: "public/audio/sfx/throw.mp3" }, fx: [{ op: "trim", from: 0.07 }, { op: "pitch", st: -3 }, { op: "pan", pos: 0.5 }, { op: "normalize", db: 0 }, { op: "gain", db: -9 }] },
      { at: 0.06, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_F5_loud_01.wav" }, fx: [{ op: "pitch", st: 2.02 }, { op: "env", pts: [[0, 1], [0.077, 0.55], [0.22, 0]] }, { op: "trim", to: 0.22 }, { op: "normalize", db: 0 }, { op: "gain", db: -4 }] }, // G6 marimba
      { at: 0.11, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_F5_loud_01.wav" }, fx: [{ op: "pitch", st: -0.98 }, { op: "env", pts: [[0, 1], [0.077, 0.55], [0.22, 0]] }, { op: "trim", to: 0.22 }, { op: "normalize", db: 0 }, { op: "gain", db: -4.4 }] }, // E6 marimba
      { at: 0.16, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_F5_loud_01.wav" }, fx: [{ op: "pitch", st: -2.98 }, { op: "env", pts: [[0, 1], [0.077, 0.55], [0.22, 0]] }, { op: "trim", to: 0.22 }, { op: "normalize", db: 0 }, { op: "gain", db: -4.8 }] }, // D6 marimba
      { at: 0.21000000000000002, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_B4_loud_01.wav" }, fx: [{ op: "pitch", st: 0 }, { op: "env", pts: [[0, 1], [0.077, 0.55], [0.22, 0]] }, { op: "trim", to: 0.22 }, { op: "normalize", db: 0 }, { op: "gain", db: -5.2 }] }, // B5 marimba
      { at: 0.26, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_G4_loud_01.wav" }, fx: [{ op: "pitch", st: 2.02 }, { op: "env", pts: [[0, 1], [0.077, 0.55], [0.22, 0]] }, { op: "trim", to: 0.22 }, { op: "normalize", db: 0 }, { op: "gain", db: -5.6 }] }, // A5 marimba
      { at: 0.31, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_G4_loud_01.wav" }, fx: [{ op: "pitch", st: 0.02 }, { op: "env", pts: [[0, 1], [0.077, 0.55], [0.22, 0]] }, { op: "trim", to: 0.22 }, { op: "normalize", db: 0 }, { op: "gain", db: -6 }] }, // G5 marimba
      { at: 0.36000000000000004, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_C4_loud_01.wav" }, fx: [{ op: "pitch", st: 1.96 }, { op: "env", pts: [[0, 1], [0.077, 0.55], [0.22, 0]] }, { op: "trim", to: 0.22 }, { op: "normalize", db: 0 }, { op: "gain", db: -6.4 }] }, // D5 marimba
      { at: 0.41000000000000003, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_C4_loud_01.wav" }, fx: [{ op: "pitch", st: -1.04 }, { op: "env", pts: [[0, 1], [0.077, 0.55], [0.22, 0]] }, { op: "trim", to: 0.22 }, { op: "normalize", db: 0 }, { op: "gain", db: -6.800000000000001 }] }, // B4 marimba
    ],
    master: [{ op: "reverb", seconds: 0.7, mix: 0.08, pre: 0.008, hp: 400, lp: 9000, damp: 0.6 }, { op: "limit", ceiling: -1 }],
  },
  {
    id: "koSafe",
    brief: "Knockout mode in a polished cartoon kart racing game: the player made the cut and goes through to the next round. A short, bright, triumphant success sting that feels like relief and a win, about two seconds. No voice.",
    why: "27 Sept 2026. Judged alone: the shipped take 4/3 ('a very short, ascending synthetic arcade jump'), this 10/10 twice ('a short, ascending, bright, twinkling chime melody ending on a sustained high note'). Marimba and xylophone climb the G major chord from its root over two octaves (a third first: no two-note rising fourth, the famous coin's figure) and ring out on a glockenspiel chord. The neutral likeness prompt flags every bright rising chime as a famous pickup (this one, the rejected variant that did start on a fourth, and the shipped item chime all came back 'a two-note chime' at 8/10, which none of them is), so the notes were checked by measurement instead. STING_SECONDS.koSafe 2.1 -> 2.3.",
    layers: [
      { at: 0, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_G2_loud_01.wav" }, fx: [{ op: "pitch", st: 12.05 }, { op: "env", pts: [[0, 1], [0.105, 0.55], [0.3, 0]] }, { op: "trim", to: 0.3 }, { op: "normalize", db: 0 }, { op: "gain", db: -2 }] }, // G4 marimba
      { at: 0.07, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_C4_loud_01.wav" }, fx: [{ op: "pitch", st: -1.04 }, { op: "env", pts: [[0, 1], [0.105, 0.55], [0.3, 0]] }, { op: "trim", to: 0.3 }, { op: "normalize", db: 0 }, { op: "gain", db: -2 }] }, // B4 marimba
      { at: 0.14, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_C4_loud_01.wav" }, fx: [{ op: "pitch", st: 1.96 }, { op: "env", pts: [[0, 1], [0.105, 0.55], [0.3, 0]] }, { op: "trim", to: 0.3 }, { op: "normalize", db: 0 }, { op: "gain", db: -2 }] }, // D5 marimba
      { at: 0.21, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_G4_loud_01.wav" }, fx: [{ op: "pitch", st: 0.02 }, { op: "env", pts: [[0, 1], [0.12249999999999998, 0.55], [0.35, 0]] }, { op: "trim", to: 0.35 }, { op: "normalize", db: 0 }, { op: "gain", db: -1 }] }, // G5 marimba
      { at: 0.28, src: { pack: "vsco/Xylo/Xylo_Medium_C5_ff_01_far.wav" }, fx: [{ op: "pitch", st: -1.15 }, { op: "env", pts: [[0, 1], [0.105, 0.55], [0.3, 0]] }, { op: "trim", to: 0.3 }, { op: "normalize", db: 0 }, { op: "gain", db: -2 }] }, // B5 xylophone
      { at: 0.35, src: { pack: "vsco/Xylo/Xylo_Medium_C5_ff_01_far.wav" }, fx: [{ op: "pitch", st: 1.85 }, { op: "env", pts: [[0, 1], [0.105, 0.55], [0.3, 0]] }, { op: "trim", to: 0.3 }, { op: "normalize", db: 0 }, { op: "gain", db: -2 }] }, // D6 xylophone
      { at: 0.42, src: { pack: "vsco/Xylo/Xylo_Medium_G5_ff_01_far.wav" }, fx: [{ op: "pitch", st: -0.16 }, { op: "env", pts: [[0, 1], [0.175, 0.55], [0.5, 0]] }, { op: "trim", to: 0.5 }, { op: "normalize", db: 0 }, { op: "gain", db: -1 }] }, // G6 xylophone
      { at: 0.52, src: { pack: "vsco/Glock/glock_medium_G5.wav" }, fx: [{ op: "pitch", st: -0.12 }, { op: "env", pts: [[0, 1], [0.48999999999999994, 0.55], [1.4, 0]] }, { op: "trim", to: 1.4 }, { op: "pan", pos: -0.3 }, { op: "normalize", db: 0 }, { op: "gain", db: -2 }] }, // G6 glockenspiel
      { at: 0.52, src: { pack: "vsco/Glock/glock_medium_G5.wav" }, fx: [{ op: "pitch", st: 3.88 }, { op: "env", pts: [[0, 1], [0.48999999999999994, 0.55], [1.4, 0]] }, { op: "trim", to: 1.4 }, { op: "pan", pos: 0.3 }, { op: "normalize", db: 0 }, { op: "gain", db: -3 }] }, // B6 glockenspiel
      { at: 0.52, src: { pack: "vsco/Glock/glock_medium_C6.wav" }, fx: [{ op: "pitch", st: 1.84 }, { op: "env", pts: [[0, 1], [0.48999999999999994, 0.55], [1.4, 0]] }, { op: "trim", to: 1.4 }, { op: "pan", pos: -0.1 }, { op: "normalize", db: 0 }, { op: "gain", db: -2 }] }, // D7 glockenspiel
      { at: 0.52, src: { pack: "vsco/Glock/glock_medium_G6.wav" }, fx: [{ op: "pitch", st: -0.16 }, { op: "env", pts: [[0, 1], [0.5249999999999999, 0.55], [1.5, 0]] }, { op: "trim", to: 1.5 }, { op: "pan", pos: 0.1 }, { op: "normalize", db: 0 }, { op: "gain", db: -4 }] }, // G7 glockenspiel
      { at: 0.52, src: { pack: "vsco/Marimba/Marimba_hit_Outrigger_G4_loud_01.wav" }, fx: [{ op: "pitch", st: 0.02 }, { op: "env", pts: [[0, 1], [0.27999999999999997, 0.55], [0.8, 0]] }, { op: "trim", to: 0.8 }, { op: "normalize", db: 0 }, { op: "gain", db: -4 }] }, // G5 marimba
    ],
    master: [{ op: "reverb", seconds: 1.2, mix: 0.2, pre: 0.008, hp: 400, lp: 9000, damp: 0.6 }, { op: "limit", ceiling: -1 }],
  },
  {
    id: "sparks",
    brief: "While drifting in a polished cartoon kart racing game, bright electric sparks spray from the wheels: a steady, crisp electric crackle and sizzle, a seamless loop under the engine. Electric, not like food frying. No voice.",
    why: "27 Sept 2026. The shipped loop reads as food frying to every ear (Pro judge 2/3 'food frying in hot oil'; CLAP 'frying bacon'; AST sizzle, frying). This one, judged alone: 9/9 ('a continuous, bright electric crackling and sizzling sound') then 6/4 ('slightly harsh... like static'): in on the defect rule (the shipped sound is heard as the wrong thing; the new one beats it by 2 or more on both scores on average and is heard as electric both times), flagged for a smoother take. A seeded crackle (sparse band-passed bursts), an arc's buzzing hiss and a little of the old loop, high-passed.",
    loop: 3,
    layers: [
      { src: { synth: "crackle", args: { seconds: 3.2, seed: 73, rate: 70, lo: 2500, hi: 11000, decay: 0.003, spread: 14, width: 0.7 } }, fx: [{ op: "hp", hz: 1800 }, { op: "normalize", db: 0 }, { op: "gain", db: 0 }] },
      { src: { synth: "noise", args: { seconds: 3.2, seed: 6, color: "white" } }, fx: [{ op: "bp", hz: 4500, q: 0.6 }, { op: "flutter", depth: 0.9, rate: 200, seed: 6 }, { op: "flutter", depth: 0.5, rate: 9, seed: 7 }, { op: "normalize", db: 0 }, { op: "gain", db: -8 }] },
      { at: 0, src: { git: "979e511", path: "public/audio/sfx/sparks.mp3" }, fx: [{ op: "repeat", to: 3.2 }, { op: "hp", hz: 1500 }, { op: "normalize", db: 0 }, { op: "gain", db: -12 }] },
    ],
    master: [{ op: "limit", ceiling: -1 }],
  },
  {
    id: "coin",
    brief: "The kart picks up a gear on the road (a chunky cartoon cog that tunes up the kart) in a polished cartoon kart racing game: a short, bright metallic clink or ratchet click, then a small rising sparkle. Mechanical and satisfying, heard often, never shrill. It must not sound like a coin being collected. No voice.",
    why: "27 Sept 2026 (Adam, 26 Sept: 'I don't think the game needs coins, because that's too much of a copy of Mario Kart': the collectible is a gear now). Against the gear brief the shipped coin scored 0/3 ('identical to a retro video game coin pickup'); this 9/9 then 5/4 ('a short, metallic clink followed by a subtle rising tone'; 'like a heavy wrench... with a brief resonant ring'). In on the defect rule, flagged for a lighter take. A tin clank (ringing on G5), three ratchet clicks, and two quiet xylophone notes, D7 grazing into G7 20 ms later, 15 dB under the clank; the neutral likeness check hears no famous game sound (1/10).",
    layers: [
      { at: 0, src: { pack: "kenney/kenney_impact-sounds/Audio/impactTin_medium_002.ogg" }, fx: [{ op: "pitch", st: 4 }, { op: "trim", to: 0.1 }, { op: "fade", out: 0.04 }, { op: "normalize", db: 0 }, { op: "gain", db: 0 }] },
      { at: 0.02, src: { pack: "kenney/kenney_ui-audio/Audio/switch12.ogg" }, fx: [{ op: "pitch", st: 0 }, { op: "hp", hz: 500 }, { op: "normalize", db: 0 }, { op: "gain", db: -2 }] },
      { at: 0.048, src: { pack: "kenney/kenney_ui-audio/Audio/switch13.ogg" }, fx: [{ op: "pitch", st: 1.5 }, { op: "hp", hz: 500 }, { op: "normalize", db: 0 }, { op: "gain", db: -2.7 }] },
      { at: 0.076, src: { pack: "kenney/kenney_ui-audio/Audio/switch14.ogg" }, fx: [{ op: "pitch", st: 3 }, { op: "hp", hz: 500 }, { op: "normalize", db: 0 }, { op: "gain", db: -3.4 }] },
      { at: 0.12, src: { pack: "vsco/Xylo/Xylo_Medium_C6_ff_01_far.wav" }, fx: [{ op: "pitch", st: 1.83 }, { op: "env", pts: [[0, 1], [0.041999999999999996, 0.55], [0.12, 0]] }, { op: "trim", to: 0.12 }, { op: "normalize", db: 0 }, { op: "gain", db: -15 }] }, // D7 xylophone
      { at: 0.14, src: { pack: "vsco/Xylo/Xylo_Medium_G6_ff_01_far.wav" }, fx: [{ op: "pitch", st: -0.2 }, { op: "env", pts: [[0, 1], [0.055999999999999994, 0.55], [0.16, 0]] }, { op: "trim", to: 0.16 }, { op: "normalize", db: 0 }, { op: "gain", db: -15 }] }, // G7 xylophone
    ],
    master: [{ op: "hp", hz: 200 }, { op: "reverb", seconds: 0.35, mix: 0.04, pre: 0.008, hp: 400, lp: 9000, damp: 0.6 }, { op: "trim", to: 0.38 }, { op: "fade", out: 0.15200000000000002 }, { op: "limit", ceiling: -1 }],
  },
  {
    id: "slam",
    brief: "The Pogo Spring kart slams down onto the road in a polished cartoon kart racing game and bumps the karts nearby: a huge, deep ground-pound boom with a short rumble, landing the instant it plays; big, heavy and fun. No voice, no grunt.",
    why: "27 Sept 2026. The shipped take has a human voice ('a male voice grunts loudly', 0/0, heard as a 'weee' on 25 Sept). This one, judged alone: 6/5 then 3/3 ('a deep, heavy... impact thud followed by a short bass rumble'; 'a short, dry, muffled thud'), no voice either time: in on the defect rule, flagged for a bigger take. Kenney's heavy punch, plank and wood impacts pitched down, a sub boom and the stomp take's rumble, saturated so the low end shows on small speakers.",
    layers: [
      { at: 0, src: { pack: "kenney/kenney_impact-sounds/Audio/impactPunch_heavy_004.ogg" }, fx: [{ op: "pitch", st: -3 }, { op: "normalize", db: 0 }, { op: "gain", db: 0 }] },
      { at: 0, src: { pack: "kenney/kenney_impact-sounds/Audio/impactPlank_medium_002.ogg" }, fx: [{ op: "pitch", st: -6 }, { op: "normalize", db: 0 }, { op: "gain", db: -2 }] },
      { at: 0, src: { pack: "kenney/kenney_impact-sounds/Audio/impactWood_heavy_000.ogg" }, fx: [{ op: "pitch", st: -4 }, { op: "normalize", db: 0 }, { op: "gain", db: -4 }] },
      { at: 0, src: { pack: "kenney/kenney_sci-fi-sounds/Audio/lowFrequency_explosion_001.ogg" }, fx: [{ op: "trim", from: 0.07 }, { op: "fade", in: 0.003 }, { op: "normalize", db: 0 }, { op: "gain", db: -3 }] },
      { at: 0.04, src: { git: "979e511", path: "public/audio/sfx/stomp.mp3" }, fx: [{ op: "trim", from: 0.2, to: 1.1 }, { op: "lp", hz: 2500 }, { op: "fade", in: 0.02, out: 0.35 }, { op: "normalize", db: 0 }, { op: "gain", db: -5 }] },
    ],
    master: [{ op: "hp", hz: 35 }, { op: "drive", amount: 1.6 }, { op: "comp", threshold: -18, ratio: 4, attack: 0.004, release: 0.18 }, { op: "trim", to: 1.05 }, { op: "fade", out: 0.42000000000000004 }, { op: "limit", ceiling: -1 }],
  },
  {
    id: "yetiThrow",
    brief: "A big friendly yeti heaves a giant snowball onto the road in a polished cartoon kart racing game: snow crunching as it winds up, then a heavy whoosh as the snowball flies. No voice, no grunt, nothing like a gunshot.",
    why: "27 Sept 2026. The shipped take has a human voice ('a clear human voice shouting YAH!', 1/0; 'Yeah!' on 25 Sept). This one, judged alone: 6/5 then 9/9 ('a rapid, crunchy winding-up sound followed by a heavy, clean whoosh'), no voice either time. Two snow crunches pitched down, then the slipstream take a minor third down as the snowball flies.",
    layers: [
      { at: 0, src: { pack: "kenney/kenney_impact-sounds/Audio/footstep_snow_000.ogg" }, fx: [{ op: "pitch", st: -3 }, { op: "normalize", db: 0 }, { op: "gain", db: -4 }] },
      { at: 0.14, src: { pack: "kenney/kenney_impact-sounds/Audio/footstep_snow_002.ogg" }, fx: [{ op: "pitch", st: -4 }, { op: "normalize", db: 0 }, { op: "gain", db: -5 }] },
      { at: 0.24, src: { git: "979e511", path: "public/audio/sfx/slipstream.mp3" }, fx: [{ op: "trim", from: 0.05 }, { op: "pitch", st: -3 }, { op: "fade", in: 0.03, out: 0.3 }, { op: "normalize", db: 0 }, { op: "gain", db: 0 }] },
    ],
    master: [{ op: "hp", hz: 60 }, { op: "trim", to: 1.3 }, { op: "fade", out: 0.52 }, { op: "limit", ceiling: -1 }],
  },
];

export const RECIPES: readonly Recipe[] = [
  ...BASE.filter((r) => !(r.id in APPROVED)),
  ...CANDIDATES.filter((r) => r.id in APPROVED).map((r) => ({ ...r, why: APPROVED[r.id] })),
];
