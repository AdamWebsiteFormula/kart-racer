// The finish reactions (anim.ts reactionPose, KartAnim.react): each placing's reaction is its own
// move, plays on the same chassis and morph targets as the driving, turns whole in the air without
// a frame's jump, is small with reduced motion, and never writes the kart or its input.
import { describe, expect, it } from 'vitest';
import { KART_ANIM, KartAnim, newPose, REACTION_SECONDS, reactionPose, REACTIONS, sad, SAD_BEATS, type AnimPose, type Reaction } from './anim.ts';
import { makeConstants } from './constants.ts';
import { SIM_DT } from './step.ts';
import { createKartState, NEUTRAL_INPUT } from './types.ts';

const c = makeConstants('medium', 150);
const dt = SIM_DT;

/** The reaction sampled every tick over `seconds`: each field's values in time order. */
function sample(kind: Reaction, seconds = REACTION_SECONDS[kind]): Record<keyof AnimPose, number[]> {
  const out = {} as Record<keyof AnimPose, number[]>;
  const p = newPose();
  for (let t = 0; t <= seconds; t += dt) {
    reactionPose(kind, t, p);
    for (const [k, v] of Object.entries(p)) (out[k as keyof AnimPose] ??= []).push(v);
  }
  return out;
}
const max = (xs: number[]) => Math.max(...xs);
const min = (xs: number[]) => Math.min(...xs);
/** how many separate leaps (hop rising past `over` metres) */
const leaps = (hop: number[], over = 0.05) => hop.reduce((n, h, i) => n + (h > over && (hop[i - 1] ?? 0) <= over ? 1 : 0), 0);

describe('finish reactions: one of its own per placing', () => {
  it('champion (1st): crouches, leaps highest with one whole turn in the air, then fist pumps and two little hops', () => {
    const r = sample('champion');
    expect(min(r.squash.slice(0, 30))).toBeLessThan(-0.1); // the crouch
    expect(max(r.hop)).toBeGreaterThan(0.85);
    expect(leaps(r.hop)).toBe(3);
    expect(max(r.spin)).toBeGreaterThan(2 * Math.PI - 0.05); // the whole turn
    expect(max(r.lean)).toBeGreaterThan(0.25); // the fist pumps
    expect(min(r.lean)).toBeLessThan(-0.25);
  });

  it('cheer (2nd): one lower hop with a twist and no turn, then a big wave', () => {
    const r = sample('cheer');
    expect(max(r.hop)).toBeGreaterThan(0.4);
    expect(max(r.hop)).toBeLessThan(0.6);
    expect(leaps(r.hop)).toBe(1);
    expect(max(r.spin)).toBe(0);
    expect(max(r.yaw.map(Math.abs))).toBeGreaterThan(0.3);
    expect(max(r.lean)).toBeGreaterThan(0.2);
    expect(min(r.lean)).toBeLessThan(-0.2);
  });

  it('bounce (3rd): two quick happy hops, a nodded yes-yes and a wiggle', () => {
    const r = sample('bounce');
    expect(leaps(r.hop)).toBe(2);
    expect(max(r.hop)).toBeLessThan(0.4);
    expect(max(r.nod)).toBeGreaterThan(0.15);
    expect(min(r.nod)).toBeLessThan(-0.15);
    expect(max(r.roll.map(Math.abs))).toBeGreaterThan(0.05);
  });

  it('relief (a safe Knockout place): a phew with the head down, a perk-up, one fist pump and a look back', () => {
    const r = sample('relief');
    expect(max(r.nod.slice(0, 70))).toBeGreaterThan(0.2); // head down
    expect(leaps(r.hop)).toBe(1);
    expect(max(r.lean)).toBeGreaterThan(0.3);
    expect(max(r.look)).toBeGreaterThan(0.4); // over the shoulder
  });

  it('shrug (the middle of the field): the body lifts, the head tilts, then a friendly nod; no leap', () => {
    const r = sample('shrug');
    expect(max(r.squash)).toBeGreaterThan(0.05);
    expect(max(r.lean)).toBeGreaterThan(0.1);
    expect(max(r.hop)).toBe(0);
    expect(max(r.nod.slice(130))).toBeGreaterThan(0.1);
  });

  it('the disappointed ones (4th and below): the head drops as the camera comes round and shakes slowly; no leap, no turn', () => {
    for (const k of ['sigh', 'deflated', 'dejected'] as const) {
      const r = sample(k), B = SAD_BEATS[k];
      expect(sad(k), k).toBe(true);
      expect(max(r.hop), k).toBe(0);
      expect(max(r.spin.map(Math.abs)), k).toBe(0);
      // down by the time the finish camera is round in front (~0.95 s), held through the shake
      const shake = r.nod.slice(Math.round(B.shake[0] / dt), Math.round(B.shake[1] / dt));
      expect(min(shake), k).toBeGreaterThan(0.18);
      expect(min(r.squash), k).toBeLessThan(-0.05);
      const look = r.look.slice(Math.round(B.shake[0] / dt), Math.round(B.shake[1] / dt));
      expect(max(look), k).toBeGreaterThan(0.15);
      expect(min(look), k).toBeLessThan(-0.15);
    }
    expect(REACTIONS.filter(sad)).toEqual(['sigh', 'deflated', 'dejected']);
  });

  it('graded toward the back: sigh (so close) sags least, dejected (the back) hangs its head lowest and sinks deepest', () => {
    const [a, b, c] = (['sigh', 'deflated', 'dejected'] as const).map((k) => sample(k));
    expect(max(a.nod)).toBeLessThan(max(b.nod));
    expect(max(b.nod)).toBeLessThan(max(c.nod));
    expect(min(a.squash)).toBeGreaterThan(min(b.squash));
    expect(min(b.squash)).toBeGreaterThan(min(c.squash));
    // sigh's own beat: "darn!", the head drops with the fist pulled down, before the sigh
    const S = SAD_BEATS.sigh;
    expect(max(a.nod.slice(Math.round(S.tap / dt), Math.round((S.tap + 0.2) / dt)))).toBeGreaterThan(0.25);
    expect(max(a.nod.slice(Math.round(0.6 / dt), Math.round((S.tap - 0.05) / dt)))).toBeGreaterThan(0.15); // the "aw" before it
  });

  it('G-rated: each ends chin up for a polite clap (Mario Kart World\'s losers), then a quiet glum idle, head a little low, never hanging', () => {
    for (const k of ['sigh', 'deflated', 'dejected'] as const) {
      const B = SAD_BEATS[k], p = newPose();
      // chin up for the clap: the slump is gone
      expect(reactionPose(k, B.clap[0] + 0.6, p).nod, k).toBeLessThan(0.1);
      // the glum idle, long after: the head low but not hanging, the body barely sunk, breathing and sighing
      const idle = sample(k, REACTION_SECONDS[k] + 12).nod.slice(Math.round((REACTION_SECONDS[k] + 1) / dt));
      expect(min(idle), k).toBeGreaterThan(0.12);
      expect(max(idle), k).toBeLessThan(0.3);
      expect(max(idle) - min(idle), k).toBeGreaterThan(0.04); // the sigh
      expect(Math.abs(reactionPose(k, REACTION_SECONDS[k] + 9, p).squash), k).toBeLessThan(0.03);
    }
  });

  it('no two reactions are alike, and every one keeps to the rig\'s range', () => {
    const all = REACTIONS.map((k) => sample(k, 3.4));
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        let d = 0;
        for (const f of ['hop', 'spin', 'yaw', 'squash', 'lean', 'look', 'nod', 'roll'] as const) {
          const a = all[i][f], b = all[j][f];
          for (let k = 0; k < a.length; k++) d += (a[k] - b[k]) ** 2;
        }
        expect(d, `${REACTIONS[i]} vs ${REACTIONS[j]}`).toBeGreaterThan(1);
      }
      const r = all[i];
      expect(max(r.lean.map(Math.abs)), REACTIONS[i]).toBeLessThanOrEqual(KART_ANIM.leanMax);
      expect(max(r.look.map(Math.abs)), REACTIONS[i]).toBeLessThanOrEqual(KART_ANIM.lookMax);
      expect(max(r.hop), REACTIONS[i]).toBeLessThanOrEqual(1);
    }
  });

  it('after its main move a joyful reaction carries on bobbing gently; the friendly ones settle', () => {
    for (const k of ['champion', 'cheer', 'bounce', 'relief'] as const) {
      const r = sample(k, REACTION_SECONDS[k] + 3);
      const tail = r.lean.slice(Math.round((REACTION_SECONDS[k] + 0.5) / dt));
      expect(max(tail.map(Math.abs)), k).toBeGreaterThan(0.03);
      expect(max(tail.map(Math.abs)), k).toBeLessThan(0.15);
    }
  });
});

describe('KartAnim.react', () => {
  it('plays on top of the driving, turns whole in the air with no frame jump, and drops the turn from both ends when done', () => {
    const a = new KartAnim(c), s = createKartState({ racerId: 'x' });
    for (let i = 0; i < 30; i++) a.tick(s, NEUTRAL_INPUT, dt);
    a.react('champion');
    expect(a.reacting).toBe('champion');
    const p = newPose();
    let hop = 0, last = 0, step = 0, most = 0;
    for (let i = 0; i < 2 * 120; i++) {
      a.tick(s, NEUTRAL_INPUT, dt);
      for (const alpha of [0.25, 0.5, 0.75, 1]) {
        a.pose(alpha, false, p);
        hop = Math.max(hop, p.hop);
        most = Math.max(most, Math.abs(p.spin));
        step = Math.max(step, Math.abs(((p.spin - last + 3 * Math.PI) % (2 * Math.PI)) - Math.PI));
        last = p.spin;
      }
    }
    expect(hop).toBeGreaterThan(0.85);
    expect(most).toBeGreaterThan(2 * Math.PI - 0.1);
    expect(step).toBeLessThan(0.1);
    expect(a.pose(1, false, p).spin).toBe(0);
    a.react(null);
    a.tick(s, NEUTRAL_INPUT, dt);
    expect(a.reacting).toBeNull();
    expect(a.pose(0.5, false, p).hop).toBe(0);
  });

  it('with reduced motion the leap is low and there is no turn in the air', () => {
    const full = new KartAnim(c), calm = new KartAnim(c), s = createKartState({ racerId: 'x' });
    full.react('champion'); calm.react('champion');
    const a = newPose(), b = newPose();
    let hopFull = 0, hopCalm = 0, spinCalm = 0;
    for (let i = 0; i < 150; i++) {
      full.tick(s, NEUTRAL_INPUT, dt); calm.tick(s, NEUTRAL_INPUT, dt);
      hopFull = Math.max(hopFull, full.pose(1, false, a).hop);
      calm.pose(1, true, b);
      hopCalm = Math.max(hopCalm, b.hop);
      spinCalm = Math.max(spinCalm, Math.abs(b.spin));
    }
    expect(hopCalm).toBeCloseTo(hopFull * KART_ANIM.reducedScale, 6);
    expect(spinCalm).toBe(0);
  });

  it('reads the kart and its input and writes neither', () => {
    const a = new KartAnim(c), s = Object.freeze(createKartState({ racerId: 'x' }));
    const before = JSON.stringify(s);
    for (const k of REACTIONS) {
      a.react(k);
      for (let i = 0; i < 400; i++) a.tick(s, Object.freeze({ ...NEUTRAL_INPUT }), dt);
      for (const v of Object.values(a.pose(0.5, false, newPose()))) expect(Number.isFinite(v)).toBe(true);
    }
    expect(JSON.stringify(s)).toBe(before);
  });
});
