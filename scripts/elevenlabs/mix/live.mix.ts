// The live engine (src/audio/engineCore.ts) rendered offline from the very drive the loops were rendered from (the
// `-ctl.json` engine.mix.ts logs: every frame's rpm, level, class pitch and boost rev, brightness, limiter, drive),
// through what the game puts after it (the engine's level and its rpm-tracking low-pass, samples.ts LoopEngine and
// engine.ts engineCutoff). Nothing is played.
//   LIVE_GRAINS=<dir with engine-grains.wav and .json> TAG=current ./node_modules/.bin/vitest run --config scripts/elevenlabs/mix/vitest.config.mts live
// writes <MIX_OUT>/<TAG>-live-engine.wav
import { it } from 'vitest';
import fs from 'node:fs';
import { OUT } from './paths.ts';
import { decodeWav, writeWav } from './webaudio.ts';
import { GrainEngine } from '../../../src/audio/engineCore.ts';
import { splitGrains, type GrainMap } from '../../../src/audio/liveEngine.ts';
import { engineCutoff } from '../../../src/audio/engine.ts';

const TAG = process.env.TAG ?? 'current';
const DIR = process.env.LIVE_GRAINS ?? `${process.env.HOME}/.cache/rascal-sfx/candidates/engine/live`;
const FS = 44100;
/** a smaller, buzzier kart: every size and rpm scaled (LIVE_SIZE 1.25, LIVE_RPM 1.15), for a second demo */
const SIZE = Number(process.env.LIVE_SIZE ?? 1), RPMX = Number(process.env.LIVE_RPM ?? 1), NAME = process.env.LIVE_NAME ?? 'live';

it(`live engine ${TAG}`, () => {
  const ctl = JSON.parse(fs.readFileSync(`${OUT}/${TAG}-ctl.json`, 'utf8')) as { rows: number[][] };
  const map = JSON.parse(fs.readFileSync(`${DIR}/engine-grains.json`, 'utf8')) as GrainMap;
  const table = decodeWav(fs.readFileSync(`${DIR}/engine-grains.wav`), FS);
  const pools = splitGrains(table.getChannelData(0), FS, map);
  const engine = new GrainEngine(pools, FS);
  const rows = ctl.rows, end = rows[rows.length - 1][0] + 0.05, N = Math.ceil(end * FS);
  const out = new Float32Array(N), blk = new Float32Array(128);
  // the game's low-pass after the engine (a biquad, Q 0.7), its cutoff and the level eased toward each frame's as setTargetAtTime does
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, level = 0, cut = 2500, r = 0, load = 1, rpmS = -1, size = SIZE;
  for (let a = 0; a < N; a += 128) {
    const t = a / FS;
    while (r + 1 < rows.length && rows[r + 1][0] <= t) r++;
    const [, rpm, lv, , pitch, bright, limit, drive] = rows[r];
    // the params eased as liveEngine.ts sets them (setTargetAtTime: rpm 0.03 s, load 0.05 s, size 0.1 s)
    const e = (tc: number) => 1 - Math.exp(-128 / (tc * FS));
    rpmS = rpmS < 0 ? rpm * pitch * RPMX : rpmS + (rpm * pitch * RPMX - rpmS) * e(0.03);
    load += ((drive ?? 1) - load) * e(0.05);
    size += (Math.sqrt(pitch) * SIZE - size) * e(0.1);
    engine.render(blk, 0, 128, { rpm: rpmS, load, limit, size });
    const k = 1 - Math.exp(-128 / (0.05 * FS));
    level += (lv - level) * k;
    cut += (engineCutoff(rpm) * bright - cut) * k;
    const w = (2 * Math.PI * Math.min(cut, 0.45 * FS)) / FS, al = Math.sin(w) / (2 * 0.7), c = Math.cos(w), a0 = 1 + al;
    const b0 = (1 - c) / 2 / a0, b1 = (1 - c) / a0, b2 = b0, a1 = (-2 * c) / a0, a2 = (1 - al) / a0;
    for (let i = 0; i < 128 && a + i < N; i++) {
      const x = blk[i] * level, y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      out[a + i] = y;
    }
  }
  writeWav(`${OUT}/${TAG}-${NAME}-engine.wav`, [out], FS, fs);
}, 600_000);
