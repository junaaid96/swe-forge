import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../lib/content';
import { useProgress } from '../lib/progress';
import { usePractice } from '../lib/practiceStore';
import { exportAll, importAll, resetAll } from '../lib/dataTransfer';
import { allStats, dueCount, groupMastery, overall, suggestions, type TopicStats } from '../lib/stats';
import { evaluateBadges } from '../lib/badges';
import { pathProgress } from '../lib/paths';
import { RadarChart } from '../components/RadarChart';
import { ShareCard } from '../components/ShareCard';
import { Bar, Ring } from '../components/Ring';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageFallback } from '../components/Layout';
import { IconArrowRight } from '../components/Icons';

function level(s: TopicStats) {
  if (!s.started) return { key: 'none', label: 'Not started' };
  if (s.mastery >= 75) return { key: 'strong', label: 'Strong' };
  if (s.mastery >= 40) return { key: 'practising', label: 'Practising' };
  return { key: 'learning', label: 'Learning' };
}

export function SkillMapPage() {
  const { data: catalog } = useCatalog();
  const state = useProgress();
  const practiceState = usePractice();
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.title = 'Skill map · Forgeline';
  }, []);
  const stats = useMemo(() => (catalog ? allStats(catalog, state, practiceState) : null), [catalog, state, practiceState]);
  const totals = useMemo(() => (catalog ? overall(catalog, state, practiceState) : null), [catalog, state, practiceState]);
  const radar = useMemo(() => (catalog && stats ? groupMastery(catalog, stats) : []), [catalog, stats]);
  const next = useMemo(() => (catalog ? suggestions(catalog, state, 4, practiceState) : []), [catalog, state, practiceState]);
  const pathRows = useMemo(
    () => (catalog?.paths ?? []).map((p) => ({ path: p, prog: pathProgress(p, state, practiceState) })),
    [catalog, state, practiceState],
  );
  const badges = useMemo(
    () =>
      catalog && stats
        ? evaluateBadges({ catalog, state, practice: practiceState, stats, pathsDone: pathRows.filter((r) => r.prog.pct === 100).length })
        : [],
    [catalog, stats, state, practiceState, pathRows],
  );
  if (!catalog || !stats || !totals) return <PageFallback />;

  const mockCount = state.mocks.length;
  const mockAvg = mockCount
    ? Math.round((state.mocks.reduce((a, m) => a + (m.answers.length ? m.answers.reduce((x, y) => x + y.score, 0) / m.answers.length : 0), 0) / mockCount) * 100)
    : null;

  const download = () => {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `forgeline-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Dashboard</p>
        <h1>Skill map</h1>
        <p className="lead">Mastery per area blends pages read, flashcards mastered, quiz and mock-interview scores — plus Practice Lab solves where a topic has challenges.</p>
      </header>

      <div className="skills-top">
        <section className="card pad radar-card" aria-labelledby="radar-h">
          <h2 id="radar-h">Areas at a glance</h2>
          <RadarChart data={radar.map((r) => ({ label: r.label.replace(/ & .*/, '').replace(/,.*/, ''), value: r.value }))} />
          <table className="sr-only">
            <caption>Mastery by area</caption>
            <tbody>
              {radar.map((r) => (
                <tr key={r.id}>
                  <th>{r.label}</th>
                  <td>{r.value}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="skills-side">
          <section className="card pad overall">
            <Ring value={totals.mastery} size={96} stroke={9} label={`Overall mastery ${totals.mastery}%`} />
            <dl>
              <div>
                <dt>Pages read</dt>
                <dd>
                  {totals.read}/{totals.total}
                </dd>
              </div>
              <div>
                <dt>Cards mastered</dt>
                <dd>{totals.mastered}</dd>
              </div>
              <div>
                <dt>Due today</dt>
                <dd>{dueCount(state)}</dd>
              </div>
              <div>
                <dt>Mock avg</dt>
                <dd>{mockAvg === null ? '—' : `${mockAvg}%`}</dd>
              </div>
            </dl>
          </section>
          <section className="card pad" aria-labelledby="next-h">
            <h2 id="next-h">What to study next</h2>
            <ol className="suggest-list">
              {next.map((s) => (
                <li key={s.url}>
                  <Link to={s.url}>
                    <strong>{s.title}</strong>
                    <small>{s.reason}</small>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <section aria-labelledby="road-h" className="roadmap">
        <div className="row-between">
          <h2 id="road-h">Roadmap</h2>
          <div className="legend" aria-label="Legend">
            <span className="lv lv-none">Not started</span>
            <span className="lv lv-learning">Learning</span>
            <span className="lv lv-practising">Practising</span>
            <span className="lv lv-strong">Strong</span>
          </div>
        </div>
        <ol className="road">
          {catalog.groups.map((g, gi) => {
            const gm = radar.find((r) => r.id === g.id)?.value ?? 0;
            return (
              <li key={g.id} className="road-stage">
                <div className="road-stage-head">
                  <span className="road-num">{gi + 1}</span>
                  <div>
                    <strong>{g.label}</strong>
                    <small className="muted">{g.hint}</small>
                  </div>
                  <span className="road-pct">{gm}%</span>
                </div>
                <div className="road-topics">
                  {g.topics.map((slug) => {
                    const t = catalog.topics.find((x) => x.slug === slug);
                    const s = stats.get(slug);
                    if (!t || !s) return null;
                    const lv = level(s);
                    return (
                      <Link key={slug} to={`/topics/${slug}`} className={`skill-tile lv-${lv.key}`} style={{ ['--topic' as string]: t.accent }} aria-label={`${t.title}: ${lv.label}, ${s.mastery}% mastery`}>
                        <span className="skill-head">
                          <span aria-hidden>{t.emoji}</span>
                          <strong>{t.title}</strong>
                          <span className="skill-pct">{s.mastery}%</span>
                        </span>
                        <span className="skill-bars">
                          <span>
                            <small>Read {s.pagesRead}/{s.pagesTotal}</small>
                            <Bar value={s.readPct} color={t.accent} />
                          </span>
                          <span>
                            <small>Cards {s.cardsMastered} mastered</small>
                            <Bar value={s.cardPct} color={t.accent} />
                          </span>
                          <span>
                            <small>Tests {s.mockPct ?? s.quizPct ?? '—'}{s.mockPct !== null || s.quizPct !== null ? '%' : ''}</small>
                            <Bar value={s.mockPct ?? s.quizPct ?? 0} color={t.accent} />
                          </span>
                          {s.practiceTotal ? (
                            <span>
                              <small>
                                Solved {s.practiceSolved}/{s.practiceTotal}
                              </small>
                              <Bar value={s.practicePct} color={t.accent} />
                            </span>
                          ) : null}
                        </span>
                        <span className="skill-level">
                          {lv.label} <IconArrowRight width={12} height={12} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {pathRows.length ? (
        <section aria-labelledby="paths-h" className="roadmap" data-testid="skills-paths">
          <div className="row-between">
            <h2 id="paths-h">Learning paths</h2>
            <Link to="/paths" className="small">
              All paths →
            </Link>
          </div>
          <div className="topic-grid">
            {pathRows.map(({ path, prog }) => (
              <Link key={path.slug} to={`/paths/${path.slug}`} className="topic-card card" style={{ ['--topic' as string]: path.accent }}>
                <div className="topic-card-head">
                  <span className="topic-emoji" aria-hidden>
                    {path.emoji}
                  </span>
                  <div>
                    <strong>{path.title}</strong>
                    <small>
                      {prog.done}/{prog.total} steps
                    </small>
                  </div>
                  {prog.pct ? <span className="topic-pct">{prog.pct}%</span> : null}
                </div>
                <Bar value={prog.pct} color={path.accent} label={`${path.title}: ${prog.pct}% complete`} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card pad" aria-labelledby="badges-h" data-testid="badges">
        <h2 id="badges-h">
          Badges · {badges.filter((b) => b.earned).length}/{badges.length}
        </h2>
        <ul className="badge-grid">
          {badges.map(({ rule, earned }) => (
            <li key={rule.id} className={`badge-item ${earned ? 'earned' : 'locked'}`} aria-label={`${rule.title}: ${earned ? 'earned' : 'locked'}`}>
              <span className="badge-emoji" aria-hidden>
                {rule.emoji}
              </span>
              <strong>{rule.title}</strong>
              <small>{rule.blurb}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="card pad" aria-labelledby="share-h">
        <h2 id="share-h">Share card</h2>
        <p className="muted small">Render your progress as a PNG and download it. Nothing is uploaded anywhere.</p>
        <ShareCard
          stats={{
            name: '',
            streak: state.streak,
            pagesRead: totals.read,
            pagesTotal: totals.total,
            mastered: totals.mastered,
            mockAvg,
            pathsDone: pathRows.filter((r) => r.prog.pct === 100).length,
            radar: radar.map((r) => ({ label: r.label.replace(/ & .*/, '').replace(/,.*/, ''), value: r.value })),
          }}
        />
      </section>

      <section className="card pad data-tools" aria-labelledby="data-h">
        <h2 id="data-h">Your data</h2>
        <p className="muted small">Progress lives only in this browser (localStorage). Export it to back up or move to another device.</p>
        <div className="row">
          <button type="button" className="btn" onClick={download} data-testid="export-btn">
            Export progress
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()} data-testid="import-btn">
            Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            data-testid="import-file"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                importAll(await f.text());
                setMsg('Progress imported.');
              } catch (err) {
                setMsg(err instanceof Error ? err.message : 'Import failed');
              }
              e.target.value = '';
            }}
          />
          <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
            Reset progress
          </button>
          {msg ? <span role="status" data-testid="transfer-msg">{msg}</span> : null}
        </div>
      </section>

      <ConfirmDialog
        open={confirm}
        title="Reset all progress?"
        message="This clears pages read, bookmarks, flashcard schedules, quiz scores, mock history, Practice Lab progress, study plan and daily challenge state in this browser. Export first if you might want it back."
        confirmLabel="Reset everything"
        cancelLabel="Keep my progress"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          resetAll();
          setConfirm(false);
        }}
      />
    </div>
  );
}

export default SkillMapPage;
