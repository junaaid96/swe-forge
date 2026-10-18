#!/usr/bin/env node
/**
 * Vendor heavy browser runtimes into public/vendor/ so everything stays
 * same-origin static (no CDN, no user data leaving the browser).
 * Skips runtimes whose version stamp already matches.
 * Runs automatically before `npm run dev` and `npm run build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function vendorDir(name, pkg, files) {
  const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', pkg, 'package.json'), 'utf8')).version;
  const out = path.join(ROOT, 'public', 'vendor', name);
  const stamp = path.join(out, '.version');
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8').trim() === version) {
    console.log(`[vendor] ${name} ${version} already vendored`);
    return;
  }
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  let bytes = 0;
  for (const f of files) {
    const src = path.join(ROOT, 'node_modules', pkg, f);
    if (!fs.existsSync(src)) {
      console.error(`[vendor] missing ${pkg}/${f} — reinstall dependencies`);
      process.exit(1);
    }
    fs.copyFileSync(src, path.join(out, f));
    bytes += fs.statSync(src).size;
  }
  fs.writeFileSync(stamp, `${version}\n`);
  console.log(`[vendor] ${name} ${version} → public/vendor/${name} (${(bytes / 1024 / 1024).toFixed(1)}MB)`);
}

// Pyodide: classic loader + wasm + stdlib. Loaded lazily by the Python
// practice worker on first use; never part of the JS bundle.
vendorDir('pyodide', 'pyodide', ['pyodide.js', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']);
