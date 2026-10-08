import { useEffect, useState } from 'react';
import type { Heading } from '../lib/types';

function useScrollSpy(idsKey: string) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const ids = idsKey ? idsKey.split('|') : [];
    if (!ids.length) return;
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => Boolean(e));
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
          else visible.delete(e.target.id);
        }
        if (visible.size) {
          const top = [...visible.entries()].sort((a, b) => a[1] - b[1])[0][0];
          setActive(top);
        } else {
          // Above the first visible heading: pick the last heading scrolled past.
          const passed = els.filter((el) => el.getBoundingClientRect().top < 120);
          if (passed.length) setActive(passed[passed.length - 1].id);
        }
      },
      { rootMargin: '-72px 0px -65% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [idsKey]);
  return active;
}

export function Toc({ headings, title = 'On this page' }: { headings: Heading[]; title?: string }) {
  const active = useScrollSpy(headings.map((h) => h.id).join('|'));
  if (headings.length < 2) return null;
  return (
    <nav className="toc" aria-label={title}>
      <p className="toc-title">{title}</p>
      <ol>
        {headings.map((h) => (
          <li key={h.id} className={`depth-${h.depth} ${active === h.id ? 'active' : ''}`}>
            <a href={`#${h.id}`} aria-current={active === h.id ? 'location' : undefined}>
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
