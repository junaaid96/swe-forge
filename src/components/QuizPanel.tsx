import { useState } from 'react';
import type { QuizQuestion } from '../lib/types';
import { progress, useProgress } from '../lib/progress';

export function QuizPanel({ slug, questions }: { slug: string; questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const state = useProgress();
  const best = state.quiz[slug];
  const correct = questions.filter((q) => answers[q.id] === q.correctIndex).length;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="quiz">
      <p className="muted small">
        {questions.length} questions{best ? ` · best ${best.best}/${best.total || questions.length} · ${best.attempts} attempt${best.attempts === 1 ? '' : 's'}` : ''}
      </p>
      <ol className="quiz-list">
        {questions.map((q, qi) => {
          const chosen = answers[q.id];
          return (
            <li key={q.id} className="quiz-q">
              <fieldset disabled={submitted}>
                <legend>
                  <span className="quiz-n">{qi + 1}.</span> {q.question}
                </legend>
                <div className="options">
                  {q.options.map((opt, i) => {
                    const state = submitted ? (i === q.correctIndex ? 'correct' : i === chosen ? 'wrong' : '') : chosen === i ? 'chosen' : '';
                    return (
                      <label key={i} className={`option ${state}`}>
                        <input type="radio" name={`${slug}-${q.id}`} checked={chosen === i} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
                {submitted ? <p className="explain">{q.explanation}</p> : null}
              </fieldset>
            </li>
          );
        })}
      </ol>
      <div className="row">
        {!submitted ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!allAnswered}
            onClick={() => {
              setSubmitted(true);
              progress.recordQuiz(slug, correct, questions.length);
            }}
          >
            {allAnswered ? 'Check answers' : `Answer all ${questions.length} to check`}
          </button>
        ) : (
          <>
            <strong className={correct === questions.length ? 'good' : ''} role="status">
              You scored {correct}/{questions.length}
            </strong>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
