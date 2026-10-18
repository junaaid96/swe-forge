import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { urls, useResource } from '../lib/content';
import { DESIGN_SECTIONS, designStore, useDesign, type DesignSectionKey } from '../lib/design';
import { reviewDesign } from '../lib/designReview';
import { AiError } from '../lib/ai';
import { Markdown } from '../components/Markdown';
import { Mermaid } from '../components/Mermaid';
import { IconCheck } from '../components/Icons';
import { PageFallback } from '../components/Layout';
import { NotFoundPage } from './NotFoundPage';
import type { DesignDetail } from '../lib/types';

type Tab = 'brief' | 'workspace' | 'rubric' | 'model';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'brief', label: 'Brief' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'rubric', label: 'Rubric' },
  { id: 'model', label: 'Model answer' },
];

function useDebouncedSave(slug: string, key: DesignSectionKey, value: string) {
  useEffect(() => {
    const t = window.setTimeout(() => designStore.setSection(slug, key, value), 400);
    return () => window.clearTimeout(t);
  }, [slug, key, value]);
}

function SectionEditor({ slug, k, label, hint, initial }: { slug: string; k: DesignSectionKey; label: string; hint: string; initial: string }) {
  const [value, setValue] = useState(initial);
  useDebouncedSave(slug, k, value);
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="muted small">{hint}</span>
      <textarea value={value} onChange={(e) => setValue(e.target.value)} onBlur={() => designStore.setSection(slug, k, value)} rows={5} data-testid={`design-${k}`} />
    </label>
  );
}

export function DesignWorkspacePage() {
  const { slug = '' } = useParams();
  const { data: prompt, loading } = useResource<DesignDetail>(slug ? urls.designPrompt(slug) : null);
  const { attempts } = useDesign();
  const [tab, setTab] = useState<Tab>('brief');
  const [review, setReview] = useState<string | null>(null);
  const [reviewErr, setReviewErr] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [mermaid, setMermaid] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const liveMermaid = mermaid ?? attempts[slug]?.mermaid ?? '';
  useEffect(() => {
    const t = window.setTimeout(() => setPreview(liveMermaid), 500);
    return () => window.clearTimeout(t);
  }, [liveMermaid]);

  useEffect(() => {
    if (prompt) document.title = `${prompt.title} · System design · Forgeline`;
  }, [prompt]);
  useEffect(() => {
    setTab('brief');
    setReview(null);
    setReviewErr('');
    setMermaid(null);
  }, [slug]);

  if (loading && !prompt) return <PageFallback />;
  if (!prompt) return <NotFoundPage message="That design prompt doesn't exist." />;
  const attempt = attempts[slug];
  const totalChecks = prompt.rubric.reduce((a, r) => a + r.points.length, 0);
  const doneChecks = attempt?.checks.length ?? 0;

  const doReview = async () => {
    if (!attempt) return;
    setReviewBusy(true);
    setReviewErr('');
    try {
      const text = await reviewDesign(prompt, attempt);
      setReview(text);
      designStore.update(slug, { review: text });
    } catch (e) {
      setReviewErr(e instanceof AiError ? e.message : 'Review failed. Try again.');
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <div className="page" data-testid="design-workspace">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden>/</span>
        <Link to="/design">System design</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{prompt.title}</span>
      </nav>
      <header className="page-head">
        <p className="eyebrow">
          <span aria-hidden>{prompt.emoji}</span> System design
        </p>
        <h1>{prompt.title}</h1>
        <p className="lead">{prompt.blurb}</p>
      </header>

      <div className="segmented tabs" role="tablist" aria-label="Design workspace">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} data-testid={`design-tab-${t.id}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'brief' ? (
        <section className="card pad" aria-label="Brief">
          <Markdown>{prompt.brief}</Markdown>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => setTab('workspace')}>
              Start designing
            </button>
          </div>
        </section>
      ) : null}

      {tab === 'workspace' ? (
        <section aria-label="Workspace" className="design-workspace">
          {DESIGN_SECTIONS.map((s) => (
            <SectionEditor key={`${slug}:${s.key}`} slug={slug} k={s.key} label={s.label} hint={s.hint} initial={attempt?.sections[s.key] ?? ''} />
          ))}
          <div className="field">
            <span className="field-label">Architecture diagram (Mermaid)</span>
            <span className="muted small">Live preview renders as you type.</span>
            <textarea
              value={liveMermaid}
              onChange={(e) => {
                setMermaid(e.target.value);
                designStore.update(slug, { mermaid: e.target.value });
              }}
              rows={6}
              spellCheck={false}
              data-testid="design-mermaid"
            />
          </div>
          <Mermaid source={preview ?? ''} />
          <div className="row">
            <button type="button" className="btn btn-accent" data-testid="design-review" disabled={reviewBusy} onClick={doReview} title="AI review against the rubric (needs a Groq key)">
              {reviewBusy ? 'Reviewing…' : 'AI review my design'}
            </button>
          </div>
          {reviewErr ? (
            <p className="tool-error" role="alert">
              {reviewErr}
            </p>
          ) : null}
          {(review ?? attempt?.review) ? (
            <section className="card pad" aria-label="AI review" data-testid="design-review-result">
              <Markdown>{(review ?? attempt?.review) as string}</Markdown>
            </section>
          ) : null}
        </section>
      ) : null}

      {tab === 'rubric' ? (
        <section aria-label="Rubric checklist">
          <p className="muted">
            {doneChecks}/{totalChecks} covered — check off each point your design addresses.
          </p>
          {prompt.rubric.map((r, di) => (
            <div key={r.dimension} className="card pad rubric-dim">
              <h3>{r.dimension}</h3>
              <ul className="rubric-points">
                {r.points.map((p, pi) => {
                  const id = `${di}:${pi}`;
                  const on = attempt?.checks.includes(id) ?? false;
                  return (
                    <li key={id}>
                      <label>
                        <input type="checkbox" checked={on} onChange={() => designStore.toggleCheck(slug, id)} />
                        <span>{p}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {tab === 'model' ? (
        <section className="card pad" aria-label="Model answer">
          {!attempt?.revealed ? (
            <div>
              <p>Compare only after attempting the design yourself — spoilers below.</p>
              <button type="button" className="btn btn-primary" data-testid="design-reveal" onClick={() => designStore.update(slug, { revealed: true })}>
                Reveal model answer
              </button>
            </div>
          ) : (
            <div data-testid="design-model">
              <Markdown>{prompt.modelAnswer}</Markdown>
            </div>
          )}
        </section>
      ) : null}

      {attempt ? (
        <p className="muted small">
          <IconCheck width={12} height={12} /> Attempt saved locally · {new Date(attempt.updatedAt).toISOString().slice(0, 10)}
        </p>
      ) : null}
    </div>
  );
}

export default DesignWorkspacePage;
