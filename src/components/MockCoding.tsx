import { useEffect, useRef, useState } from 'react';
import { Markdown } from './Markdown';
import { PracticeResults, type Submission } from './PracticeResults';
import { CodeEditor } from './CodeEditor';
import { runnerFor, type RunResults } from '../lib/runners';
import { practice } from '../lib/practiceStore';
import { AiError, chat, getKey } from '../lib/ai';
import { coachContextBlock } from '../lib/practiceCoach';
import type { PracticeChallenge } from '../lib/types';

export interface CodingResult {
  score: number;
  code: string;
  language: string;
  feedback: string;
}

interface Props {
  challenge: PracticeChallenge;
  /** per-challenge time limit */
  seconds: number;
  index: number;
  total: number;
  onDone: (r: CodingResult) => void;
}

/** One timed coding question inside a mock interview. Loaded lazily. */
export function MockCoding({ challenge, seconds, index, total, onDone }: Props) {
  const lang = challenge.languages[0] ?? 'javascript';
  const [code, setCode] = useState(() => challenge.starters[lang] ?? '');
  const [running, setRunning] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackErr, setFeedbackErr] = useState('');
  const [left, setLeft] = useState(seconds);
  const doneRef = useRef(false);
  const stateRef = useRef({ code, feedback });
  stateRef.current = { code, feedback };

  const finish = (score: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    practice.recordAttempt(challenge.id);
    if (score === 1) practice.recordSolve(challenge.id);
    onDone({ score, code: stateRef.current.code, language: lang, feedback: stateRef.current.feedback });
  };

  useEffect(() => {
    if (left <= 0) {
      finish(0);
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const run = async (submit: boolean) => {
    const runner = runnerFor(challenge.runner);
    if (!runner || !challenge.visibleTests || running || doneRef.current) return;
    setRunning(true);
    try {
      const opts = { language: lang, seedSql: challenge.seedSql };
      const visible: RunResults = await runner.run(code, challenge.visibleTests, opts);
      if (!submit || !challenge.hiddenTests) {
        setSubmission({ visible, submitted: submit, hiddenCount: challenge.hiddenTests?.cases.length ?? 0 });
        return;
      }
      if (!visible.ok) {
        setSubmission({ visible, submitted: true, hiddenCount: challenge.hiddenTests.cases.length });
        return;
      }
      const hidden = await runner.run(code, challenge.hiddenTests, opts);
      setSubmission({ visible, hidden, submitted: true, hiddenCount: hidden.cases.length });
    } finally {
      setRunning(false);
    }
  };

  const submit = () => {
    const s = submission;
    if (!s?.submitted || !s.visible.ok) return;
    const passed = s.visible.cases.filter((c) => c.pass).length + (s.hidden?.cases.filter((c) => c.pass).length ?? 0);
    const totalCases = s.visible.cases.length + (s.hidden?.cases.length ?? 0);
    const ratio = totalCases ? passed / totalCases : 0;
    finish(ratio >= 1 ? 1 : ratio >= 0.5 ? 0.5 : 0);
  };

  const askFeedback = async () => {
    if (!getKey()) {
      setFeedbackErr('Add your Groq API key in AI settings to enable this.');
      return;
    }
    setFeedbackBusy(true);
    setFeedbackErr('');
    try {
      const r = await chat(
        [
          { role: 'system', content: 'You review a timed interview solution. Reply in Markdown under three short headers: Approach (what they did, 2 sentences), Correctness & edge cases (bugs or gaps in THEIR code), Next time (one concrete improvement). Never reveal a reference solution.' },
          { role: 'user', content: coachContextBlock(challenge, code, lang, submission) },
        ],
        { maxTokens: 600, temperature: 0.4 },
      );
      setFeedback(r.text);
    } catch (e) {
      setFeedbackErr(e instanceof AiError ? e.message : 'AI feedback failed.');
    } finally {
      setFeedbackBusy(false);
    }
  };

  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  const canSubmit = Boolean(submission?.submitted && submission.visible.ok);

  return (
    <div className="page narrow mock-run" data-testid="mock-coding">
      <div className="mock-bar">
        <span>
          Coding {index + 1} / {total}
        </span>
        <span className={`timer ${left < 60 ? 'urgent' : ''}`} role="timer" aria-live="off">
          {mm}:{ss} left
        </span>
        <button type="button" className="btn btn-sm" onClick={() => finish(0)}>
          Skip
        </button>
      </div>
      <article className="card pad mock-q">
        <p className="fc-ctx">
          💻 {challenge.title} · {challenge.difficulty} · {lang}
        </p>
        <div className="prose">
          <Markdown>{challenge.statement}</Markdown>
        </div>
        {challenge.examples ? (
          <details>
            <summary>Examples</summary>
            <Markdown>{challenge.examples}</Markdown>
          </details>
        ) : null}
        <CodeEditor language={lang} value={code} onChange={setCode} onRun={() => run(false)} label={`Code editor, ${lang}`} />
        <div className="row run-row">
          <button type="button" className="btn btn-primary" onClick={() => run(false)} disabled={running} data-testid="mock-code-run">
            {running ? 'Running…' : 'Run visible tests'}
          </button>
          <button type="button" className="btn btn-accent" onClick={() => run(true)} disabled={running} data-testid="mock-code-submit-tests">
            Submit all tests
          </button>
          <button type="button" className="btn btn-good" onClick={submit} disabled={!canSubmit} data-testid="mock-code-next" title="Visible tests must pass first">
            {index + 1 >= total ? 'Finish coding' : 'Next challenge'}
          </button>
        </div>
        <PracticeResults submission={submission} running={running} />
        {canSubmit ? (
          <div className="row">
            <button type="button" className="btn btn-accent" onClick={askFeedback} disabled={feedbackBusy} data-testid="mock-code-feedback">
              {feedbackBusy ? 'Reviewing…' : 'AI feedback on my approach'}
            </button>
          </div>
        ) : null}
        {feedbackErr ? (
          <p className="tool-error" role="alert">
            {feedbackErr}
          </p>
        ) : null}
        {feedback ? (
          <div className="card pad ai-feedback" data-testid="mock-code-feedback-result">
            <Markdown>{feedback}</Markdown>
          </div>
        ) : null}
      </article>
    </div>
  );
}

export default MockCoding;
