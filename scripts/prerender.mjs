#!/usr/bin/env node
/**
 * Per-route HTML shells (5.1). For each prerendered route this writes
 * dist/<route>/index.html: identical app shell, but with a route-specific
 * <head> (title, description, canonical, OG/Twitter tags, Article JSON-LD).
 *
 * Deliberately head-only: the app client-renders as today, so there is no
 * hydration and no flicker. Full SSR bodies would need hydrateRoot plus
 * deterministic server data — a framework-level migration, explicitly out
 * of scope. Crawlers that run JS (Google) see everything; social scrapers
 * get rich previews via the OG tags + /og images.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, SITE, buildRoutes, esc } from './seo-lib.mjs';

const DIST = path.join(ROOT, 'dist');
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

function headFor(r) {
  const canonical = `${SITE}${r.path}`;
  const image = `${SITE}/og/${r.file}.png`;
  const desc = r.desc.slice(0, 300);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: r.title.replace(/ · Forgeline$/, ''),
    description: desc,
    url: canonical,
    image,
    author: { '@type': 'Organization', name: 'Forgeline', url: SITE },
    publisher: { '@type': 'Organization', name: 'Forgeline', url: SITE },
  };
  return [
    `<title>${esc(r.title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(r.title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(r.title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join('\n    ');
}

// Replace the template's generic head block: everything from <title> through
// the twitter card tag. Anchored on exact template strings — fails loudly if
// index.html changes shape.
const START = '<title>';
const END = '<meta name="twitter:card" content="summary" />';
const si = template.indexOf(START);
const ei = template.indexOf(END);
if (si < 0 || ei < 0) {
  console.error('[prerender] index.html head anchors not found — update scripts/prerender.mjs');
  process.exit(1);
}
const before = template.slice(0, si);
const after = template.slice(ei + END.length);

const routes = buildRoutes();
for (const r of routes) {
  const html = `${before}${headFor(r)}${after}`;
  if (r.path === '/') {
    fs.writeFileSync(path.join(DIST, 'index.html'), html);
    continue;
  }
  const dir = path.join(DIST, r.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}
console.log(`[prerender] ${routes.length} route shells written.`);

// Stamp the service worker cache version so each deploy gets fresh caches.
const swPath = path.join(DIST, 'sw.js');
if (fs.existsSync(swPath)) {
  const buildId = crypto.createHash('sha1').update(fs.readFileSync(path.join(DIST, 'index.html'))).digest('hex').slice(0, 12);
  fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replaceAll('__BUILD_ID__', buildId));
  console.log(`[prerender] sw.js stamped (${buildId}).`);
}
