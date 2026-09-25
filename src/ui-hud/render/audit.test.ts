// @vitest-environment jsdom
// Race-mode and UI audit fixes (24 Sept 2026): no restart in a series, a stale racer in the save,
// the Knockout placing when the player is cut, skipping to the results, the end-screen input guard,
// and the Time Trial ghost kept with the best run only.
import { afterEach, describe, expect, it } from 'vitest';
import { reduce } from '../app.ts';
import { createKnockout, applyResults } from '../../race-manager/series.ts';
import type { RaceResults } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { SAVE_KEY } from '../store.ts';
import type { AppState } from '../types.ts';
import { UiRoot, type UiHost } from '../ui.ts';

function host(): UiHost & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    builtTracks: new Set(['harbour-loop', 'meadow-run', 'canyon-rush']),
    medalTimes: new Map([['harbour-loop', { gold: 126000, silver: 136000, bronze: 154000 }]]),
    availableModes: new Set(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']),
    creditsMarkdown: '',
    startRace: (p) => calls.push(`start:${p.mode}:${p.racerId}`),
    nextRace: () => calls.push('next'),
    restartRace: () => calls.push('restart'),
    quitRace: () => calls.push('quit'),
    setPaused: (p) => calls.push(`paused:${p}`),
    settingsChanged: () => calls.push('settings'),
    skipToResults: () => calls.push('skip'),
  };
}

const IDS = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];
function results(order: string[], mode: RaceResults['mode'] = 'quick', trackId = 'harbour-loop'): RaceResults {
  return {
    mode, trackId, speedClass: 150, seed: 1, goTick: 360,
    ranks: order.map((id, i) => ({ racerId: id, rank: i + 1, finishTick: 12000 + i * 60, timeMs: 97000 + i * 500, lapTimesMs: [33000, 32000, 32000 + i * 500], dnf: false, projectedMs: -1 })),
  };
}
const walk = (ui: UiRoot, mode: 'quick' | 'grandPrix' | 'knockout' | 'timeTrial', racerId = 'pip') => {
  ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode }); ui.dispatch({ type: 'pickRacer', racerId });
  if (mode === 'grandPrix') ui.dispatch({ type: 'pickCup', cupId: 'sunrise' });
  else if (mode === 'knockout') ui.dispatch({ type: 'pickCup', cupId: 'coastline' });
  else ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
};
const raceFrame = (ui: UiRoot, finished: boolean) => ui.race({
  state: { mode: 'quick', lapsTotal: 3, time: 90, phase: 'racing', tick: 12000, goTick: 360, karts: [] } as never,
  player: { racerId: 'pip', isPlayer: true, lap: 3, rank: 1, coins: 0, speed: 20, finishTick: finished ? 11900 : undefined, item: { held: '', charges: 0, rouletteRemaining: 0, next: '', nextCharges: 0, nextRouletteRemaining: 0 }, boost: { remaining: 0 }, drift: { tier: 0, active: false }, status: {} } as never,
  shownRank: 1, coinCap: 10, map: { toMinimap: () => [0, 0], outlines: [] } as never, itemDefs: [],
}, 1000);

afterEach(() => { document.body.innerHTML = ''; delete (navigator as { getGamepads?: unknown }).getGamepads; });

describe('pause: no Restart in a Grand Prix or Knockout (it farmed stars and wins)', () => {
  it('the reducer refuses it, and the pause menu does not show it', () => {
    const racing = (mode: AppState['mode']): AppState => ({ screen: 'racing', overlays: ['pause'], mode, racerId: 'pip', speedClass: 150, cupId: 'sunrise', trackId: null, seriesHasNext: false, mirrored: false });
    for (const mode of ['grandPrix', 'knockout'] as const) expect(reduce(racing(mode), { type: 'restart' }).overlays).toEqual(['pause']);
    for (const mode of ['quick', 'timeTrial', 'daily'] as const) expect(reduce(racing(mode), { type: 'restart' }).overlays).toEqual([]);

    for (const mode of ['grandPrix', 'knockout', 'quick'] as const) {
      document.body.innerHTML = '';
      const h = host();
      const ui = new UiRoot(document.body, h, null);
      walk(ui, mode);
      ui.dispatch({ type: 'pause' });
      const ids = [...document.querySelectorAll<HTMLElement>('#ui .pause.on [data-id]')].map((e) => e.dataset.id);
      expect(ids.includes('restart'), mode).toBe(mode === 'quick');
      ui.dispatch({ type: 'restart' });
      expect(h.calls.includes('restart'), mode).toBe(mode === 'quick');
      ui.dispose();
    }
  });
});

describe('a save naming no racer', () => {
  it('starts a race with the first card, and the roster opens on it', () => {
    const store = new Map([[SAVE_KEY, JSON.stringify({ settings: { selectedRacerId: 'nobody' } })]]);
    const h = host();
    const ui = new UiRoot(document.body, h, { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); } });
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'quick' });
    expect(document.querySelector<HTMLElement>('#ui .roster-screen.on .focused')?.dataset.id).toBe('pip');
    ui.nav('confirm');
    ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    expect(h.calls).toContain('start:quick:pip');
    ui.dispose();
  });
});

describe('Knockout: a player cut early keeps a placing', () => {
  it('saves the placing when the player is knocked out, not only at the final; finished stays for the whole run', () => {
    const ui = new UiRoot(document.body, host(), null);
    walk(ui, 'knockout');
    const ko = createKnockout({ id: 'coastline', trackIds: ['harbour-loop', 'meadow-run', 'canyon-rush'] }, IDS.map((id) => ({ racerId: id, archetype: 'medium', isPlayer: id === 'pip' })), 150, 1);
    const order = ['momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'pip', 'gus']; // pip 7th: cut at 6
    const res = results(order, 'knockout');
    applyResults(ko, res);
    ui.raceOver({ results: res, trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: false, ko: { after: ko } });
    expect(ui.save.knockout.coastline).toEqual({ finished: false, won: false, bestPlacing: 7 });
    ui.dispose();
  });
});

describe('over the line, a press goes straight to the results', () => {
  it('Enter, a fresh pad A or a tap skip once the player has finished; not before, not A held, not the pause button', () => {
    const pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    walk(ui, 'quick');
    const enter = () => dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' }));
    const skips = () => h.calls.filter((c) => c === 'skip').length;
    let t = 0;
    // still racing: nothing
    raceFrame(ui, false);
    enter();
    dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    pad.buttons[0].pressed = true; ui.poll((t += 16));
    expect(skips()).toBe(0);
    // A held for a drift across the line: not a press
    raceFrame(ui, true);
    ui.poll((t += 16)); ui.poll((t += 16));
    expect(skips()).toBe(0);
    pad.buttons[0].pressed = false; ui.poll((t += 16));
    pad.buttons[0].pressed = true; ui.poll((t += 16));
    expect(skips()).toBe(1);
    pad.buttons[0].pressed = false; ui.poll((t += 16));
    enter();
    expect(skips()).toBe(2);
    // Space drifts: it never skips; a held Enter's repeats do not count
    dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', repeat: true }));
    expect(skips()).toBe(2);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(skips()).toBe(3);
    const pauseBtn = document.querySelector('#ui [data-pause]') as HTMLElement;
    pauseBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(skips()).toBe(3);
    ui.dispose();
  });

  it('the finish banner says how', () => {
    const ui = new UiRoot(document.body, host(), null);
    walk(ui, 'quick');
    ui.feed([{ type: 'finish', racerId: 'pip', rank: 2, tick: 11900, dnf: false }], [], 'pip');
    raceFrame(ui, true);
    expect(document.querySelector('#ui .banner .small')?.textContent).toBe('2nd');
    // the prompt in the words of each input; the stylesheet shows the last one used (layout.test.ts)
    expect(document.querySelector('#ui .banner .skip.on')).not.toBeNull();
    expect([...document.querySelectorAll('#ui .banner .skip > span')].map((e) => `${e.className}: ${e.textContent}`))
      .toEqual(['only-keys: Press Enter for results', 'only-pad: Press A for results', 'only-touch: Tap for results']);
    ui.dispose();
  });
});

describe('end screens ignore confirms for a moment (a double click skipped the Grand Prix standings)', () => {
  it('a second click on Continue inside the guard does nothing; after it, it goes on', () => {
    const ui = new UiRoot(document.body, host(), null);
    let now = 1000;
    ui.clock = () => now;
    walk(ui, 'grandPrix');
    ui.raceOver({ results: results(IDS), trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: true });
    const cont = () => (document.querySelector('#ui .results.on [data-id="continue"]') as HTMLElement).click();
    cont(); // the click that lands as the results open
    expect(ui.app.screen).toBe('results');
    now += UI.endScreenGuardMs + 1;
    cont();
    expect(ui.app.screen).toBe('gpTable');
    now += 40;
    cont(); // the double click's second half
    expect(ui.app.screen).toBe('gpTable');
    now += UI.endScreenGuardMs;
    cont();
    expect(ui.app.screen).toBe('racing');
    ui.dispose();
  });
});

describe('Time Trial ghost in the save', () => {
  it('is kept with a new best, and never replaced by a slower run', () => {
    const ui = new UiRoot(document.body, host(), null);
    walk(ui, 'timeTrial');
    const medalTimesMs = { gold: 126000, silver: 136000, bronze: 154000 };
    const run = (timeMs: number) => ({ ...results(['pip'], 'timeTrial'), ranks: [{ ...results(['pip']).ranks[0], timeMs }] });
    ui.raceOver({ results: run(130000), trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: false, medalTimesMs, ghost: 'AQQA' });
    expect(ui.save.timeTrial['harbour-loop']).toMatchObject({ bestMs: 130000, racerId: 'pip', ghost: 'AQQA' });
    ui.raceOver({ results: run(140000), trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: false, medalTimesMs, ghost: 'BBBB' });
    expect(ui.save.timeTrial['harbour-loop'].ghost).toBe('AQQA');
    ui.raceOver({ results: run(120000), trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: false, medalTimesMs, ghost: 'CCCC' });
    expect(ui.save.timeTrial['harbour-loop']).toMatchObject({ bestMs: 120000, ghost: 'CCCC', medal: 'gold' });
    ui.dispose();
  });
});

describe('unlocks in the UI (design §10)', () => {
  it('counts the player\'s Ultra Turbos and item hits up to the line, reveals an unlock once, and lists them all', () => {
    const ui = new UiRoot(document.body, host(), null);
    walk(ui, 'grandPrix');
    ui.save.stats.ultraTurbos = 8;
    const ultra = (racerId: string, tier = 3) => ({ type: 'kart', racerId, event: { type: 'driftEnd', tier } }) as const;
    ui.feed([ultra('pip'), ultra('momo'), ultra('pip', 2)], [{ type: 'hit', racerId: 'momo', byRacerId: 'pip', itemId: 'beachBall', spun: true, coinsLost: 2 }], 'pip');
    expect([ui.save.stats.ultraTurbos, ui.save.stats.itemsHit]).toEqual([9, 1]);
    // the tick the player finishes still counts; after it the autopilot's drifts do not
    ui.feed([ultra('pip'), { type: 'finish', racerId: 'pip', rank: 1, tick: 9000, dnf: false }], [], 'pip');
    ui.feed([ultra('pip')], [{ type: 'hit', racerId: 'nova', byRacerId: 'pip', itemId: 'beachBall', spun: true, coinsLost: 0 }], 'pip');
    expect([ui.save.stats.ultraTurbos, ui.save.stats.itemsHit]).toEqual([10, 1]);
    ui.raceOver({ results: results(IDS), trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: true });
    const toast = document.querySelector('#ui .toast')!;
    expect(toast.textContent).toBe("Unlocked: Sprocket's Mint paint!");
    expect(toast.classList.contains('on')).toBe(true);
    expect(ui.save.unlocked.skins).toEqual(['sprocket-alt']);
    ui.dispose();
    // the title's Unlocks list shows it earned and the rest locked with how to get them
    document.body.innerHTML = '';
    const again = new UiRoot(document.body, host(), null);
    again.save.unlocked.skins = ['sprocket-alt'];
    again.dispatch({ type: 'boot' });
    (document.querySelector('#ui .title.on [data-id="unlocks"]') as HTMLElement).click();
    expect(again.app.overlays).toEqual(['unlocks']);
    const rows = [...document.querySelectorAll('#ui .unlocks.on .unlock')];
    expect(rows.length).toBe(6);
    expect(rows.filter((r) => r.classList.contains('on')).map((r) => r.querySelector('b')?.textContent)).toEqual(["Sprocket's Mint paint"]);
    expect(document.querySelector('#ui .unlocks.on .made')?.textContent).toBe('1 of 6 unlocked');
    again.nav('back');
    expect(again.app.overlays).toEqual([]);
    again.dispose();
  });
});
