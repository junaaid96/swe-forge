import { Suspense, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { VISUALIZERS, vizLoader } from '../visualizers/registry';
import { PageFallback } from '../components/Layout';
import { NotFoundPage } from './NotFoundPage';

export function VisualizePage() {
  const { id = '' } = useParams();
  const meta = VISUALIZERS.find((v) => v.id === id);
  const Viz = useMemo(() => vizLoader(id), [id]);
  useEffect(() => {
    if (meta) document.title = `${meta.title} · Visualizer · Forgeline`;
  }, [meta]);
  if (!meta || !Viz) return <NotFoundPage message="That visualizer doesn't exist." />;
  return (
    <div className="page" data-testid="viz-detail">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden>/</span>
        <Link to="/visualize">Visualizers</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{meta.title}</span>
      </nav>
      <header className="page-head">
        <p className="eyebrow">
          <span aria-hidden>{meta.emoji}</span> Visualizer
        </p>
        <h1>{meta.title}</h1>
        <p className="lead">{meta.blurb}</p>
      </header>
      <Suspense fallback={<PageFallback />}>
        <Viz />
      </Suspense>
    </div>
  );
}

export default VisualizePage;
