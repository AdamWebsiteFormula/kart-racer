// @vitest-environment jsdom
// The course intro's title card in the DOM (render/intro.ts) and its skip (UiRoot): on ink while the
// race's shaders compile, over the flight, leaving before the countdown; the HUD waits under it; any
// fresh key, pad button or tap skips it, but not a held or repeating one, and Escape still pauses.
import { afterEach, describe, expect, it } from 'vitest';
import { UI } from '../constants.ts';
import { UiRoot, type UiHost } from '../ui.ts';
import { introCard } from '../screens/intro.ts';
import { IntroCardView } from './intro.ts';

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

const card = () => introCard({ trackId: 'harbour-loop', mode: 'quick', speedClass: 150, racerId: 'pip' });
const key = (code: string, key = code, repeat = false) => dispatchEvent(new KeyboardEvent('keydown', { code, key, repeat, bubbles: true }));

/** A race begun from the menus, its intro's card up. */
function racing(): { ui: UiRoot; h: ReturnType<typeof host> } {
  const h = host();
  const ui = new UiRoot(document.body, h, null);
  for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickTrack', trackId: 'harbour-loop' }] as const) ui.dispatch(a);
  expect(ui.app.screen).toBe('racing');
  ui.introCard(card());
  // the menu's transition into the race is over (a press during it is dropped: transition.test.ts)
  const later = ui.clock() + UI.wipeMs + 1;
  ui.clock = () => later;
  return { ui, h };
}

let live: UiRoot | null = null;
afterEach(() => { live?.dispose(); live = null; document.body.innerHTML = ''; Reflect.deleteProperty(navigator, 'getGamepads'); });

describe('the course intro title card', () => {
  it('shows the track, its cup, the race and the racer, on ink until the flight starts, then leaves and goes', () => {
    const v = new IntroCardView(document.body);
    expect(v.root.getAttribute('data-phase')).toBe('off');
    v.show(card());
    expect(v.root.getAttribute('data-phase')).toBe('hold');
    expect(v.root.querySelector('.name')!.textContent).toBe('Harbor Loop');
    expect(v.root.querySelector('.cup')!.textContent).toBe('Sunrise Cup');
    expect(v.root.querySelector('.sub')!.textContent).toBe('Quick Race · 150cc');
    expect(v.root.querySelector('.who')!.textContent).toBe('Pip');
    // the keys' words or a pad's, whichever was used last (the stylesheet shows one)
    expect([...v.root.querySelectorAll('.skip > span')].map((e) => `${e.className}: ${e.textContent}`))
      .toEqual(['only-keys: Press any key or button to skip', 'only-pad: Press any button to skip']);
    expect((v.root.querySelector('.face') as HTMLElement).style.getPropertyValue('--portrait')).toContain('art/racers/pip.webp');
    expect(v.root.getAttribute('role')).toBe('status');
    expect(v.root.getAttribute('aria-live')).toBe('polite');
    for (const p of ['show', 'out', 'off'] as const) { v.set(p); expect(v.root.getAttribute('data-phase')).toBe(p); }
    // no racer: no chip
    v.show(introCard({ trackId: 'harbour-loop', mode: 'quick', speedClass: 150, racerId: null }));
    expect((v.root.querySelector('.driver') as HTMLElement).style.display).toBe('none');
  });

  it('the race HUD waits under it and comes back when it goes', () => {
    const { ui } = racing();
    live = ui;
    const hud = document.querySelector('.screen.hud')!;
    expect(hud.classList.contains('intro-on')).toBe(true);
    expect(hud.querySelector('.intro')!.getAttribute('data-phase')).toBe('hold');
    expect(ui.introOn).toBe(true);
    ui.introPhase('show');
    expect(hud.querySelector('.intro')!.getAttribute('data-phase')).toBe('show');
    ui.introPhase('out');
    expect(hud.querySelector('.intro')!.getAttribute('data-phase')).toBe('out');
    ui.introCard(null);
    expect(hud.classList.contains('intro-on')).toBe(false);
    expect(ui.introOn).toBe(false);
    ui.introPhase('show'); // nothing to show once it has gone
    expect(hud.querySelector('.intro')!.getAttribute('data-phase')).toBe('off');
  });
});

describe('skipping the course intro', () => {
  it('any fresh key skips it; a repeat (the Enter that started the race, held) or a bare modifier does not; Escape pauses', () => {
    const { ui, h } = racing();
    live = ui;
    key('Enter', 'Enter', true);
    key('MetaLeft', 'Meta');
    expect(h.calls.filter((c) => c === 'skip')).toHaveLength(0);
    key('KeyW', 'w');
    expect(h.calls.filter((c) => c === 'skip')).toHaveLength(1);
    key('Escape', 'Escape');
    expect(ui.paused).toBe(true);
    expect(h.calls.filter((c) => c === 'skip')).toHaveLength(1);
    // paused, keys work the pause menu, never the intro
    key('ArrowDown', 'ArrowDown');
    expect(h.calls.filter((c) => c === 'skip')).toHaveLength(1);
  });

  it('a tap or a click anywhere skips it', () => {
    const { ui, h } = racing();
    live = ui;
    dispatchEvent(new Event('pointerdown'));
    expect(h.calls).toContain('skip');
  });

  it('a fresh pad button skips it (Start pauses); the A still held from the menu does not', () => {
    const { ui, h } = racing();
    live = ui;
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [{ connected: true, buttons, axes: [0, 0, 0, 0] }] });
    buttons[0].pressed = true; // A, down since the menu
    ui.poll(0);
    ui.poll(16);
    expect(h.calls.filter((c) => c === 'skip')).toHaveLength(0);
    buttons[1].pressed = true; // B, pressed now
    ui.poll(32);
    expect(h.calls.filter((c) => c === 'skip')).toHaveLength(1);
    ui.poll(48); // still held: no second skip
    expect(h.calls.filter((c) => c === 'skip')).toHaveLength(1);
    ui.introCard(null);
    buttons[1].pressed = false; ui.poll(64);
    buttons[1].pressed = true; ui.poll(80); // the intro is over: a button is the race's again
    expect(h.calls.filter((c) => c === 'skip')).toHaveLength(1);
  });

  it('no card, no skip: a key in the race is the race\'s', () => {
    const { ui, h } = racing();
    live = ui;
    ui.introCard(null);
    key('KeyW', 'w');
    dispatchEvent(new Event('pointerdown'));
    expect(h.calls).not.toContain('skip');
  });
});
