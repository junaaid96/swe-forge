import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROADMAP } from '../data/roadmap';
import { useTopicSummaries } from '../hooks/useTopics';
import { getCompletionStats, getTopicProgress, useProgress } from '../store/progress';

function topicScore(tp: ReturnType<typeof getTopicProgress>, summary: { quizCount: number; problemCount: number; interviewLevels: unknown[]; deepTracks: unknown[] }) {
  const interviewPts = (tp.interviewVisited?.length ?? 0) * 2;
  const deepPts = (tp.deepVisited?.length ?? 0) * 2;
  const problemPts = (tp.problemsSolved?.length ?? 0) * 15;
  const bonus = tp.completed ? 50 : 0;
  const total = tp.quizBest + problemPts + interviewPts + deepPts + bonus;
  const max =
    summary.quizCount * 10 +
    summary.problemCount * 15 +
    summary.interviewLevels.length * 2 +
    summary.deepTracks.length * 2 +
    50;
  return { total, max, pct: max ? Math.min(100, Math.round((total / max) * 100)) : 0 };
}

function SkeletonGrid() {
  return (
    <div className="topic-grid" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="topic-card skeleton-card" style={{ animationDelay: `${i * 0.04}s` }}>
          <div className="skeleton-line w-40" />
          <div className="skeleton-line w-70" />
          <div className="skeleton-line w-50" />
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  const progress = useProgress();
  const stats = getCompletionStats(progress);
  const { topics, loading, error } = useTopicSummaries();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const next =
    topics.find((t) => !getTopicProgress(progress, t.slug).completed) ?? topics[0];

  const filtered = useMemo(() => {
    if (!activeGroup) return topics;
    const group = ROADMAP.find((g) => g.id === activeGroup);
    if (!group) return topics;
    return topics.filter((t) => group.slugs.includes(t.slug));
  }, [topics, activeGroup]);

  return (
    <div className="page-home">
      <section className="hero">
        <div className="hero-visual" aria-hidden />
        <div className="hero-inner">
          <p className="hero-kicker">
            <span className="pulse-dot" aria-hidden />
            {stats.completed} of {stats.total} topics complete
          </p>
          <p className="hero-brand">SWE Forge</p>
          <h1>A reading room for interview depth.</h1>
          <p className="hero-lead">
            Each subject sits on two shelves — Interview drills and Deep theory — so you learn the
            craft page by page, then prove it under pressure.
          </p>
          <div className="hero-actions">
            {next ? (
              <Link className="primary-btn" to={`/topics/${next.slug}`}>
                Continue {next.title}
              </Link>
            ) : (
              <Link className="primary-btn" to="/topics/software-engineering">
                Start forging
              </Link>
            )}
            <Link className="secondary-btn" to="/scoreboard">
              View scoreboard
            </Link>
          </div>
        </div>
        <div className="hero-stats" aria-label="Your stats">
          <div className="hero-stat">
            <strong>{progress.totalScore}</strong>
            <small>Score</small>
          </div>
          <div className="hero-stat">
            <strong>{stats.pct}%</strong>
            <small>Progress</small>
          </div>
          <div className="hero-stat">
            <strong>{progress.streak}d</strong>
            <small>Streak</small>
          </div>
        </div>
      </section>

      <div className="grid-stats">
        <div className="stat-card">
          <span className="stat-icon" aria-hidden>⚡</span>
          <div>
            <small>Total score</small>
            <strong>{progress.totalScore}</strong>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden>✓</span>
          <div>
            <small>Topics done</small>
            <strong>
              {stats.completed}/{stats.total}
            </strong>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden>📚</span>
          <div>
            <small>Topics available</small>
            <strong>{topics.length || '—'}</strong>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden>🔥</span>
          <div>
            <small>Study streak</small>
            <strong>{progress.streak}d</strong>
          </div>
        </div>
      </div>

      <div className="section-head">
        <div>
          <h2>Curriculum shelves</h2>
          <p>Craft → stack → frontend → backend → systems → behavioral</p>
        </div>
      </div>
      <div className="roadmap-strip">
        {ROADMAP.map((step, i) => {
          const count = topics.filter((t) => step.slugs.includes(t.slug)).length;
          const done = topics.filter(
            (t) => step.slugs.includes(t.slug) && getTopicProgress(progress, t.slug).completed,
          ).length;
          const isActive = activeGroup === step.id;
          return (
            <button
              key={step.id}
              type="button"
              className={`roadmap-step ${isActive ? 'active' : ''}`}
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => setActiveGroup(isActive ? null : step.id)}
              aria-pressed={isActive}
            >
              <span className="roadmap-index">{String(i + 1).padStart(2, '0')}</span>
              <strong>{step.label}</strong>
              <small className="muted">
                {step.hint}
                {count ? ` · ${done}/${count}` : ''}
              </small>
              {count > 0 ? (
                <div className="progress-bar" style={{ marginTop: '0.35rem' }}>
                  <span style={{ width: `${Math.round((done / count) * 100)}%` }} />
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="section-head">
        <div>
          <h2>{activeGroup ? ROADMAP.find((g) => g.id === activeGroup)?.label ?? 'Topics' : 'All topics'}</h2>
          <p>
            {loading
              ? 'Loading curriculum…'
              : error
                ? error
                : `${filtered.length} topic${filtered.length === 1 ? '' : 's'} · Interview + Deep each`}
          </p>
        </div>
        {activeGroup ? (
          <button type="button" className="filter-clear" onClick={() => setActiveGroup(null)}>
            Show all
          </button>
        ) : null}
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="topic-grid">
          {filtered.map((topic, i) => {
            const tp = getTopicProgress(progress, topic.slug);
            const { pct } = topicScore(tp, topic);
            return (
              <Link
                key={topic.slug}
                to={`/topics/${topic.slug}`}
                className="topic-card"
                style={{ ['--cat' as string]: topic.accent, animationDelay: `${i * 0.03}s` }}
              >
                <div className="topic-card-top">
                  <span className="emoji lg">{topic.emoji}</span>
                  {tp.completed ? (
                    <span className="pill done-pill">Done</span>
                  ) : pct > 0 ? (
                    <span className="pill progress-pill">{pct}%</span>
                  ) : null}
                </div>
                <h3>{topic.title}</h3>
                <p className="muted">{topic.tag}</p>
                <div className="topic-card-meta">
                  <span>{topic.interviewLevels.length} interview</span>
                  <span>{topic.deepTracks.length} deep</span>
                  {topic.quizCount ? <span>{topic.quizCount}Q</span> : null}
                </div>
                <div className="progress-bar topic-card-bar">
                  <span
                    style={{
                      width: `${tp.completed ? 100 : pct}%`,
                      background: topic.accent,
                    }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
