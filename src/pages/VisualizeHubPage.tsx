import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { VISUALIZERS } from '../visualizers/registry';

export function VisualizeHubPage() {
  useEffect(() => {
    document.title = 'Visualizers · Forgeline';
  }, []);
  return (
    <div className="page" data-testid="viz-hub">
      <header className="page-head">
        <p className="eyebrow">See it run</p>
        <h1>Visualizers</h1>
        <p className="lead">Step-through animations of the ideas interviews love to probe. Each one loads only when you open it.</p>
      </header>
      <div className="topic-grid">
        {VISUALIZERS.map((v) => (
          <Link key={v.id} to={`/visualize/${v.id}`} className="topic-card card">
            <div className="topic-card-head">
              <span className="topic-emoji" aria-hidden>
                {v.emoji}
              </span>
              <div>
                <strong>{v.title}</strong>
              </div>
            </div>
            <p>{v.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default VisualizeHubPage;
