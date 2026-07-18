import { Link } from 'react-router-dom';
import { CATEGORIES, QUIZ_POINTS_PER_QUESTION, TOPIC_COMPLETE_BONUS } from '../data/categories';
import { useTopicSummaries } from '../hooks/useTopics';
import { getFallbackTopics } from '../services/api';
import { getCompletionStats, getTopicProgress, useProgress } from '../store/progress';

export function ScoreboardPage() {
  const progress = useProgress();
  const stats = getCompletionStats(progress);
  const { topics: summaries } = useTopicSummaries();
  const full = getFallbackTopics();

  const rows = summaries
    .map((summary) => {
      const topic = full.find((t) => t.slug === summary.slug);
      const tp = getTopicProgress(progress, summary.slug);
      const problemPts = (topic?.problems ?? [])
        .filter((p) => tp.problemsSolved.includes(p.id))
        .reduce((n, p) => n + p.points, 0);
      const bonus = tp.completed ? TOPIC_COMPLETE_BONUS : 0;
      const total = tp.quizBest + problemPts + bonus;
      const max =
        summary.quizCount * QUIZ_POINTS_PER_QUESTION +
        (topic?.problems.reduce((n, p) => n + p.points, 0) ?? 0) +
        TOPIC_COMPLETE_BONUS;
      return { summary, tp, problemPts, bonus, total, max };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="scoreboard">
      <section className="panel content-panel">
        <div className="section-head" style={{ marginTop: 0 }}>
          <div>
            <h2>Scoreboard</h2>
            <p>
              Quiz: {QUIZ_POINTS_PER_QUESTION} pts/question · Problems: variable · Topic complete
              bonus: {TOPIC_COMPLETE_BONUS}
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
            <strong>
              {stats.problemsSolved}/{stats.totalProblems}
            </strong>
          </div>
          <div className="panel stat-card">
            <small>Completion</small>
            <strong>{stats.pct}%</strong>
          </div>
        </div>

        <div className="leader-list">
          {rows.map(({ summary, tp, problemPts, bonus, total, max }, i) => {
            const cat = CATEGORIES[summary.cat];
            return (
              <Link key={summary.slug} to={`/learn/${summary.slug}`} className="leader-row">
                <strong style={{ width: '1.5rem' }}>{i + 1}</strong>
                <div>
                  <strong>
                    {summary.emoji} {summary.title}
                  </strong>
                  <div className="muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>
                    Quiz best {tp.quizBest} · Problems {problemPts}
                    {bonus ? ` · Bonus ${bonus}` : ''}
                    {tp.completed ? ' · Done' : ''}
                  </div>
                  <div className="progress-bar" style={{ marginTop: 8 }}>
                    <span
                      style={{
                        width: `${max ? Math.min(100, Math.round((total / max) * 100)) : 0}%`,
                        background: `linear-gradient(90deg, ${cat.accent}, ${cat.text})`,
                      }}
                    />
                  </div>
                </div>
                <strong style={{ color: cat.text }}>{total}</strong>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="panel content-panel">
        <h2 style={{ fontFamily: 'var(--display)', marginTop: 0 }}>How scoring works</h2>
        <div className="tip-list">
          <div className="tip">
            <span>✓</span>
            <span>
              Learn deeply first, then take the <strong>Quiz</strong>. Best attempt per topic counts.
            </span>
          </div>
          <div className="tip">
            <span>✓</span>
            <span>
              <strong>Practice</strong> problems add points once when marked solved.
            </span>
          </div>
          <div className="tip">
            <span>✓</span>
            <span>
              Perfect a quiz (or finish problems with a quiz score) for a {TOPIC_COMPLETE_BONUS}-point
              completion bonus.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
