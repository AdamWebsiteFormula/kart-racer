// Performance SOP gate: the shipped JavaScript, gzipped, must stay at or under 1.5 MB.
// Run after a build: npm run check:bundle
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMIT = 1.5 * 1024 * 1024;
const dir = new URL('../dist/assets/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
let total = 0;
for (const f of files) total += gzipSync(readFileSync(new URL(f, dir))).length;
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`bundle: ${files.length} JS files, ${kb(total)} gzipped (limit ${kb(LIMIT)})`);
if (files.length === 0 || total > LIMIT) process.exit(1);
