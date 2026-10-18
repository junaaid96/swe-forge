#!/usr/bin/env node
/** PWA icons: rasterize public/icons/icon.svg to dist/icons/*.png. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { resolveFonts } from './fonts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'icons');
const svg = fs.readFileSync(path.join(ROOT, 'public', 'icons', 'icon.svg'), 'utf8');
const { bufs } = await resolveFonts();
fs.mkdirSync(OUT, { recursive: true });
for (const size of [180, 192, 512]) {
  const png = new Resvg(svg, { font: { loadSystemFonts: false, fontBuffers: bufs }, fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(OUT, `icon-${size}.png`), png);
}
console.log('[icons] 180/192/512px written to dist/icons.');
