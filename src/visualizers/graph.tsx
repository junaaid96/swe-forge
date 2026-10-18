import { useMemo, useState } from 'react';
import { Pseudo, VizControls } from './player';
import { usePlayer } from './usePlayer';

interface GNode {
  id: string;
  x: number;
  y: number;
}
interface GEdge {
  a: string;
  b: string;
  w: number;
}
interface Graph {
  nodes: GNode[];
  edges: GEdge[];
}

const PRESETS: Record<string, Graph> = {
  small: {
    nodes: [
      { id: 'A', x: 80, y: 60 },
      { id: 'B', x: 220, y: 40 },
      { id: 'C', x: 360, y: 60 },
      { id: 'D', x: 150, y: 170 },
      { id: 'E', x: 300, y: 170 },
    ],
    edges: [
      { a: 'A', b: 'B', w: 4 },
      { a: 'B', b: 'C', w: 2 },
      { a: 'A', b: 'D', w: 1 },
      { a: 'D', b: 'E', w: 5 },
      { a: 'B', b: 'E', w: 3 },
      { a: 'C', b: 'E', w: 6 },
    ],
  },
  grid: {
    nodes: [
      { id: 'A', x: 70, y: 50 },
      { id: 'B', x: 210, y: 50 },
      { id: 'C', x: 350, y: 50 },
      { id: 'D', x: 70, y: 170 },
      { id: 'E', x: 210, y: 170 },
      { id: 'F', x: 350, y: 170 },
    ],
    edges: [
      { a: 'A', b: 'B', w: 2 },
      { a: 'B', b: 'C', w: 2 },
      { a: 'D', b: 'E', w: 2 },
      { a: 'E', b: 'F', w: 2 },
      { a: 'A', b: 'D', w: 3 },
      { a: 'B', b: 'E', w: 1 },
      { a: 'C', b: 'F', w: 3 },
    ],
  },
  weighted: {
    nodes: [
      { id: 'S', x: 60, y: 110 },
      { id: 'A', x: 180, y: 50 },
      { id: 'B', x: 180, y: 170 },
      { id: 'C', x: 300, y: 50 },
      { id: 'T', x: 420, y: 110 },
    ],
    edges: [
      { a: 'S', b: 'A', w: 7 },
      { a: 'S', b: 'B', w: 2 },
      { a: 'B', b: 'A', w: 1 },
      { a: 'A', b: 'C', w: 3 },
      { a: 'B', b: 'C', w: 8 },
      { a: 'C', b: 'T', w: 1 },
      { a: 'A', b: 'T', w: 9 },
    ],
  },
};

type Algo = 'bfs' | 'dfs' | 'dijkstra';

const PSEUDO: Record<Algo, string[]> = {
  bfs: ['queue = [start]', 'v = queue.pop_front()', 'for each unvisited neighbor:', '  visit + queue.push_back()'],
  dfs: ['stack = [start]', 'v = stack.pop()', 'for each unvisited neighbor:', '  visit + stack.push()'],
  dijkstra: ['dist[start] = 0, rest = ∞', 'v = unvisited node, smallest dist', 'for each neighbor:', '  relax: dist = min(dist, dist[v] + w)'],
};

interface Frame {
  visited: string[];
  frontier: string[];
  current: string | null;
  edge: string | null;
  dist: Record<string, number | null>;
  order: string[];
  line: number;
  note: string;
}

const edgeKey = (a: string, b: string) => [a, b].sort().join('|');

function neighbors(g: Graph, id: string) {
  const out: Array<{ to: string; w: number }> = [];
  for (const e of g.edges) {
    if (e.a === id) out.push({ to: e.b, w: e.w });
    else if (e.b === id) out.push({ to: e.a, w: e.w });
  }
  return out.sort((x, y) => (x.to < y.to ? -1 : 1));
}

function traverse(g: Graph, start: string, algo: Algo): Frame[] {
  const frames: Frame[] = [];
  const visited = new Set<string>();
  const order: string[] = [];
  const dist: Record<string, number | null> = Object.fromEntries(g.nodes.map((n) => [n.id, algo === 'dijkstra' ? null : null]));
  if (algo === 'dijkstra') dist[start] = 0;
  const snap = (current: string | null, edge: string | null, line: number, note: string, frontier: string[]) =>
    frames.push({ visited: [...visited], frontier, current, edge, dist: { ...dist }, order: [...order], line, note });

  if (algo === 'bfs' || algo === 'dfs') {
    const bag = [start];
    snap(null, null, 0, `${algo === 'bfs' ? 'Queue' : 'Stack'} starts with ${start}.`, [...bag]);
    while (bag.length) {
      const v = algo === 'bfs' ? bag.shift()! : bag.pop()!;
      if (visited.has(v)) continue;
      visited.add(v);
      order.push(v);
      snap(v, null, 1, `Take ${v} (${algo === 'bfs' ? 'front' : 'top'}). Visit order: ${order.join(' → ')}.`, [...bag]);
      for (const nb of neighbors(g, v)) {
        if (visited.has(nb.to) || bag.includes(nb.to)) continue;
        bag.push(nb.to);
        snap(v, edgeKey(v, nb.to), 3, `Found ${nb.to} via ${v} — push to the ${algo === 'bfs' ? 'queue' : 'stack'}.`, [...bag]);
      }
    }
    snap(null, null, 0, `Done. Visit order: ${order.join(' → ') || '—'}.`, []);
  } else {
    const done = new Set<string>();
    snap(null, null, 0, `dist[${start}] = 0, everything else ∞.`, []);
    for (;;) {
      let v: string | null = null;
      for (const n of g.nodes) {
        if (done.has(n.id) || dist[n.id] === null) continue;
        if (v === null || (dist[n.id] as number) < (dist[v] as number)) v = n.id;
      }
      if (v === null) break;
      done.add(v);
      visited.add(v);
      order.push(v);
      snap(v, null, 1, `Settle ${v} at distance ${dist[v]}.`, []);
      for (const nb of neighbors(g, v)) {
        if (done.has(nb.to)) continue;
        const alt = (dist[v] as number) + nb.w;
        if (dist[nb.to] === null || alt < (dist[nb.to] as number)) {
          dist[nb.to] = alt;
          snap(v, edgeKey(v, nb.to), 3, `Relax ${nb.to}: dist = ${alt} via ${v}.`, []);
        }
      }
    }
    snap(null, null, 0, `Done. Distances from ${start}: ${g.nodes.map((n) => `${n.id}=${dist[n.id] ?? '∞'}`).join(', ')}.`, []);
  }
  return frames;
}

export function GraphViz() {
  const [preset, setPreset] = useState('small');
  const [graph, setGraph] = useState<Graph>(PRESETS.small);
  const [algo, setAlgo] = useState<Algo>('bfs');
  const [start, setStart] = useState('A');
  const [addMode, setAddMode] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [selEdge, setSelEdge] = useState<string | null>(null);

  const frames = useMemo(() => traverse(graph, graph.nodes.some((n) => n.id === start) ? start : graph.nodes[0].id, algo).slice(0, 300), [graph, start, algo]);
  const gkey = `${preset}:${algo}:${start}:${graph.edges.map((e) => `${e.a}${e.b}${e.w}`).join(',')}`;
  const player = usePlayer(frames.length, gkey);
  const f = frames[player.idx] ?? frames[0];
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));

  const loadPreset = (name: string) => {
    setPreset(name);
    setGraph(structuredClone(PRESETS[name]));
    setStart(PRESETS[name].nodes[0].id);
    setAddMode(false);
    setPicked(null);
    setSelEdge(null);
  };

  const clickNode = (id: string) => {
    if (!addMode) {
      setStart(id);
      return;
    }
    if (!picked) {
      setPicked(id);
      return;
    }
    if (picked === id) {
      setPicked(null);
      return;
    }
    setGraph((g) => (g.edges.some((e) => edgeKey(e.a, e.b) === edgeKey(picked, id)) ? g : { ...g, edges: [...g.edges, { a: picked, b: id, w: 1 }] }));
    setPicked(null);
    setAddMode(false);
  };

  const bumpWeight = (d: number) => {
    if (!selEdge) return;
    setGraph((g) => ({ ...g, edges: g.edges.map((e) => (edgeKey(e.a, e.b) === selEdge ? { ...e, w: Math.min(9, Math.max(1, e.w + d)) } : e)) }));
  };

  return (
    <div className="viz" data-testid="viz-graph">
      <div className="row">
        <label className="field">
          <span className="field-label">Graph</span>
          <select value={preset} onChange={(e) => loadPreset(e.target.value)} aria-label="Preset graph">
            {Object.keys(PRESETS).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Algorithm</span>
          <select value={algo} onChange={(e) => setAlgo(e.target.value as Algo)} aria-label="Traversal algorithm">
            <option value="bfs">BFS (queue)</option>
            <option value="dfs">DFS (stack)</option>
            <option value="dijkstra">Dijkstra (shortest path)</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Start</span>
          <select value={start} onChange={(e) => setStart(e.target.value)} aria-label="Start node">
            {graph.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.id}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="row">
        <button type="button" className={`btn btn-sm ${addMode ? 'btn-primary' : ''}`} aria-pressed={addMode} onClick={() => { setAddMode(!addMode); setPicked(null); }}>
          {addMode ? (picked ? `Add edge from ${picked}: pick target` : 'Add edge: pick first node') : 'Add edge'}
        </button>
        {selEdge ? (
          <>
            <button type="button" className="btn btn-sm" onClick={() => bumpWeight(-1)} aria-label="Decrease edge weight">
              w−
            </button>
            <button type="button" className="btn btn-sm" onClick={() => bumpWeight(1)} aria-label="Increase edge weight">
              w+
            </button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => { setGraph((g) => ({ ...g, edges: g.edges.filter((e) => edgeKey(e.a, e.b) !== selEdge) })); setSelEdge(null); }}>
              Remove edge
            </button>
          </>
        ) : (
          <span className="muted small">Click a node to set start · click an edge to select it</span>
        )}
      </div>
      <svg className="viz-svg" viewBox="0 0 480 220" role="img" aria-label={`Graph, current node ${f.current ?? 'none'}, visited ${f.visited.join(', ') || 'none'}`}>
        {graph.edges.map((e) => {
          const a = byId.get(e.a)!;
          const b = byId.get(e.b)!;
          const k = edgeKey(e.a, e.b);
          const hot = f.edge === k;
          return (
            <g key={k} onClick={() => setSelEdge(k)} className="viz-edge" role="button" aria-label={`Edge ${e.a}-${e.b} weight ${e.w}`} tabIndex={0} onKeyDown={(ev) => ev.key === 'Enter' && setSelEdge(k)}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={hot ? 'var(--warn)' : selEdge === k ? 'var(--accent)' : 'var(--line-strong, #94a3b8)'} strokeWidth={hot || selEdge === k ? 4 : 2} />
              <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6} textAnchor="middle" className="viz-num">
                {e.w}
              </text>
            </g>
          );
        })}
        {graph.nodes.map((n) => {
          const isCur = f.current === n.id;
          const seen = f.visited.includes(n.id);
          const inFront = f.frontier.includes(n.id);
          return (
            <g key={n.id} onClick={() => clickNode(n.id)} className="viz-node" role="button" aria-label={`Node ${n.id}${algo === 'dijkstra' ? `, distance ${f.dist[n.id] ?? '∞'}` : ''}`} tabIndex={0} onKeyDown={(ev) => ev.key === 'Enter' && clickNode(n.id)}>
              <circle cx={n.x} cy={n.y} r={18} fill={isCur ? 'var(--warn)' : seen ? 'var(--good)' : inFront ? 'var(--accent-soft)' : 'var(--bg-elev, #fff)'} stroke={isCur ? 'var(--warn)' : 'var(--text)'} strokeWidth={2} />
              <text x={n.x} y={n.y + 5} textAnchor="middle" className="viz-num">
                {n.id}
              </text>
              {algo === 'dijkstra' ? (
                <text x={n.x} y={n.y + 32} textAnchor="middle" className="viz-sub">
                  {f.dist[n.id] ?? '∞'}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <VizControls player={player} label="Graph traversal" />
      <div className="viz-grid">
        <Pseudo lines={PSEUDO[algo]} active={f.line} />
        <div>
          <div className="viz-counters" aria-live="polite">
            <span>
              <strong>{f.visited.length}</strong> visited
            </span>
            <span>
              <strong>{f.frontier.length}</strong> in {algo === 'dfs' ? 'stack' : 'queue'}
            </span>
          </div>
          <p className="viz-note">{f.note}</p>
          <p className="muted small">{algo === 'dijkstra' ? 'Time O((V+E) log V) with a heap · non-negative weights only' : 'Time O(V+E) · Space O(V)'}</p>
        </div>
      </div>
    </div>
  );
}

export default GraphViz;
