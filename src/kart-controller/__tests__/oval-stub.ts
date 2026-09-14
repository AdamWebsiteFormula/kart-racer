// Flat stadium oval TrackQuery for headless tests. Two straights of length L
// joined by two semicircles of radius R, parameterised by arc length.
// Track-builder replaces this with the real spline later.
import type { Surface, TrackBoostPad, TrackJump, TrackQuery, TrackSample, Vec3 } from '../types.ts';

export interface OvalOptions {
  straight?: number; // L, metres
  radius?: number; // R, metres
  halfWidth?: number;
  /** Ground height by t; default flat 0. */
  heightAt?: (t: number) => number;
  surfaceAt?: (t: number) => Surface;
  gripScale?: number;
  jumps?: TrackJump[];
  boostPads?: TrackBoostPad[];
  voidY?: number;
}

export function makeOval(o: OvalOptions = {}): TrackQuery & { centre(t: number): { p: Vec3; tan: Vec3 } } {
  const L = o.straight ?? 120;
  const R = o.radius ?? 30;
  const halfWidth = o.halfWidth ?? 8;
  const arc = Math.PI * R;
  const length = 2 * L + 2 * arc;
  const heightAt = o.heightAt ?? (() => 0);
  const surfaceAt = o.surfaceAt ?? (() => 'road' as Surface);
  const gripScale = o.gripScale ?? 1;

  function wrap(t: number): number {
    t %= 1;
    return t < 0 ? t + 1 : t;
  }

  function centre(t: number): { p: Vec3; tan: Vec3 } {
    let s = wrap(t) * length;
    if (s < L) return { p: [-L / 2 + s, 0, -R], tan: [1, 0, 0] };
    s -= L;
    if (s < arc) {
      const phi = s / R;
      return { p: [L / 2 + R * Math.sin(phi), 0, -R * Math.cos(phi)], tan: [Math.cos(phi), 0, Math.sin(phi)] };
    }
    s -= arc;
    if (s < L) return { p: [L / 2 - s, 0, R], tan: [-1, 0, 0] };
    s -= L;
    const phi = s / R;
    return { p: [-L / 2 - R * Math.sin(phi), 0, R * Math.cos(phi)], tan: [-Math.cos(phi), 0, -Math.sin(phi)] };
  }

  function sample(t: number, lateral: number): TrackSample {
    const { p, tan } = centre(t);
    // right = up × tangent
    const right: Vec3 = [tan[2], 0, -tan[0]];
    const y = heightAt(wrap(t));
    return {
      position: [p[0] + right[0] * lateral, y, p[2] + right[2] * lateral],
      tangent: tan,
      normal: [0, 1, 0],
      groundY: y,
      halfWidth,
      surface: surfaceAt(wrap(t)),
      gripScale,
    };
  }

  function dist2(t: number, pos: Vec3): number {
    const { p } = centre(t);
    const dx = p[0] - pos[0], dz = p[2] - pos[2];
    return dx * dx + dz * dz;
  }

  function nearestT(position: Vec3, hintT: number, window: number): number {
    // coarse-to-fine local search, deterministic
    let best = hintT;
    let span = window;
    for (let level = 0; level < 4; level++) {
      const steps = 8;
      let bestD = dist2(best, position);
      const centreT = best;
      for (let i = -steps; i <= steps; i++) {
        const t = centreT + (i / steps) * span;
        const d = dist2(t, position);
        if (d < bestD) { bestD = d; best = t; }
      }
      span /= steps;
    }
    return wrap(best);
  }

  return {
    length,
    jumps: o.jumps ?? [],
    boostPads: o.boostPads ?? [],
    voidY: o.voidY ?? -20,
    sample,
    nearestT,
    centre,
  };
}
