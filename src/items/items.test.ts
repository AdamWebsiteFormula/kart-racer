// SOP test 14: determinism and snapshot/restore. Plus the press refusals.
import { describe, expect, it } from 'vitest';
import { lookAheadDriver } from '../race-manager/__tests__/drivers.ts';
import { count, give, go, kart, press, seconds, setup, tick } from './__tests__/harness.ts';

function drive(seed: number, ticks: number) {
  const h = setup({ n: 4, seed });
  const drivers = [lookAheadDriver(30, 0), lookAheadDriver(28, 0), lookAheadDriver(26, 0), lookAheadDriver(24, 0)];
  for (let t = 0; t < ticks; t++) {
    for (let i = 0; i < 4; i++) {
      const s = kart(h, i);
      h.inputs[i] = { ...drivers[i](s, h.track), item: t % 240 === i * 30 };
    }
    tick(h);
  }
  return h;
}

describe('Items', () => {
  it('same seed and inputs → identical state after 7,200 ticks; a different seed rolls differently', () => {
    const a = drive(3, 7200), b = drive(3, 7200);
    expect(JSON.stringify(a.items.state)).toBe(JSON.stringify(b.items.state));
    expect(JSON.stringify(a.rm.state.karts)).toBe(JSON.stringify(b.rm.state.karts));
    expect(count(a.log, 'roulette')).toBeGreaterThan(0);
    expect(count(a.log, 'itemUsed')).toBeGreaterThan(0);
    const c = drive(4, 7200);
    expect(JSON.stringify(c.items.state)).not.toBe(JSON.stringify(a.items.state));
  });

  it('snapshot/restore round-trips and does not alias', () => {
    const h = drive(5, 3000);
    const snap = h.items.snapshot();
    expect(snap).toEqual(h.items.state);
    tick(h, 300);
    h.items.restore(snap);
    expect(h.items.state).toEqual(snap);
    h.items.state.nextId += 1;
    expect(snap.nextId).not.toBe(h.items.state.nextId);
  });

  it('refuses a press before GO, while spinning, while intangible, and after finishing', () => {
    const h = setup({ n: 1 });
    give(h, 0, 'beachBall');
    expect(press(h, 0).some((e) => e.type === 'itemRefused' && e.reason === 'notRacing')).toBe(true);
    go(h);
    const s = kart(h, 0);
    s.status.spinRemaining = 1;
    expect(press(h, 0).some((e) => e.type === 'itemRefused' && e.reason === 'spinning')).toBe(true);
    s.status.spinRemaining = 0; s.status.intangibleRemaining = 1;
    expect(press(h, 0).some((e) => e.type === 'itemRefused' && e.reason === 'intangible')).toBe(true);
    s.status.intangibleRemaining = 0;
    expect(s.item.held).toBe('beachBall');
    // holding a trailable item trails it: nothing is used until the button comes up, then once
    h.inputs[0] = { ...h.inputs[0], item: true };
    tick(h, seconds(1));
    expect(count(h.log, 'itemUsed')).toBe(0);
    expect(h.items.isTrailing(0)).toBe(true);
    h.inputs[0] = { ...h.inputs[0], item: false };
    tick(h);
    expect(count(h.log, 'itemUsed')).toBe(1);
    expect(h.items.isTrailing(0)).toBe(false);
    // any other item: a held button is one press, not one per tick
    give(h, 0, 'tripleFizz');
    h.inputs[0] = { ...h.inputs[0], item: true };
    tick(h, seconds(1));
    expect(count(h.log, 'itemUsed')).toBe(2);
    h.inputs[0] = { ...h.inputs[0], item: false };
    // a finished kart keeps its item and cannot use it
    const f = setup({ n: 2 });
    go(f);
    give(f, 0, 'beachBall');
    kart(f, 0).finishTick = f.rm.state.tick;
    expect(press(f, 0).some((e) => e.type === 'itemRefused' && e.reason === 'notRacing')).toBe(true);
    expect(kart(f, 0).item.held).toBe('beachBall');
  });
});
