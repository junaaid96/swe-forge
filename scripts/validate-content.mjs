#!/usr/bin/env node
/**
 * Forgeline content validator.
 *
 * Checks every content source file without writing anything:
 *   meta.json schema (required fields, quiz answer index in range,
 *     explanation present, no duplicate ids)
 *   manifest references real topics (and flags orphaned topic dirs)
 *   interview files use `## Qn.` with a non-empty Answer
 *   relative .md links resolve to a real notes file
 *   no leaked tool markup (`<cite`, `antml`)
 *   no placeholder text (TODO, lorem, coming-soon) in prose
 *   balanced code fences
 *   no duplicate page/challenge slugs within a topic
 *
 * Prints `file:line: message` diagnostics. Exits non-zero when any error
 * is found, unless --warn-only is passed (used by `predev`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const WARN_ONLY = process.argv.includes('--warn-only');

const INTERVIEW_LEVELS = ['basics', 'medium', 'advanced', 'company-specific'];
const DEEP_TRACKS = ['theory', 'internals', 'best-practices', 'real-world-projects', 'performance', 'pitfalls'];

/** @type {Array<{ file: string, line: number, kind: 'error' | 'warning', msg: string }>} */
const findings = [];
const rel = (p) => path.relative(ROOT, p);
const err = (file, line, msg) => findings.push({ file: rel(file), line, kind: 'error', msg });
const warn = (file, line, msg) => findings.push({ file: rel(file), line, kind: 'warning', msg });

const mdFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : []);

/** Split lines into prose vs fenced-code masks so prose-only checks skip code. */
function fenceMask(lines) {
  const inFence = new Array(lines.length).fill(false);
  let fence = null;
  let fenceStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(```+|~~~+)/);
    if (m) {
      if (!fence) {
        fence = m[1][0];
        fenceStart = i;
      } else if (m[1][0] === fence) {
        fence = null;
        fenceStart = -1;
      }
      inFence[i] = true;
      continue;
    }
    inFence[i] = fence !== null;
  }
  return { inFence, unclosedAt: fence ? fenceStart : -1 };
}

const LEAK_RES = [/<cite[\s>]/i, /antml/i];
const PLACEHOLDER_RES = [/\bTODO\b/, /FIXME/, /lorem/i, /content coming soon/i];
// A bare "TBD" line is a placeholder; the acronym in prose (e.g. trunk-based
// development) is legitimate, so it is matched separately below.
const STANDALONE_TBD_RE = /^\s*TBD\.?\s*$/i;

function checkProseHygiene(file, lines, inFence) {
  lines.forEach((line, i) => {
    for (const re of LEAK_RES) {
      if (re.test(line)) err(file, i + 1, `leaked tool markup (${re.source})`);
    }
    if (inFence[i]) return;
    // Allow TODO inside practice starter/solution fences only — those lines are
    // fenced, so any TODO reaching here is genuinely in prose.
    for (const re of PLACEHOLDER_RES) {
      if (re.test(line)) err(file, i + 1, `placeholder text (${re.source})`);
    }
    if (STANDALONE_TBD_RE.test(line.replace(/^\*+\s*|\s*\*+$/g, ''))) err(file, i + 1, 'placeholder text (standalone TBD)');
  });
}

// ---------------------------------------------------------------------------
// Topics + meta.json
// ---------------------------------------------------------------------------

const manifestPath = path.join(CONTENT, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const topicDirs = fs
  .readdirSync(CONTENT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(CONTENT, d.name, 'meta.json')))
  .map((d) => d.name);

/** slug -> notes file set, for link resolution */
const notesFiles = new Map();

for (const slug of topicDirs) {
  const dir = path.join(CONTENT, slug);
  const metaPath = path.join(dir, 'meta.json');
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch (e) {
    err(metaPath, 1, `invalid JSON: ${(e instanceof Error && e.message) || e}`);
    continue;
  }
  for (const f of ['id', 'slug', 'title', 'emoji', 'group', 'blurb']) {
    if (typeof meta[f] !== 'string' || !meta[f].trim()) err(metaPath, 1, `meta.json: "${f}" must be a non-empty string`);
  }
  if (meta.slug && meta.slug !== slug) err(metaPath, 1, `meta.json: slug "${meta.slug}" does not match directory "${slug}"`);

  const seenIds = new Map(); // id -> where
  const claimId = (id, where) => {
    if (!id) return;
    if (seenIds.has(id)) err(metaPath, 1, `meta.json: duplicate id "${id}" (${seenIds.get(id)} vs ${where})`);
    else seenIds.set(id, where);
  };
  for (const [qi, q] of (meta.quiz ?? []).entries()) {
    const where = `quiz[${qi}]`;
    if (typeof q.id !== 'string' || !q.id.trim()) err(metaPath, 1, `meta.json: ${where} is missing an id`);
    claimId(q.id, where);
    if (typeof q.question !== 'string' || !q.question.trim()) err(metaPath, 1, `meta.json: ${where} ("${q.id}") has an empty question`);
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.some((o) => typeof o !== 'string' || !o.trim())) {
      err(metaPath, 1, `meta.json: ${where} ("${q.id}") needs at least 2 non-empty options`);
    }
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= (q.options ?? []).length) {
      err(metaPath, 1, `meta.json: ${where} ("${q.id}") has correctIndex ${JSON.stringify(q.correctIndex)} out of range`);
    }
    if (typeof q.explanation !== 'string' || !q.explanation.trim()) {
      err(metaPath, 1, `meta.json: ${where} ("${q.id}") is missing an explanation`);
    }
  }
  for (const [pi, p] of (meta.problems ?? []).entries()) {
    const where = `problems[${pi}]`;
    if (typeof p.id !== 'string' || !p.id.trim()) err(metaPath, 1, `meta.json: ${where} is missing an id`);
    claimId(p.id, where);
    if (typeof p.solution !== 'string' || !p.solution.trim()) err(metaPath, 1, `meta.json: ${where} ("${p.id}") has an empty solution`);
  }
  if (Array.isArray(meta.relatedTopics)) {
    for (const r of meta.relatedTopics) {
      if (!topicDirs.includes(r)) warn(metaPath, 1, `meta.json: relatedTopic "${r}" has no content directory`);
    }
  }

  // Duplicate page/challenge slugs within the topic.
  const slugs = new Map();
  const claimSlug = (kind, file, id) => {
    const key = `${kind}/${id}`;
    if (slugs.has(key)) err(path.join(dir, kind, file), 1, `duplicate slug "${key}" in this topic`);
    else slugs.set(key, true);
  };
  const notes = mdFiles(path.join(dir, 'notes'));
  notesFiles.set(slug, new Set(notes));
  for (const f of notes) claimSlug('notes', f, f.replace(/\.md$/, ''));
  for (const t of DEEP_TRACKS) {
    if (mdFiles(path.join(dir, 'deep')).includes(`${t}.md`)) claimSlug('deep', `${t}.md`, t);
  }
  for (const l of INTERVIEW_LEVELS) {
    if (mdFiles(path.join(dir, 'interview')).includes(`${l}.md`)) claimSlug('interview', `${l}.md`, l);
  }
  for (const f of mdFiles(path.join(dir, 'practice'))) {
    const id = f.replace(/\.md$/, '');
    claimSlug('practice', f, id);
    claimId(id, `practice/${f}`);
  }
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

const manifestSlugs = new Set();
for (const g of manifest.groups ?? []) {
  for (const t of g.topics ?? []) {
    if (!topicDirs.includes(t)) err(manifestPath, 1, `manifest: group "${g.id}" references missing topic "${t}"`);
  }
}
for (const t of manifest.topics ?? []) {
  const slug = t.slug ?? t.id;
  if (!topicDirs.includes(slug)) err(manifestPath, 1, `manifest: topics[] entry "${slug}" has no content directory`);
  if (manifestSlugs.has(slug)) err(manifestPath, 1, `manifest: duplicate topic slug "${slug}"`);
  manifestSlugs.add(slug);
}
const grouped = new Set((manifest.groups ?? []).flatMap((g) => g.topics ?? []));
for (const slug of topicDirs) {
  if (!grouped.has(slug)) warn(manifestPath, 1, `manifest: topic "${slug}" is not in any group`);
}

// ---------------------------------------------------------------------------
// Learning paths: content/paths/<slug>.json (mirrors the compiler's rules)
// ---------------------------------------------------------------------------

const PATH_TYPES = new Set(['guide', 'quiz', 'flashcards', 'interview', 'practice']);
const metaCache = new Map();
const metaOf = (slug) => {
  if (!metaCache.has(slug)) {
    try {
      metaCache.set(slug, JSON.parse(fs.readFileSync(path.join(CONTENT, slug, 'meta.json'), 'utf8')));
    } catch {
      metaCache.set(slug, null);
    }
  }
  return metaCache.get(slug);
};
const PATHS_DIR = path.join(CONTENT, 'paths');
if (fs.existsSync(PATHS_DIR)) {
  for (const f of fs.readdirSync(PATHS_DIR).filter((x) => x.endsWith('.json')).sort()) {
    const file = path.join(PATHS_DIR, f);
    let def;
    try {
      def = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      err(file, 1, `invalid JSON: ${(e instanceof Error && e.message) || e}`);
      continue;
    }
    if (typeof def.slug !== 'string' || !def.slug.trim()) err(file, 1, 'path: "slug" must be a non-empty string');
    if (typeof def.title !== 'string' || !def.title.trim()) err(file, 1, 'path: "title" must be a non-empty string');
    if (!Array.isArray(def.steps) || !def.steps.length) {
      err(file, 1, 'path: "steps" must be a non-empty array');
      continue;
    }
    def.steps.forEach((st, i) => {
      const where = `steps[${i}]`;
      if (!st || !PATH_TYPES.has(st.type)) {
        err(file, 1, `path: ${where} has unknown type "${st?.type}" (want guide|quiz|flashcards|interview|practice)`);
        return;
      }
      if (typeof st.ref !== 'string' || !st.ref.trim()) {
        err(file, 1, `path: ${where} is missing a ref`);
        return;
      }
      if (st.type === 'guide' || st.type === 'interview') {
        const [topic, kind, id] = st.ref.split('/');
        if (!topicDirs.includes(topic) || !['notes', 'deep', 'interview'].includes(kind) || !id) {
          err(file, 1, `path: ${where} ref "${st.ref}" must look like "topic/notes|deep|interview/id"`);
        } else if (!fs.existsSync(path.join(CONTENT, topic, kind, `${id}.md`))) {
          err(file, 1, `path: ${where} ref "${st.ref}" points at a missing page`);
        }
      } else if (st.type === 'quiz' || st.type === 'flashcards') {
        if (!topicDirs.includes(st.ref)) {
          err(file, 1, `path: ${where} ref "${st.ref}" is not a real topic`);
        } else if (st.type === 'quiz' && !(metaOf(st.ref)?.quiz?.length)) {
          err(file, 1, `path: ${where} topic "${st.ref}" has no quiz`);
        }
      } else if (st.type === 'practice') {
        const [topic, slug] = st.ref.split('/');
        const meta = topicDirs.includes(topic) ? metaOf(topic) : null;
        const legacy = meta?.problems?.some((p) => p.id === slug);
        const fileChallenge = topic && slug && fs.existsSync(path.join(CONTENT, topic, 'practice', `${slug}.md`));
        if (!legacy && !fileChallenge) err(file, 1, `path: ${where} ref "${st.ref}" is not a real challenge`);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Markdown files
// ---------------------------------------------------------------------------

/** Same shape as the compiler's rewriteLinks: only notes files are linkable. */
const MD_LINK_RE = /\]\((\.\.\/([\w-]+)\/|\.\/)?([\w.-]+\.md)(#[^)]*)?\)/g;

function checkMdLinks(file, slug, lines, inFence) {
  lines.forEach((line, i) => {
    if (inFence[i]) return;
    MD_LINK_RE.lastIndex = 0;
    let m;
    while ((m = MD_LINK_RE.exec(line))) {
      const otherSlug = m[2];
      const target = m[3];
      const topicSlug = otherSlug || slug;
      if (otherSlug && !topicDirs.includes(otherSlug)) {
        err(file, i + 1, `link to unknown topic "${otherSlug}" (${m[0]})`);
        continue;
      }
      if (!topicSlug) {
        err(file, i + 1, `relative link needs a topic prefix here (${m[0]})`);
        continue;
      }
      if (!notesFiles.get(topicSlug)?.has(target)) {
        err(file, i + 1, `link target does not resolve: ${topicSlug}/notes/${target}`);
      }
    }
  });
}

function checkInterviewFile(file, lines) {
  // Collect `## Qn.` blocks (outside fences).
  const { inFence } = fenceMask(lines);
  /** @type {Array<{ n: number, line: number, text: string }>} */
  const blocks = [];
  let current = null;
  lines.forEach((line, i) => {
    if (inFence[i]) return;
    const h = line.match(/^##\s+(Q(\d+)\.\s*.*)$/i);
    if (h) {
      if (current) blocks.push(current);
      current = { n: Number(h[2]), line: i + 1, text: '' };
      return;
    }
    if (/^##\s+/.test(line) && current) {
      blocks.push(current);
      current = null;
      return;
    }
    if (current) current.text += `${line}\n`;
  });
  if (current) blocks.push(current);

  // A `## ...?` heading without the Qn. prefix is almost certainly a typo.
  lines.forEach((line, i) => {
    if (inFence[i]) return;
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h && !/^Q\d+\./i.test(h[1]) && (h[1].includes('?') || /^(question|q)\b/i.test(h[1]))) {
      warn(file, i + 1, `interview heading is not in "## Qn." form: "${h[1].slice(0, 60)}"`);
    }
  });

  // Numbering may continue across levels (e.g. medium starts at Q55), so only
  // require strictly increasing numbers within a file.
  blocks.forEach((b, idx) => {
    if (idx > 0 && b.n <= blocks[idx - 1].n) warn(file, b.line, `question numbers go backwards (Q${b.n} follows Q${blocks[idx - 1].n})`);
    const grab = (label, stops) =>
      b.text.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*(?:${stops}):|\\n---|$)`, 'i'))?.[1]?.trim() ?? '';
    const answer = grab('Answer', 'Example|Key takeaway|Interview tip');
    if (!answer) {
      err(file, b.line, `Q${b.n} has no **Answer:** section`);
    } else if (/^(content coming soon|TBD\.?)$/i.test(answer)) {
      err(file, b.line, `Q${b.n} has an empty placeholder answer`);
    }
    // Example / takeaway / tip are recommended but not universal in older files.
    if (!grab('Example', 'Key takeaway|Interview tip|Answer') && !grab('Key takeaway', 'Interview tip|Answer|Example') && !grab('Interview tip', 'Answer|Example|Key takeaway')) {
      warn(file, b.line, `Q${b.n} has an Answer but no Example / Key takeaway / Interview tip`);
    }
  });
}

let visualizerIds = null;
function getVisualizerIds() {
  if (visualizerIds) return visualizerIds;
  try {
    const reg = fs.readFileSync(path.join(ROOT, 'src', 'visualizers', 'registry.ts'), 'utf8');
    visualizerIds = new Set([...reg.matchAll(/id:\s*'([\w-]+)'/g)].map((m) => m[1]));
  } catch {
    visualizerIds = new Set();
  }
  return visualizerIds;
}

function checkMarkdownFile(file, slug, { interview }) {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split('\n');
  const { inFence, unclosedAt } = fenceMask(lines);
  if (unclosedAt >= 0) err(file, unclosedAt + 1, 'unbalanced code fence (never closed)');
  checkProseHygiene(file, lines, inFence);
  checkMdLinks(file, slug, lines, inFence);
  lines.forEach((line, i) => {
    if (inFence[i]) return;
    for (const m of line.matchAll(/::visualizer\{id="([^"]*)"\}/g)) {
      if (!getVisualizerIds().has(m[1])) err(file, i + 1, `unknown visualizer id "${m[1]}"`);
    }
  });
  if (interview) checkInterviewFile(file, lines);
}

for (const slug of topicDirs) {
  const dir = path.join(CONTENT, slug);
  for (const sub of ['notes', 'deep', 'interview', 'practice']) {
    for (const f of mdFiles(path.join(dir, sub))) {
      checkMarkdownFile(path.join(dir, sub, f), slug, { interview: sub === 'interview' });
    }
  }
}
const prepMap = path.join(CONTENT, 'prep-map.md');
if (fs.existsSync(prepMap)) checkMarkdownFile(prepMap, '', { interview: false });

// ---------------------------------------------------------------------------
// System design prompts: content/design/<slug>.md
// ---------------------------------------------------------------------------

const DESIGN_DIR = path.join(CONTENT, 'design');
if (fs.existsSync(DESIGN_DIR)) {
  for (const f of fs.readdirSync(DESIGN_DIR).filter((x) => x.endsWith('.md')).sort()) {
    const file = path.join(DESIGN_DIR, f);
    const raw = fs.readFileSync(file, 'utf8');
    checkMarkdownFile(file, '', { interview: false });
    const { data, content } = matter(raw);
    if (typeof data.title !== 'string' || !data.title.trim()) err(file, 1, 'design: frontmatter "title" is required');
    if (!/^## Brief\s*$/m.test(content)) err(file, 1, 'design: missing ## Brief section');
    if (!/^## Model answer\s*$/m.test(content)) err(file, 1, 'design: missing ## Model answer section');
    const rubric = data.rubric;
    if (!Array.isArray(rubric) || !rubric.length || rubric.some((r) => !r?.dimension || !Array.isArray(r.points) || !r.points.length)) {
      err(file, 1, 'design: frontmatter "rubric" must list dimensions with points');
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.msg.localeCompare(b.msg));
for (const f of findings) {
  console.log(`${f.file}:${f.line}: ${f.kind}: ${f.msg}`);
}
const errors = findings.filter((f) => f.kind === 'error').length;
const warnings = findings.filter((f) => f.kind === 'warning').length;
console.log(`\nvalidate-content: ${errors} error(s), ${warnings} warning(s) across ${topicDirs.length} topics.`);
if (errors && !WARN_ONLY) process.exit(1);
