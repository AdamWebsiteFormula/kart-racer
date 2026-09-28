// The rivals' flames in one draw call (CLAUDE.md: under 100 draw calls with 8 karts). On the grid every
// engine revs and every kart's pipes burn at once (flames.ts REV_FIRE), then the go lights the start
// boosts: one mesh a kart put the start at 100 to 103 draw calls (27 Sept 2026). Each kart's ExhaustFlames
// still decides its own fire every frame on its own mesh, which stays on its chassis (so it rides the
// springs and fades with its kart near the lens) but is never drawn; this mesh draws all of them at once:
// their geometries merged, each vertex tagged with its kart's row in a small float texture that holds the
// kart's mesh's world matrix and its uniforms, packed just before the draw, read by the same jet shader
// (jet.ts, JET_BATCHED). The player's own flames keep their own mesh (they are the ones the player reads).
import { BufferAttribute, BufferGeometry, DataTexture, FloatType, Mesh, NearestFilter, RGBAFormat, type Object3D, type ShaderMaterial } from 'three';
import type { ExhaustFlames } from './flames.ts';
import { BATCH_ROW, jetBatchMaterial, type JetUniforms } from './jet.ts';

const T = BATCH_ROW.texels * 4;
/** the jet geometry's attributes (jet.ts jetGeometry) and their sizes */
const ATTRS = [['position', 3], ['aAxis', 3], ['aSide', 3], ['aInfo', 4]] as const;

/** Whether `o` and everything it hangs off are shown (a hidden chassis, the podium's, hides its flames). */
function shown(o: Object3D | null): boolean {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
}

const uniformsOf = (f: ExhaustFlames): JetUniforms => (f.mesh!.material as ShaderMaterial).uniforms as unknown as JetUniforms;

export class FlameBatch {
  /** one mesh, one draw, shown only while one of its karts burns */
  readonly mesh: Mesh;
  private members: ExhaustFlames[] = [];
  private data = new Float32Array(T);
  private tex: DataTexture;
  private readonly mat: ShaderMaterial;

  constructor() {
    this.tex = FlameBatch.texture(this.data, 1);
    this.mat = jetBatchMaterial(this.tex);
    this.mesh = new Mesh(new BufferGeometry(), this.mat);
    this.mesh.name = 'exhaust-flames';
    this.mesh.visible = false;
    this.mesh.frustumCulled = false; // its karts are all over the course: the GPU clips what is off screen
    this.mesh.renderOrder = 2; // as each kart's own (flames.ts)
    this.mesh.onBeforeRender = () => this.pack();
  }

  private static texture(data: Float32Array, rows: number): DataTexture {
    const t = new DataTexture(data, BATCH_ROW.texels, rows, RGBAFormat, FloatType);
    t.magFilter = t.minFilter = NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }

  /** The karts drawn here (those with pipes): their own meshes stop drawing and their geometries merge into this one. Again after a kart's chassis is swapped (its flames are new). */
  set(flames: readonly ExhaustFlames[]): void {
    this.members = flames.filter((f) => f.mesh !== null);
    for (const f of this.members) (f.mesh!.material as ShaderMaterial).visible = false;
    const rows = Math.max(1, this.members.length);
    if (this.tex.image.height !== rows) {
      this.tex.dispose();
      this.data = new Float32Array(rows * T);
      this.tex = FlameBatch.texture(this.data, rows);
      this.mat.uniforms.uKarts.value = this.tex;
    } else this.data.fill(0);
    const old = this.mesh.geometry;
    this.mesh.geometry = FlameBatch.merge(this.members);
    old.dispose();
  }

  /** The members' jet geometries in one, each vertex tagged with its kart's row (`aKart`). */
  private static merge(members: readonly ExhaustFlames[]): BufferGeometry {
    const out = new BufferGeometry();
    if (!members.length) return out;
    let verts = 0, idx = 0;
    for (const f of members) { const g = f.mesh!.geometry; verts += g.getAttribute('position').count; idx += g.index!.count; }
    const arrays = ATTRS.map(([, size]) => new Float32Array(verts * size));
    const kart = new Float32Array(verts), index = new Uint32Array(idx);
    let v = 0, i = 0;
    members.forEach((f, row) => {
      const g = f.mesh!.geometry, n = g.getAttribute('position').count;
      ATTRS.forEach(([name, size], a) => arrays[a].set(g.getAttribute(name).array as Float32Array, v * size));
      kart.fill(row, v, v + n);
      const gi = g.index!.array;
      for (let k = 0; k < gi.length; k++) index[i + k] = gi[k] + v;
      v += n; i += gi.length;
    });
    ATTRS.forEach(([name, size], a) => out.setAttribute(name, new BufferAttribute(arrays[a], size)));
    out.setAttribute('aKart', new BufferAttribute(kart, 1));
    out.setIndex(new BufferAttribute(index, 1));
    return out;
  }

  /**
   * Once a frame, after the karts' flames have updated: shown while any of them burns, on their clock;
   * placed amid the burning ones, so the see-through pass sorts it among its neighbours as theirs were.
   */
  update(): void {
    let n = 0, x = 0, y = 0, z = 0;
    for (let r = 0; r < this.members.length; r++) {
      const m = this.members[r].mesh!;
      if (!m.visible) continue;
      if (n === 0) {
        const u = uniformsOf(this.members[r]);
        this.mat.uniforms.uTime.value = u.uTime.value;
        this.mat.uniforms.uWave.value = u.uWave.value;
      }
      const e = m.matrixWorld.elements;
      x += e[12]; y += e[13]; z += e[14]; n++;
    }
    this.mesh.visible = n > 0;
    if (n > 0) this.mesh.position.set(x / n, y / n, z / n);
  }

  /** Each member's row, just before the draw (its world matrix is this frame's by then). Allocates nothing. */
  private pack(): void {
    const d = this.data, R = BATCH_ROW;
    for (let r = 0; r < this.members.length; r++) {
      const m = this.members[r].mesh!, o = r * T;
      const draw = m.visible && shown(m.parent);
      d[o + R.star * 4 + 3] = draw ? 1 : 0;
      if (!draw) continue;
      const e = m.matrixWorld.elements;
      for (let k = 0; k < 16; k++) d[o + k] = e[k];
      const u = uniformsOf(this.members[r]);
      let p = o + R.size * 4;
      d[p] = u.uLen.value.x; d[p + 1] = u.uLen.value.y; d[p + 2] = u.uWid.value.x; d[p + 3] = u.uWid.value.y;
      p = o + R.fire * 4;
      d[p] = u.uOn.value; d[p + 1] = u.uPop.value; d[p + 2] = u.uFlash.value; d[p + 3] = u.uRing.value;
      p = o + R.wind * 4;
      d[p] = u.uWind.value.x; d[p + 1] = u.uWind.value.y; d[p + 2] = u.uWind.value.z; d[p + 3] = u.uBend.value;
      p = o + R.star * 4;
      d[p] = u.uStar.value; d[p + 1] = u.uStarFlash.value; d[p + 2] = u.uArc.value;
      p = o + R.wheel * 4;
      d[p] = u.uWheel.value.x; d[p + 1] = u.uWheel.value.y; d[p + 2] = u.uWheel.value.z; d[p + 3] = u.uGlow.value;
      rgbw(d, o + R.mouth * 4, u.uMouth.value, u.uGain.value);
      rgbw(d, o + R.fringe * 4, u.uFringe.value, u.uFade.value);
      rgbw(d, o + R.core * 4, u.uCore.value, u.uKart.value);
      rgbw(d, o + R.inner * 4, u.uInner.value, u.uSeed.value);
      rgbw(d, o + R.body * 4, u.uBody.value, u.uStarGain.value);
      rgbw(d, o + R.edge * 4, u.uEdge.value, u.uStarRays.value);
      rgbw(d, o + R.heart * 4, u.uHeart.value, 0);
      rgbw(d, o + R.starCol * 4, u.uStarCol.value, 0);
      rgbw(d, o + R.starHot * 4, u.uStarHot.value, 0);
    }
    this.tex.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.tex.dispose();
  }
}

function rgbw(d: Float32Array, p: number, c: { r: number; g: number; b: number }, w: number): void {
  d[p] = c.r; d[p + 1] = c.g; d[p + 2] = c.b; d[p + 3] = w;
}
