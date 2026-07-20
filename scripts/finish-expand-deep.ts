/**
 * Completes expand_swe_forge pending work against the new content/ model:
 * - Rebuild clean Deep MD from catalog.json (no "Content coming soon" stubs)
 * - Remap relatedTopics to new topic slugs
 *
 * Run: node --import tsx scripts/finish-expand-deep.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const CONTENT = join(ROOT, 'content');
const CATALOG = join(ROOT, 'server/data/topics/catalog.json');

interface OldTopic {
  id: string;
  slug: string;
  title: string;
  sections: Array<{ h: string; b: string }>;
  code?: string;
  tips?: string[];
  relatedSlugs?: string[];
  quiz?: unknown[];
  problems?: unknown[];
}

/** Old catalog slug → new content topic + preferred deep track */
const MAP: Record<string, { topic: string; track: string }> = {
  concurrency: { topic: 'cs-fundamentals', track: 'internals' },
  immutability: { topic: 'software-engineering', track: 'best-practices' },
  'design-patterns': { topic: 'low-level-design', track: 'theory' },
  caching: { topic: 'backend', track: 'performance' },
  'messaging-queues': { topic: 'backend', track: 'internals' },
  idempotency: { topic: 'backend', track: 'best-practices' },
  'auth-tls': { topic: 'security', track: 'internals' },
  tdd: { topic: 'testing-quality', track: 'best-practices' },
  networking: { topic: 'cs-fundamentals', track: 'theory' },
  'operating-systems': { topic: 'cs-fundamentals', track: 'theory' },
  'graphql-grpc': { topic: 'api-design', track: 'internals' },
  'programming-fundamentals': { topic: 'software-engineering', track: 'theory' },
  security: { topic: 'security', track: 'theory' },
  apis: { topic: 'api-design', track: 'theory' },
  'system-design': { topic: 'system-design', track: 'theory' },
  testing: { topic: 'testing-quality', track: 'theory' },
  databases: { topic: 'database', track: 'theory' },
  'cloud-devops': { topic: 'devops-cloud', track: 'theory' },
  observability: { topic: 'devops-cloud', track: 'best-practices' },
  'ai-engineering': { topic: 'ai-ml', track: 'theory' },
  'data-structures': { topic: 'dsa', track: 'theory' },
  algorithms: { topic: 'dsa', track: 'best-practices' },
  git: { topic: 'git-collaboration', track: 'theory' },
  debugging: { topic: 'software-engineering', track: 'pitfalls' },
  'problem-solving': { topic: 'dsa', track: 'best-practices' },
};

const RELATED_REMAP: Record<string, string> = {
  concurrency: 'cs-fundamentals',
  immutability: 'software-engineering',
  'design-patterns': 'low-level-design',
  caching: 'backend',
  'messaging-queues': 'backend',
  idempotency: 'backend',
  'auth-tls': 'security',
  tdd: 'testing-quality',
  networking: 'cs-fundamentals',
  'operating-systems': 'cs-fundamentals',
  'graphql-grpc': 'api-design',
  'programming-fundamentals': 'software-engineering',
  'ai-engineering': 'ai-ml',
  'cloud-devops': 'devops-cloud',
  'data-structures': 'dsa',
  algorithms: 'dsa',
  apis: 'api-design',
  databases: 'database',
  'system-design': 'system-design',
  security: 'security',
  testing: 'testing-quality',
  git: 'git-collaboration',
  observability: 'devops-cloud',
};

function titleCase(s: string): string {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function stripComingSoonSections(md: string): string {
  return (
    md
      .replace(/\n## [^\n]+\n\nContent coming soon\.\n+/g, '\n')
      .replace(/> Placeholder sections for must-cover curriculum\.\n+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  );
}

function buildDeepMd(
  topicSlug: string,
  track: string,
  topicTitle: string,
  lessons: OldTopic[],
): string {
  const trackLabel = titleCase(track);
  const parts: string[] = [
    `---`,
    `id: ${topicSlug}-deep-${track}`,
    `track: ${track}`,
    `---`,
    ``,
    `# ${topicTitle} — Deep: ${trackLabel}`,
    ``,
    `> Depth-first lessons with practical examples (migrated from SWE Forge deep track).`,
    ``,
  ];

  for (const lesson of lessons) {
    parts.push(`## ${lesson.title}`);
    parts.push(``);
    parts.push(
      `*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.`,
    );
    parts.push(``);
    for (const sec of lesson.sections) {
      parts.push(`### ${sec.h}`);
      parts.push(``);
      parts.push(sec.b.trim());
      parts.push(``);
    }
    if (lesson.code?.trim()) {
      parts.push(`### Practical code`);
      parts.push(``);
      parts.push('```');
      parts.push(lesson.code.trim());
      parts.push('```');
      parts.push(``);
    }
    if (lesson.tips?.length) {
      parts.push(`### Tips`);
      parts.push(``);
      for (const tip of lesson.tips) parts.push(`- ${tip}`);
      parts.push(``);
    }
  }

  return parts.join('\n');
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function main() {
  const catalog = readJson<OldTopic[]>(CATALOG);

  const buckets = new Map<
    string,
    { topic: string; track: string; topicTitle: string; lessons: OldTopic[] }
  >();

  for (const lesson of catalog) {
    const dest = MAP[lesson.slug];
    if (!dest) continue;
    const key = `${dest.topic}::${dest.track}`;
    const metaPath = join(CONTENT, dest.topic, 'meta.json');
    const title = existsSync(metaPath)
      ? readJson<{ title: string }>(metaPath).title
      : dest.topic;
    if (!buckets.has(key)) {
      buckets.set(key, { topic: dest.topic, track: dest.track, topicTitle: title, lessons: [] });
    }
    buckets.get(key)!.lessons.push(lesson);
  }

  for (const bucket of buckets.values()) {
    const path = join(CONTENT, bucket.topic, 'deep', `${bucket.track}.md`);
    const md = buildDeepMd(bucket.topic, bucket.track, bucket.topicTitle, bucket.lessons);
    writeFileSync(path, md);
    console.log('Wrote', path, `(${bucket.lessons.map((l) => l.slug).join(', ')})`);
  }

  for (const topic of readdirSync(CONTENT)) {
    if (topic === 'manifest.json') continue;
    const deepDir = join(CONTENT, topic, 'deep');
    if (!existsSync(deepDir)) continue;
    for (const file of readdirSync(deepDir)) {
      if (!file.endsWith('.md')) continue;
      const path = join(deepDir, file);
      const key = `${topic}::${file.replace(/\.md$/, '')}`;
      if (buckets.has(key)) continue;
      const before = readFileSync(path, 'utf8');
      const after = stripComingSoonSections(before);
      if (after !== before) {
        writeFileSync(path, after);
        console.log('Cleaned stubs:', path);
      }
    }

    const metaPath = join(CONTENT, topic, 'meta.json');
    if (!existsSync(metaPath)) continue;
    const meta = readJson<{
      relatedTopics: string[];
      [k: string]: unknown;
    }>(metaPath);
    const remapped = (meta.relatedTopics ?? [])
      .map((s) => RELATED_REMAP[s] ?? s)
      .filter((s, i, arr) => s !== topic && arr.indexOf(s) === i);
    if (JSON.stringify(remapped) !== JSON.stringify(meta.relatedTopics)) {
      meta.relatedTopics = remapped;
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
      console.log('Remapped relatedTopics:', topic, remapped);
    }
  }

  console.log('Done finishing expand deep content.');
}

main();
