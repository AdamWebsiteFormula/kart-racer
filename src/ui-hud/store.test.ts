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
    const ids: SettingId[] = ['masterVolume', 'musicVolume', 'sfxVolume', 'quality', 'resolutionScale', 'reducedMotion', 'iconLabels'];
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
