import type { CaseResult, RunResults } from '../lib/runners';

export interface Submission {
  visible: RunResults;
  hidden?: RunResults;
  submitted: boolean;
  hiddenCount: number;
}

function CaseRow({ c, hideExpected }: { c: CaseResult; hideExpected?: boolean }) {
  return (
    <li className={`case ${c.pass ? 'pass' : 'fail'}`}>
      <p className="case-head">
        <span className={`chip ${c.pass ? 'chip-good' : 'chip-bad'}`}>{c.pass ? 'Pass' : 'Fail'}</span>
        <strong>{c.name}</strong>
      </p>
      {c.pass || hideExpected ? null : (
        <div className="case-io">
          {c.expected !== undefined ? (
            <div>
              <p className="muted small">Expected</p>
              <pre>{c.expected}</pre>
            </div>
          ) : null}
          {c.actual !== undefined ? (
            <div>
              <p className="muted small">Actual</p>
              <pre>{c.actual}</pre>
            </div>
          ) : null}
        </div>
      )}
      {c.error ? (
        <p className="case-error">
          <strong>Error{c.errorLine ? ` (line ${c.errorLine})` : ''}: </strong>
          {c.error}
        </p>
      ) : null}
    </li>
  );
}

export function PracticeResults({ submission, running }: { submission: Submission | null; running: boolean }) {
  if (running) {
    return (
      <div className="results" aria-live="polite" aria-busy="true">
        <p className="muted">Running…</p>
      </div>
    );
  }
  if (!submission) {
    return (
      <div className="results">
        <p className="muted">Press Run (or Ctrl/⌘+Enter) to check your code against the visible tests.</p>
      </div>
    );
  }
  const { visible, hidden, submitted, hiddenCount } = submission;
  const passed = visible.cases.filter((c) => c.pass).length + (hidden?.cases.filter((c) => c.pass).length ?? 0);
  const total = visible.cases.length + (hidden?.cases.length ?? (submitted ? 0 : hiddenCount));
  const fatal = visible.error ?? hidden?.error;
  return (
    <div className="results" aria-live="polite" data-testid="practice-results">
      <p className="results-summary">
        <span className={`chip ${!fatal && visible.ok && (!hidden || hidden.ok) ? 'chip-good' : 'chip-bad'}`}>
          {passed}/{total} passed
        </span>
        <span className="muted small">
          {Math.round(visible.runtimeMs + (hidden?.runtimeMs ?? 0))}ms{submitted ? ' · all tests' : ' · visible tests'}
        </span>
      </p>
      {visible.timedOut ? <p className="banner banner-bad">{visible.error}</p> : null}
      {fatal && !visible.timedOut ? (
        <p className="banner banner-bad">
          {fatal}
          {visible.errorLine ? ` (line ${visible.errorLine})` : ''}
        </p>
      ) : null}
      <ul className="cases">
        {visible.cases.map((c) => (
          <CaseRow key={`v-${c.name}`} c={c} />
        ))}
        {hidden?.cases.map((c) => (
          <CaseRow key={`h-${c.name}`} c={c} hideExpected={!c.pass} />
        ))}
      </ul>
      {visible.stdout || hidden?.stdout ? (
        <details className="stdout">
          <summary>Console output{(visible.truncated || hidden?.truncated) && ' (truncated)'}</summary>
          <pre>{[visible.stdout, hidden?.stdout].filter(Boolean).join('\n')}</pre>
        </details>
      ) : null}
      {visible.truncated && !visible.stdout && !hidden?.stdout ? <p className="muted small">Console output exceeded the cap.</p> : null}
    </div>
  );
}
