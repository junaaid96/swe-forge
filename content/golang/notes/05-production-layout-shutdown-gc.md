# 5. Production Go — Layout, Shutdown, GC and Profiling

Shipping Go means boring reliability: predictable layout, graceful shutdown, cheap observability, and a GC you rarely tune (Green Tea in 1.26 made it even rarer).

> **Asked as:** "How do you structure a Go service? How do you debug a memory leak in production?"

---

## Project layout that scales

```text
cmd/api/main.go          # thin main: wire deps, handle signals
internal/
  http/                  # handlers, middleware, routing
  service/               # business logic (no HTTP types)
  store/                 # persistence interfaces + postgres impl
pkg/                     # only what other modules import
```

Rules: `internal/` keeps others out; `main` only wires and runs; depend on interfaces defined by the consumer (`store.UserStore` lives near `service`); one `go.mod` per deployable. `go tool` (1.24) pins codegen/lint tools in the module.

---

## Graceful shutdown (the standard shape)

```go
ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
defer stop()
go func() { _ = srv.ListenAndServe() }()

<-ctx.Done()                                    // signal received
shutCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
if err := srv.Shutdown(shutCtx); err != nil {   // drains in-flight, closes idle
    log.Fatal(err)                              // non-zero exit on failed drain
}
wg.Wait()                                       // background workers finish
```

Kubernetes sends SIGTERM then SIGKILL after `terminationGracePeriodSeconds` — your drain budget must fit inside it.

---

## GC and profiling

- **Green Tea GC (1.26, default):** lower pause times and better throughput than the classic GC — a free upgrade; keep `GOGC`/`GOMEMLIMIT` defaults unless profiling says otherwise. `GOMEMLIMIT` (container-aware) beats `GOGC` tuning for memory caps.
- **Escape analysis:** `go build -gcflags=-m` shows heap escapes; hot paths want stack-kept values, pooled buffers (`sync.Pool`), and fewer interface round-trips.
- **Profiles:** import `net/http/pprof` (guarded, internal port), then `go tool pprof -http :8081 heap.prof`. Read order: in-use memory → allocations → goroutine count (leaks show as growth) → CPU. Always compare two profiles (`-diff_base`) before concluding.

---

## Key takeaway

Production Go is a checklist: thin `main`, internal packages, signal-driven shutdown inside the K8s grace window, default Green Tea GC, and pprof diffs for every perf claim.
