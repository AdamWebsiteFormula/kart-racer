// Candidates for the new item set's sounds (29 Sept 2026: Adam, "The weapons/powers are all still the old corny ones";
// the 13 items are sci-fi now: Laser Blaster, Homing Rocket, Oil Slick, Decoy Mine, Shockwave, Energy Shield, Nitro,
// Triple Nitro, EMP Blast, Jet Mode, Jump Jets, Tractor Beam, Seeker Drone). Built from free libraries Adam downloaded:
// 99Sounds Sci-Fi Sound Effects (Rescopic Sound's Sci-Fi Energy Weapons and Parallax, 99Sounds licence: games OK, no
// attribution, raw files not redistributed), 99Sounds Electromagnetic Fields, Lentikula's Basic Spell Impacts (CC0).
// The raw files live in the private repo AdamWebsiteFormula/rascal-sfx-source (RASCAL_SFX_PACKS=<its packs folder>);
// only the finished mixes ship. Each keeps the length of the sound it replaces (the ids and their timing are unchanged).
//   RASCAL_SFX_PACKS=/home/user/rascal-sfx-source/packs python3 scripts/sfx/build.py --recipes=scripts/sfx/cands-items.ts --out=<dir>
import { cap, lvl, OUT } from './parts.ts';
import type { Fx, Layer, Recipe } from './types.ts';

const SCI = '99Sounds_Sci-Fi_Sound_Effects/99Sounds Sci-Fi Sound Effects';
/** Rescopic Sound, Sci-Fi Energy Weapons (99Sounds version) */
const SF = (p: string) => ({ pack: `${SCI}/Rescopic Sound - Sci-Fi Energy Weapons (99Sounds Version)/Audio Files/${p}` });
/** Rescopic Sound, Parallax (99Sounds version) */
const PX = (p: string) => ({ pack: `${SCI}/Rescopic Sound - Parallax (99Sounds Version)/Audio Files/${p}` });
/** Lentikula, Basic Spell Impacts (CC0) */
const LK = (p: string) => ({ pack: `Basic_Spell_Impacts/${p}` });
/** 99Sounds, Electromagnetic Fields */
const EM = (f: string) => ({ pack: `99Sounds_Electromagnetic_Fields/99Sounds Electromagnetic Fields/Sounds/${f}` });

const shot = (n: string) => SF(`Designed Sounds/Shot/SCIWeap_Shot ${n}_RSCPC_SFEW.wav`);
const L = (src: { pack: string }, db: number, fx: Fx[] = [], at = 0): Layer => ({ at, src, fx: [...fx, ...lvl(db)] });
/** the summed layers: rumble off, a gentle glue, a peak ceiling */
const MASTER: Fx[] = [{ op: 'hp', hz: 35 }, { op: 'comp', threshold: -16, ratio: 2.5, attack: 0.003, release: 0.15 }, OUT];
const r = (id: string, brief: string, layers: Layer[], master: Fx[] = MASTER): Recipe => ({ id, brief, why: 'candidate, 29 Sept 2026', layers, master });

export const RECIPES: readonly Recipe[] = [
  r('throw', 'The Laser Blaster fires: a bright, punchy sci-fi energy bolt shoots from the kart, about half a second. Cool, not a real gun.', [
    L(shot('Pulse LS 02'), 0, cap(0.6)),
    L(shot('Plasma KU 04'), -6, [{ op: 'lp', hz: 9000 }, ...cap(0.45)]),
  ]),
  r('bounce', 'A laser bolt ricochets off the road edge: a quick bright zing, under half a second.', [
    L(shot('Pulse TM 02'), 0, [{ op: 'pitch', st: 4 }, ...cap(0.42)]),
    L(PX('Zaps/SCIMisc_Zap Short 02_RSCPC_PX.wav'), -9, cap(0.3)),
  ]),
  r('pop', 'A laser bolt, rocket, drone, mine or slick fizzles out: a small energy pop and crackle, under half a second.', [
    L(PX('Hits/DSGNSynth_Hit Small Tight 19_RSCPC_PX.wav'), 0, cap(0.45)),
    L(PX('Zaps/SCIMisc_Zap Short 20_RSCPC_PX.wav'), -9, cap(0.3)),
  ]),
  r('kite', 'The Homing Rocket launches: an ignition thump and a rushing energy rocket firing away after the kart ahead, about 1.3 seconds.', [
    L(shot('Plasma BF 04'), 0, cap(1.28)),
    L(SF('Source Sounds/Whoosh/WHSH_Whoosh Energy Fast 11_RSCPC_SFEW.wav'), -4, [{ op: 'trim', from: 0.3 }, ...cap(1.2)], 0.05),
    L(PX('Hits/DSGNSynth_Hit Large Tight 16_RSCPC_PX.wav'), -8, [{ op: 'lp', hz: 2500 }, ...cap(0.5)]),
  ]),
  r('drop', 'The Oil Slick canister (or a Decoy Mine) is dropped on the road behind the kart: a solid mechanical clunk and clamp, about half a second.', [
    L(SF('Source Sounds/Mech Processed/SCIMech_Mech Processed Plastic 21_RSCPC_SFEW.wav'), 0, [{ op: 'lp', hz: 8000 }, ...cap(0.6)]),
    L(SF('Source Sounds/Mech Processed/SCIMech_Mech Processed Metal 25_RSCPC_SFEW.wav'), -7, [{ op: 'lp', hz: 6000 }, ...cap(0.5)]),
  ]),
  r('airHorn', 'The Shockwave: a powerful sci-fi energy pulse blasts out in a ring around the kart, knocking nearby karts away; big, about 1.2 seconds.', [
    L(PX('Blasts/DSGNBram_Blast 03_RSCPC_PX.wav'), 0, [{ op: 'trim', from: 0.3 }, { op: 'fade', in: 0.004 }, ...cap(1.2)]),
    L(PX('Hits/DSGNSynth_Hit Large Extended 02_RSCPC_PX.wav'), -4, cap(1.1)),
    L(PX('Swishes/SWSH_Swish Fused Large 24_RSCPC_PX.wav'), -9, [{ op: 'trim', from: 0.15 }, ...cap(0.8)]),
  ]),
  r('shieldUp', 'The Energy Shield switches on around the kart: a rising force-field power-up with a bright shimmer, about a second.', [
    L(SF('Source Sounds/Charge Up/DSGNRise_Charge Up Fused 26_RSCPC_SFEW.wav'), 0, cap(1.0)),
    L(PX('Pings/SCIMisc_Ping 21_RSCPC_PX.wav'), -11, cap(0.7), 0.3),
  ]),
  r('shieldPop', 'The Energy Shield absorbs a hit and shatters: an energy impact breaking into glassy crystal shards, under a second.', [
    L(LK('Ice Spell Impacts/Ice Spell Impact 3.wav'), 0, [{ op: 'trim', from: 0.44 }, { op: 'fade', in: 0.004 }, ...cap(0.8)]),
    L(PX('Hits/DSGNSynth_Hit Small Tight 02_RSCPC_PX.wav'), -4, cap(0.6)),
  ]),
  r('shieldEnd', 'The Energy Shield runs out and powers down: a short falling force-field fade, under a second, quiet.', [
    L(SF('Source Sounds/Charge Up/DSGNRise_Charge Up Fused 26_RSCPC_SFEW.wav'), 0, [{ op: 'trim', from: 0.1, to: 0.9 }, { op: 'reverse' }, { op: 'fade', in: 0.02 }, ...cap(0.8)]),
    L(SF('Source Sounds/Robotic Glitch/SCIMisc_Robotic Glitch Short 09_RSCPC_SFEW.wav'), -13, cap(0.5), 0.2),
  ]),
  r('fizz', 'Nitro fires: a canister cracks and a blue-flame turbo boost roars the kart forward, about 1.2 seconds.', [
    L(SF('Source Sounds/Whoosh/WHSH_Whoosh Energy Fast 11_RSCPC_SFEW.wav'), 0, [{ op: 'trim', from: 0.3 }, { op: 'fade', in: 0.01 }, ...cap(1.2)]),
    L(shot('Plasma BF 02'), -6, [{ op: 'lp', hz: 5000 }, ...cap(0.8)]),
    L(SF('Source Sounds/Mech Processed/SCIMech_Mech Processed Metal 25_RSCPC_SFEW.wav'), -12, cap(0.25)),
  ]),
  r('fog', 'The EMP Blast: an electromagnetic pulse crackles over the karts ahead, electric discharge and static, about 1.5 seconds.', [
    L(LK('Lightning Spell Impacts/Lightning Spell Impact 3.wav'), 0, [{ op: 'trim', from: 0.45 }, { op: 'fade', in: 0.004 }, ...cap(1.48)]),
    L(PX('Zaps/SCIMisc_Zap Long 12_RSCPC_PX.wav'), -4, cap(1.4)),
    L(EM('Electromagnetic Fields, Humming, Buzzing, 03.wav'), -12, cap(1.4)),
    L(SF('Source Sounds/Robotic Glitch/SCIMisc_Robotic Glitch Short 09_RSCPC_SFEW.wav'), -9, cap(0.8), 0.2),
  ]),
  r('strikeRoll', 'Jet Mode: the kart transforms, wings unfolding with a mechanical morph, and a jet engine spools up, ignites and roars through the flight, about 5 seconds.', [
    L(SF('Source Sounds/Robotic Morph/SCIMisc_Robotic Morph Medium Large 45_RSCPC_SFEW.wav'), -3, cap(2.0)),
    L(SF('Source Sounds/Charge Up/DSGNRise_Charge Up Processed Plasma 18_RSCPC_SFEW.wav'), -6, [{ op: 'trim', from: 0.6 }, ...cap(2.0)]),
    L(SF('Designed Sounds/Flyby/SCIWeap_Flyby Plasma N 01_RSCPC_SFEW.wav'), -2, [{ op: 'trim', from: 1.6 }, { op: 'fade', in: 0.15 }, ...cap(1.2)], 0.8),
    // a jet's roar through the whole 5 s flight (Adam, 30 Sept 2026: "an airplane sound flying through the sky")
    L({ pack: 'Sonniss.com-GDC2026-GameAudioBundle1of5__1_/344 Audio - Air Designed/AEROJet_Blast Off Clean_344 Audio_Air Designed.wav' }, -3, [{ op: 'trim', from: 3.4 }, { op: 'fade', in: 0.4 }, ...cap(4.6)], 0.5),
  ]),
  r('strike', 'Jet Mode ends in a sonic boom that knocks the karts around it: a huge deep blast and air crack, about 1.8 seconds.', [
    L(PX('Blasts/DSGNBram_Blast 12_RSCPC_PX.wav'), 0, [{ op: 'trim', from: 0.2 }, { op: 'fade', in: 0.004 }, ...cap(1.76)]),
    L(PX('Hits/DSGNSynth_Hit Large Extended 33_RSCPC_PX.wav'), -4, cap(1.7)),
    L(PX('Whooshes/WHSH_Whoosh Crisp Large 05_RSCPC_PX.wav'), -9, [{ op: 'trim', from: 1.15 }, { op: 'lp', hz: 7000 }, ...cap(1.0)]),
  ]),
  r('boing', 'The Jump Jets fire: twin thrusters blast the kart up into the air, a punchy thrust and a rising rush, about a second.', [
    L(shot('Plasma BF 04'), 0, [{ op: 'pitch', st: -5 }, ...cap(1.0)]),
    L(SF('Source Sounds/Whoosh/WHSH_Whoosh Virtual Fast 07_RSCPC_SFEW.wav'), -6, [{ op: 'trim', from: 0.4 }, ...cap(0.8)]),
  ]),
  r('slam', 'The Jump Jets dive: the kart slams down onto the road and sends out a heavy shock, a deep impact, about a second.', [
    L(PX('Hits/DSGNSynth_Hit Large Tight 12_RSCPC_PX.wav'), 0, cap(1.1)),
    L(PX('Blasts/DSGNBram_Blast 03_RSCPC_PX.wav'), -4, [{ op: 'trim', from: 0.3 }, { op: 'pitch', st: -3 }, { op: 'lp', hz: 4000 }, { op: 'fade', in: 0.004 }, ...cap(1.15)]),
  ]),
  r('anchor', 'The Tractor Beam fires and locks on to the kart ahead: a charging energy beam with a lock-on ping, about a second.', [
    L(SF('Designed Sounds/Reload/SCIWeap_Reload Plasma S 01_RSCPC_SFEW.wav'), -2, cap(1.08)),
    L(PX('Zaps/SCIMisc_Zap Long 10_RSCPC_PX.wav'), -6, cap(1.0)),
    L(PX('Pings/SCIMisc_Ping 10_RSCPC_PX.wav'), -10, cap(0.6)),
  ]),
  r('slingshot', 'The Tractor Beam lets go and slingshots the kart past: a fast rising whoosh, under a second.', [
    L(SF('Source Sounds/Whoosh/WHSH_Whoosh Virtual Fast 04_RSCPC_SFEW.wav'), 0, [{ op: 'trim', from: 0.45 }, ...cap(0.8)]),
    L(PX('Swishes/SWSH_Swish Crisp Large 16_RSCPC_PX.wav'), -4, [{ op: 'trim', from: 0.3 }, ...cap(0.7)]),
  ]),
  r('mouse', 'The Seeker Drone deploys and zips off along the road: a small robotic whir and a quick buzzing takeoff, about 1.2 seconds.', [
    L(SF('Source Sounds/Robotic Morph/SCIMisc_Robotic Morph Short Large 16_RSCPC_SFEW.wav'), 0, cap(1.1)),
    L(PX('Whooshes/WHSH_Whoosh Fused Small 02_RSCPC_PX.wav'), -7, [{ op: 'trim', from: 0.45 }, ...cap(1.0)], 0.25),
    L(PX('Movements/SCIMisc_Movement 15_RSCPC_PX.wav'), -12, cap(1.2)),
  ]),
  r('blocked', 'A trailed item blocks a shot from behind: a short energy deflect, under a second.', [
    L(PX('Hits/DSGNSynth_Hit Small Tight 02_RSCPC_PX.wav'), 0, cap(0.6)),
    L(PX('Zaps/SCIMisc_Zap Short 20_RSCPC_PX.wav'), -7, cap(0.35)),
  ]),
  r('trail', 'An item snaps into place trailing behind the kart: a small precise mechanical click, under half a second.', [
    L(SF('Designed Sounds/Reload/SCIWeap_Reload Compact O 03_RSCPC_SFEW.wav'), 0, [{ op: 'trim', from: 0.78 }, { op: 'fade', in: 0.003 }, ...cap(0.48)]),
  ]),
  r('hitConfirm', 'The player\'s shot hits a rival far away: a satisfying bright confirm ping over a small impact, under a second.', [
    L(PX('Pings/SCIMisc_Ping 10_RSCPC_PX.wav'), 0, cap(0.6)),
    L(PX('Hits/DSGNSynth_Hit Small Tight 19_RSCPC_PX.wav'), -6, cap(0.5)),
  ]),
];
