// Any racer in any kart in the menus (design §5, §12; docs/plans/kart-combos.md K4): the ten karts as the cards
// show them, the stats panel's bars and words, and the panel held to the sim for every racer-and-kart pair.
import { describe, expect, it } from 'vitest';
import { makeConstants } from '../kart-controller/constants.ts';
import { KART_IDS as SIM_KART_IDS, KARTS as SIM_KARTS, ownKartOf } from '../kart-controller/karts.ts';
import { CAST } from './data/cast.ts';
import { SKINS } from './data/cosmetics.ts';
import { byLine, isKart, kartCard, kartColors, kartFor, KARTS, ownKart } from './data/karts.ts';
import { COMBO_BOUNDS, comboStats, KART_STEP, STAT_KEYS } from './data/kartStats.ts';
import { kartMenu, kartMove, KART_COLUMNS } from './screens/karts.ts';
import { comboBar, MAX_CHEVRONS, panelWords, statLevel, statPanel } from './screens/stats.ts';
import { defaultSave } from './store.ts';
import { garageModel, lookFor } from './garage.ts';

const ids = KARTS.map((k) => k.id);

describe('the ten karts on the cards (design §5)', () => {
  it('are the sim\'s ten, in its order: the eight signature karts in racer order, then Classic and Buggy', () => {
    expect(ids).toEqual([...SIM_KART_IDS]);
    expect(ids).toEqual(['scooter', 'scrap', 'pod', 'wagon', 'skimmer', 'windup', 'stomper', 'snacktruck', 'classic', 'buggy']);
    expect(KARTS.map((k) => k.name)).toEqual(SIM_KARTS.map((k) => k.name));
    // every racer owns one, in the cast's order, and it is the sim's own kart for them
    expect(KARTS.slice(0, 8).map((k) => k.owner)).toEqual(CAST.map((c) => c.id));
    for (const c of CAST) expect(ownKart(c.id), c.id).toBe(ownKartOf(c.id));
  });

  it('each card says whose kart it is, or what a twin is, and how it drives', () => {
    expect(KARTS.map(byLine)).toEqual([
      "Pip's kart", "Momo's kart", "Nova's kart", "Juniper's kart", "Otto's kart", "Sprocket's kart", "Boulder's kart", "Gus's kart",
      'Same stats as the Wind-Up Racer', 'Same stats as the Scrap Buggy',
    ]);
    expect(kartCard('snacktruck')!.line).toBe('Top speed, turns like a truck');
    // a twin drives as its twin does, and is opened by its unlock (design §10)
    expect(kartCard('classic')).toMatchObject({ twinOf: 'windup', line: kartCard('windup')!.line, unlock: 'classic', owner: null });
    expect(kartCard('buggy')).toMatchObject({ twinOf: 'scrap', line: kartCard('scrap')!.line, unlock: 'buggy', owner: null });
    expect(KARTS.filter((k) => k.unlock).map((k) => k.id)).toEqual(['classic', 'buggy']);
    expect(new Set(KARTS.map((k) => k.line)).size).toBe(8);
  });

  it('a signature kart wears its owner\'s colors whoever drives it; a twin the racer\'s own, or their paint\'s', () => {
    const gus = CAST.find((c) => c.id === 'gus')!, pip = CAST.find((c) => c.id === 'pip')!;
    expect(kartColors(kartCard('snacktruck')!, 'pip', 'pip-alt')).toEqual([gus.accent, gus.secondary]);
    expect(kartColors(kartCard('classic')!, 'pip')).toEqual([pip.accent, pip.secondary]);
    const berry = SKINS.find((s) => s.id === 'pip-alt')!;
    expect(kartColors(kartCard('buggy')!, 'pip', 'pip-alt')).toEqual(berry.swatch);
    // a paint that is not the racer's own dresses nothing
    expect(kartColors(kartCard('buggy')!, 'momo', 'pip-alt')).toEqual([CAST[1].accent, CAST[1].secondary]);
  });

  it('the kart a racer races in: the one chosen, else their own; an unknown id is no kart', () => {
    expect(kartFor('gus', undefined)).toBe('snacktruck');
    expect(kartFor('gus', 'scooter')).toBe('scooter');
    expect(kartFor('gus', 'hovercraft')).toBe('snacktruck');
    expect([isKart('classic'), isKart('standard'), isKart(7)]).toEqual([true, false, false]);
  });
});

describe('the stats panel (design §12)', () => {
  it('maps a total onto its bar across the fair band: the low end a sliver, the high end full', () => {
    for (const k of STAT_KEYS) {
      const [lo, hi] = COMBO_BOUNDS[k];
      expect(comboBar(k, lo), k).toBeCloseTo(0.08);
      expect(comboBar(k, hi), k).toBeCloseTo(1);
      expect(comboBar(k, (lo + hi) / 2), k).toBeCloseTo(0.54);
      expect(comboBar(k, hi + 1), k).toBe(1); // never past the ends
      expect(comboBar(k, lo - 1), k).toBeCloseTo(0.08);
    }
    expect([statLevel(0.08), statLevel(0.54), statLevel(0.693), statLevel(1)]).toEqual([1, 5, 7, 10]);
  });

  it('a gain and a loss: the ghost, a chevron a step (three at most), and the words ("Speed 7 of 10, up 2")', () => {
    const pip = comboStats('pip', 'scooter'), pipTruck = comboStats('pip', 'snacktruck');
    const p = statPanel(pip, pipTruck);
    const row = (k: string) => p.rows.find((r) => r.key === k)!;
    // the Snack Truck's speed is three steps over the Parcel Scooter's; its accel two under
    expect(row('speed')).toMatchObject({ steps: 3, chevrons: 3 });
    expect(row('speed').ghost).toBeGreaterThan(row('speed').value);
    expect(row('accel')).toMatchObject({ steps: -2, chevrons: 2 });
    expect(row('accel').ghost).toBeLessThan(row('accel').value);
    expect(row('weight')).toMatchObject({ steps: 2, chevrons: 2 });
    for (const r of p.rows) {
      expect(r.chevrons).toBeLessThanOrEqual(MAX_CHEVRONS);
      expect(r.words).toMatch(new RegExp(`^${r.label} \\d+ of 10(, (up|down) \\d+)?$`));
    }
    expect(row('speed').words).toBe(`Speed ${statLevel(row('speed').ghost)} of 10, up ${statLevel(row('speed').ghost) - statLevel(row('speed').value)}`);
    // no ghost: the same combo has no change and no chevron
    const same = statPanel(pip);
    expect(same.rows.every((r) => r.ghost === r.value && r.steps === 0 && r.chevrons === 0 && !/up|down/.test(r.words))).toBe(true);
    expect(panelWords(same).split('. ').length).toBe(4);
  });

  it('every step is a whole one, and a chevron row never runs past three (a swap can move a stat four steps: three show it)', () => {
    for (const c of CAST) for (const a of ids) for (const b of ids) {
      const p = statPanel(comboStats(c.id, a), comboStats(c.id, b));
      for (const r of p.rows) {
        const exact = (comboStats(c.id, b)[r.key] - comboStats(c.id, a)[r.key]) / KART_STEP[r.key];
        expect(Math.abs(exact - r.steps), `${c.id} ${a}→${b} ${r.key}`).toBeLessThan(1e-9);
        expect(r.chevrons).toBe(Math.min(3, Math.abs(r.steps)));
      }
    }
  });

  it('the panel\'s numbers are the sim\'s, for all 80 racer-and-kart pairs (a racer in their own kart is their class)', () => {
    let pairs = 0;
    for (const c of CAST) for (const k of ids) {
      const ui = comboStats(c.id, k);
      const sim = makeConstants(c.archetype, 150, c.id, k);
      for (const s of STAT_KEYS) {
        expect(ui[s], `${c.id} in ${k}: ${s}`).toBe(sim.stats[s]);
        expect(comboBar(s, ui[s]), `${c.id} in ${k}: ${s}'s bar`).toBe(comboBar(s, sim.stats[s]));
        // inside the fair band, so no bar is ever clipped
        const [lo, hi] = COMBO_BOUNDS[s];
        expect(ui[s], `${c.id} in ${k}: ${s} in the band`).toBeGreaterThanOrEqual(lo - 1e-12);
        expect(ui[s], `${c.id} in ${k}: ${s} in the band`).toBeLessThanOrEqual(hi + 1e-12);
      }
      expect(sim.kartId, `${c.id} in ${k}`).toBe(k);
      pairs++;
    }
    expect(pairs).toBe(80);
  });
});

describe('the garage and the look with karts picked (design §12: the Body row goes)', () => {
  it('no Body row; a twin kart is drawn as its shared body once unlocked, any other kart draws none, and the old body is never read', () => {
    const save = defaultSave();
    save.unlocked = { skins: ['pip-alt'], bodies: ['buggy'], mirror: false };
    save.settings.selectedBodyId = 'buggy';
    save.settings.skinByRacer = { pip: 'pip-alt' };
    expect(garageModel(save, 'pip', 'snacktruck').choices.map((c) => c.id)).toEqual(['paint']);
    expect(garageModel(save, 'momo', 'scooter').choices).toEqual([]);
    expect(garageModel(save, 'pip').choices.map((c) => c.id)).toEqual(['paint', 'body']); // the switch off: as ever
    expect(lookFor(save, 'pip', 'buggy')).toEqual({ paint: 'pip-alt', body: 'buggy' });
    expect(lookFor(save, 'pip', 'classic')).toEqual({ paint: 'pip-alt' }); // Classic still locked: no body
    expect(lookFor(save, 'pip', 'snacktruck')).toEqual({ paint: 'pip-alt' });
    expect(lookFor(save, 'gus', 'scooter')).toEqual({});
    expect(lookFor(save, 'gus')).toEqual({ body: 'buggy' }); // the switch off: the Body row's body
  });
});

describe('the Kart screen (view model)', () => {
  it('ten cards in 5 × 2, the racer\'s kart marked, the twins locked with how to earn them until they are', () => {
    const save = defaultSave();
    const vm = kartMenu(save, 'gus', 'snacktruck', (k) => comboStats('gus', k));
    expect(vm.cards.map((c) => c.id)).toEqual(ids);
    expect(vm.focus.rows).toEqual([ids.slice(0, KART_COLUMNS), ids.slice(KART_COLUMNS)]);
    expect(vm.focus.disabled).toBeUndefined(); // a locked card still takes the focus: it previews
    expect(vm.cards.filter((c) => c.chosen).map((c) => c.id)).toEqual(['snacktruck']);
    expect(vm.cards.filter((c) => c.locked).map((c) => [c.id, c.hint])).toEqual([['classic', 'Finish a Grand Prix'], ['buggy', 'Race a Knockout to the end']]);
    expect(vm.racerName).toBe('Big Gus');
    // each card's words: its bars against the chosen kart's (its own are unchanged)
    expect(vm.cards.find((c) => c.id === 'snacktruck')!.words).not.toMatch(/up|down/);
    expect(vm.cards.find((c) => c.id === 'scooter')!.words).toMatch(/^Speed \d+ of 10, down \d+\. Accel \d+ of 10, up \d+/);
    save.unlocked.bodies = ['classic', 'buggy'];
    expect(kartMenu(save, 'gus', 'classic', (k) => comboStats('gus', k)).cards.filter((c) => c.locked)).toEqual([]);
  });

  it('the arrows run through all ten and wrap: left and right in reading order across the rows, up and down between them', () => {
    const f = kartMenu(defaultSave(), 'pip', 'scooter', (k) => comboStats('pip', k)).focus;
    const walk = (from: string, ...dirs: ('left' | 'right' | 'up' | 'down')[]) => dirs.reduce((at, d) => kartMove(f, at, d), from);
    expect(walk('skimmer', 'right')).toBe('windup'); // the end of the first row runs on to the second
    expect(walk('buggy', 'right')).toBe('scooter'); // the tenth wraps to the first
    expect(walk('scooter', 'left')).toBe('buggy');
    expect(walk('windup', 'left')).toBe('skimmer');
    expect(walk('pod', 'down')).toBe('snacktruck');
    expect(walk('snacktruck', 'down')).toBe('pod'); // down past the last row wraps to the top
    expect(walk('pod', 'up')).toBe('snacktruck');
    // right ten times comes back round
    expect(walk('wagon', ...Array.from({ length: 10 }, () => 'right' as const))).toBe('wagon');
    const seen = new Set<string>();
    let at = 'scooter';
    for (let i = 0; i < 10; i++) { seen.add(at); at = kartMove(f, at, 'right'); }
    expect(seen.size).toBe(10);
  });
});
