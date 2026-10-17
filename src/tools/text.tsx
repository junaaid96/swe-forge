/** Text & Ship tools: diff, text/case, git helper, docker/env. */
import { useMemo, useState } from 'react';
import { CopyBtn, Empty, Field, OutputBar, Stat, Tabs, downloadText } from './shared';

/* ---------------- Diff ---------------- */

type DiffRow = { type: 'same' | 'del' | 'add'; a?: string; b?: string };

function diffLines(a: string[], b: string[]): DiffRow[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { rows.push({ type: 'same', a: a[i], b: b[j] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { rows.push({ type: 'del', a: a[i] }); i++; }
    else { rows.push({ type: 'add', b: b[j] }); j++; }
  }
  while (i < n) rows.push({ type: 'del', a: a[i++] });
  while (j < m) rows.push({ type: 'add', b: b[j++] });
  return rows;
}

function charParts(oldS: string, newS: string): Array<{ t: string; changed: boolean }> {
  let pre = 0;
  while (pre < oldS.length && pre < newS.length && oldS[pre] === newS[pre]) pre++;
  let suf = 0;
  while (suf < oldS.length - pre && suf < newS.length - pre && oldS[oldS.length - 1 - suf] === newS[newS.length - 1 - suf]) suf++;
  return [
    { t: oldS.slice(0, pre), changed: false },
    { t: oldS.slice(pre, oldS.length - suf) || (oldS.length - suf < pre ? '' : ''), changed: true },
    { t: oldS.slice(oldS.length - suf), changed: false },
  ];
}

const DIFF_A = 'const total = items.length;\nconst label = "items";\nreturn total + " " + label;';
const DIFF_B = 'const total = items.length;\nconst label = "products";\nif (!total) return "empty";\nreturn `${total} ${label}`;';

export function DiffTool() {
  const [a, setA] = useState(DIFF_A);
  const [b, setB] = useState(DIFF_B);
  const rows = useMemo(() => {
    const al = a.split('\n');
    const bl = b.split('\n');
    if (al.length * bl.length > 250000) return null;
    return diffLines(al, bl);
  }, [a, b]);

  const stats = useMemo(() => {
    if (!rows) return null;
    return {
      same: rows.filter((r) => r.type === 'same').length,
      del: rows.filter((r) => r.type === 'del').length,
      add: rows.filter((r) => r.type === 'add').length,
    };
  }, [rows]);

  return (
    <div>
      <div className="tool-grid">
        <Field label="Original (A)">
          <textarea className="tool-input mono" rows={9} value={a} onChange={(e) => setA(e.target.value)} spellCheck={false} />
        </Field>
        <Field label="Modified (B)">
          <textarea className="tool-input mono" rows={9} value={b} onChange={(e) => setB(e.target.value)} spellCheck={false} />
        </Field>
      </div>
      <div className="row tool-actions">
        <button type="button" className="btn btn-sm" onClick={() => { setA(DIFF_A); setB(DIFF_B); }}>Sample</button>
        <button type="button" className="btn btn-sm" onClick={() => { setA(b); setB(a); }}>Swap A ↔ B</button>
        {stats ? (
          <dl className="tool-stats">
            <Stat label="Unchanged" value={String(stats.same)} />
            <Stat label="Removed" value={String(stats.del)} />
            <Stat label="Added" value={String(stats.add)} />
          </dl>
        ) : null}
      </div>
      {rows === null ? (
        <p className="tool-error">Inputs too large for in-browser diff (limit ~500×500 lines). Try smaller chunks.</p>
      ) : (
        <div className="diff-view" tabIndex={0} role="table" aria-label="Diff result">
          {rows.map((r, i) => {
            if (r.type === 'same') return <div key={i} className="diff-row diff-same" role="row"><span aria-hidden> </span><code>{r.a}</code></div>;
            if (r.type === 'del') {
              const next = rows[i + 1];
              const parts = next?.type === 'add' && next.b !== undefined ? charParts(r.a ?? '', next.b) : null;
              return <div key={i} className="diff-row diff-del" role="row"><span aria-hidden>−</span><code>{parts ? parts.map((p, k) => (p.changed ? <mark key={k}>{p.t}</mark> : <span key={k}>{p.t}</span>)) : r.a}</code></div>;
            }
            const prev = rows[i - 1];
            const parts = prev?.type === 'del' && prev.a !== undefined ? charParts(prev.a, r.b ?? '').map((p) => p) : null;
            void parts;
            return <div key={i} className="diff-row diff-add" role="row"><span aria-hidden>+</span><code>{r.b}</code></div>;
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- Text & Case ---------------- */

const toCamel = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase()).replace(/^./, (c) => c.toLowerCase());
const toPascal = (s: string) => { const c = toCamel(s); return c ? c[0].toUpperCase() + c.slice(1) : ''; };
const toSnake = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const toKebab = (s: string) => toSnake(s).replace(/_/g, '-');
const toTitle = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

export function TextCaseTool() {
  const [input, setInput] = useState('the quick brown fox jumps over the lazy dog');

  const counts = useMemo(() => {
    const words = input.trim() ? input.trim().split(/\s+/) : [];
    const freq = new Map<string, number>();
    for (const w of words) {
      const k = w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
      if (k.length > 2) freq.set(k, (freq.get(k) ?? 0) + 1);
    }
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      words: words.length,
      chars: input.length,
      noSpaces: input.replace(/\s/g, '').length,
      lines: input ? input.split('\n').length : 0,
      sentences: (input.match(/[.!?]+/g) ?? []).length,
      reading: Math.max(1, Math.round(words.length / 200)),
      top,
    };
  }, [input]);

  const cases: Array<[string, string]> = [
    ['UPPER', input.toUpperCase()], ['lower', input.toLowerCase()], ['Title', toTitle(input)],
    ['camelCase', toCamel(input)], ['PascalCase', toPascal(input)], ['snake_case', toSnake(input)], ['kebab-case', toKebab(input)],
  ];

  return (
    <div>
      <Field label="Text input">
        <textarea className="tool-input" rows={5} value={input} onChange={(e) => setInput(e.target.value)} />
      </Field>
      <div className="row tool-actions">
        <button type="button" className="btn btn-sm" onClick={() => setInput(LOREM)}>Lorem sample</button>
        <button type="button" className="btn btn-sm" onClick={() => setInput(Array.from(new Set(input.split('\n'))).join('\n'))}>Dedupe lines</button>
        <button type="button" className="btn btn-sm" onClick={() => setInput(input.split('\n').map((l) => l.trim()).sort((x, y) => x.localeCompare(y)).join('\n'))}>Sort lines</button>
        <button type="button" className="btn btn-sm" onClick={() => setInput('')}>Clear</button>
      </div>
      <dl className="tool-stats">
        <Stat label="Words" value={String(counts.words)} />
        <Stat label="Characters" value={String(counts.chars)} />
        <Stat label="No spaces" value={String(counts.noSpaces)} />
        <Stat label="Lines" value={String(counts.lines)} />
        <Stat label="Sentences" value={String(counts.sentences)} />
        <Stat label="Reading" value={`~${counts.reading} min`} />
      </dl>
      {counts.top.length ? <p className="muted small">Top keywords: {counts.top.map(([w, n]) => `${w} (${n})`).join(', ')}</p> : null}
      <div className="tool-list">
        {cases.map(([label, v]) => (
          <div key={label} className="tool-hashrow">
            <strong>{label}</strong>
            <code className="mono">{v || <Empty text="—" />}</code>
            <CopyBtn text={v} small />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Git ---------------- */

const COMMIT_TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];

const GITIGNORES: Record<string, string> = {
  Node: 'node_modules/\ndist/\nbuild/\n.env\n.env.local\ncoverage/\n*.log\n.DS_Store\n',
  Python: '__pycache__/\n*.py[cod]\n.venv/\nvenv/\n.env\ndist/\n*.egg-info/\n.pytest_cache/\n',
  Java: 'target/\n*.class\n*.jar\n.idea/\n*.iml\n.gradle/\nbuild/\n.env\n',
  Go: 'bin/\n*.exe\n*.test\nvendor/\n.env\n',
  Rust: 'target/\nCargo.lock\n*.rs.bk\n.env\n',
  Docker: '.docker/\n*.log\n',
};

export function GitTool() {
  const [tab, setTab] = useState<'commit' | 'ignore' | 'branch'>('commit');
  const [type, setType] = useState('feat');
  const [scope, setScope] = useState('tools');
  const [desc, setDesc] = useState('add developer utilities section');
  const [body, setBody] = useState('');
  const [breaking, setBreaking] = useState(false);
  const [branch, setBranch] = useState('Add Developer Tools Section!');
  const [langs, setLangs] = useState<string[]>(['Node']);

  const message = `${type}${scope.trim() ? `(${toKebab(scope.trim())})` : ''}${breaking ? '!' : ''}: ${desc.trim()}${body.trim() ? `\n\n${body.trim()}` : ''}${breaking ? '\n\nBREAKING CHANGE: described above' : ''}`;
  const sanitized = useMemo(() => toKebab(branch).replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'branch-name', [branch]);
  const ignoreOut = useMemo(() => langs.map((l) => `# ---- ${l} ----\n${GITIGNORES[l]}`).join('\n'), [langs]);

  const toggleLang = (l: string) => setLangs((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  return (
    <div>
      <Tabs ariaLabel="Git tools" value={tab} onChange={setTab} options={[{ value: 'commit', label: 'Commit builder' }, { value: 'ignore', label: '.gitignore' }, { value: 'branch', label: 'Branch names' }]} />
      {tab === 'commit' ? (
        <div className="tool-grid">
          <div>
            <div className="row tool-actions">
              <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value)}>{COMMIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
              <Field label="Scope"><input className="tool-input" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="optional" /></Field>
            </div>
            <Field label="Description (imperative, ≤72 chars)"><input className="tool-input" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={100} /></Field>
            <Field label="Body (optional)"><textarea className="tool-input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Why, not what…" /></Field>
            <label className="check"><input type="checkbox" checked={breaking} onChange={(e) => setBreaking(e.target.checked)} /> Breaking change</label>
          </div>
          <div>
            <OutputBar><CopyBtn text={message} small /></OutputBar>
            <pre className="tool-output mono" tabIndex={0}>{message}</pre>
            <p className={`muted small ${desc.length > 72 ? 'bad' : ''}`}>First line: {`${type}${scope ? `(${scope})` : ''}: ${desc}`.length} chars {desc.length > 72 ? '(over 72 — tighten it)' : ''}</p>
          </div>
        </div>
      ) : null}
      {tab === 'ignore' ? (
        <div>
          <div className="row tool-actions">
            {Object.keys(GITIGNORES).map((l) => <label key={l} className="check"><input type="checkbox" checked={langs.includes(l)} onChange={() => toggleLang(l)} /> {l}</label>)}
          </div>
          <OutputBar>
            <CopyBtn text={ignoreOut} small />
            <button type="button" className="btn btn-sm" disabled={!ignoreOut} onClick={() => downloadText('.gitignore', ignoreOut)}>Download</button>
          </OutputBar>
          <pre className="tool-output mono" tabIndex={0}>{ignoreOut || <Empty text="Pick at least one stack." />}</pre>
        </div>
      ) : null}
      {tab === 'branch' ? (
        <div>
          <Field label="Ticket + title (e.g. PROJ-123 Add dark mode)">
            <input className="tool-input" value={branch} onChange={(e) => setBranch(e.target.value)} />
          </Field>
          <OutputBar><CopyBtn text={sanitized} small /></OutputBar>
          <pre className="tool-output mono" tabIndex={0}>{sanitized}</pre>
          <OutputBar><CopyBtn text={`git checkout -b ${sanitized}`} small label="Copy checkout cmd" /></OutputBar>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- Docker & Env ---------------- */

const DOCKER_BASE: Record<string, string[]> = {
  Node: ['22-alpine', '22-slim', '20-alpine'],
  Python: ['3.12-slim', '3.11-slim', '3.12-alpine'],
  Java: ['21-slim', '17-slim'],
  Go: ['1.23-alpine', '1.22-alpine'],
};

export function DockerTool() {
  const [tab, setTab] = useState<'dockerfile' | 'compose' | 'env'>('dockerfile');
  const [lang, setLang] = useState('Node');
  const [tag, setTag] = useState('22-alpine');
  const [port, setPort] = useState('3000');
  const [withComposeDb, setWithComposeDb] = useState(true);
  const [withRedis, setWithRedis] = useState(false);
  const [env, setEnv] = useState('PORT=3000\nDATABASE_URL=postgres://user:pass@db:5432/app\nPORT=3000\nEMPTY_VALUE=\n# comment line\nAPI_KEY');

  const dockerfile = useMemo(() => {
    const p = /^\d+$/.test(port) ? port : '3000';
    const base = `${lang === 'Node' ? 'node' : lang.toLowerCase()}:${tag}`;
    const install = lang === 'Node' ? 'COPY package*.json ./\nRUN npm ci --omit=dev' : lang === 'Python' ? 'COPY requirements.txt ./\nRUN pip install --no-cache-dir -r requirements.txt' : lang === 'Java' ? 'COPY . .\nRUN ./mvnw -q package -DskipTests' : 'COPY go.mod go.sum ./\nRUN go mod download\nCOPY . .\nRUN go build -o /app/server .';
    const cmd = lang === 'Node' ? 'CMD ["node", "dist/index.js"]' : lang === 'Python' ? 'CMD ["python", "app.py"]' : lang === 'Java' ? 'CMD ["java", "-jar", "target/app.jar"]' : 'CMD ["/app/server"]';
    return `FROM ${base}\nWORKDIR /app\n${install}\nCOPY . .\nEXPOSE ${p}\n${cmd}\n`;
  }, [lang, tag, port]);

  const compose = useMemo(() => {
    const p = /^\d+$/.test(port) ? port : '3000';
    return `services:\n  app:\n    build: .\n    ports:\n      - "${p}:${p}"\n    env_file:\n      - .env\n    depends_on:${withComposeDb ? '\n      - db' : ''}${withRedis ? '\n      - redis' : ''}${!withComposeDb && !withRedis ? ' []' : ''}\n${withComposeDb ? '  db:\n    image: postgres:16-alpine\n    environment:\n      POSTGRES_PASSWORD: example\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n' : ''}${withRedis ? '  redis:\n    image: redis:7-alpine\n' : ''}${withComposeDb ? '\nvolumes:\n  pgdata:\n' : ''}`;
  }, [port, withComposeDb, withRedis]);

  const envIssues = useMemo(() => {
    const issues: string[] = [];
    const seen = new Map<string, number>();
    env.split('\n').forEach((line, i) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return;
      const eq = t.indexOf('=');
      if (eq < 0) { issues.push(`L${i + 1}: no '=' — "${t}"`); return; }
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) issues.push(`L${i + 1}: invalid key "${k}"`);
      if (seen.has(k)) issues.push(`L${i + 1}: duplicate key "${k}" (first at L${seen.get(k)})`);
      else seen.set(k, i + 1);
      if (!v.trim()) issues.push(`L${i + 1}: "${k}" has an empty value`);
    });
    return issues;
  }, [env]);

  return (
    <div>
      <Tabs ariaLabel="Docker tools" value={tab} onChange={setTab} options={[{ value: 'dockerfile', label: 'Dockerfile' }, { value: 'compose', label: 'Compose' }, { value: 'env', label: '.env check' }]} />
      {tab === 'dockerfile' ? (
        <div className="tool-grid">
          <div className="row tool-actions">
            <Field label="Stack"><select value={lang} onChange={(e) => { setLang(e.target.value); setTag(DOCKER_BASE[e.target.value][0]); }}>{Object.keys(DOCKER_BASE).map((l) => <option key={l} value={l}>{l}</option>)}</select></Field>
            <Field label="Base tag"><select value={tag} onChange={(e) => setTag(e.target.value)}>{DOCKER_BASE[lang].map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Port"><input className="tool-input" value={port} onChange={(e) => setPort(e.target.value)} size={6} /></Field>
          </div>
          <div>
            <OutputBar>
              <CopyBtn text={dockerfile} small />
              <button type="button" className="btn btn-sm" onClick={() => downloadText('Dockerfile', dockerfile)}>Download</button>
            </OutputBar>
            <pre className="tool-output mono" tabIndex={0}>{dockerfile}</pre>
          </div>
        </div>
      ) : null}
      {tab === 'compose' ? (
        <div>
          <div className="row tool-actions">
            <Field label="App port"><input className="tool-input" value={port} onChange={(e) => setPort(e.target.value)} size={6} /></Field>
            <label className="check"><input type="checkbox" checked={withComposeDb} onChange={(e) => setWithComposeDb(e.target.checked)} /> Postgres</label>
            <label className="check"><input type="checkbox" checked={withRedis} onChange={(e) => setWithRedis(e.target.checked)} /> Redis</label>
          </div>
          <OutputBar>
            <CopyBtn text={compose} small />
            <button type="button" className="btn btn-sm" onClick={() => downloadText('compose.yaml', compose)}>Download</button>
          </OutputBar>
          <pre className="tool-output mono" tabIndex={0}>{compose}</pre>
        </div>
      ) : null}
      {tab === 'env' ? (
        <div className="tool-grid">
          <Field label=".env contents">
            <textarea className="tool-input mono" rows={12} value={env} onChange={(e) => setEnv(e.target.value)} spellCheck={false} />
          </Field>
          <div>
            <h3 className="tool-h">Issues ({envIssues.length})</h3>
            {envIssues.length ? (
              <ul className="tool-issues">{envIssues.map((m, i) => <li key={i}><code className="mono">{m}</code></li>)}</ul>
            ) : <p className="good">No issues found. Keys are valid and unique.</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
