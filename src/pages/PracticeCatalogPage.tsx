import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { topicMap, useCatalog, useResource, urls } from '../lib/content';
import { practice, statusOf, usePractice, type PracticeStatus } from '../lib/practiceStore';
import type { PracticeIndex } from '../lib/types';
import { PageFallback } from '../components/Layout';
import { IconArrowRight, IconCode } from '../components/Icons';

const DIFF_RANK = { easy: 0, medium: 1, hard: 2 } as const;
const STATUS_LABEL: Record<PracticeStatus, string> = { unsolved: 'Unsolved', attempted: 'Attempted', solved: 'Solved', 'solved-hints': 'Solved · hints' };

function useParam(params: URLSearchParams, key: string) {
  return params.get(key) ?? '';
}

export function PracticeCatalogPage() {
  const [params, setParams] = useSearchParams();
  const { data: catalog } = useCatalog();
  const { data: index, loading, error } = useResource<PracticeIndex>(urls.practice);
  const state = usePractice();

  useEffect(() => {
    document.title = 'Practice Lab · Forgeline';
  }, []);

  const q = useParam(params, 'q').toLowerCase();
  const fTopic = useParam(params, 'topic');
  const fLang = useParam(params, 'language');
  const fDiff = useParam(params, 'difficulty');
  const fStatus = useParam(params, 'status');
  const fTag = useParam(params, 'tag').toLowerCase();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const topics = useMemo(() => topicMap(catalog), [catalog]);
  const order = useMemo(() => {
    const m = new Map<string, number>();
    catalog?.topics.forEach((t, i) => m.set(t.slug, i));
    return m;
  }, [catalog]);

  const languages = useMemo(() => [...new Set((index?.challenges ?? []).flatMap((c) => c.languages))].sort(), [index]);
  const tags = useMemo(() => [...new Set((index?.challenges ?? []).flatMap((c) => c.tags))].sort(), [index]);

  const filtered = useMemo(() => {
    const list = (index?.challenges ?? []).filter((c) => {
      if (fTopic && c.topic !== fTopic) return false;
      if (fLang && !c.languages.includes(fLang)) return false;
      if (fDiff && c.difficulty !== fDiff) return false;
      if (fTag && !c.tags.some((t) => t.toLowerCase().includes(fTag))) return false;
      if (fStatus && statusOf(state.records[c.id]) !== fStatus) return false;
      if (q && !`${c.title} ${c.tags.join(' ')} ${topics.get(c.topic)?.title ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort(
      (a, b) => (order.get(a.topic) ?? 99) - (order.get(b.topic) ?? 99) || DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty] || a.title.localeCompare(b.title),
    );
  }, [index, fTopic, fLang, fDiff, fStatus, fTag, q, state.records, topics, order]);

  const solved = useMemo(
    () => (index?.challenges ?? []).filter((c) => statusOf(state.records[c.id]) === 'solved' || statusOf(state.records[c.id]) === 'solved-hints').length,
    [index, state.records],
  );
  const last = state.lastChallenge && index?.challenges.some((c) => c.id === state.lastChallenge?.id) ? state.lastChallenge : null;

  if (loading && !index) return <PageFallback />;
  if (error || !index) return <p className="card pad">Could not load the Practice Lab. {error}</p>;

  return (
    <div className="practice-catalog">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">Practice Lab</span>
      </nav>
      <header className="card pad practice-hero">
        <div>
          <p className="eyebrow">Practice Lab</p>
          <h1>Learn a concept, then prove it with code</h1>
          <p className="lead muted">
            {index.challenges.length} challenges · {solved} solved · your code runs in the browser and never leaves it
          </p>
        </div>
        {last ? (
          <Link className="btn btn-primary" to={last.url} onClick={() => practice.visit(last.id, last.url, last.title)}>
            Continue: {last.title} <IconArrowRight />
          </Link>
        ) : null}
      </header>

      <form className="card pad practice-filters" role="search" aria-label="Filter challenges" onSubmit={(e) => e.preventDefault()}>
        <label className="field">
          <span className="field-label">Search</span>
          <input type="search" value={params.get('q') ?? ''} onChange={(e) => set('q', e.target.value)} placeholder="Title, tag or topic…" aria-label="Search challenges" />
        </label>
        <label className="field">
          <span className="field-label">Topic</span>
          <select value={fTopic} onChange={(e) => set('topic', e.target.value)} aria-label="Filter by topic">
            <option value="">All topics</option>
            {catalog?.topics
              .filter((t) => t.practiceCount)
              .map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.title} ({t.practiceCount})
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Language</span>
          <select value={fLang} onChange={(e) => set('language', e.target.value)} aria-label="Filter by language">
            <option value="">All languages</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Difficulty</span>
          <select value={fDiff} onChange={(e) => set('difficulty', e.target.value)} aria-label="Filter by difficulty">
            <option value="">All levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Status</span>
          <select value={fStatus} onChange={(e) => set('status', e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="unsolved">Unsolved</option>
            <option value="attempted">Attempted</option>
            <option value="solved">Solved</option>
            <option value="solved-hints">Solved · hints</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Tag</span>
          <input type="text" list="practice-tags" value={params.get('tag') ?? ''} onChange={(e) => set('tag', e.target.value)} placeholder="e.g. hash-table" aria-label="Filter by tag" />
          <datalist id="practice-tags">
            {tags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
      </form>

      <p className="muted small" aria-live="polite">
        Showing {filtered.length} of {index.challenges.length} challenges
      </p>
      {filtered.length === 0 ? (
        <p className="card pad muted">No challenges match these filters.</p>
      ) : (
        <ul className="challenge-list">
          {filtered.map((c) => {
            const st = statusOf(state.records[c.id]);
            const t = topics.get(c.topic);
            return (
              <li key={c.id}>
                <Link to={c.url} className="challenge-row card" onClick={() => practice.visit(c.id, c.url, c.title)}>
                  <span className="challenge-main">
                    <strong>{c.title}</strong>
                    <small className="muted">
                      {t?.emoji} {t?.title ?? c.topic} · {c.estimatedMinutes} min · {c.languages.join(', ') || 'think & check'}
                      {c.tags.length ? ` · ${c.tags.join(', ')}` : ''}
                    </small>
                  </span>
                  <span className="challenge-chips">
                    <span className={`chip diff-${c.difficulty}`}>{c.difficulty}</span>
                    <span className={`chip ${st === 'unsolved' ? '' : st === 'attempted' ? 'chip-warn' : 'chip-good'}`}>{STATUS_LABEL[st]}</span>
                    <IconCode aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PracticeCatalogPage;
