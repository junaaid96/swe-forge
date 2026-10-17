/** AI & Data + Network labs: LLM tokens/cost, mock data, subnet calculator. */
import { useMemo, useState } from 'react';
import { CopyBtn, Empty, Field, OutputBar, Stat, downloadText } from './shared';

/* ---------------- LLM Token & Cost Estimator ---------------- */

export interface ModelPrice {
  id: string;
  label: string;
  context: number;
  inputPerM: number;
  outputPerM: number;
}

/** Editable defaults — list prices change often, users correct them in the UI. */
export const DEFAULT_MODELS: ModelPrice[] = [
  { id: 'frontier', label: 'Frontier (GPT-5 / Claude / Gemini class)', context: 200000, inputPerM: 2.5, outputPerM: 10 },
  { id: 'balanced', label: 'Balanced (mini / haiku / flash class)', context: 200000, inputPerM: 0.4, outputPerM: 1.6 },
  { id: 'oss', label: 'Open weights (self-hosted, ~$0 API)', context: 128000, inputPerM: 0, outputPerM: 0 },
];

/** Honest heuristic: ~4 latin chars/token, ~1 CJK char/token. Typically within ±20%. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjk = (text.match(/[\u3040-\u9FFF\uAC00-\uD7AF\uFF00-\uFFEF]/g) ?? []).length;
  const rest = text.length - cjk;
  return Math.max(1, Math.ceil(rest / 4 + cjk));
}

const TOKENS_SAMPLE = 'Summarize the following pull request in 3 bullet points for a non-technical stakeholder. Focus on user impact, risks, and rollout plan.';

export function TokensTool() {
  const [input, setInput] = useState(TOKENS_SAMPLE);
  const [models, setModels] = useState<ModelPrice[]>(DEFAULT_MODELS);
  const [outputEst, setOutputEst] = useState(500);
  const [calls, setCalls] = useState(1000);

  const tokens = useMemo(() => estimateTokens(input), [input]);
  const words = input.trim() ? input.trim().split(/\s+/).length : 0;

  const setModel = (id: string, patch: Partial<ModelPrice>) =>
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const costs = models.map((m) => {
    const perCall = (tokens / 1e6) * m.inputPerM + (outputEst / 1e6) * m.outputPerM;
    return { model: m, perCall, monthly: perCall * calls, pct: Math.min(100, (tokens / m.context) * 100) };
  });

  return (
    <div>
      <Field label="Prompt / document text">
        <textarea className="tool-input" rows={6} value={input} onChange={(e) => setInput(e.target.value)} />
      </Field>
      <div className="row tool-actions">
        <button type="button" className="btn btn-sm" onClick={() => setInput(TOKENS_SAMPLE)}>Sample</button>
        <Field label="Expected output (tokens)"><input type="number" min={0} max={1000000} value={outputEst} onChange={(e) => setOutputEst(Number(e.target.value))} /></Field>
        <Field label="Calls / month"><input type="number" min={1} max={100000000} value={calls} onChange={(e) => setCalls(Number(e.target.value))} /></Field>
      </div>
      <dl className="tool-stats">
        <Stat label="Est. input tokens" value={tokens.toLocaleString()} />
        <Stat label="Characters" value={input.length.toLocaleString()} />
        <Stat label="Words" value={words.toLocaleString()} />
        <Stat label="Chars / token" value={tokens ? (input.length / tokens).toFixed(1) : '—'} />
      </dl>
      <div className="table-wrap" tabIndex={0}>
        <table className="tool-table">
          <thead><tr><th>Model tier</th><th>Context used</th><th>$/call</th><th>$/month</th><th>Context window</th><th title="US dollars per 1M tokens">$/1M in</th><th title="US dollars per 1M tokens">$/1M out</th></tr></thead>
          <tbody>
            {costs.map(({ model: m, perCall, monthly, pct }) => (
              <tr key={m.id}>
                <td>{m.label}</td>
                <td>
                  <div className="token-bar" role="img" aria-label={`${pct.toFixed(1)}% of context used`}>
                    <span style={{ width: `${Math.max(2, pct)}%` }} />
                  </div>
                  {pct.toFixed(1)}%
                </td>
                <td><code className="mono">${perCall.toFixed(4)}</code></td>
                <td><code className="mono">${monthly.toFixed(2)}</code></td>
                <td><input type="number" min={1000} value={m.context} onChange={(e) => setModel(m.id, { context: Number(e.target.value) })} aria-label={`${m.label} context window`} /></td>
                <td><input type="number" min={0} step={0.01} value={m.inputPerM} onChange={(e) => setModel(m.id, { inputPerM: Number(e.target.value) })} aria-label={`${m.label} input price`} /></td>
                <td><input type="number" min={0} step={0.01} value={m.outputPerM} onChange={(e) => setModel(m.id, { outputPerM: Number(e.target.value) })} aria-label={`${m.label} output price`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Heuristic count (±20% vs real BPE tokenizers — exact counts need the provider's tokenizer). Prices are editable defaults, not quotes: check provider pricing pages before budgeting. <button type="button" className="link-btn" onClick={() => setModels(DEFAULT_MODELS)}>Reset defaults</button></p>
    </div>
  );
}

/* ---------------- Mock Data Generator ---------------- */

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Ada', 'Linus', 'Grace', 'Alan', 'Margaret', 'Dennis', 'Barbara', 'Ken', 'Radia', 'Edsger', 'Anita', 'Guido', 'Yukihiro', 'Bjarne', 'Frances', 'John', 'Katherine', 'Donald', 'Lynn', 'Rob'];
const LAST = ['Lovelace', 'Torvalds', 'Hopper', 'Turing', 'Hamilton', 'Ritchie', 'Liskov', 'Thompson', 'Perlman', 'Dijkstra', 'Borg', 'Rossum', 'Matsumoto', 'Stroustrup', 'Allen', 'Backus', 'Johnson', 'Knuth', 'Conway', 'Pike'];
const COMPANIES = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark', 'Wayne', 'Massive', 'Soylent', 'Tyrell'];
const TLDS = ['dev', 'io', 'com', 'app', 'tech'];
const LOREM_WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ');

export type MockKind = 'fullName' | 'email' | 'username' | 'company' | 'uuid' | 'int' | 'boolean' | 'date' | 'ipv4' | 'lorem' | 'pick';

export const MOCK_KINDS: Array<{ value: MockKind; label: string }> = [
  { value: 'fullName', label: 'Full name' }, { value: 'email', label: 'Email' }, { value: 'username', label: 'Username' },
  { value: 'company', label: 'Company' }, { value: 'uuid', label: 'UUID' }, { value: 'int', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' }, { value: 'date', label: 'Date' }, { value: 'ipv4', label: 'IPv4' },
  { value: 'lorem', label: 'Lorem' }, { value: 'pick', label: 'Pick from list' },
];

export interface MockField {
  name: string;
  kind: MockKind;
  options?: string;
}

function genValue(kind: MockKind, rnd: () => number, options?: string): unknown {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  switch (kind) {
    case 'fullName': return `${pick(FIRST)} ${pick(LAST)}`;
    case 'email': return `${pick(FIRST).toLowerCase()}.${pick(LAST).toLowerCase()}${ri(1, 99)}@${pick(COMPANIES).toLowerCase()}.${pick(TLDS)}`;
    case 'username': return `${pick(FIRST).toLowerCase()}_${pick(LAST).toLowerCase()}${ri(10, 999)}`;
    case 'company': return `${pick(COMPANIES)} ${pick(['Labs', 'Inc', 'Systems', 'Works', 'HQ'])}`;
    case 'uuid': {
      const h = () => Math.floor(rnd() * 0xffff).toString(16).padStart(4, '0');
      return `${h()}${h()}-${h()}-4${h().slice(1)}-${['8', '9', 'a', 'b'][Math.floor(rnd() * 4)]}${h().slice(1)}-${h()}${h()}${h()}`.slice(0, 36);
    }
    case 'int': return ri(1, 1000);
    case 'boolean': return rnd() > 0.5;
    case 'date': return new Date(Date.now() - Math.floor(rnd() * 365 * 864e5)).toISOString().slice(0, 10);
    case 'ipv4': return `10.${ri(0, 255)}.${ri(0, 255)}.${ri(1, 254)}`;
    case 'lorem': return Array.from({ length: 12 }, () => pick(LOREM_WORDS)).join(' ');
    case 'pick': {
      const opts = (options ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      return opts.length ? pick(opts) : 'opt1';
    }
  }
}

export function genRows(fields: MockField[], count: number, seed: number): Array<Record<string, unknown>> {
  const rnd = mulberry32(seed);
  return Array.from({ length: count }, () => {
    const row: Record<string, unknown> = {};
    for (const f of fields) row[f.name.trim() || 'field'] = genValue(f.kind, rnd, f.options);
    return row;
  });
}

function toSql(rows: Array<Record<string, unknown>>, table: string): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const lit = (v: unknown) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : `'${String(v).replace(/'/g, "''")}'`);
  return `INSERT INTO ${table} (${cols.join(', ')}) VALUES\n${rows.map((r) => `  (${cols.map((c) => lit(r[c])).join(', ')})`).join(',\n')};`;
}

function toTsRows(rows: Array<Record<string, unknown>>): string {
  return `const rows = ${JSON.stringify(rows, null, 2)} as const;\n`;
}

function toCsvRows(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

type MockOut = 'json' | 'csv' | 'sql' | 'ts';

export function MockDataTool() {
  const [fields, setFields] = useState<MockField[]>([
    { name: 'id', kind: 'uuid' }, { name: 'name', kind: 'fullName' }, { name: 'email', kind: 'email' }, { name: 'role', kind: 'pick', options: 'admin, editor, viewer' },
  ]);
  const [count, setCount] = useState(10);
  const [seed, setSeed] = useState(42);
  const [format, setFormat] = useState<MockOut>('json');
  const [table, setTable] = useState('users');

  const rows = useMemo(() => genRows(fields, Math.min(1000, Math.max(1, count || 1)), seed), [fields, count, seed]);
  const output = format === 'json' ? JSON.stringify(rows, null, 2) : format === 'csv' ? toCsvRows(rows) : format === 'sql' ? toSql(rows, /^[A-Za-z_][\w]*$/.test(table) ? table : 'users') : toTsRows(rows);

  const setField = (i: number, patch: Partial<MockField>) =>
    setFields((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div>
      <div className="tool-list">
        {fields.map((f, i) => (
          <div key={i} className="mock-field">
            <Field label={`Field ${i + 1} name`}>
              <input className="tool-input mono" value={f.name} onChange={(e) => setField(i, { name: e.target.value })} aria-label={`Field ${i + 1} name`} />
            </Field>
            <Field label="Type">
              <select value={f.kind} onChange={(e) => setField(i, { kind: e.target.value as MockKind })} aria-label={`Field ${i + 1} type`}>
                {MOCK_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </Field>
            {f.kind === 'pick' ? (
              <Field label="Options (comma separated)">
                <input className="tool-input" value={f.options ?? ''} onChange={(e) => setField(i, { options: e.target.value })} aria-label={`Field ${i + 1} options`} />
              </Field>
            ) : <span />}
            <button type="button" className="btn btn-sm" disabled={fields.length <= 1} onClick={() => setFields((prev) => prev.filter((_, j) => j !== i))} aria-label={`Remove field ${i + 1}`}>✕</button>
          </div>
        ))}
      </div>
      <div className="row tool-actions">
        <button type="button" className="btn btn-sm" onClick={() => setFields((prev) => [...prev, { name: `field${prev.length + 1}`, kind: 'lorem' }])}>+ Add field</button>
        <Field label="Rows"><input type="number" min={1} max={1000} value={count} onChange={(e) => setCount(Number(e.target.value))} /></Field>
        <Field label="Seed"><input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} /></Field>
        <button type="button" className="btn btn-sm" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>Randomize seed</button>
        {format === 'sql' ? <Field label="Table"><input className="tool-input mono" value={table} onChange={(e) => setTable(e.target.value)} /></Field> : null}
      </div>
      <div className="tool-tabs" role="tablist" aria-label="Output format">
        {(['json', 'csv', 'sql', 'ts'] as MockOut[]).map((f) => (
          <button key={f} type="button" role="tab" aria-selected={format === f} className={`tool-tab ${format === f ? 'on' : ''}`} onClick={() => setFormat(f)}>
            {f === 'json' ? 'JSON' : f === 'csv' ? 'CSV' : f === 'sql' ? 'SQL INSERT' : 'TypeScript'}
          </button>
        ))}
      </div>
      <OutputBar>
        <CopyBtn text={output} small />
        <button type="button" className="btn btn-sm" onClick={() => downloadText(`mock.${format === 'ts' ? 'ts' : format === 'sql' ? 'sql' : format}`, output)}>Download</button>
      </OutputBar>
      <pre className="tool-output mono" tabIndex={0}>{output || <Empty text="Add at least one field." />}</pre>
      <p className="muted small">Seeded generator — same seed + schema always yields the same rows. Ideal for reproducible tests and demos.</p>
    </div>
  );
}

/* ---------------- Subnet & CIDR Calculator ---------------- */

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let out = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    out = (out << 8) + n;
  }
  return out >>> 0;
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export function toBinary(ip: string): string | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return null;
  return parts.map((p) => Number(p).toString(2).padStart(8, '0')).join('.');
}

export interface SubnetInfo {
  network: string;
  broadcast: string;
  netmask: string;
  wildcard: string;
  first: string;
  last: string;
  total: number;
  usable: number;
  prefix: number;
}

export function calcSubnet(ip: string, prefix: number): SubnetInfo | null {
  const addr = ipToInt(ip);
  if (addr === null || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (addr & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const total = 2 ** (32 - prefix);
  const usable = prefix >= 31 ? total : total - 2;
  return {
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    netmask: intToIp(mask),
    wildcard: intToIp((~mask) >>> 0),
    first: intToIp(prefix >= 31 ? network : network + 1),
    last: intToIp(prefix >= 31 ? broadcast : broadcast - 1),
    total,
    usable,
    prefix,
  };
}

export function inCidr(ip: string, cidr: string): boolean | null {
  const [net, p] = cidr.split('/');
  const info = calcSubnet(net ?? '', Number(p));
  const addr = ipToInt(ip);
  if (!info || addr === null) return null;
  const start = ipToInt(info.network)!;
  const end = ipToInt(info.broadcast)!;
  return addr >= start && addr <= end;
}

export function SubnetTool() {
  const [cidr, setCidr] = useState('192.168.1.10/24');
  const [probe, setProbe] = useState('192.168.1.200');

  const info = useMemo(() => {
    const [ip, p] = cidr.split('/');
    return calcSubnet(ip ?? '', Number(p));
  }, [cidr]);

  const membership = useMemo(() => (info ? inCidr(probe, `${info.network}/${info.prefix}`) : null), [probe, info]);

  const subnets = useMemo(() => {
    if (!info || info.prefix >= 30) return [];
    const base = ipToInt(info.network)!;
    const step = 2 ** (32 - (info.prefix + 2));
    return [0, 1, 2, 3].map((i) => `${intToIp((base + i * step) >>> 0)}/${info.prefix + 2}`);
  }, [info]);

  return (
    <div>
      <div className="row tool-actions">
        <Field label="IP / CIDR">
          <input className="tool-input mono" value={cidr} onChange={(e) => setCidr(e.target.value)} spellCheck={false} placeholder="e.g. 10.0.0.5/22" size={22} />
        </Field>
        {['10.0.0.1/8', '172.16.5.4/16', '192.168.1.10/24', '192.168.1.10/26'].map((s) => (
          <button key={s} type="button" className="btn btn-sm" onClick={() => setCidr(s)}><code className="mono">{s}</code></button>
        ))}
      </div>
      {!info ? (
        <p className="tool-error" role="alert">Enter a valid IPv4 CIDR like 192.168.1.0/24.</p>
      ) : (
        <>
          <dl className="tool-stats">
            <Stat label="Network" value={`${info.network}/${info.prefix}`} />
            <Stat label="Broadcast" value={info.broadcast} />
            <Stat label="Netmask" value={info.netmask} />
            <Stat label="Wildcard" value={info.wildcard} />
            <Stat label="Usable range" value={`${info.first} – ${info.last}`} />
            <Stat label="Usable hosts" value={info.usable.toLocaleString()} />
            <Stat label="Total addresses" value={info.total.toLocaleString()} />
          </dl>
          <h3 className="tool-h">Binary view</h3>
          <pre className="tool-output mono" tabIndex={0}>
            {`addr  ${toBinary(cidr.split('/')[0])}\nmask  ${toBinary(info.netmask)}\nnet   ${toBinary(info.network)}`}
          </pre>
          <h3 className="tool-h">Split into 4 subnets (/{info.prefix + 2})</h3>
          {subnets.length ? (
            <ul className="tool-values">
              {subnets.map((s) => <li key={s}><code className="mono">{s}</code><CopyBtn text={s} small /></li>)}
            </ul>
          ) : <p className="muted small">Prefix too narrow to split further.</p>}
          <h3 className="tool-h">Membership check</h3>
          <div className="row tool-actions">
            <Field label="Is this IP inside?">
              <input className="tool-input mono" value={probe} onChange={(e) => setProbe(e.target.value)} spellCheck={false} size={18} />
            </Field>
            {membership === null ? <p className="tool-error">Invalid probe IP.</p> : membership ? (
              <p className="good">Yes — {probe.trim()} is inside {info.network}/{info.prefix}.</p>
            ) : (
              <p className="bad">No — {probe.trim()} is outside {info.network}/{info.prefix}.</p>
            )}
          </div>
        </>
      )}
      <p className="muted small">IPv4 only. Pairs well with the Networking notes under CS Foundations.</p>
    </div>
  );
}
