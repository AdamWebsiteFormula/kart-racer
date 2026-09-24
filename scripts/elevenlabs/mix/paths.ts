// Where the offline mix tools read and write. Nothing here plays a sound.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';

export const ROOT = new URL('../../../', import.meta.url).pathname;
/** renders, stems, reports and the decoded recordings (MIX_OUT, else a temp folder) */
export const OUT = process.env.MIX_OUT ?? `${os.tmpdir()}/rascal-mix`;
export const WAV = `${OUT}/wav`;

/**
 * The decoded WAV (float32) of a recording under public/audio, made with macOS `afconvert` when
 * missing or older than the MP3 (Node has no MP3 decoder; the browser's decodeAudioData is what
 * this stands in for).
 */
export function wavFor(url: string): string | null {
  const mp3 = `${ROOT}public/${url}`;
  if (!fs.existsSync(mp3)) return null;
  const wav = `${WAV}/${url.replace('audio/', '').replace('/', '_').replace('.mp3', '.wav')}`;
  if (!fs.existsSync(wav) || fs.statSync(wav).mtimeMs < fs.statSync(mp3).mtimeMs) {
    fs.mkdirSync(WAV, { recursive: true });
    execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEF32', mp3, wav]);
  }
  return wav;
}
