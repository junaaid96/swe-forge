#!/usr/bin/env node
/**
 * Per-page OG images (5.1): /og/<slug>.png with title, emoji, group and
 * brand colors. Hand-authored SVG rasterized with resvg (no browser needed,
 * works on Vercel). Emoji come from Twemoji PNGs, cached under
 * node_modules/.cache; if a download fails the image renders without it.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { ROOT, buildRoutes, esc } from './seo-lib.mjs';
import { resolveFonts } from './fonts.mjs';

const OUT = path.join(ROOT, 'dist', 'og');
const CACHE = path.join(ROOT, 'node_modules', '.cache', 'forgeline-og');
const IMG_CACHE = path.join(CACHE, 'img');

function twemojiCode(emoji) {
  return [...emoji]
    .map((c) => c.codePointAt(0).toString(16))
    .filter((h) => h !== 'fe0f')
    .join('-');
}

async function emojiPng(emoji) {
  const code = twemojiCode(emoji);
  if (!code) return null;
  const cached = path.join(CACHE, `${code}.png`);
  if (fs.existsSync(cached)) return fs.readFileSync(cached).toString('base64');
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${code}.png`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(cached, buf);
    return buf.toString('base64');
  } catch {
    return null;
  }
}

function wrap(title, maxChars = 26, maxLines = 3) {
  const words = title.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((`${line} ${w}`.trim().length > maxChars && line) || line.length >= maxChars) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = `${line} ${w}`.trim();
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length + 1) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\.*$/, '')}…`;
  }
  return lines;
}

function svgFor(r, emojiB64, family) {
  const lines = wrap(r.ogTitle ?? r.title.replace(/ · Forgeline$/, ''));
  const fontSize = lines.some((l) => l.length > 22) ? 56 : 68;
  const titleY = Math.round(340 - ((lines.length - 1) * (fontSize + 12)) / 2);
  const ff = `font-family="${family}, sans-serif"`;
  const title = lines.map((l, i) => `<text x="90" y="${titleY + i * (fontSize + 12)}" ${ff} font-size="${fontSize}" font-weight="700" fill="#f8fafc">${esc(l)}</text>`).join('\n    ');
  const small = (x, y, size, weight, fill, text) => `<text x="${x}" y="${y}" ${ff} font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(text)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#134e4a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1080" cy="80" r="220" fill="#0d9488" opacity="0.18"/>
  <circle cx="60" cy="600" r="180" fill="#0d9488" opacity="0.12"/>
  <rect x="0" y="0" width="14" height="630" fill="#0d9488"/>
  ${emojiB64 ? `<image x="90" y="96" width="110" height="110" href="data:image/png;base64,${emojiB64}"/>` : ''}
  ${small(90, 70, 26, 600, '#5eead4', 'FORGELINE')}
  ${title}
  <rect x="90" y="500" width="${Math.min(640, 48 + `${r.group} · ${r.kind}`.length * 15)}" height="44" rx="22" fill="#0d9488" opacity="0.9"/>
  ${small(112, 530, 24, 600, '#ffffff', `${r.group} · ${r.kind}`)}
  ${small(90, 586, 22, 400, '#94a3b8', 'swe-forge.vercel.app')}
</svg>`;
}

const t0 = Date.now();
const routes = buildRoutes();
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(IMG_CACHE, { recursive: true });
const { family, bufs } = await resolveFonts();
// Unique emoji first, small concurrency.
const unique = [...new Set(routes.map((r) => r.emoji))];
const b64 = new Map();
for (let i = 0; i < unique.length; i += 8) {
  const batch = await Promise.all(unique.slice(i, i + 8).map(async (e) => [e, await emojiPng(e)]));
  for (const [e, b] of batch) b64.set(e, b);
}
const jobs = [];
let cached = 0;
for (const r of routes) {
  const svg = svgFor(r, b64.get(r.emoji) ?? null, family);
  const hash = crypto.createHash('sha1').update(svg).digest('hex').slice(0, 12);
  const dest = path.join(OUT, `${r.file}.png`);
  const hit = path.join(IMG_CACHE, `${hash}.png`);
  if (fs.existsSync(hit)) {
    fs.copyFileSync(hit, dest);
    cached += 1;
  } else {
    jobs.push({ svg, dest, hash });
  }
}
if (jobs.length) {
  const workers = Math.min(Math.max(2, os.cpus().length - 1), 8, jobs.length);
  const chunks = Array.from({ length: workers }, (_, i) => jobs.filter((_, j) => j % workers === i)).filter((c) => c.length);
  const HERE = path.dirname(fileURLToPath(import.meta.url));
  await Promise.all(
    chunks.map(
      (chunk) =>
        new Promise((resolve, reject) => {
          const w = new Worker(path.join(HERE, 'og-worker.mjs'), { workerData: { jobs: chunk, bufs, imgCache: IMG_CACHE } });
          w.on('message', (m) => (m.ok ? resolve(m.n) : reject(new Error(`og worker: ${m.error}`))));
          w.on('error', reject);
          w.on('exit', (code) => (code === 0 ? resolve(0) : reject(new Error(`og worker exited ${code}`))));
        }),
    ),
  );
}
console.log(`[og] ${routes.length} images (${cached} cached) in ${((Date.now() - t0) / 1000).toFixed(1)}s using ${family}.`);
