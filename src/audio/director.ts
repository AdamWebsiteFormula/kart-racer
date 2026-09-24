// Events → cues. Pure. The player's own events play at full level; other racers' item uses,
// hits and horns play only when near the listener, quieter with distance.
import type { KartEvent, Vec3 } from '../kart-controller/types.ts';
import type { ItemEvent } from '../items/types.ts';
import type { RaceEvent } from '../race-manager/types.ts';
import { AUDIO } from './constants.ts';
import type { Cue, MusicCue, SfxId } from './types.ts';

/** Where the ear is and which way it faces, plus where everyone else is. */
export interface Listener {
  playerId: string | null;
  position: Vec3;
  /** heading of the listener (radians, +Z forward); used for pan */
  heading: number;
  /** racerId → world position */
  positionOf(racerId: string): Vec3 | undefined;
}

/** Gain for a sound at distance d: 1 inside near, 0 beyond far, linear between, scaled by farGain. */
export function distanceGain(d: number): number {
  if (d <= AUDIO.nearMetres) return 1;
  if (d >= AUDIO.farMetres) return 0;
  return AUDIO.farGain * (1 - (d - AUDIO.nearMetres) / (AUDIO.farMetres - AUDIO.nearMetres));
}

function spatial(l: Listener, racerId: string): { gain: number; pan: number } {
  if (racerId === l.playerId) return { gain: 1, pan: 0 };
  const p = l.positionOf(racerId);
  if (!p) return { gain: 0, pan: 0 };
  const dx = p[0] - l.position[0], dz = p[2] - l.position[2];
  const d = Math.hypot(dx, dz);
  // screen right for a camera looking along forward (sin h, 0, cos h) is forward × up =
  // (−cos h, 0, sin h); at heading 0 world +x is on the LEFT of the screen
  const right = -dx * Math.cos(l.heading) + dz * Math.sin(l.heading);
  return { gain: AUDIO.otherGain * distanceGain(d), pan: d > 0.01 ? Math.max(-1, Math.min(1, right / Math.max(d, 1))) : 0 };
}

/** The sound each course creature makes when it starts doing something (kind:action). */
const CREATURE_SOUND: Readonly<Record<string, SfxId>> = Object.freeze({
  'rumblesaur:rear': 'roar', 'rumblesaur:stomp': 'stomp',
  'yeti:windUp': 'yetiThrow', 'yeti:idle': 'snowThud',
  'kraken:warn': 'krakenRise', 'kraken:slam': 'krakenSlam',
  'crab:wait': 'crabClack',
  'goose:charge': 'honk', 'goose:turn': 'honk',
  'whale:warn': 'whaleSong', 'whale:slap': 'tailSlap',
});

const ITEM_USE: Readonly<Record<string, SfxId>> = Object.freeze({
  beachBall: 'throw', homingKite: 'kite', oilCan: 'drop', decoyBalloon: 'drop',
  airHorn: 'airHorn', bubble: 'shieldUp', fizzPop: 'fizz', tripleFizz: 'fizz', fogBank: 'fog',
  strikeBall: 'strikeRoll', grappleAnchor: 'anchor', windUpMouse: 'mouse',
  // pogoSpring: its boing and slam come from springLaunch and springSlam
});

function kartCue(e: KartEvent): SfxId | null {
  switch (e.type) {
    case 'hop': return 'hop';
    case 'driftTierUp': return 'tierUp';
    case 'boostStart':
      switch (e.source) {
        case 'drift': return e.multiplier > 0 && e.seconds > 2 ? 'boost3' : e.seconds > 1 ? 'boost2' : 'boost1';
        case 'pad': return 'boostPad';
        case 'trick': return 'boostTrick';
        case 'start': return 'boostStart';
        case 'item': return null; // the item cue already played
        default: return null;
      }
    case 'landed': return 'land';
    case 'loop': return e.phase === 'start' ? 'loop' : null;
    case 'wall': return 'wall';
    case 'bump': return 'bump';
    case 'hit': return e.spun ? 'spin' : 'hit';
    default: return null;
  }
}

/** Cues for one sim tick. `out` is reused by the caller to avoid allocation. */
export function direct(race: readonly RaceEvent[], items: readonly ItemEvent[], l: Listener, out: Cue[] = [], music: MusicCue[] = []): { cues: Cue[]; music: MusicCue[] } {
  out.length = 0;
  music.length = 0;
  const me = l.playerId;
  const push = (sfx: SfxId, racerId: string | null, gain = 1) => {
    const sp = racerId ? spatial(l, racerId) : { gain: 1, pan: 0 };
    const g = sp.gain * gain;
    if (g > 0.01) out.push({ sfx, gain: g, pan: sp.pan });
  };
  for (const e of race) {
    switch (e.type) {
      case 'countdown': push('count', null); if (e.stepsLeft === 3) music.push({ type: 'drums', on: false }); break;
      case 'go': push('go', null); music.push({ type: 'drums', on: true }); break;
      // the player's own last lap, not the leader's (the shift): the fanfare, and the song pauses
      // for it and comes back faster (SongPlayer.lift), so the two stay one moment
      case 'lap':
        if (e.racerId !== me) break;
        push(e.isFinal ? 'finalLap' : 'lap', null);
        if (e.isFinal) music.push({ type: 'finalLap' });
        break;
      case 'finish': if (e.racerId === me) push(e.rank <= 3 && !e.dnf ? 'finish' : 'finishLow', null); break;
      case 'positionChange':
        // only the player's own place changes, and only once racing has settled (rank 0 is the grid)
        if (e.racerId === me) push(e.rank < (lastRank.get(me) ?? e.rank) ? 'gainPlace' : 'losePlace', null, 0.6);
        if (e.racerId === me) lastRank.set(me, e.rank);
        break;
      case 'wrongWay': if (e.racerId === me && e.on) push('wrongWay', null); break;
      case 'respawn': if (e.racerId === me) push('respawn', null); break;
      case 'pickup': push('balloon', e.racerId); break;
      case 'rescue': push(e.phase === 'start' ? 'claw' : 'clawDrop', e.racerId); break;
      case 'vent': {
        // heard from where it stands, like a creature
        const id: SfxId = e.phase === 'warn' ? 'ventWarn' : e.asset === 'steam' ? 'steamVent' : 'geyser';
        const dx = e.position[0] - l.position[0], dz = e.position[2] - l.position[2], d = Math.hypot(dx, dz);
        const g = distanceGain(d);
        const right = -dx * Math.cos(l.heading) + dz * Math.sin(l.heading);
        if (g > 0.01) out.push({ sfx: id, gain: g, pan: d > 0.01 ? Math.max(-1, Math.min(1, right / Math.max(d, 1))) : 0 });
        break;
      }
      case 'creature': {
        const id = CREATURE_SOUND[`${e.kind}:${e.action}`];
        if (!id) break;
        // a creature is big: heard from twice as far, and never quieter than the other racers
        const dx = e.position[0] - l.position[0], dz = e.position[2] - l.position[2], d = Math.hypot(dx, dz);
        const g = distanceGain(d / 2);
        const right = -dx * Math.cos(l.heading) + dz * Math.sin(l.heading);
        if (g > 0.01) out.push({ sfx: id, gain: g, pan: d > 0.01 ? Math.max(-1, Math.min(1, right / Math.max(d, 1))) : 0 });
        break;
      }
      case 'coin': if (e.racerId === me) push('coin', null); break;
      case 'kart': {
        if (e.event.type === 'hit' && e.racerId === me) music.push({ type: 'duck' });
        const id = kartCue(e.event);
        // other racers' drift and hop noise is clutter: only walls, bumps and hits carry
        if (id && (e.racerId === me || id === 'wall' || id === 'bump' || id === 'hit' || id === 'spin')) push(id, e.racerId);
        if (e.event.type === 'hit') { const y = yelpFor(e.racerId); if (y) push(y, e.racerId, 0.8); }
        break;
      }
      default: break;
    }
  }
  for (const e of items) {
    switch (e.type) {
      case 'itemReady': if (e.racerId === me) push('itemReady', null); break;
      case 'itemUsed': { const id = ITEM_USE[e.itemId]; if (id) push(id, e.racerId); break; }
      case 'hit':
        push(e.spun ? 'spin' : 'hit', e.racerId);
        { const y = yelpFor(e.racerId); if (y) push(y, e.racerId, 0.8); }
        if (e.racerId === me) music.push({ type: 'duck' });
        break;
      case 'shieldPop': push('shieldPop', e.racerId); break;
      case 'springLaunch': push('boing', e.racerId); break;
      case 'springSlam': push('slam', e.racerId); break;
      case 'burst': push('strike', e.racerId); break;
      case 'tetherEnd': if (e.slingshot) push('slingshot', e.racerId); break;
      case 'trailBlock': push('blocked', e.racerId); break;
      case 'trailStart': if (e.racerId === me) push('trail', null); break;
      case 'itemRefused': if (e.racerId === me && (e.reason === 'noTarget' || e.reason === 'inFlight')) push('denied', null); break;
      case 'projectilePop': case 'groundPop': break;
      case 'fog': if (e.victims.includes(me ?? '')) push('fog', null); break;
      default: break;
    }
  }
  return { cues: out, music };
}

/** The player's last announced rank, for gain/lose place. Reset per race with `resetDirector`. */
const lastRank = new Map<string | null, number>();
export function resetDirector(): void { lastRank.clear(); }

/** The horn for a racer, or a generic one. */
const RACERS: readonly string[] = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];

export function hornFor(racerId: string): SfxId {
  return (RACERS.includes(racerId) ? `horn:${racerId}` : 'horn:pip') as SfxId;
}

/** The racer's own hit yelp (design §11), or null for anyone not in the cast. */
export function yelpFor(racerId: string): SfxId | null {
  return RACERS.includes(racerId) ? (`yelp:${racerId}` as SfxId) : null;
}
