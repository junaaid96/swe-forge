/** Format & Convert tools: JSON, CSV↔JSON, Markdown preview, Base converter. */
import { useMemo, useState } from 'react';
import { Markdown } from '../components/Markdown';
import { CopyBtn, Empty, Field, OutputBar, Stat, Tabs, downloadText } from './shared';

/* ---------------- JSON ---------------- */

const JSON_SAMPLE = `{"user":{"id":42,"name":"Ada Lovelace","active":true,"tags":["admin","dev"],"score":null},"total":2}`;

type JsonMode = 'format' | 'code';
type CodeLang = 'ts' | 'go' | 'py';

function analyze(value: unknown, depth = 1): { keys: number; maxDepth: number; size: number } {
  if (Array.isArray(value)) {
    let keys = 0;
    let maxDepth = depth;
    for (const v of value) {
      const r = analyze(v, depth + 1);
      keys += r.keys;
      maxDepth = Math.max(maxDepth, r.maxDepth);
    }
    return { keys, maxDepth, size: value.length };
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    let keys = entries.length;
    let maxDepth = depth;
    for (const [, v] of entries) {
      const r = analyze(v, depth + 1);
      keys += r.keys;
      maxDepth = Math.max(maxDepth, r.maxDepth);
    }
    return { keys, maxDepth, size: entries.length };
  }
  return { keys: 0, maxDepth: depth, size: 0 };
}

function toTs(value: unknown, name = 'Root', indent = ''): string {
  if (Array.isArray(value)) {
    if (!value.length) return `${indent}${name}: unknown[];`;
    const first = value[0];
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      return `${toTs(first, name, indent).replace(/interface \w+/, `interface ${name}Item`)}\n${indent}${name}: ${name}Item[];`;
    }
    return `${indent}${name}: ${tsType(first)}[];`;
  }
  if (value && typeof value === 'object') {
    const lines = Object.entries(value).map(([k, v]) => {
      const safe = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
      if (v && typeof v === 'object') {
        if (Array.isArray(v)) {
          const el = v[0];
          if (el && typeof el === 'object' && !Array.isArray(el)) {
            const sub = toTs(el, `${capitalize(k)}Item`, `${indent}  `);
            return `${sub}\n${indent}  ${safe}: ${capitalize(k)}Item[];`;
          }
          return `${indent}  ${safe}: ${tsType(el)}[];`;
        }
        return `${toTs(v, capitalize(k), `${indent}  `).replace('interface Root', `interface ${capitalize(k)}`)}\n${indent}  ${safe}: ${capitalize(k)};`;
      }
      return `${indent}  ${safe}: ${tsType(v)};`;
    });
    return `${indent}interface ${name} {\n${lines.join('\n')}\n${indent}}`;
  }
  return `${indent}type ${name} = ${tsType(value)};`;
}

function tsType(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'unknown[]';
  switch (typeof v) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'bigint': return 'bigint';
    default: return 'unknown';
  }
}

function goType(v: unknown): string {
  if (v === null) return 'any';
  if (Array.isArray(v)) return v.length ? `[]${goType(v[0])}` : '[]any';
  switch (typeof v) {
    case 'string': return 'string';
    case 'boolean': return 'bool';
    case 'number': return Number.isInteger(v as number) ? 'int' : 'float64';
    default: return 'any';
  }
}

function toGo(value: unknown, name = 'Root'): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return `type ${name} ${goType(value)} \`json:"-"\``;
  const lines = Object.entries(value).map(([k, v]) => {
    const field = capitalize(k.replace(/[^A-Za-z0-9]+(.)/g, (_, c: string) => c.toUpperCase()));
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return `${toGo(v, field)}\n\t${field} ${field} \`json:"${k}"\``;
    }
    if (Array.isArray(v) && v[0] && typeof v[0] === 'object' && !Array.isArray(v[0])) {
      return `${toGo(v[0], `${field}Item`)}\n\t${field} []${field}Item \`json:"${k}"\``;
    }
    return `\t${field} ${goType(v)} \`json:"${k}"\``;
  });
  return `type ${name} struct {\n${lines.join('\n')}\n}`;
}

function pyType(v: unknown): string {
  if (v === null) return 'None';
  if (Array.isArray(v)) return v.length ? `list[${pyType(v[0])}]` : 'list';
  switch (typeof v) {
    case 'string': return 'str';
    case 'boolean': return 'bool';
    case 'number': return Number.isInteger(v as number) ? 'int' : 'float';
    default: return 'Any';
  }
}

function toPy(value: unknown, name = 'Root'): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return `${name} = ${pyType(value)}`;
  const lines = Object.entries(value).map(([k, v]) => {
    const field = k.replace(/[^0-9A-Za-z_]/g, '_');
    return `    ${field}: ${pyType(v)}`;
  });
  return `@dataclass\nclass ${name}:\n${lines.join('\n') || '    pass'}`;
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : 'Root';
}

export function JsonTool() {
  const [input, setInput] = useState(JSON_SAMPLE);
  const [mode, setMode] = useState<JsonMode>('format');
  const [lang, setLang] = useState<CodeLang>('ts');
  const [indent, setIndent] = useState('2');

  const parsed = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(input) as unknown };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : 'Invalid JSON' };
    }
  }, [input]);

  const formatted = useMemo(() => {
    if (!parsed.ok) return '';
    return indent === 'min' ? JSON.stringify(parsed.value) : JSON.stringify(parsed.value, null, Number(indent));
  }, [parsed, indent]);

  const code = useMemo(() => {
    if (!parsed.ok) return '';
    if (lang === 'ts') return toTs(parsed.value);
    if (lang === 'go') return toGo(parsed.value);
    return `from dataclasses import dataclass\nfrom typing import Any\n\n${toPy(parsed.value)}`;
  }, [parsed, lang]);

  const stats = useMemo(() => (parsed.ok ? analyze(parsed.value) : null), [parsed]);
  const output = mode === 'format' ? formatted : code;

  return (
    <div className="tool-grid">
      <div>
        <Field label="JSON input">
          <textarea className="tool-input mono" rows={14} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder='Paste JSON, e.g. {"a": 1}' />
        </Field>
        <div className="row tool-actions">
          <button type="button" className="btn btn-sm" onClick={() => setInput(JSON_SAMPLE)}>Sample</button>
          <button type="button" className="btn btn-sm" onClick={() => setInput('')}>Clear</button>
          {mode === 'format' ? (
            <Field label="Indent">
              <select value={indent} onChange={(e) => setIndent(e.target.value)} aria-label="Indent">
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
                <option value="min">Minified</option>
              </select>
            </Field>
          ) : (
            <Tabs ariaLabel="Target language" value={lang} onChange={setLang} options={[{ value: 'ts', label: 'TypeScript' }, { value: 'go', label: 'Go' }, { value: 'py', label: 'Python' }]} />
          )}
        </div>
      </div>
      <div>
        <Tabs ariaLabel="JSON mode" value={mode} onChange={setMode} options={[{ value: 'format', label: 'Format' }, { value: 'code', label: 'To Code' }]} />
        {!parsed.ok ? (
          <p className="tool-error" role="alert">{parsed.error}</p>
        ) : (
          <>
            <dl className="tool-stats">
              <Stat label="Keys" value={String(stats?.keys ?? 0)} />
              <Stat label="Depth" value={String(stats?.maxDepth ?? 0)} />
              <Stat label="Output" value={`${output.length.toLocaleString()} chars`} />
            </dl>
            <OutputBar>
              <CopyBtn text={output} small />
              <button type="button" className="btn btn-sm" disabled={!output} onClick={() => downloadText(mode === 'format' ? 'data.json' : `data.${lang === 'ts' ? 'ts' : lang === 'go' ? 'go' : 'py'}`, output)}>Download</button>
            </OutputBar>
            <pre className="tool-output mono" tabIndex={0}>{output || <Empty text="Nothing to show yet." />}</pre>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- CSV ↔ JSON ---------------- */

function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

function toCsv(rows: Array<Record<string, unknown>>, delimiter: string): string {
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /["\n]/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(delimiter), ...rows.map((r) => cols.map((c) => esc(r[c])).join(delimiter))].join('\n');
}

const CSV_SAMPLE = 'name,role,level\nAda,Engineer,7\nLinus,Engineer,9';

export function CsvJsonTool() {
  const [input, setInput] = useState(CSV_SAMPLE);
  const [direction, setDirection] = useState<'csv2json' | 'json2csv'>('csv2json');
  const [delimiter, setDelimiter] = useState(',');
  const [headers, setHeaders] = useState(true);

  const output = useMemo(() => {
    try {
      if (direction === 'csv2json') {
        const rows = parseCsv(input, delimiter);
        if (!rows.length) return '';
        if (!headers) return JSON.stringify(rows, null, 2);
        const [head, ...body] = rows;
        return JSON.stringify(body.map((r) => Object.fromEntries(head.map((h, i) => [h || `col${i + 1}`, r[i] ?? '']))), null, 2);
      }
      const v = JSON.parse(input) as unknown;
      const rows = Array.isArray(v) ? v : [v];
      if (!rows.every((r) => r && typeof r === 'object' && !Array.isArray(r))) return 'Error: JSON must be an object or an array of objects.';
      return toCsv(rows as Array<Record<string, unknown>>, delimiter);
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'could not convert'}`;
    }
  }, [input, direction, delimiter, headers]);

  const isError = output.startsWith('Error:');

  return (
    <div className="tool-grid">
      <div>
        <Tabs ariaLabel="Direction" value={direction} onChange={setDirection} options={[{ value: 'csv2json', label: 'CSV → JSON' }, { value: 'json2csv', label: 'JSON → CSV' }]} />
        <Field label={direction === 'csv2json' ? 'CSV input' : 'JSON input'}>
          <textarea className="tool-input mono" rows={12} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        </Field>
        <div className="row tool-actions">
          <button type="button" className="btn btn-sm" onClick={() => { setDirection('csv2json'); setInput(CSV_SAMPLE); }}>Sample</button>
          <button type="button" className="btn btn-sm" onClick={() => setInput('')}>Clear</button>
          <Field label="Delimiter">
            <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)} aria-label="Delimiter">
              <option value=",">Comma</option>
              <option value=";">Semicolon</option>
              <option value={'\t'}>Tab</option>
              <option value="|">Pipe</option>
            </select>
          </Field>
          {direction === 'csv2json' ? (
            <label className="check"><input type="checkbox" checked={headers} onChange={(e) => setHeaders(e.target.checked)} /> First row is headers</label>
          ) : null}
        </div>
      </div>
      <div>
        <OutputBar>
          <CopyBtn text={isError ? '' : output} small />
          <button type="button" className="btn btn-sm" disabled={isError || !output} onClick={() => downloadText(direction === 'csv2json' ? 'data.json' : 'data.csv', output)}>Download</button>
        </OutputBar>
        {isError ? <p className="tool-error" role="alert">{output}</p> : <pre className="tool-output mono" tabIndex={0}>{output || <Empty text="Nothing to show yet." />}</pre>}
      </div>
    </div>
  );
}

/* ---------------- Markdown ---------------- */

const MD_SAMPLE = '# Hello, Forgeline\n\n- Live **GFM** preview\n- `code`, tables, task lists\n\n```mermaid\nflowchart LR\n  A[Markdown] --> B[Preview]\n```\n\n| Tool | Rating |\n| --- | --- |\n| This one | 5/5 |\n';

export function MarkdownTool() {
  const [input, setInput] = useState(MD_SAMPLE);
  return (
    <div className="tool-grid">
      <Field label="Markdown input">
        <textarea className="tool-input mono" rows={16} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
      </Field>
      <div>
        <OutputBar>
          <CopyBtn text={input} small label="Copy source" />
          <button type="button" className="btn btn-sm" onClick={() => downloadText('doc.md', input)}>Download .md</button>
        </OutputBar>
        <div className="tool-preview card"><Markdown>{input || '*Nothing to preview.*'}</Markdown></div>
      </div>
    </div>
  );
}

/* ---------------- Base converter ---------------- */

const BASES = [2, 8, 10, 16, 36] as const;

function parseBig(input: string, base: number): bigint | null {
  const s = input.trim().toLowerCase().replace(/^0[xob]/, '');
  if (!s) return null;
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  let out = 0n;
  for (const ch of s) {
    const d = digits.indexOf(ch);
    if (d < 0 || d >= base) return null;
    out = out * BigInt(base) + BigInt(d);
  }
  return out;
}

export function BaseConverterTool() {
  const [input, setInput] = useState('255');
  const [from, setFrom] = useState<number>(10);
  const value = useMemo(() => parseBig(input, from), [input, from]);

  return (
    <div>
      <div className="row tool-actions">
        <Field label="Value">
          <input className="tool-input mono" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder="e.g. ff, 0b1010, 255" />
        </Field>
        <Field label="From base">
          <select value={from} onChange={(e) => setFrom(Number(e.target.value))} aria-label="From base">
            {BASES.map((b) => <option key={b} value={b}>Base {b}</option>)}
          </select>
        </Field>
      </div>
      {value === null ? (
        <p className="tool-error" role="alert">Not a valid base-{from} number.</p>
      ) : (
        <dl className="tool-stats">
          {BASES.map((b) => <Stat key={b} label={`Base ${b}`} value={value.toString(b)} />)}
          <Stat label="Bytes (BE)" value={value.toString(16).padStart(2, '0').replace(/../g, '$& ').trim() || '00'} />
        </dl>
      )}
      <p className="muted small">Arbitrary precision via BigInt — safe for 64-bit IDs and larger.</p>
    </div>
  );
}
