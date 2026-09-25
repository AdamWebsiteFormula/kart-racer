// @vitest-environment jsdom
// Screen transitions (sweep 24 Sept 2026): every screen change is one quick move (UI.wipeMs) in the
// stylesheet: the screen going stays on show while it leaves (x-out), the one coming slides in (x-in),
// back runs the other way, a dialog pops in and out, and a view drawn again as the next screen (results
// → standings) leaves a ghost of its old face. Keys, clicks, taps and the pad do nothing until it ends:
// dropped, never queued. Reduced motion: a plain cut. The stylesheet moves only transforms and opacity.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { applyResults, createGrandPrix } from '../../race-manager/series.ts';
import type { RaceResults } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { UiRoot, type UiHost } from '../ui.ts';

function host(): UiHost & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    builtTracks: new Set(['harbour-loop']),
    medalTimes: new Map(),
    availableModes: new Set(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']),
    creditsMarkdown: '',
    startRace: (p) => calls.push(`start:${p.mode}`),
    nextRace: () => calls.push('next'),
    restartRace: () => calls.push('restart'),
    quitRace: () => calls.push('quit'),
    setPaused: (p) => calls.push(`paused:${p}`),
    settingsChanged: () => calls.push('settings'),
    skipIntro: () => calls.push('skip'),
  };
}

/** a UiRoot on a clock the test moves, taking its events as the player's (the guards hold only those) */
function make(reduced = false) {
  document.body.innerHTML = '';
  const h = host();
  const ui = new UiRoot(document.body, h, null);
  if (reduced) ui.save.settings.reducedMotion = 'on';
  const t = { now: 1000 };
  ui.clock = () => t.now;
  ui.trusted = () => true;
  ui.dispatch({ type: 'boot' });
  t.now += 1000;
  return { ui, h, t };
}

const key = (code: string, k = code) => dispatchEvent(new KeyboardEvent('keydown', { code, key: k, bubbles: true }));
const view = (cls: string) => document.querySelector(`#ui > .screen.${cls}:not(.x-ghost)`) as HTMLElement;
/** each view moving: its own class (title, mode-screen, settings…), in or out, and which way */
const moving = () => [...document.querySelectorAll<HTMLElement>('#ui .x-in, #ui .x-out')].map((e) => {
  const name = e.classList.contains('x-ghost') ? 'ghost' : [...e.classList].filter((c) => !['screen', 'overlay', 'on', 'x-in', 'x-out'].includes(c)).join('.');
  return `${name} ${e.classList.contains('x-in') ? 'in' : 'out'} ${e.dataset.x}`;
});
const focused = () => (document.activeElement as HTMLElement | null)?.dataset.id;

function results(ids: string[]): RaceResults {
  return {
    mode: 'grandPrix', trackId: 'harbour-loop', speedClass: 150, seed: 1, goTick: 360,
    ranks: ids.map((id, i) => ({ racerId: id, rank: i + 1, finishTick: 1000 + i * 60, timeMs: 50000 + i * 500, lapTimesMs: [17000, 16500, 16500 + i * 500], dnf: false, projectedMs: -1 })),
  };
}
const IDS = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];

afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('screen transitions', () => {
  it('the screen going slides out while the one coming slides in; back runs the other way; all of it ends after UI.wipeMs', () => {
    vi.useFakeTimers();
    const { ui } = make();
    ui.dispatch({ type: 'start' });
    expect(moving()).toEqual(['title out fwd', 'mode-screen in fwd']);
    // the one going stays on show (the stylesheet shows .x-out) but is no longer the screen on top
    expect(view('title').classList.contains('on')).toBe(false);
    expect(ui.changingScreen).toBe(true);
    vi.advanceTimersByTime(UI.wipeMs + 50);
    expect(moving()).toEqual([]);
    ui.dispatch({ type: 'back' });
    expect(moving()).toEqual(['title in back', 'mode-screen out back']);
    ui.dispose();
  });

  it('a dialog pops in over the screen, which stays put under it; closed, it pops out and the screen does not come in again', () => {
    vi.useFakeTimers();
    const { ui } = make();
    ui.dispatch({ type: 'openSettings' });
    expect(moving()).toEqual(['settings in fwd']);
    vi.advanceTimersByTime(UI.wipeMs + 50);
    ui.dispatch({ type: 'back' });
    expect(moving()).toEqual(['settings out back']);
    ui.dispose();
  });

  it('results → standings: the one view drawn again leaves a ghost of the results that goes, hidden from assistive tech and unclickable', () => {
    vi.useFakeTimers();
    const { ui, t } = make();
    for (const a of [{ type: 'start' }, { type: 'pickMode', mode: 'grandPrix' }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickCup', cupId: 'sunrise' }] as const) ui.dispatch(a);
    const gp = createGrandPrix({ id: 'sunrise', trackIds: ['harbour-loop', 'harbour-loop', 'harbour-loop'] }, IDS.map((id) => ({ racerId: id, archetype: 'medium' as const, isPlayer: id === 'pip' })), 150, 1);
    const before = structuredClone(gp);
    applyResults(gp, results(IDS));
    ui.raceOver({ results: results(IDS), trackName: 'Harbor Loop', playerId: 'pip', gp: { before, after: gp }, seriesHasNext: true });
    vi.advanceTimersByTime(UI.wipeMs + 50);
    t.now += 1000;
    ui.dispatch({ type: 'continue' });
    expect(ui.app.screen).toBe('gpTable');
    const ghost = document.querySelector<HTMLElement>('#ui .x-ghost')!;
    expect(ghost.querySelector('h2')?.textContent).toBe('You win!');
    expect([ghost.getAttribute('aria-hidden'), ghost.inert, ghost.classList.contains('on'), ghost.classList.contains('x-out')]).toEqual(['true', true, false, true]);
    // the view itself is the standings, coming in; only it answers
    expect(document.querySelector('#ui .results.on h2')?.textContent).toBe('Race 1 of 3');
    expect(moving()).toEqual(['results in fwd', 'ghost out fwd']);
    vi.advanceTimersByTime(UI.wipeMs + 50);
    expect(document.querySelector('#ui .x-ghost')).toBeNull();
    ui.dispose();
  });

  it('reduced motion: a plain cut, no transition at all', () => {
    vi.useFakeTimers();
    const { ui } = make(true);
    ui.dispatch({ type: 'start' });
    expect(moving()).toEqual([]);
    expect(ui.changingScreen).toBe(false);
    ui.dispose();
  });
});

describe('input while the screen changes: dropped, never queued', () => {
  it('keys do nothing until it ends, and nothing fires when it does; then they work at once', () => {
    const { ui, t } = make();
    key('Enter'); // Race!
    expect(ui.app.screen).toBe('modeSelect');
    expect(focused()).toBe('quick');
    t.now += UI.wipeMs / 2;
    key('ArrowRight');
    key('Enter');
    expect([ui.app.screen, focused()]).toEqual(['modeSelect', 'quick']);
    t.now += UI.wipeMs / 2; // it is over: nothing kept from during it
    expect([ui.app.screen, focused()]).toEqual(['modeSelect', 'quick']);
    key('ArrowRight');
    expect(focused()).toBe('grandPrix');
    key('Enter');
    expect(ui.app.screen).toBe('rosterSelect');
    ui.dispose();
  });

  it('a click lands nowhere until it ends', () => {
    const { ui, t } = make();
    ui.dispatch({ type: 'start' });
    t.now += 100;
    (document.querySelector('#ui .mode-screen [data-id="timeTrial"]') as HTMLElement).click();
    expect(ui.app.screen).toBe('modeSelect');
    t.now += UI.wipeMs;
    (document.querySelector('#ui .mode-screen [data-id="timeTrial"]') as HTMLElement).click();
    expect([ui.app.screen, ui.app.mode]).toEqual(['rosterSelect', 'timeTrial']);
    ui.dispose();
  });

  it('a pad press during it is spent: A held on does not confirm once the screen has changed, a tap of the d-pad does not move late; a fresh press does', () => {
    const pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    const { ui, t } = make();
    const poll = () => ui.poll(t.now);
    ui.dispatch({ type: 'start' });
    t.now += 60;
    pad.buttons[15].pressed = true; poll(); pad.buttons[15].pressed = false; poll(); // right, tapped while the modes slide in
    t.now += 40;
    pad.buttons[0].pressed = true; poll(); // A, held
    expect([ui.app.screen, focused()]).toEqual(['modeSelect', 'quick']);
    t.now += UI.wipeMs;
    poll(); poll(); // over: nothing kept from during it
    expect([ui.app.screen, focused()]).toEqual(['modeSelect', 'quick']);
    pad.buttons[0].pressed = false; poll();
    pad.buttons[15].pressed = true; poll(); pad.buttons[15].pressed = false; poll();
    expect(focused()).toBe('grandPrix');
    pad.buttons[0].pressed = true; poll();
    expect([ui.app.screen, ui.app.mode]).toEqual(['rosterSelect', 'grandPrix']);
    ui.dispose();
    delete (navigator as { getGamepads?: unknown }).getGamepads;
  });

  it('into a race: a second press of the one that started it does not skip the course intro unseen; after the move one does', () => {
    const { ui, h, t } = make();
    for (const a of [{ type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }] as const) ui.dispatch(a);
    t.now += 1000;
    key('Enter'); // Harbor Loop
    expect(ui.app.screen).toBe('racing');
    ui.introCard({ cup: 'Sunrise Cup', cupId: 'sunrise', name: 'Harbor Loop', sub: 'Quick Race · 100cc', racer: null, skip: { keys: 'k', pad: 'p' }, bg: '#000000', accent: '#ffffff' });
    t.now += 60;
    key('Enter');
    dispatchEvent(new Event('pointerdown'));
    expect(h.calls).not.toContain('skip');
    t.now += UI.wipeMs;
    key('KeyW', 'w');
    expect(h.calls.filter((c) => c === 'skip')).toHaveLength(1);
    ui.dispose();
  });

  it('a script\'s events (the tests, the dev console) are never held', () => {
    const { ui } = make();
    ui.trusted = () => false;
    key('Enter');
    key('Enter');
    expect(ui.app.screen).toBe('rosterSelect');
    ui.dispose();
  });
});

describe('the stylesheet\'s transitions', () => {
  let css = '';
  beforeAll(async () => {
    const fs = (await import('node:fs' as string)) as { readFileSync(p: string, enc: 'utf8'): string };
    css = fs.readFileSync(decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/render\/[^/]+$/, 'ui.css')), 'utf8');
  });
  const sheet = () => {
    document.head.innerHTML = '';
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
    return s.sheet!;
  };

  it('move only transforms and opacity (the compositor runs them: the camera behind never waits)', () => {
    const names = new Set<string>();
    for (const r of sheet().cssRules) {
      if (!(r instanceof CSSKeyframesRule) || !r.name.startsWith('x-')) continue;
      names.add(r.name);
      for (const k of r.cssRules) {
        const style = (k as CSSKeyframeRule).style;
        for (let i = 0; i < style.length; i++) expect(['opacity', 'transform'], `${r.name} ${style[i]}`).toContain(style[i]);
      }
    }
    expect([...names].sort()).toEqual(['x-arrive', 'x-arrive-back', 'x-fade-in', 'x-fade-out', 'x-leave', 'x-leave-back', 'x-pop-out']);
  });

  it('last as long as the input waits: the tokens are UI.wipeMs and UI.wipeOutMs, and the screen coming ends on UI.wipeMs', () => {
    let root: CSSStyleDeclaration | null = null;
    for (const r of sheet().cssRules) if (r instanceof CSSStyleRule && r.selectorText === ':root') root = r.style;
    expect(root?.getPropertyValue('--t-wipe').trim()).toBe(`${UI.wipeMs}ms`);
    expect(root?.getPropertyValue('--t-wipe-out').trim()).toBe(`${UI.wipeOutMs}ms`);
    expect(UI.wipeMs).toBeGreaterThanOrEqual(180);
    expect(UI.wipeMs).toBeLessThanOrEqual(260);
    expect(UI.wipeOutMs).toBeLessThan(UI.wipeMs);
    // the screen coming starts late by the lag and runs the rest of the wipe
    expect(css).toMatch(/\.screen\.x-in > \.stage \{ animation: x-arrive calc\(var\(--t-wipe\) - var\(--t-wipe-lag\)\) var\(--out\) var\(--t-wipe-lag\) backwards; \}/);
    // reduced motion drops every animation to 1 ms; UiRoot adds no transition then anyway
    expect(css).toMatch(/:root\[data-reduced-motion='on'\] \*,/);
  });
});
