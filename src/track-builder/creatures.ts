// Course creatures (design §6, Adam 23 Sept 2026): one big original creature per track at a set
// spot, driven by race time only like every hazard, so a replay sees the same creature. Each one
// warns first (a rear-up and a roar, a growing shadow, a rising tentacle, a honk, a song) and the
// AI dodges what it throws like any hazard. `hazards(time)` lists what can hit a kart now;
// `pose(time)` tells the scene where to draw the creature and its warning marks.
import type { Branches } from './branches.ts';
import type { ActiveHazard, CreatureKind, HazardDef, Vec3 } from './types.ts';

/** The numbers behind each creature. One place, named, so tuning never hunts for a literal. */
export const CREATURE = Object.freeze({
  rumblesaur: {
    /** metres off the road edge it stands, on its own side; its foot lands `step` nearer the road */ off: 9, step: 3.5,
    /** metres its legs and tail reach round it: on an off-road track it stands that far past the course limit */ footprint: 5,
    /** seconds of idle, then rearing up (the warning), then the stomp */ idle: 2.9, rear: 1.2,
    /** the shock ring: rolls out from the foot this fast, this far, this thick */ ringSpeed: 19, ringReach: 30, ringHalf: 1.2,
    /** the stomping foot itself, for this long after it lands */ footRadius: 3, footSeconds: 0.3,
    /** points along the ring that can hit, close enough that no kart slips between two at full reach */ ringPoints: 48,
  },
  yeti: {
    off: 11, windUp: 0.9, flight: 1.2, roll: 2.2, rollSpeed: 10, radius: 1.6,
    /** its ledge's reach round it at the ground (mesh/creatures.ts): it stands that far past the course limit */ footprint: 7,
    /** how far down the road (metres) the snowball lands from the yeti */ ahead: 14,
  },
  kraken: {
    off: 17, idle: 3.4, warn: 1.5, slam: 0.7, retract: 1.2,
    /** the tentacle across the road: circles of this radius */ radius: 1.5,
  },
  crab: { wait: 1.4, cross: 2.4, radius: 3, /** metres past each road edge it waits */ off: 5 },
  goose: {
    wait: 2.2, charge: 3.2, turn: 1.4, speed: 17, radius: 2, off: 7,
    /** its weave down the road: amplitude (m) and period (s) */ weave: 2.2, weavePeriod: 1.1,
  },
  whale: {
    off: 70, height: 26, swim: 7.5, warn: 1.8, slap: 2, gust: 20,
    /** the gust stretch along the road (m) */ window: 36,
  },
});

/** Everything the scene needs to draw a creature this frame. */
export interface CreaturePose {
  id: string;
  kind: CreatureKind;
  position: Vec3;
  /** radians; forward = (sin, 0, cos) */
  heading: number;
  /** what it is doing: idle | rear | stomp | windUp | throw | warn | slam | retract | wait | cross | charge | turn | walk | swim | slap */
  action: string;
  /** 0..1 through that action */
  phase: number;
  /** the pieces around it: a snowball, a shadow to warn, a ring, a tentacle tip */
  marks: { kind: 'snowball' | 'shadow' | 'ring' | 'tentacle' | 'line'; position: Vec3; radius: number; to?: Vec3; strength: number }[];
}

const smooth = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
/** A fixed pseudo-random 0..1 for throw number k (deterministic). */
const hash = (k: number) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** hw: the road's half width; reach: how far out a kart can drive (the course limit past the curb on an off-road track) */
interface Frame { p: Vec3; tangent: Vec3; right: Vec3; hw: number; reach: number; heading: number }

export class Creature {
  readonly id: string;
  readonly kind: CreatureKind;
  private readonly def: HazardDef;
  private readonly branches: Branches;
  private readonly side: number;
  /** main-line t of its spot (shift.ts switches it off if a route change takes its road) */
  t: number;
  /** its spot on the road as a world point, which a route change elsewhere does not move */
  private readonly spot: Vec3;

  constructor(id: string, def: HazardDef, branches: Branches) {
    this.id = id;
    this.def = def;
    this.kind = def.creature as CreatureKind;
    this.branches = branches;
    this.side = (def.lateral ?? 1) >= 0 ? 1 : -1;
    this.t = def.t;
    this.spot = branches.main.sample(def.t, 0).position;
  }

  /**
   * After a main-line rebuild the creature stays where it stood, like every hazard (bug hunt 2, 24 Sept
   * 2026: keeping its t moved Canyon's Rumblesaur 22 m up the road when the collapse shortened the lap).
   */
  rederive(): void { this.t = this.branches.main.nearestGlobal(this.spot).t; }

  private frame(t: number): Frame {
    const s = this.branches.main.sample(t, 0);
    const rx = s.tangent[2], rz = -s.tangent[0], n = Math.hypot(rx, rz) || 1;
    return { p: s.position, tangent: s.tangent, right: [rx / n, 0, rz / n], hw: s.halfWidth, reach: s.wall ?? s.halfWidth, heading: Math.atan2(s.tangent[0], s.tangent[2]) };
  }

  /**
   * Metres out from the centreline a big creature stands: `off` past the road edge, and on an off-road
   * track far enough past the course limit that its body clears the sand karts drive on (bug hunt 2,
   * 24 Sept 2026: karts drove through the Rumblesaur's legs and the yeti's ledge). What it throws or
   * stomps still lands where it did.
   */
  private clear(f: Frame, off: number, footprint: number): number { return Math.max(f.hw + off, f.reach + footprint); }

  private at(f: Frame, lateral: number, up = 0): Vec3 {
    return [f.p[0] + f.right[0] * lateral, f.p[1] + up, f.p[2] + f.right[2] * lateral];
  }

  private period(): number { return this.def.period ?? 8; }
  private phase(time: number): number { const P = this.period(); return ((time % P) + P) % P; }

  /** What can hit a kart at race time `time`. */
  hazards(time: number): ActiveHazard[] {
    const out: ActiveHazard[] = [];
    const pose = this.pose(time);
    const id = this.id, hit = this.def.hit ?? 'spin';
    switch (this.kind) {
      case 'rumblesaur': {
        const C = CREATURE.rumblesaur;
        for (const m of pose.marks) {
          if (m.kind === 'ring') {
            // points round the ring that lie where a kart can be (the road, and the sand out to the course limit)
            const f = this.frame(this.t);
            for (let k = 0; k < C.ringPoints; k++) {
              const a = (k / C.ringPoints) * Math.PI * 2;
              const x = m.position[0] + Math.cos(a) * m.radius, z = m.position[2] + Math.sin(a) * m.radius;
              const lat = (x - f.p[0]) * f.right[0] + (z - f.p[2]) * f.right[2];
              if (Math.abs(lat) > Math.max(f.hw + 2, f.reach)) continue;
              out.push({ id, type: 'creature', position: [x, m.position[1], z], radius: C.ringHalf, hit, ground: true });
            }
          } else if (m.kind === 'shadow' && pose.action === 'stomp') {
            out.push({ id, type: 'creature', position: m.position, radius: C.footRadius, hit });
          }
        }
        break;
      }
      case 'yeti':
        for (const m of pose.marks) if (m.kind === 'snowball' && m.strength >= 1) out.push({ id, type: 'rolling', position: m.position, radius: m.radius, hit });
        break;
      case 'kraken':
        if (pose.action === 'slam') for (const m of pose.marks) if (m.kind === 'tentacle') out.push({ id, type: 'creature', position: m.position, radius: m.radius, hit });
        break;
      case 'crab': case 'goose': {
        const C = this.kind === 'crab' ? CREATURE.crab : CREATURE.goose;
        const f = this.frame(this.t);
        const lat = (pose.position[0] - f.p[0]) * f.right[0] + (pose.position[2] - f.p[2]) * f.right[2];
        // wherever a kart can reach it (the road, or the sand out to the course limit)
        if (this.kind === 'goose' || Math.abs(lat) < Math.max(f.hw, f.reach) + C.radius) out.push({ id, type: 'creature', position: [pose.position[0], this.groundAt(pose.position), pose.position[2]], radius: C.radius, hit });
        break;
      }
      case 'whale': {
        if (pose.action !== 'slap') break;
        const C = CREATURE.whale, f = this.frame(this.t);
        // the tail's wind blows across the road, away from the whale
        const p = C.gust * -this.side;
        out.push({ id, type: 'gust', position: f.p, radius: C.window / 2, hit: 'bump', push: [f.right[0] * p, 0, f.right[2] * p] });
        break;
      }
    }
    return out;
  }

  /** Road height under a point near the creature's spot (its t). */
  private groundAt(_p: Vec3): number { return this.frame(this.t).p[1]; }

  pose(time: number): CreaturePose {
    const p = this.phase(time), side = this.side, id = this.id, kind = this.kind;
    const marks: CreaturePose['marks'] = [];
    switch (kind) {
      case 'rumblesaur': {
        const C = CREATURE.rumblesaur, f = this.frame(this.t);
        const body = this.at(f, side * this.clear(f, C.off, C.footprint));
        // it faces the road
        const heading = f.heading - side * Math.PI / 2;
        const foot = this.at(f, side * (f.hw + C.off - C.step));
        const stompAt = C.idle + C.rear;
        let action = 'idle', ph = p / C.idle;
        if (p >= C.idle && p < stompAt) { action = 'rear'; ph = (p - C.idle) / C.rear; marks.push({ kind: 'shadow', position: foot, radius: C.footRadius, strength: ph }); }
        else if (p >= stompAt) {
          const since = p - stompAt, r = C.footRadius + since * C.ringSpeed;
          action = since < C.footSeconds ? 'stomp' : 'settle';
          ph = Math.min(1, since / (this.period() - stompAt));
          if (since < C.footSeconds) marks.push({ kind: 'shadow', position: foot, radius: C.footRadius, strength: 1 });
          if (r < C.ringReach) marks.push({ kind: 'ring', position: foot, radius: r, strength: 1 - r / C.ringReach });
        }
        return { id, kind, position: body, heading, action, phase: ph, marks };
      }
      case 'yeti': {
        const C = CREATURE.yeti, f = this.frame(this.t);
        const body = this.at(f, side * this.clear(f, C.off, C.footprint), 3);
        const heading = f.heading - side * Math.PI / 2;
        const P = this.period(), k = Math.floor(time / P);
        let action = 'idle', ph = 0;
        if (p >= P - C.windUp) { action = 'windUp'; ph = (p - (P - C.windUp)) / C.windUp; }
        else if (p < C.flight) { action = 'throw'; ph = p / C.flight; }
        // this cycle's snowball: flies from the yeti to its landing spot, then rolls down the road
        const L = this.branches.main.lut.length;
        const landT = this.t + C.ahead / L;
        const lf = this.frame(landT);
        const landLat = (hash(k) * 2 - 1) * Math.max(0, lf.hw - C.radius - 1);
        const land = this.at(lf, landLat);
        if (p < C.flight) {
          const s = smooth(p / C.flight);
          const hand: Vec3 = [body[0], body[1] + 4, body[2]];
          const arc = Math.sin(s * Math.PI) * 9;
          marks.push({ kind: 'snowball', position: [hand[0] + (land[0] - hand[0]) * s, hand[1] + (land[1] + C.radius - hand[1]) * s + arc, hand[2] + (land[2] - hand[2]) * s], radius: C.radius, strength: 0 });
          marks.push({ kind: 'shadow', position: land, radius: C.radius * (0.6 + 0.6 * s), strength: s });
        } else if (p < C.flight + C.roll) {
          const d = (p - C.flight) * C.rollSpeed;
          const rt = landT - d / L;
          const rf = this.frame(rt);
          const pos = this.at(rf, landLat, C.radius);
          marks.push({ kind: 'snowball', position: pos, radius: C.radius, strength: 1 });
        }
        return { id, kind, position: body, heading, action, phase: ph, marks };
      }
      case 'kraken': {
        const C = CREATURE.kraken, f = this.frame(this.t);
        const lat = side * (f.hw + C.off);
        const body = this.at(f, lat, -1);
        const heading = f.heading - side * Math.PI / 2;
        let action = 'idle', ph = p / C.idle;
        const warnEnd = C.idle + C.warn, slamEnd = warnEnd + C.slam;
        if (p >= C.idle && p < warnEnd) { action = 'warn'; ph = (p - C.idle) / C.warn; }
        else if (p >= warnEnd && p < slamEnd) { action = 'slam'; ph = (p - warnEnd) / C.slam; }
        else if (p >= slamEnd) { action = 'retract'; ph = Math.min(1, (p - slamEnd) / C.retract); }
        // where the tentacle lands: straight across the road from the kraken's side to the far edge
        const near = this.at(f, side * (f.hw + 1)), far = this.at(f, -side * (f.hw + 1));
        if (action === 'warn') marks.push({ kind: 'line', position: near, to: far, radius: C.radius, strength: ph });
        if (action === 'slam') {
          const n = Math.ceil((2 * f.hw + 2) / (C.radius * 1.6));
          for (let i = 0; i <= n; i++) {
            const s = i / n;
            marks.push({ kind: 'tentacle', position: [near[0] + (far[0] - near[0]) * s, near[1] + 0.8, near[2] + (far[2] - near[2]) * s], radius: C.radius, strength: 1 });
          }
        }
        return { id, kind, position: body, heading, action, phase: ph, marks };
      }
      case 'crab': {
        const C = CREATURE.crab, f = this.frame(this.t);
        const edge = f.hw + C.off;
        // wait, scuttle across, wait, scuttle back: a period of 2 × (wait + cross)
        const half = C.wait + C.cross, leg = p % half, back = p >= half;
        const from = (back ? -1 : 1) * side * edge, to = -from;
        let lat = from, action = 'wait', ph = leg / C.wait;
        if (leg >= C.wait) { const s = smooth((leg - C.wait) / C.cross); lat = from + (to - from) * s; action = 'cross'; ph = (leg - C.wait) / C.cross; }
        // a crab walks sideways: it faces along the road
        return { id, kind, position: this.at(f, lat), heading: f.heading + Math.PI, action, phase: ph, marks };
      }
      case 'goose': {
        const C = CREATURE.goose, L = this.branches.main.lut.length;
        const f0 = this.frame(this.t), edge = f0.hw + C.off;
        const chargeEnd = C.wait + C.charge, turnEnd = chargeEnd + C.turn;
        let d = 0, lat = side * edge, action = 'wait', ph = p / C.wait, heading = f0.heading + Math.PI;
        if (p >= C.wait && p < chargeEnd) {
          const tau = p - C.wait;
          d = tau * C.speed;
          const into = smooth(tau / 0.8);
          lat = side * edge * (1 - into) + Math.sin((tau / C.weavePeriod) * Math.PI * 2) * C.weave * into;
          action = 'charge'; ph = tau / C.charge;
        } else if (p >= chargeEnd) {
          d = C.charge * C.speed;
          const back = smooth((p - chargeEnd) / C.turn);
          lat = side * edge * back;
          action = p < turnEnd ? 'turn' : 'walk';
          ph = p < turnEnd ? (p - chargeEnd) / C.turn : (p - turnEnd) / (this.period() - turnEnd);
          // it walks back up beside the road to where it started
          if (p >= turnEnd) d = C.charge * C.speed * (1 - smooth((p - turnEnd) / (this.period() - turnEnd)));
          heading = p >= turnEnd ? f0.heading : f0.heading + Math.PI - side * Math.PI / 2 * back;
        }
        const f = this.frame(this.t - d / L);
        const pos = this.at(f, lat);
        if (action === 'wait' && ph > 0.4) marks.push({ kind: 'shadow', position: this.at(f0, side * (f0.hw - 1)), radius: 1.5, strength: ph });
        return { id, kind, position: pos, heading: action === 'charge' ? f.heading + Math.PI : heading, action, phase: ph, marks };
      }
      case 'whale': {
        const C = CREATURE.whale, f = this.frame(this.t);
        const warnEnd = C.swim + C.warn, slapEnd = warnEnd + C.slap;
        let action = 'swim', ph = p / C.swim;
        // it swims a slow loop out beside the course, coming close to slap its tail
        // 0 far out, 1 close in: it eases in over 2 s before the warning and back out after the slap
        let near = 0;
        if (p >= C.swim - 2 && p < C.swim) near = smooth((p - (C.swim - 2)) / 2);
        else if (p >= C.swim && p < slapEnd) near = 1;
        else if (p >= slapEnd) near = 1 - smooth((p - slapEnd) / Math.max(0.5, this.period() - slapEnd));
        if (p >= C.swim && p < warnEnd) { action = 'warn'; ph = (p - C.swim) / C.warn; }
        else if (p >= warnEnd && p < slapEnd) { action = 'slap'; ph = (p - warnEnd) / C.slap; }
        else if (p >= slapEnd) { action = 'swim'; ph = (p - slapEnd) / (this.period() - slapEnd); }
        const along = Math.sin((time / this.period()) * Math.PI * 2) * 20;
        const L = this.branches.main.lut.length;
        const g = this.frame(this.t + along / L);
        const lat = side * (f.hw + C.off * (1 - near * 0.55));
        const pos = this.at(g, lat, C.height - near * 8);
        return { id, kind, position: pos, heading: g.heading + (Math.cos((time / this.period()) * Math.PI * 2) > 0 ? 0 : Math.PI), action, phase: ph, marks };
      }
    }
    return { id, kind, position: this.frame(this.t).p, heading: 0, action: 'idle', phase: 0, marks };
  }
}
