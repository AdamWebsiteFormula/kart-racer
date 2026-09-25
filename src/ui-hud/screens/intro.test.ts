// The course intro's title card, as data (screens/intro.ts): the track's US name, its cup, which race
// this is in every mode, the racer, and how to skip.
import { describe, expect, it } from 'vitest';
import { introCard } from './intro.ts';

describe('the course intro title card', () => {
  it('names the track as the menus do (US English), under its cup, with the mode and class', () => {
    const vm = introCard({ trackId: 'harbour-loop', mode: 'quick', speedClass: 150, racerId: 'pip' });
    expect(vm.name).toBe('Harbor Loop');
    expect(vm.cup).toBe('Sunrise Cup');
    expect(vm.sub).toBe('Quick Race · 150cc');
    expect(vm.racer).toEqual({ id: 'pip', name: 'Pip', accent: '#2EC4B6' });
    expect(vm.accent).toBe('#FF6F61');
    // how to skip in the last input's words: the keys (a keyboard player may hold a pad too), or a pad's buttons
    expect(vm.skip).toEqual({ keys: 'Press any key or button to skip', pad: 'Press any button to skip' });
  });

  it('a Grand Prix says which race of its cup this is', () => {
    const vm = introCard({ trackId: 'meadow-run', mode: 'grandPrix', speedClass: 100, racerId: 'gus', seriesId: 'sunrise', race: { index: 1, count: 3 } });
    expect(vm.cup).toBe('Sunrise Cup');
    expect(vm.sub).toBe('Race 2 of 3 · 100cc');
    expect(vm.racer?.name).toBe('Big Gus');
  });

  it('a Knockout names its set, the round and how many go through; the final is to win', () => {
    const r1 = introCard({ trackId: 'harbour-loop', mode: 'knockout', speedClass: 150, racerId: 'pip', seriesId: 'coastline', race: { index: 0, count: 3 }, cutLine: 6 });
    expect(r1.cup).toBe('Coastline Knockout');
    expect(r1.sub).toBe('Round 1 of 3 · Top 6 go through');
    const r3 = introCard({ trackId: 'canyon-rush', mode: 'knockout', speedClass: 150, racerId: 'pip', seriesId: 'coastline', race: { index: 2, count: 3 }, cutLine: 1 });
    expect(r3.sub).toBe('Final round · Win it all');
  });

  it('Time Trial and the Daily say so; Mirror mode is marked; a touch screen taps to skip', () => {
    expect(introCard({ trackId: 'skyline-circuit', mode: 'timeTrial', speedClass: 150, racerId: 'nova' }).sub).toBe('Time Trial');
    expect(introCard({ trackId: 'skyline-circuit', mode: 'timeTrial', speedClass: 150, racerId: 'nova' }).cup).toBe('Summit Cup');
    expect(introCard({ trackId: 'frostbite-pass', mode: 'daily', speedClass: 150, racerId: 'momo', dailySeed: 20260925 }).sub).toBe('Daily Challenge · Sep 25');
    const m = introCard({ trackId: 'boardwalk-nights', mode: 'grandPrix', speedClass: 150, racerId: 'otto', seriesId: 'summit', race: { index: 0, count: 3 }, mirrored: true, touch: true });
    expect(m.sub).toBe('Race 1 of 3 · 150cc · Mirror');
    expect(m.skip).toEqual({ keys: 'Tap to skip', pad: 'Tap to skip' });
  });

  it('a track the catalog does not know keeps the name from its file; no racer, no chip', () => {
    const vm = introCard({ trackId: 'new-track', trackName: 'New Track', mode: 'quick', speedClass: 50, racerId: null });
    expect(vm.name).toBe('New Track');
    expect(vm.cup).toBe('');
    expect(vm.cupId).toBe('');
    expect(vm.racer).toBeNull();
  });

  it('the chip carries the id of the cup or set it names, for its emblem', () => {
    expect(introCard({ trackId: 'harbour-loop', mode: 'quick', speedClass: 150, racerId: 'pip' }).cupId).toBe('sunrise');
    expect(introCard({ trackId: 'skyline-circuit', mode: 'timeTrial', speedClass: 150, racerId: 'nova' }).cupId).toBe('summit');
    expect(introCard({ trackId: 'harbour-loop', mode: 'knockout', speedClass: 150, racerId: 'pip', seriesId: 'coastline', race: { index: 0, count: 3 } }).cupId).toBe('coastline');
    expect(introCard({ trackId: 'frostbite-pass', mode: 'knockout', speedClass: 150, racerId: 'pip', seriesId: 'peaks', race: { index: 0, count: 3 } }).cupId).toBe('peaks');
  });
});
