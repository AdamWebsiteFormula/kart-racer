import { describe, expect, it } from 'vitest';
import { makeConstants } from './constants.ts';
import { crossed, stepGround } from './ground.ts';
import { createKartState, headingOf, type KartEvent, type KartState } from './types.ts';
import { makeOval } from './__tests__/oval-stub.ts';

const c = makeConstants('medium', 150);
const DT = 1 / 120;

function kartAt(track: ReturnType<typeof makeOval>, t: number, speed: number): KartState {
  const { p, tan } = track.centre(t);
  const s = createKartState({ racerId: 'x', position: [p[0], 0, p[2]], heading: headingOf(tan), t });
  s.speed = speed;
  return s;
}

describe('ground', () => {
  it('crossed is wrap-aware', () => {
    expect(crossed(0.1, 0.2, 0.15)).toBe(true);
    expect(crossed(0.1, 0.2, 0.25)).toBe(false);
    expect(crossed(0.98, 0.02, 0.0)).toBe(true);
    expect(crossed(0.98, 0.02, 0.5)).toBe(false);
    // reversing a little is not a lap wrap: nothing is crossed
    expect(crossed(0.5, 0.49, 0.6)).toBe(false);
    expect(crossed(0.5, 0.49, 0.495)).toBe(false);
    expect(crossed(0.5, 0.5, 0.5)).toBe(false);
  });

  it('stays snapped on a slope and t advances', () => {
    const track = makeOval({ heightAt: (t) => Math.sin(t * Math.PI * 8) * 3 });
    const s = kartAt(track, 0.01, 25);
    for (let i = 0; i < 240; i++) {
      stepGround(s, track, c, DT, []);
      expect(s.grounded).toBe(true);
    }
    expect(s.t).toBeGreaterThan(0.01);
    expect(s.position[1]).toBeCloseTo(track.sample(s.t, 0).groundY, 5);
  });

  it('a hop leaves the ground and lands in about hopSeconds', () => {
    const track = makeOval();
    const s = kartAt(track, 0.05, 25);
    s.verticalVelocity = c.hopVelocity; s.grounded = false;
    let ticks = 0;
    const ev: KartEvent[] = [];
    while (!s.grounded && ticks < 200) { stepGround(s, track, c, DT, ev); ticks++; }
    // groundStick catches the kart a little early on the way down
    expect(ticks * DT).toBeGreaterThan(c.hopSeconds * 0.7);
    expect(ticks * DT).toBeLessThanOrEqual(c.hopSeconds + 0.01);
    expect(ev.some((e) => e.type === 'landed')).toBe(true);
  });

  it('launches off a ramp, lands and fires a queued trick', () => {
    const track = makeOval({ jumps: [{ id: 'j1', t: 0.06, launch: 6 }] });
    const s = kartAt(track, 0.05, 25);
    const ev: KartEvent[] = [];
    let launched = false;
    for (let i = 0; i < 400; i++) {
      stepGround(s, track, c, DT, ev);
      if (!launched && s.airborne.fromJumpId === 'j1') { launched = true; s.airborne.trickQueued = true; }
      if (launched && s.grounded) break;
    }
    expect(launched).toBe(true);
    expect(ev.some((e) => e.type === 'launched')).toBe(true);
    const landed = ev.find((e) => e.type === 'landed');
    expect(landed && landed.type === 'landed' && landed.trick).toBe(true);
    expect(s.boost.source).toBe('trick');
    expect(s.airborne.trickQueued).toBe(false);
  });

  it('a boost pad surface grants the pad boost once', () => {
    const track = makeOval({ surfaceAt: (t) => (t > 0.05 && t < 0.07 ? 'boost' : 'road') });
    const s = kartAt(track, 0.04, 25);
    const ev: KartEvent[] = [];
    for (let i = 0; i < 240; i++) stepGround(s, track, c, DT, ev);
    expect(ev.filter((e) => e.type === 'boostStart')).toHaveLength(1);
    expect(s.boost.source).toBe('pad');
  });

  it('landing straight onto a boost surface still grants the pad boost', () => {
    const track = makeOval({ surfaceAt: (t) => (t > 0.05 ? 'boost' : 'road') });
    const s = kartAt(track, 0.049, 25);
    s.verticalVelocity = c.hopVelocity; s.grounded = false;
    const ev: KartEvent[] = [];
    for (let i = 0; i < 60; i++) stepGround(s, track, c, DT, ev);
    expect(s.grounded).toBe(true);
    expect(s.surface).toBe('boost');
    expect(ev.filter((e) => e.type === 'boostStart')).toHaveLength(1);
  });

  it('falling below voidY emits respawn', () => {
    const track = makeOval({ heightAt: (t) => (t > 0.06 ? -100 : 0), voidY: -20 });
    const s = kartAt(track, 0.05, 25);
    const ev: KartEvent[] = [];
    for (let i = 0; i < 600; i++) stepGround(s, track, c, DT, ev);
    expect(ev.some((e) => e.type === 'respawn')).toBe(true);
  });

  it('an airborne kart already under the road keeps falling to the void; a grounded kart under a slope snaps up', () => {
    const track = makeOval({ voidY: -20 });
    const under = kartAt(track, 0.05, 25);
    under.position[1] = -5;
    under.grounded = false;
    const ev: KartEvent[] = [];
    stepGround(under, track, c, DT, ev);
    expect(under.grounded).toBe(false);
    expect(under.position[1]).toBeLessThan(-5);
    for (let i = 0; i < 300; i++) stepGround(under, track, c, DT, ev);
    expect(ev.some((e) => e.type === 'respawn')).toBe(true);
    const slope = kartAt(track, 0.05, 25);
    slope.position[1] = -0.5; // the road rose under a grounded kart
    stepGround(slope, track, c, DT, []);
    expect(slope.grounded).toBe(true);
    expect(slope.position[1]).toBe(0);
  });

  it('surface updates from the track while grounded', () => {
    const track = makeOval({ surfaceAt: () => 'mud' });
    const s = kartAt(track, 0.05, 25);
    stepGround(s, track, c, DT, []);
    expect(s.surface).toBe('mud');
  });
});
