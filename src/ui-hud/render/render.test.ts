// @vitest-environment jsdom
// DOM smoke tests: the renderers build the right nodes, the HUD writes nothing when nothing
// changed (SOP test 15), and every screen has the accessibility shape (SOP test 16).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKartState } from '../../kart-controller/types.ts';
import { ITEM_DEFINITIONS } from '../../items/data.ts';
import type { RaceState } from '../../race-manager/types.ts';
import { UI } from '../constants.ts';
import { feedHud, hudModel, newHudMemory } from '../hudModel.ts';
import { UiRoot, type UiHost } from '../ui.ts';
import { HudView } from './hud.ts';

const defs = ITEM_DEFINITIONS.map((d) => ({ id: d.id, name: d.name }));
const race = { mode: 'quick', lapsTotal: 3, time: 12.5, phase: 'racing' } as RaceState;

function kart() {
  const k = createKartState({ racerId: 'p', isPlayer: true });
  k.lap = 1; k.rank = 5; k.coins = 2; k.speed = 20;
  k.item.held = 'beachBall'; k.item.charges = 1;
  return k;
}

function host(): UiHost & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    builtTracks: new Set(['harbour-loop']),
    availableModes: new Set(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']),
    creditsMarkdown: '## Code\n| Work | Author | Licence |\n|---|---|---|\n| three.js | mrdoob | MIT |\n',
    startRace: (p) => calls.push(`start:${p.mode}:${p.racerId}:${p.tracks.join('+')}`),
    nextRace: () => calls.push('next'),
    restartRace: () => calls.push('restart'),
    quitRace: () => calls.push('quit'),
    setPaused: (p) => calls.push(`paused:${p}`),
    settingsChanged: () => calls.push('settings'),
  };
}

const key = (code: string) => dispatchEvent(new KeyboardEvent('keydown', { code, key: code }));

describe('HUD renderer', () => {
  it('SOP test 15: a second render with the same state writes nothing to the DOM', () => {
    document.body.innerHTML = '';
    const v = new HudView(document.body);
    const m = newHudMemory();
    const vm = () => hudModel(race, kart(), 5, 10, m, 1, defs, 0);
    v.render(vm());
    expect(v.root.querySelector('.place .n')!.textContent).toBe('5');
    expect(v.root.querySelector('.slot')!.getAttribute('data-state')).toBe('ready');
    const text = vi.spyOn(Node.prototype, 'textContent', 'set');
    const attr = vi.spyOn(Element.prototype, 'setAttribute');
    const html = vi.spyOn(Element.prototype, 'innerHTML', 'set');
    v.render(vm());
    expect(text).not.toHaveBeenCalled();
    expect(attr).not.toHaveBeenCalled();
    expect(html).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('SOP test 3: a rank change writes the numeral on the same frame, and the banner is a live region', () => {
    document.body.innerHTML = '';
    const v = new HudView(document.body);
    const m = newHudMemory();
    v.render(hudModel(race, kart(), 5, 10, m, 1, defs, 0));
    feedHud(m, [{ type: 'positionChange', racerId: 'p', rank: 4 }], [], 'p', 1);
    v.render(hudModel(race, kart(), 4, 10, m, 1, defs, 0));
    expect(v.root.querySelector('.place .n')!.textContent).toBe('4');
    expect(v.root.querySelector('.place')!.classList.contains('flourish')).toBe(true);
    const banner = v.root.querySelector('.banner')!;
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });
});

describe('UiRoot', () => {
  it('SOP test 1 in the DOM: keys alone walk title → mode → roster → track → race, and Escape pauses', () => {
    document.body.innerHTML = '';
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' });
    expect(ui.app.screen).toBe('title');
    key('Enter'); // Race!
    expect(ui.app.screen).toBe('modeSelect');
    key('Enter'); // Quick Race
    expect(ui.app.screen).toBe('rosterSelect');
    key('ArrowRight'); // Momo
    key('Enter');
    expect(ui.app.screen).toBe('trackSelect');
    expect(document.querySelectorAll('#ui .track-card').length).toBe(1); // the one built track
    key('Enter');
    expect(ui.app.screen).toBe('racing');
    expect(h.calls).toContain('start:quick:momo:harbour-loop');
    key('Escape');
    expect(ui.paused).toBe(true);
    expect(h.calls).toContain('paused:true');
    // under the pause dialog the HUD is inert; only one button on the dialog is a Tab stop
    expect((document.querySelector('#ui .hud') as HTMLElement).inert).toBe(true);
    key('ArrowDown'); key('ArrowDown'); key('ArrowUp');
    expect(document.querySelectorAll('#ui .pause [tabindex="0"]').length).toBe(1);
    key('Enter'); // Restart
    expect(h.calls).toContain('restart');
    expect(ui.paused).toBe(false);
    ui.dispose();
  });

  it('SOP test 16: every screen has a labelled landmark, real buttons, and one focused entry', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, host(), null);
    const check = () => {
      const on = [...document.querySelectorAll<HTMLElement>('#ui .screen.on')];
      const top = on[on.length - 1];
      expect(top.getAttribute('aria-label'), top.className).toBeTruthy();
      const buttons = [...top.querySelectorAll('[data-id]')];
      for (const b of buttons) expect(b.tagName).toBe('BUTTON');
      if (buttons.length) expect(top.querySelectorAll('.focused').length).toBe(1);
    };
    ui.dispatch({ type: 'boot' }); check();
    ui.dispatch({ type: 'openSettings' }); check();
    ui.dispatch({ type: 'back' });
    ui.dispatch({ type: 'openCredits' }); check();
    expect(document.querySelector('#ui .credits')!.textContent).toContain('three.js');
    ui.dispatch({ type: 'back' });
    ui.dispatch({ type: 'start' }); check();
    ui.dispatch({ type: 'pickMode', mode: 'knockout' }); check();
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); check();
    // disabled cups are marked for assistive tech, not just greyed
    expect(document.querySelector('#ui .cup-screen [data-id="peaks"]')!.getAttribute('aria-disabled')).toBe('true');
    ui.dispose();
    expect(document.querySelector('#ui')).toBeNull();
  });

  it('settings: left and right change a value, save it, and tell the host', () => {
    document.body.innerHTML = '';
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' });
    ui.dispatch({ type: 'openSettings' });
    const before = ui.save.settings.masterVolume;
    key('ArrowLeft');
    expect(ui.save.settings.masterVolume).toBeCloseTo(before - 0.1);
    expect(h.calls).toContain('settings');
    // reduced motion writes the root attribute the stylesheet keys on
    for (let i = 0; i < 5; i++) key('ArrowDown');
    key('ArrowRight'); // Follow system → On
    expect(document.documentElement.dataset.reducedMotion).toBe('on');
    expect(UI.reducedMotionMs).toBe(1);
    ui.dispose();
  });
});

describe('touch', () => {
  it('a phone or tablet has a pause button while racing, and it pauses', () => {
    const mm = globalThis.matchMedia;
    globalThis.matchMedia = ((q: string) => ({ matches: q === '(pointer: coarse)', addEventListener: () => {} })) as never;
    try {
      document.body.innerHTML = '';
      const h = host();
      const ui = new UiRoot(document.body, h, null);
      ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'grandPrix' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickCup', cupId: 'sunrise' });
      expect(ui.app.screen).toBe('racing');
      ui.touch.show(true); // as main.ts does while racing and not paused
      const pause = document.querySelector('#ui .touch.on .tb.pauseBtn')!;
      expect(pause).not.toBeNull();
      pause.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
      expect(ui.paused).toBe(true);
      expect(h.calls).toContain('paused:true');
      // and the pause dialog takes over with its own tappable buttons (Quit among them)
      expect(document.querySelector('#ui .pause.on [data-id="quit"]')).not.toBeNull();
      ui.touch.show(false);
      ui.dispose();
    } finally { globalThis.matchMedia = mm; }
  });
});

describe('settings by pointer', () => {
  it('a click on ◀ turns a value down and ▶ turns it up; the row itself still steps up', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, host(), null);
    ui.dispatch({ type: 'boot' });
    ui.dispatch({ type: 'openSettings' });
    const click = (sel: string) => document.querySelector(`#ui .settings ${sel}`)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const left = (id: string) => `[data-id="${id}"] .arrow:first-child`, right = (id: string) => `[data-id="${id}"] .arrow:last-child`;
    const music = ui.save.settings.musicVolume;
    click(left('musicVolume'));
    click(left('musicVolume'));
    expect(ui.save.settings.musicVolume).toBeCloseTo(music - 0.2);
    click(right('musicVolume'));
    expect(ui.save.settings.musicVolume).toBeCloseTo(music - 0.1);
    // Resolution starts at the top: only ◀ can move it
    click(left('resolutionScale'));
    expect(ui.save.settings.resolutionScale).toBeCloseTo(0.9);
    expect(document.activeElement?.getAttribute('data-id')).toBe('resolutionScale');
    click('[data-id="quality"] .label');
    expect(ui.save.settings.quality).toBe('high');
    ui.dispose();
  });
});

describe('leaderboard panel', () => {
  const results = {
    mode: 'timeTrial', trackId: 'harbour-loop', speedClass: 150, seed: 0, goTick: 360,
    ranks: [{ racerId: 'pip', rank: 1, finishTick: 12000, timeMs: 97000, lapTimesMs: [33000, 32000, 32000], dnf: false }],
  } as never;
  const draft = { trackId: 'harbour-loop', mode: 'timeTrial' as const, speedClass: 150 as const, timeMs: 97000, lapTimesMs: [33000, 32000, 32000], racerId: 'pip', inputLog: 'AQ==', clientVersion: '1' };
  const flush = () => new Promise((r) => setTimeout(r, 0));

  function setup(board: unknown, postResult: unknown = { ok: true, id: 'new', timeMs: 97000, rank: 2 }) {
    document.body.innerHTML = '';
    const posts: unknown[] = [];
    let fetches = 0;
    const h = {
      ...host(),
      leaderboard: {
        fetchBoard: async () => { fetches++; return board as never; },
        post: async (s: unknown) => { posts.push(s); return postResult as never; },
      },
    };
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'timeTrial' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    ui.raceOver({ results, trackName: 'Harbour Loop', playerId: 'pip', seriesHasNext: false, board: { mode: 'timeTrial', dailySeed: null, draft } });
    return { ui, posts, fetches: () => fetches };
  }

  it('shows the top times once they arrive, and starts in the name box for a first-timer', async () => {
    const { ui } = setup([{ id: 'a', name: 'Ada', racerId: 'gus', timeMs: 95000 }]);
    expect(document.querySelector('#ui .board-empty')?.textContent).toMatch(/Loading/);
    await flush();
    expect(document.querySelectorAll('#ui .board-row').length).toBe(1);
    expect(document.querySelector('#ui .board-row .nm')?.textContent).toBe('Ada');
    expect((document.activeElement as HTMLElement).dataset.id).toBe('name');
    ui.dispose();
  });

  it('typing a name and pressing Enter posts the run under that name, then marks your row', async () => {
    const { ui, posts } = setup([]);
    await flush();
    const input = document.querySelector('#ui .name-input') as HTMLInputElement;
    input.value = 'Speedy 7';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    await flush(); await flush();
    expect(posts).toEqual([{ ...draft, name: 'Speedy 7' }]);
    expect(document.querySelector('#ui .board-status')?.textContent).toMatch(/2nd/);
    expect(ui.save.playerName).toBe('Speedy 7');
    // posting twice is not possible
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    await flush();
    expect(posts.length).toBe(1);
    ui.dispose();
  });

  it('letters typed in the name box never move the menu focus', async () => {
    const { ui } = setup([]);
    await flush();
    const input = document.querySelector('#ui .name-input') as HTMLInputElement;
    for (const k of ['KeyS', 'KeyD', 'Space', 'Backspace']) input.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k, bubbles: true }));
    expect((document.activeElement as HTMLElement).dataset.id).toBe('name');
    expect(ui.app.screen).toBe('results');
    ui.dispose();
  });

  it('a bad name is refused on the spot, and nothing is sent', async () => {
    const { ui, posts } = setup([]);
    await flush();
    const input = document.querySelector('#ui .name-input') as HTMLInputElement;
    input.value = 'b1tch';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    await flush();
    expect(posts).toEqual([]);
    expect(document.querySelector('#ui .board-status')?.getAttribute('data-kind')).toBe('error');
    ui.dispose();
  });

  it('offline: the board says so and the post button is disabled', async () => {
    const { ui } = setup(null);
    await flush();
    expect(document.querySelector('#ui .board-empty')?.textContent).toMatch(/offline/);
    expect(document.querySelector('#ui [data-id="post"]')?.getAttribute('aria-disabled')).toBe('true');
    ui.dispose();
  });

  it('a Quick Race has no board at all', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, { ...host(), leaderboard: { fetchBoard: async () => [], post: async () => ({ ok: false, error: '' }) } }, null);
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'quick' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    ui.raceOver({ results, trackName: 'Harbour Loop', playerId: 'pip', seriesHasNext: false });
    expect(document.querySelector('#ui .board')).toBeNull();
    ui.dispose();
  });
});

describe('gamepad', () => {
  const pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
  let t = 0;
  const frame = (ui: UiRoot) => ui.poll((t += 16));
  const set = (i: number, on: boolean) => { pad.buttons[i].pressed = on; };
  const press = (ui: UiRoot, i: number) => { set(i, true); frame(ui); set(i, false); frame(ui); };
  const A = 0, START = 9;
  const oneRow = {
    mode: 'quick', trackId: 'harbour-loop', speedClass: 150, seed: 0, goTick: 360,
    ranks: [{ racerId: 'pip', rank: 1, finishTick: 12000, timeMs: 97000, lapTimesMs: [33000, 32000, 32000], dnf: false }],
  } as never;
  function setup() {
    document.body.innerHTML = '';
    for (const b of pad.buttons) b.pressed = false;
    pad.axes.fill(0);
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' });
    return { ui, h };
  }
  afterEach(() => { delete (navigator as { getGamepads?: unknown }).getGamepads; });

  it('Start pauses and stays paused while held, even when the race was picked with A', () => {
    const { ui, h } = setup();
    for (let i = 0; i < 4; i++) press(ui, A); // Race! → Quick Race → Pip → Harbour Loop
    expect(ui.app.screen).toBe('racing');
    set(START, true);
    for (let f = 0; f < 6; f++) { frame(ui); expect(ui.paused, `held frame ${f}`).toBe(true); }
    set(START, false); frame(ui);
    expect(ui.paused).toBe(true);
    expect(h.calls.filter((c) => c.startsWith('paused'))).toEqual(['paused:true']);
    // Resume with A, then pause again: the same again
    press(ui, A);
    expect(ui.paused).toBe(false);
    set(START, true); frame(ui); frame(ui); frame(ui); set(START, false); frame(ui);
    expect(ui.paused).toBe(true);
    // a fresh press on the pause menu still works: B resumes
    press(ui, 1);
    expect(ui.paused).toBe(false);
    ui.dispose();
  });

  it('A held (a drift) as the results slide in does not skip them; a new press does', () => {
    const { ui } = setup();
    ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'quick' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    set(A, true); pad.axes[0] = -1; frame(ui); frame(ui); // drifting left over the line
    ui.raceOver({ results: oneRow, trackName: 'Harbour Loop', playerId: 'pip', seriesHasNext: false });
    for (let f = 0; f < 5; f++) frame(ui);
    pad.axes[0] = 0; // the stick lets go first, A is still down
    for (let f = 0; f < 5; f++) frame(ui);
    expect(ui.app.screen).toBe('results');
    set(A, false); frame(ui);
    expect(ui.app.screen).toBe('results');
    press(ui, A);
    expect(ui.app.screen).toBe('modeSelect');
    ui.dispose();
  });
});

describe('tall panels (a laptop or a phone on its side)', () => {
  const tt = {
    mode: 'timeTrial', trackId: 'harbour-loop', speedClass: 150, seed: 0, goTick: 360,
    ranks: [{ racerId: 'pip', rank: 1, finishTick: 12000, timeMs: 97000, lapTimesMs: [33000, 32000, 32000], dnf: false }],
  } as never;
  const draft = { trackId: 'harbour-loop', mode: 'timeTrial' as const, speedClass: 150 as const, timeMs: 97000, lapTimesMs: [33000, 32000, 32000], racerId: 'pip', inputLog: 'AQ==', clientVersion: '1' };
  const rows = Array.from({ length: 10 }, (_, i) => ({ id: `r${i}`, name: `Racer ${i + 1}`, racerId: 'gus', timeMs: 95000 + i * 700 }));
  const flush = () => new Promise((r) => setTimeout(r, 0));
  /** jsdom has no layout: give the panel a size and a scroll position by hand */
  function sized(el: HTMLElement, height: number, view: number) {
    let top = 0;
    Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => height });
    Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => view });
    Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => top, set: (v: number) => { top = v; } });
    const by = vi.fn((o: ScrollToOptions) => { top = Math.max(0, Math.min(height - view, top + (o.top ?? 0))); });
    (el as unknown as { scrollBy: typeof by }).scrollBy = by;
    return by;
  }
  const reveal = vi.fn();
  afterEach(() => { delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView; reveal.mockClear(); });

  async function results() {
    document.body.innerHTML = '';
    Element.prototype.scrollIntoView = reveal;
    const h = { ...host(), leaderboard: { fetchBoard: async () => rows as never, post: async () => ({ ok: false, error: '' }) as never } };
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'timeTrial' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    ui.raceOver({ results: tt, trackName: 'Harbour Loop', playerId: 'pip', seriesHasNext: false, board: { mode: 'timeTrial', dailySeed: null, draft } });
    await flush();
    return ui;
  }

  it('results: everything but the button row scrolls inside the panel; the button row is always in sight', async () => {
    const ui = await results();
    const box = document.querySelector('#ui .results.on .box')!;
    const scroll = box.querySelector(':scope > .scroll')!;
    expect(scroll).not.toBeNull();
    for (const sel of ['h2', '.rows', '.board-row', '.name-input', '[data-id="post"]']) expect(scroll.querySelector(sel), sel).not.toBeNull();
    // the name box comes before the times, so it shows on a short screen without scrolling
    expect(scroll.querySelector('.board-form')!.compareDocumentPosition(scroll.querySelector('.board-list')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const next = box.querySelector(':scope > .actions [data-id="continue"]');
    expect(next).not.toBeNull();
    expect(scroll.contains(next)).toBe(false);
    ui.dispose();
  });

  it('results: keys keep the focused control in sight, and scroll the board before the focus wraps round', async () => {
    const ui = await results();
    const scroll = document.querySelector<HTMLElement>('#ui .results.on .scroll')!;
    const by = sized(scroll, 790, 500);
    reveal.mockClear();
    const input = document.querySelector('#ui .name-input')!;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true })); // name → Back to menu
    expect((document.activeElement as HTMLElement).dataset.id).toBe('continue');
    key('ArrowDown'); key('ArrowDown'); // more board below: it scrolls, the focus stays
    expect(by).toHaveBeenCalledTimes(2);
    expect(by.mock.calls[0][0].top).toBe(UI.panelScrollPx);
    expect((document.activeElement as HTMLElement).dataset.id).toBe('continue');
    key('ArrowDown'); key('ArrowDown'); // at the bottom: now it wraps round to the name box, scrolled into sight
    expect(scroll.scrollTop).toBe(290);
    expect((document.activeElement as HTMLElement).dataset.id).toBe('name');
    expect(reveal.mock.contexts.at(-1)).toBe(input);
    ui.dispose();
  });

  it('How to Play opens at the top, and up and down scroll it on keys (and a pad)', () => {
    document.body.innerHTML = '';
    Element.prototype.scrollIntoView = reveal;
    const ui = new UiRoot(document.body, host(), null);
    ui.dispatch({ type: 'boot' });
    reveal.mockClear();
    ui.dispatch({ type: 'openHowTo' });
    expect(reveal).not.toHaveBeenCalled(); // Back sits at the end: focusing it must not jump there
    const by = sized(document.querySelector<HTMLElement>('#ui .howto.on .box')!, 1208, 570);
    key('ArrowDown'); key('ArrowDown'); key('ArrowUp');
    expect(by.mock.calls.map((c) => c[0].top)).toEqual([UI.panelScrollPx, UI.panelScrollPx, -UI.panelScrollPx]);
    expect(ui.app.overlays).toEqual(['howTo']);
    ui.nav('down'); // the pad goes through the same nav
    expect(by).toHaveBeenCalledTimes(4);
    ui.dispose();
  });
});
