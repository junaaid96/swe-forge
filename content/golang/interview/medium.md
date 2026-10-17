---
id: golang-interview-medium
level: medium
---

# Go — Interview (Medium)

> Context, sync, generics, interfaces, testing. Pair with Go notes 2–4.

## Q1. How does context.Context propagate cancellation?

**Answer:** A parent context created with `WithCancel/WithTimeout` carries a done channel; children derived from it close when the parent does. Request handlers start from `r.Context()` (canceled on client disconnect), pass `ctx` as arg 1 through service → store → driver, and every blocking call selects on `<-ctx.Done()`. Always `defer cancel()` to release timers. Values carry trace IDs only — never business params.

**Key takeaway:** Cancel once at the top, select on Done everywhere below, defer cancel always.

---

## Q2. Mutex vs channels vs atomics — how do you choose?

**Answer:** **Channels** for ownership transfer and signaling between goroutines ("share by communicating"). **Mutex/RWMutex** for guarding shared state with mostly straightforward critical sections. **Atomics** (`atomic.Int64`) for single counters/flags on hot paths. Decide per datum and document it; mixed strategies on one variable cause races. Prove it with `go test -race` under `-count` and load.

**Key takeaway:** Channels transfer, mutexes guard, atomics count — one strategy per variable.

---

## Q3. Explain the typed-nil interface gotcha with a fix.

**Answer:** Interfaces store (type, value). Returning a typed nil pointer as `error` — `var e *MyErr; return e` — yields a **non-nil** interface (it has a type descriptor), so `err != nil` is true with no actual error. Fix: return literal `nil` on success paths, construct the error value at the return site, and keep error construction inside the failing branch.

**Key takeaway:** (type, nil-value) ≠ nil interface — return literal nil, build errors where they fail.

---

## Q4. When do generics earn their place? Give an example.

**Answer:** For containers, algorithms, and adapters — not business logic. `func Map[T, U any](s []T, f func(T) U) []U`, `Keys[K comparable, V any](m map[K]V)`, numeric unions with `~int | ~float64`. Constraints document requirements (`comparable` for map keys). If a generic function is only ever instantiated once, inline it — abstraction without reuse is just indirection.

**Key takeaway:** Generics for data structures and algorithms; concrete code for domain logic.

---

## Q5. How do you test an HTTP handler and time-dependent code?

**Answer:** Handlers: `httptest.NewRequest` + `NewRecorder`, table-driven cases over methods/bodies/status codes — no network needed. Time: inject a clock interface, or use `testing/synctest` (1.25+) to run with a virtual clock where sleeps advance instantly and deterministically. Concurrency: `t.Parallel`, `-race`, and `-run` stress loops; assert with `assertNumQueries`-style counters where behavior must be exact.

**Key takeaway:** httptest tables for handlers, synctest/clocks for time, -race for concurrency.

---

## Q6. `select_related`-style question for Go: how do you bound 10k outbound fetches?

**Answer:** Never 10k raw goroutines. Use `errgroup.Group` with `SetLimit(32)` (or a worker pool over a jobs channel), per-request timeouts via context, always-closed response bodies, indexed result slots to avoid map races, and retry with capped exponential backoff + jitter for 429/5xx only. Cancel the group on fatal errors or shutdown signals.

**Key takeaway:** Bounded fan-out (errgroup limit), timeouts, closed bodies, indexed results.
