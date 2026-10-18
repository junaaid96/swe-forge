import { useMemo, useState } from 'react';
import { Pseudo, VizControls } from './player';
import { usePlayer } from './usePlayer';

interface Frame {
  stack: string[];
  micro: string[];
  macro: string[];
  log: string[];
  line: number;
  note: string;
}

interface Preset {
  title: string;
  code: string[];
  frames: Frame[];
}

const S = (stack: string[], micro: string[], macro: string[], log: string[], line: number, note: string): Frame => ({ stack, micro, macro, log, line, note });

const PRESETS: Preset[] = [
  {
    title: 'Promise vs setTimeout',
    code: ["log('script start')", 'setTimeout(() => log(\'timeout\'), 0)', 'Promise.resolve().then(() => log(\'promise\'))', "log('script end')"],
    frames: [
      S(['main'], [], [], [], 0, 'Synchronous code runs first, top to bottom.'),
      S(['main'], [], [], ['script start'], 1, 'log() runs immediately.'),
      S(['main'], [], ['timeout cb'], ['script start'], 2, 'setTimeout schedules a macrotask — even with 0ms it waits.'),
      S(['main'], ['promise cb'], ['timeout cb'], ['script start'], 3, 'A resolved promise queues a microtask.'),
      S(['main'], ['promise cb'], ['timeout cb'], ['script start', 'script end'], 3, 'Rest of the sync script finishes.'),
      S([], ['promise cb'], ['timeout cb'], ['script start', 'script end'], 2, 'Stack empty → drain ALL microtasks before any macrotask.'),
      S(['promise cb'], [], ['timeout cb'], ['script start', 'script end', 'promise'], 2, 'Promise callback runs. Output: promise.'),
      S([], [], ['timeout cb'], ['script start', 'script end', 'promise'], 1, 'Microtasks empty → take one macrotask.'),
      S(['timeout cb'], [], [], ['script start', 'script end', 'promise', 'timeout'], 1, 'Timeout callback runs last.'),
      S([], [], [], ['script start', 'script end', 'promise', 'timeout'], 1, 'Final order: start, end, promise, timeout.'),
    ],
  },
  {
    title: 'async / await',
    code: ['async function main() {', "  log('a');", '  await nothing();', "  log('b'); // resumes as a microtask", '}', 'main();', "log('c');"],
    frames: [
      S(['main'], [], [], [], 5, 'Calling main() runs it synchronously until the first await.'),
      S(['main'], [], [], ['a'], 1, "log('a') runs immediately."),
      S(['main'], ['main (cont.)'], [], ['a'], 2, 'await parks the rest of main() as a microtask and returns.'),
      S([], ['main (cont.)'], [], ['a'], 6, 'main() returned a pending promise; sync code continues.'),
      S([], ['main (cont.)'], [], ['a', 'c'], 6, "log('c') runs before the awaited continuation."),
      S(['main (cont.)'], [], [], ['a', 'c'], 3, 'Stack empty → the continuation microtask resumes.'),
      S([], [], [], ['a', 'c', 'b'], 3, "Final order: a, c, b. await never blocks — it defers."),
    ],
  },
  {
    title: 'Microtask chains',
    code: ['queueMicrotask(() => {', "  log('micro 1');", "  queueMicrotask(() => log('micro 2'));", '});', "setTimeout(() => log('macro'), 0);", "log('sync');"],
    frames: [
      S(['main'], [], [], [], 0, 'queueMicrotask enqueues directly to the microtask queue.'),
      S(['main'], ['micro 1'], [], [], 4, 'setTimeout enqueues a macrotask.'),
      S(['main'], ['micro 1'], ['macro'], ['sync'], 5, 'Sync log runs first.'),
      S([], ['micro 1'], ['macro'], ['sync'], 0, 'Stack empty → drain microtasks.'),
      S(['micro 1'], [], ['macro'], ['sync', 'micro 1'], 2, 'First microtask runs — and queues ANOTHER microtask.'),
      S([], ['micro 2'], ['macro'], ['sync', 'micro 1'], 2, 'Newly queued microtasks still run before any macrotask…'),
      S(['micro 2'], [], ['macro'], ['sync', 'micro 1', 'micro 2'], 2, '…so micro 2 jumps ahead of the timer. (A loop here would starve rendering!)'),
      S([], [], ['macro'], ['sync', 'micro 1', 'micro 2'], 4, 'Finally the macrotask runs.'),
      S([], [], [], ['sync', 'micro 1', 'micro 2', 'macro'], 4, 'Final order: sync, micro 1, micro 2, macro.'),
    ],
  },
];

function Lane({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="el-lane">
      <p className="eyebrow">{title}</p>
      {items.length ? (
        <ul>
          {items.map((it, i) => (
            <li key={`${it}-${i}`} className={`el-chip ${tone}`}>
              {it}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">empty</p>
      )}
    </div>
  );
}

export function EventLoopViz() {
  const [preset, setPreset] = useState(0);
  const frames = useMemo(() => PRESETS[preset].frames, [preset]);
  const player = usePlayer(frames.length, String(preset), 1400);
  const f = frames[player.idx] ?? frames[0];

  return (
    <div className="viz" data-testid="viz-event-loop">
      <div className="row">
        <label className="field">
          <span className="field-label">Snippet</span>
          <select value={preset} onChange={(e) => setPreset(Number(e.target.value))} aria-label="Event loop snippet">
            {PRESETS.map((p, i) => (
              <option key={p.title} value={i}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="el-grid">
        <Pseudo lines={PRESETS[preset].code} active={f.line} title="Snippet" />
        <div className="el-lanes">
          <Lane title="Call stack" items={f.stack} tone="tone-stack" />
          <Lane title="Microtasks" items={f.micro} tone="tone-micro" />
          <Lane title="Macrotasks" items={f.macro} tone="tone-macro" />
        </div>
      </div>
      <div className="el-log" aria-live="polite" aria-label="Console output">
        <p className="eyebrow">Console</p>
        {f.log.length ? (
          <ol>
            {f.log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ol>
        ) : (
          <p className="muted small">—</p>
        )}
      </div>
      <VizControls player={player} label="Event loop" />
      <p className="viz-note">{f.note}</p>
      <p className="muted small">Rule of thumb: sync code → all microtasks → one macrotask (render may interleave) → repeat.</p>
    </div>
  );
}

export default EventLoopViz;
