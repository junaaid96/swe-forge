/** Shared route/meta computation for prerender.mjs and og.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SITE = 'https://swe-forge.vercel.app';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const KIND_LABEL = { notes: 'Guide', deep: 'Deep dive', interview: 'Interview prep', practice: 'Practice' };

function excerptOf(topicSlug, page) {
  try {
    const data = readJson(path.join(ROOT, 'public', 'data', 'pages', topicSlug, page.kind, `${page.id}.json`));
    const text = (data.markdown ?? data.items?.map((it) => `${it.question} ${it.answer}`).join(' ') ?? '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#>*_`|[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, 300);
  } catch {
    return '';
  }
}

/**
 * Every route that gets a prerendered HTML shell + OG image: topic pages,
 * guides, deep dives, interview pages and the prep map.
 */
export function buildRoutes() {
  const catalog = readJson(path.join(ROOT, 'public', 'data', 'catalog.json'));
  const groupOf = new Map();
  for (const g of catalog.groups ?? []) {
    for (const t of g.topics ?? []) groupOf.set(t, g.label);
  }
  const routes = [
    { path: '/', file: 'home', title: 'Forgeline · Software engineering study hub', ogTitle: 'Learn it. Drill it. Track it.', kind: 'Study hub', emoji: '🔥', group: 'Forgeline', desc: 'Topic-wise notes, interview Q&A, flashcards, mock interviews and a skill map. Everything runs in your browser.' },
    { path: '/prep-map', file: 'prep-map', title: 'Interview prep map · Forgeline', ogTitle: 'Interview prep map', kind: 'Checklist', emoji: '🗺️', group: 'Interview prep', desc: 'What to know in each area before an interview — every concept becomes a flashcard and can appear in a mock.' },
  ];
  for (const t of catalog.topics) {
    routes.push({
      path: `/topics/${t.slug}`,
      file: `topic-${t.slug}`,
      title: `${t.title} · Forgeline`,
      ogTitle: t.title,
      kind: 'Topic',
      emoji: t.emoji,
      group: groupOf.get(t.slug) ?? 'Topics',
      desc: t.blurb || `${t.title}: notes, interview Q&A, flashcards and quizzes.`,
    });
    for (const p of t.pages) {
      if (p.kind === 'practice') continue;
      routes.push({
        path: p.url,
        file: `${t.slug}-${p.kind}-${p.id}`,
        title: `${p.title} · ${t.title} · Forgeline`,
        ogTitle: p.title,
        kind: KIND_LABEL[p.kind] ?? p.kind,
        emoji: t.emoji,
        group: groupOf.get(t.slug) ?? 'Topics',
        desc: excerptOf(t.slug, p) || t.blurb || `${p.title} — ${t.title} study notes.`,
      });
    }
  }
  return routes;
}

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
