// Deterministic hazard kinematics driven by race time only. Nothing here touches
// kart state: race-manager does the hit test and calls applyHit.
//   rolling   moves along −tangent from its t at `speed`; respawns every `period`
//   crossing  oscillates laterally across the road every `period`, inside halfWidth
//   falling   on the ground and active for the first fallingActiveSeconds of every period
//             (the drop itself is a visual for the scene layer)
//   static    always there
//   gust      for the first half of every period, pushes `speed` m/s² sideways over a gustWindow stretch
//   vent      a geyser or steam vent: quiet, then glows ventWarnSeconds, then erupts ventEruptSeconds
//             at the end of every period; erupting, it throws a kart up (hit 'launch')
import type { Branches } from './branches.ts';
import { BUILDER } from './constants.ts';
import { lateralAt } from './features.ts';
import { Creature, type CreaturePose } from './creatures.ts';
import type { ActiveHazard, HazardDef, Vec3 } from './types.ts';

interface Baked {
  id: string;
  def: HazardDef;
  t: number;
  lateral: number;
  position: Vec3;
  enabled: boolean;
}

export type VentState = 'idle' | 'warn' | 'erupt';

/** Where a vent is in its cycle at race time `time`: the state and how far through it (0..1). Pure. */
export function ventPhase(def: HazardDef, time: number): { state: VentState; k: number } {
  const period = Math.max(def.period ?? 5, BUILDER.ventWarnSeconds + BUILDER.ventEruptSeconds + 0.1);
  const p = (((time + (def.offset ?? 0)) % period) + period) % period;
  const erupt = period - BUILDER.ventEruptSeconds, warn = erupt - BUILDER.ventWarnSeconds;
  if (p >= erupt) return { state: 'erupt', k: (p - erupt) / BUILDER.ventEruptSeconds };
  if (p >= warn) return { state: 'warn', k: (p - warn) / BUILDER.ventWarnSeconds };
  return { state: 'idle', k: p / warn };
}

export interface VentView { id: string; position: Vec3; asset: string; state: VentState; k: number }

export class Hazards {
  private readonly items: Baked[] = [];
  private readonly branches: Branches;
  /** the course creatures, kept apart: they move by their own script (creatures.ts) */
  readonly creatures: Creature[] = [];

  constructor(defs: readonly HazardDef[], branches: Branches) {
    this.branches = branches;
    defs.forEach((def, i) => {
      if (def.type === 'creature') { this.creatures.push(new Creature(def.id ?? `creature-${i}`, def, branches)); return; }
      const lateral = def.lateral ?? 0;
      const s = branches.sample(def.t, lateral, 0);
      this.items.push({ id: def.id ?? `hazard-${i}`, def, t: def.t, lateral, position: s.position, enabled: true });
    });
  }

  get ids(): string[] { return [...this.items.map((h) => h.id), ...this.creatures.map((c) => c.id)]; }

  /** Every enabled vent at race time `time`: where it is and what it is doing. */
  vents(time: number): VentView[] {
    const out: VentView[] = [];
    for (const h of this.items) {
      if (h.def.type !== 'vent' || !h.enabled) continue;
      out.push({ id: h.id, position: h.position, asset: h.def.asset ?? 'geyser', ...ventPhase(h.def, time) });
    }
    return out;
  }

  /** Where to draw every creature at race time `time`. One switched off is not there: no pose (and no roar). */
  creaturePoses(time: number): CreaturePose[] { return this.creatures.filter((c) => this.creatureEnabled(c.id)).map((c) => c.pose(time)); }

  setEnabled(id: string, enabled: boolean): void {
    const h = this.items.find((x) => x.id === id);
    if (h) h.enabled = enabled;
    if (this.creatures.some((c) => c.id === id)) { if (enabled) this.off.delete(id); else this.off.add(id); }
  }

  isEnabled(id: string): boolean {
    if (this.creatures.some((c) => c.id === id)) return !this.off.has(id);
    return this.items.find((x) => x.id === id)?.enabled ?? false;
  }

  /** After a main-line rebuild: keep the world position, re-derive t. */
  rederive(): void {
    for (const c of this.creatures) c.rederive();
    for (const h of this.items) {
      h.t = this.branches.main.nearestGlobal(h.position).t;
      h.lateral = lateralAt(this.branches, h.t, 0, h.position);
    }
  }

  /** Every hazard that can hit a kart at race time `time` (seconds). */
  activeHazards(time: number): ActiveHazard[] {
    const out: ActiveHazard[] = [];
    const main = this.branches.main;
    const length = main.lut.length;
    const radius = BUILDER.hazardRadius;
    for (const h of this.items) {
      if (!h.enabled) continue;
      const d = h.def;
      const hit = d.hit ?? 'spin';
      const period = d.period ?? 1;
      const phase = period > 0 ? ((time % period) + period) % period : 0;
      switch (d.type) {
        case 'static': {
          out.push({ id: h.id, type: d.type, position: h.position, radius, hit });
          break;
        }
        case 'rolling': {
          const dist = (d.speed ?? 0) * phase;
          const t = h.t - dist / length;
          out.push({ id: h.id, type: d.type, position: main.sample(t, h.lateral).position, radius, hit });
          break;
        }
        case 'crossing': {
          const hw = main.sample(h.t, 0).halfWidth;
          const amp = Math.max(0, hw - radius);
          const lateral = amp * Math.sin((2 * Math.PI * phase) / period);
          out.push({ id: h.id, type: d.type, position: main.sample(h.t, lateral).position, radius, hit });
          break;
        }
        case 'falling': {
          if (phase < BUILDER.fallingActiveSeconds) out.push({ id: h.id, type: d.type, position: h.position, radius, hit });
          break;
        }
        case 'vent': {
          if (ventPhase(d, time).state === 'erupt') {
            out.push({ id: h.id, type: d.type, position: h.position, radius: BUILDER.ventRadius, hit: 'launch', launch: d.launch ?? BUILDER.ventLaunch });
          }
          break;
        }
        case 'gust': {
          if (phase < period / 2) {
            const s = main.sample(h.t, 0);
            const rx = s.tangent[2], rz = -s.tangent[0];
            const hh = Math.hypot(rx, rz) || 1;
            // authored on one side, pushes toward the other; lateral 0 pushes right
            const sign = h.lateral > 0 ? -1 : 1;
            const p = (d.speed ?? 0) * sign;
            out.push({ id: h.id, type: d.type, position: s.position, radius: BUILDER.gustWindow / 2, hit: 'bump', push: [(rx / hh) * p, 0, (rz / hh) * p] });
          }
          break;
        }
      }
    }
    for (const c of this.creatures) if (this.creatureEnabled(c.id)) out.push(...c.hazards(time));
    return out;
  }

  private readonly off = new Set<string>();
  private creatureEnabled(id: string): boolean { return !this.off.has(id); }
}
