# Forgeline

**Live:** [swe-forge.vercel.app](https://swe-forge.vercel.app/)

**Forgeline** is a fast, static study hub for software engineering: guides, deep dives, interview Q&A, MCQ test prep, spaced-repetition flashcards, timed mock interviews and a skill map. It all runs in the browser. Progress lives in `localStorage`, and there is no account or backend to run.

> Forgeline merges two earlier projects: **SWE Forge** (this repository) and **PrepShelf** (static Markdown guides plus interview MCQs). All PrepShelf content now lives under `content/`, in one taxonomy.

## Features

- **28 topics in 9 groups:** Interview prep, Engineering craft, Languages, Frontend, Backend, CS foundations, Systems & data, DevOps & security, AI/ML. 115 Markdown pages in all.
- **Quizzes and practice on every topic:** 200 MCQs and 80 practice problems across all 28 topics, defined in each topic's `meta.json`.
- **Readers for every kind of page:** guides (`notes`), six deep-dive tracks, and interview Q&A in four levels. Each has a table of contents with scroll spy, syntax highlighting, copyable code blocks, heading anchors, a reading progress bar and prev/next navigation.
- **Prep map** (`/prep-map`): a topic-wise interview checklist that links every area to where it is covered.
- **Command palette search** (`Ctrl/⌘ K` or `/`): section-level full-text search across all content.
- **Spaced-repetition flashcards** (`/flashcards`): cards are generated automatically from interview Q&A, guide sections, prep-map definitions and topic MCQs. A daily review queue is scheduled with SM-2 intervals (Again / Hard / Good / Easy). You can pick decks per topic and card type and set a new-cards-per-day limit. A card counts as mastered once its interval reaches 21 days.
- **Mock interview mode** (`/mock`): a timed session of random questions across the topics you choose. You answer MCQs directly and self-grade open questions. At the end you get a score summary with per-topic results, weak areas linked to study material, a list of missed questions with "add to flashcards", and your session history.
- **Skill map dashboard** (`/skills`): a radar chart of every topic group plus a roadmap of all topics. Each tile shows pages read, cards mastered and quiz/mock scores, along with a ranked "what to study next" list. You can also export, import or reset your progress.
- **Progress tracking:** read/bookmark state, quiz scores, solved practice problems and a daily streak.
- **Footer credit:** a "Developed by `<CodeJBorg />`" pill linking to [junaidul.pro.bd/codejborg](https://junaidul.pro.bd/codejborg).
- **UX:** light/dark theme with no flash on load, responsive layout with a mobile drawer, keyboard shortcuts (`?` lists them), a skip link, ARIA-labelled navigation and dialogs, reduced-motion support and print styles.

## Quick start

```bash
npm install
npm run dev        # compiles content, then starts Vite on http://localhost:5173
npm run build      # compiles content, type-checks, builds to dist/
npm run preview    # serves dist/
npm run lint       # oxlint
```

Requires Node 20+ (tested on Node 22).

| Script | What it does |
|---|---|
| `npm run content` | compile `content/` into static JSON in `public/data/` (runs automatically via `predev` / `prebuild`) |
| `npm run dev` | Vite dev server (frontend only, which is all the site needs) |
| `npm run dev:full` | Vite + the optional Express API together |
| `npm run dev:api` / `npm run start:api` | optional legacy Express API in `server/` |

## Content quality

The content was reviewed after the merge: leaked citation markup (e.g. `<cite index=…>`) was stripped, placeholder interview answers were replaced with complete ones, wrong quiz answer keys and explanations were fixed, personal references were neutralised, internal links were repaired, and version facts (e.g. Spring Boot 4) were brought up to date. When editing content, keep it plain Markdown with no tool-generated markup.

## Content model

```
content/
  manifest.json               groups + topic order
  prep-map.md                 topic-wise prep map
  <topic>/
    meta.json                 title, emoji, group, blurb, quiz[], problems[], relatedTopics[]
    notes/*.md                guides (most came from PrepShelf)
    deep/<track>.md           theory | internals | best-practices | real-world-projects | performance | pitfalls
    interview/<level>.md      basics | medium | advanced | company-specific
```

- **Interview files** use `## Q1. Question` headings with `**Answer:**`, `**Example:**`, `**Key takeaway:**` and `**Interview tip:**` sections. These headings feed the practice mode, flashcards and mock interviews.
- **Guides** are plain Markdown. `> **Asked as:** …` blockquotes render as interview callouts. Relative `.md` links are rewritten to site routes.
- **Topic quizzes** in `meta.json` appear on topic pages and become MCQ flashcards and mock questions.
- To **add a topic**, create `content/<slug>/meta.json` plus Markdown files, then add the slug to a group in `content/manifest.json`. `scripts/build-content.mjs` does the rest.

The compiler writes `catalog.json`, `search.json`, `cards.json`, per-topic extras and one JSON file per page. Pages load lazily, so the first load stays small. `public/data/` is generated and git-ignored.

## Progress storage

Everything is stored in your browser's `localStorage`:

| Key | Contents |
|---|---|
| `forgeline:progress:v1` | pages read, bookmarks, quiz scores, problems, SRS card state, mock history, streak |
| `forgeline:theme` | `light` / `dark` |

Progress saved by the old SWE Forge app (`swe-forge-progress-v2`) is migrated automatically on first load. Use **Skill map → Export** to back up or move progress between browsers.

## Deployment

The frontend is a static Vite build deployed on **Vercel**. Vercel runs `npm run build`, which compiles the content first, and serves `dist/`. `vercel.json` rewrites client routes such as `/topics/java` to `index.html`, so deep links and refreshes work.

`server/` holds the original Express API. The frontend no longer calls it, but it is kept unchanged for the separately deployed API project. It can be retired later.

## Project layout

```
src/
  lib/          content loading, progress store, SM-2 scheduler, stats, theme, hotkeys
  components/   layout, sidebar, command palette, markdown renderer, charts, quiz/practice panels
  pages/        home, topic, reader, flashcards, mock, skill map, bookmarks
  styles/       global.css (tokens, themes, layout), prose.css (reading typography)
scripts/build-content.mjs
content/
server/         optional Express API (legacy)
```
