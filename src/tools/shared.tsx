/** Shared UI primitives for Tools: copy/download buttons, fields, tabs. */
import { useState, type ReactNode } from 'react';

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function CopyBtn({ text, label = 'Copy', small }: { text: string; label?: string; small?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`btn ${small ? 'btn-sm' : ''}`}
      disabled={!text}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        }
      }}
    >
      {done ? 'Copied' : label}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="tool-field">
      <span className="tool-label">{label}</span>
      {children}
      {hint ? <small className="muted">{hint}</small> : null}
    </label>
  );
}

export function Tabs<T extends string>({ options, value, onChange, ariaLabel }: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="tool-tabs" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={`tool-tab ${o.value === value ? 'on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tool-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function OutputBar({ children }: { children: ReactNode }) {
  return <div className="tool-outputbar">{children}</div>;
}

export function Empty({ text }: { text: string }) {
  return <p className="tool-empty">{text}</p>;
}
