/** Encode & Secure tools: encoders, hash/HMAC, IDs/secrets, JWT. */
import { useEffect, useMemo, useState } from 'react';
import { CopyBtn, Empty, Field, OutputBar, Stat, Tabs } from './shared';

/* ---------------- Encoders ---------------- */

function b64encodeUnicode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64decodeUnicode(s: string): string {
  const bin = atob(s.replace(/\s+/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const unescHtml = (s: string) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

type EncKind = 'base64' | 'url' | 'html';

export function EncodersTool() {
  const [kind, setKind] = useState<EncKind>('base64');
  const [input, setInput] = useState('Hello, Forgeline — 100% client-side!');
  const [urlMode, setUrlMode] = useState<'component' | 'full'>('component');

  const output = useMemo(() => {
    try {
      if (kind === 'base64') return { encode: b64encodeUnicode(input), decode: '' };
      if (kind === 'url') {
        return urlMode === 'component'
          ? { encode: encodeURIComponent(input), decode: '' }
          : { encode: encodeURI(input), decode: '' };
      }
      return { encode: escHtml(input), decode: '' };
    } catch {
      return { encode: '', decode: '', error: 'Could not encode this input.' };
    }
  }, [input, kind, urlMode]);

  const decoded = useMemo(() => {
    try {
      if (kind === 'base64') return b64decodeUnicode(input);
      if (kind === 'url') return urlMode === 'component' ? decodeURIComponent(input) : decodeURI(input);
      return unescHtml(input);
    } catch {
      return '';
    }
  }, [input, kind, urlMode]);

  return (
    <div>
      <Tabs ariaLabel="Encoding" value={kind} onChange={setKind} options={[{ value: 'base64', label: 'Base64' }, { value: 'url', label: 'URL' }, { value: 'html', label: 'HTML escape' }]} />
      {kind === 'url' ? (
        <div className="row tool-actions">
          <Tabs ariaLabel="URL mode" value={urlMode} onChange={setUrlMode} options={[{ value: 'component', label: 'encodeURIComponent' }, { value: 'full', label: 'encodeURI' }]} />
        </div>
      ) : null}
      <div className="tool-grid">
        <Field label="Input">
          <textarea className="tool-input mono" rows={8} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        </Field>
        <div>
          <OutputBar><CopyBtn text={output.encode} small label={`Copy ${kind === 'html' ? 'escaped' : 'encoded'}`} /></OutputBar>
          <pre className="tool-output mono" tabIndex={0}>{output.encode || <Empty text="Nothing to show." />}</pre>
        </div>
      </div>
      <div>
        <h3 className="tool-h">Decode / unescape the same input</h3>
        <OutputBar><CopyBtn text={decoded} small label="Copy decoded" /></OutputBar>
        <pre className="tool-output mono" tabIndex={0}>{decoded || <Empty text="Input is not valid encoded text." />}</pre>
      </div>
    </div>
  );
}

/* ---------------- Hash & HMAC ---------------- */

type HashAlgo = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

async function digest(algo: HashAlgo, text: string): Promise<string> {
  const bytes = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(algo: 'SHA-256' | 'SHA-512', key: string, text: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: algo }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function HashTool() {
  const [input, setInput] = useState('forgeline');
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [key, setKey] = useState('secret');
  const [hmacOut, setHmacOut] = useState('');
  const [check, setCheck] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      const algos: HashAlgo[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
      const out: Record<string, string> = { 'FNV-1a (non-crypto)': fnv1a(input) };
      for (const a of algos) {
        try { out[a] = await digest(a, input); } catch { out[a] = 'unavailable in this browser'; }
      }
      if (live) setHashes(out);
    })();
    return () => { live = false; };
  }, [input]);

  useEffect(() => {
    let live = true;
    hmac('SHA-256', key, input).then((v) => live && setHmacOut(v)).catch(() => live && setHmacOut(''));
    return () => { live = false; };
  }, [input, key]);

  const match = check.trim() ? Object.entries(hashes).find(([, v]) => v.toLowerCase() === check.trim().toLowerCase())?.[0] : undefined;

  return (
    <div>
      <Field label="Input text">
        <textarea className="tool-input mono" rows={4} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
      </Field>
      <div className="tool-list">
        {Object.entries(hashes).map(([algo, v]) => (
          <div key={algo} className="tool-hashrow">
            <strong>{algo}</strong>
            <code className="mono">{v}</code>
            <CopyBtn text={v} small />
          </div>
        ))}
      </div>
      <div className="tool-grid">
        <Field label="HMAC-SHA-256 key">
          <input className="tool-input mono" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} />
        </Field>
        <div>
          <OutputBar><CopyBtn text={hmacOut} small label="Copy HMAC" /></OutputBar>
          <pre className="tool-output mono" tabIndex={0}>{hmacOut}</pre>
        </div>
      </div>
      <Field label="Verify a checksum (paste expected digest)">
        <input className="tool-input mono" value={check} onChange={(e) => setCheck(e.target.value)} spellCheck={false} placeholder="paste a SHA-256 hex digest…" />
      </Field>
      {check.trim() ? (
        match ? <p className="good">Match: identical to {match} of the input.</p> : <p className="bad">No match against the digests above.</p>
      ) : null}
    </div>
  );
}

/* ---------------- IDs & Secrets ---------------- */

const NANO_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

function uuidV7(): string {
  const b = randomBytes(16);
  const now = BigInt(Date.now());
  for (let i = 0; i < 6; i++) b[i] = Number((now >> BigInt((5 - i) * 8)) & 0xffn);
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function nanoid(len: number): string {
  const b = randomBytes(len);
  return [...b].map((x) => NANO_ALPHABET[x % NANO_ALPHABET.length]).join('');
}

function password(len: number, sets: string[], excludeAmbiguous: boolean): string {
  let alpha = sets.join('');
  if (excludeAmbiguous) alpha = alpha.replace(/[Il1O0|`'"\\]/g, '');
  if (!alpha) return '';
  const b = randomBytes(len * 2);
  let out = '';
  for (let i = 0; i < b.length && out.length < len; i++) {
    const idx = b[i] % alpha.length;
    if (b[i] < 256 - (256 % alpha.length)) out += alpha[idx];
  }
  while (out.length < len) out += alpha[Math.floor(Math.random() * alpha.length)];
  return out;
}

type IdKind = 'uuid4' | 'uuid7' | 'nano' | 'pass';

export function IdsTool() {
  const [kind, setKind] = useState<IdKind>('uuid7');
  const [count, setCount] = useState(5);
  const [nanoLen, setNanoLen] = useState(21);
  const [passLen, setPassLen] = useState(24);
  const [sets, setSets] = useState<string[]>(['abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', '0123456789', '!@#$%^&*()-_=+']);
  const [noAmb, setNoAmb] = useState(true);
  const [values, setValues] = useState<string[]>([]);

  const gen = () => {
    const n = Math.min(100, Math.max(1, count || 1));
    if (kind === 'uuid4') setValues(Array.from({ length: n }, () => crypto.randomUUID()));
    else if (kind === 'uuid7') setValues(Array.from({ length: n }, () => uuidV7()));
    else if (kind === 'nano') setValues(Array.from({ length: n }, () => nanoid(Math.min(128, Math.max(4, nanoLen)))));
    else setValues(Array.from({ length: n }, () => password(Math.min(256, Math.max(4, passLen)), sets, noAmb)));
  };

  useEffect(gen, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSet = (s: string) => setSets((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <div>
      <Tabs ariaLabel="ID kind" value={kind} onChange={setKind} options={[{ value: 'uuid4', label: 'UUID v4' }, { value: 'uuid7', label: 'UUID v7' }, { value: 'nano', label: 'NanoID' }, { value: 'pass', label: 'Password' }]} />
      <div className="row tool-actions">
        <Field label="Count"><input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} /></Field>
        {kind === 'nano' ? <Field label="Length"><input type="number" min={4} max={128} value={nanoLen} onChange={(e) => setNanoLen(Number(e.target.value))} /></Field> : null}
        {kind === 'pass' ? <Field label="Length"><input type="number" min={4} max={256} value={passLen} onChange={(e) => setPassLen(Number(e.target.value))} /></Field> : null}
        <button type="button" className="btn btn-primary btn-sm" onClick={gen}>Generate</button>
        <CopyBtn text={values.join('\n')} small label="Copy all" />
      </div>
      {kind === 'pass' ? (
        <div className="row tool-actions">
          <label className="check"><input type="checkbox" checked={sets.some((s) => s.includes('a'))} onChange={() => toggleSet('abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ')} /> Letters</label>
          <label className="check"><input type="checkbox" checked={sets.some((s) => s.includes('0'))} onChange={() => toggleSet('0123456789')} /> Digits</label>
          <label className="check"><input type="checkbox" checked={sets.some((s) => s.includes('!'))} onChange={() => toggleSet('!@#$%^&*()-_=+')} /> Symbols</label>
          <label className="check"><input type="checkbox" checked={noAmb} onChange={(e) => setNoAmb(e.target.checked)} /> Exclude ambiguous (Il1O0)</label>
        </div>
      ) : null}
      <ul className="tool-values">
        {values.map((v, i) => (
          <li key={`${v}-${i}`}>
            <code className="mono">{v}</code>
            <CopyBtn text={v} small />
          </li>
        ))}
      </ul>
      <p className="muted small">Uses <code>crypto.getRandomValues</code> — suitable for tokens, API keys and initial passwords.</p>
    </div>
  );
}

/* ---------------- JWT ---------------- */

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const JWT_SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTcxNDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

export function JwtTool() {
  const [input, setInput] = useState(JWT_SAMPLE);
  const decoded = useMemo(() => {
    const parts = input.trim().split('.');
    if (parts.length !== 3) return { ok: false as const, error: 'A JWT has 3 dot-separated parts.' };
    try {
      const header = JSON.parse(b64urlDecode(parts[0])) as Record<string, unknown>;
      const payload = JSON.parse(b64urlDecode(parts[1])) as Record<string, unknown>;
      return { ok: true as const, header, payload, signature: parts[2] };
    } catch {
      return { ok: false as const, error: 'Header or payload is not valid base64url JSON.' };
    }
  }, [input]);

  const exp = decoded.ok && typeof decoded.payload.exp === 'number' ? decoded.payload.exp * 1000 : null;
  const iat = decoded.ok && typeof decoded.payload.iat === 'number' ? decoded.payload.iat * 1000 : null;
  const now = Date.now();
  const expired = exp !== null && exp < now;

  return (
    <div>
      <Field label="JWT (paste token)">
        <textarea className="tool-input mono" rows={4} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
      </Field>
      <div className="row tool-actions">
        <button type="button" className="btn btn-sm" onClick={() => setInput(JWT_SAMPLE)}>Sample</button>
        <button type="button" className="btn btn-sm" onClick={() => setInput('')}>Clear</button>
      </div>
      {!decoded.ok ? (
        <p className="tool-error" role="alert">{decoded.error}</p>
      ) : (
        <>
          <dl className="tool-stats">
            <Stat label="Algorithm" value={String(decoded.header.alg ?? '—')} />
            <Stat label="Issued" value={iat ? new Date(iat).toLocaleString() : '—'} />
            <Stat label="Expires" value={exp ? new Date(exp).toLocaleString() : '—'} />
            <Stat label="Status" value={exp === null ? 'no exp claim' : expired ? 'EXPIRED' : 'valid (time-wise)'} />
          </dl>
          {expired ? <p className="bad" role="alert">Token expired {new Date(exp!).toLocaleString()}.</p> : null}
          <div className="tool-grid">
            <div>
              <OutputBar><CopyBtn text={JSON.stringify(decoded.header, null, 2)} small /></OutputBar>
              <pre className="tool-output mono" tabIndex={0}>{JSON.stringify(decoded.header, null, 2)}</pre>
            </div>
            <div>
              <OutputBar><CopyBtn text={JSON.stringify(decoded.payload, null, 2)} small /></OutputBar>
              <pre className="tool-output mono" tabIndex={0}>{JSON.stringify(decoded.payload, null, 2)}</pre>
            </div>
          </div>
          <p className="muted small">Signature is shown, not verified — verification needs your secret and belongs server-side. Decoding happens only in this tab.</p>
        </>
      )}
    </div>
  );
}
