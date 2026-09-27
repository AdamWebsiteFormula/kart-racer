// A trick off any real air (Adam, 26 Sept 2026: "when you go over a jump, or you hit something that
// makes you go a little bit airborne, and you hit the space bar to try to get a boost, it should allow
// you to do a bit of a boost"). As in Mario Kart World: a trick off anything the course throws you off
// ("off of any jump", "only when you gain height from an obstacle in the environment", never "from a
// normal low jump": gamerant), and a hop takes the road's climb, so a hop along any steady slope is the
// flat hop and never trick air (drift.ts canTrick, ground.ts realAir and takeOffLine).
import { describe, expect, it } from 'vitest';
import { makeConstants } from './constants.ts';
import { canTrick } from './drift.ts';
import { SIM_DT, stepKart } from './step.ts';
import { createKartState, headingOf, NEUTRAL_INPUT, type KartEvent, type KartState, type TrackJump, type TrackQuery } from './types.ts';
import { makeOval } from './__tests__/oval-stub.ts';

const c = makeConstants('medium', 150);
const V = c.topSpeed;
const STRAIGHT = 800;
const go = { ...NEUTRAL_INPUT, throttle: 1 };

const LENGTH = 2 * STRAIGHT + 2 * Math.PI * 40;

/** A long first straight whose height is `h(metres along it)`; level past it. */
function road(h: (m: number) => number, jumps: TrackJump[] = []) {
  return makeOval({ straight: STRAIGHT, radius: 40, halfWidth: 10, jumps, heightAt: (t) => h(Math.min(t * LENGTH, STRAIGHT)) });
}

/** A kart on the ground `m` metres along the straight, at full speed down it. */
function kartAt(track: ReturnType<typeof makeOval>, m: number): KartState {
  const t = m / track.length;
  const { p, tan } = track.centre(t);
  const s = createKartState({ racerId: 'x', position: [p[0], track.sample(t, 0).groundY, p[2]], heading: headingOf(tan), t });
  s.speed = V;
  return s;
}

interface Flight { from: number; to: number; seconds: number; real: boolean; tricks: number; trickBoost: boolean; peak: number }

/** Drives `ticks` ticks; `drift(i, s)` holds the button. Every flight (take-off to landing), and all events. */
function drive(track: TrackQuery, s: KartState, ticks: number, drift: (i: number, s: KartState) => boolean, steer = 0) {
  const flights: Flight[] = [];
  const all: KartEvent[] = [];
  let cur: Flight | undefined;
  for (let i = 0; i < ticks; i++) {
    const ev = stepKart(s, { ...go, steer, drift: drift(i, s) }, track, c, SIM_DT);
    all.push(...ev);
    if (!s.grounded && !cur) cur = { from: i, to: -1, seconds: 0, real: false, tricks: 0, trickBoost: false, peak: 0 };
    if (cur) {
      cur.tricks += ev.filter((e) => e.type === 'trick').length;
      cur.real ||= canTrick(s);
      cur.peak = Math.max(cur.peak, s.position[1] - track.sample(s.t, 0).groundY);
      if (s.grounded) {
        cur.to = i;
        cur.seconds = (i - cur.from) * SIM_DT;
        cur.trickBoost = ev.some((e) => e.type === 'boostStart' && e.source === 'trick');
        flights.push(cur);
        cur = undefined;
      }
    }
  }
  return { flights, events: all };
}

/** The button down for one tick at each tick in `at`. */
const presses = (at: number[]) => (i: number) => at.includes(i);

describe('a hop is a hop on any steady slope (the road\'s climb is the hop\'s)', () => {
  for (const [name, h] of [['flat', () => 0], ['down a 20 % hill', (m: number) => -0.2 * m], ['up a 20 % hill', (m: number) => 0.2 * m]] as const) {
    it(`${name}: about 0.21 s of air, never real air, and a press in it is no trick`, () => {
      const track = road(h);
      const s = kartAt(track, 100);
      // hop at tick 5, press again 10 ticks later (in the air)
      const { flights, events } = drive(track, s, 120, presses([5, 15]));
      expect(flights).toHaveLength(1);
      const f = flights[0];
      expect(f.seconds, name).toBeGreaterThan(0.17);
      expect(f.seconds, name).toBeLessThan(0.25);
      expect(f.real, name).toBe(false);
      expect(f.tricks, name).toBe(0);
      expect(events.some((e) => e.type === 'boostStart' && e.source === 'trick'), name).toBe(false);
    });
  }

  it('down the hill a hop with the stick over lands in a drift (before 26 Sept 2026 it flew 0.6 s and the drift was lost)', () => {
    const track = road((m) => -0.2 * m);
    const s = kartAt(track, 100);
    drive(track, s, 90, (i) => i >= 5, 1);
    expect(s.drift.phase).toBe('drifting');
  });

  it('spam: hopping and pressing all the way down a 400 m hill, or along the flat, never tricks', () => {
    for (const h of [(m: number) => -0.2 * m, () => 0]) {
      const track = road(h);
      const s = kartAt(track, 100);
      // press every 4th tick for 12 s: a hop on every landing, a press in every flight
      const { flights, events } = drive(track, s, 12 * 120, (i) => i % 8 < 1 || i % 8 === 4);
      expect(flights.length).toBeGreaterThan(20);
      expect(events.filter((e) => e.type === 'trick')).toHaveLength(0);
      expect(flights.every((f) => !f.real && f.seconds < 0.25)).toBe(true);
    }
  });
});

describe('real air: a crest, a ledge (ground.ts realAir)', () => {
  // up 15 % to a sharp crest at 200 m, then down 15 %
  const crest = (m: number) => (m < 200 ? 0.15 * m : 0.15 * 200 - 0.15 * (m - 200));
  const crestTick = Math.round((200 - 180) / V / SIM_DT);

  it('a hop that carries over the crest flies (real air) and is the trick, as a hop over a ramp\'s lip is: the landing is the trick boost', () => {
    for (const early of [1, 12, 20]) {
      const track = road(crest);
      const s = kartAt(track, 180);
      const { flights } = drive(track, s, 300, presses([crestTick - early]));
      expect(flights, `${early} ticks early`).toHaveLength(1);
      const f = flights[0];
      expect(f.real, `${early} ticks early`).toBe(true);
      expect(f.seconds, `${early} ticks early`).toBeGreaterThan(0.4);
      expect(f.tricks, `${early} ticks early`).toBe(1);
      expect(f.trickBoost, `${early} ticks early`).toBe(true);
    }
  });

  it('a hop 0.4 s before the crest comes down on the climb: an ordinary hop, no trick', () => {
    const track = road(crest);
    const s = kartAt(track, 180);
    const { flights } = drive(track, s, 300, presses([crestTick - 48, crestTick - 40]));
    expect(flights[0].real).toBe(false);
    expect(flights[0].seconds).toBeLessThan(0.25);
    expect(flights[0].tricks).toBe(0);
  });

  it('rolling off a 1 m ledge with no hop: real air, and a press in it tricks', () => {
    const ledge = (m: number) => (m < 200 ? 0 : m < 200.2 ? -(m - 200) * 5 : -1);
    const track = road(ledge);
    const s = kartAt(track, 180);
    let pressedAt = -1;
    const { flights } = drive(track, s, 300, (i, k) => {
      if (pressedAt < 0 && !k.grounded) pressedAt = i + 6;
      return i === pressedAt;
    });
    expect(flights).toHaveLength(1);
    expect(flights[0].real).toBe(true);
    expect(flights[0].tricks).toBe(1);
    expect(flights[0].trickBoost).toBe(true);
  });
});

describe('trick bumps catch a hop like a ramp does (design §6: "hop off it for a trick boost")', () => {
  const bumpAt = 200;
  const mk = () => road(() => 0, [{ id: 'b', t: bumpAt / LENGTH, launch: 4.5, shape: 'hump', run: 8, rise: 1, edge: 1.6 }]);
  function launchTick(): number {
    const track = mk();
    const s = kartAt(track, 150);
    for (let i = 0; i < 400; i++) if (stepKart(s, go, track, c, SIM_DT).some((e) => e.type === 'launched')) return i;
    return -1;
  }
  const crest = launchTick();

  it('a press just before the crest, or a hop still in the air over it, launches and tricks; one well before is only the bump', () => {
    expect(crest).toBeGreaterThan(0);
    for (const early of [1, 6, 12, 20]) {
      const track = mk();
      const s = kartAt(track, 150);
      const { events } = drive(track, s, 300, presses([crest - early]));
      expect(events.filter((e) => e.type === 'launched'), `${early} ticks early`).toHaveLength(1);
      expect(events.filter((e) => e.type === 'trick'), `${early} ticks early`).toHaveLength(1);
      expect(events.some((e) => e.type === 'boostStart' && e.source === 'trick'), `${early} ticks early`).toBe(true);
    }
    const track = mk();
    const s = kartAt(track, 150);
    const { events } = drive(track, s, 300, presses([crest - 60]));
    expect(events.filter((e) => e.type === 'launched')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'trick')).toHaveLength(0);
  });
});
