import { useMemo, useState } from 'react';
import { Pseudo, VizControls } from './player';
import { usePlayer } from './usePlayer';

type Mode = 'scan' | 'index';

// Fixed teaching tree (B-tree, min degree 2) over 12 rows.
const ROWS = [3, 5, 8, 10, 12, 15, 18, 22, 25, 28, 31, 36];
const TREE = [
  { id: 'root', keys: [12, 25], x: 240, y: 40, children: ['c0', 'c1', 'c2'] },
  { id: 'c0', keys: [5, 8, 10], x: 90, y: 130, children: [] },
  { id: 'c1', keys: [15, 18, 22], x: 240, y: 130, children: [] },
  { id: 'c2', keys: [28, 31, 36], x: 390, y: 130, children: [] },
] as const;

const PSEUDO: Record<Mode, string[]> = {
  scan: ['for each row in table:', '  if row.key == target:', '    return row'],
  index: ['node = root', 'while node is not a leaf:', '  descend to the child range', 'binary-search keys in the node'],
};

interface Frame {
  row: number;
  node: string | null;
  key: number | null;
  examined: number;
  nodes: number;
  line: number;
  found: boolean;
  done: boolean;
  note: string;
}

function scanFrames(target: number): Frame[] {
  const frames: Frame[] = [];
  frames.push({ row: -1, node: null, key: null, examined: 0, nodes: 0, line: 0, found: false, done: false, note: `Full scan for ${target}: touch every row until it matches.` });
  for (let i = 0; i < ROWS.length; i++) {
    const hit = ROWS[i] === target;
    frames.push({
      row: i,
      node: null,
      key: null,
      examined: i + 1,
      nodes: 0,
      line: hit ? 2 : 1,
      found: hit,
      done: hit,
      note: hit ? `Row ${i + 1} matches after examining ${i + 1} rows.` : `Row ${i + 1} is ${ROWS[i]} — keep scanning.`,
    });
    if (hit) return frames;
  }
  frames.push({ row: -1, node: null, key: null, examined: ROWS.length, nodes: 0, line: 0, found: false, done: true, note: `Not found after all ${ROWS.length} rows. O(n) every time.` });
  return frames;
}

function indexFrames(target: number): Frame[] {
  const frames: Frame[] = [];
  const F = (row: number, node: string | null, key: number | null, examined: number, nodes: number, line: number, found: boolean, done: boolean, note: string): Frame =>
    ({ row, node, key, examined, nodes, line, found, done, note });
  frames.push(F(-1, 'root', null, 0, 1, 0, false, false, `Index lookup for ${target}: start at the root (1 page read).`));
  // Root [12, 25]
  if (target === 12 || target === 25) {
    frames.push(F(ROWS.indexOf(target), 'root', target, 1, 1, 3, true, true, `Found ${target} in the root — 1 node visited.`));
    return frames;
  }
  const child = target < 12 ? 'c0' : target < 25 ? 'c1' : 'c2';
  frames.push(F(-1, 'root', null, 1, 1, 2, false, false, target < 12 ? `${target} < 12 → descend left.` : target < 25 ? `12 < ${target} < 25 → descend middle.` : `${target} > 25 → descend right.`));
  const node = TREE.find((n) => n.id === child)!;
  for (const k of node.keys) {
    frames.push(F(ROWS.indexOf(k), child, k, 2, 2, 3, false, false, `Compare with ${k} in the leaf…`));
    if (k === target) {
      frames.push(F(ROWS.indexOf(k), child, k, 2, 2, 3, true, true, `Found ${target} after visiting 2 nodes. O(log n).`));
      return frames;
    }
    if (k > target) break;
  }
  frames.push(F(-1, child, null, 2, 2, 3, false, true, `Not present — proven after 2 node visits instead of ${ROWS.length} rows.`));
  return frames;
}

export function BTreeViz() {
  const [mode, setMode] = useState<Mode>('index');
  const [target, setTarget] = useState(18);
  const frames = useMemo(() => (mode === 'scan' ? scanFrames(target) : indexFrames(target)), [mode, target]);
  const player = usePlayer(frames.length, `${mode}:${target}`);
  const f = frames[player.idx] ?? frames[0];
  const byId = new Map(TREE.map((n) => [n.id, n]));

  return (
    <div className="viz" data-testid="viz-btree">
      <div className="row">
        <div className="segmented" role="radiogroup" aria-label="Lookup mode">
          <button type="button" role="radio" aria-checked={mode === 'index'} className={mode === 'index' ? 'on' : ''} onClick={() => setMode('index')}>
            B-tree index
          </button>
          <button type="button" role="radio" aria-checked={mode === 'scan'} className={mode === 'scan' ? 'on' : ''} onClick={() => setMode('scan')}>
            Full scan
          </button>
        </div>
        <label className="field">
          <span className="field-label">Find key</span>
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))} aria-label="Key to find">
            {[8, 12, 18, 25, 31, 99].map((k) => (
              <option key={k} value={k}>
                {k}
                {k === 99 ? ' (absent)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <svg className="viz-svg" viewBox="0 0 480 210" role="img" aria-label={mode === 'index' ? `B-tree, visiting ${f.node ?? 'nothing'}` : `Table scan, row ${f.row + 1}`}>
        {mode === 'index' ? (
          <g>
            {TREE.filter((n) => n.id !== 'root').map((n) => {
              const p = byId.get('root')!;
              return <line key={n.id} x1={p.x} y1={p.y + 16} x2={n.x} y2={n.y - 16} stroke="var(--line-strong, #94a3b8)" strokeWidth={2} />;
            })}
            {TREE.map((n) => {
              const hot = f.node === n.id;
              const w = n.keys.length * 44 + 12;
              return (
                <g key={n.id}>
                  <rect x={n.x - w / 2} y={n.y - 16} width={w} height={34} rx={8} fill={hot ? 'var(--accent-soft)' : 'var(--bg-elev, #fff)'} stroke={hot ? 'var(--accent)' : 'var(--text)'} strokeWidth={hot ? 3 : 2} />
                  {n.keys.map((k, i) => (
                    <text key={k} x={n.x - w / 2 + 6 + 22 + i * 44} y={n.y + 6} textAnchor="middle" className="viz-num" fontWeight={f.key === k ? 800 : 400} fill={f.key === k ? 'var(--accent)' : undefined}>
                      {k}
                    </text>
                  ))}
                </g>
              );
            })}
          </g>
        ) : (
          <g>
            {ROWS.map((v, i) => (
              <g key={v}>
                <rect
                  x={8 + i * 39}
                  y={80}
                  width={33}
                  height={44}
                  rx={6}
                  fill={f.row === i ? (f.found ? 'var(--good)' : 'var(--warn)') : i < f.examined ? 'var(--bg-soft, #eee)' : 'var(--bg-elev, #fff)'}
                  stroke="var(--text)"
                  strokeWidth={f.row === i ? 3 : 1}
                />
                <text x={8 + i * 39 + 16} y={107} textAnchor="middle" className="viz-num">
                  {v}
                </text>
              </g>
            ))}
            <text x={8} y={60} className="viz-sub">
              heap rows (12)
            </text>
          </g>
        )}
      </svg>
      <VizControls player={player} label="B-tree lookup" />
      <div className="viz-grid">
        <Pseudo lines={PSEUDO[mode]} active={f.line} />
        <div>
          <div className="viz-counters" aria-live="polite">
            <span>
              <strong>{mode === 'scan' ? f.examined : f.nodes}</strong> {mode === 'scan' ? 'rows examined' : 'nodes visited'}
            </span>
            <span>
              <strong>{f.done ? (f.found ? 'found' : 'absent') : '…'}</strong> result
            </span>
          </div>
          <p className="viz-note">{f.note}</p>
          <p className="muted small">{mode === 'scan' ? 'Full scan: O(n) rows, every query.' : 'B-tree: O(log n) node visits; each node is ~one disk page.'}</p>
        </div>
      </div>
    </div>
  );
}

export default BTreeViz;
