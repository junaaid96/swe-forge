/** Single-tool runner: breadcrumb, workspace, related tools. */
import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { Link, useParams } from 'react-router-dom';
import { relatedTools, toolBySlug } from '../tools/registry';
import { useToolPrefs } from '../tools/store';
import { PageFallback } from '../components/Layout';
import { IconArrowLeft, IconArrowRight, IconCode, IconStar } from '../components/Icons';

const LOADERS: Record<string, () => Promise<{ default: ComponentType }>> = {
  json: () => import('../tools/format').then((m) => ({ default: m.JsonTool })),
  'csv-json': () => import('../tools/format').then((m) => ({ default: m.CsvJsonTool })),
  markdown: () => import('../tools/format').then((m) => ({ default: m.MarkdownTool })),
  'base-converter': () => import('../tools/format').then((m) => ({ default: m.BaseConverterTool })),
  encoders: () => import('../tools/encode').then((m) => ({ default: m.EncodersTool })),
  hash: () => import('../tools/encode').then((m) => ({ default: m.HashTool })),
  'ids-secrets': () => import('../tools/encode').then((m) => ({ default: m.IdsTool })),
  jwt: () => import('../tools/encode').then((m) => ({ default: m.JwtTool })),
  regex: () => import('../tools/web').then((m) => ({ default: m.RegexTool })),
  time: () => import('../tools/web').then((m) => ({ default: m.TimeTool })),
  'curl-api': () => import('../tools/web').then((m) => ({ default: m.CurlTool })),
  color: () => import('../tools/web').then((m) => ({ default: m.ColorTool })),
  diff: () => import('../tools/text').then((m) => ({ default: m.DiffTool })),
  'text-case': () => import('../tools/text').then((m) => ({ default: m.TextCaseTool })),
  git: () => import('../tools/text').then((m) => ({ default: m.GitTool })),
  docker: () => import('../tools/text').then((m) => ({ default: m.DockerTool })),
  tokens: () => import('../tools/labs').then((m) => ({ default: m.TokensTool })),
  'mock-data': () => import('../tools/labs').then((m) => ({ default: m.MockDataTool })),
  subnet: () => import('../tools/labs').then((m) => ({ default: m.SubnetTool })),
  sql: () => import('../tools/enrich').then((m) => ({ default: m.SqlTool })),
  qr: () => import('../tools/enrich').then((m) => ({ default: m.QrTool })),
  unicode: () => import('../tools/enrich').then((m) => ({ default: m.UnicodeTool })),
};

export function ToolPage() {
  const { slug } = useParams();
  const meta = toolBySlug(slug);
  const { favs, toggleFav, touchRecent } = useToolPrefs();

  useEffect(() => {
    if (slug) touchRecent(slug);
  }, [slug, touchRecent]);

  useEffect(() => {
    document.title = meta ? `${meta.title} · Tools · Forgeline` : 'Tool not found · Forgeline';
  }, [meta]);

  if (!meta || !slug || !LOADERS[slug]) {
    return (
      <div className="page narrow">
        <p className="empty-state">
          No tool at this address. <Link to="/tools">Browse all tools</Link>.
        </p>
      </div>
    );
  }

  const Tool = lazy(LOADERS[slug]);
  const related = relatedTools(slug);
  const fav = favs.includes(slug);

  return (
    <div className="page tool-page">
      <div className="page-head">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden>/</span>
          <Link to="/tools">Tools</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{meta.title}</span>
        </nav>
        <div className="row-between">
          <h1>{meta.title}</h1>
          <button
            type="button"
            className={`btn btn-sm star-toggle ${fav ? 'on' : ''}`}
            onClick={() => toggleFav(slug)}
            aria-pressed={fav}
          >
            <IconStar /> {fav ? 'Favorited' : 'Favorite'}
          </button>
        </div>
        <p className="lead">{meta.blurb}</p>
        <p className="tool-privacy">
          <IconCode width={14} height={14} /> Runs 100% in your browser — input never leaves this tab.
        </p>
      </div>

      <div className="tool-workspace card pad">
        <Suspense fallback={<PageFallback />}>
          <Tool />
        </Suspense>
      </div>

      <nav className="tool-related" aria-label="Related tools">
        <h2>Related tools</h2>
        <div className="tools-grid">
          {related.map((t) => (
            <Link key={t.slug} to={`/tools/${t.slug}`} className="tool-card card tool-card-main">
              <strong>{t.title}</strong>
              <span>{t.blurb}</span>
            </Link>
          ))}
        </div>
        <div className="row tool-actions">
          <Link to="/tools" className="btn btn-sm"><IconArrowLeft /> All tools</Link>
          <Link to={`/tools/${related[0].slug}`} className="btn btn-sm">Next: {related[0].title} <IconArrowRight /></Link>
        </div>
      </nav>
    </div>
  );
}

export default ToolPage;
