// A silent headless Chrome for checks (CLAUDE.md "Browser checks: silent, always"): --mute-audio,
// its own throwaway profile, and every game URL gets ?mute, so the game never makes an AudioContext.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** `url` with ?mute added (kept if already there). */
export function muted(url) {
  const u = new URL(url);
  if (!u.searchParams.has('mute')) u.searchParams.set('mute', '');
  return u.toString().replace('mute=', 'mute');
}

/** Opens headless Chrome at `width`×`height`; `uncapped` turns vsync and the frame cap off. */
export async function openChrome({ width = 1600, height = 900, dpr = 1, uncapped = false } = {}) {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = mkdtempSync(join(tmpdir(), 'rascal-chrome-'));
  const args = ['--headless=new', '--mute-audio', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--use-angle=metal', '--ignore-gpu-blocklist', `--window-size=${width},${height}`, '--no-first-run', '--no-default-browser-check'];
  if (uncapped) args.push('--disable-gpu-vsync', '--disable-frame-rate-limit');
  const proc = spawn(CHROME, [...args, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 75 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
  }
  if (!target) { proc.kill(); throw new Error('headless Chrome did not start'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (!d.id || !pending.has(d.id)) return;
    const p = pending.get(d.id);
    pending.delete(d.id);
    if (d.error) p.rej(new Error(d.error.message)); else p.res(d.result);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  return {
    send,
    /** Evaluates `expr` in the page (awaits a promise) and returns its JSON value. */
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async goto(url, settleMs = 7000) { await send('Page.navigate', { url: muted(url) }); await sleep(settleMs); },
    async key(key, code, vk) { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: vk }); },
    async jpeg(quality = 70) { return Buffer.from((await send('Page.captureScreenshot', { format: 'jpeg', quality })).data, 'base64'); },
    /** Closes Chrome, waits for it to exit, then removes its throwaway profile. */
    async close() {
      try { ws.close(); } catch { /* gone */ }
      const exited = new Promise((r) => (proc.exitCode !== null ? r() : proc.once('exit', r)));
      proc.kill();
      await Promise.race([exited, sleep(3000)]);
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    },
  };
}
