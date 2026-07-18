import { useEffect, useState } from 'react';
import type { Topic, TopicSummary } from '../data/types';
import { fetchTopic, fetchTopicSummaries } from '../services/api';

export function useTopicSummaries() {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchTopicSummaries()
      .then((data) => {
        if (!alive) return;
        setTopics(data);
        setError(null);
      })
      .catch(() => {
        if (!alive) return;
        setError('Could not load topics');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { topics, loading, error };
}

export function useTopic(slug: string) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setTopic(null);
    fetchTopic(slug)
      .then((data) => {
        if (!alive) return;
        setTopic(data);
        setError(data ? null : 'Topic not found');
      })
      .catch(() => {
        if (!alive) return;
        setError('Could not load topic');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  return { topic, loading, error };
}
