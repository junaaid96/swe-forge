import { Link } from 'react-router-dom';
import { QUIZ_POINTS_PER_QUESTION, TOPIC_COMPLETE_BONUS } from '../data/types';
import { useTopicSummaries } from '../hooks/useTopics';
import { getCompletionStats, getTopicProgress, useProgress } from '../store/progress';

export function ScoreboardPage() {
  const progress = useProgress();
  const stats = getCompletionStats(progress);
  const { topics: summaries } = useTopicSummaries();

  const rows = summaries
    .map((summary) => {
      const tp = getTopicProgress(progress, summary.slug);
      const interviewPts = (tp.interviewVisited?.length ?? 0) * 2;
      const deepPts = (tp.deepVisited?.length ?? 0) * 2;
      const problemPts = (tp.problemsSolved?.length ?? 0) * 15;
      const bonus = tp.completed ? TOPIC_COMPLETE_BONUS : 0;
      const total = tp.quizBest + problemPts + interviewPts + deepPts + bonus;
      const max =
        summary.quizCount * QUIZ_POINTS_PER_QUESTION +
        summary.problemCount * 15 +
        summary.interviewLevels.length * 2 +
        summary.deepTracks.length * 2 +
        TOPIC_COMPLETE_BONUS;
      return { summary, tp, problemPts, interviewPts, deepPts, bonus, total, max };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="scoreboard">
      <section className="panel content-panel">
        <div className="section-head" style={{ marginTop: 0 }}>
          <div>
            <h2>Scoreboard</h2>
            <p>
              Quiz: {QUIZ_POINTS_PER_QUESTION} pts/Q · Problems: 15 pts · Interview/Deep visit: 2 pts
              · Complete bonus: {TOPIC_COMPLETE_BONUS}
            </p>
          </div>
        </div>

        <div className="grid-stats" style={{ marginBottom: '1rem' }}>
          <div className="panel stat-card">
            <small>Total score</small>
            <strong>{progress.totalScore}</strong>
          </div>
          <div className="panel stat-card">
            <small>Quizzes taken</small>
            <strong>{stats.quizzesTaken}</strong>
          </div>
          <div className="panel stat-card">
            <small>Problems solved</small>
            <strong>{stats.problemsSolved}</strong>
          </div>
          <div className="panel stat-card">
            <small>Completion</small>
            <strong>{stats.pct}%</strong>
          </div>
        </div>

        <div className="leader-list">
          {rows.map(({ summary, tp, problemPts, interviewPts, deepPts, bonus, total, max }, i) => (
            <Link key={summary.slug} to={`/topics/${summary.slug}`} className="leader-row">
              <strong style={{ width: '1.5rem' }}>{i + 1}</strong>
              <div>
                <strong>
                  {summary.emoji} {summary.title}
                </strong>
                <div className="muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>
                  Quiz {tp.quizBest} · Problems {problemPts} · Interview {interviewPts} · Deep{' '}
                  {deepPts}
                  {bonus ? ` · Bonus ${bonus}` : ''}
                  {tp.completed ? ' · Done' : ''}
                </div>
                <div className="progress-bar" style={{ marginTop: 8 }}>
                  <span
                    style={{
                      width: `${max ? Math.min(100, Math.round((total / max) * 100)) : 0}%`,
                      background: summary.accent,
                    }}
                  />
                </div>
              </div>
              <strong>{total}</strong>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
