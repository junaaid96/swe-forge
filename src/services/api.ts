import fallbackTopics from '../data/topics.fallback.json';
import type {
  DeepTrack,
  DeepTrackContent,
  InterviewLevel,
  InterviewLevelContent,
  SearchResult,
  TopicDetail,
  TopicSummary,
} from '../data/types';

let summaryCache: TopicSummary[] | null = null;
const topicCache = new Map<string, TopicDetail>();
const interviewCache = new Map<string, InterviewLevelContent>();
const deepCache = new Map<string, DeepTrackContent>();

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function fallbackSummaries(): TopicSummary[] {
  return (fallbackTopics as TopicSummary[]).slice().sort((a, b) => a.order - b.order);
}

export async function fetchTopicSummaries(): Promise<TopicSummary[]> {
  if (summaryCache) return summaryCache;
  const data = await apiGet<{ topics: TopicSummary[] }>('/api/topics');
  if (data?.topics?.length) {
    summaryCache = data.topics;
    return summaryCache;
  }
  summaryCache = fallbackSummaries();
  return summaryCache;
}

export async function fetchTopic(slug: string): Promise<TopicDetail | null> {
  const cached = topicCache.get(slug);
  if (cached) return cached;

  const data = await apiGet<{ topic: TopicDetail }>(`/api/topics/${slug}`);
  if (data?.topic) {
    topicCache.set(slug, data.topic);
    return data.topic;
  }

  const local = fallbackSummaries().find((t) => t.slug === slug);
  if (!local) return null;
  const detail: TopicDetail = { ...local, quiz: [], problems: [] };
  topicCache.set(slug, detail);
  return detail;
}

export async function fetchInterviewLevel(
  slug: string,
  level: InterviewLevel,
): Promise<InterviewLevelContent | null> {
  const key = `${slug}:${level}`;
  const cached = interviewCache.get(key);
  if (cached) return cached;

  const data = await apiGet<{ interview: InterviewLevelContent }>(
    `/api/topics/${slug}/interview/${level}`,
  );
  if (data?.interview) {
    interviewCache.set(key, data.interview);
    return data.interview;
  }
  return null;
}

export async function fetchDeepTrack(
  slug: string,
  track: DeepTrack,
): Promise<DeepTrackContent | null> {
  const key = `${slug}:${track}`;
  const cached = deepCache.get(key);
  if (cached) return cached;

  const data = await apiGet<{ deep: DeepTrackContent }>(`/api/topics/${slug}/deep/${track}`);
  if (data?.deep) {
    deepCache.set(key, data.deep);
    return data.deep;
  }
  return null;
}

export async function searchContent(q: string): Promise<SearchResult> {
  if (!q.trim()) return { topics: [], interview: [], deep: [] };
  const data = await apiGet<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`);
  if (data) return data;

  const needle = q.toLowerCase();
  return {
    topics: fallbackSummaries().filter((t) =>
      `${t.title} ${t.tag} ${t.slug}`.toLowerCase().includes(needle),
    ),
    interview: [],
    deep: [],
  };
}

/** Used by progress store for scoring when API meta not loaded */
export function getFallbackTopicSummaries(): TopicSummary[] {
  return fallbackSummaries();
}

export function clearApiCaches() {
  summaryCache = null;
  topicCache.clear();
  interviewCache.clear();
  deepCache.clear();
}
