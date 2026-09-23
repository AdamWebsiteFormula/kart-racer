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
    const blob = { settings: { masterVolume: 9, quality: 'ultra', iconLabels: 'yes' }, playerName: 'x'.repeat(40), unlocked: { skins: ['a', 3] } };
    const odd = loadSave(fake({ [SAVE_KEY]: JSON.stringify(blob) }));
    expect(odd.settings.masterVolume).toBe(1);
    expect(odd.settings.quality).toBe('auto');
    expect(odd.settings.iconLabels).toBe(false);
    expect(odd.playerName.length).toBe(16);
    expect(odd.unlocked.skins).toEqual(['a']);
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
