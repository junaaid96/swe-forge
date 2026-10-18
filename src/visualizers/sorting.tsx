import { useMemo, useState } from 'react';
import { Pseudo, VizControls } from './player';
import { usePlayer } from './usePlayer';

type Algo = 'bubble' | 'merge' | 'quick';

interface Frame {
  arr: number[];
  a: number;
  b: number;
  pivot: number;
  sorted: boolean[];
  line: number;
  cmp: number;
  swaps: number;
  note: string;
}

const PSEUDO: Record<Algo, string[]> = {
  bubble: ['for i in 0..n-1:', '  for j in 0..n-i-1:', '    if a[j] > a[j+1]:', '      swap(a[j], a[j+1])'],
  merge: ['split array in halves', 'sort left half', 'sort right half', 'merge runs (compare heads)'],
  quick: ['pivot = a[hi]', 'for j in lo..hi:', '  if a[j] < pivot:', '    swap into place'],
};

const COMPLEXITY: Record<Algo, string> = {
  bubble: 'Best O(n) · Avg O(n²) · Worst O(n²) · Space O(1)',
  merge: 'Best O(n log n) · Avg O(n log n) · Worst O(n log n) · Space O(n)',
  quick: 'Best O(n log n) · Avg O(n log n) · Worst O(n²) · Space O(log n)',
};

function bubbleFrames(input: number[]): Frame[] {
  const a = [...input];
  const n = a.length;
  const frames: Frame[] = [];
  let cmp = 0;
  let swaps = 0;
  const snap = (ja: number, jb: number, line: number, note: string, sortedCount: number) =>
    frames.push({ arr: [...a], a: ja, b: jb, pivot: -1, sorted: a.map((_, i) => i >= n - sortedCount), line, cmp, swaps, note });
  snap(-1, -1, 0, 'Start: largest value bubbles to the end each pass.', 0);
  for (let i = 0; i < n - 1; i++) {
    let moved = false;
    for (let j = 0; j < n - 1 - i; j++) {
      cmp += 1;
      snap(j, j + 1, 2, `Compare a[${j}]=${a[j]} with a[${j + 1}]=${a[j + 1]}.`, i);
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swaps += 1;
        moved = true;
        snap(j, j + 1, 3, `Swap → [${a.join(', ')}].`, i);
      }
    }
    if (!moved) break;
  }
  frames.push({ arr: [...a], a: -1, b: -1, pivot: -1, sorted: a.map(() => true), line: 0, cmp, swaps, note: `Sorted in ${cmp} comparisons, ${swaps} swaps.` });
  return frames;
}

function mergeFrames(input: number[]): Frame[] {
  const a = [...input];
  const frames: Frame[] = [];
  let cmp = 0;
  let writes = 0;
  const snap = (t: number, s: number, line: number, note: string) =>
    frames.push({ arr: [...a], a: t, b: s, pivot: -1, sorted: a.map(() => false), line, cmp, swaps: writes, note });
  snap(-1, -1, 0, 'Split the array into halves until single elements remain.');
  const merge = (lo: number, mid: number, hi: number) => {
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0;
    let j = 0;
    let k = lo;
    while (i < left.length && j < right.length) {
      cmp += 1;
      snap(k, -1, 3, `Compare heads ${left[i]} and ${right[j]} → write ${left[i] <= right[j] ? left[i] : right[j]} at [${k}].`);
      a[k] = left[i] <= right[j] ? left[i++] : right[j++];
      writes += 1;
      k += 1;
    }
    while (i < left.length) {
      a[k] = left[i++];
      writes += 1;
      snap(k, -1, 3, `Copy remaining ${a[k]} at [${k}].`);
      k += 1;
    }
    while (j < right.length) {
      a[k] = right[j++];
      writes += 1;
      snap(k, -1, 3, `Copy remaining ${a[k]} at [${k}].`);
      k += 1;
    }
  };
  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    sort(lo, mid);
    sort(mid + 1, hi);
    merge(lo, mid, hi);
  };
  sort(0, a.length - 1);
  frames.push({ arr: [...a], a: -1, b: -1, pivot: -1, sorted: a.map(() => true), line: 3, cmp, swaps: writes, note: `Sorted in ${cmp} comparisons, ${writes} writes.` });
  return frames;
}

function quickFrames(input: number[]): Frame[] {
  const a = [...input];
  const frames: Frame[] = [];
  let cmp = 0;
  let swaps = 0;
  const snap = (ja: number, jb: number, pivot: number, line: number, note: string) =>
    frames.push({ arr: [...a], a: ja, b: jb, pivot, sorted: a.map(() => false), line, cmp, swaps, note });
  snap(-1, -1, -1, 0, 'Pick the last element as pivot; partition smaller values left.');
  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const pivot = a[hi];
    snap(-1, hi, hi, 0, `Pivot = ${pivot} over [${lo}..${hi}].`);
    let i = lo;
    for (let j = lo; j < hi; j++) {
      cmp += 1;
      snap(j, i, hi, 2, `Is a[${j}]=${a[j]} < ${pivot}?`);
      if (a[j] < pivot) {
        [a[i], a[j]] = [a[j], a[i]];
        swaps += 1;
        snap(i, j, hi, 3, `Swap into place → [${a.join(', ')}].`);
        i += 1;
      }
    }
    [a[i], a[hi]] = [a[hi], a[i]];
    swaps += 1;
    snap(i, hi, i, 3, `Pivot lands at [${i}]. Recurse left and right.`);
    sort(lo, i - 1);
    sort(i + 1, hi);
  };
  sort(0, a.length - 1);
  frames.push({ arr: [...a], a: -1, b: -1, pivot: -1, sorted: a.map(() => true), line: 0, cmp, swaps, note: `Sorted in ${cmp} comparisons, ${swaps} swaps.` });
  return frames;
}

const BUILDERS: Record<Algo, (a: number[]) => Frame[]> = { bubble: bubbleFrames, merge: mergeFrames, quick: quickFrames };

function shuffled(n: number) {
  const a = Array.from({ length: n }, (_, i) => 3 + i * 3);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function SortingViz() {
  const [algo, setAlgo] = useState<Algo>('bubble');
  const [seed, setSeed] = useState(() => shuffled(7));
  const frames = useMemo(() => BUILDERS[algo](seed).slice(0, 600), [algo, seed]);
  const player = usePlayer(frames.length, `${algo}:${seed.join(',')}`);
  const f = frames[player.idx] ?? frames[0];
  const max = Math.max(...f.arr);
  const W = 560;
  const H = 220;
  const bw = W / f.arr.length;

  return (
    <div className="viz" data-testid="viz-sorting">
      <div className="row">
        <label className="field">
          <span className="field-label">Algorithm</span>
          <select value={algo} onChange={(e) => setAlgo(e.target.value as Algo)} aria-label="Sorting algorithm">
            <option value="bubble">Bubble sort</option>
            <option value="merge">Merge sort</option>
            <option value="quick">Quick sort (Lomuto)</option>
          </select>
        </label>
        <button type="button" className="btn" onClick={() => setSeed(shuffled(7))}>
          Shuffle
        </button>
      </div>
      <svg className="viz-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Array bars: ${f.arr.join(', ')}`}>
        {f.arr.map((v, i) => {
          const h = (v / max) * (H - 40);
          const fill = f.sorted[i] ? 'var(--good)' : i === f.pivot ? 'var(--accent)' : i === f.a || i === f.b ? 'var(--warn)' : 'var(--topic, var(--accent))';
          return (
            <g key={i}>
              <rect x={i * bw + 3} y={H - 24 - h} width={bw - 6} height={h} rx={4} fill={fill} opacity={0.9} />
              <text x={i * bw + bw / 2} y={H - 8} textAnchor="middle" className="viz-num">
                {v}
              </text>
            </g>
          );
        })}
      </svg>
      <VizControls player={player} label="Sorting" />
      <div className="viz-grid">
        <Pseudo lines={PSEUDO[algo]} active={f.line} />
        <div>
          <div className="viz-counters" aria-live="polite">
            <span>
              <strong>{f.cmp}</strong> comparisons
            </span>
            <span>
              <strong>{f.swaps}</strong> {algo === 'merge' ? 'writes' : 'swaps'}
            </span>
          </div>
          <p className="viz-note">{f.note}</p>
          <p className="muted small">{COMPLEXITY[algo]}</p>
        </div>
      </div>
    </div>
  );
}

export default SortingViz;
