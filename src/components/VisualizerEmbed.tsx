import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { VISUALIZERS, vizLoader } from '../visualizers/registry';
import { PageFallback } from './Layout';

/** Lazy in-guide embed: the visualizer chunk loads only near the viewport. */
export function VisualizerEmbed({ id }: { id: string }) {
  const meta = VISUALIZERS.find((v) => v.id === id);
  const hostRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const Viz = useMemo(() => vizLoader(id), [id]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  if (!meta || !Viz) return null;
  return (
    <div className="card pad viz-embed" ref={hostRef} data-testid={`viz-embed-${id}`}>
      <div className="row-between">
        <p className="eyebrow">
          <span aria-hidden>{meta.emoji}</span> Interactive
        </p>
        <Link to={`/visualize/${id}`} className="small">
          Open full visualizer →
        </Link>
      </div>
      {near ? (
        <Suspense fallback={<PageFallback />}>
          <Viz />
        </Suspense>
      ) : (
        <p className="muted">{meta.title} — scroll to load.</p>
      )}
    </div>
  );
}
