#!/usr/bin/env node
/**
 * Forgeline content compiler.
 *
 * Reads Markdown under content/ and writes static JSON to public/data/:
 *   catalog.json            groups, topics, page index, totals
 *   topics/<slug>.json      quiz + practice problems for a topic
 *   pages/<slug>/<kind>/<id>.json   one page (markdown + headings [+ Q&A items])
 *   pages/prep-map.json     the topic-wise prep map
 *   search.json             section-level full-text index
 *   cards.json              flashcards / mock-interview question bank
 *
 * Runs automatically before `npm run dev` and `npm run build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'public', 'data');

const INTERVIEW_LEVELS = ['basics', 'medium', 'advanced', 'company-specific'];
const DEEP_TRACKS = ['theory', 'internals', 'best-practices', 'real-world-projects', 'performance', 'pitfalls'];
const WPM = 200;
const CODE_LPM = 22;

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data));
};
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const titleCase = (s) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Plain text for a heading, matching what rehype-slug sees (text content). */
function headingText(s) {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+#+\s*$/, '')
    .trim();
}

function stripMd(s) {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, ' ')
    .replace(/[*_>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('; '));
  return (lastStop > n * 0.6 ? cut.slice(0, lastStop + 1) : cut.replace(/\s+\S*$/, '') + '…').trim();
}

/** Split markdown into heading-delimited sections, ignoring headings inside code fences. */
function analyse(markdown) {
  const slugger = new GithubSlugger();
  const lines = markdown.split('\n');
  const headings = [];
  const sections = [];
  let fence = null;
  let current = { depth: 0, text: '', id: '', lines: [] };
  for (const line of lines) {
    const f = line.match(/^\s*(```+|~~~+)/);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      current.lines.push(line);
      continue;
    }
    const h = !fence && line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (h) {
      const text = headingText(h[2]);
      const id = slugger.slug(text);
      const depth = h[1].length;
      headings.push({ depth, text, id });
      sections.push(current);
      current = { depth, text, id, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  const code = (markdown.match(/```[\s\S]*?```/g) || []).reduce((n, b) => n + b.split('\n').length - 2, 0);
  const words = stripMd(markdown).split(/\s+/).filter(Boolean).length;
  return { headings, sections, words, minutes: Math.max(1, Math.round(words / WPM + code / CODE_LPM)) };
}

/** First prose paragraph(s) of a section, skipping code, tables and nested headings. */
function sectionSummary(lines, max = 420) {
  const out = [];
  let fence = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^(```|~~~)/.test(line)) { fence = !fence; continue; }
    if (fence || !line || line.startsWith('|') || /^-{3,}$/.test(line) || /^#/.test(line)) {
      if (out.join(' ').length > 160 && !fence && !line) break;
      continue;
    }
    if (/^>\s*\*\*Asked as/i.test(line)) continue;
    out.push(line.replace(/^>\s?/, ''));
    if (out.join(' ').length > max) break;
  }
  return clip(stripMd(out.join(' ')), max);
}

function firstParagraph(markdown) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => /^#\s+/.test(l));
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l || /^(#|---|```|\||>\s*Companion|!\[)/.test(l)) continue;
    const t = stripMd(l);
    if (t.length < 25) continue;
    return clip(t, 200);
  }
  return '';
}

function parseInterviewItems(markdown) {
  const items = [];
  for (const part of markdown.split(/\n(?=##\s+)/)) {
    const m = part.match(/^##\s+(.+?)\s*$/m);
    if (!m) continue;
    const title = m[1].trim();
    if (!(/^Q\d+\./i.test(title) || title.includes('?') || part.includes('**Answer:**'))) continue;
    const grab = (label, stops) =>
      part.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*(?:${stops}):|\\n---|$)`, 'i'))?.[1]?.trim();
    const answer = grab('Answer', 'Example|Key takeaway|Interview tip') ?? '';
    if (!answer || /^content coming soon/i.test(answer)) continue;
    const id = new GithubSlugger().slug(headingText(title));
    items.push({
      id,
      question: headingText(title).replace(/^Q\d+\.\s*/i, ''),
      answer,
      example: grab('Example', 'Key takeaway|Interview tip|Answer') || undefined,
      takeaway: (grab('Key takeaway', 'Interview tip|Answer|Example') || '').replace(/^TBD\.?$/, '') || undefined,
      tip: grab('Interview tip', 'Answer|Example|Key takeaway') || undefined,
    });
  }
  return items;
}

const SKIP_SECTION = /table of contents|^contents$|learn more|further reading|references|resources|^summary$|cheat ?sheet|^see also|^links|quick reference|^tl;dr/i;

// ---------------------------------------------------------------------------
// Practice Lab: content/<topic>/practice/<slug>.md
//
// Frontmatter: title (required), difficulty easy|medium|hard (required),
// runner js|python|sql|none (required), tags[], languages[],
// estimatedMinutes, learnLinks[] ("topic/kind/id[#anchor]").
// Body: statement (preamble before the first ## section, plus an optional
// ## Problem section), ## Examples, ## Learn, ## Hints (3 bullets),
// ## Solution (explanation prose), ## Complexity, ## Common mistakes.
// Fenced blocks: ```starter:<lang>, ```solution:<lang>, ```visible-tests,
// ```hidden-tests (JSON), ```seed-sql.

const PRACTICE_RUNNERS = ['js', 'python', 'sql', 'none'];
const PRACTICE_DIFFICULTY = ['easy', 'medium', 'hard'];
const PRACTICE_DEFAULT_LANG = { js: ['javascript'], python: ['python'], sql: ['sql'], none: [] };

const PRACTICE_SECTIONS = {
  examples: ['examples'],
  learn: ['learn', 'concept recap', 'recap'],
  hints: ['hints', 'hint'],
  solution: ['solution', 'solution explanation', 'reference solution'],
  complexity: ['complexity', 'time and space complexity', 'time/space complexity'],
  mistakes: ['common mistakes', 'mistakes', 'gotchas', 'pitfalls'],
  problem: ['problem', 'statement', 'problem statement'],
};

/** Pull special fences out of the markdown so they don't render as sections. */
function extractPracticeFences(markdown) {
  const lines = markdown.split('\n');
  const out = [];
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^\s*```(\S*)\s*$/);
    if (!m) {
      out.push(lines[i]);
      i += 1;
      continue;
    }
    const info = m[1].trim();
    const buf = [];
    i += 1;
    while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
      buf.push(lines[i]);
      i += 1;
    }
    i += 1; // closing fence (or EOF)
    if (/^(starter|solution):[a-z0-9+#-]+$/.test(info) || info === 'visible-tests' || info === 'hidden-tests' || info === 'seed-sql') {
      blocks.push({ info, code: buf.join('\n').replace(/\s+$/, '') });
    } else {
      out.push(`\`\`\`${info}`, ...buf, '```');
    }
  }
  return { text: out.join('\n'), blocks };
}

function parseHintList(text) {
  const hints = [];
  for (const raw of text.split('\n')) {
    const m = raw.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/);
    if (m) hints.push(m[1]);
    else if (hints.length && /^\s{2,}\S/.test(raw) && raw.trim()) hints[hints.length - 1] += ` ${raw.trim()}`;
  }
  return hints;
}

function checkTestSpec(spec, runner, where, errors) {
  if (spec === null || typeof spec !== 'object' || Array.isArray(spec)) {
    errors.push(`${where}: tests must be a JSON object`);
    return;
  }
  const wantKind = runner === 'sql' ? 'sql' : 'fn';
  if (spec.kind !== wantKind) errors.push(`${where}: tests need "kind": "${wantKind}" for the ${runner} runner`);
  if (wantKind === 'fn' && typeof spec.function !== 'string') errors.push(`${where}: fn tests need a "function" name`);
  if (!Array.isArray(spec.cases) || !spec.cases.length) {
    errors.push(`${where}: tests need a non-empty "cases" array`);
    return;
  }
  spec.cases.forEach((c, i) => {
    if (!c || typeof c.name !== 'string') errors.push(`${where}: case ${i} needs a "name"`);
    if (wantKind === 'sql' && c && !Array.isArray(c.expectedRows)) errors.push(`${where}: sql case "${c?.name ?? i}" needs "expectedRows"`);
    if (wantKind === 'sql' && c && c.seed !== undefined && typeof c.seed !== 'string') errors.push(`${where}: sql case "${c?.name ?? i}" has a non-string "seed"`);
  });
}

function parsePracticeFile(file, topicSlug, errors, warnings) {
  const slug = path.basename(file, '.md');
  const where = `${topicSlug}/practice/${slug}`;
  const fail = (msg) => errors.push(`${where}: ${msg}`);
  const { data: fm, content } = matter(fs.readFileSync(file, 'utf8'));

  const title = typeof fm.title === 'string' ? fm.title.trim() : '';
  if (!title) fail('frontmatter needs a "title"');
  if (fm.id !== undefined && String(fm.id) !== slug) fail(`frontmatter "id" (${fm.id}) must match the file name (${slug})`);
  const difficulty = fm.difficulty;
  if (!PRACTICE_DIFFICULTY.includes(difficulty)) fail(`frontmatter "difficulty" must be one of ${PRACTICE_DIFFICULTY.join('|')}`);
  const runner = fm.runner;
  if (!PRACTICE_RUNNERS.includes(runner)) fail(`frontmatter "runner" must be one of ${PRACTICE_RUNNERS.join('|')}`);
  const tags = Array.isArray(fm.tags) ? fm.tags.map(String) : [];
  const languages = Array.isArray(fm.languages) ? fm.languages.map(String) : (PRACTICE_DEFAULT_LANG[runner] ?? []);
  const estimatedMinutes = Number.isFinite(Number(fm.estimatedMinutes)) ? Number(fm.estimatedMinutes) : 10;
  const learnLinks = Array.isArray(fm.learnLinks) ? fm.learnLinks.map(String) : [];

  const { text, blocks } = extractPracticeFences(rewriteLinks(content.trim(), topicSlug));
  const starters = {};
  const solutionCode = {};
  let visibleTests = null;
  let hiddenTests = null;
  let seedSql = '';
  for (const b of blocks) {
    const sm = b.info.match(/^(starter|solution):([a-z0-9+#-]+)$/);
    if (sm) {
      const store = sm[1] === 'starter' ? starters : solutionCode;
      if (store[sm[2]]) fail(`duplicate \`\`\`${b.info} block`);
      store[sm[2]] = b.code;
      continue;
    }
    if (b.info === 'visible-tests' || b.info === 'hidden-tests') {
      let spec = null;
      try {
        spec = JSON.parse(b.code);
      } catch {
        fail(`\`\`\`${b.info} is not valid JSON`);
        continue;
      }
      if (b.info === 'visible-tests') visibleTests = spec;
      else hiddenTests = spec;
      continue;
    }
    if (b.info === 'seed-sql') seedSql = b.code;
  }

  if (runner === 'none' && (visibleTests || hiddenTests)) fail('runner "none" challenges cannot have test blocks');
  if ((runner === 'js' || runner === 'python') && !visibleTests) fail('js/python challenges need a ```visible-tests block');
  if (runner === 'sql') {
    if (!visibleTests) fail('sql challenges need a ```visible-tests block');
    if (!seedSql) fail('sql challenges need a ```seed-sql block');
  }
  if (visibleTests) checkTestSpec(visibleTests, runner, `${where} visible-tests`, errors);
  if (hiddenTests) checkTestSpec(hiddenTests, runner, `${where} hidden-tests`, errors);

  const a = analyse(text);
  const byName = new Map();
  for (const s of a.sections) {
    if (s.depth === 2) byName.set(s.text.toLowerCase(), s.lines.join('\n').trim());
  }
  const section = (key) => {
    for (const alias of PRACTICE_SECTIONS[key]) {
      const hit = byName.get(alias);
      if (hit !== undefined) return hit;
    }
    return '';
  };
  const preamble = (a.sections[0]?.lines.join('\n') ?? '').trim();
  const statement = [preamble, section('problem')].filter(Boolean).join('\n\n').trim();
  if (!statement) fail('missing problem statement (preamble or ## Problem section)');
  const hints = parseHintList(section('hints'));
  if (!hints.length) fail('## Hints needs at least one bullet');
  else if (hints.length !== 3) warnings.push(`${where}: expected 3 hints, found ${hints.length}`);

  return {
    id: `${topicSlug}/${slug}`,
    topic: topicSlug,
    slug,
    title: title || slug,
    difficulty,
    tags,
    languages,
    runner,
    estimatedMinutes,
    learnLinks,
    statement,
    examples: section('examples'),
    learn: section('learn'),
    hints,
    starters,
    visibleTests,
    hiddenTests,
    seedSql,
    solution: { code: solutionCode, explanation: section('solution') },
    complexity: section('complexity'),
    mistakes: section('mistakes'),
    source: 'practice',
    url: `/practice/${topicSlug}/${slug}`,
  };
}

/** Legacy meta.json problems[] become think-&-check challenges; solved state migrates client-side. */
function legacyChallenge(topicSlug, p) {
  return {
    id: `${topicSlug}/${p.id}`,
    topic: topicSlug,
    slug: p.id,
    title: p.title,
    difficulty: p.difficulty,
    tags: ['legacy'],
    languages: [],
    runner: 'none',
    estimatedMinutes: 10,
    learnLinks: [],
    statement: p.prompt,
    examples: '',
    learn: '',
    hints: p.hints ?? [],
    starters: {},
    visibleTests: null,
    hiddenTests: null,
    seedSql: '',
    solution: { code: {}, explanation: p.solution ?? '' },
    complexity: '',
    mistakes: '',
    source: 'legacy',
    url: `/practice/${topicSlug}/${p.id}`,
  };
}

// ---------------------------------------------------------------------------

const manifest = readJson(path.join(CONTENT, 'manifest.json'));
const groups = manifest.groups ?? [{ id: 'all', label: 'Topics', hint: '', topics: manifest.topics.map((t) => t.slug) }];
const groupOf = Object.fromEntries(groups.flatMap((g) => g.topics.map((s) => [s, g.id])));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const search = [];
const cards = [];
const topics = [];
const practiceAll = [];
const practiceCountByTopic = {};
const practiceErrors = [];
const practiceWarnings = [];
const fileToRoute = new Map(); // "<slug>/<file>.md" -> url
let totalWords = 0;
let totalMinutes = 0;
let totalPages = 0;

const pageUrl = (slug, kind, id) => `/topics/${slug}/${kind}/${id}`;

// First pass: collect files so cross-note links can be resolved.
const plan = manifest.topics
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((t) => {
    const dir = path.join(CONTENT, t.slug);
    const list = (sub) =>
      fs.existsSync(path.join(dir, sub)) ? fs.readdirSync(path.join(dir, sub)).filter((f) => f.endsWith('.md')).sort(natural) : [];
    const notes = list('notes');
    const deep = DEEP_TRACKS.filter((x) => list('deep').includes(`${x}.md`));
    const interview = INTERVIEW_LEVELS.filter((x) => list('interview').includes(`${x}.md`));
    const practice = list('practice');
    for (const f of notes) fileToRoute.set(`${t.slug}/${f}`, pageUrl(t.slug, 'notes', f.replace(/\.md$/, '')));
    return { ...t, dir, notes, deep, interview, practice };
  });

function rewriteLinks(md, slug) {
  return md.replace(/\]\((\.\.\/([\w-]+)\/|\.\/)?([\w.-]+\.md)(#[^)]*)?\)/g, (m, _pre, otherSlug, file, hashPart) => {
    const url = fileToRoute.get(`${otherSlug || slug}/${file}`);
    return url ? `](${url}${hashPart || ''})` : m;
  });
}

function addSectionsToSearch(sections, base) {
  for (const s of sections) {
    const text = stripMd(s.lines.join('\n'));
    if (!s.text && text.length < 40) continue;
    search.push({ u: base.url, t: base.title, tp: base.topicTitle, s: s.text || '', a: s.id || '', x: clip(text, 360) });
  }
}

for (const t of plan) {
  const meta = readJson(path.join(t.dir, 'meta.json'));
  const pages = [];
  const base = { slug: t.slug, topicTitle: meta.title };

  const emit = (kind, id, file, label) => {
    const raw = fs.readFileSync(file, 'utf8');
    const { content } = matter(raw);
    let md = rewriteLinks(content.trim(), t.slug);
    const a = analyse(md);
    const h1 = a.headings.find((h) => h.depth === 1)?.text;
    const title = kind === 'notes' ? (h1 || titleCase(id)).replace(/^\d+\.\s*/, '') : label;
    const url = pageUrl(t.slug, kind, id);
    const key = `${t.slug}/${kind}/${id}`;
    const page = { key, slug: t.slug, kind, id, title, url, markdown: md, headings: a.headings.filter((h) => h.depth >= 2 && h.depth <= 3) };
    let questions;
    if (kind === 'interview') {
      const items = parseInterviewItems(md);
      if (items.length) {
        page.items = items;
        questions = items.length;
        for (const it of items) {
          cards.push({ id: hash(`${t.slug}|${it.question}`), t: t.slug, src: 'interview', u: url, a: it.id, ctx: `${meta.title} · ${label}`, q: it.question, ans: clip(stripMd(it.answer), 600), x: it.takeaway ? clip(stripMd(it.takeaway), 200) : undefined });
          search.push({ u: url, t: `${meta.title} — ${label}`, tp: meta.title, s: it.question, a: it.id, x: clip(stripMd(it.answer), 360) });
        }
      }
    }
    if (kind !== 'interview' || !page.items) addSectionsToSearch(a.sections, { ...base, url, title: kind === 'notes' ? title : `${meta.title} — ${label}` });
    // Concept-recall cards from note / deep sections.
    if (kind !== 'interview') {
      for (const s of a.sections) {
        if (s.depth < 2 || s.depth > 3 || SKIP_SECTION.test(s.text)) continue;
        const q = s.text.replace(/^[\d.]+\s+/, '').replace(/^(Q\d+\.|Step \d+:?)\s*/i, '').trim();
        const ans = sectionSummary(s.lines);
        if (q.length < 4 || ans.length < 90) continue;
        cards.push({ id: hash(`${t.slug}|${title}|${q}`), t: t.slug, src: 'concept', u: url, a: s.id, ctx: `${meta.title} · ${title}`, q, ans });
      }
    }
    writeJson(path.join(OUT, 'pages', t.slug, kind, `${id}.json`), page);
    totalWords += a.words;
    totalMinutes += a.minutes;
    totalPages += 1;
    pages.push({ key, kind, id, title, url, description: kind === 'notes' ? firstParagraph(md) : '', minutes: a.minutes, words: a.words, ...(questions ? { questions } : {}) });
  };

  for (const f of t.notes) emit('notes', f.replace(/\.md$/, ''), path.join(t.dir, 'notes', f));
  for (const x of DEEP_TRACKS.filter((d) => t.deep.includes(d))) emit('deep', x, path.join(t.dir, 'deep', `${x}.md`), `Deep: ${titleCase(x)}`);
  for (const x of t.interview) emit('interview', x, path.join(t.dir, 'interview', `${x}.md`), `Interview: ${titleCase(x)}`);

  const quiz = meta.quiz ?? [];
  for (const q of quiz) {
    cards.push({ id: hash(`${t.slug}|mcq|${q.id}|${q.question}`), t: t.slug, src: 'mcq', u: `/topics/${t.slug}#quiz`, ctx: `${meta.title} · Quiz`, q: q.question, ans: `${q.options[q.correctIndex]} — ${q.explanation}`, opts: q.options, ci: q.correctIndex });
  }
  writeJson(path.join(OUT, 'topics', `${t.slug}.json`), { quiz, problems: meta.problems ?? [] });

  const challenges = [];
  const seenSlugs = new Set();
  for (const f of t.practice) {
    const ch = parsePracticeFile(path.join(t.dir, 'practice', f), t.slug, practiceErrors, practiceWarnings);
    if (seenSlugs.has(ch.slug)) practiceErrors.push(`${t.slug}/practice/${ch.slug}: duplicate challenge slug in this topic`);
    seenSlugs.add(ch.slug);
    challenges.push(ch);
  }
  for (const p of meta.problems ?? []) {
    if (seenSlugs.has(p.id)) {
      practiceErrors.push(`${t.slug}/practice/${p.id}: legacy problem id collides with a practice file slug`);
      continue;
    }
    seenSlugs.add(p.id);
    challenges.push(legacyChallenge(t.slug, p));
  }
  practiceAll.push(...challenges);
  practiceCountByTopic[t.slug] = challenges.length;

  topics.push({
    slug: t.slug,
    title: meta.title,
    emoji: meta.emoji,
    logo: meta.logo && fs.existsSync(path.join(ROOT, 'public', meta.logo.replace(/^\//, ''))) ? meta.logo : undefined,
    logoDark: meta.logo && fs.existsSync(path.join(ROOT, 'public', meta.logo.replace(/^\//, '').replace(/\.svg$/, '-dark.svg')))
      ? meta.logo.replace(/\.svg$/, '-dark.svg')
      : undefined,
    tag: meta.tag,
    accent: meta.accent,
    blurb: meta.blurb ?? '',
    order: meta.order,
    group: groupOf[t.slug] ?? groups[0].id,
    related: meta.relatedTopics ?? [],
    quizCount: quiz.length,
    problemCount: (meta.problems ?? []).length,
    practiceCount: practiceCountByTopic[t.slug] ?? 0,
    minutes: pages.reduce((n, p) => n + p.minutes, 0),
    pages,
  });
}

// ---------------------------------------------------------------------------
// Practice Lab phase 2: resolve learnLinks against the emitted pages, then
// write one JSON per challenge plus the practice index.
{
  const topicTitle = Object.fromEntries(topics.map((x) => [x.slug, x.title]));
  const resolveLearnLink = (ch, ref) => {
    const [pageRef, anchor] = String(ref).split('#');
    const parts = pageRef.split('/');
    if (parts.length !== 3) {
      practiceErrors.push(`${ch.id}: learnLink "${ref}" must look like "topic/kind/id"`);
      return null;
    }
    const [slug, kind, id] = parts;
    const f = path.join(OUT, 'pages', slug, kind, `${id}.json`);
    if (!fs.existsSync(f)) {
      practiceErrors.push(`${ch.id}: learnLink "${ref}" points at a missing page`);
      return null;
    }
    const page = readJson(f);
    if (anchor && !page.headings.some((h) => h.id === anchor)) practiceErrors.push(`${ch.id}: learnLink "${ref}" points at a missing anchor`);
    return { ref: String(ref), url: page.url + (anchor ? `#${anchor}` : ''), title: page.title };
  };
  for (const ch of practiceAll) {
    if (ch.source === 'practice') ch.learnLinks = ch.learnLinks.map((ref) => resolveLearnLink(ch, ref)).filter(Boolean);
  }
  if (practiceErrors.length) {
    console.error(`[content] practice errors:\n  ${practiceErrors.join('\n  ')}`);
    process.exit(1);
  }
  for (const w of practiceWarnings) console.warn(`[content] practice warning: ${w}`);

  const index = [];
  for (const ch of practiceAll) {
    writeJson(path.join(OUT, 'pages', ch.topic, 'practice', `${ch.slug}.json`), ch);
    index.push({ id: ch.id, topic: ch.topic, slug: ch.slug, title: ch.title, difficulty: ch.difficulty, tags: ch.tags, languages: ch.languages, runner: ch.runner, estimatedMinutes: ch.estimatedMinutes, url: ch.url, source: ch.source });
    search.push({ u: ch.url, t: `${ch.title} — Practice`, tp: topicTitle[ch.topic] ?? ch.topic, s: ch.title, a: '', x: clip(`${stripMd(ch.statement)} Tags: ${ch.tags.join(', ')}`, 360) });
    const recall = ch.solution.explanation || ch.complexity || ch.hints[ch.hints.length - 1] || ch.statement;
    cards.push({ id: hash(`practice|${ch.id}`), t: ch.topic, src: 'pattern', u: ch.url, ctx: `${topicTitle[ch.topic] ?? ch.topic} · Practice`, q: `${ch.title} — how do you solve it?`, ans: clip(stripMd(recall), 500) });
  }
  writeJson(path.join(OUT, 'practice.json'), { challenges: index });
}

// ---------------------------------------------------------------------------
// Prep map: the topic-wise study map. Its "**Term**: definition" bullets become cards.
const PREP_MAP = path.join(CONTENT, 'prep-map.md');
let prepMap = null;
if (fs.existsSync(PREP_MAP)) {
  let md = rewriteLinks(matter(fs.readFileSync(PREP_MAP, 'utf8')).content.trim(), '');
  const ROUTES = [
    [/backend fundamentals/i, 'backend'], [/spring|^java\b/i, 'spring-boot'], [/django/i, 'django'], [/^python/i, 'python'], [/node|runtime & concurrency/i, 'nodejs'],
    [/sql|nosql|database scaling|database & data layer/i, 'database'], [/typescript|javascript core|async javascript/i, 'javascript'],
    [/next\.js/i, 'nextjs'], [/angular/i, 'angular'], [/react|state management|performance & optimization|application architecture/i, 'react'],
    [/browser|frontend meta/i, 'frontend'], [/frontend security|security|authentication mechanisms|input validation|api security/i, 'security'],
    [/system design|fundamentals$|microservices|design patterns for scale/i, 'system-design'], [/testing/i, 'testing-quality'],
    [/container|ci\/cd|cloud basics|deployment/i, 'devops-cloud'], [/behavioral|technical communication|problem-solving communication|mock interview/i, 'behavioral'],
    [/coding interview|patterns|tree|graph|dynamic programming|algorithms|meta-skills|foundations|arrays|linked list|stack|trees|graphs/i, 'dsa'],
    [/backend fundamentals|caching|architecture & design/i, 'backend'],
  ];
  const H2 = [[/backend/i, 'backend'], [/database/i, 'database'], [/dsa/i, 'dsa'], [/frontend|javascript/i, 'frontend'], [/system design/i, 'system-design'], [/testing/i, 'testing-quality'], [/devops/i, 'devops-cloud'], [/security/i, 'security'], [/soft skills/i, 'behavioral'], [/interview/i, 'behavioral']];
  // Practice Lab callouts after H3 headings (own lines — heading anchors unchanged).
  {
    const lines = md.split('\n');
    const out = [];
    let fence = false;
    let curH2 = '';
    for (const line of lines) {
      out.push(line);
      if (/^\s*(```+|~~~+)/.test(line)) {
        fence = !fence;
        continue;
      }
      if (fence) continue;
      const h2m = line.match(/^##\s+(.+?)\s*$/);
      if (h2m) {
        curH2 = h2m[1];
        continue;
      }
      const h3m = line.match(/^###\s+(.+?)\s*$/);
      if (!h3m) continue;
      let slug = '';
      for (const [re, s] of ROUTES) {
        if (re.test(h3m[1])) {
          slug = s;
          break;
        }
      }
      if (!slug) for (const [re, s] of H2) if (re.test(curH2)) slug = s;
      const n = slug ? (practiceCountByTopic[slug] ?? 0) : 0;
      if (n > 0) out.push('', `> **Practice:** [${n} challenge${n === 1 ? '' : 's'} in the Practice Lab](/practice?topic=${slug})`);
    }
    md = out.join('\n');
  }
  const a = analyse(md);
  let h2 = '';
  let h3 = null;
  const routeFor = () => {
    if (h3) for (const [re, slug] of ROUTES) if (re.test(h3.text)) return slug;
    for (const [re, slug] of H2) if (re.test(h2)) return slug;
    return 'backend';
  };
  const titleBySlug = Object.fromEntries(topics.map((x) => [x.slug, x.title]));
  for (const s of a.sections) {
    if (s.depth === 2) { h2 = s.text; h3 = null; }
    if (s.depth === 3) h3 = s;
    const slug = routeFor();
    for (const line of s.lines) {
      const m = line.match(/^\s*(?:[-*]\s+|\d+\.\s+)?\*\*([^*]{2,80})\*\*\s*:\s*(.{30,})$/);
      if (!m) continue;
      const q = m[1].trim();
      cards.push({ id: hash(`prep|${slug}|${q}`), t: slug, src: 'prep', u: '/prep-map', a: s.id || h3?.id, ctx: `${titleBySlug[slug] ?? slug} · Prep map${h3 ? ` · ${h3.text}` : ''}`, q, ans: clip(stripMd(m[2]), 500) });
    }
  }
  addSectionsToSearch(a.sections, { url: '/prep-map', title: 'Topic-wise Prep Map', topicTitle: 'Prep map' });
  writeJson(path.join(OUT, 'pages', 'prep-map.json'), { key: 'prep-map', slug: '', kind: 'guide', id: 'prep-map', title: 'Topic-wise Prep Map', url: '/prep-map', markdown: md, headings: a.headings.filter((h) => h.depth >= 2 && h.depth <= 3) });
  prepMap = { key: 'prep-map', title: 'Topic-wise Prep Map', url: '/prep-map', minutes: a.minutes };
  totalWords += a.words;
  totalMinutes += a.minutes;
  totalPages += 1;
}

// ---------------------------------------------------------------------------
// Roadmap tracks: content/tracks/<slug>.json group existing pages into stages.
// Items reference pages ("topic/kind/id[#anchor]") or a whole topic ("topic").
const TRACKS = path.join(CONTENT, 'tracks');
const tracks = [];
if (fs.existsSync(TRACKS)) {
  const pageIndex = new Map();
  for (const t of topics) for (const p of t.pages) pageIndex.set(p.key, { ...p, topic: t });
  const anchorsOf = (key) => {
    const [slug, kind, id] = key.split('/');
    const f = path.join(OUT, 'pages', slug, kind, `${id}.json`);
    return new Set(readJson(f).headings.map((h) => h.id));
  };
  const errors = [];
  for (const f of fs.readdirSync(TRACKS).filter((x) => x.endsWith('.json')).sort(natural)) {
    const tr = readJson(path.join(TRACKS, f));
    const used = new Set();
    let minutes = 0;
    const stages = tr.stages.map((st) => ({
      title: st.title,
      hint: st.hint ?? '',
      items: st.items.map((it) => {
        const [ref, anchor] = it.ref.split('#');
        if (!ref.includes('/')) {
          const t = topics.find((x) => x.slug === ref);
          if (!t) { errors.push(`${f}: unknown topic "${ref}"`); return null; }
          used.add(t.slug);
          minutes += t.minutes;
          return { label: it.label, url: `/topics/${t.slug}`, keys: t.pages.map((p) => p.key), minutes: t.minutes, topic: t.slug };
        }
        const p = pageIndex.get(ref);
        if (!p) { errors.push(`${f}: unknown page "${ref}"`); return null; }
        if (anchor && !anchorsOf(ref).has(anchor)) errors.push(`${f}: missing anchor "${it.ref}"`);
        used.add(p.topic.slug);
        minutes += p.minutes;
        return { label: it.label, url: p.url + (anchor ? `#${anchor}` : ''), keys: [p.key], minutes: p.minutes, topic: p.topic.slug };
      }).filter(Boolean),
    }));
    tracks.push({ slug: tr.slug, title: tr.title, emoji: tr.emoji, accent: tr.accent, blurb: tr.blurb, order: tr.order ?? 99, source: tr.source, stages, topics: [...used], minutes });
  }
  if (errors.length) {
    console.error(`[content] track errors:\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  tracks.sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Learning paths: content/paths/<slug>.json order existing material into
// steps ({type: guide|quiz|flashcards|interview|practice, ref}). Refs resolve
// to page keys (guide/interview), topic slugs (quiz/flashcards) or challenge
// ids (practice). Unknown refs fail the build, like tracks.
const PATHS = path.join(CONTENT, 'paths');
const paths = [];
if (fs.existsSync(PATHS)) {
  const pageByKey = new Map();
  for (const t of topics) for (const p of t.pages) pageByKey.set(p.key, { ...p, topic: t });
  const topicBySlug = new Map(topics.map((t) => [t.slug, t]));
  const challengeById = new Map(practiceAll.map((c) => [c.id, c]));
  const errors = [];
  for (const f of fs.readdirSync(PATHS).filter((x) => x.endsWith('.json')).sort(natural)) {
    const def = readJson(path.join(PATHS, f));
    const used = new Set();
    const steps = (def.steps ?? []).map((st, i) => {
      const where = `${f}#steps[${i}]`;
      const fail = (msg) => {
        errors.push(`${where}: ${msg}`);
        return null;
      };
      if (st.type === 'guide' || st.type === 'interview') {
        const p = pageByKey.get(st.ref);
        if (!p) return fail(`unknown page "${st.ref}"`);
        used.add(p.topic.slug);
        return { type: st.type, ref: st.ref, label: st.label ?? p.title, url: p.url, topic: p.topic.slug, minutes: p.minutes, keys: [p.key] };
      }
      if (st.type === 'quiz' || st.type === 'flashcards') {
        const t = topicBySlug.get(st.ref);
        if (!t) return fail(`unknown topic "${st.ref}"`);
        if (st.type === 'quiz' && !t.quizCount) return fail(`topic "${st.ref}" has no quiz`);
        used.add(t.slug);
        const url = st.type === 'quiz' ? `/topics/${t.slug}#quiz` : `/flashcards?topic=${t.slug}`;
        const label = st.label ?? (st.type === 'quiz' ? `${t.title} quiz` : `${t.title} flashcards`);
        return { type: st.type, ref: st.ref, label, url, topic: t.slug, minutes: st.type === 'quiz' ? 10 : 15, keys: [] };
      }
      if (st.type === 'practice') {
        const c = challengeById.get(st.ref);
        if (!c) return fail(`unknown challenge "${st.ref}"`);
        used.add(c.topic);
        return { type: st.type, ref: st.ref, label: st.label ?? c.title, url: c.url, topic: c.topic, minutes: c.estimatedMinutes ?? 10, keys: [] };
      }
      return fail(`unknown step type "${st.type}" (want guide|quiz|flashcards|interview|practice)`);
    }).filter(Boolean);
    if (!def.slug || !def.title) errors.push(`${f}: missing slug/title`);
    if (!steps.length) errors.push(`${f}: no steps`);
    const minutes = steps.reduce((a, s) => a + s.minutes, 0);
    paths.push({ slug: def.slug, title: def.title, emoji: def.emoji ?? '🗺️', accent: def.accent ?? '#0D9488', blurb: def.blurb ?? '', estimatedHours: def.estimatedHours ?? Math.max(1, Math.round(minutes / 60)), order: def.order ?? 99, steps, minutes, topics: [...used] });
  }
  if (errors.length) {
    console.error(`[content] path errors:\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  paths.sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// System design prompts: content/design/<slug>.md with frontmatter (id,
// title, emoji, blurb, order, rubric[{dimension, points[]}]), a `## Brief`
// section (the prompt) and a `## Model answer` section. Emits design.json
// plus one JSON per prompt.
const DESIGN = path.join(CONTENT, 'design');
const designIndex = [];
if (fs.existsSync(DESIGN)) {
  const errors = [];
  for (const f of fs.readdirSync(DESIGN).filter((x) => x.endsWith('.md')).sort(natural)) {
    const file = path.join(DESIGN, f);
    const slug = f.replace(/\.md$/, '');
    const { data, content } = matter(fs.readFileSync(file, 'utf8'));
    const brief = (content.split(/^## Model answer\s*$/m)[0] ?? '').replace(/^## Brief\s*$/m, '').trim();
    const modelAnswer = (content.split(/^## Model answer\s*$/m)[1] ?? '').trim();
    if (!data.title) errors.push(`${f}: missing title`);
    if (!brief) errors.push(`${f}: missing ## Brief section`);
    if (!modelAnswer) errors.push(`${f}: missing ## Model answer section`);
    const rubric = Array.isArray(data.rubric) ? data.rubric : [];
    if (!rubric.length || rubric.some((r) => !r.dimension || !Array.isArray(r.points) || !r.points.length)) {
      errors.push(`${f}: rubric must list dimensions with points`);
    }
    const entry = {
      slug,
      title: data.title ?? titleCase(slug),
      emoji: data.emoji ?? '🏛️',
      blurb: data.blurb ?? '',
      order: data.order ?? 99,
      rubric: rubric.map((r) => ({ dimension: String(r.dimension), points: r.points.map(String) })),
      brief,
      url: `/design/${slug}`,
    };
    designIndex.push(entry);
    writeJson(path.join(OUT, 'design', `${slug}.json`), { ...entry, modelAnswer });
  }
  if (errors.length) {
    console.error(`[content] design errors:\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  designIndex.sort((a, b) => a.order - b.order);
  writeJson(path.join(OUT, 'design.json'), designIndex);
}

// De-duplicate cards by id (identical headings in one page).
const seen = new Set();
const uniqueCards = cards.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
const cardCount = {};
for (const c of uniqueCards) cardCount[c.t] = (cardCount[c.t] ?? 0) + 1;
for (const t of topics) t.cardCount = cardCount[t.slug] ?? 0;

writeJson(path.join(OUT, 'catalog.json'), {
  site: { name: 'Forgeline', tagline: 'Learn, practise and track software engineering — topic by topic.' },
  generatedAt: new Date().toISOString(),
  totals: { topics: topics.length, pages: totalPages, words: totalWords, minutes: totalMinutes, tracks: tracks.length, cards: uniqueCards.length, mcq: uniqueCards.filter((c) => c.src === 'mcq').length, practice: practiceAll.length },
  groups: groups.map((g) => ({ id: g.id, label: g.label, hint: g.hint, topics: g.topics.filter((s) => topics.some((t) => t.slug === s)) })),
  topics,
  tracks,
  paths,
  prepMap,
});
writeJson(path.join(OUT, 'search.json'), search);
writeJson(path.join(OUT, 'cards.json'), uniqueCards);

// Sitemap for crawlers (content pages + app routes + tool pages).
{
  const SITE = 'https://swe-forge.vercel.app';
  let toolSlugs = [];
  try {
    const reg = fs.readFileSync(path.join(ROOT, 'src', 'tools', 'registry.ts'), 'utf8');
    toolSlugs = [...reg.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]);
  } catch { /* tools not present */ }
  const urls = new Set(['/', '/prep-map', '/roadmaps', '/paths', '/plan', '/notes', '/visualize', '/design', '/flashcards', '/mock', '/arena', '/ai', '/skills', '/bookmarks', '/tools', '/practice']);
  for (const t of topics) {
    urls.add(`/topics/${t.slug}`);
    for (const p of t.pages) urls.add(p.url);
  }
  for (const ch of practiceAll) urls.add(ch.url);
  for (const s of toolSlugs) urls.add(`/tools/${s}`);
  for (const tr of tracks) urls.add(`/roadmaps/${tr.slug}`);
  for (const p of paths) urls.add(`/paths/${p.slug}`);
  for (const d of designIndex) urls.add(d.url);
  try {
    const reg = fs.readFileSync(path.join(ROOT, 'src', 'visualizers', 'registry.ts'), 'utf8');
    for (const m of reg.matchAll(/id:\s*'([\w-]+)'/g)) urls.add(`/visualize/${m[1]}`);
  } catch { /* visualizers not present */ }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), xml);
}

const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024);
console.log(
  `[content] ${topics.length} topics · ${totalPages} pages · ${totalWords.toLocaleString()} words · ${uniqueCards.length} cards` +
    ` · catalog ${kb('catalog.json')}KB · search ${kb('search.json')}KB · cards ${kb('cards.json')}KB`,
);
