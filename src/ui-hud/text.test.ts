// @vitest-environment jsdom
// Every word a player reads, checked against the game (text sweep, 24 Sept 2026): How to Play's
// numbers and colors come from the kart schema, the items, the drift sparks and the touch buttons;
// the credits count the files that ship; and nothing a player reads is UK spelling, a Nintendo
// name or a real brand.
import { beforeAll, describe, expect, it } from 'vitest';
import { BASE } from '../kart-controller/constants.ts';
import { createKartState } from '../kart-controller/types.ts';
import { ITEM_DEFINITIONS } from '../items/data.ts';
import { TIER_RGB } from '../vfx-juice/flames.ts';
import { CAST } from './data/cast.ts';
import { CUPS, KNOCKOUT_SETS, TRACKS } from './data/catalog.ts';
import { BODIES, SKINS } from './data/cosmetics.ts';
import { byLine, KART_UNLOCK_WORDS, KARTS } from './data/karts.ts';
import { KART_SCREEN_TITLE, LOCKED_IN } from './screens/karts.ts';
import { STAT_LABELS } from './screens/stats.ts';
import { AUTO_GAS_NOTE, CONTROLS, CREATURES, ITEM_LINES, LETTERS_LEAD, TIPS } from './data/howto.ts';
import { CONTROLS_STRIP, feedHud, hudModel, itemSlots, newHudMemory, SKIP_PROMPTS } from './hudModel.ts';
import { ITEM_ICONS } from './icons.ts';
import type { RaceState } from '../race-manager/types.ts';
import { HowToView } from './render/screens.ts';
import { TouchControls } from './render/touch.ts';
import { CREDITS_MADE, parseCredits } from './screens/credits.ts';
import { END_LABELS } from './screens/results.ts';
import { DONE_HELP, MODES, SETTING_HELP, settingsMenu, SPEED_CLASSES } from './screens/menus.ts';
import { defaultSettings } from './store.ts';
import { UNLOCKS } from './unlocks.ts';

type Fs = { readFileSync(p: string, enc: 'utf8'): string; readdirSync(p: string): string[] };
let fs: Fs;
/** the repo root on disk (a plain path: under jsdom node:fs refuses jsdom's URL) */
const ROOT = decodeURIComponent(import.meta.url.replace(/^file:\/\//, '').replace(/src\/ui-hud\/[^/]+$/, ''));
const count = (dir: string, ext: string) => fs.readdirSync(`${ROOT}${dir}`).filter((f) => f.endsWith(ext)).length;
beforeAll(async () => { fs = (await import('node:fs' as string)) as Fs; });

/** A color's name by its hue: the words How to Play uses for the drift sparks. */
function hueName([r, g, b]: readonly number[]): string {
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  const h = 60 * (d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4);
  return h < 12 || h >= 330 ? 'red' : h < 45 ? 'orange' : h < 70 ? 'yellow' : h < 170 ? 'green' : h < 250 ? 'blue' : 'purple';
}

const item = (id: string) => ITEM_DEFINITIONS.find((d) => d.id === id)!;
/** a Knockout race's goal by the place, in each round (our words, not Mario Kart World's "be 8th or better") */
const KO_GOALS = [0, 1, 2].map((segment) => hudModel({ mode: 'knockout', lapsTotal: 2, time: 1, phase: 'racing', knockout: { setId: 'k', segment, cutLineAt: 2, eliminated: [] } } as unknown as RaceState,
  createKartState({ racerId: 'p', isPlayer: true }), 1, 10, newHudMemory(), 0, [], 0).knockout?.text ?? '');
const tip = (re: RegExp) => TIPS.find((t) => re.test(t)) ?? '';

describe('How to Play says what the game does', () => {
  it('names the drift sparks in the order the game draws them (blue, orange, purple: not rainbow)', () => {
    const drawn = TIER_RGB.map(hueName);
    expect(drawn).toEqual(['blue', 'orange', 'purple']);
    expect(BASE.driftTiers.length).toBe(drawn.length);
    const said = tip(/drift/i).match(/\b(red|orange|yellow|green|blue|purple|rainbow)\b/g);
    expect(said).toEqual(drawn);
    // Sprocket's paint counts the third tier's boosts: the Unlocks screen names its color
    expect(UNLOCKS.find((u) => u.id === 'sprocket-alt')!.how).toContain(`${drawn[2]} drift boosts`);
  });

  it('every item has a line, with the numbers the items use', () => {
    expect(Object.keys(ITEM_LINES).sort()).toEqual(ITEM_DEFINITIONS.map((d) => d.id).sort());
    const three = (n: number | undefined) => ['', 'one', 'two', 'three', 'four'][n ?? 0];
    expect(ITEM_LINES.beachBall).toContain(`${three(item('beachBall').behaviour.bounces)} times`);
    expect(ITEM_LINES.windUpMouse).toContain(`${three(item('windUpMouse').behaviour.hits)} racers`);
    expect(ITEM_LINES.tripleFizz.toLowerCase()).toContain(`${three(item('tripleFizz').behaviour.charges)} bursts`);
    expect(ITEM_LINES.bubble).toContain(`${item('bubble').behaviour.durationSeconds} seconds`);
    expect(item('oilCan').hitEffect?.slowTo).toBe(0.5);
    expect(ITEM_LINES.oilCan).toContain('half speed');
    expect(ITEM_LINES.fogBank).toContain(`${item('fogBank').behaviour.minPosition}th place back`);
  });

  it('the tips give the real start boost, coin and slipstream rules (a hit always spins and costs coins)', () => {
    expect(tip(/start boost/)).toContain(`the ${BASE.startBoostCentreSeconds} appears`);
    expect(BASE.coinShield.enabled).toBe(false);
    expect(tip(/coins/)).toContain(`up to ${BASE.coinCap}`);
    expect(tip(/coins/)).toContain(`spins you out and costs ${BASE.hitCoinsLost} coins`);
    expect(tip(/slipstream/)).toContain(`${BASE.slipstreamSeconds} seconds`);
  });

  it('the Touch column names the on-screen buttons as they read', () => {
    const t = new TouchControls(document.body);
    const shown = [...t.root.querySelectorAll('.tb span')].map((e) => e.textContent ?? '').filter(Boolean);
    expect(shown.length).toBe(4);
    const column = CONTROLS.map((c) => c.touch);
    for (const b of shown) expect(column, b).toContain(b);
    for (const word of column.flatMap((c) => c.match(/\b[A-Z]{3,}\b/g) ?? [])) expect(shown, word).toContain(word);
    t.root.remove();
  });

  it('the driving aids: a tip names them as Settings does; with Auto-accelerate on, the Gas row says the gas is automatic from GO', () => {
    const rows = settingsMenu(defaultSettings()).rows;
    const label = (id: string) => rows.find((r) => r.id === id)!.label;
    expect(tip(/Settings/)).toContain(label('steeringAssist'));
    expect(tip(/Settings/)).toContain(label('autoAccelerate'));
    const gasRow = (autoGas: boolean) => {
      const v = new HowToView(document.body);
      v.render(ITEM_DEFINITIONS, autoGas);
      const cells = [...v.root.querySelectorAll('table.controls tr')].find((tr) => tr.firstElementChild?.textContent === 'Gas')!.children;
      v.root.remove();
      return [...cells].map((c) => c.textContent);
    };
    expect(gasRow(false)).toEqual(['Gas', 'W or ↑', 'RT', 'On by itself']);
    expect(gasRow(true)).toEqual(['Gas', `W or ↑ ${AUTO_GAS_NOTE}`, `RT ${AUTO_GAS_NOTE}`, 'On by itself']);
    // F: fullscreen on any screen (a pad's press cannot ask for it: fullscreen.ts)
    expect(CONTROLS.find((c) => c.action === 'Fullscreen')).toMatchObject({ keys: 'F', pad: '—' });
  });

  it('a Pogo Spring shows no ×2 (its second charge is the slam); a Triple Fizz shows ×3', () => {
    const defs = ITEM_DEFINITIONS.map((d) => ({ id: d.id, name: d.name }));
    const k = createKartState({ racerId: 'p', isPlayer: true });
    k.item = { held: 'pogoSpring', charges: item('pogoSpring').behaviour.charges ?? 0, rouletteRemaining: 0, next: 'tripleFizz', nextCharges: 3, nextRouletteRemaining: 0 };
    const s = itemSlots(k, defs, 0);
    expect([s.held.label, s.held.charges]).toEqual(['Pogo Spring', '']);
    expect(s.next.charges).toBe('×3');
  });

  it('keys the Item labels setting: every item with the letter its slot shows', () => {
    const setting = settingsMenu(defaultSettings()).rows.find((r) => r.id === 'iconLabels')!.label;
    expect(LETTERS_LEAD.startsWith(setting)).toBe(true);
    const v = new HowToView(document.body);
    v.render(ITEM_DEFINITIONS);
    const key = v.root.querySelector('.letters')!.textContent!;
    expect(key.startsWith(LETTERS_LEAD)).toBe(true);
    for (const d of ITEM_DEFINITIONS) expect(key, d.id).toContain(`${ITEM_ICONS[d.id].glyph} ${d.name}`);
    const glyphs = ITEM_DEFINITIONS.map((d) => ITEM_ICONS[d.id].glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
    v.root.remove();
  });

  it('How to Play names no course creature: none races since 25 Sept 2026 (design §6)', () => {
    expect(CREATURES).toEqual([]);
    const v = new HowToView(document.body);
    v.render(ITEM_DEFINITIONS);
    expect([...v.root.querySelectorAll('h3')].map((e) => e.textContent)).toEqual(['Controls', 'Items', 'Tips']);
    expect(v.root.textContent).not.toMatch(/creature|Rumblesaur|yeti|kraken|goose|whale|crab/i);
    v.root.remove();
  });

  it('over the line: the place (none in a solo run), and the prompt to go on in each input\'s words', () => {
    expect(Object.values(SKIP_PROMPTS)).toEqual(['Press Enter for results', 'Press A for results', 'Tap for results']);
    const me = createKartState({ racerId: 'p', isPlayer: true });
    me.finishTick = 9;
    const rival = createKartState({ racerId: 'q', isPlayer: false });
    const st = (karts: typeof me[]) => ({ mode: 'quick', lapsTotal: 3, time: 60, phase: 'racing', goTick: 0, karts, trackers: [] }) as unknown as RaceState;
    const m = newHudMemory();
    feedHud(m, [{ type: 'finish', racerId: 'p', rank: 1, tick: 9, dnf: false }], [], 'p', 0);
    expect(hudModel(st([me, rival]), me, 1, 10, m, 1, [], 0).banner).toMatchObject({ text: 'FINISH!', sub: '1st', skip: true });
    expect(hudModel(st([me]), me, 1, 10, m, 1, [], 0).banner).toMatchObject({ text: 'FINISH!', sub: '', skip: true });
  });

  it('each paint unlock is named as the garage names the paint, and says where to use it', () => {
    for (const s of SKINS) {
      const u = UNLOCKS.find((x) => x.id === s.id)!;
      expect(u.name).toBe(`${CAST.find((c) => c.id === s.racerId)!.name}'s ${s.name} paint`);
      expect(u.use).toContain(`Paint: ${s.name}`);
    }
    for (const b of BODIES.filter((x) => x.id !== 'standard')) expect(UNLOCKS.find((x) => x.id === b.id)!.use).toContain(`Body: ${b.name}`);
  });
});

describe('the karts\' words (design §5, §12)', () => {
  it('each card names its owner as the design does, a twin its twin, and the twins\' unlocks say kart, not body', () => {
    for (const k of KARTS) {
      if (k.owner) expect(byLine(k), k.id).toBe(`${CAST.find((c) => c.id === k.owner)!.name.split(' ').pop()}'s kart`);
      else expect(byLine(k), k.id).toBe(`Same stats as the ${KARTS.find((x) => x.id === k.twinOf)!.name}`);
    }
    for (const [id, w] of Object.entries(KART_UNLOCK_WORDS)) {
      const kart = KARTS.find((k) => k.id === id)!;
      expect(w.name).toBe(`${kart.name} kart`);
      expect(w.use).toContain(`the ${kart.name} kart`);
      // the same unlock, the same way to earn it: only the words change
      expect(UNLOCKS.find((u) => u.id === id)!.kind).toBe('body');
    }
    // the panel's four stats, as design §5 names them
    expect(Object.values(STAT_LABELS)).toEqual(['Speed', 'Accel', 'Handling', 'Weight']);
  });
});

describe('the credits', () => {
  it('count every art file that ships, and name the tools that made our own', () => {
    const md = fs.readFileSync(`${ROOT}CREDITS.md`, 'utf8');
    const art = parseCredits(md).find((s) => s.title === 'Art')!.rows.map((r) => r.work).join('\n');
    expect(art).toContain(`portraits (${count('public/art/racers', '.webp')})`);
    expect(art).toContain(`painted skies (${count('public/skies', '.webp')})`);
    expect(art).toContain(`Item art (${count('public/art/items', '.webp')})`);
    expect(art).toContain(`ground textures (${count('public/textures', '.webp')})`);
    expect(art).toContain(`Racer 3D models (${count('public/models', '.glb')})`);
    expect(art).toContain(`scenery 3D models (${count('public/models/props', '.glb')})`);
    const works = parseCredits(md).flatMap((s) => s.rows.map((r) => `${r.work} ${r.author}`)).join('\n');
    for (const tool of ['Claude Code', 'Higgsfield', 'ElevenLabs', 'Supabase']) expect(works).toContain(tool);
  });
});

describe('every word a player reads', () => {
  it('is US English, G-rated, and names no Nintendo game, item or move, and no real brand', () => {
    const html = fs.readFileSync(`${ROOT}index.html`, 'utf8');
    const page = [/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '', /name="description" content="([^"]*)"/.exec(html)?.[1] ?? ''];
    expect(page.every(Boolean)).toBe(true);
    const credits = parseCredits(fs.readFileSync(`${ROOT}CREDITS.md`, 'utf8')).flatMap((s) => [s.title, ...s.rows.flatMap((r) => [r.work, r.author, r.licence])]);
    const words = [
      ...Object.values(END_LABELS), ...KO_GOALS,
      ...page, ...credits, CREDITS_MADE, ...Object.values(SKIP_PROMPTS), LETTERS_LEAD, AUTO_GAS_NOTE, ...Object.values(CONTROLS_STRIP),
      ...CONTROLS.flatMap((c) => [c.action, c.keys, c.pad, c.touch]), ...Object.values(ITEM_LINES), ...TIPS,
      ...CREATURES.flatMap((c) => [c.name, c.track, c.line]), ...ITEM_DEFINITIONS.map((d) => d.name),
      ...CAST.flatMap((c) => [c.name, c.species, c.personality, c.kart]), ...TRACKS.flatMap((t) => [t.name, t.biome, t.shift]),
      ...[...CUPS, ...KNOCKOUT_SETS].map((c) => c.name), ...SKINS.map((s) => s.name), ...BODIES.map((b) => b.name),
      ...UNLOCKS.flatMap((u) => [u.name, u.how, u.use]), ...MODES.flatMap((m) => [m.label, m.sub]), ...SPEED_CLASSES.flatMap((s) => [s.label, s.sub]),
      ...settingsMenu(defaultSettings()).rows.map((r) => r.label), ...Object.values(SETTING_HELP).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))), DONE_HELP,
      // any racer in any kart (design §5, §12): the Kart screen, its cards, the stats panel, the twins' unlocks
      KART_SCREEN_TITLE, LOCKED_IN, ...Object.values(STAT_LABELS), ...KARTS.flatMap((k) => [k.name, k.line, byLine(k)]),
      ...Object.values(KART_UNLOCK_WORDS).flatMap((w) => [w.name, w.use]),
    ];
    for (const w of words) {
      // no emoji (sweep 25 Sept 2026): an OS draws them its own way, off the game's art (⏸ in How to Play's Touch column)
      expect(w, w).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(w, w).not.toMatch(/colour|grey|tyre|kerb|harbour|centre|favourite|metre|licence|defence|behaviour|honour|neighbour|travell|cancell|organis|realis|apologis/i);
      expect(w, w).not.toMatch(/mario|nintendo|luigi|bowser|yoshi|koopa|lakitu|mushroom|shell|bob-?omb|banana|item ?box|mini-?turbo|rocket start|ultra turbo|super star/i);
      expect(w, w).not.toMatch(/\bjeep|jet[- ]?ski|waverunner|coca|pepsi|lego|hot wheels/i);
      expect(w, w).not.toMatch(/ruthless|kill|dead\b|blood|stupid|idiot|hate/i);
    }
  });
});
