import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Mesh, Raycaster, Vector3, type BufferGeometry, type MeshBasicMaterial, type Texture } from 'three';
import { BUILDER } from '../constants.ts';
import { buildTrack } from '../track.ts';
import type { TrackDefinition } from '../types.ts';
import { HARBOUR_LOOP, HARBOUR_WALLED, HARBOUR_WALLED_PIER, cloneDef } from '../__tests__/fixtures.ts';
import { chunkCountFor } from './chunks.ts';
import { insideRoadEnvelope } from './decor.ts';
import { paletteFor } from './palette.ts';
import { buildRibbon } from './road.ts';
import { buildTrackScene, isDrawn } from './scene.ts';
import boardwalkJson from '../tracks/boardwalk-nights.json';
import canyonJson from '../tracks/canyon-rush.json';

function collapseDef(): TrackDefinition {
  const d = cloneDef(HARBOUR_LOOP);
  // the harbor's open pier edge (0.47-0.6) would straddle this made-up detour; the validator forbids that
  d.openEdges = [];
  d.finalLapShift = {
    kind: 'collapse', label: 'BRIDGE OUT',
    routeOverrides: [{ fromT: 0.5, toT: 0.58, controlPoints: [{ x: 60, y: 8, z: 175, halfWidth: 7 }, { x: 20, y: 8, z: 185, halfWidth: 7 }] }],
    addsJumps: [{ id: 'gap', t: 0.3, launch: 6 }],
    fogDensity: 0.01,
  };
  return d;
}

function meshes(scene: ReturnType<typeof buildTrackScene>): Mesh[] {
  const out: Mesh[] = [];
  scene.group.traverse((o) => { if (isDrawn(o as Mesh)) out.push(o as Mesh); });
  return out;
}

describe('draw-call budget (SOP test 14)', () => {
  const track = buildTrack(HARBOUR_LOOP);
  const scene = buildTrackScene(track);

  it('Harbour Loop scene has ≤ 40 Mesh + InstancedMesh objects, each with one material', () => {
    const list = meshes(scene);
    expect(list.length).toBe(scene.drawables());
    expect(list.length).toBeLessThanOrEqual(BUILDER.trackDrawCallBudget);
    for (const m of list) expect(Array.isArray(m.material)).toBe(false);
  });

  it('chunks: 8 on the main line, proportional (≥ 1) on shortcuts, one shared material', () => {
    const main = scene.chunks.filter((c) => c.branch === 0);
    expect(main).toHaveLength(BUILDER.chunkCount);
    for (const b of track.branches.list) {
      if (b.isMain) continue;
      const n = chunkCountFor(b, track.branches.main);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThan(BUILDER.chunkCount);
      expect(scene.chunks.filter((c) => c.branch === b.index)).toHaveLength(n);
    }
    const mats = new Set(scene.chunks.map((c) => c.mesh.material));
    expect(mats.size).toBe(1);
  });

  it('a popped balloon or taken coin is hidden (zero scale) until its timer runs out', () => {
    const balloons = scene.instancers.get('balloons')!;
    const n = HARBOUR_LOOP.pickups!.length;
    const timers = Array.from({ length: n }, () => ({ respawnRemaining: 0 }));
    timers[1].respawnRemaining = 2;
    scene.update(0, [], { pickups: timers });
    const a = balloons.instanceMatrix.array as Float32Array;
    expect(a[16 * 1 + 0]).toBe(0); // scale x of slot 1
    expect(a[16 * 0 + 0]).not.toBe(0);
    timers[1].respawnRemaining = 0;
    scene.update(0, [], { pickups: timers });
    expect(a[16 * 1 + 0]).not.toBe(0);
  });

  it('every expected instancer exists and is an InstancedMesh', () => {
    for (const name of ['barriers', 'balloons', 'coins', 'boostPads', 'hazard:barrel', 'decor:palm', 'decor:boat']) {
      expect(scene.instancers.get(name), name).toBeInstanceOf(InstancedMesh);
    }
    expect(scene.instancers.get('balloons')!.count).toBe(HARBOUR_LOOP.pickups!.length);
    expect(scene.instancers.get('coins')!.count).toBe(HARBOUR_LOOP.coins!.length);
    expect(scene.instancers.get('decor:palm')!.count).toBe(60);
  });
});

describe('ribbon geometry', () => {
  const track = buildTrack(HARBOUR_LOOP);
  const lut = track.branches.main.lut;
  const palette = paletteFor(HARBOUR_LOOP);

  it('has no NaN, normals point up, road strip edges sit at ±halfWidth', () => {
    const g = buildRibbon(lut, 0, 0.125, palette);
    const pos = g.getAttribute('position').array as Float32Array;
    const nrm = g.getAttribute('normal').array as Float32Array;
    for (const v of pos) expect(Number.isFinite(v)).toBe(true);
    // strip 4 is the road: verts [4 × perStrip, 5 × perStrip). Kerb faces are vertical, so only the road is checked for up.
    const count = Math.ceil(0.125 * lut.step) + 1;
    const perStrip = count * 2;
    const roadStart = 4 * perStrip;
    for (let k = 0; k < count; k++) {
      const a = roadStart + k * 2, b = a + 1;
      const j = lut.idx(k);
      const dx = pos[b * 3] - pos[a * 3], dz = pos[b * 3 + 2] - pos[a * 3 + 2];
      expect(Math.hypot(dx, dz)).toBeCloseTo(2 * lut.hw[j], 4);
      expect(nrm[a * 3 + 1]).toBeGreaterThan(0.9);
      expect(nrm[b * 3 + 1]).toBeGreaterThan(0.9);
    }
  });

  it('on a banked span the road normal matches the sim normal (tilted, not up)', () => {
    // Harbour control point 5 banks 10°; find the most banked sample and build a chunk around it
    let best = 0;
    for (let i = 0; i < lut.n; i++) if (Math.abs(lut.bank[i]) > Math.abs(lut.bank[best])) best = i;
    expect(Math.abs(lut.bank[best])).toBeGreaterThan(0.1);
    const u0 = Math.max(0, (best - 4) / lut.step), u1 = Math.min(1, (best + 4) / lut.step);
    const g = buildRibbon(lut, u0, u1, palette);
    const nrm = g.getAttribute('normal').array as Float32Array;
    const count = Math.ceil(u1 * lut.step) - Math.floor(u0 * lut.step) + 1;
    const k = best - Math.floor(u0 * lut.step);
    const a = 4 * count * 2 + k * 2; // road strip, left vertex at the banked sample
    const sim = lut.sample(best / lut.step, -lut.hw[best]).normal;
    const dot = nrm[a * 3] * sim[0] + nrm[a * 3 + 1] * sim[1] + nrm[a * 3 + 2] * sim[2];
    expect(dot).toBeGreaterThan(0.995);
    expect(Math.abs(sim[0]) + Math.abs(sim[2])).toBeGreaterThan(0.1);
  });

  it('uv v advances by 1 every ROAD_TILE_LENGTH metres', () => {
    const g = buildRibbon(lut, 0, 0.125, palette);
    const uv = g.getAttribute('uv').array as Float32Array;
    const metresPerSample = lut.length / lut.step;
    expect(uv[2 * 2 + 1] - uv[1]).toBeCloseTo(metresPerSample / BUILDER.roadTileLength, 6);
  });

  it('the last main chunk closes the seam: its final section equals sample 0', () => {
    const g = buildRibbon(lut, 0.875, 1, palette);
    const pos = g.getAttribute('position').array as Float32Array;
    const count = Math.ceil(lut.step) - Math.floor(0.875 * lut.step) + 1;
    const perStrip = count * 2;
    const roadStart = 4 * perStrip;
    const lastA = roadStart + (count - 1) * 2;
    const c = lut.sample(0, -lut.hw[0]).position;
    expect(pos[lastA * 3]).toBeCloseTo(c[0], 3);
    expect(pos[lastA * 3 + 2]).toBeCloseTo(c[2], 3);
  });
});

describe('decor and barriers', () => {
  const track = buildTrack(HARBOUR_LOOP);
  const scene = buildTrackScene(track);

  it('ground decor never sits inside any road envelope; sky decor floats above the road', () => {
    for (const p of scene.decor) {
      for (let i = 0; i < p.count; i++) {
        const x = p.matrices[i * 16 + 12], y = p.matrices[i * 16 + 13], z = p.matrices[i * 16 + 14];
        if (p.band === 'sky') expect(y).toBeGreaterThan(track.branches.main.lut.minY + BUILDER.decorBands.sky[0] - 1);
        else expect(insideRoadEnvelope(track.branches, x, z)).toBe(false);
      }
    }
  });

  it('decor is deterministic: two builds give byte-identical matrices (SOP test 13)', () => {
    const other = buildTrackScene(buildTrack(HARBOUR_LOOP));
    expect(other.decor.length).toBe(scene.decor.length);
    scene.decor.forEach((p, i) => {
      expect(Array.from(other.decor[i].matrices)).toEqual(Array.from(p.matrices));
    });
    const a = scene.chunks[3].mesh.geometry.getAttribute('position').array;
    const b = other.chunks[3].mesh.geometry.getAttribute('position').array;
    expect(Array.from(b)).toEqual(Array.from(a));
  });

  it('the Mario Kart World edge: no posts on any track; an off-road track has no strip and no wall, its course limit is invisible past the curb', () => {
    const t = buildTrack(HARBOUR_LOOP);
    const s = buildTrackScene(t);
    expect(HARBOUR_LOOP.offroad).toBe(true);
    expect(s.instancers.get('barriers')!.count).toBe(0);
    expect(s.group.getObjectByName('boundary')).toBeUndefined();
    const smp = t.sample(0.1, 0);
    expect(smp.wall).toBeCloseTo(smp.halfWidth + BUILDER.kerbWidth + BUILDER.offroadReach, 6);
    // the roadside scenery starts just past the course limit, so it lines the course
    expect(BUILDER.decorBands.roadsideOffroad[0]).toBeGreaterThan(BUILDER.offroadReach);
    s.dispose();
  });

  it('a pier gets a solid low edge along the road, broken at shortcut mouths, and still no posts', () => {
    const t = buildTrack(HARBOUR_WALLED_PIER);
    const s = buildTrackScene(t);
    expect(s.instancers.get('barriers')!.count).toBe(0);
    const edge = s.group.getObjectByName('boundary') as Mesh;
    expect(edge).toBeDefined();
    expect(edge.geometry.getAttribute('position').count).toBeGreaterThan(1000);
    s.dispose();
  });

  it('a closed shortcut has its chunks hidden after the shift', () => {
    const t = buildTrack(HARBOUR_WALLED); // the tide closes the beach
    const s = buildTrackScene(t);
    t.applyFinalLapShift();
    const beach = t.branches.byId('beach')!;
    for (const c of s.chunks) expect(c.mesh.visible).toBe(c.branch !== beach.index);
  });

  const grounded = (Object.values(import.meta.glob('../tracks/*.json', { eager: true, import: 'default' })) as TrackDefinition[]).filter((d) => d.environment?.ground?.kind !== 'none');
  it.each(grounded.map((d) => [d.id, d] as const))('%s: every prop stands on the ground as drawn, never in the sea, over a drop or off a cliff (bug hunt 3)', (_id, raw) => {
    // beside an open edge roadside props stood in Harbor's sea and over the water off Boardwalk's pier,
    // a palm stood on a cliff's lip, and props hung off slopes (Canyon's mesa over its chasm)
    const def = cloneDef(raw), water = def.environment!.ground!.kind === 'water';
    const scene = buildTrackScene(buildTrack(def));
    scene.group.updateMatrixWorld(true);
    const coast = scene.group.getObjectByName('coast') as Mesh, sea = scene.group.getObjectByName(`ground-${def.environment!.ground!.kind}`) as Mesh;
    const rc = new Raycaster(), m = new Matrix4(), s = new Vector3();
    let bad = 0, where = '';
    for (const p of scene.decor) {
      const entry = def.environment!.decor!.find((e) => e.asset === p.asset && e.band === p.band)!;
      expect(p.count, p.asset).toBe(entry.instances);
      if (p.band === 'sky' || entry.footing === 'pier') continue;
      // the ground a prop may stand on: the land, the ground plane of a land track, and the sea for a far one (a boat)
      const ground = [coast, ...(!water || p.band === 'far' ? [sea] : [])];
      const bb = scene.instancers.get(`decor:${p.asset}`)!.geometry.boundingBox!, foot = Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z);
      for (let i = 0; i < p.count; i++) {
        m.fromArray(p.matrices, i * 16);
        s.setFromMatrixScale(m);
        const x = m.elements[12], y = m.elements[13] - (entry.lift ?? 0) * s.x, z = m.elements[14], r = foot * s.x * 0.7;
        for (let k = -1; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2, px = k < 0 ? x : x + Math.cos(a) * r, pz = k < 0 ? z : z + Math.sin(a) * r;
          rc.set(new Vector3(px, y + 50, pz), new Vector3(0, -1, 0));
          const under = rc.intersectObjects(ground, false)[0]?.point.y ?? -Infinity;
          if (y - under > 1) { bad++; where ||= `${p.asset} ${i} at (${x.toFixed(1)}, ${y.toFixed(2)}, ${z.toFixed(1)}): ground ${under.toFixed(2)} under its footprint`; break; }
        }
      }
    }
    expect(bad, where).toBe(0);
    scene.dispose();
  });
});

describe('boost pads', () => {
  const tracks = Object.values(import.meta.glob('../tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>);

  it.each(tracks.map((d) => [d.id, d] as const))('%s: every pad lies on the road as drawn, on slopes and banks too (bug hunt 3)', (_id, def) => {
    // turned by yaw alone, a pad on Canyon's 25 % descent stood 0.53 m over the road at one end and
    // sank 0.47 m into it at the other (Skyline's steep pad and the banked ones on Meadow and Frostbite too)
    const track = buildTrack(cloneDef(def));
    for (const b of track.branches.list) b.forcedOpen = true;
    const scene = buildTrackScene(track);
    scene.group.updateMatrixWorld(true);
    const pads = scene.instancers.get('boostPads')!, a = pads.instanceMatrix.array as Float32Array;
    const feats = track.features.filter((f) => f.kind === 'boostPad');
    expect(pads.count).toBe(feats.length);
    const rc = new Raycaster(), m = new Matrix4(), p = new Vector3();
    let low = Infinity, high = -Infinity, where = '';
    feats.forEach((f, k) => {
      const roads = scene.chunks.filter((c) => c.branch === f.branch).map((c) => c.mesh);
      m.fromArray(a, k * 16);
      // its corners, edges and middle over the road
      for (const u of [-0.5, 0, 0.5]) for (const v of [-0.5, 0, 0.5]) {
        p.set(u, 0.035, v).applyMatrix4(m);
        rc.set(new Vector3(p.x, p.y + 2, p.z), new Vector3(0, -1, 0));
        const over = p.y - (rc.intersectObjects(roads, false)[0]?.point.y ?? -Infinity);
        if (over < low) { low = over; where = `${f.id} at (${u}, ${v}): ${over.toFixed(3)} over the road`; }
        high = Math.max(high, over);
      }
    });
    expect(low, where).toBeGreaterThan(0.01);
    expect(high).toBeLessThan(0.15);
    scene.dispose();
  });
});

describe('Final Lap Shift swap and hazards', () => {
  it('a route override rebuilds every main chunk and the barriers, adds the new ramp, keeps branch chunks', () => {
    const track = buildTrack(collapseDef());
    const scene = buildTrackScene(track);
    const before = scene.chunks.map((c) => c.mesh.geometry);
    const barriersBefore = scene.instancers.get('barriers');
    const rampsBefore = scene.group.getObjectByName('ramps')!.userData.count as number;
    track.applyFinalLapShift();
    scene.chunks.forEach((c, i) => {
      if (c.branch === 0) expect(c.mesh.geometry).not.toBe(before[i]);
      else expect(c.mesh.geometry).toBe(before[i]);
    });
    expect(scene.instancers.get('barriers')).not.toBe(barriersBefore);
    expect(scene.group.getObjectByName('ramps')!.userData.count).toBe(rampsBefore + 1);
    expect(scene.fog.density).toBe(0.01);
    expect(scene.drawables()).toBeLessThanOrEqual(BUILDER.trackDrawCallBudget);
  });

  it('a surface-only shift rebuilds just the touched chunks', () => {
    const d = cloneDef(HARBOUR_LOOP);
    d.finalLapShift = { kind: 'storm', label: 'RAIN', surfaceOverrides: [{ fromT: 0.3, toT: 0.34, surface: 'mud' }] };
    const track = buildTrack(d);
    const scene = buildTrackScene(track);
    const before = scene.chunks.map((c) => c.mesh.geometry);
    track.applyFinalLapShift();
    const rebuilt = scene.chunks.filter((c, i) => c.mesh.geometry !== before[i]);
    expect(rebuilt.map((c) => `${c.branch}:${c.index}`)).toEqual(['0:2']);
  });

  it('update(time) moves the barrel and never exceeds its capacity', () => {
    const track = buildTrack(HARBOUR_LOOP);
    const scene = buildTrackScene(track);
    const m = scene.instancers.get('hazard:barrel')!;
    expect(m.count).toBe(1);
    const x0 = m.instanceMatrix.array[12];
    scene.update(2);
    expect(m.count).toBe(1);
    expect(m.instanceMatrix.array[12]).not.toBe(x0);
  });

  it('lap gating: a shortcut closed on lap 1 starts hidden, with no coins, and appears when its lap comes', () => {
    const d = cloneDef(HARBOUR_WALLED);
    d.shortcuts![0].openOnLaps = [2];
    const t = buildTrack(d);
    const s = buildTrackScene(t);
    const beach = t.branches.byId('beach')!;
    for (const c of s.chunks) if (c.branch === beach.index) expect(c.mesh.visible).toBe(false);
    const coinsClosed = s.instancers.get('coins')!.count;
    expect(coinsClosed).toBe(HARBOUR_LOOP.coins!.length - 1); // the beach coin
    t.setLap(2);
    s.update(0);
    for (const c of s.chunks) if (c.branch === beach.index) expect(c.mesh.visible).toBe(true);
    expect(s.instancers.get('coins')!.count).toBe(coinsClosed + 1);
  });

  it("Canyon's falling rock is seen dropping onto its spot, its shadow growing, before it can hit (bug hunt 2)", () => {
    // it used to blink onto the road at 5 s with nothing before, and slow a kart on that very tick
    const track = buildTrack(cloneDef(canyonJson as TrackDefinition));
    const scene = buildTrackScene(track);
    const rock = scene.instancers.get('hazard:rockfall')!, shadow = scene.group.getObjectByName('hazard:shadow') as InstancedMesh;
    const spot = track.hazards.falling(0)[0].position, P = 5, W = BUILDER.fallingWarnSeconds;
    const rockY = () => rock.instanceMatrix.array[13];
    scene.update(P - W - 0.2);
    expect(rock.count).toBe(0);
    expect(isDrawn(shadow)).toBe(false);
    let lastY = Infinity, lastR = 0;
    for (const k of [0.1, 0.4, 0.7, 0.95]) {
      scene.update(P - W + k * W);
      expect(rock.count, `k ${k}`).toBe(1);
      expect(rockY(), `k ${k}`).toBeLessThan(lastY); // falling
      expect(rockY(), `k ${k}`).toBeGreaterThan(spot[1] + BUILDER.hazardRadius);
      expect(shadow.count, `k ${k}`).toBe(1);
      const r = shadow.instanceMatrix.array[0];
      expect(r, `k ${k}`).toBeGreaterThan(lastR); // the shadow grows
      lastY = rockY(); lastR = r;
    }
    scene.update(P + 0.1);
    expect(rock.count).toBe(1);
    expect(rockY()).toBeCloseTo(spot[1] + BUILDER.hazardRadius, 6);
    expect(isDrawn(shadow)).toBe(false);
    scene.dispose();
  });

  it('a creature the Final Lap Shift switches off is not drawn any more (bug hunt 2)', () => {
    const d = cloneDef(canyonJson as TrackDefinition);
    d.hazards!.find((h) => h.id === 'rumblesaur')!.t = 0.58; // on the road the collapse replaces
    const track = buildTrack(d);
    const scene = buildTrackScene(track);
    const holder = scene.group.getObjectByName('creature:rumblesaur')!.parent!;
    scene.update(1);
    expect(holder.visible).toBe(true);
    track.applyFinalLapShift();
    scene.update(1);
    expect(holder.visible).toBe(false);
    scene.dispose();
  });

  it('dispose unsubscribes: a later shift does not touch the group', () => {
    const track = buildTrack(collapseDef());
    const scene = buildTrackScene(track);
    scene.dispose();
    expect(scene.group.children).toHaveLength(0);
    expect(() => track.applyFinalLapShift()).not.toThrow();
    expect(scene.group.children).toHaveLength(0);
  });

  it('dispose frees every geometry and texture the scene made: ground, coast, sky, piers, the city windows (no leak race after race)', () => {
    // Boardwalk has them all: a sea with its coast, tents and the ferris wheel on piers, the city across the bay
    const scene = buildTrackScene(buildTrack(boardwalkJson as unknown as TrackDefinition));
    const made = new Map<BufferGeometry | Texture, string>();
    scene.group.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      made.set(m.geometry, m.name);
      const map = (m.material as MeshBasicMaterial).map;
      if (map) made.set(map, `${m.name} map`);
    });
    for (const name of ['ground-water', 'coast', 'sky', 'pier:tent', 'pier:landmark', 'horizon-city']) expect([...made.values()]).toContain(name);
    const freed = new Set<object>();
    for (const x of made.keys()) x.addEventListener('dispose', () => freed.add(x));
    scene.dispose();
    expect([...made].filter(([x]) => !freed.has(x)).map(([, name]) => name)).toEqual([]);
  });
});

describe('pickups after dark (detail review 2026-09-24: near-black balloons on Boardwalk Nights)', () => {
  // what three does to the material's program: run its patch on a stand-in shader
  const compile = (m: MeshBasicMaterial) => {
    const shader = { uniforms: {} as Record<string, { value: number }>, vertexShader: '', fragmentShader: '#include <emissivemap_fragment>\n#include <clipping_planes_fragment>' };
    m.onBeforeCompile(shader as never, undefined as never);
    return shader;
  };

  it("balloons and coins light themselves by the sky's glow, eased and gently pulsing", () => {
    const scene = buildTrackScene(buildTrack(HARBOUR_LOOP));
    for (const name of ['balloons', 'coins']) {
      const m = scene.instancers.get(name)!.material as MeshBasicMaterial;
      expect(m.customProgramCacheKey(), name).toContain('|pickup');
      const shader = compile(m);
      expect(shader.fragmentShader, name).toContain('pickupGlow');
      const glow = shader.uniforms.pickupGlow;
      scene.setPickupGlow(0, true);
      expect(glow.value, name).toBe(0); // by day nothing
      scene.setPickupGlow(0.5, true);
      expect(glow.value).toBe(0.5);
      // a pulse of no more than a fifth either way
      for (let t = 0; t < 2; t += 0.1) { scene.update(t); expect(glow.value).toBeGreaterThanOrEqual(0.4 - 1e-9); expect(glow.value).toBeLessThanOrEqual(0.6 + 1e-9); }
      scene.setPickupGlow(0, true);
    }
    // a Final Lap Shift's new sky eases in, not a pop
    scene.update(10);
    scene.setPickupGlow(0.5);
    scene.update(10.1);
    const glow = compile(scene.instancers.get('balloons')!.material as MeshBasicMaterial).uniforms.pickupGlow;
    expect(glow.value).toBeGreaterThan(0);
    expect(glow.value).toBeLessThan(0.2);
    scene.dispose();
  });
});
