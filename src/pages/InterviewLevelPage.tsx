import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { interviewLevelLabel, isInterviewLevel, type InterviewLevelContent } from '../data/types';
import { fetchInterviewLevel, fetchTopic } from '../services/api';
import { progressStore } from '../store/progress';

export function InterviewLevelPage() {
  const { slug = '', level = '' } = useParams();
  const [content, setContent] = useState<InterviewLevelContent | null>(null);
  const [title, setTitle] = useState(slug);
  const [accent, setAccent] = useState('#0D9488');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !isInterviewLevel(level)) {
      setError('Invalid interview level');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchTopic(slug), fetchInterviewLevel(slug, level)])
      .then(([topic, interview]) => {
        if (cancelled) return;
        if (topic) {
          setTitle(topic.title);
          setAccent(topic.accent);
        }
        if (!interview) {
          setError('Interview content not found');
          setContent(null);
          return;
        }
        setContent(interview);
        setError(null);
        progressStore.markInterviewVisited(slug, level);
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
  }, [slug, level]);

  if (loading) return <div className="panel content-panel">Loading interview…</div>;
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
        <span>Interview</span>
        <span>/</span>
        <span>{interviewLevelLabel(content.level)}</span>
      </nav>

      <section className="panel content-panel">
        <div className="accent-kicker" style={{ ['--cat' as string]: accent }}>
          Interview · {interviewLevelLabel(content.level)}
        </div>
        <h1>{content.title}</h1>
        <p className="muted">{content.items.length} questions</p>

        <div className="qa-list">
          {content.items.map((item) => {
            const open = openId === item.id;
            return (
              <article key={item.id} className={`qa-card ${open ? 'open' : ''}`}>
                <button
                  type="button"
                  className="qa-toggle"
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  <strong>{item.question}</strong>
                  <span>{open ? '−' : '+'}</span>
                </button>
                {open ? (
                  <div className="qa-body md-body">
                    {item.answer ? (
                      <>
                        <h4>Answer</h4>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
                      </>
                    ) : null}
                    {item.example ? (
                      <>
                        <h4>Example</h4>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.example}</ReactMarkdown>
                      </>
                    ) : null}
                    {item.takeaway ? (
                      <p className="takeaway">
                        <strong>Key takeaway:</strong> {item.takeaway}
                      </p>
                    ) : null}
                    {item.tip ? (
                      <p className="muted">
                        <strong>Tip:</strong> {item.tip}
                      </p>
                    ) : null}
                    {!item.answer && !item.example ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.markdown}</ReactMarkdown>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        {content.items.length === 0 ? (
          <div className="md-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.markdown}</ReactMarkdown>
          </div>
        ) : null}
      </section>
    </div>
  );
}
