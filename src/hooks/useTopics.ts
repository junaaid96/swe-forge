import { useEffect, useState } from 'react';
import { fetchTopic, fetchTopicSummaries } from '../services/api';
import type { TopicDetail, TopicSummary } from '../data/types';

export function useTopicSummaries() {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTopicSummaries()
      .then((list) => {
        if (!cancelled) {
          setTopics(list);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load topics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { topics, loading, error };
}

export function useTopic(slug: string | undefined) {
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(slug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    fetchTopic(slug)
      .then((t) => {
        if (!cancelled) {
          setTopic(t);
          setError(t ? null : 'Topic not found');
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load topic');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { topic, loading, error };
}
