// @vitest-environment jsdom
// The design §10 rewards in the UI: the garage on the racer screen shows every option, lets only the
// unlocked be chosen, steps with keys, gamepad and pointer alike, saves the choice, and hands the race the
// look; Mirror shows only when unlocked and only for Quick Race and Grand Prix; the Unlocks list says
// where to use each reward; a Time Trial best keeps the look its ghost is drawn in.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UI } from './constants.ts';
import { garageModel, lookFor, mirrorAllowed, setChoice, stepChoice } from './garage.ts';
import { rosterMenu } from './screens/menus.ts';
import { SAVE_KEY, defaultSave, loadSave, type Backend } from './store.ts';
import { UiRoot, type RacePlan, type UiHost } from './ui.ts';
import { unlockRows, UNLOCKS } from './unlocks.ts';
import type { RaceResults } from '../race-manager/types.ts';

const fake = (): Backend & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};

function host(): UiHost & { plans: RacePlan[] } {
  const plans: RacePlan[] = [];
  return {
    plans,
    builtTracks: new Set(['harbour-loop', 'meadow-run', 'canyon-rush']),
    medalTimes: new Map([['harbour-loop', { gold: 126000, silver: 136000, bronze: 154000 }]]),
    availableModes: new Set(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']),
    creditsMarkdown: '',
    startRace: (p) => plans.push(p),
    nextRace: () => {}, restartRace: () => {}, quitRace: () => {}, setPaused: () => {}, settingsChanged: () => {},
  };
}

const toRoster = (ui: UiRoot, mode: 'quick' | 'grandPrix' | 'knockout' | 'timeTrial') => {
  ui.dispatch({ type: 'boot' }); ui.dispatch({ type: 'start' }); ui.dispatch({ type: 'pickMode', mode });
};
const q = (sel: string) => document.querySelector(`#ui .roster-screen.on ${sel}`) as HTMLElement | null;

afterEach(() => { document.body.innerHTML = ''; });

describe('garage view model (pure)', () => {
  it('every option is shown with a swatch; locked ones wear a lock and their hint, and only unlocked ones are chosen', () => {
    const s = defaultSave();
    const pip = garageModel(s, 'pip');
    expect(pip.choices.map((c) => [c.id, c.options.map((o) => `${o.name}${o.locked ? ' (locked)' : ''}`)])).toEqual([
      ['paint', ['Original', 'Berry (locked)']], ['body', ['Standard', 'Classic (locked)', 'Buggy (locked)']],
    ]);
    expect(pip.choices[0].options[1]).toMatchObject({ hint: 'Get gold in Time Trial on every Sunrise Cup track', swatch: ['#ce30ba', '#ffca54'] });
    expect(pip.choices[1].options[1]).toMatchObject({ hint: 'Finish a Grand Prix', swatch: 'classic' });
    expect([pip.paintName, pip.bodyName]).toEqual(['Original', 'Standard']);
    expect(garageModel(s, 'momo').choices.map((c) => c.id)).toEqual(['body']); // Momo has no alt paint
    // nothing to step to while all is locked
    expect(stepChoice(s, 'pip', 'paint', 1)).toEqual(s.settings);
    expect(setChoice(s, 'pip', 'body', 'classic')).toEqual(s.settings);
    s.unlocked.skins.push('pip-alt');
    s.unlocked.bodies.push('buggy');
    expect(garageModel(s, 'pip').choices[1].options.map((o) => o.locked)).toEqual([false, true, false]);
    expect(stepChoice(s, 'pip', 'body', 1).selectedBodyId).toBe('buggy'); // Classic, still locked, is skipped
    expect(setChoice(s, 'pip', 'paint', 'pip-alt').skinByRacer).toEqual({ pip: 'pip-alt' });
    const vm = rosterMenu(100, 'quick', { garage: garageModel(s, 'pip') });
    expect(vm.focus.rows[2]).toEqual(['paint', 'body']);
  });

  it('steps wrap both ways, save only unlocked looks, and the race gets exactly them', () => {
    const s = defaultSave();
    s.unlocked = { skins: ['pip-alt', 'boulder-alt'], bodies: ['classic', 'buggy'], mirror: false };
    s.settings = stepChoice(s, 'pip', 'paint', 1);
    expect(s.settings.skinByRacer).toEqual({ pip: 'pip-alt' });
    s.settings = stepChoice(s, 'pip', 'paint', 1);
    expect(s.settings.skinByRacer).toEqual({});
    s.settings = stepChoice(s, 'pip', 'body', -1);
    expect(s.settings.selectedBodyId).toBe('buggy');
    s.settings = stepChoice(s, 'boulder', 'paint', -1);
    expect(lookFor(s, 'boulder')).toEqual({ paint: 'boulder-alt', body: 'buggy' });
    expect(lookFor(s, 'pip')).toEqual({ body: 'buggy' });
    // taken away (a hand-edited save): the look falls back to the racer's own
    s.unlocked.bodies = [];
    expect(lookFor(s, 'boulder')).toEqual({ paint: 'boulder-alt' });
  });

  it('Mirror: only once unlocked, and only for Quick Race and Grand Prix', () => {
    const s = defaultSave();
    expect(mirrorAllowed(s, 'quick')).toBe(false);
    s.unlocked.mirror = true;
    expect(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily'].filter((m) => mirrorAllowed(s, m as never))).toEqual(['quick', 'grandPrix']);
    expect(rosterMenu(100, 'quick', { mirror: false }).classes.map((c) => c.id)).toEqual(['cc50', 'cc100', 'cc150', 'mirror']);
    expect(rosterMenu(100, 'quick').classes.map((c) => c.id)).toEqual(['cc50', 'cc100', 'cc150']);
    expect(rosterMenu(100, 'timeTrial', { mirror: true }).classes).toEqual([]); // no class row at all in a solo mode
  });

  it('the Unlocks list says where to use each reward', () => {
    expect(UNLOCKS.every((u) => u.use.length > 10)).toBe(true);
    const s = defaultSave();
    s.unlocked.mirror = true;
    const row = unlockRows(s).find((r) => r.id === 'mirror')!;
    expect(row).toMatchObject({ unlocked: true });
    expect(row.use).toMatch(/Quick Race or Grand Prix/);
  });
});

describe('garage on the racer screen (jsdom)', () => {
  it('nothing unlocked: the garage shows every option locked with how to earn it, no Mirror, and the race gets the plain look', () => {
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    toRoster(ui, 'quick');
    expect(q('.garage')?.hidden).toBe(false);
    expect([...document.querySelectorAll('#ui .roster-screen.on [data-id="paint"] .opt')].map((o) => [o.getAttribute('data-opt'), o.classList.contains('locked')])).toEqual([['default', false], ['pip-alt', true]]);
    expect(q('[data-id="body"] .opt.locked .lock')?.textContent).toBe('🔒');
    expect(q('.pick-hint')?.textContent).toContain('Berry: Get gold in Time Trial on every Sunrise Cup track');
    expect(q('[data-id="mirror"]')).toBeNull();
    expect(q('.hero-name')?.textContent).toBe('Pip');
    expect(ui.turntable()).toMatchObject({ racerId: 'pip', look: {} });
    q('[data-id="body"] [data-opt="classic"]')!.click(); // a locked swatch does nothing
    expect(ui.save.settings.selectedBodyId).toBe('standard');
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    expect(h.plans[0]).toMatchObject({ mirrored: false, look: {} });
    ui.dispose();
  });

  it('keys step the focused racer\'s paint and the body, save them, and the race and turntable wear them', () => {
    const b = fake();
    const s = defaultSave();
    s.unlocked = { skins: ['pip-alt', 'sprocket-alt'], bodies: ['classic'], mirror: true };
    b.setItem(SAVE_KEY, JSON.stringify(s));
    const h = host();
    const ui = new UiRoot(document.body, h, b);
    toRoster(ui, 'quick');
    // the saved racer (Pip) is dressed: Paint and Body
    expect(q('.garage')?.hidden).toBe(false);
    expect(q('.hero-name')?.textContent).toBe('Pip');
    expect(ui.turntable()).toMatchObject({ racerId: 'pip', look: {} });
    // down from Pip goes straight to his garage, no card passed and Pip still on show; left and right step his paint
    ui.nav('down');
    expect(document.activeElement?.getAttribute('data-id')).toBe('paint');
    expect(q('.hero-name')?.textContent).toBe('Pip');
    ui.nav('right');
    expect(ui.save.settings.skinByRacer).toEqual({ pip: 'pip-alt' });
    expect(ui.turntable()?.look).toEqual({ paint: 'pip-alt' });
    expect(q('[data-id="paint"] .opt.on')?.getAttribute('data-opt')).toBe('pip-alt');
    expect(q('.hero-look')?.textContent).toContain('Berry');
    ui.nav('left');
    expect(ui.save.settings.skinByRacer).toEqual({});
    ui.nav('left'); // wraps: Berry again
    expect(ui.save.settings.skinByRacer).toEqual({ pip: 'pip-alt' });
    // up from the garage goes back to Pip's card, not a card in between
    ui.nav('up');
    expect(document.activeElement?.getAttribute('data-id')).toBe('pip');
    // up from Pip goes round to the card under him: Otto goes on show (no paint of his own: Body only), and down reaches his garage
    ui.nav('up');
    expect(q('.hero-name')?.textContent).toBe('Otto');
    expect(q('[data-id="paint"]')).toBeNull();
    ui.nav('down');
    expect(document.activeElement?.getAttribute('data-id')).toBe('body');
    ui.nav('right');
    expect(ui.save.settings.selectedBodyId).toBe('classic');
    expect(JSON.parse(b.data[SAVE_KEY]).settings.selectedBodyId).toBe('classic');
    expect(q('[data-id="body"] .opt.on')?.getAttribute('data-opt')).toBe('classic');
    expect(q('.card.dressed')?.getAttribute('data-id')).toBe('otto');
    ui.dispose();
  });

  it('down from the cards to the rows under them never changes the racer on show, up goes back to that card, and a card the pointer only passes over is not put on show (sweep 24 Sept 2026)', () => {
    vi.useFakeTimers();
    try {
      const s = defaultSave();
      s.unlocked = { skins: ['pip-alt'], bodies: [], mirror: false };
      const b = fake();
      b.setItem(SAVE_KEY, JSON.stringify(s));
      const ui = new UiRoot(document.body, host(), b);
      toRoster(ui, 'quick');
      const on = () => document.activeElement?.getAttribute('data-id');
      const hero = () => [q('.hero-name')?.textContent, q('.card.dressed')?.getAttribute('data-id')];
      expect(hero()).toEqual(['Pip', 'pip']);
      // down from Pip: straight to his Paint, Otto's card under him not passed (it used to put Otto on show)
      ui.nav('down');
      expect([on(), ...hero()]).toEqual(['paint', 'Pip', 'pip']);
      ui.nav('down'); // Paint and Body share a row: the class row is next
      expect(on()).toBe('cc50');
      // down again goes round to the top: the racer on show's card, not the one above the class
      ui.nav('down');
      expect([on(), ...hero()]).toEqual(['pip', 'Pip', 'pip']);
      // left and right read through the eight cards: right of Juniper is Otto, and a card the keys land on goes on show
      for (let i = 0; i < 4; i++) ui.nav('right');
      expect([on(), ...hero()]).toEqual(['otto', 'Otto', 'otto']);
      ui.nav('down');
      expect([on(), ...hero()]).toEqual(['body', 'Otto', 'otto']);
      ui.nav('up');
      expect(on()).toBe('otto');
      // the pointer passing over Juniper's card on its way down to Body leaves Otto on show (and the rows under the pointer as they were)
      let x = 10;
      const over = (id: string) => q(`[data-id="${id}"]`)!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: (x += 7), clientY: 300 }));
      over('juniper');
      expect(on()).toBe('juniper');
      vi.advanceTimersByTime(UI.hoverDressMs / 2);
      over('body');
      vi.advanceTimersByTime(UI.hoverDressMs * 2);
      expect([on(), ...hero()]).toEqual(['body', 'Otto', 'otto']);
      // resting on a card puts that racer on show
      over('momo');
      vi.advanceTimersByTime(UI.hoverDressMs + 1);
      expect(hero()).toEqual(['Momo', 'momo']);
      ui.dispose();
    } finally { vi.useRealTimers(); }
  });

  it('paint by pointer: a swatch picks itself, the arrows step, a click on the row steps on; the turntable follows; Mirror toggles and reaches the plan', () => {
    const b = fake();
    const s = defaultSave();
    s.unlocked = { skins: ['pip-alt'], bodies: [], mirror: true };
    b.setItem(SAVE_KEY, JSON.stringify(s));
    const h = host();
    const ui = new UiRoot(document.body, h, b);
    toRoster(ui, 'quick');
    const arrow = q('[data-id="paint"] .arrow[data-dir="1"]')!;
    arrow.click();
    expect(ui.save.settings.skinByRacer).toEqual({ pip: 'pip-alt' });
    expect(ui.turntable()?.look).toEqual({ paint: 'pip-alt' });
    q('[data-id="paint"] [data-opt="default"] .sw')!.click(); // a swatch picks itself
    expect(ui.save.settings.skinByRacer).toEqual({});
    q('[data-id="paint"] .label')!.click(); // the row itself steps on
    expect(ui.save.settings.skinByRacer).toEqual({ pip: 'pip-alt' });
    expect(q('[data-id="mirror"]')?.getAttribute('aria-pressed')).toBe('false');
    q('[data-id="mirror"]')!.click();
    expect(ui.app.mirrored).toBe(true);
    expect(q('[data-id="mirror"]')?.getAttribute('aria-pressed')).toBe('true');
    q('[data-id="pip"]')!.click();
    ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    expect(h.plans[0]).toMatchObject({ mode: 'quick', racerId: 'pip', mirrored: true, look: { paint: 'pip-alt' } });
    ui.dispose();
    // a fresh load keeps the paint
    expect(loadSave(b).settings.skinByRacer).toEqual({ pip: 'pip-alt' });
  });

  it('Mirror switched on for a Quick Race never reaches a Time Trial', () => {
    const s = defaultSave();
    s.unlocked.mirror = true;
    const b = fake();
    b.setItem(SAVE_KEY, JSON.stringify(s));
    const h = host();
    const ui = new UiRoot(document.body, h, b);
    toRoster(ui, 'quick');
    ui.dispatch({ type: 'toggleMirror' });
    ui.dispatch({ type: 'back' });
    ui.dispatch({ type: 'pickMode', mode: 'timeTrial' });
    expect(q('[data-id="mirror"]')).toBeNull();
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    expect(h.plans[0].mirrored).toBe(false);
    ui.dispose();
  });

  it('a Time Trial best keeps the look its ghost is drawn in; a slower run in another look changes nothing', () => {
    const ui = new UiRoot(document.body, host(), null);
    toRoster(ui, 'timeTrial');
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' });
    const medalTimesMs = { gold: 126000, silver: 136000, bronze: 154000 };
    const run = (timeMs: number): RaceResults => ({ mode: 'timeTrial', trackId: 'harbour-loop', speedClass: 150, seed: 0, goTick: 360, ranks: [{ racerId: 'pip', rank: 1, finishTick: 12000, timeMs, lapTimesMs: [timeMs], dnf: false, projectedMs: -1 }] });
    ui.raceOver({ results: run(130000), trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: false, medalTimesMs, ghost: 'AQQA', look: { paint: 'pip-alt', body: 'buggy' } });
    expect(ui.save.timeTrial['harbour-loop']).toMatchObject({ ghost: 'AQQA', paint: 'pip-alt', body: 'buggy' });
    ui.raceOver({ results: run(140000), trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: false, medalTimesMs, ghost: 'BBBB', look: { body: 'classic' } });
    expect(ui.save.timeTrial['harbour-loop']).toMatchObject({ ghost: 'AQQA', paint: 'pip-alt', body: 'buggy' });
    ui.raceOver({ results: run(120000), trackName: 'Harbor Loop', playerId: 'pip', seriesHasNext: false, medalTimesMs, ghost: 'CCCC', look: {} });
    expect(ui.save.timeTrial['harbour-loop'].paint).toBeUndefined();
    expect(ui.save.timeTrial['harbour-loop'].body).toBeUndefined();
    ui.dispose();
  });

  it('grantAllUnlocks (the dev helper) unlocks all six and the roster shows the garage at once', () => {
    const ui = new UiRoot(document.body, host(), null);
    toRoster(ui, 'grandPrix');
    expect(q('.opt.locked')).not.toBeNull();
    ui.grantAllUnlocks();
    expect(unlockRows(ui.save).every((r) => r.unlocked)).toBe(true);
    expect(q('.opt.locked')).toBeNull();
    expect(q('.pick-hint')).toBeNull();
    expect(q('[data-id="mirror"]')).not.toBeNull();
    ui.dispose();
  });
});
