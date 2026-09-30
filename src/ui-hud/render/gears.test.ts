// @vitest-environment jsdom
// Gears, not coins (Adam, 26 Sept 2026: "I don't think the game needs coins, because that's too much of a copy of
// Mario Kart"): the race HUD's pill shows our own gear and the count, the cog clicks round a tooth on a gain and
// the pill glows at the cap, a screen reader hears "Gears", and nothing a player reads or hears says "coin".
// (The sim still counts coins: kart state, race-manager, the AI and saved data keep the name.)
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createKartState } from '../../kart-controller/types.ts';
import type { RaceResults, RaceState } from '../../race-manager/types.ts';
import { gearPath, gearSvg } from '../gearIcon.ts';
import { hudModel, newHudMemory } from '../hudModel.ts';
import { UiRoot, type UiHost } from '../ui.ts';
import { HudView } from './hud.ts';

type Fs = { readFileSync(p: string, enc: 'utf8'): string };
let credits = '';
/** the repo root on disk (a plain path: under jsdom node:fs refuses jsdom's URL) */
const ROOT = decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/src\/ui-hud\/render\/[^/]+$/, ''));
beforeAll(async () => { credits = ((await import('node:fs' as string)) as Fs).readFileSync(`${ROOT}CREDITS.md`, 'utf8'); });
afterEach(() => { document.body.innerHTML = ''; });

const race = { mode: 'quick', lapsTotal: 3, time: 65.5, phase: 'racing', knockout: undefined } as unknown as RaceState;
const kart = (gears: number) => {
  const k = createKartState({ racerId: 'p', isPlayer: true });
  k.lap = 2; k.rank = 4; k.coins = gears; k.speed = 25;
  return k;
};

describe('the gear pill', () => {
  it('shows our own gear and two digits, named for screen readers; no coin anywhere in it', () => {
    const v = new HudView(document.body);
    v.render(hudModel(race, kart(2), 4, 10, newHudMemory(), 1, [], 0));
    const pill = v.root.querySelector('.gears')!;
    expect(pill.textContent).toBe('02');
    const icon = pill.querySelector('.gear')!;
    expect([icon.getAttribute('role'), icon.getAttribute('aria-label')]).toEqual(['img', 'Plasma orbs']);
    expect(icon.querySelector('svg.gear-svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(v.root.querySelector('.coins, .coin')).toBeNull();
    expect(v.root.outerHTML).not.toMatch(/coin/i);
  });

  it('clicks the cog round a tooth when a gear comes in (not when one is lost), and glows at the cap', () => {
    const v = new HudView(document.body);
    const m = newHudMemory();
    v.render(hudModel(race, kart(4), 4, 10, m, 1, [], 0));
    const icon = v.root.querySelector('.gears .gear')!, pill = v.root.querySelector('.gears')!;
    expect(icon.classList.contains('tick')).toBe(false); // the first frame of a race: nothing came in
    v.render(hudModel(race, kart(5), 4, 10, m, 1, [], 0));
    expect(icon.classList.contains('tick')).toBe(true);
    icon.classList.remove('tick');
    v.render(hudModel(race, kart(3), 4, 10, m, 1, [], 0)); // a hit knocked 2 loose
    expect(icon.classList.contains('tick')).toBe(false);
    expect(pill.classList.contains('full')).toBe(false);
    v.render(hudModel(race, kart(10), 4, 10, m, 1, [], 0));
    expect([pill.textContent, pill.classList.contains('full')]).toEqual(['10', true]);
  });

  it('draws the plasma orb (30 Sept 2026): a green glow round a green sphere, white-hot at its heart; the cog outline kept for the menu', () => {
    const svg = gearSvg();
    expect((svg.match(/<circle/g) ?? []).length).toBe(2);
    expect(svg).toContain('#39ff14');
    expect(svg).not.toMatch(/#f2b705|#ffd23f|gold/i); // never a gold coin
    expect(gearPath().split('L')).toHaveLength(8 * 5);
  });
});

describe('nothing a player reads says coin', () => {
  const host = (): UiHost => ({
    builtTracks: new Set(['harbour-loop', 'meadow-run', 'canyon-rush']),
    medalTimes: new Map([['harbour-loop', { gold: 126000, silver: 136000, bronze: 154000 }]]),
    availableModes: new Set(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']),
    creditsMarkdown: credits,
    startRace: () => {}, nextRace: () => {}, restartRace: () => {}, quitRace: () => {}, setPaused: () => {}, settingsChanged: () => {}, skipToResults: () => {},
  });
  /** every word on the page and every word it gives a screen reader or a tooltip */
  const read = () => {
    const words = [document.body.textContent ?? ''];
    for (const e of document.querySelectorAll('*')) {
      for (const a of ['aria-label', 'aria-description', 'aria-roledescription', 'title', 'alt', 'placeholder', 'data-n']) {
        const v = e.getAttribute(a);
        if (v) words.push(v);
      }
    }
    return words.join('\n');
  };

  it('on the title, How to Play, Settings, Credits, the race HUD, the pause menu and the results', () => {
    const ui = new UiRoot(document.body, host(), null);
    const seen: string[] = [];
    ui.dispatch({ type: 'boot' });
    seen.push(read());
    for (const open of ['openHowTo', 'openSettings', 'openCredits'] as const) {
      ui.dispatch({ type: open });
      seen.push(read());
      ui.dispatch({ type: 'back' });
    }
    // How to Play does tell of the gears, in its own words
    ui.dispatch({ type: 'openHowTo' });
    expect(read()).toContain('Grab plasma orbs to charge up your kart');
    ui.dispatch({ type: 'back' });
    for (const a of [{ type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickTrack', trackId: 'harbour-loop' }] as const) {
      ui.dispatch(a);
      seen.push(read());
    }
    const frame = (gears: number) => ui.race({
      state: { mode: 'quick', lapsTotal: 3, time: 40, phase: 'racing', tick: 5000, goTick: 360, karts: [] } as never,
      player: { racerId: 'pip', isPlayer: true, lap: 2, rank: 3, coins: gears, speed: 20, item: { held: '', charges: 0, rouletteRemaining: 0, next: '', nextCharges: 0, nextRouletteRemaining: 0 }, boost: { remaining: 0 }, drift: { tier: 0, active: false }, status: {} } as never,
      shownRank: 3, coinCap: 10, map: { toMinimap: () => [0, 0], outlines: [] } as never, itemDefs: [],
    }, 1000);
    frame(4);
    ui.feed([{ type: 'coin', racerId: 'pip', coins: 5 }], [{ type: 'hit', racerId: 'pip', byRacerId: 'momo', itemId: 'beachBall', spun: true, coinsLost: 2 }], 'pip');
    frame(10);
    expect(document.querySelector('#ui .gears')?.textContent).toBe('10');
    seen.push(read());
    ui.dispatch({ type: 'pause' });
    seen.push(read());
    ui.dispatch({ type: 'resume' });
    const results: RaceResults = {
      mode: 'quick', trackId: 'harbour-loop', speedClass: 150, seed: 1, goTick: 360,
      ranks: ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'].map((id, i) => ({ racerId: id, rank: i + 1, finishTick: 12000 + i * 60, timeMs: 97000 + i * 500, lapTimesMs: [33000, 32000, 32000], dnf: false, projectedMs: -1 })),
    };
    ui.raceOver({ results, trackName: 'Lighthouse Loop', playerId: 'pip', seriesHasNext: false });
    seen.push(read());
    expect(seen.length).toBeGreaterThan(8);
    for (const words of seen) expect(words).not.toMatch(/\bcoins?\b/i);
    ui.dispose();
  });
});
