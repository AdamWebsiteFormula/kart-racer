// Candidates for the race-flow and menu sounds (29 Sept 2026: Adam, "The existing sounds on the game are super cheap.
// I need a complete sound effects overhaul"): the countdown, lap, place changes, item roulette and reveal, the balloon,
// the gear pickup, respawn, wrong way and the menu clicks. From designed UI libraries in the Sonniss GDC 2026 bundle
// (Cinematic Sound Design's UI sets, CB Sounddesign's Organic UI, Epic Stock Media's Board Game and Fantasy Game 2,
// SoundBits: free for games, no credit), Rescopic Sound's Parallax pings and 99Sounds' 99 Sound Effects (99Sounds
// licence). The fanfares (GO's chord, final lap, finish, knockout) wait for the music lab. The raw files live in the
// private repo AdamWebsiteFormula/rascal-sfx-source; only the finished mixes ship. Each keeps its sound's length.
//   RASCAL_SFX_PACKS=/home/user/rascal-sfx-source/packs python3 scripts/sfx/build.py --recipes=scripts/sfx/cands-ui.ts --out=<dir>
import { cap, lvl, OUT } from './parts.ts';
import type { Fx, Layer, Recipe } from './types.ts';

const S2 = 'Sonniss.com-GDC2026-GameAudioBundle2of5';
/** Cinematic Sound Design's UI libraries (Sonniss GDC 2026) */
const CSD = (lib: string, f: string) => ({ pack: `${S2}/Cinematic Sound Design - ${lib}/${f}.wav` });
const ESM = (lib: string, f: string) => ({ pack: `${S2}/Epic Stock Media - ${lib}/${f}.wav` });
const CB = (f: string) => ({ pack: `${S2}/CB_Sounddesign - Applicable Sounds - Organic UI and Building Games SFX/${f}_CB Sounddesign_APPlicable Sounds.wav` });
const PING = (n: string) => ({ pack: `99Sounds_Sci-Fi_Sound_Effects/99Sounds Sci-Fi Sound Effects/Rescopic Sound - Parallax (99Sounds Version)/Audio Files/Pings/SCIMisc_Ping ${n}_RSCPC_PX.wav` });
const NN = (f: string) => ({ pack: `99_Sound_Effects/99 Sound Effects/WAV/${f}.wav` });

const L = (src: { pack: string }, db: number, len: number, fx: Fx[] = [], at = 0): Layer => ({ at, src, fx: [...fx, ...cap(len), ...lvl(db)] });
const MASTER: Fx[] = [{ op: 'hp', hz: 60 }, OUT];
const r = (id: string, brief: string, layers: Layer[]): Recipe => ({ id, brief, why: 'candidate, 29 Sept 2026', layers, master: MASTER });

export const RECIPES: readonly Recipe[] = [
  r('count', 'One countdown beep at the start of a race: a clean, rounded, premium electronic ping with a short tail.', [
    L(PING('10'), 0, 0.6),
  ]),
  r('go', 'The GO signal: the countdown ping an octave up, bright and ringing, with a sparkling shimmer on top.', [
    L(PING('10'), 0, 1.3, [{ op: 'pitch', st: 12 }]),
    L(PING('21'), -8, 1.2),
  ]),
  r('lap', 'A lap is done: a quick, happy run of bright plucked notes, under a second.', [
    L(CSD('User Interface', 'Interface Plucks Happy'), 0, 0.8),
  ]),
  r('gainPlace', 'The player moves up a place: a quick, bright kalimba run going up, very short.', [
    L(CB('UIMisc_Kalimba 3 Up'), 0, 0.48),
  ]),
  r('losePlace', 'The player drops a place: a quick, soft electronic ping sliding down, very short.', [
    L(CSD('System & UI Feedback Elements', 'Interface Sci-Fi Ping Down'), 0, 0.48),
  ]),
  r('itemReady', 'The item roulette stops on a prize: a quick, glittering arpeggio of bright notes going up, about a second.', [
    L(CSD('User Interface', 'Button Arp Twinkle'), 0, 1.0),
  ]),
  r('rouletteTick', 'One tick of the item roulette: a tiny, dry, bright wooden tock, heard in quick runs.', [
    L(ESM('Board Game - Sound Set Kit for Tabletop and Digital Games', 'GAMEBoard_Game Play Piece Action Organic Connect Dots Fall Bounce 04_ESM_BG'), 0, 0.2),
  ]),
  // (30 Sept 2026: the pickup is an energy core, not a balloon: Adam, "a cool sound when a character drives over it")
  r('balloon', 'The kart drives through a floating energy core: a bright futuristic energy burst, a crystal shimmer and a rising power-up sparkle, under a second. Never a rubber pop.', [
    L(ESM('Anime Game', 'DSGNStngr_Power Up Bright Positive Successful Light Saturation Crash Shimmer 05_ESM_AG'), 0, 0.9),
    L({ pack: '99Sounds_Sci-Fi_Sound_Effects/99Sounds Sci-Fi Sound Effects/Rescopic Sound - Sci-Fi Energy Weapons (99Sounds Version)/Audio Files/Source Sounds/Whoosh/WHSH_Whoosh Energy Fast 11_RSCPC_SFEW.wav' }, -9, 0.4),
    L(PING('21'), -12, 0.6, [], 0.04),
  ]),
  r('coin', 'The kart picks up a gear: a quick, futuristic collect burst with a metallic clink, short and satisfying, never like a coin.', [
    L(ESM('Fantasy Game 2 - Sound Kit for Enchanted Realms', 'UIAlert_Collect Scifi Futuristic Electronic Bass Burst Sweep Heavy 04_ESM_FG2'), 0, 0.3),
    L(ESM('HD Game Materials', 'METLImpt_Metal Old File Impact Tap Against Tire Iron Metallic Hit 01_ESM_HDGM'), -8, 0.3, [{ op: 'trim', from: 0.12 }]),
  ]),
  r('respawn', 'The kart is placed back on the track: a magical rising shimmer, about a second.', [
    L(NN('Retro - Magic Respawn'), 0, 1.2, [{ op: 'trim', from: 0.08 }]),
  ]),
  r('wrongWay', 'Driving the wrong way: a low, soft, two-beat warning, friendly and not scary, about a second.', [
    L(CSD('System & UI Feedback Elements', 'Interface Deny Low Fat Dark'), 0, 0.45),
    L(CSD('System & UI Feedback Elements', 'Interface Deny Low Fat Dark'), 0, 0.6, [], 0.5),
  ]),
  r('uiMove', 'The menu cursor moves: a very short, soft, crisp pop, heard constantly and never harsh.', [
    L(CSD('Interface & Infographics', 'Interface Pop High Short'), 0, 0.22),
  ]),
  r('uiConfirm', 'A menu choice is confirmed: a bright, glassy snap, short and premium.', [
    L(CSD('Interface & Infographics', 'Interface Accept Glassy Snap'), 0, 0.44),
  ]),
  r('uiBack', 'Back out of a menu: the confirm snap a fourth lower, short, clean and clearly heard.', [
    L(CSD('Interface & Infographics', 'Interface Accept Glassy Snap'), 0, 0.48, [{ op: 'pitch', st: -5 }]),
  ]),
  r('denied', 'A choice that is not allowed: a soft, muted, low negative blip, friendly and short.', [
    L(CSD('UI Interaction Elements', 'Deny Muted'), 0, 0.45),
  ]),
];
