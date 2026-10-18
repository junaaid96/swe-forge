/** Inline AI coach for the practice workspace: error explain, hints, review, interview. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AiError, chat, useAiStatus, type ChatMsg } from '../lib/ai';
import { COACH_ACTIONS, coachContextBlock, type CoachActionId } from '../lib/practiceCoach';
import type { PracticeChallenge } from '../lib/types';
import type { Submission } from './PracticeResults';
import { Markdown } from './Markdown';

interface Props {
  challenge: PracticeChallenge;
  code: string;
  language: string;
  submission: Submission | null;
}

export function PracticeCoach({ challenge, code, language, submission }: Props) {
  const status = useAiStatus();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState<CoachActionId | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const snapshot = useRef({ code, submission });

  useEffect(() => {
    setMsgs([]);
    setActionId(null);
  }, [challenge.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [msgs, busy]);

  const failed = Boolean(
    submission && (submission.visible.error || submission.visible.cases.some((c) => !c.pass) || (submission.hidden && (submission.hidden.error || submission.hidden.cases.some((c) => !c.pass)))),
  );
  const hasCode = code.trim().length > 0;
  const canUse = (id: CoachActionId) => {
    if (id === 'explain') return failed;
    if (id === 'hint') return true;
    return hasCode;
  };

  const send = async (userText: string, id: CoachActionId | null) => {
    const text = userText.trim();
    if (!text || busy) return;
    const action = COACH_ACTIONS.find((a) => a.id === id);
    // Snapshot the code/run at send time so edits mid-flight don't confuse the thread.
    snapshot.current = { code, submission };
    const history: ChatMsg[] = [
      { role: 'system', content: `You are Forgeline's Practice Lab coach. Answer concisely in Markdown. Never write the full solution.${action ? ` ${action.system}` : ''}` },
      ...msgs,
      { role: 'user', content: `${text}\n\n${coachContextBlock(challenge, snapshot.current.code, language, snapshot.current.submission)}` },
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
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const start = (id: CoachActionId) => {
    const action = COACH_ACTIONS.find((a) => a.id === id);
    if (!action) return;
    setActionId(id);
    void send(action.prompt, id);
  };

  const used = status.usage.inTokens + status.usage.outTokens;
  const pct = Math.min(100, Math.round((used / status.budget) * 100));

  return (
    <section className="card pad practice-coach" aria-labelledby="coach-h">
      <div className="row-between">
        <h2 id="coach-h">AI coach</h2>
        {msgs.length ? (
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() => {
              setMsgs([]);
              setActionId(null);
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      <p className="muted small">Grounded in your code and visible tests — the reference solution and hidden tests are never sent.</p>
      <div className="ai-actions" role="group" aria-label="Coach actions">
        {COACH_ACTIONS.map((a) => (
          <button key={a.id} type="button" className={`chip chip-toggle ${actionId === a.id ? 'on' : ''}`} disabled={busy || !status.key || !canUse(a.id)} onClick={() => start(a.id)} title={!canUse(a.id) ? (a.id === 'explain' ? 'Run your code first' : 'Write some code first') : a.label}>
            {a.label}
          </button>
        ))}
      </div>
      <div className="ai-msgs coach-msgs" aria-live="polite">
        {!msgs.length ? (
          <p className="muted small">
            {status.key
              ? 'Pick an action above, or ask a follow-up below. The coach sees your code, the visible tests and your last run.'
              : 'Add your Groq API key to enable the coach. Keys never leave your browser except for Groq API calls.'}
            {!status.key ? (
              <>
                {' '}
                <Link to="/ai">Open AI settings</Link>.
              </>
            ) : null}
          </p>
        ) : null}
        {msgs.map((m, i) => (
          <div key={i} className={`ai-msg ai-${m.role}`}>
            {m.role === 'assistant' ? <Markdown className="ai-md">{m.content}</Markdown> : <p>{m.content}</p>}
          </div>
        ))}
        {busy ? (
          <p className="muted small">
            Thinking…{' '}
            <button type="button" className="link-btn" onClick={() => abortRef.current?.abort()}>
              Stop
            </button>
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>
      <form
        className="ai-input"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input, actionId);
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={status.key ? 'Follow up…' : 'Add an API key first (AI settings)'} aria-label="Follow up with the coach" disabled={!status.key || busy} />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!status.key || busy || !input.trim()}>
          Send
        </button>
      </form>
      <div className="ai-meter" title={`${used.toLocaleString()} of ${status.budget.toLocaleString()} tokens used today`}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
