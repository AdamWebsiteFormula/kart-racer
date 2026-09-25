// @vitest-environment jsdom
// The podium ceremony in the screen flow (design §9): a finished Grand Prix goes results →
// standings → podium → menu, a finished Knockout results → cut → podium → menu; a series with a
// race to come, or one the player was knocked out of, has none. The overlay's words and places
// (screens/podium.ts), and the screen itself: Continue focused, a double press guarded, Escape
// no skip, the host told so it shows the 3D podium.
import { afterEach, describe, expect, it } from 'vitest';
import { applyResults, createGrandPrix, createKnockout, podiumOf } from '../race-manager/series.ts';
import type { RaceResults, RacerConfig } from '../race-manager/types.ts';
import { initialApp, reduce } from './app.ts';
import { UI } from './constants.ts';
import { podiumModel } from './screens/podium.ts';
import type { AppAction, AppState } from './types.ts';
import { UiRoot, type UiHost } from './ui.ts';

const IDS = ['pip', 'momo', 'nova', 'juniper', 'otto', 'sprocket', 'boulder', 'gus'];
const racers: RacerConfig[] = IDS.map((id, i) => ({ racerId: id, archetype: 'medium', isPlayer: i === 0 }));
function results(order: string[]): RaceResults {
  return {
    mode: 'grandPrix', trackId: 'harbour-loop', speedClass: 150, seed: 1, goTick: 360,
    ranks: order.map((id, i) => ({ racerId: id, rank: i + 1, finishTick: 12000 + i * 60, timeMs: 97000 + i * 500, lapTimesMs: [33000, 32000, 32000], dnf: false, projectedMs: -1 })),
  };
}
const walk = (actions: AppAction[], s: AppState = initialApp()) => {
  const trail: string[] = [];
  for (const a of actions) { s = reduce(s, a); trail.push(s.screen); }
  return { s, trail };
};
const into = (mode: 'grandPrix' | 'knockout'): AppAction[] => [
  { type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickCup', cupId: mode === 'grandPrix' ? 'sunrise' : 'coastline' },
];

describe('the podium in the screen flow', () => {
  it('a finished Grand Prix: results, standings, the podium, the menu', () => {
    const { trail } = walk([...into('grandPrix'), { type: 'raceFinished', seriesHasNext: false, podium: true }, { type: 'continue' }, { type: 'continue' }, { type: 'continue' }]);
    expect(trail.slice(4)).toEqual(['racing', 'results', 'gpTable', 'podium', 'modeSelect']);
  });

  it('a finished Knockout: results, the cut, the podium, the menu', () => {
    const { trail, s } = walk([...into('knockout'), { type: 'raceFinished', seriesHasNext: false, podium: true }, { type: 'continue' }, { type: 'continue' }, { type: 'continue' }]);
    expect(trail.slice(4)).toEqual(['racing', 'results', 'knockoutCut', 'podium', 'modeSelect']);
    expect(s.podiumNext).toBe(false);
  });

  it('no podium mid-series, after a Knockout the player was cut from, or in a Quick Race; back never leaves it', () => {
    expect(walk([...into('grandPrix'), { type: 'raceFinished', seriesHasNext: true, podium: true }, { type: 'continue' }, { type: 'continue' }]).trail.slice(-1)).toEqual(['racing']);
    expect(walk([...into('knockout'), { type: 'raceFinished', seriesHasNext: false }, { type: 'continue' }, { type: 'continue' }]).trail.slice(-1)).toEqual(['modeSelect']);
    const quick = walk([{ type: 'boot' }, { type: 'start' }, { type: 'pickMode', mode: 'quick' }, { type: 'pickRacer', racerId: 'pip' }, { type: 'pickTrack', trackId: 'meadow-run' }, { type: 'raceFinished', seriesHasNext: false, podium: true }, { type: 'continue' }]);
    expect(quick.trail.slice(-1)).toEqual(['modeSelect']);
    const at = walk([...into('grandPrix'), { type: 'raceFinished', seriesHasNext: false, podium: true }, { type: 'continue' }, { type: 'continue' }]).s;
    expect(at.screen).toBe('podium');
    expect(reduce(at, { type: 'back' })).toBe(at);
    expect(reduce(at, { type: 'pause' })).toBe(at);
  });
});

describe('podiumModel', () => {
  const gpDone = (orders: string[][]) => {
    const gp = createGrandPrix({ id: 'sunrise', trackIds: orders.map(() => 'harbour-loop') }, racers, 150, 1);
    for (const o of orders) applyResults(gp, results(o));
    return gp;
  };

  it('a Grand Prix the player won: the cup, the three in standing order (2nd, 1st, 3rd), their stars', () => {
    const gp = gpDone([IDS, IDS, IDS]);
    const vm = podiumModel(podiumOf(gp), 'pip', { gp });
    expect(vm.headline).toBe('Cup winner!');
    expect(vm.sub).toBe('Sunrise Cup · 150cc');
    expect(vm.places.map((p) => [p.label, p.name, p.player])).toEqual([['2nd', 'Momo', false], ['1st', 'Pip', true], ['3rd', 'Nova', false]]);
    expect(vm.stars).toBe(3);
    expect(vm.mine).toBe('');
  });

  it('2nd in the cup reads so; off the podium, the player still sees it and their own place', () => {
    const second = gpDone([['momo', 'pip', ...IDS.slice(2)]]);
    expect(podiumModel(podiumOf(second), 'pip', { gp: second }).headline).toBe('2nd in the cup!');
    const fifth = gpDone([['momo', 'nova', 'otto', 'gus', 'pip', 'juniper', 'sprocket', 'boulder']]);
    const vm = podiumModel(podiumOf(fifth), 'pip', { gp: fifth });
    expect(vm.headline).toBe('Congratulations to the winners!');
    expect(vm.mine).toBe('You placed 5th');
    expect(vm.places.every((p) => !p.player)).toBe(true);
  });

  it('a Knockout: its placings, champion or not', () => {
    const ko = createKnockout({ id: 'coastline', trackIds: ['a', 'b', 'c'] }, racers, 100, 1);
    applyResults(ko, results(IDS));
    applyResults(ko, results(IDS.slice(0, 6)));
    applyResults(ko, results(['nova', 'pip', 'momo', 'juniper']));
    const vm = podiumModel(podiumOf(ko), 'pip', { ko });
    expect(vm.headline).toBe('2nd in the Knockout!');
    expect(vm.sub).toBe('Coastline Knockout · 100cc');
    expect(vm.places.map((p) => p.name)).toEqual(['Pip', 'Nova', 'Momo']);
    expect(vm.stars).toBeNull();
    expect(podiumModel(podiumOf(ko), 'nova', { ko }).headline).toBe('Knockout champion!');
  });
});

describe('the podium screen', () => {
  afterEach(() => { document.body.innerHTML = ''; });
  function host(): UiHost & { screens: string[] } {
    const screens: string[] = [];
    return {
      screens,
      builtTracks: new Set(['harbour-loop', 'meadow-run', 'canyon-rush']), medalTimes: new Map(), availableModes: new Set(['quick', 'grandPrix', 'knockout']),
      creditsMarkdown: '', startRace: () => {}, nextRace: () => {}, restartRace: () => {}, quitRace: () => {}, setPaused: () => {}, settingsChanged: () => {},
      screenChanged: (a) => { screens.push(a.screen); },
    };
  }

  it('after the standings: the headline and places over the scene, Continue focused, a double press guarded, Escape no skip, then the menu', () => {
    const h = host();
    const ui = new UiRoot(document.body, h, null);
    let now = 1000;
    ui.clock = () => now;
    for (const a of into('grandPrix')) ui.dispatch(a);
    const gp = createGrandPrix({ id: 'sunrise', trackIds: ['harbour-loop'] }, racers, 150, 1);
    const before = structuredClone(gp);
    applyResults(gp, results(['momo', 'pip', ...IDS.slice(2)]));
    ui.raceOver({ results: results(['momo', 'pip', ...IDS.slice(2)]), trackName: 'Harbor Loop', playerId: 'pip', gp: { before, after: gp }, seriesHasNext: false, podium: podiumOf(gp) });
    const press = () => (document.querySelector('#ui .screen.on [data-id="continue"]') as HTMLElement).click();
    now += UI.endScreenGuardMs + 1; press();
    expect(ui.app.screen).toBe('gpTable');
    expect(document.querySelector('#ui .results.on [data-id="continue"] .label')?.textContent, 'the podium comes next').toBe('Continue');
    now += UI.endScreenGuardMs + 1; press();
    expect(ui.app.screen).toBe('podium');
    expect(h.screens.at(-1)).toBe('podium');
    const scr = document.querySelector('#ui .podium.on')!;
    expect(scr.querySelector('.podium-head')?.textContent).toBe('2nd in the cup!');
    expect([...scr.querySelectorAll('.podium-place .nm')].map((e) => e.textContent)).toEqual(['Pip (you)', 'Momo', 'Nova']);
    expect(scr.querySelector('.dim'), 'no dim: the ceremony shows through').toBeNull();
    expect((document.activeElement as HTMLElement).dataset.id).toBe('continue');
    press(); // the second half of a double press
    expect(ui.app.screen).toBe('podium');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    expect(ui.app.screen).toBe('podium');
    now += UI.endScreenGuardMs + 1;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    expect(ui.app.screen).toBe('modeSelect');
    ui.dispose();
  });
});
