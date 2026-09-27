// @vitest-environment jsdom
// Any racer in any kart in the DOM (design §12; docs/plans/kart-combos.md K4, K5): keys alone walk Racer → Kart →
// Track and back, a locked kart previews but is refused, a chosen one locks in before the next screen, touch
// previews on a first tap and chooses on a second, the pointer previews once it rests, the race is handed the
// kart, the Racer screen shows the stats panel and no Body row, and a Kart screen drawn again writes nothing.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UI } from '../constants.ts';
import { comboStats } from '../data/kartStats.ts';
import { kartMenu } from '../screens/karts.ts';
import { defaultSave, SAVE_KEY } from '../store.ts';
import { UiRoot, type RacePlan, type UiHost } from '../ui.ts';
import { KartView } from './karts.ts';

function host(): UiHost & { plans: RacePlan[]; sounds: string[] } {
  const plans: RacePlan[] = [], sounds: string[] = [];
  return {
    plans, sounds,
    builtTracks: new Set(['harbour-loop', 'meadow-run', 'canyon-rush']),
    medalTimes: new Map([['harbour-loop', { gold: 126000, silver: 136000, bronze: 154000 }]]),
    availableModes: new Set(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']),
    creditsMarkdown: '',
    startRace: (p) => plans.push(p),
    nextRace: () => {}, restartRace: () => {}, quitRace: () => {}, setPaused: () => {}, settingsChanged: () => {},
    uiSound: (k) => sounds.push(k),
  };
}

const key = (code: string) => dispatchEvent(new KeyboardEvent('keydown', { code, key: code }));
const focused = () => (document.activeElement as HTMLElement | null)?.dataset.id;
const q = (sel: string) => document.querySelector<HTMLElement>(`#ui .screen.on ${sel}`);
/** the kart the hero shows (the game draws it in the hero's box: the box names it) */
const heroKart = () => q('.hero-box')?.dataset.kart;
/** a UiRoot with karts picked and, unless `motion`, reduced motion (a kart chosen goes on at once) */
function root(h: UiHost, motion = false, backend: ConstructorParameters<typeof UiRoot>[2] = null): UiRoot {
  const ui = new UiRoot(document.body, h, backend, { kartPick: true });
  if (!motion) ui.save.settings.reducedMotion = 'on';
  return ui;
}

afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('the Kart screen by keys alone (K4 gate)', () => {
  it('Racer → Kart → Track → race: the race gets the racer and the kart, and the kart is saved', () => {
    const h = host();
    const ui = root(h);
    ui.dispatch({ type: 'boot' });
    key('Enter'); // Race!
    key('Enter'); // Quick Race
    expect(ui.app.screen).toBe('rosterSelect');
    key('ArrowRight'); // Momo
    key('Enter');
    expect(ui.app.screen).toBe('kartSelect');
    // it opens on the kart Momo is in now: her own, the Scrap Buggy, on show in the hero
    expect(focused()).toBe('scrap');
    expect(heroKart()).toBe('scrap');
    // the kart's name big under the hero; the racer's with it where the stats name the pair
    expect(q('.np-name')!.textContent).toBe('Scrap Buggy');
    expect(q('.sp-title')!.textContent).toBe('Momo in the Scrap Buggy');
    for (let i = 0; i < 6; i++) key('ArrowRight');
    expect(focused()).toBe('snacktruck');
    expect(heroKart()).toBe('snacktruck');
    key('Enter');
    expect(ui.app.screen).toBe('trackSelect');
    expect(ui.save.settings.selectedKartId).toBe('snacktruck');
    key('Enter');
    expect(ui.app.screen).toBe('racing');
    expect(h.plans.at(-1)).toMatchObject({ mode: 'quick', racerId: 'momo', kartId: 'snacktruck', tracks: ['harbour-loop'] });
    ui.dispose();
  });

  it('Escape: the track screen back to the Kart screen (on the kart chosen), the Kart screen back to the racer, kept', () => {
    const ui = root(host());
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'timeTrial' }, { type: 'pickRacer', racerId: 'otto' }] as const) ui.dispatch(a);
    key('ArrowDown'); // Otto's Wave Skimmer (the middle of the second row) → the Snack Truck under it
    expect(focused()).toBe('snacktruck');
    key('ArrowRight'); // Classic, locked: Enter would refuse it
    key('ArrowLeft'); // back to the Snack Truck
    key('Enter');
    expect(ui.app.screen).toBe('trackSelect');
    key('Escape');
    expect([ui.app.screen, focused()]).toEqual(['kartSelect', 'snacktruck']);
    key('Escape');
    expect([ui.app.screen, focused(), ui.app.racerId]).toEqual(['rosterSelect', 'otto', 'otto']);
    // and on again: the Kart screen opens on the kart chosen before
    key('Enter');
    expect([ui.app.screen, focused()]).toEqual(['kartSelect', 'snacktruck']);
    ui.dispose();
  });

  it('the arrows run through all ten and wrap; a pad walks it the same', () => {
    const ui = root(host());
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }] as const) ui.dispatch(a);
    const seen: string[] = [];
    for (let i = 0; i < 10; i++) { seen.push(focused()!); key('ArrowRight'); }
    expect(seen).toEqual(['scooter', 'scrap', 'pod', 'wagon', 'skimmer', 'windup', 'stomper', 'snacktruck', 'classic', 'buggy']);
    expect(focused()).toBe('scooter');
    key('ArrowLeft');
    expect(focused()).toBe('buggy');
    key('ArrowUp'); // three across: the Buggy alone in the last row, under the Stone Stomper
    expect(focused()).toBe('stomper');
    // the keys never land on Back (Escape is theirs)
    for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) { key(k); expect(focused()).not.toBe('back'); }
    // a pad's D-pad and A, past the screen's opening move (a pad press during it is dropped)
    const later = ui.clock() + UI.wipeMs + 1;
    ui.clock = () => later;
    const pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    let t = 0;
    const press = (b: number) => { pad.buttons[b].pressed = true; ui.poll((t += 16)); pad.buttons[b].pressed = false; ui.poll((t += 16)); };
    for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight']) key(k); // from the Timber Wagon along to the Snack Truck
    const at = focused()!;
    expect(at).toBe('snacktruck');
    press(15); // right
    expect(focused()).not.toBe(at);
    press(14); // left
    expect(focused()).toBe(at);
    press(0); // A
    expect(ui.app.screen).toBe('trackSelect');
    delete (navigator as { getGamepads?: unknown }).getGamepads;
    ui.dispose();
  });

  it('a locked twin previews but Enter refuses it: it shakes, the refusal sounds, and nothing is picked', () => {
    const h = host();
    const ui = root(h);
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }] as const) ui.dispatch(a);
    key('ArrowLeft'); // Buggy
    key('ArrowLeft'); // Classic
    expect(focused()).toBe('classic');
    expect(heroKart()).toBe('classic');
    // the name under the hero says how to earn it, behind our padlock
    expect(q('.nameplate')!.classList.contains('locked')).toBe(true);
    expect(q('.np-text')!.textContent).toBe('Finish a Grand Prix');
    expect(q('.nameplate .np-lock svg.lock-svg')).not.toBeNull();
    h.sounds.length = 0;
    key('Enter');
    expect(ui.app.screen).toBe('kartSelect');
    expect(q('[data-id="classic"]')!.classList.contains('refused')).toBe(true);
    expect(h.sounds).toEqual(['back']);
    expect(ui.save.settings.selectedKartId).toBeUndefined();
    // unlocked, it can be chosen
    ui.save.unlocked.bodies.push('classic');
    ui.dispatch({ type: 'back' });
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' });
    key('ArrowLeft'); key('ArrowLeft');
    expect(q('[data-id="classic"]')!.getAttribute('aria-disabled')).toBeNull();
    key('Enter');
    expect([ui.app.screen, ui.app.kartId]).toEqual(['trackSelect', 'classic']);
    ui.dispose();
  });
});

describe('choosing a kart', () => {
  it('locks in with a short pulse before the next screen (UI.lockInMs), and input waits it out', () => {
    vi.useFakeTimers();
    const h = host();
    const ui = root(h, true);
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'grandPrix' }, { type: 'pickRacer', racerId: 'gus' }] as const) ui.dispatch(a);
    key('ArrowRight'); // Classic, after the Snack Truck
    key('ArrowLeft'); // back to the Snack Truck
    key('Enter');
    expect(ui.app.screen).toBe('kartSelect');
    expect(q('[data-id="snacktruck"]')!.classList.contains('locked-in')).toBe(true);
    expect(q('[data-id="snacktruck"] .kc-stamp')!.textContent).toBe('Locked in!');
    key('ArrowRight'); key('Escape'); // dropped while it locks in
    expect(ui.app.screen).toBe('kartSelect');
    vi.advanceTimersByTime(UI.lockInMs);
    expect([ui.app.screen, ui.app.kartId]).toEqual(['cupSelect', 'snacktruck']);
    // back again: the pulse is over
    ui.dispatch({ type: 'back' });
    expect(q('.kart-tile.locked-in')).toBeNull();
    ui.dispose();
  });

  it('by touch: a first tap on a card previews it, a second tap on the same card chooses it; a mouse click chooses at once', () => {
    const h = host();
    const ui = root(h);
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'nova' }] as const) ui.dispatch(a);
    const tap = (id: string) => {
      const card = q(`[data-id="${id}"]`)!;
      card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
      card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };
    // it opens on Nova's own Comet Pod; a finger sliding over another card is no hover (a slow tap would put it on
    // show, then choose it on release)
    expect([focused(), heroKart()]).toEqual(['pod', 'pod']);
    vi.useFakeTimers();
    q('[data-id="windup"]')!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'touch', clientX: 40, clientY: 60 }));
    vi.advanceTimersByTime(UI.hoverDressMs * 2);
    vi.useRealTimers();
    expect([focused(), heroKart()]).toEqual(['pod', 'pod']);
    tap('wagon');
    expect([ui.app.screen, focused(), heroKart()]).toEqual(['kartSelect', 'wagon', 'wagon']);
    tap('stomper');
    expect([ui.app.screen, focused(), heroKart()]).toEqual(['kartSelect', 'stomper', 'stomper']);
    tap('stomper');
    expect([ui.app.screen, ui.app.kartId]).toEqual(['trackSelect', 'stomper']);
    // a mouse: one click
    ui.dispatch({ type: 'back' });
    const card = q('[data-id="pod"]')!;
    card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect([ui.app.screen, ui.app.kartId]).toEqual(['trackSelect', 'pod']);
    ui.dispose();
  });

  it('the pointer takes the focus at once, and puts a kart on show once it rests there (UI.hoverDressMs)', () => {
    vi.useFakeTimers();
    const ui = root(host());
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }] as const) ui.dispatch(a);
    expect(heroKart()).toBe('scooter');
    let x = 10;
    const over = (id: string) => q(`[data-id="${id}"]`)!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: (x += 7), clientY: 50 }));
    over('pod');
    over('skimmer'); // passing over
    expect(focused()).toBe('skimmer');
    expect(heroKart()).toBe('scooter');
    vi.advanceTimersByTime(UI.hoverDressMs);
    expect(heroKart()).toBe('skimmer');
    // a locked one previews under the pointer too
    over('buggy');
    vi.advanceTimersByTime(UI.hoverDressMs);
    expect([focused(), heroKart()]).toEqual(['buggy', 'buggy']);
    ui.dispose();
  });

  it('the stage hook: the Kart screen hands the game the hero\'s box with the racer and the kart under the focus (the plan\'s K6; game/showroom.ts)', () => {
    const ui = root(host());
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'boulder' }] as const) ui.dispatch(a);
    key('ArrowLeft'); // from his own Stone Stomper to the Wind-Up Racer
    const t = ui.turntable()!;
    expect(t.box).toBe(q('.hero-box'));
    expect(t.box.getAttribute('aria-hidden')).toBe('true');
    expect([t.racerId, t.kartId]).toEqual(['boulder', 'windup']);
    // the racer screen's: the racer on show in the kart they would race in (their own until one is chosen)
    ui.dispatch({ type: 'back' });
    expect(ui.turntable()).toMatchObject({ racerId: 'boulder', kartId: 'stomper', look: {} });
    ui.dispose();
  });
});

describe('the stats behind a button (Adam, 26 Sept 2026: "it shouldn\'t even appear unless you press a button"; MKW\'s "Details" on Y)', () => {
  const shown = () => q('.stat-panel')?.hidden === false;
  const statsBtn = () => q('.prompts [data-id="stats"]')!;

  it('hidden on both screens until Y; Y shows them and they stay shown on the Kart screen; Y again hides them; the prompt says which', () => {
    const ui = root(host());
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }] as const) ui.dispatch(a);
    expect(shown()).toBe(false);
    expect(statsBtn().getAttribute('aria-pressed')).toBe('false');
    expect(statsBtn().textContent).toBe('YStats');
    key('KeyY');
    expect(shown()).toBe(true);
    expect(ui.statsShown).toBe(true);
    expect(statsBtn().getAttribute('aria-pressed')).toBe('true');
    expect(q('.select-side')!.classList.contains('stats-on')).toBe(true);
    key('Enter'); // Pip → the Kart screen: still shown, now Pip in the kart under the focus
    expect(ui.app.screen).toBe('kartSelect');
    expect(shown()).toBe(true);
    expect(q('.sp-title')!.textContent).toBe('Pip in the Parcel Scooter');
    key('ArrowRight');
    expect(q('.sp-title')!.textContent).toBe('Pip in the Scrap Buggy');
    key('KeyY');
    expect(shown()).toBe(false);
    expect(statsBtn().getAttribute('aria-pressed')).toBe('false');
    // Y is nothing elsewhere: the track screen has no stats, and the key changes nothing there
    key('Enter');
    expect(ui.app.screen).toBe('trackSelect');
    key('KeyY');
    expect(ui.statsShown).toBe(false);
    ui.dispose();
  });

  it('a click or a tap on the Stats prompt shows and hides them, the focus kept on the tiles for the keys', () => {
    const ui = root(host());
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'gus' }] as const) ui.dispatch(a);
    statsBtn().click();
    expect(shown()).toBe(true);
    expect(focused()).toBe('snacktruck'); // the keys carry on from the tile they were on
    key('ArrowLeft');
    expect(focused()).toBe('stomper');
    statsBtn().click();
    expect(shown()).toBe(false);
    // Back is a button of the prompt bar too: the way Escape goes
    q('.prompts [data-id="back"]')!.click();
    expect(ui.app.screen).toBe('rosterSelect');
    ui.dispose();
  });

  it('a pad\'s Y (the top face button) shows them on a fresh press, not while held; the prompts name the pad\'s buttons', () => {
    const ui = root(host());
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }] as const) ui.dispatch(a);
    const later = ui.clock() + UI.wipeMs + 1;
    ui.clock = () => later;
    const pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    let t = 0;
    ui.poll((t += 16));
    pad.buttons[UI.padStatsButton].pressed = true;
    ui.poll((t += 16));
    expect(shown()).toBe(true);
    ui.poll((t += 16)); // still held: no second toggle
    ui.poll((t += 16));
    expect(shown()).toBe(true);
    expect(document.documentElement.dataset.input).toBe('pad');
    pad.buttons[UI.padStatsButton].pressed = false;
    ui.poll((t += 16));
    pad.buttons[UI.padStatsButton].pressed = true;
    ui.poll((t += 16));
    expect(shown()).toBe(false);
    delete (navigator as { getGamepads?: unknown }).getGamepads;
    ui.dispose();
  });

  it('a screen reader still gets every stat with the panel hidden: each tile\'s label carries them', () => {
    const ui = root(host());
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }] as const) ui.dispatch(a);
    expect(shown()).toBe(false);
    for (const b of document.querySelectorAll('#ui .roster-screen.on .racer-tile')) expect(b.getAttribute('aria-label')).toMatch(/Speed \d+ of 10\. Accel \d+ of 10\. Handling \d+ of 10\. Weight \d+ of 10\.$/);
    ui.dispatch({ type: 'pickRacer', racerId: 'momo' });
    for (const b of document.querySelectorAll('#ui .kart-screen.on .kart-tile')) expect(b.getAttribute('aria-label')).toMatch(/Speed \d+ of 10(, (up|down) \d+)?\. Accel/);
    // the pictures are for the eyes: no alt words to read twice
    expect([...document.querySelectorAll('#ui .kart-screen.on img')].every((i) => i.getAttribute('alt') === '')).toBe(true);
    ui.dispose();
  });
});

describe('the Racer screen with karts picked (design §12)', () => {
  it('the stats wait behind the Stats button (the racer on show in the kart they would race in), and no Body row (Classic and Buggy are karts now); off, the stats still there', () => {
    const on = root(host());
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }] as const) on.dispatch(a);
    const panel = q('.select-side > .stat-panel')!;
    expect(panel).not.toBeNull();
    expect(panel.hidden).toBe(true); // hidden until asked for (Adam, 26 Sept 2026)
    expect(q('[data-id="body"]')).toBeNull();
    // under the hero: the racer's name big, the kart they would race in under it; no class, words or bars on any tile
    expect(q('.np-name')!.textContent).toBe('Pip');
    expect(q('.np-text')!.textContent).toBe('Parcel Scooter');
    expect(q('.racer-tile .cls, .racer-tile .stats, .racer-tile .who, .racer-tile .quip')).toBeNull();
    expect(q('[data-id="gus"]')!.textContent).toBe('B'); // (its initial under the picture, hidden from assistive tech)
    // each tile's own four stats in its label, for a screen reader
    expect(q('[data-id="gus"]')!.getAttribute('aria-label')).toMatch(/Speed \d+ of 10\. Accel \d+ of 10\. Handling \d+ of 10\. Weight \d+ of 10\.$/);
    // moving to Big Gus: the panel's ghost is Gus in his own kart over Pip in hers, both named
    key('ArrowLeft');
    expect(focused()).toBe('gus');
    const speed = q('.select-side > .stat-panel .sp-row[data-stat="speed"]')!;
    expect(speed.getAttribute('data-ghost')).toBe('gain');
    expect(speed.querySelector('.sp-chev')!.getAttribute('data-n')).toBe('3');
    expect(q('.sp-title')!.textContent).toBe('Big Gus in the Snack Truck');
    expect(q('.np-text')!.textContent).toBe('Snack Truck');
    on.dispose();
    document.body.innerHTML = '';
    const off = new UiRoot(document.body, host(), null, { kartPick: false });
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }] as const) off.dispatch(a);
    expect(q('.stat-panel')?.hidden).toBe(true); // the racer in their own kart (their class), behind the button as ever
    expect(q('[data-id="body"]')).not.toBeNull();
    off.dispatch({ type: 'pickRacer', racerId: 'pip' });
    expect(off.app.screen).toBe('trackSelect');
    off.dispose();
  });

  it('an old save\'s Buggy body becomes the kart (seeded once) and the race gets it; the Unlocks list names the twins as karts', () => {
    const store = new Map([[SAVE_KEY, JSON.stringify({ settings: { selectedRacerId: 'juniper', selectedBodyId: 'buggy' }, unlocked: { bodies: ['buggy'] } })]]);
    const h = host();
    const ui = root(h, false, { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); } });
    expect(ui.app.kartId).toBe('buggy');
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }] as const) ui.dispatch(a);
    key('Enter'); // Juniper
    expect(focused()).toBe('buggy');
    key('Enter');
    key('Enter');
    expect(h.plans.at(-1)).toMatchObject({ racerId: 'juniper', kartId: 'buggy', look: { body: 'buggy' } });
    ui.dispatch({ type: 'pause' }); ui.dispatch({ type: 'quit' }); ui.dispatch({ type: 'back' });
    ui.dispatch({ type: 'openUnlocks' });
    const names = [...document.querySelectorAll('#ui .unlocks.on .unlock b')].map((e) => e.textContent);
    expect(names).toContain('Classic kart');
    expect(names).toContain('Buggy kart');
    expect(names).not.toContain('Classic body');
    ui.dispose();
  });
});

describe('the Kart screen renderer (K5)', () => {
  it('a landmark, ten real buttons each named with its bars, one focused; a locked one says so', () => {
    const ui = root(host());
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'gus' }] as const) ui.dispatch(a);
    const screen = document.querySelector<HTMLElement>('#ui .kart-screen.on')!;
    expect(screen.getAttribute('aria-label')).toBe('Pick your kart');
    const cards = [...screen.querySelectorAll<HTMLButtonElement>('.kart-tile')];
    expect(cards.length).toBe(10);
    expect(cards.every((c) => c.tagName === 'BUTTON' && c.type === 'button')).toBe(true);
    expect(screen.querySelectorAll('.focused').length).toBe(1);
    expect(screen.querySelectorAll('[tabindex="0"]').length).toBe(1);
    const truck = cards.find((c) => c.dataset.id === 'snacktruck')!;
    expect(truck.getAttribute('aria-label')).toBe(`Snack Truck, Big Gus's kart. Top speed, turns like a truck. Your kart now. ${truck.getAttribute('aria-label')!.split('Your kart now. ')[1]}`);
    expect(truck.getAttribute('aria-label')).toMatch(/Speed 8 of 10\. Accel 2 of 10\. Handling 3 of 10\. Weight 10 of 10\.$/);
    const classic = cards.find((c) => c.dataset.id === 'classic')!;
    expect(classic.getAttribute('aria-label')).toMatch(/^Classic, Same stats as the Wind-Up Racer\. Quick on straights, stiff in bends\. Locked: Finish a Grand Prix\. Speed/);
    expect(classic.getAttribute('aria-disabled')).toBe('true');
    expect(classic.querySelector('.kc-hint')!.textContent).toBe('Finish a Grand Prix');
    expect(classic.querySelector('.kc-art .kc-lock svg.lock-svg')).not.toBeNull();
    // each tile's picture: its own kart rendered from its 3D model in its colors (a twin in the racer's), our drawing
    // under it until it loads; both hidden from assistive tech (the label says it); no words on a tile but a lock's
    expect(cards.map((c) => c.querySelector('img.art')!.getAttribute('src'))).toEqual(cards.map((c) => `/art/karts/${c.dataset.id === 'classic' || c.dataset.id === 'buggy' ? `${c.dataset.id}-gus` : c.dataset.id}.webp`));
    expect(cards.every((c) => c.querySelector('img.art')!.getAttribute('alt') === '')).toBe(true);
    expect(cards.map((c) => c.querySelector('svg.kart-svg')!.getAttribute('data-kart'))).toEqual(cards.map((c) => c.dataset.id));
    expect(cards.every((c) => c.querySelector('svg.kart-svg')!.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(cards.filter((c) => (c.textContent ?? '').replace(/Locked in!|✓/g, '').trim()).map((c) => c.dataset.id)).toEqual(['classic', 'buggy']);
    // Back and Stats in the prompts along the bottom; no emoji anywhere (the check on the chosen kart is text, as the class row's)
    expect(screen.querySelector('.prompts [data-id="back"]')).not.toBeNull();
    expect(screen.querySelector('.prompts [data-id="stats"]')!.getAttribute('aria-pressed')).toBe('false');
    expect(/\p{Extended_Pictographic}/u.test(screen.textContent ?? '')).toBe(false);
    expect(screen.querySelector('.stat-panel')!.getAttribute('role')).toBe('group');
    // the panel's words for a screen reader
    const words = [...screen.querySelectorAll('.stat-panel .sp-row > .sr-only')].map((e) => e.textContent);
    expect(words).toEqual(['Speed 8 of 10', 'Accel 2 of 10', 'Handling 3 of 10', 'Weight 10 of 10']);
    key('ArrowLeft'); // the Stone Stomper: a speed step down, a handling step up
    expect([...screen.querySelectorAll('.stat-panel .sp-row > .sr-only')].map((e) => e.textContent)).toEqual(['Speed 7 of 10, down 1', 'Accel 2 of 10', 'Handling 4 of 10, up 1', 'Weight 10 of 10']);
    const speed = screen.querySelector('.stat-panel .sp-row[data-stat="speed"]')!;
    expect([speed.getAttribute('data-ghost'), speed.querySelector('.sp-chev')!.getAttribute('data-dir'), speed.querySelector('.sp-chev')!.getAttribute('data-n')]).toEqual(['loss', 'down', '1']);
    ui.dispose();
  });

  it('drawn again the same, it writes nothing to the DOM (and the panel neither)', () => {
    const v = new KartView(document.body);
    const save = defaultSave();
    const vm = () => kartMenu(save, 'pip', 'scooter', (k) => comboStats('pip', k));
    v.render(vm());
    const preview = () => v.preview({ kartId: 'pod', name: 'Comet Pod', colors: ['#B39DDB', '#FFFFFF'], locked: false, racerId: 'pip', racerName: 'Pip', panel: { rows: [] } });
    preview();
    const text = vi.spyOn(Node.prototype, 'textContent', 'set');
    const attr = vi.spyOn(Element.prototype, 'setAttribute');
    const html = vi.spyOn(Element.prototype, 'innerHTML', 'set');
    const add = vi.spyOn(Node.prototype, 'appendChild');
    const style = vi.spyOn(CSSStyleDeclaration.prototype, 'setProperty');
    v.render(vm());
    preview();
    expect(text).not.toHaveBeenCalled();
    expect(attr).not.toHaveBeenCalled();
    expect(html).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
    expect(style).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
