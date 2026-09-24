import { afterEach, describe, expect, it } from 'vitest';
import { direct, resetDirector, type Listener } from './director.ts';

const ear: Listener = { playerId: 'pip', position: [0, 0, 0], heading: 0, positionOf: () => [0, 0, 0] };

describe('Time Trial audio', () => {
  afterEach(() => resetDirector());
  it('makes no balloon pop: its balloons are hidden and give nothing', () => {
    resetDirector(1, 1, false);
    expect(direct([{ type: 'pickup', racerId: 'pip', index: 0 }], [], ear).cues).toEqual([]);
    resetDirector(1, 1, true);
    expect(direct([{ type: 'pickup', racerId: 'pip', index: 0 }], [], ear).cues.map((c) => c.sfx)).toEqual(['balloon']);
  });
});
