import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ConfirmDialog } from './ConfirmDialog';
import { ROADMAP } from '../data/roadmap';
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
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <NavLink to="/" className="brand" onClick={onClose}>
        <div className="brand-mark" aria-hidden>
          <span />
        </div>
        <div className="brand-text">
          <strong>SWE Forge</strong>
          <span>Stacks · Study</span>
        </div>
      </NavLink>

      <div className="sidebar-progress">
        <div className="sidebar-progress-head">
          <small>Overall progress</small>
          <strong>{stats.pct}%</strong>
        </div>
        <div className="progress-bar">
          <span style={{ width: `${stats.pct}%` }} />
        </div>
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

        {ROADMAP.map((group) => {
          const groupTopics = topics.filter((t) => group.slugs.includes(t.slug));
          if (!groupTopics.length) return null;
          return (
            <div key={group.id} className="nav-group">
              <div className="nav-section">{group.label}</div>
              {groupTopics.map((topic) => {
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
                      className={`dot ${tp.completed ? 'done' : tp.interviewVisited.length || tp.deepVisited.length ? 'started' : ''}`}
                      title={tp.completed ? 'Completed' : 'In progress'}
                    />
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <button type="button" className="ghost-btn" onClick={() => setResetOpen(true)}>
          Reset progress
        </button>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Reset all progress?"
        message="This clears your scores, streak, and completion status for every topic. This cannot be undone."
        confirmLabel="Reset everything"
        cancelLabel="Keep progress"
        variant="danger"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          progressStore.reset();
          setResetOpen(false);
        }}
      />
    </aside>
  );
}
