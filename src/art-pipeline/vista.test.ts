// The far vista (vista.ts): every track frames its corners with set-pieces past the scenery and has a
// far landmark ahead of its start line (design §6: "one landmark visible from the start line"),
// Mirror mode included; all of it casts no shadow, costs at most three draws and frees with the scene.
import { describe, expect, it } from 'vitest';
import { Color, SRGBColorSpace, type Material, type Mesh, type ShaderMaterial } from 'three';
import { BUILDER } from '../track-builder/constants.ts';
import { buildTrackScene } from '../track-builder/mesh/index.ts';
import { mirrorTrack } from '../track-builder/mirror.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import { trackAssets } from './index.ts';
import { FIREWORKS, flierAt, type Flier } from './vista.ts';

const TRACKS = Object.values(import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[];

describe.each(TRACKS.map((d) => [d.id, d] as const))('%s: the far vista', (_id, def) => {
  it('stands out past every road, casts no shadow, and adds at most three draws', () => {
    const track = buildTrack(def), scene = buildTrackScene(track, trackAssets(def.biome));
    const parts: Mesh[] = [];
    scene.group.traverse((o) => { if (o.name === 'vista' || o.name.startsWith('vista-')) parts.push(o as Mesh); });
    const world = parts.filter((m) => m.name !== 'vista-ring-glow');
    expect(world.length).toBeGreaterThanOrEqual(2);
    expect(world.length).toBeLessThanOrEqual(3);
    for (const m of parts) expect(m.castShadow, m.name).toBe(false);
    // the still set-pieces stand wholly past the farthest road from the track's middle
    const solid = parts.find((m) => m.name === 'vista')!;
    const lut = track.branches.main.lut;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < lut.n; i++) { minX = Math.min(minX, lut.px[i]); maxX = Math.max(maxX, lut.px[i]); minZ = Math.min(minZ, lut.pz[i]); maxZ = Math.max(maxZ, lut.pz[i]); }
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    let reach = 0;
    for (let i = 0; i < lut.n; i++) reach = Math.max(reach, Math.hypot(lut.px[i] - cx, lut.pz[i] - cz));
    const pos = solid.geometry.getAttribute('position');
    let near = Infinity;
    for (let i = 0; i < pos.count; i++) near = Math.min(near, Math.hypot(pos.getX(i) - cx, pos.getZ(i) - cz));
    expect(near).toBeGreaterThan(reach + 20);
    scene.dispose();
  });

  it.each([['as authored', false], ['mirrored', true]] as const)('has a far landmark ahead of the start line (%s)', (_how, mirror) => {
    const d = mirror ? mirrorTrack(def) : def, track = buildTrack(d), scene = buildTrackScene(track, trackAssets(d.biome));
    const lm = scene.farLandmark!;
    expect(lm).toBeDefined();
    const s = track.sample(track.startT, 0), f = Math.hypot(s.tangent[0], s.tangent[2]);
    const dx = lm[0] - s.position[0], dz = lm[2] - s.position[2], dist = Math.hypot(dx, dz);
    const bearing = Math.acos((dx * s.tangent[0] + dz * s.tangent[2]) / (dist * f)) * (180 / Math.PI);
    // inside the view from the grid (60° field of view, wider across), and short of the fog's far end (850 m)
    expect(bearing, `${dist.toFixed(0)} m, ${bearing.toFixed(0)}° off the line`).toBeLessThan(35);
    expect(dist).toBeLessThan(700);
    scene.dispose();
  });

  it('frees its geometry and materials with the scene', () => {
    const scene = buildTrackScene(buildTrack(def), trackAssets(def.biome));
    let geos = 0, mats = 0, n = 0;
    scene.group.traverse((o) => {
      if (o.name !== 'vista' && !o.name.startsWith('vista-')) return;
      n++;
      const m = o as Mesh;
      m.geometry.addEventListener('dispose', () => geos++);
      (m.material as Material).addEventListener('dispose', () => mats++);
    });
    scene.dispose();
    expect(n).toBeGreaterThan(0);
    expect(geos).toBe(n);
    expect(mats).toBe(n);
  });

  it("hazes its movers and glows the same accelerating, height-thinning way as the rest of the world (look.ts HAZE), grounded at the track's own floor", () => {
    const track = buildTrack(def), scene = buildTrackScene(track, trackAssets(def.biome));
    let movers: Mesh | undefined;
    // Boardwalk has no orbiting movers (its vista is buildings, glow and the moon): either name will do
    scene.group.traverse((o) => { if (o.name === 'vista-movers' || o.name === 'vista-glow') movers ??= o as Mesh; });
    expect(movers, def.id).toBeDefined();
    const mat = movers!.material as ShaderMaterial;
    expect(mat.vertexShader).toContain('varying float vLkHazeY;');
    expect(mat.vertexShader).toContain('vLkHazeY = world.y - lkHazeGroundY;');
    if (movers!.name === 'vista-movers') {
      expect(mat.fragmentShader).toContain('pow( lkHazeDist,'); // the solids: the world's own accelerating curve
      expect(mat.fragmentShader).toContain('float lkHazeUp = mix('); // and thin going up
    } else {
      expect(mat.fragmentShader).toContain('pow(smoothstep(fogNear, fogFar, vFogDepth),'); // the glow: the same curve, no height term
    }
    const groundY = (mat.uniforms.lkHazeGroundY as { value: number }).value;
    if (def.environment?.ground?.kind === 'none') {
      // Skyline: no ground plane, so its own vista grounds its haze at the road's own lowest point
      expect(groundY).toBeCloseTo(track.branches.main.lut.minY, 3);
    } else {
      expect(Math.abs(groundY)).toBeLessThan(5); // every other track's ground sits close to y 0
    }
    scene.dispose();
  });
});

// ---------------------------------------------------------------- sky life (Adam, 24 Sept 2026)

const life = (d: TrackDefinition) => {
  const track = buildTrack(d), scene = buildTrackScene(track, trackAssets(d.biome));
  return { track, scene, parts: scene.vista!, fliers: scene.vista!.life!.fliers as Flier[], trig: scene.vista!.life!.trig };
};

/** How far past the course limit (the road's edge on a walled track) and how high over the road a point is, from the nearest road. */
function gap(track: ReturnType<typeof buildTrack>, p: readonly number[]): { past: number; over: number } {
  let best = Infinity, over = 0, past = 0;
  for (const b of track.branches.list) {
    const L = b.lut;
    for (let i = 0; i < L.n; i += 2) {
      const d = Math.hypot(L.px[i] - p[0], L.pz[i] - p[2]);
      if (d < best) {
        best = d;
        past = d - L.hw[i] - BUILDER.kerbWidth - (track.def.offroad ? BUILDER.offroadReach : 0);
        over = p[1] - L.py[i];
      }
    }
  }
  return { past, over };
}

describe.each(TRACKS.map((d) => [d.id, d] as const))('%s: sky life', (_id, def) => {
  const { track, scene, parts, fliers, trig } = life(def);

  it('never more than eight small fliers in view at once, and never a balloon', () => {
    for (const f of fliers) expect(f.what).not.toMatch(/balloon|kite|bubble/);
    // where each could be while a camera sees it: a perch on its perch, an orbit anywhere on its circle,
    // a flyby anywhere on its path (whenever it flies)
    const places = fliers.map((f) => {
      const t = new Float32Array(trig.length).fill(f.kind === 'flyby' ? 0 : -1), out: number[][] = [];
      for (let s = 0; s <= 90; s += 0.5) { const p = flierAt(f, s, t); if (p) out.push(p); }
      return out;
    });
    const L = track.branches.main.lut, metres = L.length / L.n;
    // a flyby flies only while the camera is on the stretch after the spot that sets it off (at up to 30 m/s)
    const window = fliers.map((f) => {
      if (!f.trip) return null;
      let best = Infinity, j = 0;
      for (let i = 0; i < L.n; i++) { const d = Math.hypot(L.px[i] - f.trip[0], L.pz[i] - f.trip[2]); if (d < best) { best = d; j = i; } }
      return { from: j, span: Math.ceil((f.move[3] * 30) / metres) };
    });
    for (let i = 0; i < L.n; i += 8) {
      const h = Math.hypot(L.tx[i], L.tz[i]), fx = L.tx[i] / h, fz = L.tz[i] / h;
      let n = 0;
      for (const [k, pts] of places.entries()) {
        const w = window[k];
        if (w && (((i - w.from) % L.n) + L.n) % L.n > w.span) continue;
        // within 50 degrees of straight ahead (a chase camera's field of view is about 91 across) and
        // at least 2 pixels across on a 1600-wide screen (a speck smaller than that is not a flier on screen)
        const span = fliers[k].span;
        if (pts.some((p) => { const dx = p[0] - L.px[i], dz = p[2] - L.pz[i], d = Math.hypot(dx, dz); return span / Math.max(1e-6, d) > 0.0022 && (dx * fx + dz * fz) / Math.max(1e-6, d) > Math.cos((50 * Math.PI) / 180); })) n++;
      }
      expect(n, `in view from t ${(i / L.step).toFixed(3)}`).toBeLessThanOrEqual(8);
    }
  });

  it('flies high or far: 25 m over the road or 30 m past the course limit; a perched bird flies away from the road', () => {
    for (const f of fliers) {
      const t = new Float32Array(trig.length).fill(-1);
      if (f.kind === 'perch') {
        t[f.group] = 0;
        const a = gap(track, flierAt(f, 0, t)!), b = gap(track, flierAt(f, 4, t)!);
        expect(b.past - a.past, `${f.what} takes off away from the road`).toBeGreaterThan(8);
        continue;
      }
      if (f.kind === 'flyby') t[f.group] = 0;
      for (let s = 0; s <= 120; s += 0.5) {
        const p = flierAt(f, s, t);
        if (!p) continue;
        const g = gap(track, p);
        expect(g.over >= 25 || g.past >= 30, `${f.what} at ${s}s: ${g.over.toFixed(1)} m up, ${g.past.toFixed(1)} m past the limit`).toBe(true);
      }
    }
  });

  it('crosses over a road only sideways, never down it toward the camera', () => {
    for (const f of fliers.filter((x) => x.kind === 'flyby')) {
      const L = track.branches.main.lut;
      let best = Infinity, j = 0;
      for (let i = 0; i < L.n; i++) { const d = Math.hypot(L.px[i] - f.home[0], L.pz[i] - f.home[2]); if (d < best) { best = d; j = i; } }
      const h = Math.hypot(L.tx[j], L.tz[j]);
      expect(Math.abs((f.dir[0] * L.tx[j] + f.dir[2] * L.tz[j]) / h), f.what).toBeLessThan(0.35);
    }
  });

  it('never bigger on screen than a pickup balloon from its nearest to the lens, and low in saturation', () => {
    // a balloon is 1.84 m tall and seen from about 6 m at its nearest
    const balloon = 1.84 / 6;
    for (const f of fliers) {
      if (f.kind !== 'perch') {
        let nearest = Infinity;
        const t = new Float32Array(trig.length).fill(f.kind === 'flyby' ? 0 : -1);
        for (let s = 0; s <= 60; s += 1) {
          const p = flierAt(f, s, t);
          if (!p) continue;
          const g = gap(track, p);
          nearest = Math.min(nearest, Math.hypot(Math.max(0, g.past), Math.max(0, g.over - 2.4)));
        }
        expect(f.span / nearest, f.what).toBeLessThan(balloon);
      }
      const col = f.colours.getAttribute('color'), hsl = { h: 0, s: 0, l: 0 };
      let loud = 0;
      for (let i = 0; i < col.count; i++) {
        new Color(col.getX(i), col.getY(i), col.getZ(i)).getHSL(hsl, SRGBColorSpace);
        if (hsl.s > 0.45 && hsl.l > 0.15 && hsl.l < 0.85) loud++;
      }
      expect(loud / col.count, `${f.what}: saturated vertices`).toBeLessThan(0.1);
    }
  });

  it('perched birds go as the camera comes by and are back on their perches, unseen, by the next lap', () => {
    const perched = fliers.filter((f) => f.kind === 'perch');
    if (!perched.length) return;
    const f = perched[0], at = f.home, far: [number, number, number] = [at[0] + 400, at[1], at[2]];
    parts.tick!(far, 100, 1);
    expect(trig[f.group]).toBe(-1);
    parts.tick!([at[0] + 10, at[1] + 2, at[2]], 101, 1);
    expect(trig[f.group]).toBe(101);
    // still near: no second launch
    parts.tick!([at[0] + 5, at[1] + 2, at[2]], 102, 1);
    expect(trig[f.group]).toBe(101);
    parts.tick!(far, 130, 1);
    expect(trig[f.group]).toBe(-1);
  });

  it('a flyby goes once a lap, and never once the weather has turned', () => {
    const fb = fliers.filter((f) => f.kind === 'flyby');
    if (!fb.length) return;
    const g = fb[0].group, trip = track.sample(0.6, 0).position, far: [number, number, number] = [trip[0] + 900, trip[1], trip[2]];
    parts.tick!(far, 200, 1);
    parts.tick!([trip[0], trip[1] + 2.4, trip[2]], 201, 1);
    expect(trig[g]).toBe(201);
    parts.tick!(far, 205, 1);
    parts.tick!([trip[0], trip[1] + 2.4, trip[2]], 206, 1);
    expect(trig[g]).toBe(201);
    parts.tick!(far, 260, 1);
    parts.shift!('meadow-storm');
    parts.tick!([trip[0], trip[1] + 2.4, trip[2]], 262, 1);
    expect(trig[g]).toBe(201);
  });

  it('casts no shadow', () => {
    scene.group.traverse((o) => { if (o.name.startsWith('vista')) expect((o as Mesh).castShadow, o.name).toBe(false); });
  });
});

describe('Boardwalk fireworks (WCAG 2.3.1)', () => {
  it('laps one and two: a burst every 4 to 6 s; the finale: every point, still under three flashes a second', () => {
    const early = FIREWORKS.filter((f) => !f.finaleOnly).reduce((n, f) => n + 1 / f.period, 0);
    const all = FIREWORKS.reduce((n, f) => n + 1 / f.period, 0);
    expect(1 / early).toBeGreaterThanOrEqual(4);
    expect(1 / early).toBeLessThanOrEqual(6);
    expect(FIREWORKS.length).toBe(5);
    expect(all).toBeLessThan(3);
  });

  it('the finale points stay dark until the Final Lap Shift', () => {
    const def = TRACKS.find((d) => d.id === 'boardwalk-nights')!, { parts } = life(def), trig = parts.life!.trig;
    const before = Array.from(trig);
    parts.shift!('boardwalk-fireworks');
    const lit = Array.from(trig).filter((x, i) => x !== before[i]);
    expect(lit.length).toBe(1);
  });
});

it('Meadow Run has no hot-air balloons, Harbor Loop no frozen gulls, Skyline Circuit no parked airships', () => {
  const decor = (id: string) => TRACKS.find((d) => d.id === id)!.environment!.decor!.map((e) => e.asset);
  expect(decor('harbour-loop')).not.toContain('gull');
  expect(decor('skyline-circuit')).not.toContain('airship');
  const meadow = life(TRACKS.find((d) => d.id === 'meadow-run')!);
  expect(meadow.fliers.map((f) => f.what)).not.toContain('balloon');
});
