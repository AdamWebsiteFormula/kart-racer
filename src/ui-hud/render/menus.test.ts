// @vitest-environment jsdom
// Menu icons and the Settings help line (sweep 25 Sept 2026). The mode cards, locks, stars and step
// arrows are our own SVG: the OS emoji differed on every system and a Mac's calendar read "JUL 17" on
// the Daily card. No emoji is left anywhere a player looks. Settings says what the focused row does,
// following the keys, a pad and the pointer, over the title and in the pause menu.
import { afterEach, describe, expect, it } from 'vitest';
import { dailySeed } from '../../backend-leaderboard/rules.ts';
import { UI } from '../constants.ts';
import { DONE_HELP, SETTING_HELP } from '../screens/menus.ts';
import { UiRoot, type UiHost } from '../ui.ts';

function host(): UiHost {
  return {
    builtTracks: new Set(['harbour-loop', 'meadow-run', 'canyon-rush']),
    medalTimes: new Map([['harbour-loop', { gold: 126000, silver: 136000, bronze: 154000 }]]),
    availableModes: new Set(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']),
    creditsMarkdown: '## Code\n| Work | Author | License |\n|---|---|---|\n| three.js | mrdoob | MIT |\n',
    startRace: () => {}, nextRace: () => {}, restartRace: () => {}, quitRace: () => {}, setPaused: () => {}, settingsChanged: () => {},
  };
}

/** a character an OS may draw from its emoji font (◀ ▶ ⏸ 🔒 🏁 …; not ★ ✓ · ←) */
const EMOJI = /\p{Extended_Pictographic}/u;
const key = (code: string) => dispatchEvent(new KeyboardEvent('keydown', { code, key: code }));
/** every word on the screens on show */
const shown = () => [...document.querySelectorAll('#ui .screen.on')].map((e) => e.textContent ?? '').join(' ');
const q = (sel: string) => document.querySelector<HTMLElement>(`#ui .screen.on ${sel}`);

afterEach(() => { document.body.innerHTML = ''; delete (navigator as { getGamepads?: unknown }).getGamepads; });

describe('menu icons are our own', () => {
  it('each mode card wears its drawn icon beside the words that name it; the Daily\'s calendar is on the Daily\'s own day', () => {
    const ui = new UiRoot(document.body, host(), null);
    ui.dispatch({ type: 'boot' });
    ui.dispatch({ type: 'start' });
    const cards = [...document.querySelectorAll<HTMLElement>('#ui .mode-screen.on .modes [data-id]')];
    expect(cards.map((c) => c.querySelector('.icon > svg.mode-svg')?.getAttribute('data-mode'))).toEqual(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']);
    for (const c of cards) {
      expect(c.querySelector('.icon')!.getAttribute('aria-hidden'), c.dataset.id).toBe('true');
      expect(c.querySelector('.label')!.textContent, c.dataset.id).toBeTruthy();
    }
    // the day the Daily's track and board are (UTC), not the player's calendar, and never an emoji's "JUL 17"
    expect(q('[data-id="daily"] .icon')!.textContent).toMatch(new RegExp(`${dailySeed() % 100}$`));
    expect(EMOJI.test(shown())).toBe(false);
    ui.dispose();
  });

  it('no emoji on any screen: title, modes, racer and garage, cups and their stars, Settings, How to Play, Unlocks, Credits, the pause and the touch pad', () => {
    const ui = new UiRoot(document.body, host(), null);
    ui.save.unlocked = { skins: ['pip-alt'], bodies: [], mirror: false };
    ui.save.grandPrix = { sunrise: { [String(ui.app.speedClass)]: { finished: true, stars: 2, bestPoints: 40 } } };
    const clean = (where: string) => expect(EMOJI.test(shown()), where).toBe(false);
    ui.dispatch({ type: 'boot' }); clean('title');
    for (const open of ['openSettings', 'openHowTo', 'openUnlocks', 'openCredits'] as const) {
      ui.dispatch({ type: open }); clean(open);
      ui.dispatch({ type: 'back' });
    }
    // Unlocks: a star on the one earned, a lock on the rest, drawn and hidden from assistive tech (the row says it)
    ui.dispatch({ type: 'openUnlocks' });
    expect([...document.querySelectorAll('#ui .unlocks.on .unlock .mark > svg')].map((s) => s.getAttribute('class'))).toEqual(['star-svg on', 'lock-svg', 'lock-svg', 'lock-svg', 'lock-svg', 'lock-svg']);
    expect([...document.querySelectorAll('#ui .unlocks.on .unlock .mark')].every((m) => m.getAttribute('aria-hidden') === 'true')).toBe(true);
    ui.dispatch({ type: 'back' });
    ui.dispatch({ type: 'start' }); clean('modes');
    ui.dispatch({ type: 'pickMode', mode: 'grandPrix' }); clean('racer screen');
    // the garage: each locked option's padlock, beside its grayed swatch (not in it), and under the row
    expect(q('[data-id="body"] [data-opt="classic"] .sw-box > .lock > svg.lock-svg')).not.toBeNull();
    expect(q('[data-id="body"] [data-opt="classic"] .sw .lock')).toBeNull();
    expect(document.querySelectorAll('#ui .roster-screen.on .pick-hint .lk > svg.lock-svg').length).toBe(2); // Classic and Buggy (Pip's Berry is unlocked)
    expect(q('[data-id="paint"] .arrow[data-dir="-1"] > svg.arrow-svg')).not.toBeNull();
    ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); clean('cups');
    // the cup's stars, drawn as the results draw theirs, read as how many
    const stars = q('[data-id="sunrise"] .badge.star-badge')!;
    expect([...stars.querySelectorAll('svg')].map((s) => s.getAttribute('class'))).toEqual(['star-svg on', 'star-svg on', 'star-svg']);
    expect([stars.getAttribute('role'), stars.getAttribute('aria-label')]).toEqual(['img', '2 of 3 stars']);
    ui.dispatch({ type: 'pickCup', cupId: 'sunrise' });
    expect(ui.app.screen).toBe('racing');
    ui.dispatch({ type: 'pause' }); clean('pause');
    ui.dispatch({ type: 'openSettings' }); clean('pause settings');
    expect(EMOJI.test(ui.touch.root.textContent ?? ''), 'touch pad').toBe(false);
    expect(ui.touch.root.querySelectorAll('.pad .arrows > svg.arrow-svg').length).toBe(2);
    ui.dispose();
  });
});

describe('Settings says what the focused row does', () => {
  const help = () => document.querySelector<HTMLElement>('#ui .settings.on .foot .help')!;
  const hover = (id: string, x: number) => q(`[data-id="${id}"]`)!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x, clientY: 40 }));

  it('its line follows the keys, the pointer and a pad; it says what the value on show does; a value change keeps it still', () => {
    const ui = new UiRoot(document.body, host(), null);
    ui.dispatch({ type: 'boot' });
    ui.dispatch({ type: 'openSettings' });
    expect(help().textContent).toBe(SETTING_HELP.masterVolume);
    // for the eyes; assistive tech hears it with the row
    expect(help().getAttribute('aria-hidden')).toBe('true');
    expect(q('[data-id="masterVolume"]')!.getAttribute('aria-label')).toBe(`Master volume: 80%. ${SETTING_HELP.masterVolume} Left and right change it.`);
    key('ArrowDown');
    expect(help().textContent).toBe(SETTING_HELP.musicVolume);
    // a volume change draws the panel again: the same line, not brought in again
    key('ArrowLeft');
    expect(help().textContent).toBe(SETTING_HELP.musicVolume);
    expect(help().firstElementChild!.className).toBe('still');
    // Graphics says what Auto does, then High once it is High, the new line coming in
    key('ArrowDown'); key('ArrowDown');
    expect(help().textContent).toBe(SETTING_HELP.quality.auto);
    expect(help().textContent).toBe('Auto picks the best look your device can keep smooth.');
    key('ArrowRight');
    expect(ui.save.settings.quality).toBe('high');
    expect(help().textContent).toBe(SETTING_HELP.quality.high);
    expect(help().firstElementChild!.className).toBe('');
    // the pointer: whatever row it moves onto, and Done
    hover('iconLabels', 10);
    expect(help().textContent).toBe(SETTING_HELP.iconLabels);
    expect(q('[data-id="iconLabels"] .label')!.textContent).toBe('Item labels');
    hover('done', 12);
    expect(help().textContent).toBe(DONE_HELP);
    // a pad's D-pad (past the dialog's opening move: a pad press during it is dropped)
    const later = ui.clock() + UI.wipeMs + 1;
    ui.clock = () => later;
    const pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    pad.buttons[12].pressed = true;
    ui.poll(1000);
    expect(help().textContent).toBe(SETTING_HELP.iconLabels);
    pad.buttons[12].pressed = false;
    ui.poll(1016);
    pad.buttons[12].pressed = true;
    ui.poll(1032);
    expect(help().textContent).toBe(SETTING_HELP.reducedMotion.auto);
    ui.dispose();
  });

  it('the pause menu\'s Settings has it too', () => {
    const ui = new UiRoot(document.body, host(), null);
    for (const a of [{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickTrack', trackId: 'harbour-loop' }, { type: 'pause' }, { type: 'openSettings' }] as const) ui.dispatch(a);
    expect(ui.app.overlays).toEqual(['pause', 'settings']);
    expect(help().textContent).toBe(SETTING_HELP.masterVolume);
    for (let i = 0; i < 5; i++) key('ArrowDown');
    expect(help().textContent).toBe(SETTING_HELP.reducedMotion.auto);
    key('ArrowRight');
    expect(help().textContent).toBe(SETTING_HELP.reducedMotion.on);
    ui.dispose();
  });

  it('every row and Done has a line, short enough to sit on one line of the panel', () => {
    const lines = [...Object.values(SETTING_HELP).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))), DONE_HELP];
    expect(lines.length).toBe(12);
    // measured in Chrome at 15px Fredoka: the longest (55 characters) is 412 px of the panel's 444
    for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(56);
    expect(new Set(lines).size).toBe(lines.length);
  });
});
