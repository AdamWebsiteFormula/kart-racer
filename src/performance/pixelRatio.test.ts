import { describe, expect, it } from 'vitest';
import { watchPixelRatio, type PixelRatioHost } from './pixelRatio.ts';

/** A window whose screen can change: each media query fires `change` once the ratio stops matching it. */
function fakeWindow(dpr: number) {
  const queries: { query: string; listeners: Set<() => void> }[] = [];
  const host = {
    devicePixelRatio: dpr,
    matchMedia(query: string) {
      const q = { query, listeners: new Set<() => void>() };
      queries.push(q);
      return {
        addEventListener: (_: string, fn: () => void) => { q.listeners.add(fn); },
        removeEventListener: (_: string, fn: () => void) => { q.listeners.delete(fn); },
      };
    },
  };
  const moveTo = (next: number) => {
    const was = `(resolution: ${host.devicePixelRatio}dppx)`;
    host.devicePixelRatio = next;
    for (const q of [...queries]) if (q.query === was) for (const fn of [...q.listeners]) { q.listeners.delete(fn); fn(); }
  };
  return { host: host as unknown as PixelRatioHost, moveTo, queries };
}

describe('pixel ratio watch', () => {
  it('fires on every move between a Retina and a 1x screen, with no resize needed, until stopped', () => {
    const w = fakeWindow(2);
    let calls = 0;
    const stop = watchPixelRatio(w.host, () => calls++);
    w.moveTo(1);
    expect(calls).toBe(1);
    w.moveTo(2);
    w.moveTo(1.25); // browser zoom
    expect(calls).toBe(3);
    expect(w.queries.at(-1)!.query).toBe('(resolution: 1.25dppx)');
    stop();
    w.moveTo(2);
    expect(calls).toBe(3);
  });
});
