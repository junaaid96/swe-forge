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

const manifest = readJson(path.join(CONTENT, 'manifest.json'));
const groups = manifest.groups ?? [{ id: 'all', label: 'Topics', hint: '', topics: manifest.topics.map((t) => t.slug) }];
const groupOf = Object.fromEntries(groups.flatMap((g) => g.topics.map((s) => [s, g.id])));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const search = [];
const cards = [];
const topics = [];
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
    for (const f of notes) fileToRoute.set(`${t.slug}/${f}`, pageUrl(t.slug, 'notes', f.replace(/\.md$/, '')));
    return { ...t, dir, notes, deep, interview };
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

  topics.push({
    slug: t.slug,
    title: meta.title,
    emoji: meta.emoji,
    tag: meta.tag,
    accent: meta.accent,
    blurb: meta.blurb ?? '',
    order: meta.order,
    group: groupOf[t.slug] ?? groups[0].id,
    related: meta.relatedTopics ?? [],
    quizCount: quiz.length,
    problemCount: (meta.problems ?? []).length,
    minutes: pages.reduce((n, p) => n + p.minutes, 0),
    pages,
  });
}

// ---------------------------------------------------------------------------
// Prep map: the topic-wise study map. Its "**Term**: definition" bullets become cards.
const PREP_MAP = path.join(CONTENT, 'prep-map.md');
let prepMap = null;
if (fs.existsSync(PREP_MAP)) {
  const md = rewriteLinks(matter(fs.readFileSync(PREP_MAP, 'utf8')).content.trim(), '');
  const a = analyse(md);
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

// De-duplicate cards by id (identical headings in one page).
const seen = new Set();
const uniqueCards = cards.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
const cardCount = {};
for (const c of uniqueCards) cardCount[c.t] = (cardCount[c.t] ?? 0) + 1;
for (const t of topics) t.cardCount = cardCount[t.slug] ?? 0;

writeJson(path.join(OUT, 'catalog.json'), {
  site: { name: 'Forgeline', tagline: 'Learn, practise and track software engineering — topic by topic.' },
  generatedAt: new Date().toISOString(),
  totals: { topics: topics.length, pages: totalPages, words: totalWords, minutes: totalMinutes, cards: uniqueCards.length, mcq: uniqueCards.filter((c) => c.src === 'mcq').length },
  groups: groups.map((g) => ({ id: g.id, label: g.label, hint: g.hint, topics: g.topics.filter((s) => topics.some((t) => t.slug === s)) })),
  topics,
  prepMap,
});
writeJson(path.join(OUT, 'search.json'), search);
writeJson(path.join(OUT, 'cards.json'), uniqueCards);

const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024);
console.log(
  `[content] ${topics.length} topics · ${totalPages} pages · ${totalWords.toLocaleString()} words · ${uniqueCards.length} cards` +
    ` · catalog ${kb('catalog.json')}KB · search ${kb('search.json')}KB · cards ${kb('cards.json')}KB`,
);
