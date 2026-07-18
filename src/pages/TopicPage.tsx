import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { PracticePanel } from '../components/PracticePanel';
import { QuizPanel } from '../components/QuizPanel';
import { CATEGORIES, TOPIC_COMPLETE_BONUS } from '../data/categories';
import { useTopic, useTopicSummaries } from '../hooks/useTopics';
import { getTopicProgress, progressStore, useProgress } from '../store/progress';

type TabId = 'learn' | 'code' | 'tips' | 'quiz' | 'practice' | 'links';

const TABS: { id: TabId; label: string }[] = [
  { id: 'learn', label: 'Learn' },
  { id: 'code', label: 'Code' },
  { id: 'tips', label: 'Tips' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'practice', label: 'Practice' },
  { id: 'links', label: 'Connections' },
];

export function TopicPage() {
  const { slug = '' } = useParams();
  const { topic, loading, error } = useTopic(slug);
  const { topics: summaries } = useTopicSummaries();
  const progress = useProgress();
  const [tab, setTab] = useState<TabId>('learn');
  const [expanded, setExpanded] = useState<number | null>(0);

  useEffect(() => {
    if (!topic) return;
    progressStore.markVisited(topic.slug);
    setTab('learn');
    setExpanded(0);
  }, [topic?.slug]);

  if (loading) {
    return <div className="panel content-panel empty-state">Loading lesson…</div>;
  }

  if (error || !topic) {
    return <Navigate to="/" replace />;
  }

  const cat = CATEGORIES[topic.cat];
  const tp = getTopicProgress(progress, topic.slug);
  const idx = summaries.findIndex((t) => t.slug === topic.slug);
  const prev = idx > 0 ? summaries[idx - 1] : null;
  const next = idx >= 0 && idx < summaries.length - 1 ? summaries[idx + 1] : null;
  const related = (topic.relatedSlugs ?? [])
    .map((s) => summaries.find((t) => t.slug === s))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const topicScore =
    tp.quizBest +
    topic.problems
      .filter((p) => tp.problemsSolved.includes(p.id))
      .reduce((n, p) => n + p.points, 0) +
    (tp.completed ? TOPIC_COMPLETE_BONUS : 0);

  return (
    <div className="topic-layout topic-layout-wide">
      <header className="panel topic-header">
        <div className="topic-header-row">
          <div className="topic-title-wrap">
            <span className="emoji">{topic.emoji}</span>
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <h1>{topic.title}</h1>
                <span
                  className="cat-badge"
                  style={{
                    ['--cat-bg' as string]: cat.bg,
                    ['--cat-text' as string]: cat.text,
                    ['--cat-border' as string]: cat.border,
                  }}
                >
                  {cat.label}
                </span>
                {tp.completed ? (
                  <span
                    className="cat-badge"
                    style={{
                      background: 'var(--good-bg)',
                      color: 'var(--good)',
                      borderColor: '#86efac',
                    }}
                  >
                    Completed
                  </span>
                ) : null}
              </div>
              <p>{topic.tag}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              className="muted"
              style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              Topic score
            </div>
            <strong style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', color: cat.text }}>
              {topicScore}
            </strong>
          </div>
        </div>

        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'quiz' ? ` (${topic.quiz.length})` : ''}
              {t.id === 'practice' ? ` (${topic.problems.length})` : ''}
            </button>
          ))}
        </div>
      </header>

      <div className={tab === 'learn' ? 'topic-body-grid' : undefined}>
        {tab === 'learn' ? (
          <aside className="panel on-this-page">
            <strong>On this page</strong>
            <ol>
              {topic.sections.map((sec, i) => (
                <li key={sec.h}>
                  <button type="button" onClick={() => setExpanded(i)}>
                    {sec.h}
                  </button>
                </li>
              ))}
            </ol>
          </aside>
        ) : null}

        <section className="panel content-panel">
          {tab === 'learn' && (
            <div className="accordion">
              {topic.sections.map((sec, i) => (
                <div key={sec.h} className="acc-item" id={`sec-${i}`}>
                  <button
                    type="button"
                    className="acc-btn"
                    onClick={() => setExpanded(expanded === i ? null : i)}
                  >
                    <span>{sec.h}</span>
                    <span className="open-mark">{expanded === i ? '−' : '+'}</span>
                  </button>
                  {expanded === i ? <div className="acc-body">{sec.b}</div> : null}
                </div>
              ))}
              <div className="row-actions" style={{ marginTop: '0.75rem' }}>
                <button type="button" className="primary-btn" onClick={() => setTab('quiz')}>
                  Test knowledge →
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => progressStore.markCompleted(topic.slug)}
                >
                  Mark topic complete
                </button>
              </div>
            </div>
          )}

          {tab === 'code' && (
            <div className="code-frame">
              <div className="code-chrome">
                <span className="dot-r" />
                <span className="dot-y" />
                <span className="dot-g" />
                <span style={{ marginLeft: 8 }}>practical example</span>
              </div>
              <pre>{topic.code}</pre>
            </div>
          )}

          {tab === 'tips' && (
            <div className="tip-list">
              {topic.tips.map((tip) => (
                <div key={tip} className="tip">
                  <span>✓</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'quiz' && <QuizPanel slug={topic.slug} questions={topic.quiz} />}

          {tab === 'practice' && (
            <PracticePanel
              slug={topic.slug}
              problems={topic.problems}
              solvedIds={tp.problemsSolved}
            />
          )}

          {tab === 'links' && (
            <div>
              <p className="muted">Topics that reinforce {topic.title}:</p>
              {related.length ? (
                <div className="chip-row" style={{ marginBottom: '1rem' }}>
                  {related.map((r) => (
                    <Link key={r.slug} className="chip related-link" to={`/learn/${r.slug}`}>
                      {r.emoji} {r.title}
                    </Link>
                  ))}
                </div>
              ) : null}
              <div className="chip-row">
                {topic.connections.map((c) => (
                  <span
                    key={c}
                    className="chip"
                    style={{
                      ['--cat-bg' as string]: cat.bg,
                      ['--cat-text' as string]: cat.text,
                      ['--cat-border' as string]: cat.border,
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="row-actions" style={{ justifyContent: 'space-between' }}>
        {prev ? (
          <Link className="secondary-btn" to={`/learn/${prev.slug}`}>
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link className="primary-btn" to={`/learn/${next.slug}`}>
            {next.title} →
          </Link>
        ) : (
          <Link className="primary-btn" to="/interview">
            Interview guide →
          </Link>
        )}
      </div>
    </div>
  );
}
