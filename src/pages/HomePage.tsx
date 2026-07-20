import { Link } from 'react-router-dom';
import { useTopicSummaries } from '../hooks/useTopics';
import { getCompletionStats, getTopicProgress, useProgress } from '../store/progress';

const ROADMAP = [
  { label: 'Engineering craft', hint: 'SWE · LLD · Testing · Git', slugs: ['software-engineering', 'low-level-design', 'testing-quality', 'git-collaboration'] },
  { label: 'Languages & frameworks', hint: 'Java · Spring · Python · Django · Node', slugs: ['java', 'spring-boot', 'python', 'django', 'nodejs'] },
  { label: 'Frontend', hint: 'Web · React · Next · Angular · UI/UX', slugs: ['frontend', 'react', 'nextjs', 'angular', 'ui-ux'] },
  { label: 'Backend & data', hint: 'API · Backend · Database · Security', slugs: ['backend', 'api-design', 'database', 'security'] },
  { label: 'Systems', hint: 'CS · DSA · System Design · DevOps · AI', slugs: ['cs-fundamentals', 'dsa', 'system-design', 'devops-cloud', 'ai-ml'] },
  { label: 'Interview soft skills', hint: 'Behavioral STAR', slugs: ['behavioral'] },
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
          <div className="hero-kicker">Topic-wise Interview · Deep</div>
          <h1>SWE Forge</h1>
          <p>
            Every subject has two paths: <strong>Interview</strong> (Basics → Company-specific) and{' '}
            <strong>Deep</strong> (Theory → Pitfalls). Learn in depth, then practice for the loop.
          </p>
          <div className="hero-actions">
            {next ? (
              <Link className="primary-btn" to={`/topics/${next.slug}`}>
                Continue: {next.title}
              </Link>
            ) : null}
            <Link className="secondary-btn" to="/scoreboard">
              Scoreboard
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
          <p>Craft → stack → frontend → backend → systems → behavioral</p>
        </div>
      </div>
      <div className="roadmap-strip">
        {ROADMAP.map((step, i) => {
          const count = topics.filter((t) => step.slugs.includes(t.slug)).length;
          return (
            <div key={step.label} className="panel roadmap-step" style={{ animationDelay: `${i * 0.05}s` }}>
              <span className="roadmap-index">{i + 1}</span>
              <strong>{step.label}</strong>
              <small className="muted">
                {step.hint}
                {count ? ` · ${count}` : ''}
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
                : `${topics.length} topics · Interview + Deep each`}
          </p>
        </div>
      </div>

      <div className="topic-grid">
        {topics.map((topic) => {
          const tp = getTopicProgress(progress, topic.slug);
          return (
            <Link
              key={topic.slug}
              to={`/topics/${topic.slug}`}
              className="panel topic-card"
              style={{ ['--cat' as string]: topic.accent }}
            >
              <div className="topic-card-top">
                <span className="emoji lg">{topic.emoji}</span>
                {tp.completed ? <span className="pill done-pill">Done</span> : null}
              </div>
              <h3>{topic.title}</h3>
              <p className="muted">{topic.tag}</p>
              <div className="topic-card-meta">
                <span>{topic.interviewLevels.length} interview levels</span>
                <span>{topic.deepTracks.length} deep tracks</span>
                {topic.quizCount ? <span>{topic.quizCount}Q</span> : null}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
