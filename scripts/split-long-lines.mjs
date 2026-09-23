// Post-build step for the Edge Function bundle: split any "..." string literal longer than
// MAX characters into "..." + "..." pieces across lines, so no line of core.js is huge.
// The code means exactly the same; it just becomes readable and diffable.
import { readFileSync, writeFileSync } from 'node:fs';

const MAX = 1200;
const file = process.argv[2];
const src = readFileSync(file, 'utf8');
const out = src.split('\n').map((line) => {
  if (line.length <= MAX) return line;
  // walk the line; inside a double-quoted literal, cut every MAX chars at a point not after a backslash
  let res = '', i = 0, inStr = false, run = 0;
  while (i < line.length) {
    const c = line[i];
    if (!inStr) {
      res += c;
      if (c === '"') { inStr = true; run = 0; }
      i++;
      continue;
    }
    if (c === '\\') { res += c + line[i + 1]; i += 2; run += 2; continue; }
    if (c === '"') { res += c; inStr = false; i++; continue; }
    if (run >= MAX) { res += '" +\n"'; run = 0; }
    res += c; i++; run++;
  }
  return res;
}).join('\n');
writeFileSync(file, out);
const longest = Math.max(...out.split('\n').map((l) => l.length));
console.log(`split-long-lines: ${file} longest line ${longest}`);
