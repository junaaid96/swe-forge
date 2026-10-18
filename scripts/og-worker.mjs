/** OG render worker: Resvg construction costs ~1.5s per instance, so renders fan out. */
import fs from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';
import { Resvg } from '@resvg/resvg-js';

const { jobs, bufs, imgCache } = workerData;
let n = 0;
try {
  for (const { svg, dest, hash } of jobs) {
    const png = new Resvg(svg, { background: '#0f172a', font: { loadSystemFonts: false, fontBuffers: bufs }, fitTo: { mode: 'width', value: 1200 } })
      .render()
      .asPng();
    fs.writeFileSync(dest, png);
    fs.writeFileSync(`${imgCache}/${hash}.png`, png);
    n += 1;
  }
  parentPort.postMessage({ ok: true, n });
} catch (e) {
  parentPort.postMessage({ ok: false, error: String((e instanceof Error && e.message) || e) });
}
