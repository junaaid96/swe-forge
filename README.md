# SWE Forge

Depth-first software engineering learning platform — React frontend + Node/Express content API.

## Features

- **25 topics** with detailed lessons, practical code, quizzes, and practice problems
- Backend depth track: concurrency, immutability, design patterns, caching, messaging, idempotency, auth/TLS, TDD
- Foundations: networking, OS, GraphQL/gRPC, plus original core curriculum
- **Interview Guide** (secondary): roadmap, DSA patterns, system design prompts, STAR behavioral, CS MCQ
- Scoreboard + local progress
- Search across lessons and interview content

## Run locally

```bash
npm install
npm --prefix server install
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001/api/health  

`npm run dev` starts API + Vite together (Vite proxies `/api` → `:3001`).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | API + web |
| `npm run dev:web` | Vite only (uses fallback JSON if API down) |
| `npm run dev:api` | Express API only |
| `npm run build` | Production client build |

## Architecture

- `server/data/topics/catalog.json` — curriculum source of truth
- `server/data/interview/guide.json` — interview banks
- `src/data/*.fallback.json` — offline fallback copies
- Progress stored in browser `localStorage`
