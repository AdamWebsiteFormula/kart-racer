// Bake a turn about Y into a static GLB's vertices (every node's world matrix first, then the turn),
// so all wheels share one convention: axle along X, rim face +X.
//   node turn.mjs <in.glb> <out.glb> <yawDeg>
const NPX = '/Users/Adam/.npm/_npx/425967af1abfabd4/node_modules/@gltf-transform';
const { NodeIO } = await import(`${NPX}/core/dist/index.js`);
const { ALL_EXTENSIONS } = await import(`${NPX}/extensions/dist/index.js`);
const { transformMesh } = await import(`${NPX}/functions/dist/index.js`);
const [inp, out, deg] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const a = (Number(deg) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
// column-major 4x4: rotation about Y
const R = [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
const mul = (A, B) => { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += A[k * 4 + i] * B[j * 4 + k]; return o; };
const done = new Set();
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh || done.has(mesh)) continue;
  console.log('node', node.getName(), 'T', node.getTranslation(), 'R', node.getRotation(), 'S', node.getScale());
  transformMesh(mesh, mul(R, node.getWorldMatrix()));
  done.add(mesh);
}
for (const node of doc.getRoot().listNodes()) { node.setTranslation([0, 0, 0]); node.setRotation([0, 0, 0, 1]); node.setScale([1, 1, 1]); }
await io.write(out, doc);
console.log('wrote', out);
