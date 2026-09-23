// SOP test 1: the data validates against item.schema.json; rows sum to 100; the leader has a defence.
import { describe, expect, it } from 'vitest';
import schema from '../../docs/schemas/item.schema.json';
import { ITEMS_CONFIG, ITEM_DEFINITIONS, ITEM_ROLES, ITEM_TABLE } from './data.ts';

describe('item data against the schema', () => {
  it('has every required top-level key', () => {
    for (const k of schema.required) expect(ITEMS_CONFIG, k).toHaveProperty(k);
  });

  it('every item has the required keys and a valid role', () => {
    const req = schema.properties.items.items.required;
    const roles = schema.properties.items.items.properties.role.enum;
    for (const d of ITEM_DEFINITIONS) {
      for (const k of req) expect(d, `${d.id}.${k}`).toHaveProperty(k);
      expect(roles).toContain(d.role);
    }
    expect(ITEM_DEFINITIONS.length).toBe(13);
    expect(new Set(ITEM_DEFINITIONS.map((d) => d.id)).size).toBe(13);
  });

  it('the table has 8 rows, each summing to 100 over known ids', () => {
    expect(ITEM_TABLE.length).toBe(schema.properties.table.minItems);
    for (const row of ITEM_TABLE) {
      let sum = 0;
      for (const [id, w] of Object.entries(row)) { expect(ITEM_ROLES[id], id).toBeDefined(); sum += w; }
      expect(sum).toBe(100);
    }
  });

  it('ranks 1–2 always have a defensive option', () => {
    for (const row of ITEM_TABLE.slice(0, 2)) {
      const defensive = Object.entries(row).filter(([id, w]) => w > 0 && (ITEM_ROLES[id] === 'defenceHeld' || ITEM_ROLES[id] === 'defenceArea' || ITEM_ROLES[id] === 'rearDrop'));
      expect(defensive.length).toBeGreaterThan(0);
    }
  });

  it('locked and Knockout ids exist; the equaliser and the Strike Ball are the locked ones', () => {
    expect([...ITEMS_CONFIG.lockedDuringLockout].map((id) => ITEM_ROLES[id]).sort()).toEqual(['equaliser', 'ride']);
    for (const ids of Object.values(ITEMS_CONFIG.knockoutPoolByRacers)) for (const id of ids) expect(ITEM_ROLES[id]).toBeDefined();
    expect(ITEMS_CONFIG.knockoutPoolByRacers['4']).not.toContain('fogBank');
    expect(ITEMS_CONFIG.knockoutPoolByRacers['4']).not.toContain('strikeBall');
    expect(ITEMS_CONFIG.knockoutPoolByRacers['2']).not.toContain('decoyBalloon');
  });
});
