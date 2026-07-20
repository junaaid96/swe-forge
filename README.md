# SWE Forge

Topic-wise software engineering learning platform — **Interview** + **Deep** per subject. React frontend + Node/Express content API.

## Content model

Authoring lives under [`content/`](content/):

```
content/
├── manifest.json
└── <topic>/
    ├── meta.json          # quiz, problems, relatedTopics
    ├── interview/
    │   ├── basics.md
    │   ├── medium.md
    │   ├── advanced.md
    │   └── company-specific.md
    └── deep/
        ├── theory.md
        ├── internals.md
        ├── best-practices.md
        ├── real-world-projects.md
        ├── performance.md
        └── pitfalls.md
```

Interview MD uses Q&A blocks (`**Answer:**` / `**Example:**` / `**Key takeaway:**`). Deep MD uses `##` sections.

## Run locally

```bash
npm install
npm --prefix server install
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001/api/health  

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | API + web |
| `npm run scaffold:content` | Create topic folders + placeholders |
| `npm run migrate:content` | Migrate Java/Spring MD + old JSON catalog into `content/` |
| `npm run build` | Production client build |

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/topics` | Topic summaries |
| `GET /api/topics/:slug` | Topic detail + quiz/problems |
| `GET /api/topics/:slug/interview/:level` | Interview Q&A |
| `GET /api/topics/:slug/deep/:track` | Deep lesson |
| `GET /api/search?q=` | Search topics, interview, deep |

## Routes

- `/` — topic grid
- `/topics/:slug` — hub (Interview / Deep / Quiz / Practice)
- `/topics/:slug/interview/:level`
- `/topics/:slug/deep/:track`
- `/scoreboard`

Legacy `/learn/:slug` and `/interview/:id` redirect into the new routes.

## Notes

- Progress is stored in `localStorage` (`swe-forge-progress-v2`)
- Restart the API after editing Markdown under `content/`
- Offline fallback: [`src/data/topics.fallback.json`](src/data/topics.fallback.json)
