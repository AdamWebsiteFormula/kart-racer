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
    // credits and unlocks from the title
    add(walk([{ type: 'boot' }, { type: 'openCredits' }, { type: 'back' }]).trail);
    add(walk([{ type: 'boot' }, { type: 'openUnlocks' }, { type: 'back' }]).trail);
    const all: string[] = ['title', 'modeSelect', 'rosterSelect', 'cupSelect', 'trackSelect', 'racing', 'results', 'gpTable', 'knockoutCut', 'pause', 'settings', 'credits', 'unlocks'];
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

describe('any racer in any kart (design §12: Mode → Racer → Kart → Cup or Track)', () => {
  const on = () => initialApp(true);

  it('off (the ship switch, UI.kartPick), the Racer screen goes straight on as ever; no kart is ever set', () => {
    expect(initialApp(false).kartPick).toBeUndefined();
    const { trail, s } = walk([{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'gus' }], initialApp(false));
    expect(trail).toEqual(['title', 'modeSelect', 'rosterSelect', 'trackSelect']);
    expect(reduce(s, { type: 'pickKart', kartId: 'scooter' })).toBe(s); // no Kart screen, no kart
  });

  it('on, the Kart screen comes after the racer, then the track, the cup or the race; every mode', () => {
    const to = (mode: 'quick' | 'grandPrix' | 'knockout' | 'timeTrial' | 'daily') => walk([
      { type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode }, { type: 'pickRacer', racerId: 'gus' }, { type: 'pickKart', kartId: 'scooter' },
    ], on());
    expect(to('quick').trail).toEqual(['title', 'modeSelect', 'rosterSelect', 'kartSelect', 'trackSelect']);
    expect(to('timeTrial').trail.slice(3)).toEqual(['kartSelect', 'trackSelect']);
    expect(to('grandPrix').trail.slice(3)).toEqual(['kartSelect', 'cupSelect']);
    expect(to('knockout').trail.slice(3)).toEqual(['kartSelect', 'cupSelect']);
    expect(to('daily').trail.slice(3)).toEqual(['kartSelect', 'racing']); // the Daily picks its own track
    expect(to('quick').s).toMatchObject({ racerId: 'gus', kartId: 'scooter' });
  });

  it('back from the Kart screen keeps the racer; back from the track or cup screen comes back to the Kart screen', () => {
    let s = walk([{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'grandPrix' }, { type: 'pickRacer', racerId: 'nova' }], on()).s;
    expect(s.screen).toBe('kartSelect');
    s = reduce(s, { type: 'back' });
    expect([s.screen, s.racerId]).toEqual(['rosterSelect', 'nova']);
    s = reduce(reduce(s, { type: 'pickRacer', racerId: 'nova' }), { type: 'pickKart', kartId: 'wagon' });
    expect(s.screen).toBe('cupSelect');
    const back = walk([{ type: 'back' }, { type: 'back' }, { type: 'back' }, { type: 'back' }], s).trail;
    expect(back).toEqual(['kartSelect', 'rosterSelect', 'modeSelect', 'title']);
    // a kart pick only on the Kart screen
    expect(reduce(s, { type: 'pickKart', kartId: 'pod' })).toBe(s);
  });

  it('the kart stays through a series and every one more go; Change racer goes through both screens', () => {
    const gp = walk([
      { type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'grandPrix' }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickKart', kartId: 'snacktruck' },
      { type: 'pickCup', cupId: 'sunrise' }, { type: 'raceFinished', seriesHasNext: true }, { type: 'continue' }, { type: 'continue' },
    ], on()).s;
    expect([gp.screen, gp.kartId]).toEqual(['racing', 'snacktruck']);
    const results = walk([
      { type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickKart', kartId: 'stomper' },
      { type: 'pickTrack', trackId: 'meadow-run' }, { type: 'raceFinished', seriesHasNext: false },
    ], on()).s;
    expect(reduce(results, { type: 'raceAgain' })).toMatchObject({ screen: 'racing', kartId: 'stomper' });
    expect(reduce(results, { type: 'nextTrack', trackId: 'canyon-rush' })).toMatchObject({ screen: 'racing', kartId: 'stomper' });
    const change = walk([{ type: 'changeRacer' }, { type: 'pickRacer', racerId: 'momo' }, { type: 'pickKart', kartId: 'pod' }, { type: 'pickTrack', trackId: 'meadow-run' }], results);
    expect(change.trail).toEqual(['rosterSelect', 'kartSelect', 'trackSelect', 'racing']);
    expect(change.s).toMatchObject({ racerId: 'momo', kartId: 'pod' });
    // Change track keeps the combo and skips the pickers
    expect(walk([{ type: 'changeTrack' }, { type: 'pickTrack', trackId: 'canyon-rush' }], results).s).toMatchObject({ racerId: 'pip', kartId: 'stomper', screen: 'racing' });
  });
});

describe('one more go from the results (25 Sept 2026, Mario Kart World\'s end-of-race menu)', () => {
  const to = (mode: 'quick' | 'timeTrial' | 'daily', racerId = 'gus'): AppState => walk([
    { type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode }, { type: 'pickRacer', racerId },
    ...(mode === 'daily' ? [] : [{ type: 'pickTrack', trackId: 'canyon-rush' } as const]), { type: 'raceFinished', seriesHasNext: false },
  ]).s;

  it('a Quick Race: Next track, Race again, Change track, Change racer and Menu, the racer, class and Mirror kept', () => {
    const results = { ...to('quick'), speedClass: 150 as const, mirrored: true };
    expect(results.screen).toBe('results');
    const next = reduce(results, { type: 'nextTrack', trackId: 'frostbite-pass' });
    expect([next.screen, next.trackId, next.racerId, next.speedClass, next.mirrored]).toEqual(['racing', 'frostbite-pass', 'gus', 150, true]);
    const again = reduce(results, { type: 'raceAgain' });
    expect([again.screen, again.trackId, again.racerId]).toEqual(['racing', 'canyon-rush', 'gus']);
    expect(reduce(results, { type: 'changeTrack' }).screen).toBe('trackSelect');
    expect(reduce(results, { type: 'changeRacer' }).screen).toBe('rosterSelect');
    expect(reduce(results, { type: 'continue' }).screen).toBe('modeSelect');
    // the track screen goes on as ever: a pick races it, back goes to the racer screen
    const picked = walk([{ type: 'changeTrack' }, { type: 'pickTrack', trackId: 'meadow-run' }], results);
    expect(picked.trail).toEqual(['trackSelect', 'racing']);
    expect(picked.s.trackId).toBe('meadow-run');
    expect(walk([{ type: 'changeRacer' }, { type: 'pickRacer', racerId: 'momo' }, { type: 'pickTrack', trackId: 'canyon-rush' }], results).trail).toEqual(['rosterSelect', 'trackSelect', 'racing']);
  });

  it('a Time Trial: Retry (the same race again), Change track and Change racer; the Daily: today\'s again', () => {
    const tt = to('timeTrial');
    expect(reduce(tt, { type: 'raceAgain' })).toMatchObject({ screen: 'racing', mode: 'timeTrial', trackId: 'canyon-rush' });
    expect(reduce(tt, { type: 'changeTrack' }).screen).toBe('trackSelect');
    expect(reduce(tt, { type: 'changeRacer' }).screen).toBe('rosterSelect');
    expect(reduce(tt, { type: 'nextTrack', trackId: 'meadow-run' })).toBe(tt); // a Quick Race's
    const daily = to('daily');
    expect(reduce(daily, { type: 'raceAgain' })).toMatchObject({ screen: 'racing', mode: 'daily' });
    for (const a of [{ type: 'changeTrack' }, { type: 'changeRacer' }, { type: 'nextTrack', trackId: 'x' }] as const) expect(reduce(daily, a)).toBe(daily);
  });

  it('a Grand Prix or Knockout keeps its own flow: no race again, next track or change from its results (it redid a finished race)', () => {
    for (const mode of ['grandPrix', 'knockout'] as const) {
      const r = walk([{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickCup', cupId: 'sunrise' }, { type: 'raceFinished', seriesHasNext: true }]).s;
      for (const a of [{ type: 'raceAgain' }, { type: 'nextTrack', trackId: 'x' }, { type: 'changeTrack' }, { type: 'changeRacer' }] as const) expect(reduce(r, a), `${mode} ${a.type}`).toBe(r);
    }
  });

  it('only from the results: mid-race, paused or on the menus they change nothing', () => {
    const racing = walk([{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickTrack', trackId: 'meadow-run' }]).s;
    const paused = reduce(racing, { type: 'pause' });
    for (const s of [racing, paused, initialApp()]) {
      for (const a of [{ type: 'raceAgain' }, { type: 'nextTrack', trackId: 'x' }, { type: 'changeTrack' }, { type: 'changeRacer' }] as const) expect(reduce(s, a)).toBe(s);
    }
  });
});
