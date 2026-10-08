import { memo, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import { Link } from 'react-router-dom';

interface HastLike {
  type: string;
  value?: string;
  children?: HastLike[];
}

function hastText(node: HastLike | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(hastText).join('');
}

function CodeBlock(props: ComponentPropsWithoutRef<'pre'>) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref.current?.innerText ?? '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="code-block">
      <button type="button" className="copy-btn" onClick={copy} aria-label="Copy code">
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre ref={ref} {...props} tabIndex={0} />
    </div>
  );
}

function heading(Tag: 'h2' | 'h3' | 'h4') {
  return function H({ id, children, ...rest }: ComponentPropsWithoutRef<'h2'> & { node?: unknown }) {
    delete (rest as { node?: unknown }).node;
    return (
      <Tag id={id} {...rest}>
        {children}
        {id ? (
          <a className="anchor" href={`#${id}`} aria-label="Link to this section">
            #
          </a>
        ) : null}
      </Tag>
    );
  };
}

const components: Components = {
  pre: ({ node: _node, ...props }) => <CodeBlock {...props} />,
  a: ({ node: _node, href = '', children, ...props }) => {
    if (href.startsWith('/')) return <Link to={href}>{children}</Link>;
    if (href.startsWith('#')) return <a href={href} {...props}>{children}</a>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  table: ({ node: _node, ...props }) => (
    <div className="table-wrap" tabIndex={0}>
      <table {...props} />
    </div>
  ),
  blockquote: ({ node, children, ...props }) => {
    const text = hastText(node as unknown as HastLike).trim();
    const asked = /^asked as\b/i.test(text);
    return (
      <blockquote className={asked ? 'callout callout-interview' : undefined} {...props}>
        {asked ? <span className="callout-label">🎤 Interview</span> : null}
        {children as ReactNode}
      </blockquote>
    );
  },
  h2: heading('h2'),
  h3: heading('h3'),
  h4: heading('h4'),
  img: ({ node: _node, alt, ...props }) => <img alt={alt ?? ''} loading="lazy" {...props} />,
};

function MarkdownImpl({ children, className = 'prose' }: { children: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: false }]]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
export default Markdown;
