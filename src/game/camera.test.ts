import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Raycaster, Vector3, type BufferGeometry } from 'three';
import { itemGeometry, KART_FIT } from '../art-pipeline/index.ts';
import { SEA_TIDE, tideScale, WAVE_MAX_HEIGHT } from '../art-pipeline/waterWaves.ts';
import { BASE } from '../kart-controller/constants.ts';
import { wallOn, type Vec3 } from '../kart-controller/types.ts';
import { BUILDER } from '../track-builder/constants.ts';
import { buildTrackScene } from '../track-builder/mesh/index.ts';
import { PICKUP_GHOST } from '../track-builder/mesh/scene.ts';
import { SHOW } from '../track-builder/shiftShow.ts';
import { buildTrack } from '../track-builder/track.ts';
import type { TrackDefinition } from '../track-builder/types.ts';
import canyonJson from '../track-builder/tracks/canyon-rush.json';
import { JUICE } from '../vfx-juice/juice.ts';
import { CAM, carry, clampAboveSea, clampToRoad, fovFor, idealPose, kickedFov, seaLevel, smoothTo, surgeOffset } from './camera.ts';
import { TRAIL_BACK, TRAIL_BALL_SCALE, TRAIL_DECOY_SCALE } from './itemsView.ts';

const TRACKS = import.meta.glob('../track-builder/tracks/*.json', { eager: true, import: 'default' }) as Record<string, TrackDefinition>;

describe('chase camera', () => {
  it('Canyon mine: over the road under it when looking back up the exit climb, under the timber beams looking forward', () => {
    const track = buildTrack(canyonJson as unknown as TrackDefinition);
    const mine = track.branches.byId('mine-tunnel')!;
    const L = mine.lut;
    // the road as drawn: a ray straight down from the camera onto the mine's own road
    const scene = buildTrackScene(track);
    const road = scene.chunks.filter((c) => c.branch === mine.index).map((c) => c.mesh);
    scene.group.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
    const groundUnder = (p: number[]) => {
      ray.set(new Vector3(p[0], p[1] + 20, p[2]), new Vector3(0, -1, 0));
      return ray.intersectObjects(road, false).find((h) => h.point.y < p[1] + 20)?.point.y;
    };
    const beams = BUILDER.tunnelWall - CAM.beamClear;
    const raw = { under: 0, over: 0 }, clamped = { under: 0, over: 0 };
    const tally = (n: { under: number; over: number }, p: number[], inBore: boolean) => {
      const g = groundUnder(p);
      if (g === undefined) return;
      if (p[1] < g + CAM.roadClear - 0.05) n.under++;
      if (inBore && p[1] > g + beams + 0.05) n.over++;
    };
    // a kart on every other LUT sample of the shortcut, at a standstill and at top speed, both ways round
    let checked = 0;
    for (let i = 0; i < L.n; i += 2) {
      const t = mine.toMain(i / L.step);
      const kart = track.sample(t, 0, mine.index);
      const heading = Math.atan2(kart.tangent[0], kart.tangent[2]);
      for (const speed of [0, CAM.topSpeed]) {
        for (const lookBack of [false, true]) {
          const pos = idealPose(kart.position, heading, speed, lookBack).position;
          // in the bore where the camera is: the samples of the mine it is over
          const j = L.nearestT(pos, i / L.step, 0.1);
          const inBore = L.covered[L.idx(Math.round(j * L.step))] !== 0;
          tally(raw, pos, inBore);
          clampToRoad(track, pos, { t, branch: mine.index });
          tally(clamped, pos, inBore);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(800);
    // the pose on its own rides the kart's height: the climb puts it under the road and over the beams
    expect(raw.under).toBeGreaterThan(0);
    expect(raw.over).toBeGreaterThan(0);
    expect(clamped).toEqual({ under: 0, over: 0 });
    scene.dispose();
  });

  it('elsewhere it only lifts a camera that would come within roadClear of the road: four tracks it never touches', () => {
    for (const def of Object.values(TRACKS)) {
      const track = buildTrack(def);
      let moved = 0;
      for (const b of track.branches.list) {
        const tunnel = track.tunnels.some((tl) => tl.lut === b.lut);
        for (let k = 0; k < 500; k++) {
          const t = b.toMain(k / 500);
          const kart = track.sample(t, 0, b.index);
          for (const lookBack of [false, true]) {
            const pos = idealPose(kart.position, Math.atan2(kart.tangent[0], kart.tangent[2]), CAM.topSpeed, lookBack).position;
            const y = pos[1];
            clampToRoad(track, pos, { t, branch: b.index });
            // only a tunnel's roof ever pushes it down
            if (!tunnel) expect(pos[1], `${def.id} ${b.id} t ${t}`).toBeGreaterThanOrEqual(y);
            if (pos[1] !== y) moved++;
          }
        }
      }
      // Canyon's mine and Skyline's steepest drop; nowhere on the other four
      if (def.id !== 'canyon-rush' && def.id !== 'skyline-circuit') expect(moved, def.id).toBe(0);
    }
  });
});

describe('clampAboveSea: no camera reads under the sea\'s actual surface, whatever the swell or a flood\'s own tide (review, 26 Sept 2026, finding 1: "the black frames are... the camera under the swell")', () => {
  it('CAM.seaClear alone clears WAVE_MAX_HEIGHT (the tallest any crest ever reaches), with a real margin, so a flat-sea floor is always safe wherever the camera\'s own xz sits', () => {
    expect(CAM.seaClear).toBeGreaterThan(WAVE_MAX_HEIGHT + 0.15);
  });

  it('seaLevel folds in the current tide (SEA_TIDE.rise): 0 leaves it exactly track.groundPlaneY, a flood\'s own rise lifts it by the same amount', () => {
    const track = buildTrack(TRACKS['../track-builder/tracks/harbour-loop.json']);
    expect(seaLevel(track)).toBe(track.groundPlaneY);
    SEA_TIDE.rise.value = 0.7;
    expect(seaLevel(track)).toBeCloseTo(track.groundPlaneY + 0.7, 9);
    SEA_TIDE.rise.value = 0; // never leave a test's own tide for the next one
  });

  it('clampAboveSea lifts a position at (or under) the flat sea up to the crest-safe floor, on every water track, at no tide and at Harbour\'s own full flood tide', () => {
    let waterTracks = 0;
    for (const def of Object.values(TRACKS)) {
      if (def.environment?.ground?.kind !== 'water') continue;
      waterTracks++;
      const track = buildTrack(def);
      for (const tide of [0, 0.35, 0.7]) {
        SEA_TIDE.rise.value = tide;
        const pos: Vec3 = [10, track.groundPlaneY + tide, -10]; // right at the current sea's own flat level: no margin of its own
        clampAboveSea(pos, track);
        // safe against the tallest crest this tide could still leave (tideScale only ever shrinks it further)
        expect(pos[1]).toBeGreaterThanOrEqual(track.groundPlaneY + tide + WAVE_MAX_HEIGHT * tideScale(tide) + 0.05);
      }
    }
    expect(waterTracks).toBeGreaterThanOrEqual(2); // Lighthouse Loop and Boardwalk Nights, at least
    SEA_TIDE.rise.value = 0;
  });

  it('does nothing on a track with no sea', () => {
    const track = buildTrack(TRACKS['../track-builder/tracks/canyon-rush.json']);
    const pos: Vec3 = [5, -50, 5];
    clampAboveSea(pos, track);
    expect(pos).toEqual([5, -50, 5]);
  });
});

describe('chase framing: your kart as big as Mario Kart World\'s, at every speed (CAM\'s measurements)', () => {
  const W = 1280, H = 720;
  const cam = new PerspectiveCamera(60, W / H, 0.3, 1400);
  /** Frame a kart at the origin heading +z from its ideal chase pose (`back` metres farther back); its box on screen (0..1, y down) and the horizon's height. */
  const frame = (speed: number, fov: number, back = 0) => {
    const pose = idealPose([0, 0, 0], 0, speed, false);
    pose.position[2] -= back;
    cam.fov = fov; cam.updateProjectionMatrix();
    cam.position.set(...pose.position); cam.lookAt(new Vector3(...pose.target)); cam.updateMatrixWorld(true);
    let x0 = 1, x1 = 0, y0 = 1, y1 = 0;
    for (const x of [-0.5, 0.5]) for (const y of [0, 1]) for (const z of [-0.5, 0.5]) {
      const p = new Vector3(x * KART_FIT.width, y * KART_FIT.height, z * KART_FIT.length).project(cam);
      const sx = (p.x + 1) / 2, sy = (1 - p.y) / 2;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    // the horizon: a point far off straight ahead, level with the lens
    const d = new Vector3();
    cam.getWorldDirection(d); d.y = 0; d.normalize();
    const hz = cam.position.clone().addScaledVector(d, 5000).project(cam);
    return { width: x1 - x0, cy: (y0 + y1) / 2, bottom: y1, horizon: (1 - hz.y) / 2 };
  };

  // the strongest boost there is: a full-strength hold (+40%), the biggest punch, and a boost's surge (the
  // kart gains about 7.5 m/s² near its top speed, so it runs 7.5 / surgeLag m/s ahead of the camera's own speed)
  const P = JUICE.punch.ultra;
  const held = fovFor(CAM.topSpeed) + JUICE.holdFov;
  const boostSurge = surgeOffset(CAM.topSpeed + 7.5 / CAM.surgeLag, CAM.topSpeed);

  it('at a standstill: the kart big in the lower third, its wheels at MKW\'s 83% down, the horizon a third down', () => {
    const rest = frame(0, fovFor(0));
    // the KART_FIT box (1.7 m wide) is wider than any kart model: the Timber Wagon itself reads about 15%, as Luigi's does (chase-look.mjs)
    expect(rest.width).toBeGreaterThan(0.2);
    expect(rest.cy).toBeGreaterThan(0.58);
    expect(rest.bottom).toBeGreaterThan(0.8);
    expect(rest.bottom).toBeLessThan(0.9);
    expect(rest.horizon).toBeGreaterThan(0.28); // MKW: 30-33%; ours was 43% (the view looked almost level)
    expect(rest.horizon).toBeLessThan(0.36);
  });

  it('speed barely shrinks it (MKW: about 5%); a boost\'s hold a tenth more; the strongest punch\'s peak about a fifth, as MKW\'s boosts do (15-24%)', () => {
    const rest = frame(0, fovFor(0)), top = frame(CAM.topSpeed, fovFor(CAM.topSpeed));
    const hold = frame(CAM.topSpeed, kickedFov(held, 0), JUICE.holdBack);
    const peak = frame(CAM.topSpeed, kickedFov(held, P.fov), JUICE.holdBack + P.back + boostSurge);
    const mini = frame(CAM.topSpeed, kickedFov(fovFor(CAM.topSpeed) + JUICE.holdFov * 0.75, JUICE.punch.mini.fov), JUICE.holdBack * 0.75 + JUICE.punch.mini.back);
    expect(top.width / rest.width).toBeGreaterThan(0.88); // it was 0.8: 60° to 68° and 0.5 m farther back
    expect(hold.width / top.width).toBeGreaterThan(0.85);
    expect(peak.width / top.width).toBeGreaterThan(0.7);
    expect(peak.width / top.width).toBeLessThan(0.85); // a pull-back you can see
    expect(mini.width / top.width).toBeLessThan(0.95); // even the weakest mini-turbo
    for (const c of [top, hold, peak, mini]) {
      expect(c.cy).toBeGreaterThan(0.55);
      expect(c.bottom).toBeLessThan(0.92);
    }
  });

  it('the boost punch never widens the view past fovMax, not even with the Final Lap Shift\'s pulse on top; a hit still narrows it', () => {
    expect(kickedFov(held, P.fov)).toBe(held + P.fov); // the strongest punch is not cut short
    expect(kickedFov(held, P.fov + SHOW.pulse.fov)).toBe(CAM.fovMax);
    expect(kickedFov(fovFor(0), P.fov)).toBe(fovFor(0) + P.fov);
    expect(kickedFov(fovFor(CAM.topSpeed), JUICE.fovHit)).toBeLessThan(fovFor(CAM.topSpeed));
  });

  it('at top speed the camera rides with the kart: no trail of v/lag metres behind the ideal spot', () => {
    const dt = 1 / 60, v = CAM.topSpeed;
    const kart: Vec3 = [0, 0, 0], last: Vec3 = [0, 0, 0];
    const pos = idealPose(kart, 0, v, false).position.slice() as Vec3;
    const old = pos.slice() as Vec3;
    for (let f = 0; f < 180; f++) {
      kart[2] += v * dt;
      const want = idealPose(kart, 0, v, false).position;
      carry(pos, last, kart);
      last[0] = kart[0]; last[1] = kart[1]; last[2] = kart[2];
      smoothTo(pos, want, CAM.lag, dt);
      smoothTo(old, want, CAM.lag, dt);
    }
    const back = CAM.back + CAM.backAtSpeed;
    expect(kart[2] - pos[2]).toBeCloseTo(back, 3);
    // smoothing the absolute position trailed it by about v/lag
    expect(kart[2] - old[2] - back).toBeGreaterThan((0.8 * v) / CAM.lag);
  });

  it('a rival between you and the lens dissolves; one alongside you, or a length behind to the side, does not', () => {
    // the nearest corner of a rival's fitted box, its centre at (x, z) in your kart's frame, to the chase camera
    const nearestKart = (speed: number, x: number, z: number) => {
      const cam = idealPose([0, 0, 0], 0, speed, false).position;
      let d = Infinity;
      for (const sx of [-0.5, 0.5]) for (const sy of [0, 1]) for (const sz of [-0.5, 0.5]) {
        d = Math.min(d, Math.hypot(cam[0] - x - sx * KART_FIT.width, cam[1] - sy * KART_FIT.height, cam[2] - z - sz * KART_FIT.length));
      }
      return d;
    };
    const side = 2 * BASE.kartRadius; // two karts touching
    for (const speed of [0, CAM.topSpeed]) {
      // tucked in right behind you, in the camera's line of sight to your kart: solid, as Mario Kart World keeps it
      expect(nearestKart(speed, 0, -KART_FIT.length - 0.3)).toBeGreaterThan(CAM.kartFade);
      // door to door with you: seen whole
      expect(nearestKart(speed, side, 0)).toBeGreaterThan(CAM.kartFade);
      // half a length back beside you: at most its nearest corner thins (the dither drops under a third there)
      expect(nearestKart(speed, side, -KART_FIT.length / 2)).toBeGreaterThan(CAM.kartFade * 0.85);
    }
  });

  it('a balloon or a gear your kart takes, beside or ahead of it, is whole: the pickups\' lens fade (PICKUP_GHOST.race) only reaches ones the camera passes', () => {
    // race-manager pickups.ts takes one within its half width plus the kart's radius of the kart's middle (level);
    // it stands balloonHeight (a balloon's middle) or coinRadius + 0.2 (a gear's) over the road
    const pickups = [
      { reach: BUILDER.balloonRadius + BASE.kartRadius, up: BUILDER.balloonHeight, r: BUILDER.balloonRadius },
      { reach: BUILDER.coinRadius + BASE.kartRadius, up: BUILDER.coinRadius + 0.2, r: BUILDER.coinRadius },
    ];
    for (const speed of [0, CAM.topSpeed]) {
      // the camera at its ideal pose, and pulled back by the strongest boost too (farther: never nearer)
      const cam = idealPose([0, 0, 0], 0, speed, false).position;
      for (const p of pickups) {
        for (let a = -Math.PI / 2; a <= Math.PI / 2 + 1e-9; a += Math.PI / 24) {
          const x = Math.sin(a) * p.reach, z = Math.cos(a) * p.reach;
          const skin = Math.hypot(cam[0] - x, cam[1] - p.up, cam[2] - z) - p.r;
          expect(skin, `a pickup taken at ${Math.round((a * 180) / Math.PI)}°`).toBeGreaterThan(PICKUP_GHOST.race[1] + 0.3);
        }
      }
      // one the kart passes a metre and a half to its side is 2 to 3 m from the lens as the camera goes by it: faded
      const passed = Math.hypot(1.5 + BUILDER.balloonRadius, cam[1] - BUILDER.balloonHeight) - BUILDER.balloonRadius;
      expect(passed).toBeLessThan(PICKUP_GHOST.race[1]);
    }
  });

  it('what your kart carries stays beyond CAM.nearFade (the item meshes are every kart\'s), so only rivals\' items dissolve', () => {
    const nearest = (cam: Vec3, c: Vec3, r: number) => Math.hypot(cam[0] - c[0], cam[1] - c[1], cam[2] - c[2]) - r;
    /** The nearest vertex of item `name` placed at `c` (scaled `s`, any turn about y) to the camera. */
    const nearestItem = (cam: Vec3, name: string, c: Vec3, s = 1) => {
      const p = (itemGeometry(name) as BufferGeometry).getAttribute('position');
      let d = Infinity;
      for (let v = 0; v < p.count; v++) {
        // any spin about y: take the vertex's reach round the axis toward the camera
        const r = Math.hypot(p.getX(v), p.getZ(v)) * s, y = c[1] + p.getY(v) * s;
        d = Math.min(d, Math.hypot(Math.max(0, Math.hypot(cam[0] - c[0], cam[2] - c[2]) - r), cam[1] - y));
      }
      return d;
    };
    const check = (d: number, what: string) => expect(d, what).toBeGreaterThan(CAM.nearFade);
    for (const speed of [0, CAM.topSpeed]) {
      // the camera's yaw lags the kart's by up to a quarter turn in a drift: sweep it round behind
      for (let yaw = -Math.PI / 2; yaw <= Math.PI / 2; yaw += Math.PI / 36) {
        for (const lookBack of [false, true]) {
          const cam = idealPose([0, 0, 0], yaw, speed, lookBack).position;
          // held items trailing behind it (itemsView: height with the bob, scale), the Triple Fizz orbit, the Strike Ball
          for (const [name, x, y, s] of [['beachBall', 0, 0.6 * TRAIL_BALL_SCALE + 0.05, TRAIL_BALL_SCALE], ['oilCan', -0.55, 0.05, 1], ['decoyBalloon', 0, 0.98 * TRAIL_DECOY_SCALE + 0.05, TRAIL_DECOY_SCALE], ['windUpMouse', 0, 0.05, 1]] as const) {
            check(nearestItem(cam, name, [x, y, -TRAIL_BACK], s), name);
          }
          for (let a = 0; a < 2 * Math.PI; a += Math.PI / 12) {
            check(nearestItem(cam, 'fizzBottle', [Math.cos(a) * 1.55, 1.27, Math.sin(a) * 1.55], 0.95), 'fizz');
          }
          check(nearest(cam, [0, 1.2, 0], 1.3), 'strike ball');
        }
      }
    }
  });

  it('no held item hides the kart that holds it, or its driver, from its own chase camera (video review 25 Sept 2026)', () => {
    // each item as itemsView trails it (at the top of its bob): its model's box, scaled, against the sight
    // lines from the lens to the kart's body and to its driver's head where they pass the item
    const held = [['beachBall', 0, 0.6 * TRAIL_BALL_SCALE + 0.05, TRAIL_BALL_SCALE], ['oilCan', -0.55, 0.05, 1], ['decoyBalloon', 0, 0.98 * TRAIL_DECOY_SCALE + 0.05, TRAIL_DECOY_SCALE], ['windUpMouse', 0, 0.05, 1]] as const;
    for (const speed of [0, CAM.topSpeed]) {
      const cam = idealPose([0, 0, 0], 0, speed, false).position;
      for (const [name, x, y, s] of held) {
        const g = itemGeometry(name) as BufferGeometry;
        g.computeBoundingBox();
        const b = g.boundingBox!, top = y + b.max.y * s, half = Math.max(-b.min.x, b.max.x) * s;
        for (const [part, py] of [['body', 0.5], ['head', 1.25]] as const) {
          const line = py + (cam[1] - py) * (TRAIL_BACK / -cam[2]);
          expect(line > top + 0.03 || Math.abs(x) > half + 0.03, `${name} hides the ${part} at speed ${speed}`).toBe(true);
        }
      }
    }
  });

  // audit 24 Sept 2026: behind a kart on the outside of a bend the camera sat in the mine's rock and past Skyline's parapet
  it('keeps the camera inside the walls, wallClear in from their line, where there is a wall', () => {
    let rawAll = 0;
    for (const def of Object.values(TRACKS)) {
      const track = buildTrack(def);
      let outside = 0, raw = 0;
      for (const b of track.branches.list) {
        for (let k = 0; k < 400; k++) {
          const t = b.toMain(k / 400);
          const mid = track.sample(t, 0, b.index);
          for (const side of [-1, 1]) {
            if ((mid.open ?? 0) & (side < 0 ? 1 : 2)) continue;
            // (a course limit may stand closer on one side: track-builder limits.ts)
            const reach = wallOn(mid, side);
            const kart = track.sample(t, side * (reach - BASE.kartRadius), b.index);
            const pos = idealPose(kart.position, Math.atan2(kart.tangent[0], kart.tangent[2]), CAM.topSpeed, false).position;
            const lateralOf = (p: Vec3) => {
              const at = track.nearest(p, { t, branch: b.index }, BASE.tSearchWindow);
              const c = track.sample(at.t, 0, at.branch);
              const h = Math.hypot(c.tangent[0], c.tangent[2]) || 1;
              if ((c.open ?? 0) & 3) return { over: -Infinity, reach: Infinity }; // an open edge: no wall to keep inside
              const lat = ((p[0] - c.position[0]) * c.tangent[2] - (p[2] - c.position[2]) * c.tangent[0]) / h;
              return { over: Math.abs(lat) - wallOn(c, lat), reach: wallOn(c, lat) };
            };
            if (lateralOf(pos).over > 0) raw++;
            clampToRoad(track, pos, { t, branch: b.index });
            if (lateralOf(pos).over > -CAM.wallClear / 2) outside++;
          }
        }
      }
      expect(outside, `${def.id} (raw ${raw})`).toBe(0);
      rawAll += raw;
    }
    // unclamped, the pose does go past a wall somewhere
    expect(rawAll).toBeGreaterThan(0);
  });
});
