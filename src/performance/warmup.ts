// Race-start warm-up (docs/sops/performance.md). A shader compiled the first time its material is
// drawn stalls that frame for 120 to 660 ms on Chrome's Metal backend (measured 2026-09-24), and a
// race kept meeting new ones: every prop, creature and item first coming into view, the shadow
// pass's depth variants, the Final Lap Shift's hidden dressing. So before the countdown runs,
// every material in the scene is compiled at once for the renderer's current settings (in
// parallel off the main thread where the browser has KHR_parallel_shader_compile), then drawn
// once with everything on show, culling off and each empty instance pool given one instance, so
// the shadow pass's shaders, the GPU's pipeline states and every texture upload happen too.
// Compiled shaders are then kept for the page's life: three frees a shader with the last material
// using it, and the Final Lap Shift rebuilds its balloons, coins, pads and ramps with new materials
// (as the next race rebuilds the track), which compiled the same shaders all over again. A custom
// shader (ShaderMaterial) is also known to three by its source's id, dropped with its last
// material, so each one keeps a stand-in copy of its material alive as well.
import { BufferGeometry, InstancedMesh, Mesh, Scene, WebGLRenderTarget, type Camera, type Light, type Material, type Object3D, type ShaderMaterial, type ToneMapping, type WebGLRenderer } from 'three';

/**
 * Put every object under `root` on show for one draw: hidden objects visible (lights excepted: a
 * light changes every shader's key), frustum culling off (the shadow pass culls by the same flag)
 * and every empty instance pool one instance long. Returns the undo, which restores exactly.
 */
export function exposeAll(root: Object3D): () => void {
  const hidden: Object3D[] = [], culled: Object3D[] = [], empty: InstancedMesh[] = [];
  root.traverse((o) => {
    if ((o as Light).isLight) return;
    if (!o.visible) { o.visible = true; hidden.push(o); }
    if (o.frustumCulled) { o.frustumCulled = false; culled.push(o); }
    const im = o as InstancedMesh;
    if (im.isInstancedMesh && im.count === 0) { im.count = 1; empty.push(im); }
  });
  return () => {
    for (const o of hidden) o.visible = false;
    for (const o of culled) o.frustumCulled = true;
    for (const im of empty) im.count = 0;
  };
}

/** Every material under `root`, shown or hidden. */
export function materialsOf(root: Object3D): Set<Material> {
  const out = new Set<Material>();
  root.traverse((o) => {
    const m = (o as Mesh).material;
    if (!m) return;
    if (Array.isArray(m)) for (const x of m) out.add(x); else out.add(m);
  });
  return out;
}

/** Shaders kept alive at most (about 60 cover every track, item, effect and quality level). */
export const MAX_KEPT = 256;

/** three's compiled program, as far as the warm-up needs it */
interface Program { isReady(): boolean; program?: unknown; usedTimes: number }

/** Renderer settings that change every shader: what a quality level draws with. */
export interface ShaderSettings {
  shadows: boolean;
  /** the renderer's tone mapping (none while the post chain does it) */
  toneMapping: ToneMapping;
  /** drawn into the post chain's buffer, not straight to the screen */
  intoTarget: boolean;
}

/** Drop the programs that are done (or were freed); true when none is left. */
function settle(waiting: Set<Program>): boolean {
  for (const p of waiting) if (p.program === undefined || p.isReady()) waiting.delete(p);
  return waiting.size === 0;
}

export class Warmup {
  /** a race's shaders still compiling, the game holding its countdown */
  private waiting: Set<Program> | null = null;
  /** files the race wants on screen from its first frame (its skies' paintings), still loading */
  private loading = 0;
  private since = 0;
  /** a quality change's shaders compiling in the background, the old quality still drawing */
  private background: { waiting: Set<Program>; since: number } | null = null;
  /** a stand-in for the post chain's buffer: a shader's key only asks whether it draws to a target or the screen */
  private readonly target = new WebGLRenderTarget(1, 1);
  private readonly renderer: WebGLRenderer;
  /** seconds to wait for the compiles before drawing anyway */
  private readonly limit: number;
  /** shaders held for the page's life (one extra use each, so freeing their last material never deletes them) */
  private readonly kept = new WeakSet<object>();
  private keptCount = 0;
  /** stand-in copies of every custom shader's material, never drawn and never freed, by shader source */
  private readonly keepers = new Scene();
  private readonly keptSources = new Set<string>();
  private readonly stand = new BufferGeometry();

  constructor(renderer: WebGLRenderer, limitSeconds = 3) {
    this.renderer = renderer;
    this.limit = limitSeconds;
  }

  /** True from begin() until finish(). */
  get active(): boolean { return this.waiting !== null; }

  /**
   * Start compiling every material under `scene` (hidden ones too) as it will be drawn: into the
   * post chain's buffer when `intoTarget`, else to the screen. Returns how many materials.
   */
  begin(scene: Object3D, camera: Camera, intoTarget: boolean, nowS: number): number {
    this.loading = 0;
    this.waiting = this.compile(scene, camera, { shadows: this.renderer.shadowMap.enabled, toneMapping: this.renderer.toneMapping, intoTarget });
    this.keepSources(scene, camera, intoTarget);
    this.since = nowS;
    return this.waiting.size;
  }

  /**
   * Hold the countdown for a file too (after begin()): a sky painting that arrives mid-race is
   * decoded and uploaded on the frame it is first drawn, a stall of its own. The wait is capped
   * like the compiles; whatever `then` the caller chains runs before ready() lets go.
   */
  waitFor(file: Promise<unknown>): void {
    if (!this.waiting) return;
    const w = this.waiting;
    this.loading++;
    const done = () => { if (this.waiting === w) this.loading--; };
    file.then(done, done);
  }

  /** Whether the compiles and files are done (or the wait ran out). Never blocks where the browser compiles in parallel. */
  ready(nowS: number): boolean {
    const w = this.waiting;
    return !w || (settle(w) && this.loading <= 0) || nowS - this.since > this.limit;
  }

  /**
   * Compile, in the background, every shader `scene` needs under other settings (the governor
   * turning shadows and post off or on), so the switch finds them ready instead of stalling on all
   * of them at once. The renderer is left as it was; poll prepared() and switch once it says so.
   */
  prepare(scene: Object3D, camera: Camera, to: ShaderSettings, nowS: number): void {
    this.background = { waiting: this.compile(scene, camera, to), since: nowS };
  }

  /** Whether a prepare()'s shaders are ready (or the wait ran out); true when none is under way. */
  prepared(nowS: number): boolean {
    const b = this.background;
    if (!b) return true;
    if (!settle(b.waiting) && nowS - b.since <= this.limit) return false;
    this.background = null;
    return true;
  }

  /** Every material's program under `to`, compiling (the renderer's own settings put back); the programs kept. */
  private compile(scene: Object3D, camera: Camera, to: ShaderSettings): Set<Program> {
    const r = this.renderer, was = { shadows: r.shadowMap.enabled, tone: r.toneMapping, target: r.getRenderTarget() };
    const out = new Set<Program>();
    r.shadowMap.enabled = to.shadows;
    r.toneMapping = to.toneMapping;
    r.setRenderTarget(to.intoTarget ? this.target : null);
    try {
      for (const m of r.compile(scene, camera)) {
        const p = (r.properties.get(m) as { currentProgram?: Program }).currentProgram;
        if (p) out.add(p);
      }
    } finally {
      r.shadowMap.enabled = was.shadows;
      r.toneMapping = was.tone;
      r.setRenderTarget(was.target);
    }
    this.keep();
    return out;
  }

  /** The one draw of everything (`draw` renders a frame as the game does), then back to normal. */
  finish(scene: Object3D, draw: () => void): void {
    this.waiting = null;
    const undo = exposeAll(scene);
    try { draw(); } finally { undo(); }
    this.keep(); // the shadow pass's own shaders, made by the draw
  }

  /** Hold every shader compiled so far (up to MAX_KEPT). `usedTimes` is three's count of the materials using a program. */
  private keep(): void {
    const programs = (this.renderer.info as unknown as { programs: Program[] | null }).programs ?? [];
    for (const p of programs) {
      if (this.kept.has(p) || this.keptCount >= MAX_KEPT) continue;
      p.usedTimes++;
      this.kept.add(p);
      this.keptCount++;
    }
  }

  /** A never-freed copy of each new custom shader's material, compiled as its original is (instanced or not) so both share one program. */
  private keepSources(scene: Object3D, camera: Camera, intoTarget: boolean): void {
    const fresh = new Scene();
    scene.traverse((o) => {
      const mm = (o as Mesh).material;
      if (!mm) return;
      for (const m of Array.isArray(mm) ? mm : [mm]) {
        const sm = m as ShaderMaterial;
        if (!sm.isShaderMaterial) continue;
        const inst = (o as InstancedMesh).isInstancedMesh;
        const key = `${inst}|${JSON.stringify(sm.defines ?? {})}|${sm.vertexShader}|${sm.fragmentShader}`;
        if (this.keptSources.has(key)) continue;
        this.keptSources.add(key);
        // never drawn, so it holds no textures (a clone copies them, and would keep their images alive)
        const copy = sm.clone();
        for (const u of Object.values(copy.uniforms)) if ((u.value as { isTexture?: boolean } | null)?.isTexture) u.value = null;
        fresh.add(inst ? new InstancedMesh(this.stand, copy, 1) : new Mesh(this.stand, copy));
      }
    });
    if (!fresh.children.length) return;
    // lit and fogged by the race's scene, drawn where it draws, so each copy's shader is its original's
    const r = this.renderer, was = r.getRenderTarget();
    r.setRenderTarget(intoTarget ? this.target : null);
    r.compile(fresh, camera, scene as Scene);
    r.setRenderTarget(was);
    this.keep();
    this.keepers.add(...fresh.children);
  }
}
