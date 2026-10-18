import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { urls, useCatalog, useResource } from '../lib/content';
import { useProgress } from '../lib/progress';
import { usePractice } from '../lib/practiceStore';
import {
  DEFAULT_INPUTS,
  autoDone,
  behindDays,
  generatePlan,
  itemDone,
  planStats,
  planToIcs,
  replan,
  studyPlan,
  useStudyPlan,
  type PlanInputs,
} from '../lib/studyPlan';
import type { PracticeIndex } from '../lib/types';
import { Bar } from '../components/Ring';
import { IconCheck } from '../components/Icons';
import { PageFallback } from '../components/Layout';

const KIND_LABEL = { page: 'Read', practice: 'Solve', quiz: 'Quiz', review: 'Review' } as const;

export function StudyPlanPage() {
  const { data: catalog, loading } = useCatalog();
  const { data: index } = useResource<PracticeIndex>(urls.practice);
  const state = useProgress();
  const practice = usePractice();
  const plan = useStudyPlan();
  const [inputs, setInputs] = useState<PlanInputs>({ ...DEFAULT_INPUTS });

  useEffect(() => {
    document.title = 'Study plan · Forgeline';
  }, []);
  useEffect(() => {
    if (plan.createdAt) setInputs({ ...plan.inputs });
  }, [plan.createdAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !catalog) return <PageFallback />;
  if (!catalog) return <p className="empty-state">Could not load the content catalog.</p>;

  const hasPlan = plan.days.length > 0;
  const stats = planStats(plan, state, practice);
  const behind = behindDays(plan, state, practice);
  const set = <K extends keyof PlanInputs>(k: K, v: PlanInputs[K]) => setInputs((p) => ({ ...p, [k]: v }));
  const toggleTopic = (slug: string) =>
    set('focusTopics', inputs.focusTopics.includes(slug) ? inputs.focusTopics.filter((x) => x !== slug) : [...inputs.focusTopics, slug]);

  const downloadIcs = () => {
    const blob = new Blob([planToIcs(plan)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'forgeline-study-plan.ics';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page" data-testid="plan-page">
      <header className="page-head">
        <p className="eyebrow">Schedule</p>
        <h1>Study plan</h1>
        <p className="lead">A day-by-day checklist built from your weakest areas. Everything stays in this browser, including the calendar export.</p>
      </header>

      <section className="card pad" aria-labelledby="plan-form-h" data-testid="plan-form">
        <h2 id="plan-form-h">Make a plan</h2>
        <div className="field-row">
          <label className="field">
            <span className="field-label">Days available</span>
            <input type="number" min={1} max={60} value={inputs.daysAvailable} onChange={(e) => set('daysAvailable', Number(e.target.value))} aria-label="Days available" />
          </label>
          <label className="field">
            <span className="field-label">Hours per day</span>
            <input type="number" min={0.5} max={8} step={0.5} value={inputs.hoursPerDay} onChange={(e) => set('hoursPerDay', Number(e.target.value))} aria-label="Hours per day" />
          </label>
          <label className="field">
            <span className="field-label">Interview date (optional)</span>
            <input type="date" value={inputs.interviewDate} onChange={(e) => set('interviewDate', e.target.value)} aria-label="Interview date" />
          </label>
        </div>
        <div className="field">
          <span className="field-label">Focus topics {inputs.focusTopics.length ? `(${inputs.focusTopics.length})` : '(all, weakest first)'}</span>
          <div className="chips">
            {catalog.topics.map((t) => {
              const on = inputs.focusTopics.includes(t.slug);
              return (
                <button key={t.slug} type="button" className={`chip chip-toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleTopic(t.slug)}>
                  {t.emoji} {t.title}
                </button>
              );
            })}
          </div>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn-primary"
            data-testid="plan-generate"
            onClick={() => studyPlan.save(generatePlan(catalog, state, practice, index?.challenges, inputs))}
          >
            {hasPlan ? 'Regenerate plan' : 'Generate plan'}
          </button>
          {hasPlan ? (
            <>
              <button type="button" className="btn" data-testid="plan-export" onClick={downloadIcs}>
                Export .ics
              </button>
              <button type="button" className="btn btn-danger" onClick={() => studyPlan.clear()}>
                Clear plan
              </button>
            </>
          ) : null}
        </div>
      </section>

      {hasPlan ? (
        <section className="plan-schedule" aria-labelledby="schedule-h" data-testid="plan-schedule">
          <div className="group-head">
            <h2 id="schedule-h">Your schedule</h2>
            <span className="muted small">
              {stats.done}/{stats.total} done
            </span>
          </div>
          <Bar value={stats.pct} label={`Study plan: ${stats.pct}% done`} />
          {behind ? (
            <p className="banner banner-warn" role="note">
              You are behind on {behind} day{behind === 1 ? '' : 's'}.{' '}
              <button type="button" className="btn btn-sm" data-testid="plan-replan" onClick={() => studyPlan.save(replan(plan, state, practice))}>
                Re-plan from today
              </button>
            </p>
          ) : null}
          <ol className="plan-days">
            {plan.days.map((d, i) => {
              const dayDone = d.items.filter((it) => itemDone(it, state, practice, plan.checks)).length;
              return (
                <li key={d.date} className="card pad plan-day" data-testid="plan-day">
                  <div className="group-head">
                    <h3>
                      Day {i + 1} · {d.date}
                    </h3>
                    <span className="muted small">
                      {dayDone}/{d.items.length}
                    </span>
                  </div>
                  <ul className="plan-items">
                    {d.items.map((it) => {
                      const done = itemDone(it, state, practice, plan.checks);
                      const automatic = autoDone(it, state, practice);
                      return (
                        <li key={it.id} className={done ? 'done' : ''}>
                          <label>
                            <input type="checkbox" checked={done} disabled={automatic} onChange={() => studyPlan.toggleCheck(it.id)} aria-label={it.label} />
                            <Link to={it.url}>{it.label}</Link>
                          </label>
                          <span className="muted small">
                            {KIND_LABEL[it.kind]} · {it.minutes}m{automatic ? ' · auto' : ''}
                          </span>
                          {done ? <IconCheck width={12} height={12} aria-hidden /> : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

export default StudyPlanPage;
