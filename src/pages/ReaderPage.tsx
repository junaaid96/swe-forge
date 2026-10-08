import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Markdown } from '../components/Markdown';
import { Toc } from '../components/Toc';
import { IconArrowLeft, IconArrowRight, IconBookmark, IconCheck } from '../components/Icons';
import { formatMinutes, readingOrder, urls, useCatalog, useResource } from '../lib/content';
import { progress, useProgress } from '../lib/progress';
import { useHotkeys } from '../lib/hotkeys';
import { KIND_LABEL, type InterviewItem, type Page } from '../lib/types';
import { NotFoundPage } from './NotFoundPage';

function useReadingProgress(ref: RefObject<HTMLElement | null>, dep: unknown) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      setPct(Math.max(0, Math.min(100, ((-r.top + 80) / Math.max(1, total)) * 100)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref, dep]);
  return pct;
}

function QAItem({ item, practice, index }: { item: InterviewItem; practice: boolean; index: number }) {
  const [shown, setShown] = useState(!practice);
  useEffect(() => setShown(!practice), [practice]);
  return (
    <article className="qa" id={item.id}>
      <h2 className="qa-q">
        <span className="qa-n">Q{index + 1}</span> {item.question}
        <a className="anchor" href={`#${item.id}`} aria-label="Link to this question">
          #
        </a>
      </h2>
      {shown ? (
        <div className="qa-a">
          <Markdown>{item.answer}</Markdown>
          {item.example ? (
            <div className="qa-extra">
              <p className="qa-label">Example</p>
              <Markdown>{item.example}</Markdown>
            </div>
          ) : null}
          {item.takeaway ? (
            <div className="qa-takeaway">
              <p className="qa-label">Key takeaway</p>
              <Markdown>{item.takeaway}</Markdown>
            </div>
          ) : null}
          {item.tip ? (
            <div className="qa-extra">
              <p className="qa-label">Interview tip</p>
              <Markdown>{item.tip}</Markdown>
            </div>
          ) : null}
        </div>
      ) : (
        <button type="button" className="btn reveal-btn" onClick={() => setShown(true)}>
          Think it through, then reveal the answer
        </button>
      )}
    </article>
  );
}

export function ReaderPage({ prepMap = false }: { prepMap?: boolean }) {
  const params = useParams();
  const { slug = '', kind = '', id = '' } = params;
  const valid = prepMap || ['notes', 'deep', 'interview'].includes(kind);
  const url = prepMap ? urls.prepMap : valid ? urls.page(slug, kind, id) : null;
  const { data: page, loading, error } = useResource<Page>(url);
  const { data: catalog } = useCatalog();
  const state = useProgress();
  const location = useLocation();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLElement>(null);
  const pct = useReadingProgress(articleRef, page);
  const [practice, setPractice] = useState(() => localStorage.getItem('forgeline:qa-practice') === '1');

  const topic = catalog?.topics.find((t) => t.slug === slug);
  const key = prepMap ? 'prep-map' : `${slug}/${kind}/${id}`;
  const ref = topic?.pages.find((p) => p.key === key);
  const read = Boolean(state.pages[key]?.readAt);
  const bookmarked = state.bookmarks.includes(key);

  const { prev, next } = useMemo(() => {
    if (!catalog) return { prev: undefined, next: undefined };
    const order = [...(catalog.prepMap ? [{ key: 'prep-map', url: '/prep-map', title: catalog.prepMap.title }] : []), ...readingOrder(catalog)];
    const i = order.findIndex((p) => p.key === key);
    return { prev: i > 0 ? order[i - 1] : undefined, next: i >= 0 && i < order.length - 1 ? order[i + 1] : undefined };
  }, [catalog, key]);

  useEffect(() => {
    if (page) {
      progress.visit(key, page.url, page.title);
      document.title = `${page.title} · Forgeline`;
    }
  }, [page, key]);

  useEffect(() => {
    if (!page || !location.hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ block: 'start' });
    }, 30);
    return () => window.clearTimeout(t);
  }, [page, location.hash]);

  useHotkeys({
    m: () => progress.setRead(key, !read),
    b: () => progress.toggleBookmark(key),
    j: () => next && navigate(next.url),
    k: () => prev && navigate(prev.url),
  });

  if (!valid) return <NotFoundPage />;
  if (loading && !page) {
    return (
      <div className="reader-skeleton" role="status" aria-label="Loading page">
        <div className="sk sk-title" />
        <div className="sk" />
        <div className="sk" />
        <div className="sk sk-short" />
      </div>
    );
  }
  if (error || !page) return <NotFoundPage message="This page could not be loaded." />;

  const isQA = page.kind === 'interview' && page.items?.length;
  const tocHeadings = isQA ? page.items!.map((it, i) => ({ depth: 2, id: it.id, text: `Q${i + 1}. ${it.question}` })) : page.headings;
  // Notes start with their own H1; we render our own header, so drop the first H1 line.
  const body = page.markdown.replace(/^#\s+.+\n+/, '');

  return (
    <div className="reader">
      <div className="read-progress" aria-hidden>
        <span style={{ width: `${pct}%`, background: topic?.accent }} />
      </div>
      <article className="reader-main" ref={articleRef} style={{ ['--topic' as string]: topic?.accent ?? 'var(--accent)' }}>
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden>/</span>
          {topic ? <Link to={`/topics/${topic.slug}`}>{topic.emoji} {topic.title}</Link> : <span>Guides</span>}
          <span aria-hidden>/</span>
          <span aria-current="page">{KIND_LABEL[page.kind]}</span>
        </nav>
        <header className="reader-head">
          <p className="eyebrow">{prepMap ? 'Study roadmap' : KIND_LABEL[page.kind]}</p>
          <h1>{page.title}</h1>
          <div className="reader-meta">
            {ref ? <span>{formatMinutes(ref.minutes)} read</span> : catalog?.prepMap && prepMap ? <span>{formatMinutes(catalog.prepMap.minutes)} read</span> : null}
            {isQA ? <span>{page.items!.length} questions</span> : <span>{page.headings.filter((h) => h.depth === 2).length} sections</span>}
            {read ? <span className="chip chip-good">Read</span> : null}
          </div>
          <div className="row">
            <button type="button" className={`btn ${read ? 'btn-good' : ''}`} onClick={() => progress.setRead(key, !read)} aria-pressed={read} title="Shortcut: M">
              <IconCheck /> {read ? 'Read' : 'Mark as read'}
            </button>
            <button type="button" className={`btn ${bookmarked ? 'btn-accent' : ''}`} onClick={() => progress.toggleBookmark(key)} aria-pressed={bookmarked} title="Shortcut: B">
              <IconBookmark /> {bookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
            {isQA ? (
              <label className="switch">
                <input
                  type="checkbox"
                  checked={practice}
                  onChange={(e) => {
                    setPractice(e.target.checked);
                    localStorage.setItem('forgeline:qa-practice', e.target.checked ? '1' : '0');
                  }}
                />
                <span>Practice mode (hide answers)</span>
              </label>
            ) : null}
          </div>
        </header>

        <details className="toc-mobile">
          <summary>On this page</summary>
          <Toc headings={tocHeadings} title="Contents" />
        </details>

        {isQA ? (
          <div className="qa-list">
            {page.items!.map((it, i) => (
              <QAItem key={it.id} item={it} practice={practice} index={i} />
            ))}
          </div>
        ) : (
          <Markdown>{body}</Markdown>
        )}

        <footer className="reader-foot">
          {!read ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => progress.setRead(key, true)}>
              <IconCheck /> I've finished this page
            </button>
          ) : (
            <p className="good">
              <IconCheck /> Marked as read · nice work.
            </p>
          )}
          <nav className="pager" aria-label="Pages">
            {prev ? (
              <Link to={prev.url} className="pager-link">
                <small>
                  <IconArrowLeft width={14} height={14} /> Previous
                </small>
                <span>{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={next.url} className="pager-link next">
                <small>
                  Next <IconArrowRight width={14} height={14} />
                </small>
                <span>{next.title}</span>
              </Link>
            ) : null}
          </nav>
        </footer>
      </article>
      <aside className="reader-aside">
        <Toc headings={tocHeadings} />
      </aside>
    </div>
  );
}

export default ReaderPage;
