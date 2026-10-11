import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatMinutes, useCatalog } from '../lib/content';
import { useProgress } from '../lib/progress';
import { trackStats } from '../lib/stats';
import { Ring } from '../components/Ring';
import { PageFallback } from '../components/Layout';

export function RoadmapsPage() {
  const { data: catalog, error } = useCatalog();
  const state = useProgress();
  useEffect(() => {
    document.title = 'Roadmaps · Forgeline';
  }, []);
  const rows = useMemo(() => (catalog?.tracks ?? []).map((t) => ({ t, s: trackStats(t, state) })), [catalog, state]);
  if (error) return <p className="empty-state">Could not load roadmaps.</p>;
  if (!catalog) return <PageFallback />;

  return (
    <div className="roadmaps">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">Roadmaps</span>
      </nav>
      <header className="page-head">
        <p className="eyebrow">Role-based tracks</p>
        <h1>Roadmaps</h1>
        <p className="lead">
          Pick a role and follow it stage by stage. Every step links to a Forgeline guide with explanations, worked examples, a quiz and flashcards. The topic
          lists follow the community roadmaps on{' '}
          <a href="https://roadmap.sh" target="_blank" rel="noopener noreferrer">
            roadmap.sh
          </a>
          ; all explanations here are written for Forgeline.
        </p>
      </header>
      <div className="track-grid">
        {rows.map(({ t, s }) => (
          <Link key={t.slug} to={`/roadmaps/${t.slug}`} className="track-card card" style={{ ['--topic' as string]: t.accent }}>
            <div className="track-card-head">
              <span className="topic-emoji" aria-hidden>
                {t.emoji}
              </span>
              <div>
                <strong>{t.title}</strong>
                <small>
                  {t.stages.length} stages · {s.total} steps · {formatMinutes(t.minutes)}
                </small>
              </div>
              <Ring value={s.pct} size={44} color={t.accent} label={`${t.title}: ${s.pct}% complete`} />
            </div>
            <p>{t.blurb}</p>
            {s.next ? <small className="muted">Next: {s.next.label}</small> : <small className="good">Complete ✓</small>}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default RoadmapsPage;
