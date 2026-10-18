import { lazy } from 'react';

export interface VizMeta {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
  topics: string[];
}

export const VISUALIZERS: VizMeta[] = [
  { id: 'sorting', title: 'Sorting: bubble, merge, quick', blurb: 'Watch comparisons and swaps on the same array, side by side with the code.', emoji: '📊', topics: ['dsa'] },
  { id: 'graph-traversal', title: 'Graph traversal: BFS, DFS, Dijkstra', blurb: 'Walk an editable graph and see why the queue, stack and distances matter.', emoji: '🕸️', topics: ['dsa'] },
  { id: 'event-loop', title: 'JS event loop', blurb: 'Call stack, microtasks and macrotasks stepping through real snippets.', emoji: '🔁', topics: ['javascript'] },
  { id: 'btree-index', title: 'B-tree index vs full scan', blurb: 'Count the rows a query touches with and without an index.', emoji: '🌳', topics: ['database', 'postgresql'] },
  { id: 'hash-table', title: 'Hash table collisions', blurb: 'Hash, place and chain keys; see collisions and load factor grow.', emoji: '🪣', topics: ['dsa', 'python'] },
];

/** One lazy chunk per visualizer — the hub never loads them all. */
export const vizLoader = (id: string) => {
  switch (id) {
    case 'sorting':
      return lazy(() => import('./sorting'));
    case 'graph-traversal':
      return lazy(() => import('./graph'));
    case 'event-loop':
      return lazy(() => import('./eventLoop'));
    case 'btree-index':
      return lazy(() => import('./btree'));
    case 'hash-table':
      return lazy(() => import('./hashTable'));
    default:
      return null;
  }
};
