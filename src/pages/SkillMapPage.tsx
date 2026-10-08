import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '../lib/content';
import { progress, useProgress } from '../lib/progress';
import { allStats, dueCount, groupMastery, overall, suggestions, type TopicStats } from '../lib/stats';
import { RadarChart } from '../components/RadarChart';
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
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.title = 'Skill map · Forgeline';
  }, []);
  const stats = useMemo(() => (catalog ? allStats(catalog, state) : null), [catalog, state]);
  const totals = useMemo(() => (catalog ? overall(catalog, state) : null), [catalog, state]);
  const radar = useMemo(() => (catalog && stats ? groupMastery(catalog, stats) : []), [catalog, stats]);
  const next = useMemo(() => (catalog ? suggestions(catalog, state, 4) : []), [catalog, state]);
  if (!catalog || !stats || !totals) return <PageFallback />;

  const mockCount = state.mocks.length;
  const mockAvg = mockCount
    ? Math.round((state.mocks.reduce((a, m) => a + (m.answers.length ? m.answers.reduce((x, y) => x + y.score, 0) / m.answers.length : 0), 0) / mockCount) * 100)
    : null;

  const download = () => {
    const blob = new Blob([progress.exportJson()], { type: 'application/json' });
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
        <p className="lead">Mastery per area blends pages read (45%), flashcards mastered (30%) and quiz and mock-interview scores (25%).</p>
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

      <section className="card pad data-tools" aria-labelledby="data-h">
        <h2 id="data-h">Your data</h2>
        <p className="muted small">Progress lives only in this browser (localStorage). Export it to back up or move to another device.</p>
        <div className="row">
          <button type="button" className="btn" onClick={download}>
            Export progress
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                progress.importJson(await f.text());
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
          {msg ? <span role="status">{msg}</span> : null}
        </div>
      </section>

      <ConfirmDialog
        open={confirm}
        title="Reset all progress?"
        message="This clears pages read, bookmarks, flashcard schedules, quiz scores and mock history in this browser. Export first if you might want it back."
        confirmLabel="Reset everything"
        cancelLabel="Keep my progress"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          progress.reset();
          setConfirm(false);
        }}
      />
    </div>
  );
}

export default SkillMapPage;
