#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Zips `dist-itch/` (made by `vite build --mode itch`) into an itch.io-ready HTML5 upload:
 * index.html sits at the root of the zip, as itch requires. No dependencies: uses Node's zlib
 * (zlib.crc32 needs Node 22.2+ or 20.15+).
 *
 *   npm run build:itch   ->  release/cytoscape-immune-defense-itch-v<version>.zip
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { deflateRawSync, crc32 } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'dist-itch');
const OUT_DIR = join(ROOT, 'release');
const { version } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const OUT = join(OUT_DIR, `cytoscape-immune-defense-itch-v${version}.zip`);

// itch.io HTML5 limits: at most 1,000 files, 200 MB per file, 500 MB unzipped in total
const MAX_FILES = 1000;
const MAX_TOTAL = 500 * 1024 * 1024;

if (!existsSync(join(SRC, 'index.html'))) {
  console.error('dist-itch/index.html not found. Run `vite build --mode itch` first.');
  process.exit(1);
}

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(SRC).sort();

// Guard against an absolute path sneaking back into the HTML: it would 404 on itch's CDN
const html = readFileSync(join(SRC, 'index.html'), 'utf8');
const absolute = html.match(/(?:src|href)="\/(?!\/)[^"]*"/g);
if (absolute) {
  console.error('index.html still has absolute paths, which break on itch.io:\n  ' + absolute.join('\n  '));
  process.exit(1);
}
if (existsSync(join(SRC, 'sw.js'))) {
  console.error('dist-itch contains a service worker; the itch build should not register one.');
  process.exit(1);
}

let total = 0;
const locals = [];
const centrals = [];
let offset = 0;
// DOS date/time for every entry (the build time)
const now = new Date();
const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

for (const file of files) {
  const name = Buffer.from(relative(SRC, file).split(sep).join('/'), 'utf8');
  const data = readFileSync(file);
  total += data.length;
  const deflated = deflateRawSync(data, { level: 9 });
  const stored = deflated.length >= data.length;
  const body = stored ? data : deflated;
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);           // version needed
  local.writeUInt16LE(0x0800, 6);       // UTF-8 names
  local.writeUInt16LE(stored ? 0 : 8, 8);
  local.writeUInt16LE(dosTime, 10);
  local.writeUInt16LE(dosDate, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);
  locals.push(local, name, body);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);         // version made by
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(stored ? 0 : 8, 10);
  central.writeUInt16LE(dosTime, 12);
  central.writeUInt16LE(dosDate, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, name);

  offset += local.length + name.length + body.length;
}

if (files.length > MAX_FILES) {
  console.error(`${files.length} files: itch.io allows at most ${MAX_FILES}.`);
  process.exit(1);
}
if (total > MAX_TOTAL) {
  console.error(`${(total / 1048576).toFixed(1)} MB unzipped: itch.io allows at most 500 MB.`);
  process.exit(1);
}

const centralSize = centrals.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

mkdirSync(OUT_DIR, { recursive: true });
const zip = Buffer.concat([...locals, ...centrals, end]);
writeFileSync(OUT, zip);
console.log(`itch.io upload ready: ${relative(ROOT, OUT)}`);
console.log(`  ${files.length} files, ${(total / 1024).toFixed(0)} KB unzipped, ${(zip.length / 1024).toFixed(0)} KB zipped`);
