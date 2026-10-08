import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCards, useCatalog } from '../lib/content';
import { progress, useProgress, type MockAnswer, type MockResult } from '../lib/progress';
import { SOURCE_LABEL, type Card, type CardSource, type Catalog } from '../lib/types';
import { PageFallback } from '../components/Layout';
import { Bar, Ring } from '../components/Ring';
import { IconArrowRight, IconTimer } from '../components/Icons';

type Phase = 'setup' | 'running' | 'summary';
const COUNTS = [5, 10, 15, 20];
const TIMES = [0, 10, 20, 30, 45];
const TYPES: CardSource[] = ['mcq', 'interview', 'prep', 'concept'];

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick questions spread across topics, preferring MCQs and interview questions. */
function pickQuestions(cards: Card[], topics: string[], types: CardSource[], n: number) {
  const pool = cards.filter((c) => (!topics.length || topics.includes(c.t)) && types.includes(c.src));
  const byTopic = new Map<string, Card[]>();
  for (const c of shuffle(pool)) (byTopic.get(c.t) ?? byTopic.set(c.t, []).get(c.t)!).push(c);
  const lists = shuffle([...byTopic.values()]);
  const out: Card[] = [];
  for (let i = 0; out.length < n && lists.some((l) => l.length > i); i++) for (const l of lists) if (l[i] && out.length < n) out.push(l[i]);
  return shuffle(out);
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function Summary({ result, catalog, onAgain }: { result: MockResult; catalog: Catalog; onAgain: () => void }) {
  const total = result.answers.length;
  const score = result.answers.reduce((a, x) => a + x.score, 0);
  const pct = total ? Math.round((score / total) * 100) : 0;
  const byTopic = new Map<string, { s: number; n: number }>();
  for (const a of result.answers) {
    const x = byTopic.get(a.topic) ?? { s: 0, n: 0 };
    x.s += a.score;
    x.n += 1;
    byTopic.set(a.topic, x);
  }
  const rows = [...byTopic.entries()].map(([slug, v]) => ({ slug, pct: Math.round((v.s / v.n) * 100), n: v.n, t: catalog.topics.find((t) => t.slug === slug) })).sort((a, b) => a.pct - b.pct);
  const weak = rows.filter((r) => r.pct < 60);
  const missed = result.answers.filter((a) => a.score < 1);
  const [queued, setQueued] = useState(false);

  return (
    <div className="mock-summary">
      <section className="card pad summary-head">
        <Ring value={pct} size={110} stroke={10} label={`Score ${pct}%`} color={pct >= 75 ? 'var(--good)' : pct >= 50 ? 'var(--warn)' : 'var(--bad)'} />
        <div>
          <p className="eyebrow">Mock interview complete</p>
          <h2>
            {score % 1 ? score.toFixed(1) : score}/{total} · {pct >= 80 ? 'Interview-ready' : pct >= 60 ? 'Solid, with gaps' : 'Keep drilling'}
          </h2>
          <p className="muted">
            {fmt(result.durationSec)} used{result.timeLimitSec ? ` of ${fmt(result.timeLimitSec)}` : ''} · {rows.length} topic{rows.length === 1 ? '' : 's'}
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={onAgain}>
              New mock interview
            </button>
            {missed.length ? (
              <button
                type="button"
                className="btn"
                disabled={queued}
                onClick={() => {
                  progress.dueToday(missed.map((m) => ({ id: m.cardId, topic: m.topic })));
                  setQueued(true);
                }}
              >
                {queued ? 'Added to today’s flashcards ✓' : `Add ${missed.length} missed to flashcards`}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card pad">
        <h2>By topic</h2>
        <ul className="score-rows">
          {rows.map((r) => (
            <li key={r.slug}>
              <span>
                {r.t?.emoji} {r.t?.title ?? r.slug} <small className="muted">({r.n})</small>
              </span>
              <Bar value={r.pct} color={r.pct >= 75 ? 'var(--good)' : r.pct >= 50 ? 'var(--warn)' : 'var(--bad)'} label={`${r.pct}%`} />
              <strong>{r.pct}%</strong>
            </li>
          ))}
        </ul>
      </section>

      {weak.length ? (
        <section className="card pad weak-areas">
          <h2>Weak areas</h2>
          <ul>
            {weak.map((r) => {
              const unread = r.t?.pages.find((p) => !progress.get().pages[p.key]?.readAt) ?? r.t?.pages[0];
              return (
                <li key={r.slug}>
                  <strong>
                    {r.t?.emoji} {r.t?.title}: {r.pct}%
                  </strong>
                  <span className="row">
                    {unread ? (
                      <Link to={unread.url} className="btn btn-sm">
                        Study: {unread.title}
                      </Link>
                    ) : null}
                    <Link to={`/flashcards?topic=${r.slug}`} className="btn btn-sm">
                      Drill cards
                    </Link>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {missed.length ? (
        <section className="card pad">
          <h2>Review these</h2>
          <ul className="missed">
            {missed.map((m) => (
              <li key={m.cardId}>
                <span className={`chip ${m.score ? 'chip-warn' : 'chip-bad'}`}>{m.score ? 'Partial' : 'Missed'}</span>
                <Link to={m.url}>{m.q}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function MockPage() {
  const { data: cards, loading } = useCards();
  const { data: catalog } = useCatalog();
  const state = useProgress();
  const [params] = useSearchParams();
  const [phase, setPhase] = useState<Phase>('setup');
  const [topics, setTopics] = useState<string[]>(() => params.get('topics')?.split(',').filter(Boolean) ?? []);
  const [types, setTypes] = useState<CardSource[]>(['mcq', 'interview', 'prep']);
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(10);
  const [questions, setQuestions] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<MockAnswer[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<MockResult | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    document.title = 'Mock interview · Forgeline';
  }, []);

  const poolSize = useMemo(() => (cards ? cards.filter((c) => (!topics.length || topics.includes(c.t)) && types.includes(c.src)).length : 0), [cards, topics, types]);

  const finish = (final: MockAnswer[]) => {
    const r: MockResult = {
      id: String(Date.now()),
      at: Date.now(),
      topics: [...new Set(final.map((a) => a.topic))],
      durationSec: Math.round((Date.now() - startRef.current) / 1000),
      timeLimitSec: minutes * 60,
      answers: final,
    };
    if (final.length) progress.saveMock(r);
    setResult(r);
    setPhase('summary');
  };

  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [phase]);

  const remaining = minutes ? minutes * 60 - elapsed : null;
  useEffect(() => {
    if (phase === 'running' && remaining !== null && remaining <= 0) finish(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  if (loading || !cards || !catalog) return <PageFallback />;

  const start = () => {
    const qs = pickQuestions(cards, topics, types, count);
    if (!qs.length) return;
    setQuestions(qs);
    setI(0);
    setAnswers([]);
    setRevealed(false);
    setChoice(null);
    setElapsed(0);
    startRef.current = Date.now();
    setPhase('running');
  };

  const answer = (score: number) => {
    const q = questions[i];
    const next = [...answers, { cardId: q.id, topic: q.t, q: q.q, url: q.a ? `${q.u}#${q.a}` : q.u, score }];
    setAnswers(next);
    setRevealed(false);
    setChoice(null);
    if (i + 1 >= questions.length) finish(next);
    else setI(i + 1);
  };

  if (phase === 'summary' && result) {
    return (
      <div className="page">
        <header className="page-head">
          <p className="eyebrow">Mock interview</p>
          <h1>Your results</h1>
        </header>
        <Summary result={result} catalog={catalog} onAgain={() => setPhase('setup')} />
      </div>
    );
  }

  if (phase === 'running') {
    const q = questions[i];
    const isMcq = Boolean(q.opts?.length);
    const topic = catalog.topics.find((t) => t.slug === q.t);
    return (
      <div className="page narrow mock-run">
        <div className="mock-bar">
          <span>
            Question {i + 1} / {questions.length}
          </span>
          <Bar value={(i / questions.length) * 100} label="Progress" />
          <span className={`timer ${remaining !== null && remaining < 60 ? 'urgent' : ''}`} role="timer" aria-live="off">
            <IconTimer width={16} height={16} /> {remaining !== null ? fmt(Math.max(0, remaining)) : fmt(elapsed)}
          </span>
          <button type="button" className="btn btn-sm" onClick={() => finish(answers)}>
            Finish now
          </button>
        </div>
        <article className="card pad mock-q" style={{ ['--topic' as string]: topic?.accent }}>
          <p className="fc-ctx">
            {topic?.emoji} {q.ctx} · {SOURCE_LABEL[q.src]}
          </p>
          <h2>{q.q}</h2>
          {isMcq ? (
            <div className="options" role="radiogroup" aria-label="Choose an answer">
              {q.opts!.map((o, k) => {
                const st = choice === null ? '' : k === q.ci ? 'correct' : k === choice ? 'wrong' : '';
                return (
                  <button key={k} type="button" role="radio" aria-checked={choice === k} className={`option ${st}`} disabled={choice !== null} onClick={() => { setChoice(k); setRevealed(true); }}>
                    {o}
                  </button>
                );
              })}
            </div>
          ) : !revealed ? (
            <>
              <p className="muted">Answer out loud or jot notes as if the interviewer just asked. Then compare with the model answer.</p>
              <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)} autoFocus>
                Reveal model answer
              </button>
            </>
          ) : null}
          {revealed ? (
            <div className="fc-answer">
              {isMcq ? <p className={choice === q.ci ? 'good' : 'bad'}>{choice === q.ci ? 'Correct!' : 'Not quite.'}</p> : null}
              <p>{q.ans}</p>
              {q.x ? <p className="fc-takeaway">💡 {q.x}</p> : null}
            </div>
          ) : null}
          {revealed ? (
            isMcq ? (
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={() => answer(choice === q.ci ? 1 : 0)} autoFocus>
                  Next question <IconArrowRight />
                </button>
              </div>
            ) : (
              <div className="row self-grade" role="group" aria-label="Grade your answer">
                <span className="muted">How did you do?</span>
                <button type="button" className="btn btn-bad" onClick={() => answer(0)}>
                  Missed it
                </button>
                <button type="button" className="btn btn-warn" onClick={() => answer(0.5)}>
                  Partially
                </button>
                <button type="button" className="btn btn-good" onClick={() => answer(1)}>
                  Nailed it
                </button>
              </div>
            )
          ) : null}
        </article>
      </div>
    );
  }

  const history = state.mocks.slice(0, 8);
  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Practice under pressure</p>
        <h1>Mock interview</h1>
        <p className="lead">
          A timed session that pulls random questions from the topics you choose. MCQs are graded automatically; open questions are self-graded against a model answer. You get
          a score, a per-topic breakdown and your weak areas at the end.
        </p>
      </header>

      <section className="card pad mock-setup" aria-labelledby="setup-h">
        <h2 id="setup-h">Set up your session</h2>
        <div className="field">
          <span className="field-label">Topics {topics.length ? `(${topics.length})` : '(mixed: all topics)'}</span>
          <div className="chips">
            <button type="button" className={`chip chip-toggle ${!topics.length ? 'on' : ''}`} onClick={() => setTopics([])} aria-pressed={!topics.length}>
              All topics
            </button>
            {catalog.groups.map((g) =>
              g.topics.map((slug) => {
                const t = catalog.topics.find((x) => x.slug === slug);
                if (!t?.cardCount) return null;
                const on = topics.includes(slug);
                return (
                  <button key={slug} type="button" className={`chip chip-toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setTopics(on ? topics.filter((x) => x !== slug) : [...topics, slug])}>
                    {t.emoji} {t.title}
                  </button>
                );
              }),
            )}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Question types</span>
          <div className="chips">
            {TYPES.map((ty) => {
              const on = types.includes(ty);
              return (
                <button key={ty} type="button" className={`chip chip-toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setTypes(on ? types.filter((x) => x !== ty) : [...types, ty])}>
                  {SOURCE_LABEL[ty]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <span className="field-label">Questions</span>
            <div className="segmented" role="radiogroup" aria-label="Number of questions">
              {COUNTS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={count === c} className={count === c ? 'on' : ''} onClick={() => setCount(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">Time limit</span>
            <div className="segmented" role="radiogroup" aria-label="Time limit">
              {TIMES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={minutes === m} className={minutes === m ? 'on' : ''} onClick={() => setMinutes(m)}>
                  {m ? `${m}m` : 'None'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn btn-primary btn-lg" disabled={!poolSize || !types.length} onClick={start}>
            <IconTimer /> Start mock interview
          </button>
          <span className="muted small">{poolSize.toLocaleString()} questions match these settings.</span>
        </div>
      </section>

      {history.length ? (
        <section className="card pad">
          <h2>Recent sessions</h2>
          <table className="history">
            <thead>
              <tr>
                <th>Date</th>
                <th>Score</th>
                <th>Questions</th>
                <th>Topics</th>
              </tr>
            </thead>
            <tbody>
              {history.map((m) => {
                const s = m.answers.reduce((a, x) => a + x.score, 0);
                const pct = m.answers.length ? Math.round((s / m.answers.length) * 100) : 0;
                return (
                  <tr key={m.id}>
                    <td>{new Date(m.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td>
                      <strong>{pct}%</strong>
                    </td>
                    <td>{m.answers.length}</td>
                    <td className="muted">{m.topics.map((t) => catalog.topics.find((x) => x.slug === t)?.title ?? t).join(', ')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

export default MockPage;
