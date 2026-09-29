// Vfx: the Three.js side of the juice. Emits particles from kart state every frame (drift sparks,
// boost flames, off-road dust, tyre marks) and bursts from the director's effects each tick
// (balloon pops, gear sparkles, gears knocked loose, hit stars, confetti, and the items' own: itemfx.ts),
// and owns the shake, kicks and time scale.
import type { Camera, Scene } from 'three';
import { decorGeometry, vertexToon } from '../art-pipeline/index.ts';
import type { RevView } from '../kart-controller/rev.ts';
import type { KartState } from '../kart-controller/types.ts';
import type { Projectile } from '../items/types.ts';
import { fadeNearCameraAlpha } from '../track-builder/mesh/glow.ts';
import { Contact, type Drawn } from './contact.ts';
import { GearScatter } from './gears.ts';
import { BOOM, ItemFx, type ItemBurst } from './itemfx.ts';
import { CameraKick, DriftRoll, JUICE, TimeScale, Trauma, boostHold, type Effects } from './juice.ts';
import { KartFx } from './kartfx.ts';
import { ParticlePool, type SpawnOpts } from './particles.ts';
import { Skids, SpeedLines } from './trails.ts';

const WHITE_HOT: readonly number[] = [2.4, 2.3, 2.1];
const DUST: readonly number[] = [0.86, 0.77, 0.6], SCUFF: readonly number[] = [0.7, 0.66, 0.6];
/** the Final Lap Shift's bursts: canyon dust in shadow, hot sparks, an oak's leaves */
const DUST_DARK: readonly number[] = [0.66, 0.46, 0.32], SPARK_GOLD: readonly number[] = [2.2, 1.6, 0.5];
const LEAVES: readonly (readonly [number, number, number])[] = [[0.12, 0.42, 0.08], [0.2, 0.55, 0.1], [0.3, 0.5, 0.06]];
/** Linear RGB with one channel near zero, so each colour survives the tone mapping as a clear hue (no white, no pastels). */
export const CONFETTI: readonly (readonly [number, number, number])[] = [
  [1, 0.04, 0.22], [1, 0.62, 0.02], [0.02, 0.62, 0.48], [0.04, 0.26, 1], [0.42, 0.06, 0.92], [1, 0.2, 0.02],
];
/**
 * The player's finish shower: centred `ahead` metres (plus `lead` seconds of the kart's speed) up
 * the road, so the kart drives into it and the chase camera, 6 m behind, looks at it, not through it.
 */
/**
 * Balloon pops and gear pickups: your own at full size, a rival's small and dim. With balloons back in 0.5 s,
 * eight karts pop a row at once, and full-size bright sparkles bloomed into discs over the road.
 */
export const POP = Object.freeze({
  mine: Object.freeze({ confetti: 26, glow: 10, glowSize: 0.3, gearSparks: 8 }),
  rival: Object.freeze({ confetti: 8, glow: 3, glowSize: 0.16, gearSparks: 4 }),
  /** a rival's sparkle colour stays under the bloom threshold (the player's is HDR and blooms) */
  rivalGlow: Object.freeze([1.0, 0.92, 0.7]),
});
/**
 * A gear picked up (Adam, 26 Sept 2026: gears, not coins): a ratchet of sparks, one per tooth, flung round
 * the kart like a spinning cog throwing them off (not a coin's flip), carried along with it so the ring turns
 * where the chase camera looks; teal and white-hot at its heart. `radius` and the speeds are metres and m/s.
 */
export const GEAR_POP = Object.freeze({ radius: 0.35, turn: 4.4, out: 1.3, up: 1.1, size: 0.2, life: 0.42, drag: 2.6, glint: 0.55, glintLife: 0.2 });
/** The player's gear sparks (teal, HDR so they bloom) and the glint; gears knocked loose throw a few of the same */
const GEAR_TEAL: readonly number[] = [0.5, 2.1, 1.9];
export const CONFETTI_BURST = Object.freeze({ count: 180, ahead: 4, lead: 0.4, spread: 4, depth: 3, rise: 4.5, riseSpread: 3, size: 0.22 });
/**
 * The podium ceremony's fireworks (game/podium.ts): a round burst of sparks in one confetti hue made
 * bright past 1 (they bloom), falling and fading, with a white heart; soft and slow, never a strobe.
 * Reduced motion: `reducedCount` sparks.
 */
export const FIREWORK = Object.freeze({ count: 72, reducedCount: 30, speed: 8.5, size: 0.42, life: 1.3, gravity: 2.6, drag: 1.3, heat: 2.2 });
/** Confetti drifting down over the podium: from `up` metres over it (plus up to `spread`), slower than the finish shower. */
export const CONFETTI_RAIN = Object.freeze({ up: 7, spread: 2.5, size: 0.24, life: 3.6, gravity: 2.2, drag: 1.4 });
/**
 * A popped balloon coming back (Vfx.balloonBack; Adam, 28 Sept 2026: they "just appear without any animation"):
 * `glints` sparks round its middle, `radius` metres out and up to `spread` above or below, flung on out at `out`
 * m/s (rising `rise`), white-hot and gold by turns, shrinking as they go; and a soft gleam at its heart. Small
 * and few: eight karts pop a whole row at once, and the row comes back together.
 */
export const BALLOON_SPARKLE = Object.freeze({
  glints: 6, radius: 0.7, spread: 0.55, out: 1.4, rise: 0.4, size: 0.13, life: 0.36, lifeSpread: 0.12, drag: 2.4, grow: -0.7,
  gold: Object.freeze([1.9, 1.55, 0.7]), gleam: 0.42, gleamLife: 0.16,
  /** metres from the lens past which none is drawn (a glint there is under a pixel) */
  reach: 60,
});

/** Visual-only randomness (never touches the sim). */
let seed = 0x1234567;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
const sym = () => rnd() * 2 - 1;

export class Vfx {
  readonly glow = new ParticlePool(1536, true);
  readonly soft = new ParticlePool(1024, false);
  readonly confetti = new ParticlePool(512, false, true);
  readonly skids = new Skids();
  readonly lines = new SpeedLines();
  readonly trauma = new Trauma();
  readonly kick = new CameraKick();
  /** the camera's roll into the player's drift, eased */
  readonly camRoll = new DriftRoll();
  readonly time = new TimeScale();
  /** each kart's drift specks, flame flakes, pipe puffs, dust and tyre marks (kartfx.ts; the tyre stars and the flames burn on the kart's own mesh, flames.ts) */
  readonly kartFx = new KartFx(this.soft, this.skids);
  /** contact with punch (contact.ts): bumps, walls and hits, a scrape's sparks, the dizzy stars and the player's camera jolt, in the pools above */
  readonly contact = new Contact(this.glow, this.soft, this.kartFx.sparks);
  /** gears a hit knocks loose, flying out of the kart (gears.ts): the track's gear, small, in the items' own see-through-near-the-lens toon */
  readonly gears: GearScatter;
  /** the items' explosions, rings, trails and crackle (itemfx.ts): the pools above, and its one ring-and-flash mesh */
  readonly items: ItemFx;
  private readonly o: SpawnOpts = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, size: 0.2, life: 0.4 };
  /** a firework's colour, reused */
  private readonly hot: number[] = [1, 1, 1];
  readonly shake = { x: 0, y: 0, z: 0, roll: 0 };
  /** how wet the road is, 0..1 (the game sets it from the Final Lap Shift's storm): the tires throw spray */
  wet = 0;

  constructor(scene: Scene, camera: Camera) {
    const gearMaterial = vertexToon().clone();
    fadeNearCameraAlpha(gearMaterial, 2.8); // game/camera.ts CAM.nearFade, as a thrown item fades
    this.gears = new GearScatter(decorGeometry('coin')!.body, gearMaterial);
    this.items = new ItemFx({ glow: this.glow, soft: this.soft, confetti: this.confetti, sparks: this.kartFx.sparks });
    scene.add(this.glow.mesh, this.soft.mesh, this.confetti.mesh, this.skids.mesh, this.kartFx.sparks.mesh, this.gears.mesh, this.items.blasts.mesh);
    this.lines.attach(camera);
    if (!camera.parent) scene.add(camera); // camera children only render if the camera is in the scene
  }

  /** New race: forget trails and particles. */
  reset(): void {
    this.glow.clear(); this.soft.clear(); this.confetti.clear(); this.skids.clear(); this.kartFx.reset(); this.gears.clear();
    this.contact.reset();
    this.items.reset();
    this.wet = 0;
    this.trauma.value = 0;
    this.time.reset(); // a restart mid hit-stop or slow-mo must not start frozen
    this.kick.reset();
    this.camRoll.value = 0;
  }

  private spawn(pool: ParticlePool, x: number, y: number, z: number, vx: number, vy: number, vz: number, c: readonly number[], size: number, life: number, gravity = 0, drag = 0, grow = 0): void {
    const o = this.o;
    o.x = x; o.y = y; o.z = z; o.vx = vx; o.vy = vy; o.vz = vz;
    o.r = c[0]; o.g = c[1]; o.b = c[2]; o.size = size; o.life = life; o.gravity = gravity; o.drag = drag; o.grow = grow;
    pool.spawn(o);
  }

  /** Once per sim tick with the director's effects. `now` is a wall clock in seconds. */
  /** the player's kart as of the last frame (a creature's quake fades with distance from it) */
  private lastPlayer: KartState | undefined;

  onTick(fx: Effects, kartOf: (racerId: string) => KartState | undefined, now: number, reduced: boolean): void {
    if (fx.trauma > 0) this.trauma.add(fx.trauma);
    if (fx.kickBoost) this.kick.boost(now, fx.kickBoost);
    if (fx.kickHit) this.kick.hit(now);
    if (fx.shiftPulse) this.kick.pulse(now);
    if (fx.hitStop && !reduced) this.time.hitStop(now);
    if (fx.slowMo && !reduced) this.time.slowMo(now);
    for (const q of fx.quakes) {
      // dust where it hit, and a shake for the player that fades with distance
      const [x, y, z] = q.position;
      for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; this.spawn(this.soft, x + Math.cos(a) * 3, y + 0.5, z + Math.sin(a) * 3, Math.cos(a) * 9, 1 + rnd() * 2, Math.sin(a) * 9, DUST, 1.4, 0.9, 0, 1.8, 1.5); }
      const me = this.lastPlayer;
      if (me) {
        const d = Math.hypot(me.position[0] - x, me.position[2] - z);
        const k = Math.max(0, 1 - d / JUICE.quakeReach);
        if (k > 0 && !reduced) this.trauma.add(JUICE.traumaQuake * q.strength * k);
      }
    }
    for (const b of fx.bursts) {
      // at a shot's or a drop's own point, else at its kart
      const k = b.at ? undefined : kartOf(b.racerId);
      if (!b.at && !k) continue;
      const [x, y, z] = b.at ?? k!.position;
      if (!k) {
        this.items.burst(b.kind as ItemBurst, x, y, z, 0, reduced, b.radius);
        // a rocket's explosion near the player shakes the camera, less the further off it is
        const me = this.lastPlayer;
        if (b.kind === 'boom' && me && !reduced) {
          const near = Math.max(0, 1 - Math.hypot(me.position[0] - x, me.position[2] - z) / BOOM.reach);
          if (near > 0) this.trauma.add(BOOM.trauma * near);
        }
        continue;
      }
      switch (b.kind) {
        case 'balloon': {
          const p = b.mine ? POP.mine : POP.rival, glow = b.mine ? [1.6, 1.4, 0.9] : POP.rivalGlow;
          for (let i = 0; i < p.confetti; i++) this.spawn(this.soft, x, y + 1.6, z, sym() * 6, 2 + rnd() * 5, sym() * 6, CONFETTI[i % 4], 0.22, 0.7, 12, 1);
          for (let i = 0; i < p.glow; i++) this.spawn(this.glow, x, y + 1.6, z, sym() * 3, rnd() * 3, sym() * 3, glow, p.glowSize, 0.3, 0, 3);
          break;
        }
        case 'gear': {
          // the ring stands across the road (side to side and up), facing the chase camera, and turns
          // clockwise as the camera sees it, as the gears on the road do; each spark is carried along with the kart
          const G = GEAR_POP, n = b.mine ? POP.mine.gearSparks : POP.rival.gearSparks, glow = b.mine ? GEAR_TEAL : POP.rivalGlow;
          const s = Math.sin(k.heading), c = Math.cos(k.heading), v = Math.max(0, k.speed), scale = b.mine ? 1 : 0.6;
          const o = this.o, turn = rnd() * Math.PI * 2;
          o.cx = s * v; o.cy = 0; o.cz = c * v;
          for (let i = 0; i < n; i++) {
            const a = turn + (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            // out from the middle: side × cos + up × sin (side = rightOf(heading), the driver's left); along the
            // ring its derivative, −side × sin + up × cos: from behind the kart, clockwise
            const ox = c * ca, oz = -s * ca, oy = sa, tx = -c * sa, tz = s * sa, ty = ca;
            this.spawn(this.glow, x + ox * G.radius, y + G.up + oy * G.radius, z + oz * G.radius,
              (tx * G.turn + ox * G.out) * scale, (ty * G.turn + oy * G.out) * scale, (tz * G.turn + oz * G.out) * scale,
              i % 2 && b.mine ? WHITE_HOT : glow, G.size * scale, G.life, 0, G.drag);
          }
          if (b.mine) this.spawn(this.glow, x, y + G.up, z, 0, 0, 0, WHITE_HOT, G.glint, G.glintLife, 0, 0, -0.8);
          o.cx = 0; o.cz = 0;
          break;
        }
        case 'gearsLost': {
          // the gears themselves fly out (gears.ts), with a few sparks off them
          this.gears.spawn(k, b.count ?? 1);
          const glow = b.mine ? GEAR_TEAL : POP.rivalGlow;
          for (let i = 0; i < 6; i++) this.spawn(this.glow, x, y + 0.9, z, sym() * 3, 2 + rnd() * 3, sym() * 3, glow, 0.16, 0.4, 8, 1);
          break;
        }
        case 'hitStars':
          // the cartoon burst, a ring, stars flung out (contact.ts); the spin's stars circle the head in frame()
          this.contact.hit(k, b.racerId === this.lastPlayer?.racerId, now, reduced);
          break;
        case 'bump': {
          const o = b.other ? kartOf(b.other) : undefined;
          if (o) this.contact.bump(k, o, b.mine ? (this.lastPlayer?.racerId ?? null) : null, now, reduced);
          break;
        }
        case 'confetti': {
          // up the road from the kart (forward = (sin h, 0, cos h), right = (cos h, 0, −sin h))
          const C = CONFETTI_BURST, s = Math.sin(k.heading), c = Math.cos(k.heading);
          const ahead = C.ahead + Math.max(0, k.speed) * C.lead;
          for (let i = 0; i < C.count; i++) {
            const f = ahead + sym() * C.depth, l = sym() * C.spread;
            this.spawn(this.confetti, x + s * f + c * l, y + C.rise + rnd() * C.riseSpread, z + c * f - s * l, sym() * 3, rnd() * 3, sym() * 3, CONFETTI[i % CONFETTI.length], C.size, 2.5 + rnd(), 4, 1.2);
          }
          break;
        }
        case 'land':
          // a low, quick scuff of dust, not big pale puffs (they read as blurry blobs behind the kart, at night most of all)
          for (let i = 0; i < 8; i++) this.spawn(this.soft, x + sym() * 0.6, y + 0.15, z + sym() * 0.6, sym() * 2.5, rnd() * 1.2, sym() * 2.5, SCUFF, 0.3, 0.38, 0, 2.2, 1);
          break;
        case 'wall':
          // sparks where the kart meets the wall, its dust there, a scrape along it (contact.ts)
          this.contact.wall(k, b.mine ?? b.racerId === this.lastPlayer?.racerId, now, reduced);
          break;
        case 'shield':
          // a trailed item stopped a shot from behind
          for (let i = 0; i < 18; i++) this.spawn(this.glow, x, y + 1, z, sym() * 3, sym() * 3, sym() * 3, [0.6, 1.3, 1.9], 0.25, 0.45, 0, 2);
          break;
        default:
          // the items' own (itemfx.ts), at the kart
          this.items.burst(b.kind as ItemBurst, x, y, z, k.heading, reduced, b.radius, b.racerId);
          break;
      }
    }
  }

  /** One firework burst at (x, y, z) in confetti hue `hue` (any integer); `scale` grows it (a burst high over the road: 3). */
  firework(x: number, y: number, z: number, hue: number, reduced = false, scale = 1): void {
    const F = FIREWORK, c = CONFETTI[((hue % CONFETTI.length) + CONFETTI.length) % CONFETTI.length], o = this.hot;
    o[0] = c[0] * F.heat + 0.3; o[1] = c[1] * F.heat + 0.3; o[2] = c[2] * F.heat + 0.3;
    const n = reduced ? F.reducedCount : F.count;
    for (let i = 0; i < n; i++) {
      // directions spread evenly round a sphere
      const u = sym(), a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = F.speed * scale * (0.8 + rnd() * 0.4);
      this.spawn(this.glow, x, y, z, Math.cos(a) * r * sp, u * sp, Math.sin(a) * r * sp, o, F.size * scale, F.life + rnd() * 0.4, F.gravity * scale, F.drag);
    }
    for (let i = 0; i < 5; i++) this.spawn(this.glow, x, y, z, sym() * scale, sym() * scale, sym() * scale, WHITE_HOT, F.size * 2.2 * scale, 0.3, 0, 2);
  }

  /**
   * A Final Lap Shift set piece's burst (track-builder mesh/shiftStage.ts): dust where something lands
   * (a big one near the player's kart shakes the camera a little), a plume rising out of a chasm,
   * sparks, a tree's leaves, a firework high over the road. `size` scales it.
   */
  shiftBurst(kind: 'dust' | 'plume' | 'sparks' | 'leaves' | 'firework', x: number, y: number, z: number, size: number, hue: number, reduced: boolean): void {
    switch (kind) {
      case 'dust': {
        const n = Math.round(18 * size);
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; this.spawn(this.soft, x + Math.cos(a) * size, y + 0.3, z + Math.sin(a) * size, Math.cos(a) * 5 * size, 0.8 + rnd() * 2 * size, Math.sin(a) * 5 * size, DUST, 1.1 * size, 1 + rnd() * 0.5, 0, 1.6, 1.4); }
        const me = this.lastPlayer;
        if (me && size >= 1.4 && !reduced) {
          const k = Math.max(0, 1 - Math.hypot(me.position[0] - x, me.position[2] - z) / JUICE.quakeReach);
          if (k > 0) this.trauma.add(JUICE.traumaQuake * 0.45 * k);
        }
        break;
      }
      case 'plume':
        // a slow column of dust rising out of the chasm, big enough to read from across the canyon
        for (let i = 0; i < 26; i++) this.spawn(this.soft, x + sym() * 3 * size, y + rnd() * 2, z + sym() * 3 * size, sym() * 1.5, 4 + rnd() * 5, sym() * 1.5, DUST_DARK, 2.2 * size, 2.6 + rnd() * 1.2, -0.6, 0.5, 1.8);
        break;
      case 'sparks':
        for (let i = 0; i < 22; i++) this.spawn(this.glow, x, y, z, sym() * 4 * size, 1 + rnd() * 5 * size, sym() * 4 * size, SPARK_GOLD, 0.16 * size, 0.45 + rnd() * 0.3, 9, 1);
        break;
      case 'leaves':
        for (let i = 0; i < 30; i++) this.spawn(this.confetti, x + sym() * 3 * size, y + rnd() * 3, z + sym() * 3 * size, sym() * 3, 1 + rnd() * 3, sym() * 3, LEAVES[i % LEAVES.length], 0.3, 2 + rnd(), 2.5, 1.6);
        break;
      case 'firework': this.firework(x, y, z, hue, reduced, size); break;
    }
  }

  /**
   * A popped balloon back on the road (track-builder mesh/balloonBack.ts: it blows up again out of its knot):
   * a little sparkle round it as it swells, glints flung out from its middle at (x, y, z) and a soft gleam at
   * its heart. None with reduced motion (the balloon only fades in).
   */
  balloonBack(x: number, y: number, z: number, reduced: boolean): void {
    if (reduced) return;
    const S = BALLOON_SPARKLE, turn = rnd() * Math.PI * 2;
    for (let i = 0; i < S.glints; i++) {
      const a = turn + (i / S.glints) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), up = sym() * S.spread;
      this.spawn(this.glow, x + ca * S.radius, y + up, z + sa * S.radius, ca * S.out, up * S.out + S.rise, sa * S.out,
        i % 2 ? WHITE_HOT : S.gold, S.size, S.life + rnd() * S.lifeSpread, 0, S.drag, S.grow);
    }
    this.spawn(this.glow, x, y, z, 0, 0, 0, WHITE_HOT, S.gleam, S.gleamLife, 0, 0, S.grow);
  }

  /** `n` pieces of confetti drifting down over (x, y, z), within `radius` metres of it. */
  confettiRain(x: number, y: number, z: number, radius: number, n: number): void {
    const R = CONFETTI_RAIN;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius;
      this.spawn(this.confetti, x + Math.cos(a) * r, y + R.up + rnd() * R.spread, z + Math.sin(a) * r, sym() * 1.2, -rnd() * 0.6, sym() * 1.2,
        CONFETTI[Math.floor(rnd() * CONFETTI.length) % CONFETTI.length], R.size, R.life + rnd(), R.gravity, R.drag);
    }
  }

  /**
   * Once per rendered frame. `simDt` is the sim time that passed this frame (0 while paused or
   * frozen), so emitters stop with the sim; particles keep fading on the real `dt`. `revs`: each
   * kart's engine rev (kart-controller rev.ts), in `karts`' order, for the pipes' smoke. `views`: the
   * karts' drawn places, in `karts`' order (the dizzy stars circle the drawn head; else the sim's).
   */
  frame(dt: number, simDt: number, t: number, karts: readonly KartState[], player: KartState | undefined, camPos: readonly number[], reduced: boolean, revs?: readonly (RevView | undefined)[], views?: readonly Drawn[], shots?: readonly Projectile[]): void {
    this.lastPlayer = player;
    // (an index loop, not for-of: an iterator is garbage every frame)
    if (simDt > 0) for (let i = 0; i < karts.length; i++) this.kartFx.emit(karts[i], simDt, t, camPos, karts[i] === player, reduced, revs?.[i], this.wet);
    this.contact.emit(simDt, t, karts, camPos);
    // the shots' trails, Jet Mode's contrails, the EMP'd karts' crackle, and the items' rings
    this.items.frame(dt, simDt, shots, karts, reduced);
    this.glow.update(dt); this.soft.update(dt); this.confetti.update(dt); this.kartFx.update(dt); this.gears.update(dt);
    this.skids.setTime(t);
    this.trauma.update(dt);
    this.trauma.shake(t, this.shake, !reduced);
    // after the pools' update: the dizzy stars are drawn where they stand this frame; the player's contact jolt joins the shake
    this.contact.draw(t, karts, views, this.shake, reduced);
    // the streaks run while a boost does, hardest at its punch; never under reduced motion
    this.lines.update(t, dt, this.boostLevel(player, t, reduced));
    this.camRoll.update(dt, player !== undefined && player.drift.active && player.grounded, player?.drift.direction ?? 0, player?.speed ?? 0, reduced);
  }

  /** Camera roll for the player's drift (eased, zero under reduced motion) plus the trauma roll. */
  roll(player: KartState | undefined): number {
    return (player ? this.camRoll.value : 0) + this.shake.roll;
  }

  /** 0..1: how hard the player's boost is felt now (its hold, or its punch while that is stronger); 0 at a crawl or under reduced motion. The speed lines and the post chain's streaks run on it. */
  boostLevel(player: KartState | undefined, t: number, reduced: boolean): number {
    if (reduced || !player || player.speed <= 8) return 0;
    return Math.min(1, Math.max(boostHold(player.boost.remaining, player.boost.multiplier), this.kick.level(t)));
  }

  dispose(): void {
    this.glow.dispose(); this.soft.dispose(); this.confetti.dispose(); this.skids.dispose(); this.lines.dispose(); this.kartFx.dispose();
    this.gears.dispose(); (this.gears.mesh.material as { dispose(): void }).dispose();
    this.items.dispose();
  }
}
