// @vitest-environment jsdom
// Fullscreen (fullscreen.ts): the F key on any screen and a Settings row, both asking the browser from
// the press itself; the row is the browser's state, never the save's, and is not there without the API
// (iPhone Safari; jsdom too, until a test gives it one); a refused request is let go.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { introCard } from './screens/intro.ts';
import { SETTING_HELP } from './screens/menus.ts';
import { fullscreenState, fullscreenSupported, toggleFullscreen, type FullscreenDoc } from './fullscreen.ts';
import { isFullscreenKey } from './input.ts';
import { isRaceKey } from '../kart-controller/input.ts';
import { UiRoot, type UiHost } from './ui.ts';

/** A browser's fullscreen, faked: `refuse` rejects every request, as a browser does without a gesture. */
function fakeDoc(refuse = false) {
  const doc = {
    fullscreenEnabled: true,
    fullscreenElement: null as Element | null,
    documentElement: { requestFullscreen: vi.fn(async () => { if (refuse) throw new TypeError('not allowed'); doc.fullscreenElement = {} as Element; }) },
    exitFullscreen: vi.fn(async () => { doc.fullscreenElement = null; }),
  };
  return doc;
}

describe('fullscreen, pure', () => {
  it('is there only with the API (an iPhone has none), and reads the browser\'s state', () => {
    expect(fullscreenSupported(undefined)).toBe(false);
    expect(fullscreenSupported({ documentElement: {} })).toBe(false);
    expect(fullscreenSupported({ fullscreenEnabled: false, documentElement: { requestFullscreen: async () => {} } })).toBe(false);
    const d = fakeDoc();
    expect(fullscreenSupported(d)).toBe(true);
    expect(fullscreenState(d)).toBe(false);
    d.fullscreenElement = {} as Element;
    expect(fullscreenState(d)).toBe(true);
    expect(fullscreenState({ documentElement: {} })).toBeNull();
  });

  it('toggles: in when out, out when in; a refused request (no gesture, a pad\'s press) or an old engine\'s throw is let go', async () => {
    const d = fakeDoc();
    toggleFullscreen(d);
    await Promise.resolve();
    expect(d.documentElement.requestFullscreen).toHaveBeenCalledOnce();
    expect(fullscreenState(d)).toBe(true);
    toggleFullscreen(d);
    expect(d.exitFullscreen).toHaveBeenCalledOnce();
    const refused = fakeDoc(true);
    expect(() => toggleFullscreen(refused)).not.toThrow();
    await new Promise((r) => setTimeout(r, 0)); // an unhandled rejection would fail the run here
    expect(fullscreenState(refused)).toBe(false);
    const old: FullscreenDoc = { fullscreenEnabled: true, documentElement: { requestFullscreen: () => { throw new Error('old'); } } };
    expect(() => toggleFullscreen(old)).not.toThrow();
  });

  it('F is the key, alone: never Ctrl+F or Cmd+F (the browser\'s find), and never a driving key', () => {
    expect(isFullscreenKey({ code: 'KeyF', key: 'f' })).toBe(true);
    expect(isFullscreenKey({ code: '', key: 'F' })).toBe(true);
    expect(isFullscreenKey({ code: 'KeyF', key: 'f', ctrlKey: true })).toBe(false);
    expect(isFullscreenKey({ code: 'KeyF', key: 'f', metaKey: true })).toBe(false);
    expect(isFullscreenKey({ code: 'KeyG', key: 'g' })).toBe(false);
    expect(isRaceKey('KeyF')).toBe(false);
  });
});

function host(): UiHost & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    builtTracks: new Set(['harbour-loop']),
    medalTimes: new Map(),
    availableModes: new Set(['quick']),
    creditsMarkdown: '',
    startRace: () => calls.push('start'), nextRace: () => {}, restartRace: () => {}, quitRace: () => {}, setPaused: () => {},
    settingsChanged: () => calls.push('settings'),
    skipIntro: () => calls.push('skip'),
  };
}

/** Gives jsdom's document a working fullscreen API, as a desktop browser has. */
function browserFullscreen(refuse = false) {
  const el = document.documentElement as HTMLElement & { requestFullscreen: () => Promise<void> };
  let on: Element | null = null;
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => true });
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => on });
  const change = () => document.dispatchEvent(new Event('fullscreenchange'));
  const request = vi.fn(async () => { if (refuse) throw new TypeError('Permissions check failed'); on = el; change(); });
  const exit = vi.fn(async () => { on = null; change(); });
  el.requestFullscreen = request;
  (document as unknown as { exitFullscreen: () => Promise<void> }).exitFullscreen = exit;
  /** the browser leaving fullscreen by itself (Esc, its own button) */
  const leave = () => { on = null; change(); };
  return { request, exit, leave };
}

afterEach(() => {
  document.body.innerHTML = '';
  for (const k of ['fullscreenEnabled', 'fullscreenElement', 'exitFullscreen']) delete (document as unknown as Record<string, unknown>)[k];
  delete (document.documentElement as unknown as Record<string, unknown>).requestFullscreen;
});

const key = (code: string, init: KeyboardEventInit = {}) => dispatchEvent(new KeyboardEvent('keydown', { code, key: code === 'KeyF' ? 'f' : code, ...init }));
const row = () => document.querySelector<HTMLElement>('#ui .settings.on [data-id="fullscreen"]');
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('fullscreen in the game', () => {
  it('no API, no row: Settings has no Fullscreen, and F does nothing', () => {
    const ui = new UiRoot(document.body, host(), null);
    ui.dispatch({ type: 'boot' });
    ui.dispatch({ type: 'openSettings' });
    expect(row()).toBeNull();
    expect(() => key('KeyF')).not.toThrow();
    ui.dispose();
  });

  it('F on the title, in Settings and mid-race goes in and out; the row shows the state, follows Esc leaving, and is never saved', async () => {
    const fs = browserFullscreen();
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' });
    key('KeyF');
    await tick();
    expect(fs.request).toHaveBeenCalledOnce();
    ui.dispatch({ type: 'openSettings' });
    // after Resolution, saying what it does, showing On
    expect(row()!.querySelector('.label')!.textContent).toBe('Fullscreen');
    expect(row()!.getAttribute('aria-label')).toBe(`Fullscreen: On. ${SETTING_HELP.fullscreen} Left and right change it.`);
    expect(row()!.previousElementSibling!.getAttribute('data-id')).toBe('resolutionScale');
    // the browser leaves by itself (Esc): the row follows
    fs.leave();
    expect(row()!.getAttribute('aria-label')).toMatch(/^Fullscreen: Off\./);
    // a click on the row asks again, from the click itself
    row()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(fs.request).toHaveBeenCalledTimes(2);
    expect(row()!.getAttribute('aria-label')).toMatch(/^Fullscreen: On\./);
    // left and right on the keys, and F, all switch it
    ui.dispatch({ type: 'back' });
    ui.dispatch({ type: 'openSettings' });
    key('KeyF');
    await tick();
    expect(fs.exit).toHaveBeenCalledOnce();
    expect(row()!.getAttribute('aria-label')).toMatch(/^Fullscreen: Off\./);
    // never in the save, never the host's settingsChanged
    expect(JSON.stringify(ui.save)).not.toMatch(/fullscreen/i);
    expect(h.calls).not.toContain('settings');
    ui.dispose();
  });

  it('F does not skip the course intro, does not type into the name box, and Ctrl+F is the browser\'s', async () => {
    const fs = browserFullscreen();
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickTrack', trackId: 'harbour-loop' }] as const) ui.dispatch(a);
    ui.introCard(introCard({ trackId: 'harbour-loop', mode: 'quick', speedClass: 150, racerId: 'pip' }));
    const later = ui.clock() + 1000;
    ui.clock = () => later;
    key('KeyF');
    await tick();
    expect(fs.request).toHaveBeenCalledOnce();
    expect(h.calls).not.toContain('skip');
    key('KeyF', { ctrlKey: true });
    await tick();
    expect(fs.exit).not.toHaveBeenCalled();
    // a key other than F still skips the intro, as ever
    key('KeyW');
    expect(h.calls).toContain('skip');
    // in a text box, F is a letter
    const box = document.createElement('input');
    document.body.appendChild(box);
    box.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', key: 'f', bubbles: true }));
    await tick();
    expect(fs.exit).not.toHaveBeenCalled();
    ui.dispose();
  });

  it('a refused request (a pad\'s A in Settings: no gesture) is let go, and the row stays Off', async () => {
    browserFullscreen(true);
    const ui = new UiRoot(document.body, host(), null);
    ui.dispatch({ type: 'boot' });
    ui.dispatch({ type: 'openSettings' });
    row()!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();
    expect(row()!.getAttribute('aria-label')).toMatch(/^Fullscreen: Off\./);
    ui.dispose();
  });
});
