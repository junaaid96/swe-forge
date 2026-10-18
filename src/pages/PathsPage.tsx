import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatMinutes, useCatalog } from '../lib/content';
import { useProgress } from '../lib/progress';
import { usePractice } from '../lib/practiceStore';
import { pathProgress } from '../lib/paths';
import { Bar } from '../components/Ring';
import { PageFallback } from '../components/Layout';

export function PathsPage() {
  const { data: catalog, loading } = useCatalog();
  const state = useProgress();
  const practice = usePractice();
  useEffect(() => {
    document.title = 'Learning paths · Forgeline';
  }, []);
  const rows = useMemo(
    () => (catalog?.paths ?? []).map((p) => ({ path: p, prog: pathProgress(p, state, practice) })),
    [catalog, state, practice],
  );

  if (loading && !catalog) return <PageFallback />;
  if (!catalog?.paths?.length) return <p className="empty-state">No learning paths yet.</p>;

  return (
    <div className="page" data-testid="paths-hub">
      <header className="page-head">
        <p className="eyebrow">Curriculum</p>
        <h1>Learning paths</h1>
        <p className="lead">Curated sequences of guides, quizzes, flashcards, interview prep and coding challenges. Progress comes from the studying you already do — nothing extra to track.</p>
      </header>
      <div className="topic-grid">
        {rows.map(({ path, prog }) => (
          <Link key={path.slug} to={`/paths/${path.slug}`} className="topic-card card" style={{ ['--topic' as string]: path.accent }}>
            <div className="topic-card-head">
              <span className="topic-emoji" aria-hidden>
                {path.emoji}
              </span>
              <div>
                <strong>{path.title}</strong>
                <small>~{path.estimatedHours}h · {prog.done}/{prog.total} steps</small>
              </div>
              {prog.pct ? <span className="topic-pct">{prog.pct}%</span> : null}
            </div>
            <p>{path.blurb}</p>
            <div className="topic-card-meta">
              <span>{path.steps.length} steps</span>
              <span>{formatMinutes(path.minutes)}</span>
              <span>{path.topics.length} topics</span>
            </div>
            <Bar value={prog.pct} color={path.accent} label={`${path.title}: ${prog.pct}% complete`} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default PathsPage;
