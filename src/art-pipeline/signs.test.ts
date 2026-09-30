// Race day's signs (signs.ts; placed by track-builder raceDressing.ts): one atlas a track, in its own palette, with
// our own world's shops and sponsors only.
import { describe, expect, it } from 'vitest';
import type { TrackDefinition } from '../track-builder/types.ts';
import { DRESSING_MODELS } from './dressing.ts';
import { OLD_CORNER_SIGNS, signAtlas, signKit, signWords, SIGN_ATLAS } from './signs.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];

describe('the sign atlas', () => {
  it('every track has a kit: its cells inside the atlas and apart, the white spot in none of them', () => {
    for (const def of TRACKS) {
      const kit = signKit(def.biome)!;
      expect(kit, def.id).toBeDefined();
      const cells = [kit.arrow, ...kit.boards, ...kit.flags, ...kit.banners];
      expect(kit.boards.length).toBe(4);
      expect(kit.flags.length).toBe(4);
      expect(kit.banners.length).toBe(2);
      for (const [u0, v0, u1, v1] of cells) {
        expect(u0).toBeGreaterThanOrEqual(0); expect(v0).toBeGreaterThanOrEqual(0);
        expect(u1).toBeLessThanOrEqual(1); expect(v1).toBeLessThanOrEqual(1);
        expect(u1).toBeGreaterThan(u0); expect(v1).toBeGreaterThan(v0);
        const [wu, wv] = kit.white;
        expect(wu >= u0 && wu <= u1 && wv >= v0 && wv <= v1, `${def.id}: the white spot inside a design`).toBe(false);
      }
      for (let a = 0; a < cells.length; a++) {
        for (let b = a + 1; b < cells.length; b++) {
          const [a0, a1, a2, a3] = cells[a], [b0, b1, b2, b3] = cells[b];
          const apart = a2 <= b0 || b2 <= a0 || a3 <= b1 || b3 <= a1;
          expect(apart, `${def.id}: cells ${a} and ${b} overlap`).toBe(true);
        }
      }
      // a 2:1 board, an 8:1 banner, a tall flag (in pixels)
      const [bu0, bv0, bu1, bv1] = kit.boards[0], [nu0, nv0, nu1, nv1] = kit.banners[0], [fu0, fv0, fu1, fv1] = kit.flags[0];
      expect((bu1 - bu0) / (bv1 - bv0)).toBeCloseTo(2, 1);
      expect((nu1 - nu0) / (nv1 - nv0)).toBeCloseTo(8, 0);
      expect((fv1 - fv0) / (fu1 - fu0)).toBeGreaterThan(3);
      expect(SIGN_ATLAS).toBe(1024);
    }
  });

  it('one atlas a biome, shared by every race on its track (never disposed by a scene)', () => {
    expect(signAtlas('meadow')).toBe(signAtlas('meadow'));
    expect(signAtlas('meadow')).not.toBe(signAtlas('canyon'));
    expect(signAtlas('meadow').userData.shared).toBe(true);
    expect(signKit('meadow')!.atlas).toBe(signAtlas('meadow'));
  });

  it('lights itself only on Boardwalk Nights (its neon); by day the faces take the scene\'s light', () => {
    for (const def of TRACKS) expect(signKit(def.biome)!.face > 1, def.id).toBe(def.biome === 'boardwalk');
  });

  it('takes the place of the old little corner signs, every one of them a dressing model', () => {
    for (const name of OLD_CORNER_SIGNS) expect(DRESSING_MODELS[name], name).toBeDefined();
    for (const def of TRACKS) expect(signKit(def.biome)!.replaces).toEqual(OLD_CORNER_SIGNS);
  });

  it('carries only our own world\'s words: the track, its cup, the cast\'s shops, the race\'s soda; nothing of Nintendo\'s', () => {
    const banned = /mario|luigi|nintendo|koopa|bowser|peach|yoshi|toad|wario|waluigi|donkey|mushroom|shine sprite|moo moo|swoop|batadon|thwomp|hot foot|pipeline|star cup|flower cup|special cup|mkw|(?<!flow)kart/i; // (the game's own name, FlowKart, is the one kart allowed: Adam, 30 Sept 2026)
    for (const def of TRACKS) {
      const words = signWords(def.biome);
      expect(words.length, def.id).toBeGreaterThanOrEqual(11);
      expect(words, def.id).toContain(def.name.toUpperCase());
      for (const w of words) {
        expect(banned.test(w), `${def.id}: "${w}"`).toBe(false);
        // US English (the game's): tires, color
        expect(/tyre|colour/i.test(w), `${def.id}: "${w}"`).toBe(false);
      }
    }
  });
});
