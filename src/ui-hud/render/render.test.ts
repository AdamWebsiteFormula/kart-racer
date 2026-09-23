// @vitest-environment jsdom
// DOM smoke tests: the renderers build the right nodes, the HUD writes nothing when nothing
// changed (SOP test 15), and every screen has the accessibility shape (SOP test 16).
import { describe, expect, it, vi } from 'vitest';
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
  it('SOP test 1 in the DOM: keys alone walk title → mode → roster → race, and Escape pauses', () => {
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
