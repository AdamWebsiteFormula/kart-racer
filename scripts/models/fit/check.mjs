// Model check: serves viewer.html (three.js from the repo's node_modules), loads a GLB in silent headless
// Chrome, prints its skeleton and writes a four-view contact sheet.
//   node check.mjs <file.glb> <out.jpg> [--pose=<js run against window.bones before the shots>] [--zoom=1]
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { openChrome, sleep } from '/Users/Adam/code/kart-racer/scripts/headless/cdp.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? dflt;
const [glb, out] = args.filter((a) => !a.startsWith('--'));
const HERE = new URL('.', import.meta.url).pathname.replace(/\/$/, ''); // viewer.html sits beside this file
const REPO = new URL('../../..', import.meta.url).pathname.replace(/\/$/, '');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url === '/' ? join(HERE, 'viewer.html') : url === '/model.glb' ? resolve(glb) : url.startsWith('/node_modules/') ? join(REPO, url) : url.startsWith('/f/') ? url.slice(2) : null;
  if (!file || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const c = await openChrome({ width: 1600, height: 900 });
try {
  await c.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  for (let i = 0; i < 40 && !(await c.eval('window.ready === true').catch(() => false)); i++) await sleep(250);
  let info;
  if (flag('assemble', '')) {
    // --assemble='{"body":"/f/<path>", ...}': any /f/<abs path> is served from disk
    info = await c.eval(`window.assemble(${flag('assemble', '')})`);
  } else info = await c.eval(`window.load('/model.glb')`);
  console.log(JSON.stringify(info));
  if (args.includes('--pieces')) console.log('pieces:', JSON.stringify(await c.eval('window.pieces(40)')));
  if (args.includes('--split')) {
    console.log('split:', JSON.stringify(await c.eval(`window.splitWheels(${Number(flag('margin', '1.04'))})`)));
    if (flag('save', '')) { const b64 = await c.eval('window.exportGlb()'); writeFileSync(flag('save', ''), Buffer.from(b64, 'base64')); console.log('saved', flag('save', '')); }
    if (args.includes('--tint')) await c.eval('window.tintWheels()');
    if (flag('spin', '')) await c.eval(`window.spinWheels(${Number(flag('spin', '0'))})`);
  }
  if (flag('pose', '')) console.log('pose:', JSON.stringify(await c.eval(`(() => { const b = window.bones; ${flag('pose', '')}; window.root.updateMatrixWorld(true); return 'ok'; })()`)));
  if (args.includes('--probe')) console.log('probe:', JSON.stringify(await c.eval(`(() => { const v = new window.THREE_V3(), o = {};
    for (const n of ['Hips','Spine','neck','Head','head_end','LeftArm','LeftForeArm','LeftHand','RightArm','RightForeArm','RightHand','LeftUpLeg','LeftLeg','LeftFoot','RightFoot']) { const b = window.bones[n]; if (b) { b.getWorldPosition(v); o[n] = v.toArray().map((x) => +x.toFixed(3)); } }
    return o; })()`)));
  if (flag('ortho', '')) {
    // --ortho=x|z: one flat, gridded view (metres) instead of the four shots
    const im = await c.eval(`window.ortho('${flag('ortho', 'x')}', 0.15, ${flag('win', 'null')})`);
    writeFileSync(out, Buffer.from(im.split(',')[1], 'base64'));
    console.log('wrote', out);
    await c.close(); server.close(); process.exit(0);
  }
  const shots = await c.eval(args.includes('--head') ? 'window.shotsHead()' : `window.shots(${Number(flag('zoom', '1'))})`);
  // four views side by side, via a canvas in the page
  const sheet = await c.eval(`(async () => {
    const ims = await Promise.all(${JSON.stringify(shots)}.map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; })));
    const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 450; const g = cv.getContext('2d');
    ims.forEach((im, k) => g.drawImage(im, k * 400, 0, 400, 450 * 400 / 450 * 450 / 400));
    return cv.toDataURL('image/jpeg', 0.88);
  })()`);
  writeFileSync(out, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log('wrote', out);
} finally { await c.close(); server.close(); }
