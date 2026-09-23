import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../kart-controller/step.ts';
import type { KartState } from '../kart-controller/types.ts';
import { buildTrack } from '../track-builder/track.ts';
import { AI, PROFILES } from './constants.ts';
import { decideItem, type ItemContext } from './items.ts';
import { OVAL } from './__tests__/fixtures.ts';
import { fakeLine, kartAt, memory } from './__tests__/units.ts';
import type { ItemRole } from './types.ts';

const track = buildTrack(OVAL);
const roles: Record<string, ItemRole> = {
  ball: 'forward', kite: 'homing', oil: 'rearDrop', decoy: 'deception', horn: 'defenceArea', bubble: 'defenceHeld', lolly: 'speed', fog: 'equaliser',
  strike: 'ride', pogo: 'jump', anchor: 'tether', mouse: 'runner',
};

/** Another kart `ahead` metres along the heading (negative = behind), `side` metres to the right. */
function other(s: KartState, ahead: number, side = 0): KartState {
  const o = kartAt(track, s.t, 0, 20, 'o');
  const f = [Math.sin(s.heading), 0, Math.cos(s.heading)], r = [Math.cos(s.heading), 0, -Math.sin(s.heading)];
  o.position = [s.position[0] + f[0] * ahead + r[0] * side, s.position[1], s.position[2] + f[2] * ahead + r[2] * side];
  return o;
}

function ctx(s: KartState, others: KartState[], gap = 0, threatened = false): ItemContext {
  return { karts: [s, ...others], roles, gap, threatened };
}

/** Hold an item until the reaction delay has passed; returns the decision on the first live tick. */
function settle(s: KartState, held: string, c: ItemContext, line = fakeLine(0)): boolean {
  const m = memory(PROFILES.hard);
  s.item.held = held;
  s.item.charges = 1;
  decideItem(s, m, PROFILES.hard, line, c, SIM_DT); // notices the new item, starts the timer
  let r = false;
  for (let i = 0; i < 240; i++) { r = decideItem(s, m, PROFILES.hard, line, c, SIM_DT); if (r) break; }
  return r;
}

describe('items', () => {
  it('waits the reaction delay, never presses during the roulette or with nothing held', () => {
    const s = kartAt(track, 0.1);
    const c = ctx(s, [other(s, 20)]);
    const m = memory(PROFILES.hard);
    s.item.held = 'ball';
    expect(decideItem(s, m, PROFILES.hard, fakeLine(0), c, SIM_DT)).toBe(false);
    expect(m.reactionRemaining).toBeGreaterThan(0);
    s.item.rouletteRemaining = 1;
    for (let i = 0; i < 240; i++) expect(decideItem(s, m, PROFILES.hard, fakeLine(0), c, SIM_DT)).toBe(false);
    s.item.rouletteRemaining = 0;
    s.item.held = 'none';
    expect(settle(s, 'none', c)).toBe(false);
    expect(settle(s, 'mystery', c)).toBe(false);
  });

  it('forward needs a kart ahead inside the cone; homing any kart ahead in range', () => {
    const s = kartAt(track, 0.1);
    expect(settle(s, 'ball', ctx(s, [other(s, 20)]))).toBe(true);
    expect(settle(s, 'ball', ctx(s, [other(s, 20, 15)]))).toBe(false);
    expect(settle(s, 'ball', ctx(s, [other(s, AI.items.forwardRange + 5)]))).toBe(false);
    expect(settle(s, 'ball', ctx(s, [other(s, -10)]))).toBe(false);
    expect(settle(s, 'kite', ctx(s, [other(s, 60, 15)]))).toBe(true);
    expect(settle(s, 'kite', ctx(s, [other(s, -10)]))).toBe(false);
  });

  it('rear drops fire on a kart close behind or after holdMax; defence on threat or a close kart', () => {
    const s = kartAt(track, 0.1);
    expect(settle(s, 'oil', ctx(s, [other(s, -8)]))).toBe(true);
    expect(settle(s, 'decoy', ctx(s, [other(s, -40)]))).toBe(false);
    const m = memory(PROFILES.hard);
    s.item.held = 'oil';
    s.item.charges = 1;
    const c = ctx(s, [other(s, -40)]);
    decideItem(s, m, PROFILES.hard, fakeLine(0), c, SIM_DT);
    let fired = false;
    for (let i = 0; i < Math.round((AI.items.holdMax + 1) / SIM_DT); i++) if (decideItem(s, m, PROFILES.hard, fakeLine(0), c, SIM_DT)) { fired = true; break; }
    expect(fired).toBe(true);
    expect(settle(s, 'horn', ctx(s, [other(s, 4)]))).toBe(true);
    expect(settle(s, 'horn', ctx(s, [other(s, 40)]))).toBe(false);
    expect(settle(s, 'horn', ctx(s, [other(s, 40)], 0, true))).toBe(true);
    expect(settle(s, 'bubble', ctx(s, [other(s, -8)]))).toBe(true);
    expect(settle(s, 'bubble', ctx(s, [other(s, 8)]))).toBe(false);
  });

  it('speed items on a straight, off-road or far behind; equalisers once far enough back', () => {
    const s = kartAt(track, 0.1);
    expect(settle(s, 'lolly', ctx(s, []), fakeLine(0))).toBe(true);
    expect(settle(s, 'lolly', ctx(s, []), fakeLine(0.8))).toBe(false);
    expect(settle(s, 'lolly', ctx(s, [], AI.items.speedItemGap + 1), fakeLine(0.8))).toBe(true);
    s.surface = 'mud';
    expect(settle(s, 'lolly', ctx(s, []), fakeLine(0.8))).toBe(true);
    s.rank = 2;
    expect(settle(s, 'fog', ctx(s, []), fakeLine(0.8))).toBe(false);
    s.rank = AI.items.equaliserMinRank;
    expect(settle(s, 'fog', ctx(s, []), fakeLine(0.8))).toBe(true);
  });

  it('a tap is one tick down and one up; nothing is pressed while a power runs from the slot', () => {
    const s = kartAt(track, 0.1);
    const m = memory(PROFILES.hard);
    s.item.held = 'lolly'; s.item.charges = 3;
    const c = ctx(s, []);
    decideItem(s, m, PROFILES.hard, fakeLine(0), c, SIM_DT);
    const presses: boolean[] = [];
    for (let i = 0; i < 240; i++) presses.push(decideItem(s, m, PROFILES.hard, fakeLine(0), c, SIM_DT));
    const first = presses.indexOf(true);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(presses[first + 1]).toBe(false);
    expect(presses[first + 2]).toBe(true);
    // a Strike Ball rolling: charges 0, the slot is busy
    expect(settle(s, 'strike', ctx(s, []))).toBe(true);
    s.item.charges = 0;
    for (let i = 0; i < 120; i++) expect(decideItem(s, m, PROFILES.hard, fakeLine(0), c, SIM_DT)).toBe(false);
  });

  it('the new items: anchor a kart well ahead, send the Mouse at the pack, boing from a threat, slam onto a kart', () => {
    const s = kartAt(track, 0.1);
    expect(settle(s, 'anchor', ctx(s, [other(s, 25)]))).toBe(true);
    expect(settle(s, 'anchor', ctx(s, [other(s, 4)]))).toBe(false);
    expect(settle(s, 'anchor', ctx(s, [other(s, -25)]))).toBe(false);
    expect(settle(s, 'mouse', ctx(s, [other(s, 40, 3)]))).toBe(true);
    expect(settle(s, 'pogo', ctx(s, [other(s, -40)], 0, true))).toBe(true);
    s.grounded = false;
    expect(settle(s, 'pogo', ctx(s, [other(s, 2, 1)]))).toBe(true);
    expect(settle(s, 'pogo', ctx(s, [other(s, 30)]))).toBe(false);
    s.grounded = true;
  });

  it('keeps a ball behind as a shield while a shot homes in, and lets go once clear', () => {
    const s = kartAt(track, 0.1);
    const m = memory(PROFILES.hard);
    s.item.held = 'ball'; s.item.charges = 1;
    const chased = ctx(s, [other(s, -30)], 0, true);
    decideItem(s, m, PROFILES.hard, fakeLine(0), chased, SIM_DT);
    let held = 0;
    for (let i = 0; i < 240; i++) if (decideItem(s, m, PROFILES.hard, fakeLine(0), chased, SIM_DT)) held++;
    // a long hold (trailing), not a pulse
    expect(held).toBeGreaterThan(100);
    expect(m.itemTrailing).toBe(true);
    // clear of the chaser: let go on the next tick
    expect(decideItem(s, m, PROFILES.hard, fakeLine(0), ctx(s, [other(s, -60)]), SIM_DT)).toBe(false);
    expect(m.itemTrailing).toBe(false);
  });
});
