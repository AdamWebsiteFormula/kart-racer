// @vitest-environment jsdom
// One more go from the results (25 Sept 2026, Mario Kart World's end-of-race menu): the end buttons of a
// Quick Race, a Time Trial and the Daily through UiRoot and the host; a Time Trial's best kept lap by lap
// and raced at each line; the Knockout's goal by the place.
import { afterEach, describe, expect, it } from 'vitest';
import { createKartState } from '../../kart-controller/types.ts';
import type { RaceResults, RaceState } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { hudModel, newHudMemory } from '../hudModel.ts';
import { UiRoot, type RacePlan, type UiHost } from '../ui.ts';
import { HudView } from './hud.ts';

const flush = () => new Promise((r) => setTimeout(r, 0));

function host(built = ['harbour-loop', 'meadow-run', 'canyon-rush']): UiHost & { plans: RacePlan[]; calls: string[] } {
  const plans: RacePlan[] = [], calls: string[] = [];
  return {
    plans, calls,
    builtTracks: new Set(built),
    medalTimes: new Map(built.map((id) => [id, { gold: 126000, silver: 136000, bronze: 154000 }])),
    availableModes: new Set(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']),
    creditsMarkdown: '',
    startRace: (p) => { plans.push(p); calls.push('start'); },
    nextRace: () => calls.push('next'),
    restartRace: () => calls.push('restart'),
    quitRace: () => calls.push('quit'),
    setPaused: () => {},
    settingsChanged: () => {},
  };
}

/** a finished race for the player (`times` in ms, one row per racer, the player first) */
function run(mode: RaceResults['mode'], trackId: string, times: number[], lapTimesMs = [40000, 39000, 38000]): RaceResults {
  const ids = ['pip', 'momo', 'nova', 'gus'];
  return {
    mode, trackId, speedClass: 150, seed: 0, goTick: 360,
    ranks: times.map((timeMs, i) => ({ racerId: ids[i], rank: i + 1, finishTick: 12000 + i, timeMs, lapTimesMs, dnf: false, projectedMs: -1 })),
  };
}

const actions = () => [...document.querySelectorAll<HTMLElement>('#ui .results.on .actions .act-row')].map((r) => [...r.querySelectorAll<HTMLElement>('[data-id]')].map((b) => b.dataset.id));
const focused = () => (document.activeElement as HTMLElement | null)?.dataset.id;
/** past the new end screen's guard (UI.endScreenGuardMs) */
const pastGuard = (ui: UiRoot) => { const now = ui.clock() + UI.endScreenGuardMs + 1; ui.clock = () => now; };

function quick(h = host()) {
  document.body.innerHTML = '';
  const ui = new UiRoot(document.body, h, null);
  ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'quick' });
  ui.dispatch({ type: 'setSpeedClass', speedClass: 150 }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
  ui.raceOver({ results: run('quick', 'harbour-loop', [95000, 96000, 97000, 98000]), trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: false });
  return { ui, h };
}

describe('a Quick Race\'s results', () => {
  it('offer Next track (the next track named on it, focused), Race again, then Change track, Change racer and Menu', () => {
    const { ui } = quick();
    expect(actions()).toEqual([['next', 'again'], ['track', 'racer', 'menu']]);
    expect(document.querySelector('#ui [data-id="next"]')?.textContent).toBe('Next trackMeadow Run');
    expect(focused()).toBe('next');
    ui.dispose();
  });

  it('Next track races the next track with a short intro, Race again the same one with none: racer, class and look as they were', () => {
    let { ui, h } = quick();
    pastGuard(ui);
    ui.nav('confirm');
    expect(ui.app.screen).toBe('racing');
    expect(h.plans.at(-1)).toMatchObject({ mode: 'quick', racerId: 'pip', speedClass: 150, tracks: ['meadow-run'], intro: 'short' });
    ui.dispose();
    ({ ui, h } = quick());
    pastGuard(ui);
    ui.nav('right'); // Race again
    ui.nav('confirm');
    expect(h.plans.at(-1)).toMatchObject({ mode: 'quick', racerId: 'pip', speedClass: 150, tracks: ['harbour-loop'], intro: 'none' });
    ui.dispose();
  });

  it('Change track opens the track screen and Change racer the racer screen (a pick there starts as from the menus); Menu goes to the modes', () => {
    const go = (keys: ('down' | 'right')[]) => {
      const { ui, h } = quick();
      pastGuard(ui);
      for (const k of keys) ui.nav(k);
      ui.nav('confirm');
      return { ui, h };
    };
    let { ui, h } = go(['down']);
    expect(ui.app.screen).toBe('trackSelect');
    ui.dispatch({ type: 'pickTrack', trackId: 'canyon-rush' });
    expect(h.plans.at(-1)).toMatchObject({ tracks: ['canyon-rush'], racerId: 'pip' });
    expect(h.plans.at(-1)?.intro).toBeUndefined(); // the mode's own intro, as from the menus
    ui.dispose();
    ({ ui } = go(['down', 'right']));
    expect(ui.app.screen).toBe('rosterSelect');
    ui.dispose();
    ({ ui } = go(['down', 'right', 'right']));
    expect(ui.app.screen).toBe('modeSelect');
    ui.dispose();
  });

  it('keep the end screen\'s guard: a confirm as they open does nothing', () => {
    const { ui, h } = quick();
    ui.nav('confirm');
    expect([ui.app.screen, h.plans.length]).toEqual(['results', 1]);
    ui.dispose();
  });

  it('in a short window (1366x657, a phone on its side) the buttons sit in one line, and so does the focus; a taller one goes back to two rows', () => {
    const mm = globalThis.matchMedia;
    let short = true;
    const changed: (() => void)[] = [];
    globalThis.matchMedia = ((q: string) => ({
      get matches() { return q === UI.endOneLineQuery && short; },
      addEventListener: (_: string, f: () => void) => { if (q === UI.endOneLineQuery) changed.push(f); },
      removeEventListener: () => {},
    })) as never;
    try {
      const { ui } = quick();
      const walk = (keys: ('right' | 'down')[]) => keys.map((k) => { ui.nav(k); return focused(); });
      expect(walk(['right', 'right', 'right', 'right', 'right'])).toEqual(['again', 'track', 'racer', 'menu', 'next']);
      short = false;
      for (const f of changed) f(); // the window grows: two rows again
      expect(walk(['right', 'down', 'right'])).toEqual(['again', 'racer', 'menu']);
      ui.dispose();
    } finally { globalThis.matchMedia = mm; }
  });
});

describe('a Time Trial\'s results', () => {
  afterEach(() => { document.body.innerHTML = ''; });
  function tt(h = host(), leaderboard?: UiHost['leaderboard']) {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, { ...h, ...(leaderboard ? { leaderboard } : {}) }, null);
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'timeTrial' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'meadow-run' });
    return ui;
  }
  const medalTimesMs = { gold: 126000, silver: 136000, bronze: 154000 };
  const over = (ms: number, laps: number[], ghost = 'AQQA') => ({
    results: run('timeTrial', 'meadow-run', [ms], laps), trackName: 'Meadow Run', playerId: 'pip', seriesHasNext: false, medalTimesMs, ghost,
  });

  it('Retry (focused), Change track, Change racer, Menu; Retry races the same track again with no intro, against the best just set', () => {
    const h = host();
    const ui = tt(h);
    ui.raceOver(over(117000, [40000, 39000, 38000], 'AQQA'));
    expect(actions()).toEqual([['again'], ['track', 'racer', 'menu']]);
    expect(document.querySelector('#ui [data-id="again"]')?.textContent).toBe('Retry');
    expect(focused()).toBe('again');
    // a first best: saved with its ghost and its time at each lap line
    expect(ui.save.timeTrial['meadow-run']).toMatchObject({ bestMs: 117000, ghost: 'AQQA', splitsMs: [40000, 79000, 117000] });
    expect(document.querySelector('#ui .results.on .res-delta')).toBeNull(); // no best before it to beat
    pastGuard(ui);
    ui.nav('confirm');
    expect([ui.app.screen, h.plans.at(-1)]).toEqual(['racing', expect.objectContaining({ mode: 'timeTrial', tracks: ['meadow-run'], intro: 'none' })]);
    ui.dispose();
  });

  it('the results say how the run did against the best it raced; a new best replaces the lap lines and the ghost, a slower run keeps them', () => {
    const ui = tt();
    ui.save.timeTrial['meadow-run'] = { bestMs: 118370, medal: 'gold', racerId: 'pip', ghost: 'AAAA', splitsMs: [40420, 79600, 118370] };
    ui.raceOver(over(117000, [40000, 39000, 38000], 'AQQA'));
    const panel = document.querySelector('#ui .results.on')!;
    expect(panel.querySelector('h2')?.textContent).toBe('New best! Gold medal!');
    const d = panel.querySelector('.res-delta')!;
    expect([d.textContent, d.className, d.getAttribute('aria-label')]).toEqual(['−1.37', 'res-delta ahead', '1.37 seconds ahead of your best']);
    expect(panel.querySelector('.sub')?.textContent).toBe('Meadow Run · Old best 1:58.37');
    expect(ui.save.timeTrial['meadow-run']).toMatchObject({ bestMs: 117000, ghost: 'AQQA', splitsMs: [40000, 79000, 117000] });
    // a slower run: behind in red, and the best (its lines and ghost) kept
    pastGuard(ui);
    ui.nav('confirm'); // Retry
    ui.raceOver(over(117850, [40100, 39100, 38650], 'AQQB'));
    const slow = document.querySelector('#ui .results.on .res-delta')!;
    expect([slow.textContent, slow.className]).toEqual(['+0.85', 'res-delta behind']);
    expect(document.querySelector('#ui .results.on .sub')?.textContent).toBe('Meadow Run · Your best 1:57.00');
    expect(ui.save.timeTrial['meadow-run']).toMatchObject({ bestMs: 117000, ghost: 'AQQA', splitsMs: [40000, 79000, 117000] });
    ui.dispose();
  });

  it('with the leaderboard: the name box and Post over the buttons, down from them to Retry; once posted, the focus moves on to Retry', async () => {
    let answer: unknown = { ok: true, id: 'x', timeMs: 117000, rank: 3 };
    const ui = tt(host(), { fetchBoard: async () => [] as never, post: async () => answer as never });
    ui.save.playerName = 'Ada';
    const draft = { trackId: 'meadow-run', mode: 'timeTrial' as const, speedClass: 150 as const, timeMs: 117000, lapTimesMs: [40000, 39000, 38000], racerId: 'pip', inputLog: 'AQ==', clientVersion: '1' };
    ui.raceOver({ ...over(117000, [40000, 39000, 38000]), board: { mode: 'timeTrial', dailySeed: null, draft } });
    await flush();
    pastGuard(ui);
    expect(focused()).toBe('post'); // a run can be posted only now
    ui.nav('down');
    expect(focused()).toBe('again');
    ui.nav('up');
    // a failed post leaves the focus on Post (to try again)
    answer = { ok: false, error: 'Could not reach the leaderboard.' };
    ui.nav('confirm');
    await flush(); await flush();
    expect(focused()).toBe('post');
    answer = { ok: true, id: 'x', timeMs: 117000, rank: 3 };
    ui.nav('confirm');
    await flush(); await flush();
    expect(document.querySelector('#ui [data-id="post"]')?.textContent).toMatch(/Posted/);
    expect(focused()).toBe('again');
    ui.dispose();
  });

  it('with the leaderboard, a slower run (nothing new to post) starts on Retry', async () => {
    const ui = tt(host(), { fetchBoard: async () => [] as never, post: async () => ({ ok: false, error: '' }) as never });
    ui.save.playerName = 'Ada';
    ui.save.timeTrial['meadow-run'] = { bestMs: 116000, medal: 'gold', racerId: 'pip', splitsMs: [39000, 78000, 116000] };
    const draft = { trackId: 'meadow-run', mode: 'timeTrial' as const, speedClass: 150 as const, timeMs: 117000, lapTimesMs: [40000, 39000, 38000], racerId: 'pip', inputLog: 'AQ==', clientVersion: '1' };
    ui.raceOver({ ...over(117000, [40000, 39000, 38000]), board: { mode: 'timeTrial', dailySeed: null, draft } });
    await flush();
    expect(focused()).toBe('again');
    ui.nav('up'); // the board is still there to post to
    expect(focused()).toBe('name');
    ui.dispose();
  });

  it('the race HUD pops each lap line against the best the save keeps: green ahead, red behind, a second render writes nothing', () => {
    document.body.innerHTML = '';
    const v = new HudView(document.body);
    const k = createKartState({ racerId: 'p', isPlayer: true });
    const lapTicks = [360 + 4800, 360 + 4800 + 4680]; // 40.00 s, 79.00 s
    const st = (tick: number) => ({ mode: 'timeTrial', lapsTotal: 3, time: 80, phase: 'racing', goTick: 360, tick, karts: [k], trackers: [{ lapTicks }] }) as unknown as RaceState;
    const at = (tick: number, best?: number[]) => { v.render(hudModel(st(tick), k, 1, 10, newHudMemory(), 1, [], 0, false, undefined, best)); };
    at(lapTicks[1] + 6, [40420, 78690, 118000]);
    const rows = [...v.root.querySelectorAll<HTMLElement>('.tc .split')];
    expect(rows.map((r) => r.classList.contains('pop'))).toEqual([false, true]);
    const chip = rows[1].querySelector<HTMLElement>('.d')!;
    expect([chip.textContent, chip.dataset.kind]).toEqual(['+0.31', 'behind']);
    // the lap 1 line, ahead
    at(lapTicks[1] + 6, [40420, 79420, 118000]);
    expect([chip.textContent, chip.dataset.kind]).toEqual(['−0.42', 'ahead']);
    // held: nothing written again
    const before = v.root.innerHTML;
    at(lapTicks[1] + 7, [40420, 79420, 118000]);
    expect(v.root.innerHTML).toBe(before);
    // its hold over (race time), the lap settles back in the list; no best: the lap alone, no chip
    at(lapTicks[1] + UI.lapPopSeconds * 120, [40420, 79420, 118000]);
    expect([rows[1].classList.contains('pop'), chip.textContent]).toEqual([false, '']);
    at(lapTicks[1] + 6);
    expect([rows[1].classList.contains('pop'), chip.textContent]).toEqual([true, '']);
    v.root.remove();
  });
});

describe('the Daily\'s results', () => {
  it('offer today\'s run again (focused, no intro) and the menu, nothing else', () => {
    document.body.innerHTML = '';
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'daily' }); ui.dispatch({ type: 'pickRacer', racerId: 'nova' });
    ui.raceOver({ results: { ...run('daily', 'meadow-run', [117000]), seed: 20260925 }, trackName: 'Meadow Run', playerId: 'pip', seriesHasNext: false });
    expect(actions()).toEqual([['again', 'menu']]);
    expect(document.querySelector('#ui [data-id="again"]')?.textContent).toBe('Race again');
    expect(focused()).toBe('again');
    pastGuard(ui);
    ui.nav('confirm');
    expect(h.plans.at(-1)).toMatchObject({ mode: 'daily', racerId: 'nova', intro: 'none' });
    ui.dispose();
  });
});

describe('a series keeps its own flow', () => {
  it('a Grand Prix race\'s results say Standings, then Next race, as before', () => {
    document.body.innerHTML = '';
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'grandPrix' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickCup', cupId: 'sunrise' });
    ui.raceOver({ results: run('grandPrix', 'harbour-loop', [95000, 96000]), trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: true });
    expect(actions()).toEqual([['continue']]);
    expect(document.querySelector('#ui [data-id="continue"]')?.textContent).toBe('Standings');
    ui.dispose();
  });
});
