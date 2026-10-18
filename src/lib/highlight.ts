/**
 * Text-quote anchoring for highlights. Finds a note's quote in the rendered
 * page (preferring the recorded heading section, falling back to anywhere),
 * wraps it in <mark>, and reports quotes that no longer exist so the caller
 * can flag them orphaned instead of deleting them.
 */
import type { HighlightColor, Note } from './notes';

const MARK_ATTR = 'data-note-id';

function textNodes(root: Element): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const el = node.parentElement;
      if (!el || el.closest(`[${MARK_ATTR}]`) || el.closest('script, style, button, input, textarea')) return NodeFilter.FILTER_REJECT;
      return (node as Text).data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  while (walker.nextNode()) out.push(walker.currentNode as Text);
  return out;
}

const squash = (s: string) => s.replace(/\s+/g, ' ');

interface Hit {
  start: number;
  end: number;
}

/** All occurrence offsets of quote in full (raw), or via whitespace-squashed matching. */
function occurrences(full: string, quote: string): Hit[] {
  const hits: Hit[] = [];
  if (quote) {
    let i = full.indexOf(quote);
    while (i >= 0) {
      hits.push({ start: i, end: i + quote.length });
      i = full.indexOf(quote, i + 1);
    }
    if (hits.length) return hits;
  }
  // Fallback: collapse whitespace on both sides and map offsets back.
  const map: number[] = [];
  let collapsed = '';
  for (let i = 0; i < full.length; i++) {
    const ch = /\s/.test(full[i]) ? ' ' : full[i];
    if (ch === ' ' && collapsed.endsWith(' ')) continue;
    collapsed += ch;
    map.push(i);
  }
  const q = squash(quote);
  let i = collapsed.indexOf(q);
  while (i >= 0) {
    const start = map[i];
    const end = (map[i + q.length - 1] ?? full.length - 1) + 1;
    hits.push({ start, end });
    i = collapsed.indexOf(q, i + 1);
  }
  return hits;
}

function contextScore(full: string, hit: Hit, prefix: string, suffix: string): number {
  let score = 0;
  if (prefix && full.slice(Math.max(0, hit.start - prefix.length), hit.start).endsWith(prefix.slice(-24))) score += 1;
  if (suffix && full.slice(hit.end, hit.end + suffix.length).startsWith(suffix.slice(0, 24))) score += 1;
  return score;
}

function wrapRange(nodes: Text[], offsets: number[], hit: Hit, noteId: string, color: HighlightColor) {
  // Locate start/end nodes.
  let si = 0;
  while (si < nodes.length - 1 && offsets[si + 1] <= hit.start) si++;
  let ei = si;
  while (ei < nodes.length - 1 && offsets[ei + 1] < hit.end) ei++;
  const range = document.createRange();
  try {
    range.setStart(nodes[si], Math.max(0, hit.start - offsets[si]));
    range.setEnd(nodes[ei], Math.min(nodes[ei].data.length, hit.end - offsets[ei]));
  } catch {
    return false;
  }
  if (range.collapsed || !range.toString().trim()) return false;
  const mark = document.createElement('mark');
  mark.className = `hl hl-${color}`;
  mark.setAttribute(MARK_ATTR, noteId);
  try {
    mark.appendChild(range.extractContents());
    range.insertNode(mark);
    return true;
  } catch {
    return false;
  }
}

/**
 * Apply one note. Returns 'applied' | 'missing'. Prefers matches inside the
 * recorded heading's section; falls back to the best context match anywhere.
 */
export function applyNote(root: HTMLElement, note: Note): 'applied' | 'missing' {
  const nodes = textNodes(root);
  if (!nodes.length || !note.quote.trim()) return 'missing';
  const offsets: number[] = [];
  let full = '';
  for (const n of nodes) {
    offsets.push(full.length);
    full += n.data;
  }
  const hits = occurrences(full, note.quote);
  if (!hits.length) return 'missing';

  let sectionStart = 0;
  if (note.headingId) {
    const head = root.querySelector(`#${CSS.escape(note.headingId)}`);
    if (head) {
      // Offset where the heading's text node starts (approx: first node inside/after it).
      const headTexts = textNodes(head);
      if (headTexts.length) {
        const idx = nodes.indexOf(headTexts[0]);
        if (idx >= 0) sectionStart = offsets[idx];
      }
    }
  }
  const inSection = hits.filter((h) => h.start >= sectionStart);
  const pool = inSection.length ? inSection : hits;
  pool.sort((a, b) => contextScore(full, b, note.prefix, note.suffix) - contextScore(full, a, note.prefix, note.suffix));
  return wrapRange(nodes, offsets, pool[0], note.id, note.color) ? 'applied' : 'missing';
}

export function clearMarks(root: HTMLElement) {
  for (const mark of [...root.querySelectorAll(`[${MARK_ATTR}]`)]) {
    mark.replaceWith(...mark.childNodes);
  }
  root.normalize();
}

/** Nearest heading id above a node (for anchoring new selections). */
export function headingAbove(node: Node | null, root: HTMLElement): string | null {
  let el = node instanceof Element ? node : node?.parentElement;
  while (el && root.contains(el)) {
    const prev = el.previousElementSibling;
    const head = (el.matches('h1, h2, h3, h4, h5, h6') ? el : null) ?? prev?.closest('h1, h2, h3, h4, h5, h6');
    if (head?.id) return head.id;
    // Walk up: check previous siblings of ancestors for headings.
    let cursor: Element | null = el;
    let found: Element | null = null;
    while (cursor && cursor !== root && !found) {
      let sib = cursor.previousElementSibling;
      while (sib && !found) {
        found = sib.matches('h1, h2, h3, h4, h5, h6') ? sib : sib.querySelector('h1, h2, h3, h4, h5, h6:last-of-type');
        sib = sib.previousElementSibling;
      }
      cursor = cursor.parentElement;
    }
    if (found?.id) return found.id;
    el = el.parentElement;
  }
  return null;
}

/** ~40 chars of context around [start, end) in full text. */
export function contextOf(full: string, start: number, end: number, n = 40): { prefix: string; suffix: string } {
  return { prefix: full.slice(Math.max(0, start - n), start), suffix: full.slice(end, end + n) };
}
