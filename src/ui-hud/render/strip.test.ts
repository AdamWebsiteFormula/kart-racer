// @vitest-environment jsdom
// The controls strip (25 Sept 2026, the look review: Mario Kart World shows no controls in a race): it shows
// through the countdown of the player's first race of the session and nowhere else: not in lap 1, not in
// any later race, not after a restart.
import { afterEach, describe, expect, it } from 'vitest';
import { UiRoot, type UiHost } from '../ui.ts';

function host(): UiHost {
  return {
    builtTracks: new Set(['harbour-loop', 'meadow-run', 'canyon-rush']),
    medalTimes: new Map(),
    availableModes: new Set(['quick', 'grandPrix', 'knockout', 'timeTrial', 'daily']),
    creditsMarkdown: '',
    startRace: () => undefined,
    nextRace: () => undefined,
    restartRace: () => undefined,
    quitRace: () => undefined,
    setPaused: () => undefined,
    settingsChanged: () => undefined,
    skipToResults: () => undefined,
  };
}

/** One HUD frame: the countdown's tick `tick` (before the go at 360) or the race after it. */
const frame = (ui: UiRoot, phase: 'countdown' | 'racing', tick: number) => ui.race({
  state: { mode: 'quick', lapsTotal: 3, time: tick / 120, phase, tick, goTick: 360, karts: [] } as never,
  player: { racerId: 'pip', isPlayer: true, lap: 1, rank: 4, coins: 0, speed: 20, item: { held: '', charges: 0, rouletteRemaining: 0, next: '', nextCharges: 0, nextRouletteRemaining: 0 }, boost: { remaining: 0 }, drift: { tier: 0, active: false }, status: {} } as never,
  shownRank: 4, coinCap: 10, map: { toMinimap: () => [0, 0], outlines: [] } as never, itemDefs: [],
}, 1000);

const strip = () => document.querySelector('#ui .hud .keys-hint')!.classList.contains('on');
const pickQuick = (ui: UiRoot) => { ui.dispatch({ type: 'pickMode', mode: 'quick' }); ui.dispatch({ type: 'pickRacer', racerId: 'pip' }); ui.dispatch({ type: 'pickTrack', trackId: 'harbour-loop' }); };

afterEach(() => { document.body.innerHTML = ''; });

describe('the controls strip', () => {
  it('shows only through the countdown of the first race of the session', () => {
    const ui = new UiRoot(document.body, host(), null);
    ui.dispatch({ type: 'boot' });
    ui.dispatch({ type: 'start' });
    pickQuick(ui);
    expect(ui.app.screen).toBe('racing');
    frame(ui, 'countdown', 10);
    expect(strip()).toBe(true);
    frame(ui, 'countdown', 350);
    expect(strip()).toBe(true);
    // lap 1: gone
    frame(ui, 'racing', 361);
    expect(strip()).toBe(false);
    frame(ui, 'racing', 700);
    expect(strip()).toBe(false);
    // a restart counts as a later race
    ui.dispatch({ type: 'pause' });
    ui.dispatch({ type: 'restart' });
    frame(ui, 'countdown', 10);
    expect(strip()).toBe(false);
    // and so does the next race picked from the menus
    ui.dispatch({ type: 'pause' });
    ui.dispatch({ type: 'quit' });
    expect(ui.app.screen).toBe('modeSelect');
    pickQuick(ui);
    expect(ui.app.screen).toBe('racing');
    frame(ui, 'countdown', 10);
    expect(strip()).toBe(false);
    ui.dispose();
  });
});
