---
id: golang-deep-internals
track: internals
---

# Go — Deep: Internals

> GC generations (Green Tea), escape analysis, and the netpoller — how the runtime earns its keep.

---

## Green Tea GC (1.26+)

The default collector since 1.26: a concurrent, tri-color mark-sweep GC with substantially lower tail pauses and better mutator throughput than its predecessor. What you must know as a user:

- **Pacer, not pauses:** GC triggers on allocation rate vs `GOGC`/`GOMEMLIMIT`, running mostly alongside your code. Sub-millisecond stop-the-world is normal; long pauses usually mean huge heaps with pointer-dense garbage.
- **`GOMEMLIMIT` > `GOGC` in containers:** a hard-ish RSS target the runtime respects (soft limit + aggressive GC), while `GOGC=100` (heap doubles before GC) can OOM small containers. Set `GOMEMLIMIT` to ~80% of the cgroup limit.
- **Tuning order:** profile first (`heap`, `allocs`), cut allocations (pooling, reuse, fewer `any` round-trips), *then* touch knobs. Most services never touch them.
- `debug.SetGCPercent(-1)` + manual `GC()` exists for batch jobs — never for servers.

---

## Escape analysis: stack vs heap

`go build -gcflags=-m` narrates the compiler's decision per variable: "escapes to heap" vs "moved to heap: <reason>" or stays put. Common escape causes: taking a pointer that outlives the frame (returned, stored in heap, sent on channels), interface conversions (the value must outlive the call), closures capturing loop state, and oversized values.

Practical moves: return values instead of pointers for small structs, pre-size slices (`make([]T, 0, n)`), reuse buffers, keep hot-path data concrete (not `any`). Verify with allocation benchmarks (`-benchmem`), not vibes.

---

## Netpoller: the I/O engine

On Linux, the runtime wraps `epoll` (kqueue/BSD, IOCP/Windows): a goroutine blocked on `conn.Read` parks — its M/P goes to run other Gs, and the poller wakes the G when the fd is ready. Consequences:

1. **Never block the poller thread pool** with DNS/CGO/file I/O surprises — those use real threads; watch `NumGoroutine` vs thread count divergence.
2. **Set deadlines** (`SetReadDeadline`) — parked goroutines are cheap but not free, and leaked connections accumulate.
3. File I/O and `exec` don't use the netpoller; massive parallel file work needs bounded pools, not unbounded goroutines.

---

## Key takeaway

Green Tea + GOMEMLIMIT for memory, escape analysis + pooling for allocations, netpoller + deadlines for I/O scale. The runtime does the heavy lifting — your job is to not fight it (no unbounded goroutines, no ignored pprof).
