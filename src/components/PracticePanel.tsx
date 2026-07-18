import { useState } from 'react';
import type { PracticeProblem } from '../data/types';
import { progressStore } from '../store/progress';

interface PracticePanelProps {
  slug: string;
  problems: PracticeProblem[];
  solvedIds: string[];
}

export function PracticePanel({ slug, problems, solvedIds }: PracticePanelProps) {
  const [openHints, setOpenHints] = useState<Record<string, number>>({});
  const [showSolution, setShowSolution] = useState<Record<string, boolean>>({});

  if (!problems.length) {
    return <div className="empty-state">Practice problems coming soon.</div>;
  }

  return (
    <div className="problem-shell">
      <p className="muted" style={{ marginTop: 0 }}>
        Work the problem yourself first. Reveal hints one at a time, then the solution. Marking solved
        adds points once.
      </p>
      {problems.map((problem) => {
        const solved = solvedIds.includes(problem.id);
        const hintCount = openHints[problem.id] ?? 0;
        const solutionOpen = showSolution[problem.id] ?? false;

        return (
          <article key={problem.id} className="problem-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h3>
                {problem.title}{' '}
                <span className={`diff ${problem.difficulty}`}>{problem.difficulty}</span>
              </h3>
              <strong style={{ color: 'var(--brand-deep)' }}>+{problem.points} pts</strong>
            </div>
            <p style={{ margin: 0, lineHeight: 1.6 }}>{problem.prompt}</p>

            {hintCount > 0 ? (
              <div className="tip-list">
                {problem.hints.slice(0, hintCount).map((h) => (
                  <div key={h} className="tip" style={{ background: 'var(--accent-soft)', borderLeftColor: 'var(--accent)' }}>
                    <span>💡</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {solutionOpen ? (
              <div className="explain">
                <strong>Solution: </strong>
                {problem.solution}
              </div>
            ) : null}

            <div className="row-actions">
              {hintCount < problem.hints.length ? (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setOpenHints((s) => ({ ...s, [problem.id]: Math.min(problem.hints.length, hintCount + 1) }))
                  }
                >
                  Show hint ({hintCount}/{problem.hints.length})
                </button>
              ) : null}
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowSolution((s) => ({ ...s, [problem.id]: !solutionOpen }))}
              >
                {solutionOpen ? 'Hide solution' : 'Reveal solution'}
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={solved}
                onClick={() => progressStore.solveProblem(slug, problem.id)}
              >
                {solved ? 'Solved ✓' : 'Mark solved'}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
