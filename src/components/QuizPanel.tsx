import { useMemo, useState } from 'react';
import type { QuizQuestion } from '../data/types';
import { QUIZ_POINTS_PER_QUESTION } from '../data/categories';
import { progressStore } from '../store/progress';

interface QuizPanelProps {
  slug: string;
  questions: QuizQuestion[];
}

export function QuizPanel({ slug, questions }: QuizPanelProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Array<number | null>>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);
  const [bestSaved, setBestSaved] = useState(0);

  const q = questions[index];
  const letters = useMemo(() => ['A', 'B', 'C', 'D', 'E'], []);

  function reset() {
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setAnswers(questions.map(() => null));
    setFinished(false);
    setBestSaved(0);
  }

  function check() {
    if (selected === null) return;
    setRevealed(true);
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = selected;
      return next;
    });
  }

  function next() {
    if (index + 1 >= questions.length) {
      const finalAnswers = [...answers];
      if (selected !== null) finalAnswers[index] = selected;
      const correctCount = questions.reduce((n, question, i) => {
        return n + (finalAnswers[i] === question.correctIndex ? 1 : 0);
      }, 0);
      const points = progressStore.recordQuiz(slug, correctCount, questions.length);
      setAnswers(finalAnswers);
      setBestSaved(points);
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  }

  if (!questions.length) {
    return <div className="empty-state">Quiz coming soon for this topic.</div>;
  }

  if (finished) {
    const correctCount = questions.reduce((n, question, i) => {
      return n + (answers[i] === question.correctIndex ? 1 : 0);
    }, 0);
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="quiz-shell">
        <div className="result-banner">
          <h3>
            {pct >= 80 ? 'Strong work' : pct >= 50 ? 'Solid attempt' : 'Keep drilling'} — {correctCount}/
            {questions.length} correct ({pct}%)
          </h3>
          <p>
            This attempt: {correctCount * QUIZ_POINTS_PER_QUESTION} points. Best quiz score saved for this
            topic: <strong>{bestSaved}</strong>.
          </p>
        </div>
        <div className="row-actions">
          <button type="button" className="primary-btn" onClick={reset}>
            Retake quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-meta">
        <div>
          <strong>
            Question {index + 1} / {questions.length}
          </strong>
          <div className="muted" style={{ fontSize: '0.85rem' }}>
            {QUIZ_POINTS_PER_QUESTION} points each · best attempt kept
          </div>
        </div>
        <div className="progress-bar" style={{ width: 160 }}>
          <span style={{ width: `${((index + (revealed ? 1 : 0)) / questions.length) * 100}%` }} />
        </div>
      </div>

      <h3 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: '1.25rem' }}>{q.question}</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {q.options.map((opt, i) => {
          let cls = 'option';
          if (selected === i) cls += ' selected';
          if (revealed && i === q.correctIndex) cls += ' correct';
          if (revealed && selected === i && i !== q.correctIndex) cls += ' wrong';
          return (
            <button
              key={`${q.id}-${i}`}
              type="button"
              className={cls}
              disabled={revealed}
              onClick={() => setSelected(i)}
            >
              <span className="marker">{letters[i]}</span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {revealed ? (
        <div className="explain">
          <strong>{selected === q.correctIndex ? 'Correct. ' : 'Not quite. '}</strong>
          {q.explanation}
        </div>
      ) : null}

      <div className="row-actions">
        {!revealed ? (
          <button type="button" className="primary-btn" disabled={selected === null} onClick={check}>
            Check answer
          </button>
        ) : (
          <button type="button" className="primary-btn" onClick={next}>
            {index + 1 >= questions.length ? 'See results' : 'Next question'}
          </button>
        )}
      </div>
    </div>
  );
}
