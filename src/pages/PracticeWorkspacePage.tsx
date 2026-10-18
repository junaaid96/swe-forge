import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { topicMap, useCatalog, useResource, urls } from '../lib/content';
import { patternCardId, practice, statusOf, usePractice } from '../lib/practiceStore';
import { progress, useProgress } from '../lib/progress';
import { remoteRunnerUrl, runnerFor } from '../lib/runners';
import { formatValue } from '../lib/runner-shared';
import type { PracticeChallenge, PracticeIndex } from '../lib/types';
import { CodeEditor } from '../components/CodeEditor';
import { PracticeCoach } from '../components/PracticeCoach';
import { PracticeResults, type Submission } from '../components/PracticeResults';
import { Markdown } from '../components/Markdown';
import { PageFallback } from '../components/Layout';
import { IconArrowLeft, IconArrowRight, IconCheck } from '../components/Icons';
import { NotFoundPage } from './NotFoundPage';

type Tab = 'problem' | 'learn' | 'hints' | 'solution';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'problem', label: 'Problem' },
  { id: 'learn', label: 'Learn' },
  { id: 'hints', label: 'Hints' },
  { id: 'solution', label: 'Solution' },
];
const DIFF_RANK = { easy: 0, medium: 1, hard: 2 } as const;

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function PracticeWorkspacePage() {
  const { topic = '', slug = '' } = useParams();
  const { data: catalog } = useCatalog();
  const safe = /^[\w-]+$/.test(topic) && /^[\w-]+$/.test(slug);
  const { data: challenge, error } = useResource<PracticeChallenge>(safe && topic && slug ? urls.challenge(topic, slug) : null);
  const { data: index } = useResource<PracticeIndex>(urls.practice);
  const state = usePractice();
  const progressState = useProgress();

  const [tab, setTab] = useState<Tab>('problem');
  const [language, setLanguage] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const draftTimer = useRef(0);

  const record = challenge ? state.records[challenge.id] : undefined;
  const status = statusOf(record);
  const solved = status === 'solved' || status === 'solved-hints';
  const topics = useMemo(() => topicMap(catalog), [catalog]);
  const topicInfo = topics.get(topic);
  const runner = challenge ? runnerFor(challenge.runner) : null;
  const thinkAndCheck = challenge?.runner === 'none' || !runner;

  useEffect(() => {
    if (challenge) document.title = `${challenge.title} · Practice Lab`;
  }, [challenge]);

  useEffect(() => {
    if (challenge) practice.visit(challenge.id, challenge.url, challenge.title);
  }, [challenge]);

  // Init editor from draft/starter whenever the challenge or language changes.
  const lang = language ?? record?.lastLanguage ?? challenge?.languages[0] ?? 'text';
  useEffect(() => {
    if (!challenge) return;
    const l = record?.lastLanguage ?? challenge.languages[0] ?? 'text';
    setLanguage(l);
    setCode(record?.drafts[l] ?? challenge.starters[l] ?? '');
    setSubmission(null);
    setConfirmReset(false);
    setConfirmGiveUp(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge?.id]);

  // Draft autosave (debounced).
  useEffect(() => {
    if (!challenge || language === null) return;
    window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => practice.saveDraft(challenge.id, lang, code), 500);
    return () => window.clearTimeout(draftTimer.current);
  }, [challenge, language, lang, code]);

  const nextUp = useMemo(() => {
    if (!challenge || !index) return [];
    return index.challenges
      .filter((c) => c.topic === challenge.topic && c.id !== challenge.id && statusOf(state.records[c.id]) === 'unsolved')
      .sort((a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty])
      .slice(0, 3);
  }, [challenge, index, state.records]);

  if (!safe || error) return <NotFoundPage message="That challenge doesn't exist." />;
  if (!challenge) return <PageFallback />;

  const switchLanguage = (l: string) => {
    setLanguage(l);
    practice.setLanguage(challenge.id, l);
    setCode(state.records[challenge.id]?.drafts[l] ?? challenge.starters[l] ?? '');
    setSubmission(null);
    setConfirmReset(false);
  };

  const runOpts = { language: lang, seedSql: challenge.seedSql };

  const handleRun = async () => {
    if (!runner || !challenge.visibleTests || running) return;
    practice.recordAttempt(challenge.id);
    setRunning(true);
    try {
      const visible = await runner.run(code, challenge.visibleTests, runOpts);
      setSubmission({ visible, submitted: false, hiddenCount: challenge.hiddenTests?.cases.length ?? 0 });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!runner || !challenge.visibleTests || running) return;
    practice.recordAttempt(challenge.id);
    setRunning(true);
    try {
      const visible = await runner.run(code, challenge.visibleTests, runOpts);
      if (!visible.ok || !challenge.hiddenTests) {
        setSubmission({ visible, submitted: true, hiddenCount: challenge.hiddenTests?.cases.length ?? 0 });
        if (visible.ok && !challenge.hiddenTests) practice.recordSolve(challenge.id);
        return;
      }
      const hidden = await runner.run(code, challenge.hiddenTests, runOpts);
      setSubmission({ visible, hidden, submitted: true, hiddenCount: hidden.cases.length });
      if (hidden.ok) practice.recordSolve(challenge.id);
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    practice.clearDraft(challenge.id, lang);
    setCode(challenge.starters[lang] ?? '');
    setSubmission(null);
  };

  const revealHint = (n: number) => practice.setHintsUsed(challenge.id, n);
  const revealed = Math.max(record?.hintsUsed ?? 0, 0);

  const handleGiveUp = () => {
    if (!confirmGiveUp) {
      setConfirmGiveUp(true);
      return;
    }
    setConfirmGiveUp(false);
    practice.recordGiveUp(challenge.id);
    setTab('solution');
  };

  const solutionUnlocked = solved || (record?.attempts ?? 0) > 0 || record?.gaveUp === true;

  const onTabKey = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next >= 0) {
      e.preventDefault();
      setTab(TABS[next].id);
      tabRefs.current[next]?.focus();
    }
  };

  const vt = challenge.visibleTests;
  const cardId = patternCardId(challenge.id);
  const cardQueued = Boolean(progressState.cards[cardId]);
  const addCard = () => progress.dueToday([{ id: cardId, topic: challenge.topic }]);
  const failedSubmit = Boolean(submission?.submitted && (!submission.visible.ok || (submission.hidden && !submission.hidden.ok)));

  return (
    <div className="practice-workspace" style={{ ['--topic' as string]: topicInfo?.accent ?? 'var(--accent)' }}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden>/</span>
        <Link to="/practice">Practice Lab</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{challenge.title}</span>
      </nav>

      <header className="row-between practice-head">
        <div>
          <p className="eyebrow">
            {topicInfo?.emoji} {topicInfo?.title ?? topic}
          </p>
          <h1>{challenge.title}</h1>
          <p className="chips" aria-label="Challenge details">
            <span className={`chip diff-${challenge.difficulty}`}>{challenge.difficulty}</span>
            <span className="chip">{challenge.estimatedMinutes} min</span>
            {challenge.tags.map((t) => (
              <Link key={t} className="chip chip-link" to={`/practice?tag=${encodeURIComponent(t)}`}>
                {t}
              </Link>
            ))}
            <span className={`chip ${solved ? 'chip-good' : status === 'attempted' ? 'chip-warn' : ''}`}>
              {solved ? (status === 'solved-hints' ? 'Solved · hints used' : 'Solved ✓') : status === 'attempted' ? `Attempted · ${record?.attempts}` : 'Unsolved'}
            </span>
          </p>
        </div>
        <Link className="btn btn-sm" to={`/practice?topic=${challenge.topic}`}>
          <IconArrowLeft /> All {topicInfo?.title ?? 'topic'} challenges
        </Link>
      </header>

      {solved ? (
        <div className="card pad success-banner practice-solved" role="status">
          <p>
            <IconCheck /> Solved{record?.attempts ? ` in ${record.attempts} attempt${record.attempts === 1 ? '' : 's'}` : ''}
            {record?.timeMs ? ` · ${formatDuration(record.timeMs)}` : ''}
            {record && record.hintsUsed > 0 ? ` · ${record.hintsUsed} hint${record.hintsUsed === 1 ? '' : 's'}` : ' · no hints'}.
          </p>
          {challenge.complexity ? (
            <details>
              <summary>Complexity notes</summary>
              <Markdown>{challenge.complexity}</Markdown>
            </details>
          ) : null}
          {nextUp.length ? (
            <p className="next-up">
              Next: {nextUp.map((n, i) => (
                <span key={n.id}>
                  {i > 0 && ' · '}
                  <Link to={n.url}>{n.title}</Link> <small className="muted">({n.difficulty})</small>
                </span>
              ))}
            </p>
          ) : (
            <p className="next-up">
              <Link to="/practice">Browse more challenges <IconArrowRight /></Link>
            </p>
          )}
        </div>
      ) : null}

      <div className="workspace-grid">
        <section className="card practice-left" aria-label="Challenge material">
          <div className="ptabs" role="tablist" aria-label="Challenge tabs" onKeyDown={onTabKey}>
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`ptab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`ppanel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                className={tab === t.id ? 'active' : ''}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.id === 'hints' && revealed > 0 ? ` (${revealed}/${challenge.hints.length})` : ''}
                {t.id === 'solution' && !solutionUnlocked ? ' 🔒' : ''}
              </button>
            ))}
          </div>

          <div className="ppanel" role="tabpanel" id={`ppanel-${tab}`} aria-labelledby={`ptab-${tab}`}>
            {tab === 'problem' ? (
              <>
                <Markdown>{challenge.statement}</Markdown>
                {challenge.examples ? (
                  <>
                    <h2>Examples</h2>
                    <Markdown>{challenge.examples}</Markdown>
                  </>
                ) : null}
                {challenge.runner === 'sql' ? (
                  <>
                    <h2>Dataset</h2>
                    <p className="muted small">Your query runs against this data. Hidden tests use extra datasets with the same schema.</p>
                    <Markdown>{`\`\`\`sql\n${challenge.seedSql}\n\`\`\``}</Markdown>
                    {vt?.kind === 'sql'
                      ? vt.cases
                          .filter((c) => c.seed)
                          .map((c) => (
                            <details key={c.name}>
                              <summary>Dataset for “{c.name}”</summary>
                              <Markdown>{`\`\`\`sql\n${c.seed}\n\`\`\``}</Markdown>
                            </details>
                          ))
                      : null}
                  </>
                ) : null}
                {vt?.cases.length ? (
                  <>
                    <h2>Visible tests</h2>
                    <ul className="test-preview">
                      {vt.kind === 'fn'
                        ? vt.cases.map((c) => (
                            <li key={c.name}>
                              <code>
                                {vt.function}({(c.args ?? []).map((a) => formatValue(a, 120)).join(', ')})
                              </code>
                              <span aria-label="expected"> → </span>
                              <code>{c.throws !== undefined ? `throws ${c.throws}` : formatValue(c.expected, 120)}</code>
                            </li>
                          ))
                        : vt.cases.map((c) => (
                            <li key={c.name}>
                              <strong>{c.name}</strong>
                              <span className="muted small"> — {c.expectedRows.length} expected row{c.expectedRows.length === 1 ? '' : 's'}{c.orderInsensitive ? ', any order' : ''}</span>
                            </li>
                          ))}
                    </ul>
                  </>
                ) : null}
              </>
            ) : null}

            {tab === 'learn' ? (
              <>
                {challenge.learn ? <Markdown>{challenge.learn}</Markdown> : <p className="muted">No recap for this one yet — the guides below cover the concept.</p>}
                {challenge.learnLinks.length ? (
                  <>
                    <h2>Read next</h2>
                    <ul className="learn-links">
                      {challenge.learnLinks.map((l) => (
                        <li key={l.ref}>
                          <Link to={l.url}>{l.title}</Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            ) : null}

            {tab === 'hints' ? (
              <div aria-live="polite">
                {challenge.hints.length === 0 ? (
                  <p className="muted">No hints for this challenge.</p>
                ) : (
                  <ol className="hints-list">
                    {challenge.hints.map((h, i) =>
                      i < revealed ? (
                        <li key={i}>
                          <Markdown>{h}</Markdown>
                        </li>
                      ) : null,
                    )}
                  </ol>
                )}
                {revealed < challenge.hints.length ? (
                  <button type="button" className="btn" onClick={() => revealHint(revealed + 1)}>
                    Reveal hint {revealed + 1} of {challenge.hints.length}
                  </button>
                ) : challenge.hints.length > 0 ? (
                  <p className="muted small">All hints revealed. Using hints still counts as solved — just noted on your record.</p>
                ) : null}
                {revealed >= 2 ? (
                  cardQueued ? (
                    <p className="muted small">
                      Pattern card queued — <Link to="/flashcards">review it</Link>.
                    </p>
                  ) : (
                    <button type="button" className="btn btn-sm" onClick={addCard}>
                      Add pattern card to flashcards
                    </button>
                  )
                ) : null}
              </div>
            ) : null}

            {tab === 'solution' ? (
              solutionUnlocked ? (
                <>
                  {challenge.solution.explanation ? <Markdown>{challenge.solution.explanation}</Markdown> : null}
                  {Object.entries(challenge.solution.code).map(([l, src]) => (
                    <Markdown key={l}>{`\`\`\`${l}\n${src}\n\`\`\``}</Markdown>
                  ))}
                  {!challenge.solution.explanation && !Object.keys(challenge.solution.code).length ? <p className="muted">No reference solution written yet.</p> : null}
                  {challenge.complexity ? (
                    <>
                      <h2>Complexity</h2>
                      <Markdown>{challenge.complexity}</Markdown>
                    </>
                  ) : null}
                  {challenge.mistakes ? (
                    <>
                      <h2>Common mistakes</h2>
                      <Markdown>{challenge.mistakes}</Markdown>
                    </>
                  ) : null}
                </>
              ) : (
                <div className="locked">
                  <p>The solution unlocks after a real attempt — run your code at least once — or you can give up and study it.</p>
                  <button type="button" className="btn btn-warn" onClick={handleGiveUp}>
                    {confirmGiveUp ? 'Confirm: give up and reveal' : 'Give up and reveal solution'}
                  </button>
                </div>
              )
            ) : null}
          </div>
        </section>

        <section className="practice-right" aria-label="Code and results">
          {challenge.languages.length > 1 ? (
            <div className="row lang-row" role="group" aria-label="Language">
              {challenge.languages.map((l) => (
                <button key={l} type="button" className={`btn btn-sm ${lang === l ? 'btn-primary' : ''}`} aria-pressed={lang === l} onClick={() => switchLanguage(l)}>
                  {l}
                </button>
              ))}
            </div>
          ) : null}

          <CodeEditor language={lang} value={code} onChange={setCode} onRun={runner ? handleRun : undefined} label={`Code editor, ${lang}`} />

          {!runner && challenge.runner !== 'none' ? (
            <p className="banner banner-warn" role="note">
              The {challenge.runner} runner {remoteRunnerUrl() ? 'isn\'t available in this build yet (a self-hosted runner URL is configured but remote execution is not implemented)' : 'hasn\'t loaded in this build yet'}.
              You can still read, take hints, draft code (autosaved) and self-grade below.
            </p>
          ) : null}

          {runner ? (
            <div className="row run-row">
              <button type="button" className="btn btn-primary" onClick={handleRun} disabled={running} data-testid="practice-run">
                {running ? 'Running…' : 'Run visible tests'}
              </button>
              <button type="button" className="btn btn-accent" onClick={handleSubmit} disabled={running} data-testid="practice-submit">
                Submit all tests
              </button>
              <button type="button" className="btn btn-sm" onClick={handleReset}>
                {confirmReset ? 'Confirm reset' : 'Reset'}
              </button>
              <span className="muted small">
                <kbd>Ctrl/⌘</kbd>+<kbd>Enter</kbd> runs
              </span>
            </div>
          ) : (
            <div className="row run-row">
              <button type="button" className="btn" onClick={handleReset}>
                {confirmReset ? 'Confirm reset' : 'Reset to starter'}
              </button>
              {thinkAndCheck && !solved ? (
                <>
                  <button
                    type="button"
                    className="btn btn-good"
                    onClick={() => {
                      practice.recordAttempt(challenge.id);
                      practice.recordSolve(challenge.id);
                    }}
                  >
                    <IconCheck /> I solved it
                  </button>
                  <button type="button" className="btn" onClick={() => practice.recordAttempt(challenge.id)}>
                    Keep trying
                  </button>
                </>
              ) : null}
            </div>
          )}

          {runner ? (
            <>
              <PracticeResults submission={submission} running={running} />
              <PracticeCoach challenge={challenge} code={code} language={lang} submission={submission} />
              {failedSubmit && !running ? (
                cardQueued ? (
                  <p className="muted small">
                    Pattern card queued — <Link to="/flashcards">review it</Link>.
                  </p>
                ) : (
                  <button type="button" className="btn btn-sm" onClick={addCard}>
                    Add pattern card to flashcards
                  </button>
                )
              ) : null}
            </>
          ) : (
            <>
              <div className="results">
                <p className="muted small">
                  Think &amp; check mode: work in the editor (or your own IDE), compare with the reference solution, then grade yourself honestly.
                </p>
              </div>
              <PracticeCoach challenge={challenge} code={code} language={lang} submission={submission} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default PracticeWorkspacePage;
