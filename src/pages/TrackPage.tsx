import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatMinutes, getTopicExtras, useCatalog } from '../lib/content';
import { useProgress } from '../lib/progress';
import { itemDone, trackStats } from '../lib/stats';
import { Ring } from '../components/Ring';
import { QuizPanel } from '../components/QuizPanel';
import { IconArrowRight, IconArrowUpRight, IconCheck } from '../components/Icons';
import { PageFallback } from '../components/Layout';
import { NotFoundPage } from './NotFoundPage';
import type { QuizQuestion } from '../lib/types';

/** Deterministic pick so the checkpoint is stable between visits. */
function pick<T extends { id: string }>(list: T[], n: number, seed: string) {
  const h = (s: string) => [...s].reduce((a, c) => (Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
  return list
    .map((q) => [h(seed + q.id), q] as const)
    .sort((a, b) => a[0] - b[0])
    .slice(0, n)
    .map(([, q]) => q);
}

export function TrackPage() {
  const { slug = '' } = useParams();
  const { data: catalog, loading } = useCatalog();
  const state = useProgress();
  const track = catalog?.tracks?.find((t) => t.slug === slug);
  const s = useMemo(() => (track ? trackStats(track, state) : null), [track, state]);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);

  useEffect(() => {
    if (track) document.title = `${track.title} roadmap · Forgeline`;
  }, [track]);

  useEffect(() => {
    if (!track) return;
    let live = true;
    Promise.all(track.topics.map((t) => getTopicExtras(t).catch(() => ({ quiz: [], problems: [] }))))
      .then((all) => {
        const qs = all.flatMap((x, i) => x.quiz.map((q) => ({ ...q, id: `${track.topics[i]}-${q.id}` })));
        if (live) setQuiz(pick(qs, 15, track.slug));
      });
    return () => {
      live = false;
    };
  }, [track]);

  if (loading && !catalog) return <PageFallback />;
  if (!track || !s) return <NotFoundPage message="That roadmap doesn't exist." />;

  return (
    <div className="track" style={{ ['--topic' as string]: track.accent }}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden>/</span>
        <Link to="/roadmaps">Roadmaps</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{track.title}</span>
      </nav>
      <header className="topic-hero card">
        <div className="topic-hero-main">
          <span className="topic-emoji lg" aria-hidden>
            {track.emoji}
          </span>
          <div>
            <p className="eyebrow">Roadmap</p>
            <h1>{track.title}</h1>
            <p className="lead">{track.blurb}</p>
            <div className="row">
              {s.next ? (
                <Link className="btn btn-primary" to={s.next.url}>
                  {s.done ? 'Continue where you left off' : 'Start the roadmap'} <IconArrowRight />
                </Link>
              ) : null}
              <a className="btn" href="#checkpoint">
                Checkpoint quiz
              </a>
            </div>
            <p className="muted small track-source">
              Topic checklist based on the{' '}
              <a href={track.source} target="_blank" rel="noopener noreferrer">
                roadmap.sh {track.title} roadmap <IconArrowUpRight width={12} height={12} />
              </a>
              . Explanations and examples are original to Forgeline.
            </p>
          </div>
        </div>
        <div className="topic-hero-stats">
          <Ring value={s.pct} size={84} stroke={8} color={track.accent} label={`${s.pct}% complete`} />
          <small className="muted">
            {s.done}/{s.total} steps · {formatMinutes(track.minutes)}
          </small>
        </div>
      </header>

      <ol className="track-stages">
        {track.stages.map((st, i) => {
          const done = st.items.filter((it) => itemDone(it, state)).length;
          const complete = done === st.items.length;
          const expanded = open[i] ?? !complete;
          return (
            <li key={st.title} className={`track-stage ${complete ? 'done' : ''}`}>
              <button type="button" className="track-stage-head" aria-expanded={expanded} onClick={() => setOpen((o) => ({ ...o, [i]: !expanded }))}>
                <span className="track-stage-n" aria-hidden>
                  {complete ? <IconCheck width={14} height={14} strokeWidth={3} /> : i + 1}
                </span>
                <span className="track-stage-title">
                  <strong>{st.title}</strong>
                  {st.hint ? <small>{st.hint}</small> : null}
                </span>
                <span className="muted small">
                  {done}/{st.items.length}
                </span>
              </button>
              {expanded ? (
                <ul className="track-items">
                  {st.items.map((it) => {
                    const d = itemDone(it, state);
                    return (
                      <li key={it.url + it.label}>
                        <Link to={it.url} className={`page-row ${d ? 'read' : ''}`}>
                          <span className={`read-dot ${d ? 'read' : ''}`} aria-hidden>
                            {d ? <IconCheck width={10} height={10} strokeWidth={3} /> : null}
                          </span>
                          <span className="page-row-main">
                            <strong>{it.label}</strong>
                          </span>
                          <span className="page-row-meta">{formatMinutes(it.minutes)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>

      <section id="checkpoint" className="card track-quiz" aria-labelledby="checkpoint-h">
        <h2 id="checkpoint-h">Checkpoint quiz</h2>
        <p className="muted small">15 questions drawn from every topic on this roadmap.</p>
        {quiz ? quiz.length ? <QuizPanel slug={`track:${track.slug}`} questions={quiz} /> : <p className="muted">No questions yet.</p> : <PageFallback />}
      </section>
    </div>
  );
}

export default TrackPage;
