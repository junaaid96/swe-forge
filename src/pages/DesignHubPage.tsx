import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { urls, useResource } from '../lib/content';
import { useDesign } from '../lib/design';
import { PageFallback } from '../components/Layout';
import type { DesignPrompt } from '../lib/types';

export function DesignHubPage() {
  const { data: prompts, loading } = useResource<DesignPrompt[]>(urls.design);
  const { attempts } = useDesign();
  useEffect(() => {
    document.title = 'System design practice · Forgeline';
  }, []);

  if (loading && !prompts) return <PageFallback />;
  if (!prompts?.length) return <p className="empty-state">No design prompts yet.</p>;

  return (
    <div className="page" data-testid="design-hub">
      <header className="page-head">
        <p className="eyebrow">Whiteboard without the marker</p>
        <h1>System design practice</h1>
        <p className="lead">Work through a prompt in structured sections, sketch the architecture as a diagram, check yourself against a rubric, then compare with a model answer. Attempts save locally.</p>
      </header>
      <div className="topic-grid">
        {prompts.map((p) => {
          const a = attempts[p.slug];
          const filled = a ? Object.values(a.sections).filter((s) => s.trim()).length : 0;
          return (
            <Link key={p.slug} to={p.url} className="topic-card card">
              <div className="topic-card-head">
                <span className="topic-emoji" aria-hidden>
                  {p.emoji}
                </span>
                <div>
                  <strong>{p.title}</strong>
                  <small>{a ? `${filled}/6 sections${a.review ? ' · reviewed' : ''}` : 'Not started'}</small>
                </div>
              </div>
              <p>{p.blurb}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default DesignHubPage;
