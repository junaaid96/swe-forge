import { Link } from 'react-router-dom';
import { CATEGORIES } from '../data/categories';
import { useTopicSummaries } from '../hooks/useTopics';
import { getCompletionStats, getTopicProgress, useProgress } from '../store/progress';

const ROADMAP = [
  { label: 'Foundation', cat: 'core' as const, hint: 'SOLID, concurrency, OS' },
  { label: 'Backend depth', cat: 'data' as const, hint: 'Cache, idempotency, APIs' },
  { label: 'Architecture', cat: 'arch' as const, hint: 'Messaging, networking, design' },
  { label: 'Ops & security', cat: 'ops' as const, hint: 'Auth, cloud, observability' },
  { label: 'AI era', cat: 'ai' as const, hint: 'RAG & agents' },
  { label: 'Quality', cat: 'practice' as const, hint: 'TDD, testing, Git' },
];

export function HomePage() {
  const progress = useProgress();
  const stats = getCompletionStats(progress);
  const { topics, loading, error } = useTopicSummaries();
  const next =
    topics.find((t) => !getTopicProgress(progress, t.slug).completed) ?? topics[0];

  return (
    <>
      <section className="panel hero">
        <div className="hero-inner">
          <div className="hero-kicker">Depth-first software engineering</div>
          <h1>SWE Forge</h1>
          <p>
            Learn backend fundamentals in depth — concurrency, caching, messaging, idempotency,
            auth — with practical examples. Then prove it with quizzes, problems, and an interview
            guide that links back to the lessons.
          </p>
          <div className="hero-actions">
            {next ? (
              <Link className="primary-btn" to={`/learn/${next.slug}`}>
                Continue learning: {next.title}
              </Link>
            ) : null}
            <Link className="secondary-btn" to="/interview">
              Interview guide
            </Link>
          </div>
        </div>
      </section>

      <div className="grid-stats">
        <div className="panel stat-card">
          <small>Total score</small>
          <strong>{progress.totalScore}</strong>
        </div>
        <div className="panel stat-card">
          <small>Topics done</small>
          <strong>
            {stats.completed}/{stats.total}
          </strong>
        </div>
        <div className="panel stat-card">
          <small>Topics available</small>
          <strong>{topics.length || '—'}</strong>
        </div>
        <div className="panel stat-card">
          <small>Study streak</small>
          <strong>{progress.streak}d</strong>
        </div>
      </div>

      <div className="section-head">
        <div>
          <h2>Learning roadmap</h2>
          <p>Foundation → backend depth → architecture → ops → interview practice</p>
        </div>
      </div>
      <div className="roadmap-strip">
        {ROADMAP.map((step, i) => {
          const meta = CATEGORIES[step.cat];
          const count = topics.filter((t) => t.cat === step.cat).length;
          return (
            <div key={step.label} className="panel roadmap-step" style={{ animationDelay: `${i * 0.05}s` }}>
              <span className="roadmap-index">{i + 1}</span>
              <strong style={{ color: meta.text }}>{step.label}</strong>
              <small className="muted">
                {step.hint}
                {count ? ` · ${count} topics` : ''}
              </small>
            </div>
          );
        })}
      </div>

      <div className="section-head">
        <div>
          <h2>All topics</h2>
          <p>
            {loading
              ? 'Loading curriculum…'
              : error
                ? error
                : `${topics.length} deep lessons with quizzes & practice`}
          </p>
        </div>
      </div>

      <div className="topic-grid">
        {topics.map((topic, i) => {
          const cat = CATEGORIES[topic.cat];
          const tp = getTopicProgress(progress, topic.slug);
          const quizMax = topic.quizCount * 10;
          const pct = quizMax
            ? Math.min(100, Math.round((tp.quizBest / quizMax) * 100))
            : tp.completed
              ? 100
              : 0;

          return (
            <Link
              key={topic.slug}
              to={`/learn/${topic.slug}`}
              className="panel topic-card"
              style={{ animationDelay: `${0.03 * i}s` }}
            >
              <div className="topic-card-top">
                <span className="topic-emoji">{topic.emoji}</span>
                <span
                  className="cat-badge"
                  style={{
                    ['--cat-bg' as string]: cat.bg,
                    ['--cat-text' as string]: cat.text,
                    ['--cat-border' as string]: cat.border,
                  }}
                >
                  {cat.label}
                </span>
              </div>
              <h3>
                {topic.order}. {topic.title}
              </h3>
              <p>{topic.tag}</p>
              <div className="progress-bar" aria-label={`${pct}% quiz best`}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <small className="muted">
                {tp.completed ? 'Completed' : `${topic.sectionCount} sections`} · {topic.quizCount}Q ·{' '}
                {topic.problemCount} problems
              </small>
            </Link>
          );
        })}
      </div>
    </>
  );
}
