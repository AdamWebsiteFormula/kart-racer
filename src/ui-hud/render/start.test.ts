// @vitest-environment jsdom
// The start screen (design §12, 28 Sept 2026; Adam, on the title: "The game should have music playing here"): the
// title before its menu, as Mario Kart World's. Any key a browser starts sound from, a pad's button, a click or a tap
// presses it through, and that press is only the press: the host hears it first (it starts the music from it) and
// the menu comes in with nothing picked. Back from the Mode screen comes straight to the menu.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UI } from '../constants.ts';
import { START_PROMPT } from '../screens/menus.ts';
import { UiRoot, type UiHost } from '../ui.ts';

function host(): UiHost & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    builtTracks: new Set(['harbour-loop']),
    medalTimes: new Map(),
    availableModes: new Set(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']),
    creditsMarkdown: '',
    startRace: () => calls.push('race'),
    nextRace: () => undefined,
    restartRace: () => undefined,
    quitRace: () => undefined,
    setPaused: () => undefined,
    settingsChanged: () => undefined,
    // (what the game does here: audio.unlock(), main.ts)
    pressedStart: () => calls.push('pressed'),
  };
}

/** A UiRoot on the start screen, on a clock the test moves, taking its events as the player's (the guards hold only those). */
function make(opts: { reduced?: boolean } = {}) {
  document.body.innerHTML = '';
  const h = host();
  const ui = new UiRoot(document.body, h, null);
  if (opts.reduced) ui.save.settings.reducedMotion = 'on';
  const t = { now: 1000 };
  ui.clock = () => t.now;
  ui.trusted = () => true;
  ui.dispatch({ type: 'boot' });
  t.now += 1000;
  return { ui, h, t };
}

const key = (code: string, k = code, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { code, key: k, bubbles: true, cancelable: true, ...init });
  dispatchEvent(e);
  return e;
};
const title = () => document.querySelector<HTMLElement>('#ui .title')!;
const focused = () => (document.activeElement as HTMLElement | null)?.dataset.id;
const pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };

afterEach(() => {
  delete (navigator as { getGamepads?: unknown }).getGamepads;
  for (const b of pad.buttons) b.pressed = false;
  pad.axes.fill(0);
  vi.restoreAllMocks();
});

describe('the start screen', () => {
  it('opens the title: the logo big over the attract race and the prompt, its one stop, a focused button named by its words', () => {
    const { ui } = make();
    expect([ui.app.screen, ui.app.pressed]).toEqual(['title', undefined]);
    expect(title().classList.contains('start')).toBe(true);
    expect(title().getAttribute('aria-label')).toBe('Rascal Rally!');
    expect(document.querySelector('#ui .title .logo-box > .logo')!.textContent).toBe('RascalRally!');
    expect(document.querySelectorAll('#ui .title .band').length, 'no menu yet').toBe(0);
    const p = document.querySelector<HTMLButtonElement>('#ui .title .start-prompt')!;
    // a real button with the focus: a screen reader says it as the page opens; its name is the words on show
    expect([p.tagName, p.type, p.tabIndex, document.activeElement === p, p.getAttribute('aria-hidden')]).toEqual(['BUTTON', 'button', 0, true, null]);
    expect([...p.children].map((c) => `${c.className}: ${c.textContent}`)).toEqual(['only-keys: Press any key', 'only-pad: Press any button', 'tap: Tap to start']);
    expect(START_PROMPT).toEqual({ keys: 'Press any key', pad: 'Press any button', touch: 'Tap to start' });
    ui.dispose();
  });

  it('any key a browser starts sound from presses it through, and only that: the host hears it first, the menu comes in, nothing is picked', () => {
    const { ui, h, t } = make();
    // Escape (never a user activation), a modifier alone, a browser shortcut, an auto-repeat, F (fullscreen): nothing
    const none: [string, string, KeyboardEventInit?][] = [
      ['Escape', 'Escape'], ['ShiftLeft', 'Shift'], ['ControlLeft', 'Control'], ['MetaLeft', 'Meta'], ['CapsLock', 'CapsLock'],
      ['KeyR', 'r', { metaKey: true }], ['KeyT', 't', { ctrlKey: true }], ['Enter', 'Enter', { repeat: true }], ['KeyF', 'f'],
    ];
    for (const [code, k, init] of none) key(code, k, init);
    expect([ui.app.pressed, h.calls]).toEqual([undefined, []]);
    const e = key('KeyA', 'a');
    expect(e.defaultPrevented).toBe(true);
    expect(h.calls, 'told once, from the press itself').toEqual(['pressed']);
    expect([ui.app.screen, ui.app.pressed, title().classList.contains('start'), title().classList.contains('woke')]).toEqual(['title', true, false, true]);
    expect(document.querySelectorAll('#ui .title .band').length).toBe(5);
    expect(focused(), 'Race! has the focus, not picked').toBe('start');
    // Enter pressed twice: the second half of the double press picks nothing while the menu comes in
    t.now += 40;
    key('Enter');
    expect(ui.app.screen).toBe('title');
    t.now += UI.wipeMs;
    key('Enter');
    expect(ui.app.screen).toBe('modeSelect');
    expect(h.calls).toEqual(['pressed']);
    ui.dispose();
  });

  it('any button on a pad presses it through, on the pad\'s first poll too; the stick does not; the button held picks nothing until pressed again', () => {
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    const first = make();
    pad.buttons[3].pressed = true; // Y, down as the page first sees the pad (a browser shows a pad only once a button is pressed)
    first.ui.poll(first.t.now);
    expect([first.ui.app.pressed, first.h.calls]).toEqual([true, ['pressed']]);
    first.ui.dispose();
    pad.buttons[3].pressed = false;

    const { ui, h, t } = make();
    pad.axes[1] = -1; // the stick pushed: no button (a drifting stick must not start the game)
    ui.poll(t.now);
    pad.axes[1] = 0;
    ui.poll((t.now += 16));
    expect(ui.app.pressed).toBeUndefined();
    expect(document.documentElement.dataset.input, 'the prompt now says a pad\'s words').toBe('pad');
    pad.buttons[0].pressed = true;
    ui.poll((t.now += 16));
    expect([ui.app.pressed, h.calls]).toEqual([true, ['pressed']]);
    // A still down as the menu comes in, and after the move: nothing picked
    ui.poll((t.now += 16));
    t.now += UI.wipeMs;
    ui.poll((t.now += 16));
    expect([ui.app.screen, focused()]).toEqual(['title', 'start']);
    // let go and pressed again: Race!
    pad.buttons[0].pressed = false;
    ui.poll((t.now += 16));
    pad.buttons[0].pressed = true;
    ui.poll((t.now += 16));
    expect(ui.app.screen).toBe('modeSelect');
    ui.dispose();
  });

  it('a click or a tap anywhere presses it through (a pointer passing over does nothing); the rest of a double click lands on no band', () => {
    const { ui, h, t } = make();
    const logo = document.querySelector<HTMLElement>('#ui .title .logo')!;
    logo.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 300, clientY: 200 }));
    expect(ui.app.pressed).toBeUndefined();
    logo.click();
    expect([ui.app.pressed, h.calls]).toEqual([true, ['pressed']]);
    t.now += 60;
    document.querySelector<HTMLElement>('#ui .title [data-id="start"]')!.click();
    expect(ui.app.screen).toBe('title');
    ui.dispose();
    // a tap: the finger's pointerdown, then its click
    const tap = make();
    dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
    expect(tap.ui.app.pressed).toBeUndefined();
    document.querySelector<HTMLElement>('#ui .title .start-prompt')!.click();
    expect([tap.ui.app.pressed, tap.h.calls]).toEqual([true, ['pressed']]);
    tap.ui.dispose();
  });

  it('back from the Mode screen: the title\'s menu at once, no start screen and no second press', () => {
    const { ui, h, t } = make();
    key('Enter');
    t.now += 1000;
    key('Enter'); // Race!
    expect(ui.app.screen).toBe('modeSelect');
    t.now += 1000;
    key('Escape');
    expect([ui.app.screen, title().classList.contains('start'), title().classList.contains('woke')]).toEqual(['title', false, false]);
    expect(document.querySelectorAll('#ui .title .band').length).toBe(5);
    expect(document.querySelector('#ui .title .start-prompt')).toBeNull();
    expect(focused()).toBe('start');
    expect(h.calls).toEqual(['pressed']);
    ui.dispose();
  });

  it('the logo glides from where it stood big to its place over the menu (one move, transform only); with reduced motion it is simply there', () => {
    // jsdom has no layout: the big logo at the top middle, the menu's at the top left
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const big = this.closest('.title')?.classList.contains('start');
      return (big ? { left: 500, top: 60, width: 630, height: 300 } : { left: 62, top: 180, width: 450, height: 214 }) as DOMRect;
    });
    const played: { el: HTMLElement; frames: Keyframe[]; opts: KeyframeAnimationOptions }[] = [];
    const proto = HTMLElement.prototype as unknown as { animate?: unknown };
    proto.animate = function (this: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions) { played.push({ el: this, frames, opts }); return {}; };
    try {
      const { ui } = make();
      key('Enter');
      expect(played).toHaveLength(1);
      expect(played[0].el.classList.contains('logo-box')).toBe(true);
      expect(played[0].frames.map((f) => f.transform)).toEqual([`translate(438px, -120px) scale(${630 / 450})`, 'none']);
      expect(played[0].opts.duration).toBe(UI.startGlideMs);
      // the bands slide in one after another, from UI.startBandMs
      const bands = [...document.querySelectorAll<HTMLElement>('#ui .title .band')];
      expect(bands.map((b) => b.style.getPropertyValue('--delay'))).toEqual([0, 1, 2, 3, 4].map((i) => `${UI.startBandMs + i * UI.startBandStaggerMs}ms`));
      ui.dispose();

      played.length = 0;
      const calm = make({ reduced: true });
      key('Enter');
      expect(calm.ui.app.pressed).toBe(true);
      expect(played, 'reduced motion: no glide').toHaveLength(0);
      // no move to wait out, but a double press's second half is still held back (UI.screenGuardMs)
      calm.t.now += 40;
      key('Enter');
      expect(calm.ui.app.screen).toBe('title');
      calm.t.now += UI.screenGuardMs;
      key('Enter');
      expect(calm.ui.app.screen).toBe('modeSelect');
      calm.ui.dispose();
    } finally {
      delete proto.animate;
    }
  });
});
