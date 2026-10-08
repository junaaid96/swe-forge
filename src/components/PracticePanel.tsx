import { useState } from 'react';
import type { PracticeProblem } from '../lib/types';
import { progress, useProgress } from '../lib/progress';

export function PracticePanel({ slug, problems }: { slug: string; problems: PracticeProblem[] }) {
  const state = useProgress();
  const solved = state.problems[slug] ?? [];
  const [hints, setHints] = useState<Record<string, number>>({});
  const [solution, setSolution] = useState<Record<string, boolean>>({});
  return (
    <div className="problems">
      {problems.map((p) => {
        const h = hints[p.id] ?? 0;
        const done = solved.includes(p.id);
        return (
          <article key={p.id} className={`problem ${done ? 'done' : ''}`}>
            <header>
              <h3>{p.title}</h3>
              <span className={`chip diff-${p.difficulty}`}>{p.difficulty}</span>
            </header>
            <p>{p.prompt}</p>
            {h > 0 ? (
              <ul className="hints">
                {p.hints.slice(0, h).map((x) => (
                  <li key={x}>💡 {x}</li>
                ))}
              </ul>
            ) : null}
            {solution[p.id] ? (
              <p className="explain">
                <strong>Solution: </strong>
                {p.solution}
              </p>
            ) : null}
            <div className="row">
              {h < p.hints.length ? (
                <button type="button" className="btn btn-sm" onClick={() => setHints((s) => ({ ...s, [p.id]: h + 1 }))}>
                  Hint {h + 1}/{p.hints.length}
                </button>
              ) : null}
              <button type="button" className="btn btn-sm" onClick={() => setSolution((s) => ({ ...s, [p.id]: !s[p.id] }))} aria-expanded={Boolean(solution[p.id])}>
                {solution[p.id] ? 'Hide solution' : 'Reveal solution'}
              </button>
              <button type="button" className={`btn btn-sm ${done ? 'btn-good' : 'btn-primary'}`} onClick={() => progress.toggleProblem(slug, p.id)} aria-pressed={done}>
                {done ? 'Solved ✓' : 'Mark solved'}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
