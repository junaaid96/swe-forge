import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatMinutes, useCatalog, useResource, urls } from '../lib/content';
import { progress, useProgress } from '../lib/progress';
import { topicStats } from '../lib/stats';
import { Ring } from '../components/Ring';
import { QuizPanel } from '../components/QuizPanel';
import { PracticePanel } from '../components/PracticePanel';
import { IconArrowRight, IconCards, IconCheck, IconTimer } from '../components/Icons';
import { PageFallback } from '../components/Layout';
import { NotFoundPage } from './NotFoundPage';
import type { PageKind, PageRef, TopicExtras } from '../lib/types';

const SECTIONS: Array<{ kind: PageKind; title: string; hint: string }> = [
  { kind: 'notes', title: 'Guides', hint: 'Long-form notes: concept → example → gotchas, with interview callouts.' },
  { kind: 'deep', title: 'Deep dives', hint: 'Theory, internals, best practices, performance and pitfalls.' },
  { kind: 'interview', title: 'Interview Q&A', hint: 'Leveled questions with model answers. Turn on practice mode to self-test.' },
];

export function TopicPage() {
  const { slug = '' } = useParams();
  const { data: catalog, loading } = useCatalog();
  const { data: extras } = useResource<TopicExtras>(slug ? urls.topic(slug) : null);
  const state = useProgress();
  const topic = catalog?.topics.find((t) => t.slug === slug);
  const s = useMemo(() => (topic ? topicStats(topic, state) : null), [topic, state]);

  useEffect(() => {
    if (topic) document.title = `${topic.title} · Forgeline`;
  }, [topic]);

  if (loading && !catalog) return <PageFallback />;
  if (!topic || !s) return <NotFoundPage message="That topic doesn't exist." />;
  const firstUnread = topic.pages.find((p) => !state.pages[p.key]?.readAt);
  const completed = state.completed.includes(slug);

  const row = (p: PageRef) => {
    const read = Boolean(state.pages[p.key]?.readAt);
    const bm = state.bookmarks.includes(p.key);
    return (
      <li key={p.key}>
        <Link to={p.url} className={`page-row ${read ? 'read' : ''}`}>
          <span className={`read-dot ${read ? 'read' : ''}`} aria-hidden>
            {read ? <IconCheck width={10} height={10} strokeWidth={3} /> : null}
          </span>
          <span className="page-row-main">
            <strong>{p.title}</strong>
            {p.description ? <small>{p.description}</small> : null}
          </span>
          <span className="page-row-meta">
            {bm ? <span aria-label="Bookmarked">★</span> : null}
            {p.questions ? `${p.questions} Q · ` : ''}
            {formatMinutes(p.minutes)}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="topic" style={{ ['--topic' as string]: topic.accent }}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{topic.title}</span>
      </nav>
      <header className="topic-hero card">
        <div className="topic-hero-main">
          <span className="topic-emoji lg" aria-hidden>
            {topic.emoji}
          </span>
          <div>
            <p className="eyebrow">{topic.tag}</p>
            <h1>{topic.title}</h1>
            <p className="lead">{topic.blurb}</p>
            <div className="row">
              {topic.pages.length ? (
                <Link className="btn btn-primary" to={(firstUnread ?? topic.pages[0]).url}>
                  {s.pagesRead ? 'Continue reading' : 'Start reading'} <IconArrowRight />
                </Link>
              ) : null}
              {topic.cardCount ? (
                <Link className="btn" to={`/flashcards?topic=${slug}`}>
                  <IconCards /> Review {topic.cardCount} cards
                </Link>
              ) : null}
              {topic.cardCount ? (
                <Link className="btn" to={`/mock?topics=${slug}`}>
                  <IconTimer /> Mock this topic
                </Link>
              ) : null}
              <button type="button" className={`btn ${completed ? 'btn-good' : ''}`} onClick={() => progress.toggleCompleted(slug)} aria-pressed={completed}>
                <IconCheck /> {completed ? 'Completed' : 'Mark complete'}
              </button>
            </div>
          </div>
        </div>
        <div className="topic-hero-stats">
          <Ring value={s.mastery} size={84} stroke={8} color={topic.accent} label={`Mastery ${s.mastery}%`} />
          <dl>
            <div>
              <dt>Read</dt>
              <dd>
                {s.pagesRead}/{s.pagesTotal}
              </dd>
            </div>
            <div>
              <dt>Cards mastered</dt>
              <dd>
                {s.cardsMastered}/{s.cardsTotal}
              </dd>
            </div>
            <div>
              <dt>Quiz best</dt>
              <dd>{s.quizPct === null ? '—' : `${s.quizPct}%`}</dd>
            </div>
            <div>
              <dt>Mock avg</dt>
              <dd>{s.mockPct === null ? '—' : `${s.mockPct}%`}</dd>
            </div>
          </dl>
        </div>
      </header>

      {topic.pages.length === 0 ? <p className="card pad muted">No pages yet. Add Markdown files under <code>content/{slug}/notes/</code>.</p> : null}

      {SECTIONS.map((sec) => {
        const list = topic.pages.filter((p) => p.kind === sec.kind);
        if (!list.length) return null;
        return (
          <section key={sec.kind} className="topic-section" aria-labelledby={`sec-${sec.kind}`}>
            <h2 id={`sec-${sec.kind}`}>{sec.title}</h2>
            <p className="muted small">{sec.hint}</p>
            <ul className="page-list card">{list.map(row)}</ul>
          </section>
        );
      })}

      {extras?.quiz.length ? (
        <section className="topic-section" id="quiz" aria-labelledby="sec-quiz">
          <h2 id="sec-quiz">Quick quiz</h2>
          <div className="card pad">
            <QuizPanel slug={slug} questions={extras.quiz} />
          </div>
        </section>
      ) : null}

      {extras?.problems.length ? (
        <section className="topic-section" aria-labelledby="sec-practice">
          <h2 id="sec-practice">Practice problems</h2>
          <PracticePanel slug={slug} problems={extras.problems} />
        </section>
      ) : null}

      {topic.related.length ? (
        <section className="topic-section" aria-labelledby="sec-related">
          <h2 id="sec-related">Related topics</h2>
          <div className="chips">
            {topic.related.map((r) => {
              const t = catalog?.topics.find((x) => x.slug === r);
              return t ? (
                <Link key={r} className="chip chip-link" to={`/topics/${r}`}>
                  {t.emoji} {t.title}
                </Link>
              ) : null;
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default TopicPage;
