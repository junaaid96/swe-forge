import { useMemo, useState } from 'react';
import { Pseudo, VizControls } from './player';
import { usePlayer } from './usePlayer';

const PSEUDO = ['h = sum(ord(c)) % size', 'if bucket[h] is empty:', '  place key', 'else:', '  chain: append to bucket[h]'];

interface Frame {
  buckets: string[][];
  bucket: number;
  key: string | null;
  hash: number | null;
  line: number;
  collisions: number;
  note: string;
}

const hash = (key: string, size: number) => [...key].reduce((a, c) => a + c.charCodeAt(0), 0) % size;

const KEY_SETS: Record<string, string[]> = {
  collisions: ['cat', 'act', 'dog', 'god', 'bird'],
  words: ['loop', 'pool', 'loot', 'tool', 'root', 'boot'],
  names: ['amy', 'bob', 'ann', 'may', 'sam'],
};

function insertFrames(keys: string[], size: number): Frame[] {
  const buckets: string[][] = Array.from({ length: size }, () => []);
  const frames: Frame[] = [{ buckets: buckets.map((b) => [...b]), bucket: -1, key: null, hash: null, line: 0, collisions: 0, note: `Empty table, ${size} buckets. Insert ${keys.length} keys with separate chaining.` }];
  let collisions = 0;
  for (const key of keys) {
    const h = hash(key, size);
    frames.push({ buckets: buckets.map((b) => [...b]), bucket: h, key, hash: h, line: 0, collisions, note: `hash("${key}") = ${[...key].map((c) => c.charCodeAt(0)).join('+')} mod ${size} = ${h}.` });
    if (!buckets[h].length) {
      buckets[h].push(key);
      frames.push({ buckets: buckets.map((b) => [...b]), bucket: h, key, hash: h, line: 2, collisions, note: `Bucket ${h} is empty → place "${key}".` });
    } else {
      collisions += 1;
      buckets[h].push(key);
      frames.push({ buckets: buckets.map((b) => [...b]), bucket: h, key, hash: h, line: 4, collisions, note: `Collision #${collisions}: bucket ${h} holds [${buckets[h].slice(0, -1).join(', ')}] → chain "${key}".` });
    }
  }
  const maxChain = Math.max(...buckets.map((b) => b.length));
  frames.push({ buckets: buckets.map((b) => [...b]), bucket: -1, key: null, hash: null, line: 0, collisions, note: `Done: ${collisions} collisions, longest chain ${maxChain}, load factor ${(keys.length / size).toFixed(2)}.` });
  return frames;
}

export function HashTableViz() {
  const [setName, setSetName] = useState('collisions');
  const [size, setSize] = useState(5);
  const [extra, setExtra] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const keys = useMemo(() => [...KEY_SETS[setName], ...extra].slice(0, 10), [setName, extra]);
  const frames = useMemo(() => insertFrames(keys, size), [keys, size]);
  const player = usePlayer(frames.length, `${setName}:${size}:${keys.join(',')}`);
  const f = frames[player.idx] ?? frames[0];
  const maxChain = Math.max(1, ...f.buckets.map((b) => b.length));

  const addKey = () => {
    const k = draft.trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 12);
    if (!k || keys.includes(k)) return;
    setExtra((e) => [...e, k]);
    setDraft('');
  };

  return (
    <div className="viz" data-testid="viz-hash">
      <div className="row">
        <label className="field">
          <span className="field-label">Keys</span>
          <select value={setName} onChange={(e) => { setSetName(e.target.value); setExtra([]); }} aria-label="Key set">
            {Object.keys(KEY_SETS).map((k) => (
              <option key={k} value={k}>
                {k} ({KEY_SETS[k].join(', ')})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Buckets</span>
          <select value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Bucket count">
            <option value={5}>5</option>
            <option value={7}>7</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Add a key</span>
          <span className="row">
            <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addKey()} placeholder="letters only" aria-label="Key to add" />
            <button type="button" className="btn btn-sm" onClick={addKey}>
              Add
            </button>
          </span>
        </label>
      </div>
      <svg className="viz-svg" viewBox={`0 0 560 ${40 + size * 44}`} role="img" aria-label={`Hash buckets: ${f.buckets.map((b, i) => `${i}: ${b.join(', ') || 'empty'}`).join('; ')}`}>
        {f.buckets.map((bucket, i) => (
          <g key={i}>
            <text x={8} y={30 + i * 44} className="viz-num">
              {i}
            </text>
            <rect x={34} y={8 + i * 44} width={516} height={36} rx={8} fill={f.bucket === i ? 'var(--accent-soft)' : 'var(--bg-elev, #fff)'} stroke={f.bucket === i ? 'var(--accent)' : 'var(--text)'} strokeWidth={f.bucket === i ? 3 : 1} />
            {bucket.length ? (
              bucket.map((k, j) => (
                <g key={`${k}-${j}`}>
                  <rect x={44 + j * 108} y={13 + i * 44} width={100} height={26} rx={6} fill={f.key === k && f.bucket === i ? 'var(--warn)' : 'var(--bg-soft, #eee)'} stroke="var(--text)" />
                  <text x={44 + j * 108 + 50} y={31 + i * 44} textAnchor="middle" className="viz-num">
                    {k}
                  </text>
                  {j > 0 ? (
                    <text x={44 + j * 108 - 6} y={31 + i * 44} textAnchor="middle" className="viz-num">
                      →
                    </text>
                  ) : null}
                </g>
              ))
            ) : (
              <text x={48} y={31 + i * 44} className="viz-sub">
                empty
              </text>
            )}
          </g>
        ))}
      </svg>
      <VizControls player={player} label="Hash table" />
      <div className="viz-grid">
        <Pseudo lines={PSEUDO} active={f.line} />
        <div>
          <div className="viz-counters" aria-live="polite">
            <span>
              <strong>{f.collisions}</strong> collisions
            </span>
            <span>
              <strong>{maxChain}</strong> longest chain
            </span>
            <span>
              <strong>{(keys.length / size).toFixed(2)}</strong> load
            </span>
          </div>
          <p className="viz-note">{f.note}</p>
          <p className="muted small">Average O(1) lookup while chains stay short; resize (rehash) when the load factor grows past ~0.7.</p>
        </div>
      </div>
    </div>
  );
}

export default HashTableViz;
