// Take in one finished Higgsfield 3D job: download it, render the check sheets, and for a driver test
// the rig (a mirror test of the arm and leg bones, which caught Pip's arm chain on the satchel strap).
//   node tools/intake.mjs <racer> <driver|body|wheel> <glb url>
// Writes racers/<racer>/<part>.glb (an older one is kept as <part>-old-N.glb) and the sheets beside it.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const HERE = (process.env.RACERS_DIR ?? '/private/tmp/claude-501/-Users-Adam-code-kart-racer/e9b579a3-40b9-4a4d-8b7b-391075b21ef5/scratchpad/racers'); // the work folder: <id>/<part>.glb and its sheets
const TOOLS = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const [id, part, url] = process.argv.slice(2);
const dir = join(HERE, id); mkdirSync(dir, { recursive: true });
const glb = join(dir, `${part}.glb`);
if (existsSync(glb)) { let n = 1; while (existsSync(join(dir, `${part}-old-${n}.glb`))) n++; renameSync(glb, join(dir, `${part}-old-${n}.glb`)); }
execFileSync('curl', ['-s', '-o', glb, url]);
const check = (...a) => execFileSync('node', [join(TOOLS, 'check.mjs'), ...a], { encoding: 'utf8', maxBuffer: 1 << 26 });
const firstJson = (s) => JSON.parse(s.split('\n').find((l) => l.startsWith('{')));

const info = firstJson(check(glb, join(dir, `${part}-views.jpg`)));
const tris = [...info.skins, ...info.meshes].reduce((n, m) => n + m.tris, 0);
console.log(`${id} ${part}: size ${info.size.join(' x ')}, ${tris} tris, ${info.bones.length} bones, tex ${JSON.stringify(info.tex)}`);

if (part === 'driver') {
  // the rest skeleton at 1.2 m, drawn over the see-through model, and the joint positions
  const A = JSON.stringify({ driver: `/f${glb}`, height: 1.2, seat: [0, 0, 0] });
  const POSE = "window.root.traverse((o)=>{ if (o.isSkinnedMesh) { o.material.transparent = true; o.material.opacity = 0.4; o.material.depthWrite = false; } }); const h = new window.SK(window.root); h.material.depthTest = false; window.root.parent.add(h)";
  const out = check('x', join(dir, 'rig-front.jpg'), `--assemble=${A}`, '--ortho=z', '--probe', `--pose=${POSE}`);
  const p = JSON.parse(out.split('\n').find((l) => l.startsWith('probe:')).slice(7));
  // mirror test: each left joint should sit where its right twin does, with x flipped (a few cm slack)
  const pairs = [['LeftArm', 'RightArm'], ['LeftForeArm', 'RightForeArm'], ['LeftHand', 'RightHand'], ['LeftUpLeg', null], ['LeftFoot', 'RightFoot']];
  const bad = [];
  for (const [l, r] of pairs) {
    if (!r || !p[l] || !p[r]) continue;
    const d = Math.hypot(p[l][0] + p[r][0], p[l][1] - p[r][1], p[l][2] - p[r][2]);
    if (d > 0.06) bad.push(`${l}/${r} off by ${d.toFixed(2)} m`);
  }
  // the arm chain must run outward and down from the shoulder, like arms in an A-pose
  for (const s of ['Left', 'Right']) {
    const sh = p[`${s}Arm`], el = p[`${s}ForeArm`], ha = p[`${s}Hand`];
    if (!sh || !el || !ha) { bad.push(`${s} arm bones missing`); continue; }
    if (Math.abs(el[0]) < Math.abs(sh[0]) + 0.05 || Math.abs(ha[0]) < Math.abs(el[0]) + 0.03) bad.push(`${s} arm does not reach outward (shoulder x ${sh[0]}, elbow x ${el[0]}, hand x ${ha[0]})`);
    if (ha[1] > sh[1]) bad.push(`${s} hand above the shoulder`);
  }
  console.log(`rig: ${bad.length ? 'FAIL: ' + bad.join('; ') : 'ok (mirror test and A-pose arms pass)'}`);
  console.log('joints:', JSON.stringify(p));
}

if (part === 'wheel') {
  // every wheel ends up axle-on-X; a Tripo wheel usually comes axle-on-Z, so make both turns to pick the rim face
  const thin = info.size.indexOf(Math.min(...info.size));
  console.log(`wheel axle on ${'XYZ'[thin]}`);
  if (thin === 2) for (const deg of [90, -90]) {
    const f = join(dir, `wheel-x${deg > 0 ? 'p' : 'm'}.glb`);
    execFileSync('node', [join(TOOLS, 'turn.mjs'), glb, f, String(deg)], { encoding: 'utf8' });
    check(f, join(dir, `wheel-x${deg > 0 ? 'p' : 'm'}.jpg`));
    console.log(`turned ${deg}: ${f} (its third view looks from +X: that face goes outward)`);
  }
}

if (part === 'body') {
  const A = JSON.stringify({ body: `/f${glb}`, yaw: info.size[0] > info.size[2] ? -1.5708 : 0, length: 2.1, bodyY: 0 });
  check('x', join(dir, 'body-side.jpg'), `--assemble=${A}`, '--ortho=x');
  check('x', join(dir, 'body-front.jpg'), `--assemble=${A}`, '--ortho=z');
  console.log(`body long axis ${info.size[0] > info.size[2] ? 'X (yaw -1.5708)' : 'Z (yaw 0)'}; sheets body-side.jpg, body-front.jpg`);
}
