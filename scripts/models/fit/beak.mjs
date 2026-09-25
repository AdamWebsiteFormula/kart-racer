// Grow Pip's hummingbird beak: a long thin cone added to the driver's own skinned primitive, skinned
// wholly to the Head bone, coloured by the texture spot of the old beak tip (so no new material, no
// new draw call). Meshy keeps shortening thin beaks; this puts the long one back.
//   node beak.mjs <in.glb> <out.glb> [lengthFraction=0.24] [radiusFraction=0.028] [droopDeg=8]
// Fractions are of the model's height. The cone starts inside the old beak and points forward (+Z).
const NPX = '/Users/Adam/.npm/_npx/425967af1abfabd4/node_modules/@gltf-transform';
const { NodeIO } = await import(`${NPX}/core/dist/index.js`);
const { ALL_EXTENSIONS } = await import(`${NPX}/extensions/dist/index.js`);
const [inp, out, lenF = '0.24', radF = '0.028', droop = '8'] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const root = doc.getRoot();
const skinNode = root.listNodes().find((n) => n.getSkin() && n.getMesh());
const skin = skinNode.getSkin();
const headIdx = skin.listJoints().findIndex((j) => j.getName() === 'Head');
if (headIdx < 0) throw new Error('no Head joint');
const prim = skinNode.getMesh().listPrimitives()[0];
const P = prim.getAttribute('POSITION'), n = P.getCount();
let minY = Infinity, maxY = -Infinity;
for (let i = 0; i < n; i++) { const y = P.getElement(i, [])[1]; minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
const H = maxY - minY;
// the old beak tip: the frontmost vertex in the head's band (upper 40%), near the middle
let tip = -1, best = -Infinity;
for (let i = 0; i < n; i++) {
  const [x, y, z] = P.getElement(i, []);
  if (y > minY + 0.6 * H && Math.abs(x) < 0.06 * H && z > best) { best = z; tip = i; }
}
const T = P.getElement(tip, []);
console.log('model height', H.toFixed(3), 'old beak tip', T.map((v) => +v.toFixed(3)));
// cone: base a little behind the old tip (inside the head), apex forward and a little down
const L = Number(lenF) * H, R = Number(radF) * H, seg = 14, a = (Number(droop) * Math.PI) / 180;
const base = [T[0], T[1] + Math.sin(a) * 0.05 * H, T[2] - 0.06 * H];
const dir = [0, -Math.sin(a), Math.cos(a)];
const apex = [base[0] + dir[0] * L, base[1] + dir[1] * L, base[2] + dir[2] * L];
// an orthonormal pair around dir
const u = [1, 0, 0], v = [dir[1] * u[2] - dir[2] * u[1], dir[2] * u[0] - dir[0] * u[2], dir[0] * u[1] - dir[1] * u[0]];
const pos = [], nrm = [], idx = [];
// ring vertices (duplicated per side for flat-ish shading), then the apex per side
for (let s = 0; s < seg; s++) {
  for (const k of [s, s + 1]) {
    const t = (k / seg) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
    const off = [u[0] * c * R + v[0] * sn * R, u[1] * c * R + v[1] * sn * R, u[2] * c * R + v[2] * sn * R];
    pos.push(base[0] + off[0], base[1] + off[1], base[2] + off[2]);
    // cone side normal: outward, tilted forward by the cone's slope
    const slope = R / L, nl = Math.hypot(1, slope);
    nrm.push((off[0] / R + dir[0] * slope) / nl, (off[1] / R + dir[1] * slope) / nl, (off[2] / R + dir[2] * slope) / nl);
  }
  pos.push(...apex);
  const tm = ((s + 0.5) / seg) * Math.PI * 2, slope = R / L, nl = Math.hypot(1, slope);
  const om = [u[0] * Math.cos(tm) + v[0] * Math.sin(tm), u[1] * Math.cos(tm) + v[1] * Math.sin(tm), u[2] * Math.cos(tm) + v[2] * Math.sin(tm)];
  nrm.push((om[0] + dir[0] * slope) / nl, (om[1] + dir[1] * slope) / nl, (om[2] + dir[2] * slope) / nl);
  const b = s * 3; idx.push(b, b + 1, b + 2);
}
const added = pos.length / 3;
// every attribute grows by `added`; values come from the cone, the Head joint, or the old tip vertex
for (const sem of prim.listSemantics()) {
  const acc = prim.getAttribute(sem), size = acc.getElementSize(), old = acc.getArray();
  const arr = new old.constructor(old.length + added * size); arr.set(old);
  const tipVal = acc.getElement(tip, []);
  for (let i = 0; i < added; i++) {
    let val;
    if (sem === 'POSITION') val = pos.slice(i * 3, i * 3 + 3);
    else if (sem === 'NORMAL') val = nrm.slice(i * 3, i * 3 + 3);
    else if (sem.startsWith('JOINTS_')) val = [headIdx, 0, 0, 0];
    else if (sem.startsWith('WEIGHTS_')) val = [1, 0, 0, 0];
    else val = tipVal; // UVs and anything else: the old beak tip's, so the colour matches
    for (let c = 0; c < size; c++) arr[old.length + i * size + c] = val[c];
  }
  acc.setArray(arr);
}
const I = prim.getIndices(), oi = I.getArray();
const ni = new Uint32Array(oi.length + idx.length); ni.set(oi); for (let k = 0; k < idx.length; k++) ni[oi.length + k] = n + idx[k];
I.setArray(ni);
await io.write(out, doc);
console.log('wrote', out, 'beak', (L).toFixed(3), 'long,', added, 'verts on joint', headIdx);
