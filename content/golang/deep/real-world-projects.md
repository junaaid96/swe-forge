---
id: golang-deep-real-world-projects
track: real-world-projects
---

# Go — Deep: Real-World Projects

> Three builds that teach production instincts: a JSON API, a worker pool, and a CLI with real I/O.

---

## Lab 1 — JSON API with stdlib only

**Goal:** `GET /users/{id}`, `POST /users` with validation, JSON errors, middleware, graceful shutdown — no framework.

1. Route with `ServeMux` method patterns; middleware chain: request-id → logging → recover → auth.
2. Handlers decode with `json.Decoder` + `DisallowUnknownFields`, validate (hand checks or a small validator), encode with status codes.
3. Errors as JSON: `{"error": {"code": "not_found", "message": "…"}}` + correct status.
4. `httptest` table tests per endpoint; `go vet` + `-race` clean.
5. **Move learned:** stdlib sufficiency — you now know exactly what a framework would add (and cost).

## Lab 2 — Bounded worker pool crawler

**Goal:** fetch 1k URLs, ≤32 concurrent, retries with backoff, aggregate stats, cancel on Ctrl-C.

1. `errgroup.Group` + `SetLimit(32)`; per-request timeout via context; always close bodies.
2. Retry helper: exponential backoff with jitter, max 3 attempts, retry only 429/5xx.
3. Collect results into indexed slots (no map races); print p50/p99 latencies.
4. `signal.NotifyContext` cancels everything; workers exit on `ctx.Done()`.
5. **Move learned:** bounded fan-out + cancellation — the shape of every Go pipeline.

## Lab 3 — grep-lite CLI with iterators

**Goal:** `gogrep -i pattern files...` streaming matches with `iter.Seq`, tested with `synctest`-free pure functions.

1. Walk files with `filepath.WalkDir`; stream lines via a `Seq[Line]` scanner (no full-file reads).
2. Case-insensitive match, `-n` line numbers, count mode; exit code 1 when no match (grep semantics).
3. Factor matching into pure functions — table-test them; keep I/O at the edges.
4. Benchmark buffer sizes with `-benchmem`; try `unique` interning for repeated filenames.
5. **Move learned:** lazy `iter.Seq` pipelines + testable core — Go CLI craft.

---

## Key takeaway

Three shapes cover backend Go: request/response handlers, bounded worker pools, streaming CLI pipelines. Build each once with stdlib only and framework docs become skimmable.
