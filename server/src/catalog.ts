import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InterviewSection, Topic } from './types.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readJson<T>(relativePath: string): T {
  const raw = readFileSync(join(root, relativePath), 'utf8');
  return JSON.parse(raw) as T;
}

export const TOPICS: Topic[] = readJson<Topic[]>('data/topics/catalog.json').sort(
  (a, b) => a.order - b.order,
);

export const INTERVIEW_SECTIONS: InterviewSection[] = readJson<InterviewSection[]>(
  'data/interview/guide.json',
);

export function getTopic(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

export function getInterviewSection(id: string): InterviewSection | undefined {
  return INTERVIEW_SECTIONS.find((s) => s.id === id);
}

export function toTopicSummary(topic: Topic) {
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

export function searchAll(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { topics: [], interview: [] };

  const topics = TOPICS.filter((t) => {
    const hay = [
      t.title,
      t.tag,
      t.slug,
      ...t.sections.map((s) => `${s.h} ${s.b}`),
      ...t.tips,
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  }).map(toTopicSummary);

  const interview: Array<{
    sectionId: string;
    sectionTitle: string;
    itemId: string;
    title: string;
    learnSlug?: string;
  }> = [];

  for (const section of INTERVIEW_SECTIONS) {
    for (const item of section.items) {
      const hay = `${item.title} ${item.body} ${(item.tags ?? []).join(' ')}`.toLowerCase();
      if (hay.includes(q)) {
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
