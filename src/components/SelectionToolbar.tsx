import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { getCards } from '../lib/content';
import { HIGHLIGHT_COLORS, QUOTE_LIMIT, noteStore, useNotes, type HighlightColor, type Note } from '../lib/notes';
import { customCards } from '../lib/customCards';
import { applyNote, clearMarks, contextOf, headingAbove } from '../lib/highlight';

interface Props {
  containerRef: RefObject<HTMLElement | null>;
  pageKey: string;
  pageUrl: string;
  pageTitle: string;
  topic: string;
  /** when true, apply matches but don't flag missing quotes as orphaned */
  suspendOrphan?: boolean;
}

interface FreshSel {
  quote: string;
  prefix: string;
  suffix: string;
  headingId: string | null;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function SelectionToolbar({ containerRef, pageKey, pageUrl, pageTitle, topic, suspendOrphan }: Props) {
  const notes = useNotes();
  const [sel, setSel] = useState<FreshSel | null>(null);
  const [mode, setMode] = useState<'toolbar' | 'editor'>('toolbar');
  const [editing, setEditing] = useState<Note | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [color, setColor] = useState<HighlightColor>('yellow');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  openRef.current = Boolean(sel || editing);

  const close = useCallback(() => {
    setSel(null);
    setMode('toolbar');
    setEditing(null);
    setText('');
    setStatus(null);
  }, []);

  // Apply saved highlights; flag quotes that no longer anchor as orphaned.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    clearMarks(root);
    for (const n of notes.notes) {
      if (n.pageKey !== pageKey || n.orphaned) continue;
      if (applyNote(root, n) === 'missing' && !suspendOrphan) noteStore.update(n.id, { orphaned: true });
    }
  }, [notes, pageKey, suspendOrphan, containerRef]);

  // Track text selection inside the reader content.
  useEffect(() => {
    const onSel = () => {
      const root = containerRef.current;
      const s = window.getSelection();
      if (!root || !s || s.isCollapsed || openRef.current) {
        if (!s || s.isCollapsed) setSel(null);
        return;
      }
      const anchor = s.anchorNode;
      if (!anchor || !root.contains(anchor)) {
        setSel(null);
        return;
      }
      const quote = s.toString().trim().slice(0, QUOTE_LIMIT);
      if (quote.length < 2) {
        setSel(null);
        return;
      }
      const full = root.innerText ?? '';
      const idx = full.indexOf(quote.slice(0, 120));
      const { prefix, suffix } = idx >= 0 ? contextOf(full, idx, idx + quote.length) : { prefix: '', suffix: '' };
      const rect = s.getRangeAt(0).getBoundingClientRect();
      setPos({
        x: clamp(rect.left + rect.width / 2 - 130, 8, window.innerWidth - 268),
        y: rect.top > 120 ? rect.top - 56 : rect.bottom + 12,
      });
      setSel({ quote, prefix, suffix, headingId: headingAbove(anchor, root) });
      setMode('toolbar');
    };
    document.addEventListener('mouseup', onSel);
    document.addEventListener('keyup', onSel);
    return () => {
      document.removeEventListener('mouseup', onSel);
      document.removeEventListener('keyup', onSel);
    };
  }, [containerRef]);

  // Click a highlight to edit it; Escape / outside click closes.
  useEffect(() => {
    const root = containerRef.current;
    const onClick = (e: MouseEvent) => {
      const mark = (e.target as HTMLElement).closest?.('[data-note-id]');
      if (mark && root?.contains(mark)) {
        const note = noteStore.get().notes.find((n) => n.id === mark.getAttribute('data-note-id'));
        if (note) {
          const r = mark.getBoundingClientRect();
          setPos({ x: clamp(r.left, 8, window.innerWidth - 328), y: r.bottom + 8 });
          setEditing(note);
          setColor(note.color);
          setText(note.note);
          setStatus(null);
          setSel(null);
        }
      }
    };
    const onDown = (e: MouseEvent) => {
      if (openRef.current && panelRef.current && !panelRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    root?.addEventListener('click', onClick);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      root?.removeEventListener('click', onClick);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [containerRef, close]);

  if (!sel && !editing) return null;
  const showEditor = editing || mode === 'editor';

  const saveHighlight = (withCard: boolean, from: FreshSel) => {
    const finish = (cardId?: string, dup?: boolean) => {
      noteStore.add({
        pageKey,
        pageUrl,
        pageTitle,
        topic,
        headingId: from.headingId,
        quote: from.quote,
        prefix: from.prefix,
        suffix: from.suffix,
        color,
        note: text.trim(),
        ...(cardId ? { cardId } : {}),
      });
      if (dup) setStatus('Highlight saved — that card was already in your deck.');
      else close();
      window.getSelection()?.collapseToEnd();
    };
    if (!withCard) {
      finish();
      return;
    }
    getCards()
      .then((bank) =>
        customCards.add(
          [{ t: topic, kind: 'recall', q: from.quote, ans: text.trim(), sourceUrl: pageUrl, sourceTitle: pageTitle, ai: false }],
          bank,
        ),
      )
      .then((added) => finish(added[0]?.id, !added.length))
      .catch(() => finish());
  };

  return (
    <div ref={panelRef} className="sel-pop" style={{ left: pos.x, top: pos.y }}>
      {showEditor ? (
        <div role="dialog" aria-label={editing ? 'Edit highlight' : 'Save highlight'} data-testid="hl-editor">
          <div className="hl-colors" role="group" aria-label="Highlight color">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`hl-dot hl-${c} ${color === c ? 'on' : ''}`}
                aria-label={`Highlight color ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <blockquote className="hl-quote">{editing ? editing.quote : sel!.quote}</blockquote>
          <label className="field">
            <span className="field-label">Note {sel && !editing ? '(used as the card answer for flashcards)' : ''}</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Why does this matter?…" data-testid="hl-note-input" />
          </label>
          {status ? (
            <p className="muted small" role="status">
              {status}
            </p>
          ) : null}
          <div className="row">
            {editing ? (
              <>
                <button type="button" className="btn btn-primary btn-sm" data-testid="hl-update" onClick={() => { noteStore.update(editing.id, { color, note: text.trim() }); close(); }}>
                  Update
                </button>
                <button type="button" className="btn btn-sm btn-danger" data-testid="hl-delete" onClick={() => { noteStore.remove(editing.id); close(); }}>
                  Delete
                </button>
                <button type="button" className="btn btn-sm" onClick={close}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-primary btn-sm" data-testid="hl-save" onClick={() => saveHighlight(false, sel!)}>
                  Save highlight
                </button>
                <button type="button" className="btn btn-sm btn-accent" data-testid="hl-save-card" disabled={!text.trim()} title="Note text becomes the card answer" onClick={() => saveHighlight(true, sel!)}>
                  Save + card
                </button>
                <button type="button" className="btn btn-sm" onClick={close}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div role="toolbar" aria-label="Highlight selection" className="sel-toolbar" data-testid="sel-toolbar">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`hl-dot hl-${c}`}
              aria-label={`Highlight ${c}`}
              data-testid={`hl-color-${c}`}
              onClick={() => {
                if (!sel) return;
                noteStore.add({ pageKey, pageUrl, pageTitle, topic, headingId: sel.headingId, quote: sel.quote, prefix: sel.prefix, suffix: sel.suffix, color: c, note: '' });
                close();
                window.getSelection()?.collapseToEnd();
              }}
            />
          ))}
          <button type="button" className="btn btn-sm" data-testid="hl-note-btn" onClick={() => { setText(''); setStatus(null); setMode('editor'); }}>
            Add note
          </button>
          <button type="button" className="btn btn-sm" data-testid="hl-card-btn" onClick={() => { setText(''); setStatus(null); setMode('editor'); }}>
            Make flashcard
          </button>
        </div>
      )}
    </div>
  );
}
