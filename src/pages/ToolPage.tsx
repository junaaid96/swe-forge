/** Single-tool runner: breadcrumb, workspace, related tools. */
import { Suspense, lazy, useEffect, type ComponentType, type LazyExoticComponent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { relatedTools, toolBySlug } from '../tools/registry';
import { useToolPrefs } from '../tools/store';
import { PageFallback } from '../components/Layout';
import { IconArrowLeft, IconArrowRight, IconCode, IconStar } from '../components/Icons';

const TOOL_COMPONENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  json: lazy(() => import('../tools/format').then((m) => ({ default: m.JsonTool }))),
  'csv-json': lazy(() => import('../tools/format').then((m) => ({ default: m.CsvJsonTool }))),
  markdown: lazy(() => import('../tools/format').then((m) => ({ default: m.MarkdownTool }))),
  'base-converter': lazy(() => import('../tools/format').then((m) => ({ default: m.BaseConverterTool }))),
  encoders: lazy(() => import('../tools/encode').then((m) => ({ default: m.EncodersTool }))),
  hash: lazy(() => import('../tools/encode').then((m) => ({ default: m.HashTool }))),
  'ids-secrets': lazy(() => import('../tools/encode').then((m) => ({ default: m.IdsTool }))),
  jwt: lazy(() => import('../tools/encode').then((m) => ({ default: m.JwtTool }))),
  regex: lazy(() => import('../tools/web').then((m) => ({ default: m.RegexTool }))),
  time: lazy(() => import('../tools/web').then((m) => ({ default: m.TimeTool }))),
  'curl-api': lazy(() => import('../tools/web').then((m) => ({ default: m.CurlTool }))),
  color: lazy(() => import('../tools/web').then((m) => ({ default: m.ColorTool }))),
  diff: lazy(() => import('../tools/text').then((m) => ({ default: m.DiffTool }))),
  'text-case': lazy(() => import('../tools/text').then((m) => ({ default: m.TextCaseTool }))),
  git: lazy(() => import('../tools/text').then((m) => ({ default: m.GitTool }))),
  docker: lazy(() => import('../tools/text').then((m) => ({ default: m.DockerTool }))),
  tokens: lazy(() => import('../tools/labs').then((m) => ({ default: m.TokensTool }))),
  'mock-data': lazy(() => import('../tools/labs').then((m) => ({ default: m.MockDataTool }))),
  subnet: lazy(() => import('../tools/labs').then((m) => ({ default: m.SubnetTool }))),
  sql: lazy(() => import('../tools/enrich').then((m) => ({ default: m.SqlTool }))),
  qr: lazy(() => import('../tools/enrich').then((m) => ({ default: m.QrTool }))),
  unicode: lazy(() => import('../tools/enrich').then((m) => ({ default: m.UnicodeTool }))),
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

  if (!meta || !slug || !TOOL_COMPONENTS[slug]) {
    return (
      <div className="page narrow">
        <p className="empty-state">
          No tool at this address. <Link to="/tools">Browse all tools</Link>.
        </p>
      </div>
    );
  }

  const Tool = TOOL_COMPONENTS[slug];
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
        <Suspense key={slug} fallback={<PageFallback />}>
          <Tool key={slug} />
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
