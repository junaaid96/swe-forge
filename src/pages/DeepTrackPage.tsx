import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { deepTrackLabel, isDeepTrack, type DeepTrackContent } from '../data/types';
import { fetchDeepTrack, fetchTopic } from '../services/api';
import { progressStore } from '../store/progress';

export function DeepTrackPage() {
  const { slug = '', track = '' } = useParams();
  const [content, setContent] = useState<DeepTrackContent | null>(null);
  const [title, setTitle] = useState(slug);
  const [accent, setAccent] = useState('#0D9488');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openH, setOpenH] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !isDeepTrack(track)) {
      setError('Invalid deep track');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchTopic(slug), fetchDeepTrack(slug, track)])
      .then(([topic, deep]) => {
        if (cancelled) return;
        if (topic) {
          setTitle(topic.title);
          setAccent(topic.accent);
        }
        if (!deep) {
          setError('Deep content not found');
          setContent(null);
          return;
        }
        setContent(deep);
        setError(null);
        progressStore.markDeepVisited(slug, track);
        if (deep.sections[0]) setOpenH(deep.sections[0].h);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, track]);

  if (loading) return <div className="panel content-panel">Loading deep lesson…</div>;
  if (error || !content) {
    return (
      <div className="panel content-panel">
        <h2>Not found</h2>
        <p className="muted">{error}</p>
        <Link to={slug ? `/topics/${slug}` : '/'}>Back</Link>
      </div>
    );
  }

  return (
    <div className="lesson-page">
      <nav className="breadcrumbs muted">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={`/topics/${slug}`}>{title}</Link>
        <span>/</span>
        <span>Deep</span>
        <span>/</span>
        <span>{deepTrackLabel(content.track)}</span>
      </nav>

      <section className="panel content-panel">
        <div className="accent-kicker" style={{ ['--cat' as string]: accent }}>
          Deep · {deepTrackLabel(content.track)}
        </div>
        <h1>{content.title}</h1>

        {content.sections.length > 0 ? (
          <div className="qa-list">
            {content.sections.map((sec) => {
              const open = openH === sec.h;
              return (
                <article key={sec.h} className={`qa-card ${open ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="qa-toggle"
                    onClick={() => setOpenH(open ? null : sec.h)}
                  >
                    <strong>{sec.h}</strong>
                    <span>{open ? '−' : '+'}</span>
                  </button>
                  {open ? (
                    <div className="qa-body md-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec.b}</ReactMarkdown>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="md-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.markdown}</ReactMarkdown>
          </div>
        )}
      </section>
    </div>
  );
}
