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
  // The stamp covers the file list too, so changing which files are vendored
  // re-vendors even when the package version is unchanged.
  const want = `${version}\n${files.join('\n')}\n`;
  if (fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === want) {
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
    fs.copyFileSync(src, path.join(out, path.basename(f)));
    bytes += fs.statSync(src).size;
  }
  fs.writeFileSync(stamp, want);
  console.log(`[vendor] ${name} ${version} → public/vendor/${name} (${(bytes / 1024 / 1024).toFixed(1)}MB)`);
}

// Pyodide: ESM loader + wasm + stdlib. Loaded lazily by the Python
// practice worker (a module worker — Pyodide no longer supports classic
// workers) on first use; never part of the JS bundle.
vendorDir('pyodide', 'pyodide', ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']);

// sql.js: classic loader + wasm. Loaded lazily by the SQL practice worker.
vendorDir('sqljs', 'sql.js', ['dist/sql-wasm.js', 'dist/sql-wasm.wasm']);
