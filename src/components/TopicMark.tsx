/** Topic mark: vendored brand SVG when available, emoji fallback otherwise. */
import { useState } from 'react';

interface Mark {
  logo?: string;
  logoDark?: string;
  emoji: string;
  title: string;
}

const slugOf = (src: string) => src.split('/').pop()?.replace(/\.svg$/, '') ?? '';

export function TopicMark({ topic }: { topic: Mark }) {
  const [failed, setFailed] = useState(false);
  if (!topic.logo || failed) return <span aria-hidden>{topic.emoji}</span>;
  const slug = slugOf(topic.logo);
  return (
    <>
      <img
        src={topic.logo}
        alt=""
        aria-hidden
        data-logo={slug}
        className={`topic-logo topic-logo-light${topic.logoDark ? ' has-dark' : ''}`}
        draggable={false}
        onError={() => setFailed(true)}
        title={`${topic.title} logo`}
      />
      {topic.logoDark ? (
        <img
          src={topic.logoDark}
          alt=""
          aria-hidden
          data-logo={slug}
          className="topic-logo topic-logo-dark"
          draggable={false}
          onError={() => setFailed(true)}
          title={`${topic.title} logo`}
        />
      ) : null}
    </>
  );
}
