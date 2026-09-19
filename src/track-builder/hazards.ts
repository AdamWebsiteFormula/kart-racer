// Deterministic hazard kinematics driven by race time only. Nothing here touches
// kart state: race-manager does the hit test and calls applyHit.
//   rolling   moves along −tangent from its t at `speed`; respawns every `period`
//   crossing  oscillates laterally across the road every `period`, inside halfWidth
//   falling   on the ground and active for the first fallingActiveSeconds of every period
//             (the drop itself is a visual for the scene layer)
//   static    always there
//   gust      for the first half of every period, pushes `speed` m/s² sideways over a gustWindow stretch
import type { Branches } from './branches.ts';
import { BUILDER } from './constants.ts';
import { lateralAt } from './features.ts';
import type { ActiveHazard, HazardDef, Vec3 } from './types.ts';

interface Baked {
  id: string;
  def: HazardDef;
  t: number;
  lateral: number;
  position: Vec3;
  enabled: boolean;
}

export class Hazards {
  private readonly items: Baked[] = [];
  private readonly branches: Branches;

  constructor(defs: readonly HazardDef[], branches: Branches) {
    this.branches = branches;
    defs.forEach((def, i) => {
      const lateral = def.lateral ?? 0;
      const s = branches.sample(def.t, lateral, 0);
      this.items.push({ id: def.id ?? `hazard-${i}`, def, t: def.t, lateral, position: s.position, enabled: true });
    });
  }

  get ids(): string[] { return this.items.map((h) => h.id); }

  setEnabled(id: string, enabled: boolean): void {
    const h = this.items.find((x) => x.id === id);
    if (h) h.enabled = enabled;
  }

  isEnabled(id: string): boolean {
    return this.items.find((x) => x.id === id)?.enabled ?? false;
  }

  /** After a main-line rebuild: keep the world position, re-derive t. */
  rederive(): void {
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
    return out;
  }
}
