---
id: golang-interview-advanced
level: advanced
---

# Go — Interview (Advanced)

> Scheduler, memory model, GC, iterators, production. Pair with Go deep tracks.

## Q1. Explain the GMP scheduler and why Go suits I/O-bound servers.

**Answer:** Goroutines (G) run on OS threads (M) via scheduling contexts (P, count = `GOMAXPROCS`); idle Ps steal work from busy ones. Network waits park only the goroutine through the **netpoller** (epoll/kqueue) without holding a thread — so 100k idle connections cost kilobytes each, while the same in threads would exhaust memory and scheduler quanta. CPU-bound work still scales with GOMAXPROCS.

**Key takeaway:** Netpoller + cheap goroutines decouple connections from threads.

---

## Q2. What does "happens-before" mean in the Go memory model?

**Answer:** A read sees a write only if the write happens-before it. Edges come from: channel send→receive, mutex Unlock→Lock, `sync.Once` completion, atomic ops (sequentially consistent), `go` statement→goroutine start, and `WaitGroup.Done`→`Wait` return. Sharing outside these edges — including "benign" flag reads — is a data race, caught by `-race`.

**Key takeaway:** No edge, no guarantee — -race enforces the model's promises.

---

## Q3. Green Tea GC and GOMEMLIMIT — how do you size memory?

**Answer:** Green Tea (1.26 default) is a low-pause concurrent collector; leave `GOGC` at default and set **`GOMEMLIMIT`** to ~80% of the container limit so the runtime paces GC against a real RSS target. Tune only after profiling: cut allocations (pooling, concrete types over `any` on hot paths, pre-sized slices), check `heap`/`allocs`/`goroutine` pprof, and diff profiles before/after. Manual `GC()` and `SetGCPercent(-1)` are batch-job tools, not server tools.

**Key takeaway:** GOMEMLIMIT at 80% of the cap, profile first, tune allocations before knobs.

---

## Q4. How do range-over-func iterators work? When do they beat slices?

**Answer:** `iter.Seq[T]` is `func(yield func(T) bool)` — `range` drives it, and `yield` returning false stops early (how `break` propagates). They beat slices for lazy/infinite/expensive sequences (file lines, paginated APIs, combinatorial generation) and compose (`Where`, `Map` over `Seq`). They lose for random access, length checks, and reuse — materialize with `slices.Collect` when you need those.

**Key takeaway:** Seq = lazy pull with early exit; collect to a slice when you need indexing or reuse.

---

## Q5. Design graceful shutdown for a Kubernetes Go service.

**Answer:** `signal.NotifyContext` on SIGTERM/SIGINT → stop accepting (in-flight continues) → `server.Shutdown` with a timeout context fitting inside `terminationGracePeriodSeconds` → wait for worker `WaitGroup` → flush telemetry → exit 0; log + exit non-zero if the drain times out. Liveness must not fail during drain; readiness should flip the moment shutdown starts so endpoints remove the pod.

**Key takeaway:** Drain inside the grace window, flip readiness first, non-zero exit on failed drain.

---

## Q6. Escape analysis: why does returning `&local` sometimes cost nothing?

**Answer:** The compiler proves whether a value outlives its frame (`go build -gcflags=-m`). Small returned structs often stay stack-allocated via caller space; escapes happen when values flow into interfaces, channels, maps, closures that outlive the call, or heap structures. Hot-path rules: return values over pointers for small types, pre-size slices, keep concrete types (each `any` conversion can force an escape), and confirm with `-benchmem` allocation counts.

**Key takeaway:** Escapes are compiler-proven per call site — read -m output, verify with -benchmem.
