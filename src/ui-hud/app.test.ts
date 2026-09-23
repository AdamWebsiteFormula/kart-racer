import { describe, expect, it } from 'vitest';
import { initialApp, isPaused, reduce } from './app.ts';
import type { AppAction, AppState, Screen } from './types.ts';

function walk(actions: AppAction[], s: AppState = initialApp()): { s: AppState; trail: string[] } {
  const trail: string[] = [];
  for (const a of actions) {
    s = reduce(s, a);
    trail.push(s.overlays.length ? `${s.screen}+${s.overlays.join('+')}` : s.screen);
  }
  return { s, trail };
}

describe('app flow', () => {
  it('SOP gate: every screen and overlay is reachable by the six actions alone', () => {
    const seen = new Set<string>();
    const add = (t: string[]) => t.forEach((x) => x.split('+').forEach((p) => seen.add(p)));
    // Knockout: title → mode → roster → cup → race → pause → settings → back → back → results → cut → next race
    add(walk([
      { type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'knockout' }, { type: 'pickRacer', racerId: 'momo' },
      { type: 'pickCup', cupId: 'k1' }, { type: 'back' }, { type: 'openSettings' }, { type: 'back' }, { type: 'back' },
      { type: 'raceFinished', seriesHasNext: true }, { type: 'continue' }, { type: 'continue' },
    ]).trail);
    // Grand Prix to the table and out
    add(walk([
      { type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'grandPrix' }, { type: 'pickRacer', racerId: 'pip' },
      { type: 'pickCup', cupId: 'sunrise' }, { type: 'raceFinished', seriesHasNext: false }, { type: 'continue' }, { type: 'continue' },
    ]).trail);
    // Quick Race through the track screen
    add(walk([{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'gus' }, { type: 'pickTrack', trackId: 'meadow-run' }]).trail);
    // credits from the title
    add(walk([{ type: 'boot' }, { type: 'openCredits' }, { type: 'back' }]).trail);
    const all: string[] = ['title', 'modeSelect', 'rosterSelect', 'cupSelect', 'trackSelect', 'racing', 'results', 'gpTable', 'knockoutCut', 'pause', 'settings', 'credits'];
    for (const x of all) expect(seen, x).toContain(x);
  });

  it('back always goes one level up and never skips', () => {
    const { trail } = walk([
      { type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'grandPrix' }, { type: 'pickRacer', racerId: 'pip' },
      { type: 'back' }, { type: 'back' }, { type: 'back' }, { type: 'back' },
    ]);
    expect(trail.slice(3)).toEqual(['cupSelect', 'rosterSelect', 'modeSelect', 'title', 'title']);
  });

  it('quick race picks a track (no cup) and ends back at mode select', () => {
    const { trail, s } = walk([
      { type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'gus' },
      { type: 'pickTrack', trackId: 'canyon-rush' }, { type: 'raceFinished', seriesHasNext: false }, { type: 'continue' },
    ]);
    expect(trail).toEqual(['title', 'modeSelect', 'rosterSelect', 'trackSelect', 'racing', 'results', 'modeSelect']);
    expect(s.trackId).toBe('canyon-rush');
  });

  it('time trial picks a track too, back returns to the roster, a new mode forgets the track', () => {
    let s = walk([{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'timeTrial' }, { type: 'pickRacer', racerId: 'nova' }]).s;
    expect(s.screen).toBe('trackSelect');
    s = reduce(s, { type: 'back' });
    expect(s.screen).toBe('rosterSelect');
    s = reduce(reduce(s, { type: 'pickRacer', racerId: 'nova' }), { type: 'pickTrack', trackId: 'meadow-run' });
    expect([s.screen, s.trackId]).toEqual(['racing', 'meadow-run']);
    s = reduce(reduce(reduce(s, { type: 'raceFinished', seriesHasNext: false }), { type: 'continue' }), { type: 'pickMode', mode: 'daily' });
    expect(s.trackId).toBeNull();
    // Daily picks its own track: straight to the race
    expect(reduce(s, { type: 'pickRacer', racerId: 'pip' }).screen).toBe('racing');
  });

  it('pause stacks settings, resume clears the stack, quit leaves the race', () => {
    let s = walk([{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickTrack', trackId: 'harbour-loop' }]).s;
    s = reduce(s, { type: 'pause' });
    expect(isPaused(s)).toBe(true);
    s = reduce(s, { type: 'openSettings' });
    expect(s.overlays).toEqual(['pause', 'settings']);
    s = reduce(s, { type: 'raceFinished', seriesHasNext: false }); // ignored under an overlay
    expect(s.screen).toBe('racing');
    s = reduce(s, { type: 'resume' });
    expect(isPaused(s)).toBe(false);
    s = reduce(s, { type: 'pause' });
    s = reduce(s, { type: 'quit' });
    expect([s.screen, s.overlays.length]).toEqual(['modeSelect' as Screen, 0]);
  });

  it('actions that do not fit the screen change nothing', () => {
    const s = initialApp();
    expect(reduce(s, { type: 'pickCup', cupId: 'x' })).toBe(s);
    expect(reduce(s, { type: 'pause' })).toBe(s);
  });
});
