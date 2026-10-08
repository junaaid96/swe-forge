import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatMinutes, useCatalog } from '../lib/content';
import { useProgress } from '../lib/progress';
import { allStats, dueCount, overall, suggestions } from '../lib/stats';
import { Bar, Ring } from '../components/Ring';
import { IconArrowRight, IconCards, IconFlame, IconMap, IconRadar, IconTimer } from '../components/Icons';
import { PageFallback } from '../components/Layout';
import { dayKey } from '../lib/srs';

export function HomePage() {
  const { data: catalog, error } = useCatalog();
  const state = useProgress();
  useEffect(() => {
    document.title = 'Forgeline · Software engineering study hub';
  }, []);
  const stats = useMemo(() => (catalog ? allStats(catalog, state) : null), [catalog, state]);
  const totals = useMemo(() => (catalog ? overall(catalog, state) : null), [catalog, state]);
  const next = useMemo(() => (catalog ? suggestions(catalog, state, 3) : []), [catalog, state]);

  if (error) return <p className="empty-state">Could not load the content catalog. Run <code>npm run content</code> and reload.</p>;
  if (!catalog || !stats || !totals) return <PageFallback />;
  const due = dueCount(state);
  const hours = Math.round(catalog.totals.minutes / 60);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <p className="eyebrow">Forgeline</p>
          <h1>Learn it. Drill it. Track it.</h1>
          <p className="lead">
            {catalog.totals.topics} topics, {catalog.totals.pages} pages and {catalog.totals.cards.toLocaleString()} auto-generated flashcards covering the software engineering
            interview stack, from DSA and system design to Spring Boot, React and DevOps.
          </p>
          <div className="row">
            {state.lastPage ? (
              <Link className="btn btn-primary btn-lg" to={state.lastPage.url}>
                Continue: {state.lastPage.title.length > 38 ? `${state.lastPage.title.slice(0, 36)}…` : state.lastPage.title} <IconArrowRight />
              </Link>
            ) : (
              <Link className="btn btn-primary btn-lg" to="/prep-map">
                Start with the prep map <IconArrowRight />
              </Link>
            )}
            <Link className="btn btn-lg" to="/mock">
              <IconTimer /> Mock interview
            </Link>
          </div>
          <dl className="hero-stats">
            <div>
              <dt>Topics</dt>
              <dd>{catalog.totals.topics}</dd>
            </div>
            <div>
              <dt>Pages</dt>
              <dd>{catalog.totals.pages}</dd>
            </div>
            <div>
              <dt>Reading</dt>
              <dd>~{hours}h</dd>
            </div>
            <div>
              <dt>Cards</dt>
              <dd>{catalog.totals.cards.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
        <div className="today card">
          <div className="today-head">
            <Ring value={totals.mastery} size={64} stroke={7} label={`Overall mastery ${totals.mastery}%`} />
            <div>
              <p className="eyebrow">Today</p>
              <p className="today-line">
                <IconFlame width={16} height={16} /> {state.streak}-day streak · {state.reviews[dayKey()] ?? 0} reviews
              </p>
              <p className="muted small">
                {totals.read}/{totals.total} pages read · {totals.mastered} cards mastered
              </p>
            </div>
          </div>
          <Link to="/flashcards" className={`today-due ${due ? 'has-due' : ''}`}>
            <IconCards />
            <span>{due ? `${due} card${due === 1 ? '' : 's'} due for review` : 'No reviews due · learn new cards'}</span>
            <IconArrowRight width={16} height={16} />
          </Link>
          <p className="eyebrow">What to study next</p>
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
        </div>
      </section>

      <section className="feature-row" aria-label="Practice tools">
        <Link to="/flashcards" className="feature card">
          <IconCards />
          <strong>Spaced-repetition flashcards</strong>
          <span>Cards built from every page, interview answer and MCQ, scheduled with SM-2.</span>
        </Link>
        <Link to="/mock" className="feature card">
          <IconTimer />
          <strong>Mock interview mode</strong>
          <span>Timed sessions across the topics you pick, with a score breakdown and weak areas.</span>
        </Link>
        <Link to="/skills" className="feature card">
          <IconRadar />
          <strong>Skill map</strong>
          <span>A radar and roadmap of every area showing what you've read, mastered and scored.</span>
        </Link>
        <Link to="/prep-map" className="feature card">
          <IconMap />
          <strong>Topic-wise prep map</strong>
          <span>The checklist of concepts to know for each area, linked to the full notes.</span>
        </Link>
      </section>

      {catalog.groups.map((g) => (
        <section key={g.id} className="group" aria-labelledby={`g-${g.id}`}>
          <div className="group-head">
            <h2 id={`g-${g.id}`}>{g.label}</h2>
            <span className="muted small">{g.hint}</span>
          </div>
          <div className="topic-grid">
            {g.topics.map((slug) => {
              const t = catalog.topics.find((x) => x.slug === slug);
              if (!t) return null;
              const s = stats.get(slug)!;
              return (
                <Link key={slug} to={`/topics/${slug}`} className="topic-card card" style={{ ['--topic' as string]: t.accent }}>
                  <div className="topic-card-head">
                    <span className="topic-emoji" aria-hidden>
                      {t.emoji}
                    </span>
                    <div>
                      <strong>{t.title}</strong>
                      <small>{t.tag}</small>
                    </div>
                    {s.mastery ? <span className="topic-pct">{s.mastery}%</span> : null}
                  </div>
                  <p>{t.blurb}</p>
                  <div className="topic-card-meta">
                    <span>{t.pages.length} pages</span>
                    <span>{formatMinutes(t.minutes)}</span>
                    {t.cardCount ? <span>{t.cardCount} cards</span> : null}
                  </div>
                  <Bar value={s.readPct} color={t.accent} label={`${t.title}: ${s.readPct}% read`} />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default HomePage;
