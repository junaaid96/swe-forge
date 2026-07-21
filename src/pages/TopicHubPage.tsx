import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { deepTrackLabel, interviewLevelLabel } from '../data/types';
import { useTopic } from '../hooks/useTopics';
import { QuizPanel } from '../components/QuizPanel';
import { PracticePanel } from '../components/PracticePanel';
import { getTopicProgress, progressStore, useProgress } from '../store/progress';

export function TopicHubPage() {
  const { slug = '' } = useParams();
  const { topic, loading, error } = useTopic(slug);
  const progress = useProgress();
  const tp = getTopicProgress(progress, slug);

  useEffect(() => {
    if (slug) progressStore.markVisited(slug);
  }, [slug]);

  if (loading) return <div className="panel content-panel">Loading topic…</div>;
  if (error || !topic) {
    return (
      <div className="panel content-panel">
        <h2>Topic not found</h2>
        <p className="muted">{error ?? 'Unknown slug'}</p>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  return (
    <div className="topic-hub">
      <nav className="breadcrumbs muted">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>{topic.title}</span>
      </nav>

      <section className="panel content-panel hero-topic" style={{ borderColor: topic.accent }}>
        <div className="accent-kicker" style={{ ['--cat' as string]: topic.accent }}>
          {topic.tag}
        </div>
        <h1>
          {topic.emoji} {topic.title}
        </h1>
        <p>
          Choose <strong>Interview</strong> for leveled Q&amp;A, or <strong>Deep</strong> for
          theory, internals, and best practices.
        </p>
        <div className="hero-actions">
          {topic.interviewLevels[0] ? (
            <Link className="primary-btn" to={`/topics/${slug}/interview/${topic.interviewLevels[0]}`}>
              Start Interview
            </Link>
          ) : null}
          {topic.deepTracks[0] ? (
            <Link className="secondary-btn" to={`/topics/${slug}/deep/${topic.deepTracks[0]}`}>
              Start Deep
            </Link>
          ) : null}
          {!tp.completed ? (
            <button type="button" className="ghost-btn" onClick={() => progressStore.markCompleted(slug)}>
              Mark topic complete
            </button>
          ) : (
            <span className="pill done-pill">Completed</span>
          )}
        </div>
      </section>

      <div className="hub-grid">
        <section className="panel content-panel">
          <h2>Interview</h2>
          <p className="muted">Basics → Medium → Advanced → Company-specific</p>
          <div className="chip-list">
            {topic.interviewLevels.map((level) => (
              <Link
                key={level}
                className={`mode-chip ${tp.interviewVisited.includes(level) ? 'visited' : ''}`}
                to={`/topics/${slug}/interview/${level}`}
                style={{ ['--cat' as string]: topic.accent }}
              >
                {interviewLevelLabel(level)}
              </Link>
            ))}
          </div>
        </section>

        <section className="panel content-panel">
          <h2>Deep</h2>
          <p className="muted">Theory, internals, practices, projects, performance, pitfalls</p>
          <div className="chip-list">
            {topic.deepTracks.map((track) => (
              <Link
                key={track}
                className={`mode-chip ${tp.deepVisited.includes(track) ? 'visited' : ''}`}
                to={`/topics/${slug}/deep/${track}`}
                style={{ ['--cat' as string]: topic.accent }}
              >
                {deepTrackLabel(track)}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {topic.relatedTopics.length > 0 ? (
        <section className="panel content-panel">
          <h2>Related topics</h2>
          <div className="chip-list">
            {topic.relatedTopics.map((rel) => (
              <Link key={rel} className="mode-chip" to={`/topics/${rel}`}>
                {rel}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {topic.quiz.length > 0 ? (
        <section className="panel content-panel">
          <h2>Quiz</h2>
          <QuizPanel slug={slug} questions={topic.quiz} />
        </section>
      ) : null}

      {topic.problems.length > 0 ? (
        <section className="panel content-panel">
          <h2>Practice</h2>
          <PracticePanel slug={slug} problems={topic.problems} solvedIds={tp.problemsSolved} />
        </section>
      ) : null}
    </div>
  );
}
