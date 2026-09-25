// Re-skin a tail that the auto-rig hung on a thigh bone (Otto's: on LeftUpLeg, so sitting swung it forward
// and down through the hull). The tail's vertices (main bone the thigh, farther than d0 from the thigh's
// bone) move to the Hips bone, blended over d0..d1, and the tail is turned up about the X axis round its
// root by `deg` (blended along the tail) so a seated driver's tail lies back inside the kart, not below it.
//   node tools/tailfix.mjs <in.glb> <out.glb> <thigh bone> <deg> [d0 d1 (fractions of the model's height)]
const NPX = '/Users/Adam/.npm/_npx/425967af1abfabd4/node_modules/@gltf-transform';
const { NodeIO } = await import(`${NPX}/core/dist/index.js`);
const { ALL_EXTENSIONS } = await import(`${NPX}/extensions/dist/index.js`);
const [inp, out, thighName, degArg, d0Arg, d1Arg] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const root = doc.getRoot();
const skin = root.listSkins()[0];
const joints = skin.listJoints().map((j) => j.getName());
const ibm = skin.getInverseBindMatrices();
const inv4 = (m) => { // inverse of a column-major 4x4 affine matrix
  const [a, b, c, , d, e, f, , g, h, i, , tx, ty, tz] = m;
  const det = a * (e * i - f * h) - d * (b * i - c * h) + g * (b * f - c * e);
  const r = [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det, 0, (f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det, 0, (d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det, 0, 0, 0, 0, 1];
  r[12] = -(r[0] * tx + r[4] * ty + r[8] * tz); r[13] = -(r[1] * tx + r[5] * ty + r[9] * tz); r[14] = -(r[2] * tx + r[6] * ty + r[10] * tz);
  return r;
};
const jointPos = (name) => { const k = joints.indexOf(name); const m = []; ibm.getElement(k, m); const w = inv4(m); return [w[12], w[13], w[14]]; };
const hipsIdx = joints.indexOf('Hips'), thighIdx = joints.indexOf(thighName);
const A = jointPos(thighName), B = jointPos(thighName.replace('UpLeg', 'Leg'));
const prim = root.listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION'), N = prim.getAttribute('NORMAL'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
let ymin = Infinity, ymax = -Infinity; const p = [], n = [], j = [], w = [];
for (let i = 0; i < P.getCount(); i++) { P.getElement(i, p); ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
const H = ymax - ymin, d0 = Number(d0Arg ?? 0.088) * H, d1 = Number(d1Arg ?? 0.105) * H, bend = 0.2 * H;
const ab = A.map((x, k) => B[k] - x), L2 = ab.reduce((s, x) => s + x * x, 0);
const segDist = (q) => { const t = Math.max(0, Math.min(1, ((q[0] - A[0]) * ab[0] + (q[1] - A[1]) * ab[1] + (q[2] - A[2]) * ab[2]) / L2)); return Math.hypot(q[0] - A[0] - t * ab[0], q[1] - A[1] - t * ab[1], q[2] - A[2] - t * ab[2]); };
// the tail: main bone the thigh, behind the thigh's front, beyond d0 of its bone
const tail = [];
for (let i = 0; i < P.getCount(); i++) {
  J.getElement(i, j); W.getElement(i, w);
  let mk = 0; for (let k = 1; k < 4; k++) if (w[k] > w[mk]) mk = k;
  if (j[mk] !== thighIdx) continue;
  P.getElement(i, p);
  if (p[2] > A[2]) continue;
  const d = segDist(p); if (d <= d0) continue;
  tail.push([i, d]);
}
// the root: where the tail leaves the body (the tail's vertices nearest the thigh), the turn's pivot
const near = tail.filter(([, d]) => d < d0 + 0.3 * (d1 - d0) + 0.02 * H);
const R0 = [0, 0, 0]; for (const [i] of near) { P.getElement(i, p); for (let k = 0; k < 3; k++) R0[k] += p[k] / near.length; }
const th = (Number(degArg) * Math.PI) / 180;
let moved = 0;
for (const [i, d] of tail) {
  const f = Math.min(1, (d - d0) / (d1 - d0)); // re-skin blend
  const g = Math.min(1, (d - d0) / bend); // turn blend along the tail
  J.getElement(i, j); W.getElement(i, w);
  for (let k = 0; k < 4; k++) w[k] *= 1 - f;
  let hk = j.indexOf(hipsIdx);
  if (hk < 0) { hk = 0; for (let k = 1; k < 4; k++) if (w[k] < w[hk]) hk = k; w[hk] = 0; j[hk] = hipsIdx; }
  w[hk] += f;
  const s = w.reduce((x, y) => x + y, 0); for (let k = 0; k < 4; k++) w[k] /= s;
  J.setElement(i, j); W.setElement(i, w);
  // turn about the X axis through R0 by th·g
  const a = th * g, c = Math.cos(a), sn = Math.sin(a);
  P.getElement(i, p); const y = p[1] - R0[1], z = p[2] - R0[2];
  P.setElement(i, [p[0], R0[1] + y * c - z * sn, R0[2] + y * sn + z * c]);
  N.getElement(i, n); N.setElement(i, [n[0], n[1] * c - n[2] * sn, n[1] * sn + n[2] * c]);
  moved++;
}
await io.write(out, doc);
console.log(JSON.stringify({ H: +H.toFixed(2), thigh: A.map((x) => +x.toFixed(2)), root: R0.map((x) => +x.toFixed(2)), tail: tail.length, moved, deg: Number(degArg) }));
