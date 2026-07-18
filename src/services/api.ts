import fallbackCatalog from '../data/catalog.fallback.json';
import fallbackInterview from '../data/interview.fallback.json';
import type {
  InterviewSection,
  InterviewSectionMeta,
  SearchResult,
  Topic,
  TopicSummary,
} from '../data/types';

const topicCache = new Map<string, Topic>();
let summaryCache: TopicSummary[] | null = null;

function toSummary(topic: Topic): TopicSummary {
  return {
    id: topic.id,
    slug: topic.slug,
    order: topic.order,
    emoji: topic.emoji,
    title: topic.title,
    cat: topic.cat,
    tag: topic.tag,
    relatedSlugs: topic.relatedSlugs ?? [],
    quizCount: topic.quiz?.length ?? 0,
    problemCount: topic.problems?.length ?? 0,
    sectionCount: topic.sections?.length ?? 0,
  };
}

function fallbackTopics(): Topic[] {
  return (fallbackCatalog as Topic[]).slice().sort((a, b) => a.order - b.order);
}

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchTopicSummaries(): Promise<TopicSummary[]> {
  if (summaryCache) return summaryCache;
  const data = await apiGet<{ topics: TopicSummary[] }>('/api/topics');
  if (data?.topics?.length) {
    summaryCache = data.topics;
    return summaryCache;
  }
  summaryCache = fallbackTopics().map(toSummary);
  return summaryCache;
}

export async function fetchTopic(slug: string): Promise<Topic | null> {
  const cached = topicCache.get(slug);
  if (cached) return cached;

  const data = await apiGet<{ topic: Topic }>(`/api/topics/${slug}`);
  if (data?.topic) {
    topicCache.set(slug, data.topic);
    return data.topic;
  }

  const local = fallbackTopics().find((t) => t.slug === slug) ?? null;
  if (local) topicCache.set(slug, local);
  return local;
}

export async function fetchInterviewIndex(): Promise<InterviewSectionMeta[]> {
  const data = await apiGet<{ sections: InterviewSectionMeta[] }>('/api/interview');
  if (data?.sections?.length) return data.sections;
  return (fallbackInterview as InterviewSection[]).map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    itemCount: s.items.length,
  }));
}

export async function fetchInterviewSection(id: string): Promise<InterviewSection | null> {
  const data = await apiGet<{ section: InterviewSection }>(`/api/interview/${id}`);
  if (data?.section) return data.section;
  return (fallbackInterview as InterviewSection[]).find((s) => s.id === id) ?? null;
}

export async function searchContent(q: string): Promise<SearchResult> {
  if (!q.trim()) return { topics: [], interview: [] };
  const data = await apiGet<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`);
  if (data) return data;

  const needle = q.toLowerCase();
  const topics = fallbackTopics()
    .filter((t) => `${t.title} ${t.tag} ${t.slug}`.toLowerCase().includes(needle))
    .map(toSummary);
  const interview: SearchResult['interview'] = [];
  for (const section of fallbackInterview as InterviewSection[]) {
    for (const item of section.items) {
      if (`${item.title} ${item.body}`.toLowerCase().includes(needle)) {
        interview.push({
          sectionId: section.id,
          sectionTitle: section.title,
          itemId: item.id,
          title: item.title,
          learnSlug: item.learnSlug,
        });
      }
    }
  }
  return { topics, interview };
}

/** Sync helpers for progress store scoring */
export function getFallbackTopics(): Topic[] {
  return fallbackTopics();
}
