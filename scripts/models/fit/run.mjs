// Run a fitting script against viewer.html in ONE silent headless Chrome (muted, no audio anywhere).
//   node tools/run.mjs <script.mjs> [args...]
// The script's default export gets { c, ev, save, R, args, fit }: ev(expr) evaluates in the page,
// save(file, dataUrl) writes an image, fit is R/fit.json (or {}).
import { existsSync, readFileSync, statSync, writeFileSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { openChrome, sleep } from '/Users/Adam/code/kart-racer/scripts/headless/cdp.mjs';

const R = (process.env.RACERS_DIR ?? '/private/tmp/claude-501/-Users-Adam-code-kart-racer/e9b579a3-40b9-4a4d-8b7b-391075b21ef5/scratchpad/racers'); // the work folder (fit.json, out/)
const TOOLS = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const REPO = '/Users/Adam/code/kart-racer';
const [script, ...args] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url === '/' ? join(TOOLS, 'viewer.html') : url.startsWith('/node_modules/') ? join(REPO, url) : url.startsWith('/f/') ? url.slice(2) : null;
  if (!file || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const c = await openChrome({ width: 1600, height: 900 });
try {
  await c.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  for (let i = 0; i < 60 && !(await c.eval('window.ready === true').catch(() => false)); i++) await sleep(250);
  const ev = (expr) => c.eval(expr);
  const save = (file, dataUrl) => { writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64')); console.log('wrote', file); };
  const fitFile = join(R, 'fit.json');
  const fit = existsSync(fitFile) ? JSON.parse(readFileSync(fitFile, 'utf8')) : {};
  const mod = await import(resolve(script));
  await mod.default({ c, ev, save, R, args, fit });
} finally { await c.close(); server.close(); }
