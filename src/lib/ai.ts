/** Groq-powered AI: BYOK client with free-tier guards (budget, fallback, 429 handling). */
import { useSyncExternalStore } from 'react';

const KEY = 'forgeline:groq:key';
const MODEL_KEY = 'forgeline:groq:model';
const USAGE_KEY = 'forgeline:groq:usage';
const BUDGET_KEY = 'forgeline:groq:budget';

const API = 'https://api.groq.com/openai/v1/chat/completions';

/** Ordered fallback chain: quality default first, cheap/fast models on rate limits. */
export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (best quality)', tier: 'quality' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout (long context)', tier: 'quality' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fast, generous limits)', tier: 'fast' },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (fallback)', tier: 'fast' },
] as const;

export type GroqModelId = (typeof GROQ_MODELS)[number]['id'] | 'auto';
export const DEFAULT_MODEL: GroqModelId = 'auto';
const CHAIN = GROQ_MODELS.map((m) => m.id);

export const DEFAULT_BUDGET_TOKENS = 100_000;

export interface AiUsage {
  day: string;
  calls: number;
  inTokens: number;
  outTokens: number;
}

export type AiErrorKind = 'nokey' | 'auth' | 'budget' | 'ratelimit' | 'model' | 'network' | 'parse' | 'offline';

export class AiError extends Error {
  kind: AiErrorKind;
  retryAfterSec?: number;
  constructor(kind: AiErrorKind, message: string, retryAfterSec?: number) {
    super(message);
    this.kind = kind;
    this.retryAfterSec = retryAfterSec;
  }
}

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadUsage(): AiUsage {
  try {
    const u = JSON.parse(localStorage.getItem(USAGE_KEY) ?? 'null') as AiUsage | null;
    if (u && u.day === dayKey()) return u;
  } catch { /* fresh */ }
  return { day: dayKey(), calls: 0, inTokens: 0, outTokens: 0 };
}

const listeners = new Set<() => void>();
function freshUsage(): AiUsage {
  return { day: dayKey(), calls: 0, inTokens: 0, outTokens: 0 };
}
let usageCache: AiUsage;
try {
  usageCache = typeof localStorage === 'undefined' ? freshUsage() : loadUsage();
} catch {
  usageCache = freshUsage();
}

function saveUsage(u: AiUsage) {
  usageCache = u;
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(u));
  } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

/** Build-time key from `.env` (Vite inlines it — public by design, see .env.example). */
export function getEnvKey(): string {
  try {
    return import.meta.env?.VITE_GROQ_API_KEY ?? '';
  } catch {
    return '';
  }
}

export function keySource(): 'local' | 'env' | null {
  try {
    if (localStorage.getItem(KEY)) return 'local';
  } catch { /* ignore */ }
  return getEnvKey() ? 'env' : null;
}

export function getKey(): string {
  try {
    const k = localStorage.getItem(KEY);
    if (k) return k;
  } catch { /* ignore */ }
  return getEnvKey();
}

export function setKey(k: string) {
  try {
    if (k) localStorage.setItem(KEY, k.trim());
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function getModel(): GroqModelId {
  try {
    const m = localStorage.getItem(MODEL_KEY);
    if (m === 'auto' || CHAIN.includes(m as (typeof CHAIN)[number])) return m as GroqModelId;
  } catch { /* ignore */ }
  return DEFAULT_MODEL;
}

export function setModel(m: GroqModelId) {
  try {
    localStorage.setItem(MODEL_KEY, m);
  } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

export function getBudget(): number {
  try {
    const b = Number(localStorage.getItem(BUDGET_KEY));
    if (Number.isFinite(b) && b > 0) return Math.min(b, 10_000_000);
  } catch { /* ignore */ }
  return DEFAULT_BUDGET_TOKENS;
}

export function setBudget(n: number) {
  try {
    localStorage.setItem(BUDGET_KEY, String(n));
  } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

interface AiSnapshot {
  key: string;
  model: GroqModelId;
  usage: AiUsage;
  budget: number;
}

let snapCache: AiSnapshot = { key: '', model: DEFAULT_MODEL, usage: usageCache, budget: DEFAULT_BUDGET_TOKENS };

/** Cached snapshot — must return a stable reference or React loops forever. */
function getSnapshot(): AiSnapshot {
  const key = getKey();
  const model = getModel();
  const budget = getBudget();
  // Day rollover: yesterday's cached bucket must not linger until the next chat.
  if (usageCache.day !== dayKey()) usageCache = loadUsage();
  const usage = usageCache;
  if (snapCache.key !== key || snapCache.model !== model || snapCache.budget !== budget || snapCache.usage !== usage) {
    snapCache = { key, model, usage, budget };
  }
  return snapCache;
}

const serverSnap: AiSnapshot = { key: '', model: DEFAULT_MODEL, usage: usageCache, budget: DEFAULT_BUDGET_TOKENS };

export function useAiStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnapshot,
    () => serverSnap,
  );
}

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResult {
  text: string;
  model: string;
  inTokens: number;
  outTokens: number;
}

function chainFor(model: GroqModelId): string[] {
  if (model !== 'auto') return [model, ...CHAIN.filter((m) => m !== model)];
  return [...CHAIN];
}

function parseRetryAfter(res: Response): number {
  const h = res.headers.get('retry-after');
  const n = h ? Number(h) : NaN;
  if (Number.isFinite(n) && n > 0) return Math.min(n, 120);
  try {
    const d = Date.parse(h ?? '');
    if (!Number.isNaN(d)) return Math.max(1, Math.min(120, Math.round((d - Date.now()) / 1000)));
  } catch { /* ignore */ }
  return 20;
}

/** Rough pre-flight estimate (~4 chars/token) so one prompt can't blow the budget. */
export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export async function chat(messages: ChatMsg[], opts: { maxTokens?: number; temperature?: number; signal?: AbortSignal } = {}): Promise<ChatResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new AiError('offline', 'You are offline. AI features need a connection; everything else keeps working.');
  const key = getKey();
  if (!key) throw new AiError('nokey', 'Add your Groq API key in AI settings to enable this.');
  const budget = getBudget();
  const usage = loadUsage();
  const used = usage.inTokens + usage.outTokens;
  const promptEst = messages.reduce((a, m) => a + estimateTokens(m.content), 0);
  if (used + promptEst + (opts.maxTokens ?? 800) > budget) {
    throw new AiError('budget', `Daily AI budget reached (${used.toLocaleString()}/${budget.toLocaleString()} tokens). Raise it in settings or come back tomorrow.`);
  }

  const models = chainFor(getModel());
  let lastErr: AiError | null = null;
  for (const model of models) {
    let res: Response;
    try {
      res = await fetch(API, {
        method: 'POST',
        signal: opts.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.maxTokens ?? 800,
        }),
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      throw new AiError('network', 'Could not reach Groq. Check your connection and try again.');
    }
    if (res.ok) {
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (!text) throw new AiError('parse', 'Groq returned an empty reply. Try again.');
      const inT = data.usage?.prompt_tokens ?? promptEst;
      const outT = data.usage?.completion_tokens ?? estimateTokens(text);
      const prev = loadUsage();
      saveUsage({ ...prev, calls: prev.calls + 1, inTokens: prev.inTokens + inT, outTokens: prev.outTokens + outT });
      return { text, model, inTokens: inT, outTokens: outT };
    }
    if (res.status === 401) throw new AiError('auth', 'Groq rejected the API key (401). Check it in AI settings — keys start with gsk_.');
    if (res.status === 429) {
      lastErr = new AiError('ratelimit', '', parseRetryAfter(res));
      continue; // try next model in chain
    }
    if (res.status === 404 || res.status === 400) {
      // Unknown/deprecated model id — fall through to next in chain.
      lastErr = new AiError('model', `Model ${model} was rejected (${res.status}). Trying fallback…`);
      continue;
    }
    const body = await res.text().catch(() => '');
    throw new AiError('network', `Groq error ${res.status}${body ? `: ${body.slice(0, 160)}` : ''}.`);
  }
  throw new AiError(
    'ratelimit',
    lastErr?.kind === 'model'
      ? 'No configured model is available on your Groq account right now. Check console.groq.com → Limits.'
      : `Rate limited on all models. Free-tier limits reset quickly — wait ${lastErr?.retryAfterSec ?? 20}s or pick the 8B model. See console.groq.com → Limits.`,
    lastErr?.retryAfterSec,
  );
}

export async function testConnection(): Promise<{ model: string; ms: number }> {
  const t0 = Date.now();
  const r = await chat([{ role: 'user', content: 'Reply with exactly: OK' }], { maxTokens: 5, temperature: 0 });
  if (!/ok/i.test(r.text)) throw new AiError('parse', `Unexpected reply: ${r.text.slice(0, 80)}`);
  return { model: r.model, ms: Date.now() - t0 };
}

/** Keep prompts small: titles + truncated context. */
export function clip(s: string, n = 6000) {
  return s.length > n ? `${s.slice(0, n)}\n…(truncated)` : s;
}

export interface GradeResult {
  score: 0 | 0.5 | 1;
  feedback: string;
}

export async function gradeAnswer(question: string, modelAnswer: string, userAnswer: string): Promise<GradeResult> {
  const r = await chat(
    [
      {
        role: 'system',
        content: 'You grade software-engineering interview answers. Reply ONLY with JSON: {"score": 0|0.5|1, "feedback": "2-3 sentences: what was right, what was missing"}. 1 = correct and complete, 0.5 = partially correct, 0 = wrong or empty.',
      },
      {
        role: 'user',
        content: `Question: ${question}\nModel answer: ${clip(modelAnswer, 1500)}\nCandidate answer: ${clip(userAnswer, 1500)}`,
      },
    ],
    { maxTokens: 300, temperature: 0.2 },
  );
  const m = r.text.match(/\{[\s\S]*\}/);
  if (!m) throw new AiError('parse', 'Could not parse the AI grade. Try again or self-grade.');
  try {
    const v = JSON.parse(m[0]) as { score?: number; feedback?: string };
    const score = v.score === 1 ? 1 : v.score === 0.5 ? 0.5 : 0;
    return { score, feedback: v.feedback?.slice(0, 600) || 'No feedback returned.' };
  } catch {
    throw new AiError('parse', 'Could not parse the AI grade. Try again or self-grade.');
  }
}
