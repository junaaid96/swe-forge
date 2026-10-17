/** Web & API tools: regex tester, time/cron, curl converter, color/contrast. */
import { useEffect, useMemo, useState } from 'react';
import { CopyBtn, Empty, Field, OutputBar, Stat, Tabs } from './shared';

/* ---------------- Regex ---------------- */

interface RegexMatch {
  index: number;
  text: string;
  groups: Array<string | undefined>;
}

const CHEATSHEET: Array<[string, string]> = [
  ['.', 'any char (except newline)'], ['\\d', 'digit'], ['\\w', 'word char'], ['\\s', 'whitespace'],
  ['*', '0 or more'], ['+', '1 or more'], ['?', '0 or 1 / lazy'], ['{n,m}', 'between n and m'],
  ['^…$', 'start / end anchors'], ['(a|b)', 'alternation'], ['(…)', 'capture group'], ['(?:…)', 'non-capturing'],
  ['(?<n>…)', 'named group'], ['[abc]', 'character set'], ['[^abc]', 'negated set'], ['\\b', 'word boundary'],
];

export function RegexTool() {
  const [pattern, setPattern] = useState('\\b(?<user>[A-Za-z]+)@(?<domain>[\\w.-]+)\\b');
  const [flags, setFlags] = useState('gi');
  const [text, setText] = useState('Contact ada@forgeline.dev or linus@kernel.org for access.');

  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    const p = h.get('re');
    if (p) {
      setPattern(p);
      if (h.get('flags')) setFlags(h.get('flags')!);
      if (h.get('text')) setText(h.get('text')!);
    }
  }, []);

  const result = useMemo((): { ok: boolean; error?: string; matches?: RegexMatch[] } => {
    try {
      const re = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`);
      const matches: RegexMatch[] = [];
      for (const m of text.matchAll(re)) {
        matches.push({ index: m.index ?? 0, text: m[0], groups: m.slice(1) as Array<string | undefined> });
        if (matches.length >= 200) break;
        if (!m[0]) re.lastIndex++;
      }
      return { ok: true, matches };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Invalid pattern' };
    }
  }, [pattern, flags, text]);

  const highlighted = useMemo(() => {
    if (!result.ok || !result.matches) return null;
    const parts: Array<{ t: string; hit: boolean }> = [];
    let last = 0;
    for (const m of result.matches.slice(0, 200)) {
      if (m.index > last) parts.push({ t: text.slice(last, m.index), hit: false });
      parts.push({ t: m.text || '∅', hit: true });
      last = m.index + m.text.length;
    }
    parts.push({ t: text.slice(last), hit: false });
    return parts;
  }, [result, text]);

  const shareLink = () => {
    const h = new URLSearchParams({ re: pattern, flags, text: text.slice(0, 2000) });
    return `${window.location.origin}${window.location.pathname}#${h.toString()}`;
  };

  const toggleFlag = (f: string) => setFlags((prev) => (prev.includes(f) ? prev.replace(f, '') : `${prev}${f}`));

  return (
    <div>
      <div className="row tool-actions">
        <Field label="Pattern"><input className="tool-input mono" value={pattern} onChange={(e) => setPattern(e.target.value)} spellCheck={false} placeholder="e.g. (\d+)-(\w+)" size={36} /></Field>
        <div className="row" role="group" aria-label="Flags">
          {['g', 'i', 'm', 's', 'u'].map((f) => (
            <label key={f} className="check"><input type="checkbox" checked={flags.includes(f)} onChange={() => toggleFlag(f)} /> {f}</label>
          ))}
        </div>
        <CopyBtn text={shareLink()} small label="Copy share link" />
      </div>
      {!result.ok ? <p className="tool-error" role="alert">{result.error}</p> : <p className="muted small">{result.matches!.length} match{result.matches!.length === 1 ? '' : 'es'}</p>}
      <Field label="Test string">
        <textarea className="tool-input mono" rows={4} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      </Field>
      <h3 className="tool-h">Highlighted</h3>
      <pre className="tool-output" tabIndex={0}>{highlighted?.map((p, i) => (p.hit ? <mark key={i}>{p.t}</mark> : <span key={i}>{p.t}</span>)) ?? <Empty text="Fix the pattern to preview." />}</pre>
      {result.ok && result.matches!.length > 0 ? (
        <div className="table-wrap" tabIndex={0}>
          <table className="tool-table">
            <thead><tr><th>#</th><th>Match</th><th>Index</th><th>Groups</th></tr></thead>
            <tbody>
              {result.matches!.slice(0, 50).map((m, i) => (
                <tr key={i}><td>{i + 1}</td><td><code className="mono">{m.text}</code></td><td>{m.index}</td><td>{m.groups.length ? m.groups.map((g, gi) => <code key={gi} className="mono chip">{g ?? '—'}</code>) : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <h3 className="tool-h">Cheatsheet</h3>
      <dl className="tool-stats">{CHEATSHEET.map(([k, v]) => <Stat key={k} label={k} value={v} />)}</dl>
    </div>
  );
}

/* ---------------- Time & Cron ---------------- */

function detectEpoch(n: number): string {
  if (n < 1e11) return 'seconds';
  if (n < 1e14) return 'milliseconds';
  if (n < 1e17) return 'microseconds';
  return 'nanoseconds';
}

function toMs(n: number): number {
  if (n < 1e11) return n * 1000;
  if (n < 1e14) return n;
  if (n < 1e17) return n / 1000;
  return n / 1e6;
}

function parseCronField(field: string, min: number, max: number): Set<number> | null {
  const out = new Set<number>();
  for (const part of field.split(',')) {
    const [range, stepStr] = part.split('/');
    const step = stepStr ? Number(stepStr) : 1;
    if (!Number.isInteger(step) || step < 1) return null;
    let start = min;
    let end = max;
    if (range === '*') { /* defaults */ } else if (range.includes('-')) {
      const [a, b] = range.split('-').map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b)) return null;
      start = a; end = b;
    } else {
      const v = Number(range);
      if (!Number.isInteger(v)) return null;
      start = v; end = v;
    }
    if (start < min || end > max || start > end) return null;
    for (let v = start; v <= end; v += step) out.add(v);
  }
  return out;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function describeCron(expr: string): { ok: boolean; text?: string; next?: Date[]; error?: string } {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return { ok: false, error: 'Cron needs exactly 5 fields: minute hour day-of-month month day-of-week.' };
  const [mi, hr, dom, mon, dow] = fields.map((f, i) => parseCronField(f, [0, 0, 1, 1, 0][i], [59, 23, 31, 12, 6][i]));
  if (!mi || !hr || !dom || !mon || !dow) return { ok: false, error: 'One field is out of range or malformed.' };
  const mins = [...mi].sort((a, b) => a - b);
  const hrs = [...hr].sort((a, b) => a - b);
  const time = hrs.length && mins.length
    ? `at ${hrs.map((h) => `${String(h).padStart(2, '0')}:${mins.map((m) => String(m).padStart(2, '0')).join(', ')}`).join(', ')}`
    : 'every minute';
  const days = dow.size === 7 && dom.size === 31 && mon.size === 12 ? '' : ` on ${dow.size < 7 ? [...dow].sort().map((d) => DAYS[d]).join(', ') : 'these month-days'}${mon.size < 12 ? ` in ${[...mon].sort((a, b) => a - b).map((m) => MONTHS[m - 1]).join(', ')}` : ''}`;
  const next: Date[] = [];
  const cursor = new Date();
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  for (let i = 0; i < 525600 && next.length < 5; i++) {
    if (mi.has(cursor.getMinutes()) && hr.has(cursor.getHours()) && dom.has(cursor.getDate()) && mon.has(cursor.getMonth() + 1) && dow.has(cursor.getDay())) {
      next.push(new Date(cursor));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return { ok: true, text: `Runs ${time}${days || ' every day'}.`, next };
}

const CRON_SAMPLES = ['*/15 * * * *', '0 9 * * 1-5', '30 2 1 * *', '0 0 * * 0', '5 4 * * *'];

export function TimeTool() {
  const [tab, setTab] = useState<'epoch' | 'cron' | 'now'>('epoch');
  const [epoch, setEpoch] = useState(String(Math.floor(Date.now() / 1000)));
  const [cron, setCron] = useState('0 9 * * 1-5');
  const [now, setNow] = useState(() => new Date());
  const [tz, setTz] = useState('UTC');

  useEffect(() => {
    if (tab !== 'now') return;
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, [tab]);

  const epochDate = useMemo(() => {
    const n = Number(epoch.trim());
    if (!Number.isFinite(n)) return null;
    const d = new Date(toMs(n));
    return Number.isNaN(d.getTime()) ? null : { date: d, unit: detectEpoch(Math.abs(n)) };
  }, [epoch]);

  const cronResult = useMemo(() => describeCron(cron), [cron]);

  const tzs = useMemo(() => {
    try {
      const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
      return ['local', 'UTC', ...list.filter((z) => /New_York|London|Paris|Dubai|Kolkata|Singapore|Tokyo|Sydney|Los_Angeles|Chicago|Berlin/.test(z))];
    } catch {
      return ['local', 'UTC'];
    }
  }, []);

  const fmtTz = (d: Date, zone: string) => {
    try {
      return zone === 'local' ? d.toString() : d.toLocaleString('en-US', { timeZone: zone, dateStyle: 'full', timeStyle: 'long' });
    } catch {
      return '—';
    }
  };

  return (
    <div>
      <Tabs ariaLabel="Time tools" value={tab} onChange={setTab} options={[{ value: 'epoch', label: 'Epoch converter' }, { value: 'cron', label: 'Cron explainer' }, { value: 'now', label: 'Now & timezones' }]} />
      {tab === 'epoch' ? (
        <div>
          <div className="row tool-actions">
            <Field label="Epoch value"><input className="tool-input mono" value={epoch} onChange={(e) => setEpoch(e.target.value)} spellCheck={false} /></Field>
            <button type="button" className="btn btn-sm" onClick={() => setEpoch(String(Math.floor(Date.now() / 1000)))}>Use now</button>
          </div>
          {!epochDate ? <p className="tool-error" role="alert">Not a valid number.</p> : (
            <>
              <p className="muted small">Detected unit: <strong>{epochDate.unit}</strong></p>
              <dl className="tool-stats">
                <Stat label="Local" value={epochDate.date.toString()} />
                <Stat label="UTC (ISO)" value={epochDate.date.toISOString()} />
                <Stat label="Seconds" value={String(Math.floor(epochDate.date.getTime() / 1000))} />
                <Stat label="Milliseconds" value={String(epochDate.date.getTime())} />
              </dl>
              <OutputBar><CopyBtn text={epochDate.date.toISOString()} small label="Copy ISO" /></OutputBar>
            </>
          )}
        </div>
      ) : null}
      {tab === 'cron' ? (
        <div>
          <Field label="Cron expression (min hour dom month dow)">
            <input className="tool-input mono" value={cron} onChange={(e) => setCron(e.target.value)} spellCheck={false} />
          </Field>
          <div className="row tool-actions">
            {CRON_SAMPLES.map((s) => <button key={s} type="button" className="btn btn-sm" onClick={() => setCron(s)}><code className="mono">{s}</code></button>)}
          </div>
          {!cronResult.ok ? <p className="tool-error" role="alert">{cronResult.error}</p> : (
            <>
              <p><strong>{cronResult.text}</strong></p>
              <h3 className="tool-h">Next 5 runs (your timezone)</h3>
              <ul className="tool-values">{cronResult.next!.map((d, i) => <li key={i}><code className="mono">{d.toLocaleString()}</code></li>)}</ul>
            </>
          )}
        </div>
      ) : null}
      {tab === 'now' ? (
        <div>
          <dl className="tool-stats">
            <Stat label="Epoch (s)" value={String(Math.floor(now.getTime() / 1000))} />
            <Stat label="Epoch (ms)" value={String(now.getTime())} />
            <Stat label="ISO 8601" value={now.toISOString()} />
          </dl>
          <Field label="Timezone">
            <select value={tz} onChange={(e) => setTz(e.target.value)}>{tzs.map((z) => <option key={z} value={z}>{z}</option>)}</select>
          </Field>
          <pre className="tool-output" tabIndex={0}>{fmtTz(now, tz)}</pre>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- curl → fetch ---------------- */

const CURL_SAMPLE = `curl -X POST https://api.example.com/v1/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer TOKEN" \\
  -d '{"name":"Ada","role":"admin"}'`;

interface ParsedCurl {
  method: string;
  url: string;
  headers: Array<[string, string]>;
  body?: string;
}

function tokenizeCurl(s: string): string[] {
  const clean = s.replace(/\\\n/g, ' ');
  const toks: string[] = [];
  let cur = '';
  let quote: string | null = null;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quote) {
      if (ch === quote) { quote = null; }
      else if (ch === '\\' && i + 1 < clean.length) { cur += clean[++i]; }
      else cur += ch;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (/\s/.test(ch)) { if (cur) { toks.push(cur); cur = ''; } }
    else cur += ch;
  }
  if (cur) toks.push(cur);
  return toks;
}

function parseCurl(s: string): ParsedCurl | null {
  const toks = tokenizeCurl(s);
  if (!toks[0]?.toLowerCase().startsWith('curl')) return null;
  let method = 'GET';
  let url = '';
  const headers: Array<[string, string]> = [];
  let body: string | undefined;
  let explicitMethod = false;
  for (let i = 1; i < toks.length; i++) {
    const t = toks[i];
    if ((t === '-X' || t === '--request') && toks[i + 1]) { method = toks[++i].toUpperCase(); explicitMethod = true; }
    else if ((t === '-H' || t === '--header') && toks[i + 1]) {
      const h = toks[++i];
      const idx = h.indexOf(':');
      if (idx > 0) headers.push([h.slice(0, idx).trim(), h.slice(idx + 1).trim()]);
    } else if ((t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') && toks[i + 1]) {
      body = toks[++i];
      if (body.startsWith('$')) body = body.slice(1);
      if (!explicitMethod) method = 'POST';
    } else if (!t.startsWith('-') && !url) url = t.replace(/^['"]|['"]$/g, '');
  }
  if (!url) return null;
  return { method, url, headers, body };
}

const HTTP_STATUS: Array<[number, string, string]> = [
  [200, 'OK', 'Request succeeded.'], [201, 'Created', 'New resource created.'], [204, 'No Content', 'Success, empty body.'],
  [301, 'Moved Permanently', 'Resource has a new URL.'], [302, 'Found', 'Temporary redirect.'], [304, 'Not Modified', 'Use cached version.'],
  [400, 'Bad Request', 'Malformed or invalid input.'], [401, 'Unauthorized', 'Missing or bad credentials.'], [403, 'Forbidden', 'Authenticated but not allowed.'],
  [404, 'Not Found', 'No such resource.'], [405, 'Method Not Allowed', 'Wrong HTTP verb.'], [409, 'Conflict', 'State conflict, e.g. duplicate.'],
  [422, 'Unprocessable Entity', 'Valid syntax, semantic errors.'], [429, 'Too Many Requests', 'Rate limited — back off.'],
  [500, 'Internal Server Error', 'Server bug.'], [502, 'Bad Gateway', 'Upstream failed.'], [503, 'Service Unavailable', 'Overloaded or down.'], [504, 'Gateway Timeout', 'Upstream timed out.'],
];

export function CurlTool() {
  const [tab, setTab] = useState<'curl' | 'status'>('curl');
  const [input, setInput] = useState(CURL_SAMPLE);
  const [target, setTarget] = useState<'fetch' | 'axios'>('fetch');
  const [q, setQ] = useState('');

  const parsed = useMemo(() => parseCurl(input), [input]);

  const code = useMemo(() => {
    if (!parsed) return '';
    const headerObj = parsed.headers.length ? `,\n  headers: {\n${parsed.headers.map(([k, v]) => `    '${k}': '${v.replace(/'/g, "\\'")}',`).join('\n')}\n  }` : '';
    const bodyLine = parsed.body !== undefined ? `,\n  body: ${/^\s*[{[]/.test(parsed.body) ? `JSON.stringify(${parsed.body})` : `'${parsed.body.replace(/'/g, "\\'")}'`}` : '';
    if (target === 'fetch') {
      return `const res = await fetch('${parsed.url}', {\n  method: '${parsed.method}'${headerObj}${bodyLine}\n});\nconst data = await res.json();`;
    }
    const axiosBody = parsed.body !== undefined ? `, ${/^\s*[{[]/.test(parsed.body) ? parsed.body : `'${parsed.body.replace(/'/g, "\\'")}'`}` : '';
    const axiosHeaders = parsed.headers.length ? `, { headers: {\n${parsed.headers.map(([k, v]) => `  '${k}': '${v.replace(/'/g, "\\'")}',`).join('\n')}\n} }` : '';
    return target === 'axios' && (parsed.method === 'GET' || parsed.method === 'DELETE')
      ? `const { data } = await axios.${parsed.method.toLowerCase()}('${parsed.url}'${axiosHeaders});`
      : `const { data } = await axios.${parsed.method === 'POST' || parsed.method === 'PUT' || parsed.method === 'PATCH' ? parsed.method.toLowerCase() : 'request'}('${parsed.url}'${axiosBody}${axiosHeaders});`;
  }, [parsed, target]);

  const statusRows = HTTP_STATUS.filter(([c, t, d]) => !q.trim() || `${c} ${t} ${d}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <Tabs ariaLabel="API tools" value={tab} onChange={setTab} options={[{ value: 'curl', label: 'curl converter' }, { value: 'status', label: 'HTTP status codes' }]} />
      {tab === 'curl' ? (
        <div className="tool-grid">
          <div>
            <Field label="curl command">
              <textarea className="tool-input mono" rows={10} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            </Field>
            <div className="row tool-actions">
              <button type="button" className="btn btn-sm" onClick={() => setInput(CURL_SAMPLE)}>Sample</button>
              <Tabs ariaLabel="Target" value={target} onChange={setTarget} options={[{ value: 'fetch', label: 'fetch' }, { value: 'axios', label: 'axios' }]} />
            </div>
          </div>
          <div>
            {!parsed ? <p className="tool-error" role="alert">Could not parse a curl command (need “curl” + URL).</p> : (
              <>
                <dl className="tool-stats">
                  <Stat label="Method" value={parsed.method} />
                  <Stat label="Headers" value={String(parsed.headers.length)} />
                  <Stat label="Body" value={parsed.body ? `${parsed.body.length} chars` : 'none'} />
                </dl>
                <OutputBar><CopyBtn text={code} small /></OutputBar>
                <pre className="tool-output mono" tabIndex={0}>{code}</pre>
              </>
            )}
          </div>
        </div>
      ) : (
        <div>
          <Field label="Search status codes"><input className="tool-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. 404, timeout, auth…" /></Field>
          <div className="table-wrap" tabIndex={0}>
            <table className="tool-table">
              <thead><tr><th>Code</th><th>Name</th><th>Meaning</th></tr></thead>
              <tbody>{statusRows.map(([c, t, d]) => <tr key={c}><td><code className="mono">{c}</code></td><td>{t}</td><td>{d}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Color ---------------- */

function parseHex(s: string): [number, number, number] | null {
  let h = s.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

export function ColorTool() {
  const [hex, setHex] = useState('#4f46e5');
  const [fg, setFg] = useState('#ffffff');
  const [bg, setBg] = useState('#1c1d21');

  const rgb = useMemo(() => parseHex(hex), [hex]);
  const hsl = rgb ? rgbToHsl(...rgb) : null;
  const fgRgb = parseHex(fg);
  const bgRgb = parseHex(bg);
  const ratio = fgRgb && bgRgb ? contrast(fgRgb, bgRgb) : null;

  const palette = useMemo(() => {
    if (!rgb) return [];
    return [-0.4, -0.25, -0.1, 0.1, 0.25, 0.4].map((amt) => {
      const t = amt < 0 ? 0 : 255;
      const p = Math.abs(amt);
      return toHex(rgb[0] + (t - rgb[0]) * p, rgb[1] + (t - rgb[1]) * p, rgb[2] + (t - rgb[2]) * p);
    });
  }, [rgb]);

  return (
    <div>
      <div className="row tool-actions">
        <Field label="Base color"><input type="color" value={rgb ? hex : '#000000'} onChange={(e) => setHex(e.target.value)} aria-label="Pick base color" /></Field>
        <Field label="HEX"><input className="tool-input mono" value={hex} onChange={(e) => setHex(e.target.value)} spellCheck={false} size={10} /></Field>
        {rgb ? (
          <dl className="tool-stats">
            <Stat label="RGB" value={`${rgb[0]}, ${rgb[1]}, ${rgb[2]}`} />
            <Stat label="HSL" value={`${hsl![0]}°, ${hsl![1]}%, ${hsl![2]}%`} />
          </dl>
        ) : <p className="tool-error">Invalid hex.</p>}
      </div>
      {rgb ? (
        <>
          <div className="color-strip" role="list" aria-label="Tints and shades">
            {[hex, ...palette].map((c) => (
              <button key={c} type="button" role="listitem" className="color-swatch" style={{ background: c }} title={c} aria-label={`Copy ${c}`} onClick={() => navigator.clipboard?.writeText(c).catch(() => {})}>
                <span>{c}</span>
              </button>
            ))}
          </div>
          <p className="muted small">Click a swatch to copy its hex.</p>
        </>
      ) : null}
      <h3 className="tool-h">WCAG contrast checker</h3>
      <div className="row tool-actions">
        <Field label="Text"><input type="color" value={fgRgb ? fg : '#000000'} onChange={(e) => setFg(e.target.value)} aria-label="Pick text color" /><input className="tool-input mono" value={fg} onChange={(e) => setFg(e.target.value)} size={9} spellCheck={false} /></Field>
        <Field label="Background"><input type="color" value={bgRgb ? bg : '#000000'} onChange={(e) => setBg(e.target.value)} aria-label="Pick background color" /><input className="tool-input mono" value={bg} onChange={(e) => setBg(e.target.value)} size={9} spellCheck={false} /></Field>
        {ratio !== null ? (
          <dl className="tool-stats">
            <Stat label="Ratio" value={`${ratio.toFixed(2)}:1`} />
            <Stat label="AA normal" value={ratio >= 4.5 ? 'PASS' : 'FAIL'} />
            <Stat label="AA large" value={ratio >= 3 ? 'PASS' : 'FAIL'} />
            <Stat label="AAA" value={ratio >= 7 ? 'PASS' : 'FAIL'} />
          </dl>
        ) : null}
      </div>
      {fgRgb && bgRgb ? (
        <p className="color-demo" style={{ color: fg, background: bg }}>The quick brown fox jumps over the lazy dog — 0123456789</p>
      ) : null}
    </div>
  );
}
