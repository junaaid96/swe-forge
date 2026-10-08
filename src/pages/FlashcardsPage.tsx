import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCards, useCatalog } from '../lib/content';
import { progress, useProgress } from '../lib/progress';
import { buildQueue } from '../lib/stats';
import { dayKey, intervalLabel, isMastered, previewIntervals, type Grade } from '../lib/srs';
import { useHotkeys } from '../lib/hotkeys';
import { SOURCE_LABEL, type Card, type CardSource } from '../lib/types';
import { PageFallback } from '../components/Layout';
import { IconArrowRight, IconCards } from '../components/Icons';

const GRADES: Array<{ g: Grade; label: string; key: string; cls: string }> = [
  { g: 0, label: 'Again', key: '1', cls: 'btn-bad' },
  { g: 3, label: 'Hard', key: '2', cls: 'btn-warn' },
  { g: 4, label: 'Good', key: '3', cls: 'btn-good' },
  { g: 5, label: 'Easy', key: '4', cls: 'btn-accent' },
];
const SOURCES: CardSource[] = ['interview', 'prep', 'mcq', 'concept'];

function Session({ initial, onDone }: { initial: Card[]; onDone: (n: number) => void }) {
  const state = useProgress();
  const [queue, setQueue] = useState(initial);
  const [flipped, setFlipped] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [done, setDone] = useState(0);
  const card = queue[0];
  const prev = card ? state.cards[card.id] : undefined;
  const preview = card ? previewIntervals(prev, card.t) : null;

  const grade = (g: Grade) => {
    if (!card || !flipped) return;
    progress.reviewCard(card.id, card.t, g);
    const rest = queue.slice(1);
    // "Again" comes back later in this session.
    const nextQ = g === 0 ? [...rest.slice(0, 3), card, ...rest.slice(3)] : rest;
    setQueue(nextQ);
    setFlipped(false);
    setChoice(null);
    setDone((d) => d + 1);
    if (!nextQ.length) onDone(done + 1);
  };

  useHotkeys({
    ' ': (e) => {
      e.preventDefault();
      if (!flipped && !card?.opts) setFlipped(true);
    },
    Enter: () => !flipped && !card?.opts && setFlipped(true),
    '1': () => grade(0),
    '2': () => grade(3),
    '3': () => grade(4),
    '4': () => grade(5),
  });

  if (!card) return null;
  const isMcq = Boolean(card.opts?.length);
  const correct = isMcq && choice === card.ci;

  return (
    <div className="fc-session">
      <div className="fc-progress">
        <span>
          {done} reviewed · {queue.length} left
        </span>
        <span className="chip">{SOURCE_LABEL[card.src]}</span>
        {!prev ? <span className="chip chip-accent">New</span> : null}
      </div>
      <div className={`flashcard card ${flipped ? 'flipped' : ''}`} aria-live="polite">
        <p className="fc-ctx">{card.ctx}</p>
        <h2 className="fc-q">{card.q}</h2>
        {isMcq ? (
          <div className="options" role="radiogroup" aria-label="Choose an answer">
            {card.opts!.map((o, i) => {
              const st = choice === null ? '' : i === card.ci ? 'correct' : i === choice ? 'wrong' : '';
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={choice === i}
                  className={`option ${st}`}
                  disabled={choice !== null}
                  onClick={() => {
                    setChoice(i);
                    setFlipped(true);
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
        ) : null}
        {flipped ? (
          <div className="fc-answer">
            {isMcq ? <p className={correct ? 'good' : 'bad'}>{correct ? 'Correct!' : 'Not quite.'}</p> : null}
            <p>{card.ans}</p>
            {card.x ? <p className="fc-takeaway">💡 {card.x}</p> : null}
            <Link className="small" to={card.a ? `${card.u}#${card.a}` : card.u}>
              Open source page <IconArrowRight width={12} height={12} />
            </Link>
          </div>
        ) : !isMcq ? (
          <button type="button" className="btn btn-primary btn-lg fc-show" onClick={() => setFlipped(true)} autoFocus>
            Show answer <kbd>Space</kbd>
          </button>
        ) : null}
      </div>
      {flipped && preview ? (
        <div className="fc-grades" role="group" aria-label="How well did you recall it?">
          {GRADES.map(({ g, label, key, cls }) => (
            <button key={g} type="button" className={`btn ${cls} ${isMcq && ((correct && g === 4) || (!correct && g === 0)) ? 'suggested' : ''}`} onClick={() => grade(g)}>
              <strong>{label}</strong>
              <small>
                {intervalLabel(preview[g])} · <kbd>{key}</kbd>
              </small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FlashcardsPage() {
  const { data: cards, loading } = useCards();
  const { data: catalog } = useCatalog();
  const state = useProgress();
  const [params, setParams] = useSearchParams();
  const [session, setSession] = useState<Card[] | null>(null);
  const [finished, setFinished] = useState<number | null>(null);
  const today = dayKey();

  useEffect(() => {
    document.title = 'Flashcards · Forgeline';
  }, []);

  // ?topic=slug focuses the deck on one topic.
  useEffect(() => {
    const t = params.get('topic');
    if (t) {
      progress.setSrs({ topics: [t] });
      params.delete('topic');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const queue = useMemo(() => (cards ? buildQueue(cards, state, today) : null), [cards, state, today]);
  const counts = useMemo(() => {
    const vals = Object.values(state.cards);
    return { learned: vals.filter((c) => c.reps > 0 || c.lapses > 0).length, mastered: vals.filter(isMastered).length };
  }, [state.cards]);

  if (loading || !cards || !queue || !catalog) return <PageFallback />;

  if (session) {
    return (
      <div className="page narrow">
        <div className="page-head row-between">
          <h1>Review</h1>
          <button type="button" className="btn" onClick={() => setSession(null)}>
            End session
          </button>
        </div>
        <Session
          initial={session}
          onDone={(n) => {
            setSession(null);
            setFinished(n);
          }}
        />
      </div>
    );
  }

  const { srs } = state;
  const toggleTopic = (slug: string) => progress.setSrs({ topics: srs.topics.includes(slug) ? srs.topics.filter((x) => x !== slug) : [...srs.topics, slug] });
  const toggleSource = (src: string) => progress.setSrs({ sources: srs.sources.includes(src) ? srs.sources.filter((x) => x !== src) : [...srs.sources, src] });
  const total = queue.due.length + queue.fresh.length;
  const reviewedToday = state.reviews[today] ?? 0;

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Spaced repetition</p>
        <h1>Flashcards</h1>
        <p className="lead">
          {cards.length.toLocaleString()} cards generated from every guide, interview answer, prep-map concept and MCQ. Reviews follow the SM-2 algorithm: cards you know drift
          out to weeks or months, and cards you miss come back tomorrow.
        </p>
      </header>

      {finished !== null ? (
        <div className="card pad success-banner" role="status">
          🎉 Session complete: {finished} review{finished === 1 ? '' : 's'}. {queue.due.length ? `${queue.due.length} still due.` : 'Your queue is clear for today.'}
        </div>
      ) : null}

      <section className="fc-stats">
        <div className="stat card">
          <strong>{queue.due.length}</strong>
          <span>due now</span>
        </div>
        <div className="stat card">
          <strong>{queue.fresh.length}</strong>
          <span>new today</span>
        </div>
        <div className="stat card">
          <strong>{reviewedToday}</strong>
          <span>reviewed today</span>
        </div>
        <div className="stat card">
          <strong>{counts.learned}</strong>
          <span>learned</span>
        </div>
        <div className="stat card">
          <strong>{counts.mastered}</strong>
          <span>mastered (21d+)</span>
        </div>
      </section>

      <div className="row">
        <button type="button" className="btn btn-primary btn-lg" disabled={!total} onClick={() => { setFinished(null); setSession([...queue.due, ...queue.fresh]); }}>
          <IconCards /> {total ? `Start review (${total})` : 'Nothing to review'}
        </button>
        {!total && queue.available ? <span className="muted">You've hit today's new-card limit. Raise it below or come back tomorrow.</span> : null}
      </div>

      <section className="card pad deck-settings" aria-labelledby="deck-h">
        <h2 id="deck-h">Deck</h2>
        <div className="field">
          <span className="field-label">Topics {srs.topics.length ? `(${srs.topics.length} selected)` : '(all)'}</span>
          <div className="chips">
            <button type="button" className={`chip chip-toggle ${srs.topics.length === 0 ? 'on' : ''}`} onClick={() => progress.setSrs({ topics: [] })} aria-pressed={srs.topics.length === 0}>
              All topics
            </button>
            {catalog.topics
              .filter((t) => t.cardCount)
              .map((t) => (
                <button key={t.slug} type="button" className={`chip chip-toggle ${srs.topics.includes(t.slug) ? 'on' : ''}`} onClick={() => toggleTopic(t.slug)} aria-pressed={srs.topics.includes(t.slug)}>
                  {t.emoji} {t.title} <small>{t.cardCount}</small>
                </button>
              ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Card types</span>
          <div className="chips">
            {SOURCES.map((src) => (
              <button key={src} type="button" className={`chip chip-toggle ${srs.sources.includes(src) ? 'on' : ''}`} onClick={() => toggleSource(src)} aria-pressed={srs.sources.includes(src)}>
                {SOURCE_LABEL[src]}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span className="field-label">New cards per day: {srs.newPerDay}</span>
          <input type="range" min={0} max={60} step={5} value={srs.newPerDay} onChange={(e) => progress.setSrs({ newPerDay: Number(e.target.value) })} />
        </label>
        <p className="muted small">Due cards are always shown, whatever deck you pick. The deck only controls which new cards get introduced.</p>
      </section>
    </div>
  );
}

export default FlashcardsPage;
