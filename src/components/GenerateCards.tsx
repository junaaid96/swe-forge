import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AiError, chat, clip } from '../lib/ai';
import { getCards } from '../lib/content';
import { customCards, useCustomCards, type NewCustomCard } from '../lib/customCards';
import { useDialogFocus } from '../lib/focus';

interface Props {
  open: boolean;
  onClose: () => void;
  pageTitle: string;
  topic: string;
  sourceUrl: string;
  body: string;
}

interface Draft {
  key: string;
  kind: 'recall' | 'mcq';
  q: string;
  ans: string;
  opts: string[];
  ci: number;
}

type Phase = 'idle' | 'busy' | 'preview' | 'error';

const SYSTEM = `You write flashcards for software-engineering study. Reply ONLY with JSON, no markdown fences:
{"cards": [{"type": "recall"|"mcq", "question": "...", "answer": "...", "options": ["..."], "correctIndex": 0}]}
Rules: 4-8 cards mixing recall and mcq. Recall cards need a one-paragraph answer. MCQ cards need 3-4 options with exactly one correct (correctIndex) and the answer restating the correct option. Keep questions atomic and grounded in the given material.`;

function parseDrafts(text: string): { drafts: Draft[]; dropped: number } {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no-json');
  const v = JSON.parse(m[0]) as { cards?: Array<Record<string, unknown>> };
  if (!Array.isArray(v.cards) || !v.cards.length) throw new Error('no-cards');
  const drafts: Draft[] = [];
  let dropped = 0;
  v.cards.forEach((c, i) => {
    const kind = c.type === 'mcq' ? 'mcq' : c.type === 'recall' ? 'recall' : null;
    const q = typeof c.question === 'string' ? c.question.trim() : '';
    const ans = typeof c.answer === 'string' ? c.answer.trim() : '';
    if (!kind || !q) {
      dropped += 1;
      return;
    }
    if (kind === 'recall') {
      if (!ans) {
        dropped += 1;
        return;
      }
      drafts.push({ key: `d${i}`, kind, q, ans, opts: [], ci: 0 });
      return;
    }
    const opts = Array.isArray(c.options) ? c.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0).map((o) => o.trim()) : [];
    const ci = typeof c.correctIndex === 'number' ? c.correctIndex : -1;
    if (opts.length < 2 || opts.length > 6 || !Number.isInteger(ci) || ci < 0 || ci >= opts.length) {
      dropped += 1;
      return;
    }
    drafts.push({ key: `d${i}`, kind, q, ans: ans || opts[ci], opts, ci });
  });
  if (!drafts.length) throw new Error('no-valid');
  return { drafts, dropped };
}

export function GenerateCards({ open, onClose, pageTitle, topic, sourceUrl, body }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const customs = useCustomCards();
  const [phase, setPhase] = useState<Phase>('idle');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [dropped, setDropped] = useState(0);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<string | null>(null);
  useDialogFocus(open, onClose, dialogRef);

  useEffect(() => {
    if (open) {
      setPhase('idle');
      setDrafts([]);
      setErr('');
      setDone(null);
    }
  }, [open ]);

  if (!open) return null;

  const generate = async () => {
    setPhase('busy');
    setErr('');
    setDone(null);
    try {
      const r = await chat(
        [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Page: ${pageTitle}\n\n${clip(body, 5000)}` },
        ],
        { maxTokens: 1500, temperature: 0.5 },
      );
      const { drafts: ds, dropped: n } = parseDrafts(r.text);
      setDrafts(ds);
      setDropped(n);
      setPhase('preview');
    } catch (e) {
      setPhase('error');
      if (e instanceof AiError) setErr(e.message);
      else if (e instanceof Error && ['no-json', 'no-cards', 'no-valid'].includes(e.message)) {
        setErr('The AI reply was not valid card JSON. Try again — a retry usually fixes it.');
      } else setErr('Something went wrong. Try again.');
    }
  };

  const patch = (key: string, p: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...p } : d)));

  const accept = async () => {
    const items: NewCustomCard[] = drafts
      .filter((d) => d.q.trim() && d.ans.trim() && (d.kind === 'recall' || (d.opts.length >= 2 && d.ci >= 0 && d.ci < d.opts.length)))
      .map((d) => ({ t: topic, kind: d.kind, q: d.q.trim(), ans: d.ans.trim(), sourceUrl, sourceTitle: pageTitle, ai: true, ...(d.kind === 'mcq' ? { opts: d.opts, ci: d.ci } : {}) }));
    if (!items.length) {
      setErr('Nothing valid to accept — edit or delete the drafts first.');
      return;
    }
    const bank = await getCards().catch(() => []);
    const added = customCards.add(items, bank);
    const skipped = items.length - added.length;
    setDone(`${added.length} card${added.length === 1 ? '' : 's'} added to your deck${skipped ? `, ${skipped} duplicate${skipped === 1 ? '' : 's'} skipped` : ''}.`);
    setDrafts([]);
    setPhase('idle');
  };

  return createPortal(
    <div className="modal-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog gen-dialog" role="dialog" aria-modal="true" aria-label="Generate flashcards" ref={dialogRef} data-testid="gen-cards">
        <h2>Generate cards</h2>
        <p className="muted small">
          From “{pageTitle}”, using your Groq key and daily token budget. Review every card before accepting it.
        </p>
        {phase === 'idle' && !done ? (
          <div className="row">
            <button type="button" className="btn btn-primary" data-testid="gen-start" onClick={generate}>
              Generate from this page
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        ) : null}
        {phase === 'busy' ? (
          <p role="status" className="muted">
            Asking the AI for cards…
          </p>
        ) : null}
        {phase === 'error' ? (
          <div>
            <p className="tool-error" role="alert">
              {err}
            </p>
            <div className="row">
              <button type="button" className="btn btn-primary" data-testid="gen-retry" onClick={generate}>
                Retry
              </button>
              <button type="button" className="btn" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : null}
        {done ? (
          <div>
            <p className="good" role="status">
              {done}
            </p>
            <div className="row">
              <button type="button" className="btn" data-testid="gen-again" onClick={generate}>
                Generate more
              </button>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : null}
        {phase === 'preview' ? (
          <div className="gen-preview">
            {dropped ? (
              <p className="muted small" role="note">
                {dropped} invalid suggestion{dropped === 1 ? '' : 's'} dropped.
              </p>
            ) : null}
            <ol>
              {drafts.map((d) => (
                <li key={d.key} className="card pad gen-draft" data-testid="gen-draft">
                  <p className="eyebrow">{d.kind === 'mcq' ? 'Multiple choice' : 'Recall'}</p>
                  <label className="field">
                    <span className="field-label">Question</span>
                    <textarea value={d.q} onChange={(e) => patch(d.key, { q: e.target.value })} rows={2} />
                  </label>
                  <label className="field">
                    <span className="field-label">Answer</span>
                    <textarea value={d.ans} onChange={(e) => patch(d.key, { ans: e.target.value })} rows={2} />
                  </label>
                  {d.kind === 'mcq' ? (
                    <fieldset className="field">
                      <legend className="field-label">Options (pick the correct one)</legend>
                      {d.opts.map((o, i) => (
                        <label key={i} className="gen-opt">
                          <input type="radio" name={`ci-${d.key}`} checked={d.ci === i} onChange={() => patch(d.key, { ci: i })} aria-label={`Correct option ${i + 1}`} />
                          <input type="text" value={o} onChange={(e) => patch(d.key, { opts: d.opts.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`Option ${i + 1}`} />
                        </label>
                      ))}
                    </fieldset>
                  ) : null}
                  <div className="row">
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <label className="switch">
              <input type="checkbox" checked={customs.includeMcqInSessions} onChange={(e) => customCards.setIncludeMcq(e.target.checked)} />
              <span>Include AI multiple-choice in mock interviews and arena</span>
            </label>
            <div className="row">
              <button type="button" className="btn btn-primary" data-testid="gen-accept" onClick={accept} disabled={!drafts.length}>
                Accept {drafts.length} card{drafts.length === 1 ? '' : 's'}
              </button>
              <button type="button" className="btn" onClick={generate}>
                Regenerate
              </button>
              <button type="button" className="btn" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
