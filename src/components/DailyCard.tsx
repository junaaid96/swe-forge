import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { urls, useResource } from '../lib/content';
import { useProgress } from '../lib/progress';
import { statusOf, usePractice } from '../lib/practiceStore';
import { daily, pickDaily, todayKey, useDaily, weakestTopic } from '../lib/daily';
import type { Catalog, PracticeIndex } from '../lib/types';
import { IconArrowRight, IconBolt, IconCheck } from './Icons';

/** Today's deterministic challenge, biased toward the weakest topic. */
export function DailyCard({ catalog }: { catalog: Catalog }) {
  const state = useProgress();
  const practice = usePractice();
  const day = useDaily();
  const { data: index, loading } = useResource<PracticeIndex>(urls.practice);
  const today = todayKey();
  const weak = weakestTopic(catalog, state, practice);
  const pick = pickDaily(today, weak, index?.challenges, day.skipped ? 1 : 0);

  useEffect(() => {
    if (loading) return;
    if (day.date !== today) {
      daily.setDay({ date: today, kind: pick.kind, topic: pick.topic, challengeId: pick.challenge?.id ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, day.date, today]);

  const topic = catalog.topics.find((t) => t.slug === (day.date === today ? day.topic : pick.topic));
  const challenge =
    day.date === today && day.kind === 'practice'
      ? (index?.challenges.find((c) => c.id === day.challengeId) ?? pick.challenge)
      : pick.challenge;
  const kind = day.date === today ? day.kind : pick.kind;
  const solved =
    kind === 'practice' && challenge ? ['solved', 'solved-hints'].includes(statusOf(practice.records[challenge.id])) : day.done;

  const skip = () => {
    if (day.skipped) return;
    const next = pickDaily(today, weak, index?.challenges, 1);
    daily.setDay({ date: today, kind: next.kind, topic: next.topic, challengeId: next.challenge?.id ?? '' }, true);
  };

  const url = kind === 'practice' && challenge ? challenge.url : `/flashcards?topic=${topic?.slug ?? weak}`;
  return (
    <section className="card pad daily-card" aria-labelledby="daily-h" data-testid="daily-card">
      <p className="eyebrow">
        <IconBolt width={12} height={12} /> Daily challenge
      </p>
      <h2 id="daily-h">{kind === 'practice' && challenge ? challenge.title : `Review ${topic?.title ?? 'weakest topic'}`}</h2>
      <p className="muted small">
        {topic?.emoji} {topic?.title} · weakest area
        {kind === 'practice' && challenge ? ` · ${challenge.difficulty} · ~${challenge.estimatedMinutes}m` : ' · flashcards + quiz'}
      </p>
      <div className="row">
        {solved ? (
          <span className="chip chip-good">
            <IconCheck width={12} height={12} /> Done today
          </span>
        ) : (
          <Link className="btn btn-primary" to={url}>
            {kind === 'practice' ? 'Solve it' : 'Start the set'} <IconArrowRight />
          </Link>
        )}
        {!day.skipped && !solved ? (
          <button type="button" className="btn btn-sm" onClick={skip} title="Swap today's challenge once">
            Skip once
          </button>
        ) : null}
        {kind === 'study' && !day.done ? (
          <button type="button" className="btn btn-sm" onClick={() => daily.markDone()}>
            Mark complete
          </button>
        ) : null}
      </div>
    </section>
  );
}
