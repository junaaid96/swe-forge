import { useEffect, useId, useState } from 'react';
import { useTheme } from '../lib/theme';

/** Renders a ```mermaid block as an SVG diagram. Mermaid is loaded only when a page has a diagram. */
export function Mermaid({ source }: { source: string }) {
  const id = `mmd-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const theme = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setSvg(null);
    setFailed(false);
    if (!source.trim()) return () => {
      live = false;
    };
    import('mermaid')
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: theme === 'dark' ? 'dark' : 'default', fontFamily: 'inherit' });
        const { svg } = await mermaid.render(`${id}-${theme}`, source);
        if (live) setSvg(svg);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [source, theme, id]);

  if (failed) return <pre className="mermaid-fallback">{source}</pre>;
  return (
    <figure className="diagram" role="img" aria-label="Diagram">
      {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="diagram-loading">Rendering diagram…</div>}
    </figure>
  );
}
