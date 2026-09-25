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
import { CONTROLS, CREATURES, ITEM_LINES, TIPS } from './data/howto.ts';
import { itemSlots, SKIP_HINT } from './hudModel.ts';
import { TouchControls } from './render/touch.ts';
import { CREDITS_MADE, parseCredits } from './screens/credits.ts';
import { MODES, SPEED_CLASSES } from './screens/menus.ts';
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

  it('a Pogo Spring shows no ×2 (its second charge is the slam); a Triple Fizz shows ×3', () => {
    const defs = ITEM_DEFINITIONS.map((d) => ({ id: d.id, name: d.name }));
    const k = createKartState({ racerId: 'p', isPlayer: true });
    k.item = { held: 'pogoSpring', charges: item('pogoSpring').behaviour.charges ?? 0, rouletteRemaining: 0, next: 'tripleFizz', nextCharges: 3, nextRouletteRemaining: 0 };
    const s = itemSlots(k, defs, 0);
    expect([s.held.label, s.held.charges]).toEqual(['Pogo Spring', '']);
    expect(s.next.charges).toBe('×3');
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
    // the credits' licence column is the licensors' own words, never edited: only Work and Author here
    const credits = parseCredits(fs.readFileSync(`${ROOT}CREDITS.md`, 'utf8')).flatMap((s) => [s.title, ...s.rows.flatMap((r) => [r.work, r.author])]);
    const words = [
      ...page, ...credits, CREDITS_MADE, SKIP_HINT,
      ...CONTROLS.flatMap((c) => [c.action, c.keys, c.pad, c.touch]), ...Object.values(ITEM_LINES), ...TIPS,
      ...CREATURES.flatMap((c) => [c.name, c.track, c.line]), ...ITEM_DEFINITIONS.map((d) => d.name),
      ...CAST.flatMap((c) => [c.name, c.species, c.personality, c.kart]), ...TRACKS.flatMap((t) => [t.name, t.biome, t.shift]),
      ...[...CUPS, ...KNOCKOUT_SETS].map((c) => c.name), ...SKINS.map((s) => s.name), ...BODIES.map((b) => b.name),
      ...UNLOCKS.flatMap((u) => [u.name, u.how, u.use]), ...MODES.flatMap((m) => [m.label, m.sub]), ...SPEED_CLASSES.flatMap((s) => [s.label, s.sub]),
    ];
    for (const w of words) {
      expect(w, w).not.toMatch(/colour|grey|tyre|kerb|harbour|centre|favourite|metre|licence|defence|behaviour|honour|neighbour|travell|cancell|organis|realis|apologis/i);
      expect(w, w).not.toMatch(/mario|nintendo|luigi|bowser|yoshi|koopa|lakitu|mushroom|shell|bob-?omb|banana|item ?box|mini-?turbo|rocket start|ultra turbo|super star/i);
      expect(w, w).not.toMatch(/\bjeep|jet[- ]?ski|waverunner|coca|pepsi|lego|hot wheels/i);
      expect(w, w).not.toMatch(/ruthless|kill|dead\b|blood|stupid|idiot|hate/i);
    }
  });
});
