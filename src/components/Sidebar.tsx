import { NavLink, useLocation } from 'react-router-dom';
import { useTopicSummaries } from '../hooks/useTopics';
import { getCompletionStats, getTopicProgress, progressStore, useProgress } from '../store/progress';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const progress = useProgress();
  const stats = getCompletionStats(progress);
  const location = useLocation();
  const { topics, loading } = useTopicSummaries();

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <NavLink to="/" className="brand" onClick={onClose}>
        <div className="brand-mark">SF</div>
        <div className="brand-text">
          <strong>SWE Forge</strong>
          <span>Interview · Deep</span>
        </div>
      </NavLink>

      <div className="score-chip">
        <div>
          <small>Score</small>
          <strong>{progress.totalScore}</strong>
        </div>
        <div>
          <small>Streak</small>
          <strong>{progress.streak}d</strong>
        </div>
        <div>
          <small>Done</small>
          <strong>
            {stats.completed}/{stats.total}
          </strong>
        </div>
        <div>
          <small>Progress</small>
          <strong>{stats.pct}%</strong>
        </div>
      </div>

      <nav className="nav-scroll" aria-label="Topics">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <span className="emoji">🏠</span>
          <span className="meta">
            <strong>Home</strong>
            <small>All topics</small>
          </span>
        </NavLink>
        <NavLink
          to="/scoreboard"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <span className="emoji">🏆</span>
          <span className="meta">
            <strong>Scoreboard</strong>
            <small>Quiz & progress</small>
          </span>
        </NavLink>

        {loading ? <div className="nav-section">Loading topics…</div> : null}

        <div className="nav-section">Topics</div>
        {topics.map((topic) => {
          const tp = getTopicProgress(progress, topic.slug);
          const active = location.pathname.includes(`/topics/${topic.slug}`);
          return (
            <NavLink
              key={topic.slug}
              to={`/topics/${topic.slug}`}
              className={`nav-link ${active ? 'active' : ''}`}
              style={{ ['--cat' as string]: topic.accent }}
              onClick={onClose}
            >
              <span className="emoji">{topic.emoji}</span>
              <span className="meta">
                <strong>{topic.title}</strong>
                <small>
                  {topic.interviewLevels.length}I · {topic.deepTracks.length}D
                  {topic.quizCount ? ` · ${topic.quizCount}Q` : ''}
                </small>
              </span>
              <span
                className={`dot ${tp.completed ? 'done' : ''}`}
                title={tp.completed ? 'Completed' : 'In progress'}
              />
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            if (confirm('Reset all progress and scores?')) {
              progressStore.reset();
            }
          }}
        >
          Reset progress
        </button>
      </div>
    </aside>
  );
}
