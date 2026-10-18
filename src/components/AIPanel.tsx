/** AI assistant panel: BYOK Groq chat grounded on the current page/card. */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AiError, GROQ_MODELS, chat, clip, getBudget, keySource, setBudget, setKey, setModel, testConnection, useAiStatus, type ChatMsg } from '../lib/ai';
import { useDialogFocus } from '../lib/focus';
import { Markdown } from './Markdown';
import { IconClose } from './Icons';

export interface AiContext {
  title: string;
  body: string;
}

const ACTIONS = [
  { id: 'explain', label: 'Explain simply', prompt: 'Explain the key ideas below like I am a smart junior developer. Use short sections and one tiny example.' },
  { id: 'summarize', label: 'Summarize', prompt: 'Summarize the material below into 5 tight bullets I can revise in 60 seconds.' },
  { id: 'quiz', label: 'Quiz me', prompt: 'Ask me exactly 3 multiple-choice questions (A-D) on the material below, one at a time. Wait for my answer before revealing correctness and explaining.' },
  { id: 'interview', label: 'Interview me', prompt: 'Act as a senior interviewer. Ask me one hard open question on the material below, then grade my answer honestly with what was missing.' },
] as const;

function contextBlock(ctx: AiContext) {
  return `Context — ${ctx.title}:\n${clip(ctx.body)}`;
}

/** Key, model and budget settings — shared by the panel and the /ai hub page. */
export function AISettings() {
  const status = useAiStatus();
  const [keyDraft, setKeyDraft] = useState('');
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [budgetDraft, setBudgetDraft] = useState(String(getBudget()));
  const [showOwnKey, setShowOwnKey] = useState(false);
  const used = status.usage.inTokens + status.usage.outTokens;
  const src = keySource();
  // Site ships its own key → personal-key input stays hidden unless asked for.
  const needKeyInput = src !== 'env' || showOwnKey;

  const doTest = async () => {
    if (!keyDraft.trim()) return;
    setKey(keyDraft);
    setTestState('testing');
    setTestMsg('');
    try {
      const r = await testConnection();
      setTestState('ok');
      setTestMsg(`Connected in ${r.ms}ms via ${r.model}.`);
    } catch (e) {
      setTestState('fail');
      setTestMsg(e instanceof AiError ? e.message : 'Connection failed.');
    }
  };

  return (
    <div className="ai-settings">
      {src === 'env' && !showOwnKey ? (
        <p className="muted small">
          Shared site key is active — no setup needed.{' '}
          <button type="button" className="link-btn" onClick={() => setShowOwnKey(true)}>
            Use a personal key instead
          </button>
        </p>
      ) : null}
      {needKeyInput ? (
        <>
          <label className="tool-field">
            <span className="tool-label">Groq API key (stays in this browser)</span>
            <input
              type="password"
              className="tool-input mono"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder={src === 'local' ? '•••• key saved — paste a new one to replace' : 'gsk_…'}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="row tool-actions">
            <button type="button" className="btn btn-sm btn-primary" disabled={!keyDraft.trim() || testState === 'testing'} onClick={doTest}>
              {testState === 'testing' ? 'Testing…' : 'Save & test'}
            </button>
            {src === 'local' ? (
              <button type="button" className="btn btn-sm" onClick={() => { setKey(''); setKeyDraft(''); setTestState('idle'); setShowOwnKey(false); }}>
                Remove key
              </button>
            ) : null}
          </div>
          {testMsg ? <p className={testState === 'ok' ? 'good' : 'bad'} role="status">{testMsg}</p> : null}
        </>
      ) : null}
      <div className="row tool-actions">
        <label className="tool-field">
          <span className="tool-label">Model</span>
          <select value={status.model} onChange={(e) => setModel(e.target.value as typeof status.model)}>
            <option value="auto">Auto (70B → Scout → 8B → OSS-20B fallback)</option>
            {GROQ_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <label className="tool-field">
          <span className="tool-label">Daily token budget</span>
          <input
            type="number"
            min={1000}
            step={1000}
            value={budgetDraft}
            onChange={(e) => setBudgetDraft(e.target.value)}
            onBlur={() => {
              const n = Number(budgetDraft);
              if (Number.isFinite(n) && n > 0) setBudget(n);
            }}
          />
        </label>
      </div>
      <p className="muted small">
        Key source: {keySource() === 'local' ? 'this browser (yours)' : keySource() === 'env' ? 'site .env (shared)' : 'none yet'}.
        Free-tier limits live at console.groq.com → Limits and reset automatically; on a 429 the app falls back to the next model. Usage today: {status.usage.calls} calls ·{' '}
        {used.toLocaleString()}/{status.budget.toLocaleString()} tokens.
      </p>
    </div>
  );
}

export function AIPanel({ open, onClose, context }: { open: boolean; onClose: () => void; context: AiContext }) {
  const status = useAiStatus();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, onClose, dialogRef);

  useEffect(() => {
    if (open) {
      setMsgs([]);
      setInput('');
      setShowSettings(!status.key);
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, busy]);

  if (!open) return null;

  const send = async (userText: string, systemExtra?: string) => {
    const text = userText.trim();
    if (!text || busy) return;
    const history: ChatMsg[] = [
      { role: 'system', content: `You are Forgeline's study coach. Answer concisely in Markdown. Ground every answer in the provided context when relevant; say so when going beyond it.${systemExtra ? ` ${systemExtra}` : ''}` },
      ...msgs,
      { role: 'user', content: `${text}\n\n${contextBlock(context)}` },
    ];
    setMsgs((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setBusy(true);
    abortRef.current = new AbortController();
    try {
      const r = await chat(history, { signal: abortRef.current.signal });
      setMsgs((m) => [...m, { role: 'assistant', content: `${r.text}\n\n*— ${r.model} · ${r.inTokens + r.outTokens} tokens*` }]);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      const msg = e instanceof AiError ? e.message : 'Something went wrong. Try again.';
      setMsgs((m) => [...m, { role: 'assistant', content: `⚠️ ${msg}` }]);
      if (e instanceof AiError && (e.kind === 'nokey' || e.kind === 'auth')) setShowSettings(true);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const used = status.usage.inTokens + status.usage.outTokens;
  const pct = Math.min(100, Math.round((used / status.budget) * 100));

  return createPortal(
    <div className="modal-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ai-panel" role="dialog" aria-modal="true" aria-label={`AI assistant for ${context.title}`} ref={dialogRef}>
        <div className="ai-head">
          <div>
            <p className="eyebrow">AI study coach · Groq</p>
            <strong>{context.title}</strong>
          </div>
          <div className="row">
            <button type="button" className="btn btn-sm" onClick={() => setShowSettings((s) => !s)} aria-expanded={showSettings}>
              {showSettings ? 'Hide settings' : 'Settings'}
            </button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close AI panel">
              <IconClose />
            </button>
          </div>
        </div>

        {showSettings ? <AISettings /> : (
          <>
            <div className="ai-actions" role="group" aria-label="Quick actions">
              {ACTIONS.map((a) => (
                <button key={a.id} type="button" className="chip chip-toggle" disabled={busy || !status.key} onClick={() => send(a.prompt)}>
                  {a.label}
                </button>
              ))}
            </div>
            <div className="ai-msgs" aria-live="polite">
              {!msgs.length ? (
                <p className="muted small">
                  {status.key
                    ? 'Ask anything about this page, or pick an action above. Answers stay grounded in the page content.'
                    : 'Add your Groq API key in Settings to start chatting. Keys never leave your browser except for Groq API calls.'}
                </p>
              ) : null}
              {msgs.map((m, i) => (
                <div key={i} className={`ai-msg ai-${m.role}`}>
                  {m.role === 'assistant' ? <Markdown className="ai-md">{m.content}</Markdown> : <p>{m.content}</p>}
                </div>
              ))}
              {busy ? <p className="muted small">Thinking… <button type="button" className="link-btn" onClick={() => abortRef.current?.abort()}>Stop</button></p> : null}
              <div ref={bottomRef} />
            </div>
            <form
              className="ai-input"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={status.key ? 'Ask about this page…' : 'Add an API key first (Settings)'} aria-label="Ask about this page" disabled={!status.key || busy} autoFocus />
              <button type="submit" className="btn btn-primary btn-sm" disabled={!status.key || busy || !input.trim()}>
                Send
              </button>
            </form>
            <div className="ai-meter" title={`${used.toLocaleString()} of ${status.budget.toLocaleString()} tokens used today`}>
              <span style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
