import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatMinutes, useCatalog } from '../lib/content';
import { useProgress } from '../lib/progress';
import { usePractice } from '../lib/practiceStore';
import { pathProgress, stepStatus, type StepStatus } from '../lib/paths';
import type { PathStepType } from '../lib/types';
import { Ring } from '../components/Ring';
import { IconArrowRight, IconCheck } from '../components/Icons';
import { PageFallback } from '../components/Layout';
import { NotFoundPage } from './NotFoundPage';

const TYPE_META: Record<PathStepType, { label: string; emoji: string }> = {
  guide: { label: 'Guide', emoji: '📖' },
  quiz: { label: 'Quiz', emoji: '❓' },
  flashcards: { label: 'Flashcards', emoji: '🃏' },
  interview: { label: 'Interview', emoji: '🎤' },
  practice: { label: 'Practice', emoji: '💻' },
};

export function PathDetailPage() {
  const { slug = '' } = useParams();
  const { data: catalog, loading } = useCatalog();
  const state = useProgress();
  const practice = usePractice();
  const path = catalog?.paths?.find((p) => p.slug === slug);
  const prog = useMemo(() => (path ? pathProgress(path, state, practice) : null), [path, state, practice]);

  useEffect(() => {
    if (path) document.title = `${path.title} · Learning path · Forgeline`;
  }, [path]);

  if (loading && !catalog) return <PageFallback />;
  if (!path || !prog) return <NotFoundPage message="That learning path doesn't exist." />;

  const statuses: StepStatus[] = path.steps.map((s) => stepStatus(s, state, practice));

  return (
    <div className="track" style={{ ['--topic' as string]: path.accent }} data-testid="path-detail">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden>/</span>
        <Link to="/paths">Learning paths</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{path.title}</span>
      </nav>
      <header className="topic-hero card">
        <div className="topic-hero-main">
          <span className="topic-emoji lg" aria-hidden>
            {path.emoji}
          </span>
          <div>
            <p className="eyebrow">Learning path</p>
            <h1>{path.title}</h1>
            <p className="lead">{path.blurb}</p>
            <div className="row">
              {prog.next ? (
                <Link className="btn btn-primary" to={prog.next.url} data-testid="next-step">
                  {prog.done ? `Next: ${prog.next.label}` : `Start: ${prog.next.label}`} <IconArrowRight />
                </Link>
              ) : (
                <p className="good">
                  <IconCheck /> Path complete — nice work.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="topic-hero-stats">
          <Ring value={prog.pct} size={84} stroke={8} color={path.accent} label={`${prog.pct}% complete`} />
          <small className="muted">
            {prog.done}/{prog.total} steps · ~{path.estimatedHours}h
          </small>
        </div>
      </header>

      <ol className="track-stages">
        <li className="track-stage">
          <ul className="track-items">
            {path.steps.map((step, i) => {
              const st = statuses[i];
              const meta = TYPE_META[step.type];
              return (
                <li key={`${step.type}:${step.ref}`}>
                  <Link to={step.url} className={`page-row ${st === 'done' ? 'read' : ''}`} aria-current={step === prog.next ? 'step' : undefined}>
                    <span className={`read-dot ${st === 'done' ? 'read' : ''}`} aria-label={st === 'done' ? 'Done' : st === 'active' ? 'In progress' : 'Not started'}>
                      {st === 'done' ? <IconCheck width={10} height={10} strokeWidth={3} /> : null}
                    </span>
                    <span className="page-row-main">
                      <strong>
                        {i + 1}. {step.label}
                      </strong>
                      <small>
                        <span aria-hidden>{meta.emoji}</span> {meta.label}
                        {st === 'active' ? ' · in progress' : ''}
                      </small>
                    </span>
                    <span className="page-row-meta">{formatMinutes(step.minutes)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      </ol>
    </div>
  );
}

export default PathDetailPage;
