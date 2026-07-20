/**
 * Migrates java-spring-interview MD + catalog.json + guide.json into content/.
 * Run after scaffold: node --import tsx scripts/migrate-to-content.ts
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const CONTENT = join(ROOT, 'content');

type Target = { topic: string; file: 'interview' | 'deep'; name: string };

const CATALOG_MAP: Record<string, Target> = {
  'programming-fundamentals': { topic: 'software-engineering', file: 'deep', name: 'theory' },
  'data-structures': { topic: 'dsa', file: 'deep', name: 'theory' },
  algorithms: { topic: 'dsa', file: 'deep', name: 'best-practices' },
  databases: { topic: 'database', file: 'deep', name: 'theory' },
  apis: { topic: 'api-design', file: 'deep', name: 'theory' },
  'system-design': { topic: 'system-design', file: 'deep', name: 'theory' },
  testing: { topic: 'testing-quality', file: 'deep', name: 'theory' },
  git: { topic: 'git-collaboration', file: 'deep', name: 'theory' },
  debugging: { topic: 'software-engineering', file: 'deep', name: 'pitfalls' },
  'problem-solving': { topic: 'dsa', file: 'deep', name: 'best-practices' },
  'cloud-devops': { topic: 'devops-cloud', file: 'deep', name: 'theory' },
  security: { topic: 'security', file: 'deep', name: 'theory' },
  observability: { topic: 'devops-cloud', file: 'deep', name: 'best-practices' },
  'ai-engineering': { topic: 'ai-ml', file: 'deep', name: 'theory' },
  concurrency: { topic: 'cs-fundamentals', file: 'deep', name: 'internals' },
  immutability: { topic: 'software-engineering', file: 'deep', name: 'best-practices' },
  'design-patterns': { topic: 'low-level-design', file: 'deep', name: 'theory' },
  caching: { topic: 'backend', file: 'deep', name: 'performance' },
  'messaging-queues': { topic: 'backend', file: 'deep', name: 'internals' },
  idempotency: { topic: 'backend', file: 'deep', name: 'best-practices' },
  'auth-tls': { topic: 'security', file: 'deep', name: 'internals' },
  tdd: { topic: 'testing-quality', file: 'deep', name: 'best-practices' },
  networking: { topic: 'cs-fundamentals', file: 'deep', name: 'theory' },
  'operating-systems': { topic: 'cs-fundamentals', file: 'deep', name: 'theory' },
  'graphql-grpc': { topic: 'api-design', file: 'deep', name: 'internals' },
};

const GUIDE_MAP: Record<string, Target> = {
  roadmap: { topic: 'software-engineering', file: 'interview', name: 'basics' },
  dsa: { topic: 'dsa', file: 'interview', name: 'medium' },
  'system-design': { topic: 'system-design', file: 'interview', name: 'medium' },
  behavioral: { topic: 'behavioral', file: 'interview', name: 'medium' },
  'cs-mcq': { topic: 'cs-fundamentals', file: 'interview', name: 'basics' },
};

interface OldTopic {
  id: string;
  slug: string;
  title: string;
  sections: Array<{ h: string; b: string }>;
  code?: string;
  tips?: string[];
  quiz?: unknown[];
  problems?: unknown[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function ensureDir(p: string) {
  mkdirSync(p, { recursive: true });
}

function stripExistingMigrated(md: string): string {
  return md.replace(/\n## Migrated from[\s\S]*$/i, '').trimEnd() + '\n';
}

function appendSection(path: string, heading: string, body: string) {
  ensureDir(join(path, '..'));
  let existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  existing = stripExistingMigrated(existing);
  if (existing.includes(`## ${heading}`)) return;
  const block = `\n## ${heading}\n\n${body.trim()}\n`;
  writeFileSync(path, existing.trimEnd() + '\n' + block + '\n');
}

function concatMdFiles(files: string[]): string {
  return files
    .filter((f) => existsSync(f))
    .map((f) => readFileSync(f, 'utf8').trim())
    .join('\n\n---\n\n');
}

function writeInterviewOverwrite(topic: string, level: string, body: string, title: string) {
  const path = join(CONTENT, topic, 'interview', `${level}.md`);
  ensureDir(join(CONTENT, topic, 'interview'));
  const md = `---
id: ${topic}-interview-${level}
level: ${level}
---

# ${title}

${body.trim()}
`;
  writeFileSync(path, md);
}

function migrateJavaSpring() {
  const base = join(ROOT, 'java-spring-interview');
  if (!existsSync(base)) {
    console.warn('java-spring-interview/ not found — skip');
    return;
  }

  const javaBasics = concatMdFiles([
    join(base, '01-java-core/01-platform-wrappers-strings.md'),
    join(base, '01-java-core/02-oop-basics.md'),
  ]);
  const javaMedium = concatMdFiles([
    join(base, '01-java-core/03-advanced-oop-modifiers.md'),
    join(base, '01-java-core/04-conditions-loops.md'),
    join(base, '01-java-core/05-exception-handling.md'),
    join(base, '02-collections/01-collections-basics.md'),
  ]);
  const javaAdvanced = concatMdFiles([
    join(base, '01-java-core/06-miscellaneous.md'),
    join(base, '02-collections/02-advanced-collections.md'),
    join(base, '03-concurrency-fp/01-generics.md'),
    join(base, '03-concurrency-fp/02-multithreading.md'),
    join(base, '03-concurrency-fp/03-functional-streams.md'),
    join(base, '03-concurrency-fp/04-java-new-features.md'),
  ]);

  writeInterviewOverwrite('java', 'basics', javaBasics, 'Java — Interview (Basics)');
  writeInterviewOverwrite('java', 'medium', javaMedium, 'Java — Interview (Medium)');
  writeInterviewOverwrite('java', 'advanced', javaAdvanced, 'Java — Interview (Advanced)');

  const springBasics = concatMdFiles([join(base, '04-spring-boot/01-basics.md')]);
  const springMedium = concatMdFiles([join(base, '04-spring-boot/02-intermediate.md')]);
  const springAdvanced = concatMdFiles([join(base, '04-spring-boot/03-advanced.md')]);

  writeInterviewOverwrite('spring-boot', 'basics', springBasics, 'Spring Boot — Interview (Basics)');
  writeInterviewOverwrite('spring-boot', 'medium', springMedium, 'Spring Boot — Interview (Medium)');
  writeInterviewOverwrite(
    'spring-boot',
    'advanced',
    springAdvanced,
    'Spring Boot — Interview (Advanced)',
  );

  console.log('Migrated java-spring-interview → java + spring-boot interview MD');
}

function migrateCatalog() {
  const catalogPath = join(ROOT, 'server/data/topics/catalog.json');
  if (!existsSync(catalogPath)) {
    console.warn('catalog.json missing — skip');
    return;
  }
  const topics = readJson<OldTopic[]>(catalogPath);

  for (const topic of topics) {
    const target = CATALOG_MAP[topic.slug];
    if (!target) {
      console.warn('No map for', topic.slug);
      continue;
    }

    const deepPath = join(CONTENT, target.topic, 'deep', `${target.name}.md`);
    for (const sec of topic.sections ?? []) {
      appendSection(deepPath, `${topic.title}: ${sec.h}`, sec.b);
    }
    if (topic.code?.trim()) {
      appendSection(
        deepPath,
        `${topic.title}: Code`,
        '```\n' + topic.code.trim() + '\n```',
      );
    }
    if (topic.tips?.length) {
      appendSection(
        deepPath,
        `${topic.title}: Tips`,
        topic.tips.map((t) => `- ${t}`).join('\n'),
      );
    }

    // Merge quiz/problems into meta.json
    const metaPath = join(CONTENT, target.topic, 'meta.json');
    if (existsSync(metaPath) && ((topic.quiz?.length ?? 0) > 0 || (topic.problems?.length ?? 0) > 0)) {
      const meta = readJson<{
        quiz: unknown[];
        problems: unknown[];
        [k: string]: unknown;
      }>(metaPath);
      const existingQuizIds = new Set((meta.quiz ?? []).map((q: { id?: string }) => q.id));
      const existingProbIds = new Set((meta.problems ?? []).map((p: { id?: string }) => p.id));
      for (const q of topic.quiz ?? []) {
        const qq = q as { id: string };
        if (!existingQuizIds.has(qq.id)) meta.quiz.push(q);
      }
      for (const p of topic.problems ?? []) {
        const pp = p as { id: string };
        if (!existingProbIds.has(pp.id)) meta.problems.push(p);
      }
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
    }
  }
  console.log(`Migrated ${topics.length} catalog topics into deep tracks`);
}

function migrateGuide() {
  const guidePath = join(ROOT, 'server/data/interview/guide.json');
  if (!existsSync(guidePath)) {
    console.warn('guide.json missing — skip');
    return;
  }
  const sections = readJson<
    Array<{
      id: string;
      title: string;
      items: Array<{ id: string; title: string; body: string; tags?: string[] }>;
    }>
  >(guidePath);

  for (const section of sections) {
    const target = GUIDE_MAP[section.id];
    if (!target) continue;
    const path = join(CONTENT, target.topic, 'interview', `${target.name}.md`);
    let existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
    // Don't wipe migrated Java content — only append guide items if not already present
    let n = 0;
    for (const item of section.items) {
      if (existing.includes(item.title)) continue;
      n += 1;
      const block = `
## Q-Guide-${item.id}. ${item.title}?

**Answer:** ${item.body}

**Key takeaway:** From interview guide (${section.title}).

---
`;
      existing = existing.trimEnd() + '\n' + block;
    }
    writeFileSync(path, existing.trimEnd() + '\n');
    console.log(`Appended ${n} guide items → ${target.topic}/interview/${target.name}.md`);
  }
}

function main() {
  migrateJavaSpring();
  migrateCatalog();
  migrateGuide();
  console.log('Migration complete. Content root:', CONTENT);
  console.log('Topics:', readdirSync(CONTENT).filter((d) => d !== 'manifest.json').length);
}

main();
