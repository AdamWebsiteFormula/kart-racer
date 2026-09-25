import { describe, expect, it } from 'vitest';
import { adjustSetting, settingsMenu, type SettingId } from './screens/menus.ts';
import { SAVE_KEY, defaultSave, loadSave, reducedMotion, writeSave, type Backend } from './store.ts';

const fake = (init: Record<string, string> = {}): Backend & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};

describe('save store', () => {
  it('empty storage gives the defaults; no storage at all gives them too', () => {
    expect(loadSave(fake())).toEqual(defaultSave());
    expect(loadSave(null)).toEqual(defaultSave());
  });

  it('SOP test 12: every setting survives a save and a fresh load', () => {
    const b = fake();
    const s = defaultSave();
    const ids: SettingId[] = ['autoAccelerate', 'steeringAssist', 'masterVolume', 'musicVolume', 'sfxVolume', 'quality', 'resolutionScale', 'reducedMotion', 'iconLabels'];
    for (const id of ids) s.settings = adjustSetting(s.settings, id, -1);
    s.settings.selectedRacerId = 'gus';
    s.stats.racesFinished = 7;
    s.grandPrix.sunrise = { '150': { finished: true, stars: 2, bestPoints: 38 } };
    writeSave(b, s);
    expect(loadSave(fake(b.data))).toEqual(s);
  });

  it('corrupt or hostile blobs fall back field by field without throwing', () => {
    expect(loadSave(fake({ [SAVE_KEY]: '{not json' }))).toEqual(defaultSave());
    const blob = { settings: { masterVolume: 9, quality: 'ultra', iconLabels: 'yes' }, playerName: 'x'.repeat(40), unlocked: { skins: ['a', 3, 'pip-alt'] } };
    const odd = loadSave(fake({ [SAVE_KEY]: JSON.stringify(blob) }));
    expect(odd.settings.masterVolume).toBe(1);
    expect(odd.settings.quality).toBe('auto');
    expect(odd.settings.iconLabels).toBe(false);
    expect(odd.playerName.length).toBe(16);
    expect(odd.unlocked.skins).toEqual(['pip-alt']); // only unlocks that exist
  });

  it('the garage choices round-trip, and an unknown or locked paint or body falls back to the racer\'s own (design §10)', () => {
    const b = fake({});
    const s = defaultSave();
    s.unlocked = { skins: ['pip-alt', 'sprocket-alt'], bodies: ['buggy'], mirror: true };
    s.settings.selectedBodyId = 'buggy';
    s.settings.skinByRacer = { pip: 'pip-alt', sprocket: 'sprocket-alt' };
    s.timeTrial['harbour-loop'] = { bestMs: 95000, medal: 'gold', racerId: 'pip', ghost: 'AAAA', paint: 'pip-alt', body: 'buggy' };
    writeSave(b, s);
    expect(loadSave(b)).toEqual(s);

    const hostile = {
      unlocked: { skins: ['pip-alt', 'pip-alt', 'rainbow'], bodies: ['classic', 'standard', 'hover'], mirror: 'yes' },
      settings: { selectedBodyId: 'buggy', skinByRacer: { pip: 'pip-alt', boulder: 'boulder-alt', momo: 'pip-alt', nobody: 'pip-alt', __proto__: 'x' } },
      timeTrial: {
        'harbour-loop': { bestMs: 95000, medal: 'gold', racerId: 'momo', ghost: 'AAAA', paint: 'pip-alt', body: 'hover' },
        'meadow-run': { bestMs: 95000, medal: 'gold', racerId: 'pip', paint: 'pip-alt', body: 'classic' },
      },
    };
    const h = loadSave(fake({ [SAVE_KEY]: JSON.stringify(hostile) }));
    expect(h.unlocked).toEqual({ skins: ['pip-alt'], bodies: ['classic'], mirror: false });
    expect(h.settings.selectedBodyId).toBe('standard'); // buggy is not unlocked in this save
    expect(h.settings.skinByRacer).toEqual({ pip: 'pip-alt' }); // Boulder's is locked; Momo has no Berry; nobody is no racer
    // a ghost keeps only a look that fits it: Pip's paint is not Momo's, a hover body does not exist, and no ghost keeps no look
    expect(h.timeTrial['harbour-loop']).toEqual({ bestMs: 95000, medal: 'gold', racerId: 'momo', ghost: 'AAAA' });
    expect(h.timeTrial['meadow-run']).toEqual({ bestMs: 95000, medal: 'gold', racerId: 'pip' });
  });
  it('records are read entry by entry: bad stars, a number for a best time, a prototype key all drop (red-team 2026-09-24)', () => {
    const blob = `{"timeTrial":{"harbour-loop":7,"meadow-run":{"bestMs":91000,"medal":"platinum"},"__proto__":{"bestMs":1}},
      "grandPrix":{"coastline":{"150":{"finished":true,"stars":4},"100":{"finished":true,"stars":2}},"peaks":"x"},
      "knockout":{"peaks":{"finished":true,"won":"yes","bestPlacing":0}}}`;
    const s = loadSave(fake({ [SAVE_KEY]: blob }));
    expect(s.timeTrial).toEqual({ 'meadow-run': { bestMs: 91000, medal: 'none' } });
    expect(Object.getPrototypeOf(s.timeTrial)).toBe(Object.prototype);
    expect(s.grandPrix).toEqual({ coastline: { 100: { finished: true, stars: 2 } } });
    expect(s.knockout).toEqual({ peaks: { finished: true, won: false } });
  });

  it('a backend that throws on write never breaks the game', () => {
    const bad: Backend = { getItem: () => null, setItem: () => { throw new Error('full'); } };
    expect(() => writeSave(bad, defaultSave())).not.toThrow();
  });

  it('settings: sliders clamp and step by 10 %, cycles wrap, the menu shows the values', () => {
    let s = defaultSave().settings;
    for (let i = 0; i < 20; i++) s = adjustSetting(s, 'musicVolume', 1);
    expect(s.musicVolume).toBe(1);
    s = adjustSetting(s, 'resolutionScale', -1);
    expect(s.resolutionScale).toBe(0.9);
    expect(adjustSetting(adjustSetting(adjustSetting(s, 'quality', 1), 'quality', 1), 'quality', 1).quality).toBe(s.quality);
    const vm = settingsMenu(s);
    expect(vm.rows.find((r) => r.id === 'musicVolume')!.value).toBe('100%');
    expect(vm.focus.rows.at(-1)).toEqual(['done']);
  });

  it('the driving aids start off, lead the Settings list, toggle, survive a reload, and a bad value falls back to off', () => {
    const d = defaultSave().settings;
    expect([d.autoAccelerate, d.steeringAssist]).toEqual([false, false]);
    const vm = settingsMenu(d);
    expect(vm.rows.slice(0, 2).map((r) => [r.id, r.label, r.value])).toEqual([['autoAccelerate', 'Auto-accelerate', 'Off'], ['steeringAssist', 'Steering assist', 'Off']]);
    expect(vm.focus.rows[0]).toEqual(['autoAccelerate']);
    const on = adjustSetting(adjustSetting(d, 'autoAccelerate', -1), 'steeringAssist', 1);
    expect([on.autoAccelerate, on.steeringAssist]).toEqual([true, true]);
    expect(settingsMenu(on).rows.slice(0, 2).map((r) => r.value)).toEqual(['On', 'On']);
    expect(adjustSetting(on, 'autoAccelerate', 1).autoAccelerate).toBe(false);
    const b = fake();
    writeSave(b, { ...defaultSave(), settings: on });
    expect(loadSave(fake(b.data)).settings).toMatchObject({ autoAccelerate: true, steeringAssist: true });
    const odd = loadSave(fake({ [SAVE_KEY]: JSON.stringify({ settings: { autoAccelerate: 'yes', steeringAssist: 1 } }) }));
    expect([odd.settings.autoAccelerate, odd.settings.steeringAssist]).toEqual([false, false]);
  });

  it('Fullscreen is the browser\'s, never the save\'s: a row only where the browser has it, showing its state; adjusting it changes no setting', () => {
    const s = defaultSave().settings;
    expect(settingsMenu(s).rows.some((r) => r.id === 'fullscreen')).toBe(false);
    const rows = settingsMenu(s, true).rows;
    // after Resolution, with the other screen settings
    expect(rows.map((r) => r.id).indexOf('fullscreen')).toBe(rows.map((r) => r.id).indexOf('resolutionScale') + 1);
    expect(rows.find((r) => r.id === 'fullscreen')).toMatchObject({ label: 'Fullscreen', value: 'On' });
    expect(settingsMenu(s, false).rows.find((r) => r.id === 'fullscreen')!.value).toBe('Off');
    expect(adjustSetting(s, 'fullscreen', 1)).toBe(s);
    expect(Object.keys(defaultSave().settings)).not.toContain('fullscreen');
  });

  it('SOP test 13: reduced motion follows the OS on auto and the toggle otherwise', () => {
    const s = defaultSave().settings;
    expect(reducedMotion(s, true)).toBe(true);
    expect(reducedMotion(s, false)).toBe(false);
    expect(reducedMotion({ ...s, reducedMotion: 'on' }, false)).toBe(true);
    expect(reducedMotion({ ...s, reducedMotion: 'off' }, true)).toBe(false);
  });
});

describe('save store: audit fixes (24 Sept 2026)', () => {
  it('an unknown racer id falls back to the first card, so no race starts without a player', () => {
    const s = loadSave(fake({ [SAVE_KEY]: JSON.stringify({ settings: { selectedRacerId: 'mario' } }) }));
    expect(s.settings.selectedRacerId).toBe('pip');
    expect(loadSave(fake({ [SAVE_KEY]: JSON.stringify({ settings: { selectedRacerId: 'boulder' } }) })).settings.selectedRacerId).toBe('boulder');
  });

  it('a Time Trial ghost survives a save and a load; a malformed or racer-less one is dropped', () => {
    const b = fake();
    const s = defaultSave();
    s.timeTrial['harbour-loop'] = { bestMs: 120000, medal: 'gold', racerId: 'nova', ghost: 'AQQAAAAAAA==' };
    writeSave(b, s);
    expect(loadSave(fake(b.data)).timeTrial['harbour-loop']).toEqual(s.timeTrial['harbour-loop']);
    const bad = { timeTrial: { a: { bestMs: 1, medal: 'none', racerId: 'nova', ghost: '<script>' }, b: { bestMs: 1, medal: 'none', ghost: 'AQQA' }, c: { bestMs: 1, medal: 'none', racerId: 'nova', ghost: 'A'.repeat(200_004) } } };
    const t = loadSave(fake({ [SAVE_KEY]: JSON.stringify(bad) })).timeTrial;
    expect(t.a.ghost).toBeUndefined();
    expect(t.b.ghost).toBeUndefined();
    expect(t.c.ghost).toBeUndefined();
  });

  it('a best\'s lap lines (25 Sept 2026) survive a save and a load; a best saved before them still loads, and lines that are not that best\'s drop', () => {
    const b = fake();
    const s = defaultSave();
    s.timeTrial['harbour-loop'] = { bestMs: 110408, medal: 'gold', racerId: 'pip', splitsMs: [38025, 73475, 110408] };
    writeSave(b, s);
    expect(loadSave(fake(b.data)).timeTrial['harbour-loop']).toEqual(s.timeTrial['harbour-loop']);
    // an old save: no lines, the rest as it was
    const old = { timeTrial: { 'meadow-run': { bestMs: 99000, medal: 'silver', racerId: 'nova', ghost: 'AQQA' } } };
    expect(loadSave(fake({ [SAVE_KEY]: JSON.stringify(old) })).timeTrial['meadow-run']).toEqual(old.timeTrial['meadow-run']);
    // not rising, not ending on the best, not whole ms, too many, not an array: dropped, the best kept
    const bad = {
      a: [38025, 30000, 110408], b: [38025, 73475, 110000], c: [38025.5, 73475, 110408], d: Array.from({ length: 21 }, (_, i) => i + 1), e: '38025,73475,110408', f: [],
    };
    const t = loadSave(fake({ [SAVE_KEY]: JSON.stringify({ timeTrial: Object.fromEntries(Object.entries(bad).map(([k, v]) => [k, { bestMs: k === 'd' ? 21 : 110408, medal: 'gold', splitsMs: v }])) }) })).timeTrial;
    for (const k of Object.keys(bad)) expect(t[k], k).toEqual({ bestMs: k === 'd' ? 21 : 110408, medal: 'gold' });
  });
});

describe('save store: any racer in any kart (design §5; docs/plans/kart-combos.md §5)', () => {
  it('the chosen kart round-trips; absent (a new save) means each racer\'s own; an unknown or still-locked one is dropped', () => {
    expect(defaultSave().settings.selectedKartId).toBeUndefined();
    const b = fake();
    const s = defaultSave();
    s.settings.selectedKartId = 'snacktruck';
    writeSave(b, s);
    expect(loadSave(fake(b.data), true)).toEqual(s);
    expect(loadSave(fake(b.data), false).settings.selectedKartId).toBe('snacktruck'); // kept with the switch off too
    const load = (settings: object, bodies: string[] = []) => loadSave(fake({ [SAVE_KEY]: JSON.stringify({ settings, unlocked: { bodies } }) }), true).settings.selectedKartId;
    expect(load({ selectedKartId: 'hovercraft' })).toBeUndefined();
    expect(load({ selectedKartId: 7 })).toBeUndefined();
    expect(load({ selectedKartId: 'classic' })).toBeUndefined(); // Classic still locked in this save
    expect(load({ selectedKartId: 'classic' }, ['classic'])).toBe('classic');
  });

  it('with karts picked, an old Classic or Buggy body seeds the kart once, and never over a kart already chosen', () => {
    const load = (settings: object, kartPick = true) => loadSave(fake({ [SAVE_KEY]: JSON.stringify({ settings, unlocked: { bodies: ['classic', 'buggy'] } }) }), kartPick).settings;
    expect(load({ selectedBodyId: 'buggy' }).selectedKartId).toBe('buggy');
    expect(load({ selectedBodyId: 'classic' }).selectedKartId).toBe('classic');
    expect(load({ selectedBodyId: 'standard' }).selectedKartId).toBeUndefined();
    expect(load({ selectedBodyId: 'buggy', selectedKartId: 'pod' }).selectedKartId).toBe('pod');
    // a kart chosen and found locked or unknown stays unchosen: the old body does not come back
    expect(load({ selectedBodyId: 'buggy', selectedKartId: 'hovercraft' }).selectedKartId).toBeUndefined();
    // a body still locked seeds nothing
    expect(loadSave(fake({ [SAVE_KEY]: JSON.stringify({ settings: { selectedBodyId: 'buggy' } }) }), true).settings.selectedKartId).toBeUndefined();
    // the switch off: the Body row is as ever and nothing is seeded
    expect(load({ selectedBodyId: 'buggy' }, false)).toMatchObject({ selectedBodyId: 'buggy' });
    expect(load({ selectedBodyId: 'buggy' }, false).selectedKartId).toBeUndefined();
    // seeded once: the save writes the kart, and the body is left as it was, never written again
    const b = fake({ [SAVE_KEY]: JSON.stringify({ settings: { selectedBodyId: 'buggy' }, unlocked: { bodies: ['buggy'] } }) });
    const s = loadSave(b, true);
    s.settings.selectedKartId = 'wagon'; // the player picks another kart
    writeSave(b, s);
    expect(loadSave(b, true).settings).toMatchObject({ selectedKartId: 'wagon', selectedBodyId: 'buggy' });
  });

  it('a Time Trial best keeps the kart it was raced in; with karts picked an old best\'s body is its kart', () => {
    const b = fake();
    const s = defaultSave();
    s.timeTrial['harbour-loop'] = { bestMs: 110408, medal: 'gold', racerId: 'pip', kart: 'snacktruck' };
    s.timeTrial['meadow-run'] = { bestMs: 99000, medal: 'silver', racerId: 'gus', ghost: 'AQQA', kart: 'classic' };
    writeSave(b, s);
    expect(loadSave(fake(b.data), true).timeTrial).toEqual(s.timeTrial);
    const old = { timeTrial: { 'canyon-rush': { bestMs: 99000, medal: 'gold', racerId: 'momo', ghost: 'AQQA', body: 'buggy' }, x: { bestMs: 5, medal: 'none', kart: 'hovercraft' } } };
    const on = loadSave(fake({ [SAVE_KEY]: JSON.stringify(old) }), true).timeTrial;
    expect(on['canyon-rush']).toEqual({ ...old.timeTrial['canyon-rush'], kart: 'buggy' });
    expect(on.x).toEqual({ bestMs: 5, medal: 'none' });
    // the switch off: the old best is as it was
    expect(loadSave(fake({ [SAVE_KEY]: JSON.stringify(old) }), false).timeTrial['canyon-rush']).toEqual(old.timeTrial['canyon-rush']);
  });
});
