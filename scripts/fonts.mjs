/** Shared build-time font resolution (og.mjs, icons.mjs). */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'node_modules', '.cache', 'forgeline-og');

/**
 * Resolve one regular + one bold font ONCE. Per-render system-font scans
 * cost seconds each; shared buffers render in ~100ms.
 * Order: fontconfig (Linux/CI) → macOS system fonts → downloaded Inter.
 */
export async function resolveFonts() {
  const hit = (family, files) => {
    const bufs = [];
    for (const f of files) {
      if (!f || !fs.existsSync(f)) return null;
      bufs.push(fs.readFileSync(f));
    }
    return { family, bufs };
  };
  try {
    const regular = execFileSync('fc-match', ['DejaVu Sans', '--format=%{file}'], { encoding: 'utf8' }).trim().split('\n')[0];
    const bold = execFileSync('fc-match', ['DejaVu Sans:bold', '--format=%{file}'], { encoding: 'utf8' }).trim().split('\n')[0];
    // Use the ACTUAL matched family (fontconfig substitutes when DejaVu is absent).
    const family = execFileSync('fc-match', ['DejaVu Sans', '--format=%{family}'], { encoding: 'utf8' }).trim().split(',')[0].split('\n')[0] || 'sans-serif';
    const r = hit(family, [regular, bold]);
    if (r) return r;
  } catch {
    /* fontconfig unavailable */
  }
  const mac = hit('Helvetica', ['/System/Library/Fonts/Helvetica.ttc']) ?? hit('Arial', ['/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf']);
  if (mac) return mac;
  // Last resort: download Inter (static OTFs) once into the cache.
  const urls = { regular: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.otf', bold: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Bold.otf' };
  const bufs = [];
  for (const [name, url] of Object.entries(urls)) {
    const dest = path.join(CACHE, `Inter-${name}.otf`);
    if (!fs.existsSync(dest)) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`font download failed: ${url}`);
      fs.mkdirSync(CACHE, { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    }
    bufs.push(fs.readFileSync(dest));
  }
  return { family: 'Inter', bufs };
}
