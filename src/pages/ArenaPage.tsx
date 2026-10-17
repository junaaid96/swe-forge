/** Quiz Arena: rapid-fire MCQ game with timer, lives, combos and local bests. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCards, useCatalog } from '../lib/content';
import { PageFallback } from '../components/Layout';
import { IconBolt, IconTimer } from '../components/Icons';
import type { Card } from '../lib/types';

const BEST_KEY = 'forgeline:arena:v1';
const PER_QUESTION_SEC = 15;
const LIVES = 3;
const COUNTS = [10, 20];

interface Best {
  best: number;
  games: number;
  wins: number;
}

function loadBest(): Best {
  try {
    const b = JSON.parse(localStorage.getItem(BEST_KEY) ?? 'null') as Best | null;
    if (b && typeof b.best === 'number') return b;
  } catch { /* fresh */ }
  return { best: 0, games: 0, wins: 0 };
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Q {
  card: Card;
  opts: string[];
  ci: number;
}

type Phase = 'setup' | 'run' | 'over';

export function ArenaPage() {
  const { data: cards, loading } = useCards();
  const { data: catalog } = useCatalog();
  const [phase, setPhase] = useState<Phase>('setup');
  const [topics, setTopics] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [qs, setQs] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(PER_QUESTION_SEC);
  const [missed, setMissed] = useState<Q[]>([]);
  const [correct, setCorrect] = useState(0);
  const [best, setBest] = useState<Best>(loadBest);
  const [newBest, setNewBest] = useState(false);
  const timerRef = useRef(0);

  useEffect(() => {
    document.title = 'Quiz Arena · Forgeline';
  }, []);

  const pool = useMemo(() => {
    if (!cards) return [];
    return cards.filter((c) => c.opts && c.opts.length >= 2 && (!topics.length || topics.includes(c.t)));
  }, [cards, topics]);

  const start = () => {
    const chosen = shuffle(pool).slice(0, Math.min(count, pool.length)).map((card) => {
      const order = shuffle(card.opts!.map((_, k) => k));
      return { card, opts: order.map((k) => card.opts![k]), ci: order.indexOf(card.ci!) };
    });
    if (!chosen.length) return;
    setQs(chosen);
    setI(0);
    setLives(LIVES);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setPicked(null);
    setMissed([]);
    setCorrect(0);
    setNewBest(false);
    setLeft(PER_QUESTION_SEC);
    setPhase('run');
  };

  const finish = (finalScore: number, won: boolean) => {
    setBest((prev) => {
      const next = { best: Math.max(prev.best, finalScore), games: prev.games + 1, wins: prev.wins + (won ? 1 : 0) };
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      setNewBest(finalScore > prev.best && finalScore > 0);
      return next;
    });
    setPhase('over');
  };

  // Countdown per question.
  useEffect(() => {
    if (phase !== 'run' || picked !== null) return;
    timerRef.current = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 0.1) {
          window.clearInterval(timerRef.current);
          // Timeout counts as a miss — handled by the watcher below.
          return 0;
        }
        return Math.round((l - 0.1) * 10) / 10;
      });
    }, 100);
    return () => window.clearInterval(timerRef.current);
  }, [phase, picked, i]);

  // Timeout watcher.
  useEffect(() => {
    if (phase === 'run' && picked === null && left <= 0) resolve(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase, picked]);

  const resolve = (k: number) => {
    if (picked !== null) return;
    window.clearInterval(timerRef.current);
    const q = qs[i];
    const ok = k === q.ci;
    setPicked(k);
    if (ok) {
      const combo = 1 + Math.min(streak, 10) * 0.1;
      const gained = Math.round((100 + Math.max(0, left) * 5) * combo);
      setScore((s) => s + gained);
      setStreak((s) => {
        const n = s + 1;
        setBestStreak((b) => Math.max(b, n));
        return n;
      });
      setCorrect((c) => c + 1);
    } else {
      setMissed((m) => [...m, q]);
      setStreak(0);
      setLives((l) => l - 1);
    }
  };

  const next = () => {
    const dead = lives - (picked === qs[i].ci ? 0 : 1) <= 0;
    if (dead) {
      finish(score, false);
      return;
    }
    if (i + 1 >= qs.length) {
      finish(score, true);
      return;
    }
    setI(i + 1);
    setPicked(null);
    setLeft(PER_QUESTION_SEC);
  };

  if (loading || !cards || !catalog) return <PageFallback />;

  if (phase === 'run') {
    const q = qs[i];
    const topic = catalog.topics.find((t) => t.slug === q.card.t);
    const urgent = left < 5 && picked === null;
    return (
      <div className="page narrow">
        <div className="arena-bar" role="status" aria-label="Game status">
          <span className="arena-score"><IconBolt /> {score.toLocaleString()}</span>
          <span className="arena-lives" aria-label={`${lives} lives left`}>{'❤'.repeat(lives)}{'🤍'.repeat(Math.max(0, LIVES - lives))}</span>
          <span className={`timer ${urgent ? 'urgent' : ''}`} role="timer"><IconTimer width={16} height={16} /> {left.toFixed(0)}s</span>
        </div>
        <div className="arena-timerbar" aria-hidden><span style={{ width: `${(left / PER_QUESTION_SEC) * 100}%` }} className={urgent ? 'urgent' : ''} /></div>
        <article className="card pad arena-q">
          <p className="fc-ctx">{topic?.emoji} {q.card.ctx} · Q{i + 1}/{qs.length}{streak > 1 ? ` · 🔥 ${streak} streak` : ''}</p>
          <h2>{q.card.q}</h2>
          <div className="options" role="radiogroup" aria-label="Choose an answer">
            {q.opts.map((o, k) => {
              const st = picked === null ? '' : k === q.ci ? 'correct' : k === picked ? 'wrong' : 'dim';
              return (
                <button key={k} type="button" role="radio" aria-checked={picked === k} className={`option ${st}`} disabled={picked !== null} onClick={() => resolve(k)}>
                  {o}
                </button>
              );
            })}
          </div>
          {picked !== null ? (
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={next} autoFocus>
                {i + 1 >= qs.length || lives - (picked === q.ci ? 0 : 1) <= 0 ? 'See results' : 'Next'} →
              </button>
              <Link className="small" to={q.card.a ? `${q.card.u}#${q.card.a}` : q.card.u} target="_blank" rel="noreferrer">Why? Open source page</Link>
            </div>
          ) : null}
        </article>
      </div>
    );
  }

  if (phase === 'over') {
    const acc = qs.length ? Math.round((correct / qs.length) * 100) : 0;
    return (
      <div className="page narrow">
        <header className="page-head">
          <p className="eyebrow">Quiz arena</p>
          <h1>{missed.length && lives <= 0 ? 'Game over' : 'Arena cleared!'}</h1>
          {newBest ? <p className="chip chip-accent">🏆 New personal best!</p> : null}
        </header>
        <section className="fc-stats">
          <div className="stat card"><strong>{score.toLocaleString()}</strong><span>score</span></div>
          <div className="stat card"><strong>{acc}%</strong><span>accuracy</span></div>
          <div className="stat card"><strong>{bestStreak}</strong><span>best streak</span></div>
          <div className="stat card"><strong>{best.best.toLocaleString()}</strong><span>all-time best</span></div>
        </section>
        <div className="row">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setPhase('setup')}>
            <IconBolt /> Play again
          </button>
          <Link to="/mock" className="btn btn-lg">Try a mock interview</Link>
        </div>
        {missed.length ? (
          <section className="card pad">
            <h2>Review your misses ({missed.length})</h2>
            <ul className="missed">
              {missed.map((m) => (
                <li key={m.card.id}>
                  <span className="chip chip-bad">Missed</span>
                  <Link to={m.card.a ? `${m.card.u}#${m.card.a}` : m.card.u}>{m.card.q}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Speed round</p>
        <h1>Quiz Arena</h1>
        <p className="lead">
          Rapid-fire MCQs against the clock: {PER_QUESTION_SEC} seconds per question, {LIVES} lives, streak combos and a time bonus.
          Wrong answers cost a life — clear the set for the win.
        </p>
      </header>
      <section className="fc-stats">
        <div className="stat card"><strong>{best.best.toLocaleString()}</strong><span>your best</span></div>
        <div className="stat card"><strong>{best.games}</strong><span>games played</span></div>
        <div className="stat card"><strong>{best.wins}</strong><span>arenas cleared</span></div>
      </section>
      <section className="card pad mock-setup" aria-labelledby="arena-h">
        <h2 id="arena-h">Set up your run</h2>
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
          <span className="field-label">Questions</span>
          <div className="segmented" role="radiogroup" aria-label="Number of questions">
            {COUNTS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={count === c} className={count === c ? 'on' : ''} onClick={() => setCount(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn btn-primary btn-lg" disabled={!pool.length} onClick={start}>
            <IconBolt /> Start ({Math.min(count, pool.length)} questions)
          </button>
          <span className="muted small">{pool.length.toLocaleString()} MCQs match these settings.</span>
        </div>
      </section>
    </div>
  );
}

export default ArenaPage;
