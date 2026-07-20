import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import type {
  DeepSection,
  DeepTrack,
  DeepTrackContent,
  InterviewLevel,
  InterviewLevelContent,
  InterviewQA,
  TopicDetail,
  TopicMeta,
  TopicSummary,
} from './types.ts';
import {
  DEEP_TRACKS,
  INTERVIEW_LEVELS,
  deepTrackLabel,
  interviewLevelLabel,
  isDeepTrack,
  isInterviewLevel,
} from './types.ts';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(serverRoot, '..');
const CONTENT_ROOT = join(repoRoot, 'content');

interface Manifest {
  version: number;
  topics: Array<{
    id: string;
    slug: string;
    title: string;
    emoji: string;
    order: number;
    tag: string;
    accent: string;
  }>;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function listMdStem(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

function parseInterviewItems(markdown: string): InterviewQA[] {
  const items: InterviewQA[] = [];
  const parts = markdown.split(/\n(?=##\s+)/);
  let idx = 0;
  for (const part of parts) {
    const match = part.match(/^##\s+(.+?)\s*$/m);
    if (!match) continue;
    const qTitle = match[1].trim();
    const isQuestion =
      /^Q\d+\./i.test(qTitle) || qTitle.includes('?') || part.includes('**Answer:**');
    if (!isQuestion) continue;

    const answerMatch = part.match(
      /\*\*Answer:\*\*\s*([\s\S]*?)(?=\n\*\*(?:Example|Key takeaway|Interview tip):|\n---|\s*$)/i,
    );
    const exampleMatch = part.match(
      /\*\*Example:\*\*\s*([\s\S]*?)(?=\n\*\*(?:Key takeaway|Interview tip|Answer):|\n---|\s*$)/i,
    );
    const takeawayMatch = part.match(
      /\*\*Key takeaway:\*\*\s*([\s\S]*?)(?=\n\*\*(?:Interview tip|Answer|Example):|\n---|\s*$)/i,
    );
    const tipMatch = part.match(
      /\*\*Interview tip:\*\*\s*([\s\S]*?)(?=\n\*\*|---|\s*$)/i,
    );

    idx += 1;
    items.push({
      id: `q${idx}`,
      question: qTitle.replace(/^Q\d+\.\s*/i, ''),
      answer: (answerMatch?.[1] ?? '').trim(),
      example: exampleMatch?.[1]?.trim() || undefined,
      takeaway: takeawayMatch?.[1]?.trim() || undefined,
      tip: tipMatch?.[1]?.trim() || undefined,
    });
  }
  return items;
}

function parseDeepSections(markdown: string): DeepSection[] {
  const sections: DeepSection[] = [];
  const parts = markdown.split(/\n(?=##\s+)/);
  for (const part of parts) {
    const match = part.match(/^##\s+(.+?)\s*$/m);
    if (!match) continue;
    const h = match[1].trim();
    const body = part.replace(/^##\s+.+?\s*\n/, '').trim();
    // strip frontmatter leftovers if any
    if (h.startsWith('---')) continue;
    sections.push({ h, b: body });
  }
  return sections;
}

function loadTopicMeta(slug: string): TopicMeta {
  const metaPath = join(CONTENT_ROOT, slug, 'meta.json');
  const raw = readJson<TopicMeta>(metaPath);
  return {
    ...raw,
    relatedTopics: raw.relatedTopics ?? [],
    quiz: raw.quiz ?? [],
    problems: raw.problems ?? [],
  };
}

function loadInterview(slug: string, level: InterviewLevel): InterviewLevelContent | null {
  const path = join(CONTENT_ROOT, slug, 'interview', `${level}.md`);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8');
  const { content } = matter(raw);
  const meta = loadTopicMeta(slug);
  return {
    topicSlug: slug,
    level,
    title: `${meta.title} — Interview (${interviewLevelLabel(level)})`,
    markdown: content.trim(),
    items: parseInterviewItems(content),
  };
}

function loadDeep(slug: string, track: DeepTrack): DeepTrackContent | null {
  const path = join(CONTENT_ROOT, slug, 'deep', `${track}.md`);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8');
  const { content } = matter(raw);
  const meta = loadTopicMeta(slug);
  return {
    topicSlug: slug,
    track,
    title: `${meta.title} — Deep: ${deepTrackLabel(track)}`,
    markdown: content.trim(),
    sections: parseDeepSections(content),
  };
}

const manifest = readJson<Manifest>(join(CONTENT_ROOT, 'manifest.json'));

export const TOPIC_METAS: TopicMeta[] = manifest.topics
  .map((t) => loadTopicMeta(t.slug))
  .sort((a, b) => a.order - b.order);

export function toTopicSummary(meta: TopicMeta): TopicSummary {
  const interviewDir = join(CONTENT_ROOT, meta.slug, 'interview');
  const deepDir = join(CONTENT_ROOT, meta.slug, 'deep');
  const interviewLevels = listMdStem(interviewDir).filter(isInterviewLevel) as InterviewLevel[];
  const deepTracks = listMdStem(deepDir).filter(isDeepTrack) as DeepTrack[];

  // stable order
  const orderedLevels = INTERVIEW_LEVELS.filter((l) => interviewLevels.includes(l));
  const orderedTracks = DEEP_TRACKS.filter((t) => deepTracks.includes(t));

  return {
    id: meta.id,
    slug: meta.slug,
    title: meta.title,
    emoji: meta.emoji,
    order: meta.order,
    tag: meta.tag,
    accent: meta.accent,
    relatedTopics: meta.relatedTopics,
    quizCount: meta.quiz.length,
    problemCount: meta.problems.length,
    interviewLevels: orderedLevels,
    deepTracks: orderedTracks,
  };
}

export const TOPIC_SUMMARIES: TopicSummary[] = TOPIC_METAS.map(toTopicSummary);

export function getTopicMeta(slug: string): TopicMeta | undefined {
  return TOPIC_METAS.find((t) => t.slug === slug);
}

export function getTopicDetail(slug: string): TopicDetail | undefined {
  const meta = getTopicMeta(slug);
  if (!meta) return undefined;
  return {
    ...toTopicSummary(meta),
    quiz: meta.quiz,
    problems: meta.problems,
  };
}

export function getInterviewLevel(
  slug: string,
  level: string,
): InterviewLevelContent | null {
  if (!isInterviewLevel(level)) return null;
  return loadInterview(slug, level);
}

export function getDeepTrack(slug: string, track: string): DeepTrackContent | null {
  if (!isDeepTrack(track)) return null;
  return loadDeep(slug, track);
}

export function searchAll(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { topics: [], interview: [], deep: [] };

  const topics = TOPIC_SUMMARIES.filter((t) => {
    const hay = `${t.title} ${t.tag} ${t.slug} ${t.relatedTopics.join(' ')}`.toLowerCase();
    return hay.includes(q);
  });

  const interview: Array<{
    topicSlug: string;
    topicTitle: string;
    level: InterviewLevel;
    itemId: string;
    title: string;
  }> = [];

  const deep: Array<{
    topicSlug: string;
    topicTitle: string;
    track: DeepTrack;
    heading: string;
  }> = [];

  for (const meta of TOPIC_METAS) {
    for (const level of INTERVIEW_LEVELS) {
      const content = loadInterview(meta.slug, level);
      if (!content) continue;
      for (const item of content.items) {
        const hay = `${item.question} ${item.answer} ${item.takeaway ?? ''}`.toLowerCase();
        if (hay.includes(q)) {
          interview.push({
            topicSlug: meta.slug,
            topicTitle: meta.title,
            level,
            itemId: item.id,
            title: item.question,
          });
        }
      }
    }
    for (const track of DEEP_TRACKS) {
      const content = loadDeep(meta.slug, track);
      if (!content) continue;
      for (const sec of content.sections) {
        const hay = `${sec.h} ${sec.b}`.toLowerCase();
        if (hay.includes(q)) {
          deep.push({
            topicSlug: meta.slug,
            topicTitle: meta.title,
            track,
            heading: sec.h,
          });
        }
      }
    }
  }

  return { topics, interview, deep };
}
