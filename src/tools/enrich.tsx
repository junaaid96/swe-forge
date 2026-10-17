/** Enrichment tools: SQL formatter, QR studio, Unicode inspector. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { format as sqlFormat } from 'sql-formatter';
import QRCode from 'qrcode';
import { CopyBtn, Empty, Field, OutputBar, Stat, Tabs, downloadText } from './shared';

/* ---------------- SQL ---------------- */

type SqlLang = 'sql' | 'postgresql' | 'mysql' | 'sqlite' | 'bigquery' | 'snowflake' | 'tsql';

const SQL_SAMPLE = "select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id=u.id where u.created_at > '2026-01-01' group by u.id, u.name having count(o.id) > 5 order by orders desc limit 20;";

export function SqlTool() {
  const [input, setInput] = useState(SQL_SAMPLE);
  const [lang, setLang] = useState<SqlLang>('sql');
  const [keywordCase, setKeywordCase] = useState<'upper' | 'lower' | 'preserve'>('upper');

  const output = useMemo(() => {
    try {
      return { ok: true as const, text: sqlFormat(input, { language: lang, keywordCase, denseOperators: false }) };
    } catch (e) {
      return { ok: false as const, text: e instanceof Error ? e.message : 'Could not parse SQL' };
    }
  }, [input, lang, keywordCase]);

  const minify = useMemo(() => {
    if (!output.ok) return '';
    return output.text.replace(/\s+/g, ' ').replace(/\s*([(),;=<>])\s*/g, '$1').trim();
  }, [output]);

  const tables = useMemo(() => {
    if (!output.ok) return [];
    const found = new Set<string>();
    for (const m of output.text.matchAll(/(?:FROM|JOIN|UPDATE|INTO)\s+([A-Za-z_][\w.]*)/gi)) found.add(m[1]);
    return [...found];
  }, [output]);

  return (
    <div className="tool-grid">
      <div>
        <Field label="SQL input">
          <textarea className="tool-input mono" rows={12} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        </Field>
        <div className="row tool-actions">
          <button type="button" className="btn btn-sm" onClick={() => setInput(SQL_SAMPLE)}>Sample</button>
          <button type="button" className="btn btn-sm" onClick={() => setInput('')}>Clear</button>
          <Field label="Dialect">
            <select value={lang} onChange={(e) => setLang(e.target.value as SqlLang)} aria-label="SQL dialect">
              <option value="sql">Standard SQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
              <option value="bigquery">BigQuery</option>
              <option value="snowflake">Snowflake</option>
              <option value="tsql">SQL Server (T-SQL)</option>
            </select>
          </Field>
          <Field label="Keywords">
            <select value={keywordCase} onChange={(e) => setKeywordCase(e.target.value as typeof keywordCase)} aria-label="Keyword case">
              <option value="upper">UPPER</option>
              <option value="lower">lower</option>
              <option value="preserve">preserve</option>
            </select>
          </Field>
        </div>
        {tables.length ? <p className="muted small">Tables: {tables.map((t) => <code key={t} className="mono chip">{t}</code>)}</p> : null}
      </div>
      <div>
        {!output.ok ? <p className="tool-error" role="alert">{output.text}</p> : (
          <>
            <dl className="tool-stats">
              <Stat label="Lines" value={String(output.text.split('\n').length)} />
              <Stat label="Minified" value={`${minify.length} chars`} />
            </dl>
            <OutputBar>
              <CopyBtn text={output.text} small />
              <CopyBtn text={minify} small label="Copy minified" />
              <button type="button" className="btn btn-sm" onClick={() => downloadText('query.sql', output.text)}>Download</button>
            </OutputBar>
            <pre className="tool-output mono" tabIndex={0}>{output.text}</pre>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- QR ---------------- */

type QrPreset = 'url' | 'wifi' | 'text';

export function QrTool() {
  const [preset, setPreset] = useState<QrPreset>('url');
  const [url, setUrl] = useState('https://swe-forge.vercel.app/tools');
  const [text, setText] = useState('Hello from Forgeline!');
  const [ssid, setSsid] = useState('HomeWiFi');
  const [pw, setPw] = useState('');
  const [size, setSize] = useState(256);
  const [dark, setDark] = useState('#0f1115');
  const [light, setLight] = useState('#ffffff');
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const payload = preset === 'url' ? url : preset === 'wifi' ? `WIFI:T:WPA;S:${ssid.replace(/;/g, '\\;')};P:${pw.replace(/;/g, '\\;')};;` : text;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!payload.trim()) { setError('Enter something to encode.'); return; }
    QRCode.toCanvas(canvas, payload, { width: size, margin: 2, color: { dark, light } })
      .then(() => setError(''))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not encode'));
  }, [payload, size, dark, light]);

  const download = async (kind: 'png' | 'svg') => {
    try {
      if (kind === 'png') {
        const data = await QRCode.toDataURL(payload, { width: 1024, margin: 2, color: { dark, light } });
        const a = document.createElement('a');
        a.href = data;
        a.download = 'qr.png';
        a.click();
      } else {
        const svg = await QRCode.toString(payload, { type: 'svg', margin: 2, color: { dark, light } });
        downloadText('qr.svg', svg, 'image/svg+xml');
      }
    } catch {
      setError('Download failed — payload may be too long.');
    }
  };

  return (
    <div className="qr-grid">
      <div>
        <Tabs ariaLabel="QR content" value={preset} onChange={setPreset} options={[{ value: 'url', label: 'Link' }, { value: 'wifi', label: 'Wi-Fi' }, { value: 'text', label: 'Text' }]} />
        {preset === 'url' ? (
          <Field label="URL"><input className="tool-input mono" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} /></Field>
        ) : preset === 'wifi' ? (
          <>
            <Field label="Network name (SSID)"><input className="tool-input" value={ssid} onChange={(e) => setSsid(e.target.value)} /></Field>
            <Field label="Password"><input className="tool-input mono" value={pw} onChange={(e) => setPw(e.target.value)} spellCheck={false} placeholder="leave empty for open network" /></Field>
          </>
        ) : (
          <Field label="Text"><textarea className="tool-input" rows={4} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        )}
        <div className="row tool-actions">
          <Field label="Preview size"><input type="number" min={128} max={512} step={32} value={size} onChange={(e) => setSize(Number(e.target.value))} /></Field>
          <Field label="Dark"><input type="color" value={dark} onChange={(e) => setDark(e.target.value)} aria-label="QR dark color" /></Field>
          <Field label="Light"><input type="color" value={light} onChange={(e) => setLight(e.target.value)} aria-label="QR light color" /></Field>
        </div>
        <OutputBar>
          <button type="button" className="btn btn-sm" disabled={Boolean(error)} onClick={() => download('png')}>Download PNG</button>
          <button type="button" className="btn btn-sm" disabled={Boolean(error)} onClick={() => download('svg')}>Download SVG</button>
        </OutputBar>
        <p className="muted small">Payload: {payload.length} chars. Point your phone camera at the preview to test.</p>
      </div>
      <div className="qr-preview card">
        {error ? <p className="tool-error" role="alert">{error}</p> : <canvas ref={canvasRef} role="img" aria-label="Generated QR code" />}
      </div>
    </div>
  );
}

/* ---------------- Unicode ---------------- */

export interface CharInfo {
  ch: string;
  cp: string;
  special?: string;
}

const SPECIALS: Record<number, string> = {
  0x09: 'TAB', 0x0a: 'LF', 0x0d: 'CR', 0x20: 'SPACE', 0xa0: 'NBSP',
  0x200b: 'ZERO-WIDTH SPACE', 0x200c: 'ZERO-WIDTH NON-JOINER', 0x200d: 'ZERO-WIDTH JOINER',
  0x200e: 'LEFT-TO-RIGHT MARK', 0x200f: 'RIGHT-TO-LEFT MARK',
  0x202a: 'LTR EMBED', 0x202b: 'RTL EMBED', 0x202c: 'POP DIRECTIONAL', 0x202d: 'LTR OVERRIDE', 0x202e: 'RTL OVERRIDE (spoofing risk)',
  0x2060: 'WORD JOINER', 0xfeff: 'ZERO-WIDTH NO-BREAK / BOM',
  0x00ad: 'SOFT HYPHEN', 0x180e: 'MONGOLIAN VOWEL SEPARATOR', 0x061c: 'ARABIC LETTER MARK',
  0x3000: 'IDEOGRAPHIC SPACE', 0x1680: 'OGHAM SPACE', 0x2000: 'EN QUAD', 0x2007: 'FIGURE SPACE',
};

export function describeChars(text: string, limit = 240): CharInfo[] {
  const out: CharInfo[] = [];
  let i = 0;
  for (const ch of text) {
    if (i++ >= limit) break;
    const cp = ch.codePointAt(0)!;
    out.push({ ch, cp: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`, special: SPECIALS[cp] });
  }
  return out;
}

export function escapeUnicode(text: string): string {
  return [...text].map((ch) => {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x20 || cp === 0x7f || cp > 0x7e) return `\\u{${cp.toString(16).toUpperCase()}}`;
    return ch;
  }).join('');
}

const UNI_SAMPLE = 'Café ​naïve —‌embed‍!';

export function UnicodeTool() {
  const [input, setInput] = useState(UNI_SAMPLE);
  const chars = useMemo(() => describeChars(input), [input]);
  const hidden = useMemo(() => chars.filter((c) => c.special && !['SPACE', 'TAB', 'LF', 'CR'].includes(c.special)), [chars]);
  const forms = useMemo(() => (['NFC', 'NFD', 'NFKC', 'NFKD'] as const).map((f) => ({ f, len: input.normalize(f).length })), [input]);
  const escaped = useMemo(() => escapeUnicode(input), [input]);

  return (
    <div>
      <Field label="Text to inspect (invisible characters revealed below)">
        <textarea className="tool-input" rows={3} value={input} onChange={(e) => setInput(e.target.value)} />
      </Field>
      <div className="row tool-actions">
        <button type="button" className="btn btn-sm" onClick={() => setInput(UNI_SAMPLE)}>Tricky sample</button>
        <button type="button" className="btn btn-sm" onClick={() => setInput('')}>Clear</button>
        <dl className="tool-stats">
          <Stat label="Code points" value={String([...input].length)} />
          <Stat label="UTF-16 units" value={String(input.length)} />
          <Stat label="Hidden chars" value={String(hidden.length)} />
        </dl>
      </div>
      {hidden.length ? (
        <p className="tool-error" role="alert">Found {hidden.length} invisible/special character{hidden.length === 1 ? '' : 's'}: {hidden.map((c) => `${c.cp} ${c.special}`).join(' · ')}</p>
      ) : <p className="good">No invisible characters detected.</p>}
      <h3 className="tool-h">Character map</h3>
      <div className="uni-grid" role="list" aria-label="Character breakdown">
        {chars.map((c, i) => (
          <span key={i} role="listitem" className={`uni-char ${c.special ? 'special' : ''}`} title={c.special ?? c.cp}>
            <strong>{c.ch === ' ' ? '␣' : c.ch === '\n' ? '↵' : c.special && c.ch.trim() === '' ? '∅' : c.ch}</strong>
            <small>{c.cp}</small>
          </span>
        ))}
        {[...input].length > chars.length ? <span className="muted small">…truncated at {chars.length} chars</span> : null}
      </div>
      <h3 className="tool-h">Normalization (length per form)</h3>
      <dl className="tool-stats">{forms.map(({ f, len }) => <Stat key={f} label={f} value={`${len} units`} />)}</dl>
      <OutputBar><CopyBtn text={escaped} small label="Copy escaped" /></OutputBar>
      <pre className="tool-output mono" tabIndex={0}>{escaped || <Empty text="Nothing to escape." />}</pre>
    </div>
  );
}
