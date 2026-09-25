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
import { resultsModel } from '../screens/results.ts';
import { HudView } from './hud.ts';
import { ResultsView, scrollToShow } from './screens.ts';

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
    medalTimes: new Map([['harbour-loop', { gold: 126000, silver: 136000, bronze: 154000 }]]),
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
/** past the new end screen's input guard (UI.endScreenGuardMs) */
const pastGuard = (ui: UiRoot) => { const now = ui.clock() + UI.endScreenGuardMs + 1; ui.clock = () => now; };

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

  it('the place numeral takes its place color with the numeral and the flourish; the coin pill shows two digits', () => {
    document.body.innerHTML = '';
    const v = new HudView(document.body);
    const m = newHudMemory();
    v.render(hudModel(race, kart(), 4, 10, m, 1, defs, 0));
    const place = v.root.querySelector('.place')!, n = place.querySelector('.n')!;
    // data-n: the numeral again, for the stylesheet's outline and face layers
    expect([place.getAttribute('data-tier'), n.getAttribute('data-n')]).toEqual(['pack', '4']);
    feedHud(m, [{ type: 'positionChange', racerId: 'p', rank: 1 }], [], 'p', 1);
    v.render(hudModel(race, kart(), 1, 10, m, 1, defs, 0));
    expect([place.getAttribute('data-tier'), n.getAttribute('data-n'), n.textContent, place.classList.contains('flourish')]).toEqual(['gold', '1', '1', true]);
    expect(v.root.querySelector('.coins')!.textContent).toBe('02');
  });
});

describe('Knockout cut screen', () => {
  it('after the final the winner row says WINNER and the rest say OUT (bug hunt 2)', () => {
    document.body.innerHTML = '';
    const v = new ResultsView(document.body);
    const row = (racerId: string, name: string, out: boolean, winner: boolean) => ({ racerId, name, accent: '#fff', rank: '1st', out, winner, player: false, delayMs: 0 });
    v.renderCut({
      headline: 'Big Gus wins', sub: 'Final', remaining: 2, playerOut: false, done: true, winner: 'Big Gus',
      rows: [row('gus', 'Big Gus', false, true), row('boulder', 'Boulder', true, false)],
    }, 'Back to menu');
    expect([...v.root.querySelectorAll('.row .tm')].map((e) => e.textContent)).toEqual(['WINNER', 'OUT']);
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

  it('every pause opens on Resume, whatever was picked in the last one (bug hunt 3)', () => {
    document.body.innerHTML = '';
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    const toRace = () => {
      ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'quick' });
      ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
      expect(ui.app.screen).toBe('racing');
    };
    const focused = () => document.querySelector<HTMLElement>('#ui .pause.on .focused')?.dataset.id;
    ui.dispatch({ type: 'boot' });
    toRace();
    key('Escape');
    key('ArrowDown'); // Restart
    key('Enter');
    expect(h.calls.filter((c) => c === 'restart')).toHaveLength(1);
    key('Escape');
    expect(focused()).toBe('resume');
    key('Enter'); // resumes: no second restart
    expect(ui.paused).toBe(false);
    expect(h.calls.filter((c) => c === 'restart')).toHaveLength(1);
    // Quit, then the next race: Enter on its first pause resumes, it does not quit again
    key('Escape');
    for (let i = 0; i < 5; i++) key('ArrowDown');
    expect(focused()).toBe('quit');
    key('Enter');
    expect(ui.app.screen).toBe('modeSelect');
    ui.dispatch({ type: 'back' }); // to the title, and in again
    toRace();
    key('Escape');
    expect(focused()).toBe('resume');
    key('Enter');
    expect([ui.app.screen, ui.paused]).toEqual(['racing', false]);
    expect(h.calls.filter((c) => c === 'quit')).toHaveLength(1);
    // How to Play from the pause still comes back to its own row
    key('Escape');
    key('ArrowDown'); key('ArrowDown'); // How to Play
    key('Enter');
    key('Escape');
    expect(focused()).toBe('howTo');
    ui.dispose();
  });

  it('the pause opening under a resting mouse stays on Resume; a mouse that moves takes the focus (seam review)', () => {
    document.body.innerHTML = '';
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    const on = (id: string, type: string, clientX: number, clientY: number) =>
      document.querySelector(`#ui .screen.on [data-id="${id}"]`)!.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX, clientY }));
    const focused = () => document.querySelector<HTMLElement>('#ui .pause.on .focused')?.dataset.id;
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'quick' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    // the track picked with the mouse: the race starts with the cursor resting there
    on('harbour-loop', 'pointermove', 599, 399);
    on('harbour-loop', 'click', 599, 399);
    expect(ui.app.screen).toBe('racing');
    key('Escape');
    // the dialog appears under the cursor: the browser sends a pointerover, and may send a move that goes nowhere
    on('quit', 'pointerover', 599, 399);
    on('quit', 'pointermove', 599, 399);
    expect(focused()).toBe('resume');
    key('Enter');
    expect([ui.app.screen, ui.paused]).toEqual(['racing', false]);
    expect(h.calls).not.toContain('quit');
    key('Escape');
    on('quit', 'pointermove', 601, 402);
    expect(focused()).toBe('quit');
    ui.dispose();
  });

  it('P resumes as well as pauses, and a held P does not flip it back (bug hunt 3)', () => {
    document.body.innerHTML = '';
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'quick' });
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    key('KeyP');
    expect(ui.paused).toBe(true);
    dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', key: 'p', repeat: true }));
    expect(ui.paused).toBe(true);
    key('KeyP');
    expect(ui.paused).toBe(false);
    expect(h.calls.filter((c) => c.startsWith('paused'))).toEqual(['paused:true', 'paused:false']);
    // by key too, for events with no code (some virtual keyboards)
    dispatchEvent(new KeyboardEvent('keydown', { code: '', key: 'p' }));
    dispatchEvent(new KeyboardEvent('keydown', { code: '', key: 'p' }));
    expect(ui.paused).toBe(false);
    ui.dispose();
  });

  it('while racing the driving keys never reach the browser (Space scrolls, Ctrl+D bookmarks); the rest do (bug hunt 3)', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, host(), null);
    const kept = (code: string, ctrlKey = false) => !dispatchEvent(new KeyboardEvent('keydown', { code, key: code, ctrlKey, cancelable: true }));
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'quick' });
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    for (const code of ['Space', 'ArrowUp', 'ArrowLeft', 'ShiftLeft', 'KeyE', 'KeyX', 'KeyQ', 'KeyH']) expect(kept(code), code).toBe(true);
    for (const code of ['KeyD', 'KeyS', 'KeyA', 'KeyH']) expect(kept(code, true), `Ctrl+${code}`).toBe(true);
    for (const code of ['ControlLeft', 'Tab', 'F5', 'KeyR']) expect(kept(code), code).toBe(false);
    ui.dispose();
  });

  it('How to Play lists E or X for items, and no Ctrl (bug hunt 3)', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, host(), null);
    ui.dispatch({ type: 'boot' });
    ui.dispatch({ type: 'openHowTo' });
    const text = document.querySelector('#ui .howto.on')!.textContent!;
    expect(text).toContain('E or X');
    expect(text).not.toContain('Ctrl');
    ui.dispose();
  });

  it('Time Trial and Daily show no 50/100/150cc row: they always run at 150cc (bug hunt 2)', () => {
    for (const [mode, row] of [['quick', true], ['timeTrial', false], ['daily', false]] as const) {
      document.body.innerHTML = '';
      const ui = new UiRoot(document.body, host(), null);
      ui.dispatch({ type: 'boot' });
      ui.dispatch({ type: 'start' });
      ui.dispatch({ type: 'pickMode', mode });
      expect(ui.app.screen).toBe('rosterSelect');
      expect(document.querySelector('#ui .roster-screen .classes') !== null, mode).toBe(row);
      expect(document.querySelector('#ui .roster-screen [data-id="cc50"]') !== null, mode).toBe(row);
      ui.dispose();
    }
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

  it('a phone turned upright mid-race pauses it, and a race begun or resumed upright waits paused (bug hunt 3: it drove on blind under the rotate prompt)', () => {
    const mm = globalThis.matchMedia;
    let upright = false;
    const changed: (() => void)[] = [];
    const PORTRAIT = '(orientation: portrait) and (pointer: coarse)';
    globalThis.matchMedia = ((q: string) => ({
      get matches() { return q === '(pointer: coarse)' || (q === PORTRAIT && upright); },
      addEventListener: (_: string, f: () => void) => { if (q === PORTRAIT) changed.push(f); },
      removeEventListener: () => {},
    })) as never;
    const turn = (on: boolean) => { upright = on; for (const f of changed) f(); };
    try {
      document.body.innerHTML = '';
      const h = host();
      const ui = new UiRoot(document.body, h, null);
      ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'quick' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
      expect(ui.app.screen).toBe('racing');
      expect(ui.paused).toBe(false);
      turn(true);
      expect(ui.paused).toBe(true);
      expect(h.calls).toContain('paused:true');
      // a key resumes it while still upright: it waits again at once
      ui.dispatch({ type: 'resume' });
      expect(ui.paused).toBe(true);
      turn(false); // sideways: nothing changes by itself, Resume goes on
      expect(ui.paused).toBe(true);
      ui.dispatch({ type: 'resume' });
      expect(ui.paused).toBe(false);
      // a new race picked, then the phone upright before it shows: it starts paused
      ui.dispatch({ type: 'pause' }); ui.dispatch({ type: 'quit' });
      expect(ui.app.screen).toBe('modeSelect');
      upright = true;
      ui.dispatch({ type: 'pickMode', mode: 'quick' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
      expect(ui.app.screen).toBe('racing');
      expect(ui.paused).toBe(true);
      // the menus are not touched by it
      ui.dispatch({ type: 'quit' });
      expect(ui.app.screen).toBe('modeSelect');
      expect(ui.app.overlays).toEqual([]);
      ui.dispose();
    } finally { globalThis.matchMedia = mm; }
  });
});

describe('a short screen (a phone on its side)', () => {
  it('the title and the pause move two by two on keys, the way their buttons sit there; a taller window goes back to one column (seam review)', () => {
    const mm = globalThis.matchMedia;
    let short = true;
    const changed: (() => void)[] = [];
    globalThis.matchMedia = ((q: string) => ({
      get matches() { return q === UI.shortScreenQuery && short; },
      addEventListener: (_: string, f: () => void) => { if (q === UI.shortScreenQuery) changed.push(f); },
      removeEventListener: () => {},
    })) as never;
    const resize = (on: boolean) => { short = on; for (const f of changed) f(); };
    const focused = () => document.querySelector<HTMLElement>('#ui .screen.on .focused')?.dataset.id;
    try {
      document.body.innerHTML = '';
      const ui = new UiRoot(document.body, host(), null);
      ui.dispatch({ type: 'boot' });
      const walk = (keys: string[]) => keys.map((k) => { key(k); return focused(); });
      // Race! How to Play / Unlocks Settings / Credits: Right went nowhere, Down went to the button beside it
      expect(walk(['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'])).toEqual(['howTo', 'settings', 'unlocks', 'start']);
      resize(false); // one column again, the focus where it was
      expect(walk(['ArrowRight', 'ArrowDown', 'ArrowDown'])).toEqual(['start', 'howTo', 'unlocks']);
      resize(true);
      ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'quick' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
      key('Escape');
      expect(focused()).toBe('resume');
      expect(walk(['ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft'])).toEqual(['restart', 'settings', 'quit', 'credits']);
      ui.dispose();
    } finally { globalThis.matchMedia = mm; }
  });
});

describe('Back by pointer', () => {
  it('mode, racer, cup and track screens each have a Back button that goes where Escape goes (bug hunt 3: a phone could not go back)', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, host(), null);
    const back = () => document.querySelector('#ui .screen.on [data-id="back"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' });
    back();
    expect(ui.app.screen).toBe('title');
    ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'grandPrix' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    expect(ui.app.screen).toBe('cupSelect');
    back();
    expect(ui.app.screen).toBe('rosterSelect');
    back();
    expect(ui.app.screen).toBe('modeSelect');
    ui.dispatch({ type: 'pickMode', mode: 'quick' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    expect(ui.app.screen).toBe('trackSelect');
    back();
    expect(ui.app.screen).toBe('rosterSelect');
    // the keys never land on it (they have Escape): every arrow from the racer cards stays on the picks
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowRight']) {
      key(k);
      expect((document.activeElement as HTMLElement).dataset.id).not.toBe('back');
    }
    // under a moving mouse it takes the focus like any button, and Enter then goes back too
    document.querySelector('#ui .roster-screen [data-id="back"]')!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 900, clientY: 40 }));
    expect((document.activeElement as HTMLElement).dataset.id).toBe('back');
    key('Enter');
    expect(ui.app.screen).toBe('modeSelect');
    ui.dispose();
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

  it('a change keeps the panel where it was scrolled and does not pop it in again, so the next tap hits the same row (seam review: a phone on its side)', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, host(), null);
    ui.dispatch({ type: 'boot' });
    ui.dispatch({ type: 'openSettings' });
    const box = () => document.querySelector<HTMLElement>('#ui .settings.on .box')!;
    // the rows scroll inside the panel; Done sits in the foot under them (sweep: dialog())
    const rows = () => box().querySelector<HTMLElement>(':scope > .scroll')!;
    const click = (sel: string) => document.querySelector(`#ui .settings ${sel}`)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const master = ui.save.settings.masterVolume;
    expect(box().classList.contains('redraw')).toBe(false); // it pops in when it opens
    rows().scrollTop = 197; // scrolled down by a thumb to Resolution (740x360: 506 px of rows in a 309 px box)
    click('[data-id="resolutionScale"] .arrow:first-child');
    expect(rows().scrollTop).toBe(197); // a new panel, at the old scroll: it opened at 0, and the next tap hit Master volume
    expect(box().classList.contains('redraw')).toBe(true);
    click('[data-id="resolutionScale"] .arrow:first-child');
    expect(ui.save.settings.resolutionScale).toBeCloseTo(0.8);
    expect(ui.save.settings.masterVolume).toBe(master);
    key('ArrowLeft'); // keys too
    expect(ui.save.settings.resolutionScale).toBeCloseTo(0.7);
    expect(rows().scrollTop).toBe(197);
    // closed and opened again: it starts at the top and pops in
    ui.dispatch({ type: 'back' });
    ui.dispatch({ type: 'openSettings' });
    expect(rows().scrollTop).toBe(0);
    expect(box().classList.contains('redraw')).toBe(false);
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

  function setup(board: unknown, postResult: unknown = { ok: true, id: 'new', timeMs: 97000, rank: 2 }, inRace?: (ui: UiRoot) => void, boardNow?: () => unknown) {
    document.body.innerHTML = '';
    const posts: unknown[] = [];
    let fetches = 0;
    const h = {
      ...host(),
      leaderboard: {
        fetchBoard: async () => { fetches++; return (boardNow ? boardNow() : board) as never; },
        post: async (s: unknown) => { posts.push(s); return postResult as never; },
      },
    };
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'timeTrial' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    inRace?.(ui);
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

  it('a slower run under a name already on the board: the name\'s best row is yours, and the status says it still holds (bug hunt 3)', async () => {
    const board = [{ id: 'old', name: 'Judge', racerId: 'momo', timeMs: 92800 }, { id: 'b', name: 'Ada', racerId: 'gus', timeMs: 95000 }];
    const { ui } = setup(board, { ok: true, id: 'new', timeMs: 97000, rank: 1, best: { id: 'old', timeMs: 92800 } });
    await flush();
    const input = document.querySelector('#ui .name-input') as HTMLInputElement;
    input.value = 'Judge';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    await flush(); await flush();
    expect(document.querySelector('#ui .board-status')?.textContent).toBe('Saved. Your best, 1:32.80, is still 1st on this board.');
    expect(document.querySelector('#ui [data-id="post"]')?.textContent).toMatch(/Posted!/);
    const me = [...document.querySelectorAll('#ui .board-row.me .nm')].map((e) => e.textContent);
    expect(me).toEqual(['Judge']);
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

  it('keys held over the line never type into the name box or move the focus; a new press does (seam review)', async () => {
    const focused = () => (document.activeElement as HTMLElement).dataset.id;
    // the browser sends a held key's auto-repeats to whatever has the focus; true when the page kept it
    const send = (code: string, k: string, repeat: boolean) =>
      !(document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { code, key: k, repeat, bubbles: true, cancelable: true }));
    // a first-timer holding the gas (W) and the up arrow as the results open, in the name box
    let { ui, posts } = setup([], undefined, () => { key('KeyW'); key('ArrowUp'); });
    await flush();
    expect(focused()).toBe('name');
    for (let i = 0; i < 8; i++) expect(send('KeyW', 'w', true), `W repeat ${i}`).toBe(true); // 'wwwwwwww' went into the box
    for (let i = 0; i < 3; i++) expect(send('ArrowUp', 'ArrowUp', true)).toBe(true);
    expect(focused()).toBe('name'); // it flipped between the box and Back to menu
    expect(send('KeyW', 'w', false)).toBe(false); // let go and pressed again: it types
    expect(focused()).toBe('name');
    ui.dispose();
    // a known name starts on Post: W held moved it to Back to menu, then into the box
    ({ ui, posts } = setup([], undefined, (u) => { u.save.playerName = 'Ada'; key('KeyW'); }));
    await flush();
    expect(focused()).toBe('post');
    pastGuard(ui);
    for (let i = 0; i < 7; i++) send('KeyW', 'w', true);
    expect(focused()).toBe('post');
    send('Enter', 'Enter', false);
    await flush(); await flush();
    expect(posts).toEqual([{ ...draft, name: 'Ada' }]);
    ui.dispose();
  });

  it('a cursor resting where the results open takes no focus from the name box; a moving one does (seam review)', async () => {
    const { ui } = setup([]);
    await flush();
    const next = document.querySelector('#ui .results.on [data-id="continue"]')!;
    next.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, clientX: 683, clientY: 495 })); // the browser's, for the hover state
    expect((document.activeElement as HTMLElement).dataset.id).toBe('name');
    next.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 684, clientY: 495 }));
    expect((document.activeElement as HTMLElement).dataset.id).toBe('continue');
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

  it('offline: the board says so, Post still posts, and Try again reads the board again (audit 24 Sept 2026)', async () => {
    let board: unknown = null;
    const { ui, posts, fetches } = setup(null, undefined, undefined, () => board);
    await flush();
    pastGuard(ui);
    expect(document.querySelector('#ui .board-empty')?.textContent).toBe('Could not load the times.');
    // said once: the status line keeps its own words, not a second "could not load" (screens sweep, 24 Sept 2026)
    expect(document.querySelector('#ui .board-status')?.textContent).not.toMatch(/could not load/i);
    expect(document.querySelector('#ui [data-id="post"]')?.getAttribute('aria-disabled')).toBe('false');
    const retry = document.querySelector('#ui [data-id="retry"]') as HTMLElement;
    expect(retry?.textContent).toBe('Try again');
    // the network comes back: Try again shows the times, and the button goes
    board = [{ id: 'a', name: 'Ada', racerId: 'gus', timeMs: 95000 }];
    retry.click();
    expect(document.querySelector('#ui .board-empty')?.textContent).toMatch(/Loading/);
    await flush();
    expect(fetches()).toBe(2);
    expect(document.querySelectorAll('#ui .board-row').length).toBe(1);
    expect(document.querySelector('#ui [data-id="retry"]')).toBeNull();
    // and a post goes through
    (document.querySelector('#ui .name-input') as HTMLInputElement).value = 'Kit';
    (document.querySelector('#ui [data-id="post"]') as HTMLElement).click();
    await flush(); await flush();
    expect(posts.length).toBe(1);
    ui.dispose();
  });

  it('offline, a post still goes out; the board is read again after it', async () => {
    const { ui, posts, fetches } = setup(null, { ok: false, error: 'Could not reach the leaderboard. Check your connection.' });
    await flush();
    pastGuard(ui);
    (document.querySelector('#ui .name-input') as HTMLInputElement).value = 'Kit';
    (document.querySelector('#ui [data-id="post"]') as HTMLElement).click();
    await flush(); await flush();
    expect(posts.length).toBe(1);
    expect(fetches()).toBe(2);
    expect(document.querySelector('#ui .board-status')?.getAttribute('data-kind')).toBe('error');
    ui.dispose();
  });

  it('a first-timer gets a friendly name; on a pad, A in the name box moves to Post, and A there posts it (audit 24 Sept 2026)', async () => {
    const { ui, posts } = setup([]);
    await flush();
    pastGuard(ui);
    const input = document.querySelector('#ui .name-input') as HTMLInputElement;
    expect(input.value).toMatch(/^Pip \d{3}$/);
    expect((document.activeElement as HTMLElement).dataset.id).toBe('name');
    ui.nav('confirm');
    expect((document.activeElement as HTMLElement).dataset.id).toBe('post');
    ui.nav('confirm');
    await flush(); await flush();
    expect(posts).toEqual([{ ...draft, name: input.value }]);
    ui.dispose();
  });

  it('a click in the name box is for typing: it never jumps to Post', async () => {
    const { ui } = setup([]);
    await flush();
    pastGuard(ui);
    (document.querySelector('#ui .name-input') as HTMLElement).click();
    expect((document.activeElement as HTMLElement).dataset.id).toBe('name');
    ui.dispose();
  });

  it('a Daily shows its date in US order and when the next one starts in the player\'s time', async () => {
    document.body.innerHTML = '';
    const h = { ...host(), leaderboard: { fetchBoard: async () => [] as never, post: async () => ({ ok: false, error: '' }) as never } };
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'daily' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    ui.raceOver({ results: { ...(results as object), mode: 'daily', seed: 20260925 } as never, trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: false, board: { mode: 'daily', dailySeed: 20260925, draft: { ...draft, mode: 'daily', dailySeed: 20260925 } } });
    await flush();
    expect(document.querySelector('#ui .board-sub')?.textContent).toBe('Daily Challenge · Sep 25 · Harbor Loop');
    expect(document.querySelector('#ui .board-note')?.textContent).toMatch(/^Next challenge at \d{1,2}:\d{2} (AM|PM) your time \(midnight UTC\)$/);
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

describe('Time Trial medals', () => {
  const medalTimesMs = { gold: 126000, silver: 136000, bronze: 154000 }; // host().medalTimes
  const run = (timeMs: number) => ({
    mode: 'timeTrial', trackId: 'harbour-loop', speedClass: 150, seed: 0, goTick: 360,
    ranks: [{ racerId: 'pip', rank: 1, finishTick: 12000, timeMs, lapTimesMs: [50000, 50000, timeMs - 100000], dnf: false }],
  }) as never;

  it('a best saved under older medal times is graded again: its card, and its save when a slower run keeps it', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, host(), null);
    ui.save.timeTrial['harbour-loop'] = { bestMs: 149000, medal: 'gold' }; // gold when gold was 150 s
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'timeTrial' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    expect(ui.app.screen).toBe('trackSelect');
    expect(document.querySelector('#ui [data-id="harbour-loop"] .sub')?.textContent).toBe('Best 2:29.00 · Bronze');
    ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    ui.raceOver({ results: run(152000), trackName: 'Harbour Loop', playerId: 'pip', seriesHasNext: false, medalTimesMs });
    expect(document.querySelector('#ui .results h2')?.textContent).toBe('Bronze medal!');
    expect(ui.save.timeTrial['harbour-loop']).toMatchObject({ bestMs: 149000, medal: 'bronze' });
    ui.dispose();
  });

  it('badges (sweep 24 Sept 2026): the track card wears its best medal; the results put the medal by the headline and the medal times under the run', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, host(), null);
    ui.save.timeTrial['harbour-loop'] = { bestMs: 125000, medal: 'gold' };
    ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode: 'timeTrial' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    const card = document.querySelector('#ui .track-screen.on [data-id="harbour-loop"]')!;
    expect(card.querySelector('.medal-badge svg')?.getAttribute('data-medal')).toBe('gold');
    expect(card.querySelector('.sub')?.textContent).toBe('Best 2:05.00 · Gold'); // in words too, never color alone
    ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    ui.raceOver({ results: run(130000), trackName: 'Harbour Loop', playerId: 'pip', seriesHasNext: false, medalTimesMs });
    const panel = document.querySelector('#ui .results.on')!;
    expect(panel.querySelector('h2')?.textContent).toBe('Silver medal!');
    expect(panel.querySelector('.res-head .res-medal svg')?.getAttribute('data-medal')).toBe('silver');
    expect([...panel.querySelectorAll('.medal-ladder .rung')].map((r) => `${r.className}: ${r.textContent}`)).toEqual([
      'rung miss: Gold2:06.00', 'rung got won: Silver2:16.00', 'rung got: Bronze2:34.00',
    ]);
    expect(panel.querySelector('.medal-ladder .rung.won')?.getAttribute('aria-label')).toBe('Silver: 2:16.00, yours');
    // no medal: no badge by the headline, and the ladder shows what it takes
    ui.dispatch({ type: 'continue' });
    ui.dispatch({ type: 'pickMode', mode: 'timeTrial' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    ui.raceOver({ results: run(170000), trackName: 'Harbour Loop', playerId: 'pip', seriesHasNext: false, medalTimesMs });
    expect(document.querySelector('#ui .results.on .res-medal')).toBeNull();
    expect(document.querySelectorAll('#ui .results.on .medal-ladder .rung.miss')).toHaveLength(3);
    ui.dispose();
  });

  it('the race HUD: over the line in a Time Trial, the medal its time won under FINISH!', () => {
    document.body.innerHTML = '';
    const v = new HudView(document.body);
    const m = newHudMemory();
    const k = kart();
    const st = { ...race, mode: 'timeTrial', goTick: 360 } as RaceState;
    feedHud(m, [{ type: 'finish', racerId: 'p', rank: 1, tick: 360 + 14100, dnf: false }], [], 'p', 1);
    k.finishTick = 360 + 14100; // 117.5 s
    v.render(hudModel(st, k, 1, 10, m, 1, defs, 0, false, medalTimesMs));
    const won = v.root.querySelector('.banner .medal-won')!;
    expect(won.classList.contains('on')).toBe(true);
    expect(won.querySelector('.mw-text')?.textContent).toBe('Gold medal!');
    expect(won.querySelector('svg')?.getAttribute('data-medal')).toBe('gold');
    // the order under FINISH!: the place (none in a solo run), the medal, then how to go on
    expect([...v.root.querySelector('.banner')!.children].map((c) => c.className.split(' ')[0])).toEqual(['big', 'small', 'medal-won', 'skip']);
    v.render(hudModel({ ...race, mode: 'timeTrial', goTick: 360 } as RaceState, kart(), 1, 10, newHudMemory(), 1, defs, 0, false, medalTimesMs));
    expect(won.classList.contains('on')).toBe(false);
  });
});

describe('results on a phone on its side (sweep 24 Sept 2026)', () => {
  const field = (ids: string[], player: string) => ({
    mode: 'quick', trackId: 'harbour-loop', speedClass: 150, seed: 0, goTick: 360,
    ranks: ids.map((id, i) => ({ racerId: id, rank: i + 1, finishTick: 12000 + i * 60, timeMs: 97000 + i * 500, lapTimesMs: [33000, 32000, 32000 + i * 500], dnf: false, projectedMs: -1 })),
    player,
  });
  const IDS = ['momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'pip', 'gus'];

  it('more than four rows are marked to sit in two columns there, four to a column (the stylesheet sets them, all eight in sight)', () => {
    document.body.innerHTML = '';
    const v = new ResultsView(document.body);
    v.renderResults(resultsModel(field(IDS, 'pip') as never, 'pip', 'Harbor Loop'), 'Standings');
    const rows = v.root.querySelector<HTMLElement>('.rows')!;
    expect([rows.classList.contains('many'), rows.style.getPropertyValue('--half')]).toEqual([true, '4']);
    v.renderResults(resultsModel(field(IDS.slice(0, 4), 'pip') as never, 'pip', 'Harbor Loop'), 'Standings');
    expect(v.root.querySelector('.rows')!.classList.contains('many')).toBe(false);
    v.renderResults(resultsModel(field(IDS.slice(0, 6), 'pip') as never, 'pip', 'Harbor Loop'), 'Standings');
    expect(v.root.querySelector<HTMLElement>('.rows')!.style.getPropertyValue('--half')).toBe('3');
  });

  it('the player\'s own row is scrolled into sight inside the panel; only the panel scrolls, and a row in sight stays put', () => {
    document.body.innerHTML = '';
    const v = new ResultsView(document.body);
    v.renderResults(resultsModel(field(IDS, 'pip') as never, 'pip', 'Harbor Loop'), 'Standings');
    const sc = v.root.querySelector<HTMLElement>('.scroll')!;
    const me = v.root.querySelector<HTMLElement>('.row.me')!;
    Object.defineProperty(sc, 'clientHeight', { value: 200 });
    let top = 0;
    Object.defineProperty(sc, 'scrollTop', { get: () => top, set: (x: number) => { top = x; } });
    sc.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
    // 7th, 300 px down the panel, 30 tall: scrolled so it sits 12 px clear of the bottom
    me.getBoundingClientRect = () => ({ top: 100 + 300 - top, height: 30 }) as DOMRect;
    v.revealPlayer();
    expect(top).toBe(300 + 30 + 12 - 200);
    v.revealPlayer(); // in sight now: no move
    expect(top).toBe(142);
    expect(scrollToShow(0, 200, 50, 30, 12)).toBeNull();
    expect(scrollToShow(100, 200, 40, 30, 12)).toBe(28); // above the view: its top in sight
    expect(scrollToShow(0, 200, 100, 300, 12)).toBe(88); // taller than the view: its top wins
  });

  it('a tablet held upright is told to turn its device, not its phone', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, host(), null);
    expect(document.querySelector('#ui .rotate-hint p')?.textContent).toBe('Turn your device sideways to race');
    ui.dispose();
  });
});

describe('gamepad', () => {
  const pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
  /** the UI's clock and the pad's polls run on one time, as in the game */
  let t = 0;
  const frame = (ui: UiRoot) => ui.poll((t += 16));
  const set = (i: number, on: boolean) => { pad.buttons[i].pressed = on; };
  /** a player's beat before the next press: past a screen change and the double-press guard */
  const beat = () => { t += UI.wipeMs; };
  const press = (ui: UiRoot, i: number) => { set(i, true); frame(ui); set(i, false); frame(ui); beat(); };
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
    ui.clock = () => t;
    ui.dispatch({ type: 'boot' });
    beat(); // the title has been up a moment (a press as it opens is a double press's second half)
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
    beat();
    press(ui, A);
    expect(ui.paused).toBe(false);
    set(START, true); frame(ui); frame(ui); frame(ui); set(START, false); frame(ui);
    expect(ui.paused).toBe(true);
    // a fresh press on the pause menu still works: B resumes
    beat();
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
    t += UI.endScreenGuardMs; // past the end screen's guard
    press(ui, A);
    expect(ui.app.screen).toBe('modeSelect');
    ui.dispose();
  });

  it('the stick held from the race (steering on a diagonal) leaves the pause on Resume; centered and pushed again, it moves (seam review)', () => {
    const { ui, h } = setup();
    const focused = () => document.querySelector<HTMLElement>('#ui .pause.on .focused')?.dataset.id;
    for (let i = 0; i < 4; i++) press(ui, A); // Race! → Quick Race → Pip → Harbour Loop
    expect(ui.app.screen).toBe('racing');
    pad.axes[0] = -0.8; pad.axes[1] = -0.6; // up past the dead zone as well as left
    for (let f = 0; f < 60; f++) frame(ui);
    set(START, true);
    // held well past the repeat delay: it read as a fresh up, then repeated, onto Quit
    for (let f = 0; f < 20; f++) { frame(ui); expect(focused(), `frame ${f}`).toBe('resume'); }
    set(START, false); frame(ui);
    pad.axes.fill(0); frame(ui); // let go
    beat();
    press(ui, A);
    expect([ui.app.screen, ui.paused]).toEqual(['racing', false]);
    expect(h.calls).not.toContain('quit');
    // a fresh push on the pause moves as before
    press(ui, START);
    expect(focused()).toBe('resume');
    pad.axes[1] = 0.9; frame(ui); pad.axes[1] = 0; frame(ui);
    expect(focused()).toBe('restart');
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
    const by = sized(document.querySelector<HTMLElement>('#ui .howto.on .scroll')!, 1208, 570);
    key('ArrowDown'); key('ArrowDown'); key('ArrowUp');
    expect(by.mock.calls.map((c) => c[0].top)).toEqual([UI.panelScrollPx, UI.panelScrollPx, -UI.panelScrollPx]);
    expect(ui.app.overlays).toEqual(['howTo']);
    ui.nav('down'); // the pad goes through the same nav
    expect(by).toHaveBeenCalledTimes(4);
    ui.dispose();
  });
});

describe('sweep of every screen (24 Sept 2026)', () => {
  it('How to Play, Credits, Unlocks and Settings keep their own button in a foot under the content that scrolls', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, host(), null);
    ui.dispatch({ type: 'boot' });
    for (const [open, cls, id] of [['openHowTo', 'howto', 'back'], ['openCredits', 'credits', 'back'], ['openUnlocks', 'unlocks', 'back'], ['openSettings', 'settings', 'done']] as const) {
      ui.dispatch({ type: open });
      const box = document.querySelector(`#ui .${cls}.on .box`)!;
      const body = box.querySelector(':scope > .scroll')!, foot = box.querySelector(':scope > .foot')!;
      expect(body.querySelector('h2'), cls).not.toBeNull();
      expect(foot.querySelector(`[data-id="${id}"]`), cls).not.toBeNull();
      expect(body.querySelector(`[data-id="${id}"]`), cls).toBeNull();
      expect((document.activeElement as HTMLElement).dataset.id, cls).toBe(open === 'openSettings' ? 'masterVolume' : id);
      key('Escape');
      expect(ui.app.overlays, cls).toEqual([]);
    }
    ui.dispose();
  });

  it('a solo run: the HUD hides the place, lists the finished laps under the timer, and a second render writes nothing', () => {
    document.body.innerHTML = '';
    const v = new HudView(document.body);
    const k = kart();
    const st = { ...race, karts: [k], trackers: [{ lapTicks: [360 + 4800] }], goTick: 360 } as unknown as RaceState;
    const vm = () => hudModel(st, k, 1, 10, newHudMemory(), 1, defs, 0);
    v.render(vm());
    expect(v.root.classList.contains('solo')).toBe(true);
    expect([...v.root.querySelectorAll('.tc .split')].map((e) => e.textContent)).toEqual(['Lap 10:40.00']);
    const text = vi.spyOn(Node.prototype, 'textContent', 'set');
    v.render(vm());
    expect(text).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    // a field of racers: the place shows, no splits
    v.render(hudModel(race, kart(), 5, 10, newHudMemory(), 1, defs, 0));
    expect(v.root.classList.contains('solo')).toBe(false);
    expect(v.root.querySelectorAll('.split').length).toBe(0);
  });

  it('the window losing the focus mid-race (alt-tab: no visibilitychange) pauses it; on the menus it does nothing', () => {
    document.body.innerHTML = '';
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    ui.dispatch({ type: 'boot' });
    dispatchEvent(new Event('blur'));
    expect([ui.app.screen, ui.app.overlays]).toEqual(['title', []]);
    for (const a of [{ type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickTrack', trackId: 'harbour-loop' }] as const) ui.dispatch(a);
    expect(ui.app.screen).toBe('racing');
    dispatchEvent(new Event('blur'));
    expect(ui.app.overlays).toEqual(['pause']);
    expect(h.calls).toContain('paused:true');
    dispatchEvent(new Event('blur')); // already paused: stays as it is
    expect(ui.app.overlays).toEqual(['pause']);
    ui.dispose();
    const n = h.calls.length;
    dispatchEvent(new Event('blur')); // disposed: no listener left
    expect(h.calls.length).toBe(n);
  });
});

describe('double presses (sweep 24 Sept 2026)', () => {
  it('a confirm from the player this soon after a screen opened is the second half of a double press: held back; later it counts', () => {
    document.body.innerHTML = '';
    const ui = new UiRoot(document.body, host(), null);
    let now = 1000;
    ui.clock = () => now;
    ui.trusted = () => true; // as a real key press
    ui.dispatch({ type: 'boot' });
    now += 1000;
    key('Enter'); // Race! on the title
    expect(ui.app.screen).toBe('modeSelect');
    now += 40;
    key('Enter'); // the second press of a double press: Quick Race is not picked unseen
    expect(ui.app.screen).toBe('modeSelect');
    now += UI.wipeMs; // past the screen change (and the guard, which is shorter)
    key('Enter');
    expect(ui.app.screen).toBe('rosterSelect');
    // once the screen has changed, arrows are never held back
    now += UI.wipeMs;
    key('ArrowRight');
    expect((document.activeElement as HTMLElement).dataset.id).not.toBe('pip');
    ui.dispose();
  });

  it('with reduced motion (no transition) the guard alone holds a double press back, for keys and a pad\'s A alike', () => {
    document.body.innerHTML = '';
    const pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    const ui = new UiRoot(document.body, host(), null);
    ui.save.settings.reducedMotion = 'on';
    let now = 1000;
    ui.clock = () => now;
    ui.trusted = () => true;
    ui.dispatch({ type: 'boot' });
    const a = (down: boolean) => { pad.buttons[0].pressed = down; ui.poll(now); };
    now += 1000;
    a(true); a(false); // A on the title: Race!
    expect(ui.app.screen).toBe('modeSelect');
    now += 60;
    a(true); a(false); // the second half of a double press on the pad: Quick Race is not picked unseen
    expect(ui.app.screen).toBe('modeSelect');
    now += UI.screenGuardMs;
    a(true); a(false); // a press of its own
    expect(ui.app.screen).toBe('rosterSelect');
    now += 60;
    key('Enter'); // a key's double press, the same
    expect(ui.app.screen).toBe('rosterSelect');
    ui.dispose();
    delete (navigator as { getGamepads?: unknown }).getGamepads;
  });
});

describe('prompts follow the input (sweep 24 Sept 2026)', () => {
  it('a gamepad press switches the hints to its buttons, a key switches them back; the HUD strip has both', () => {
    document.body.innerHTML = '';
    const pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    const ui = new UiRoot(document.body, host(), null);
    ui.dispatch({ type: 'boot' });
    const root = document.documentElement;
    expect(root.dataset.input).toBe('keys');
    expect(document.querySelector('#ui .title .press.only-keys')?.textContent).toBe('Press Enter');
    expect(document.querySelector('#ui .title .press.only-pad')?.textContent).toBe('Press A');
    ui.poll(16); // a pad plugged in but nothing pressed: still the keys
    expect(root.dataset.input).toBe('keys');
    pad.buttons[13].pressed = true; ui.poll(32); pad.buttons[13].pressed = false; ui.poll(48);
    expect(root.dataset.input).toBe('pad');
    key('ArrowUp');
    expect(root.dataset.input).toBe('keys');
    expect([...document.querySelectorAll('#ui .hud .keys-hint > span')].map((e) => e.className)).toEqual(['only-keys', 'only-pad']);
    ui.dispose();
    delete (navigator as { getGamepads?: unknown }).getGamepads;
  });
});
