---
id: golang-interview-basics
level: basics
---

# Go — Interview (Basics)

> Toolchain, types, errors, and first concurrency. Pair with Go notes 1–2.

## Q1. Why is Go popular for backend services?

**Answer:** Fast compile times and a single static binary (easy deploys), cheap goroutines + netpoller for high-concurrency I/O servers, a strong stdlib (`net/http`, `encoding/json`, `testing`), built-in race detector and formatter, and a small language that's easy to onboard. Trade-off: verbose error handling and a simpler type system than Rust/Scala.

**Key takeaway:** Boring reliability: static binaries, cheap concurrency, great tooling.

---

## Q2. How does Go handle errors without exceptions?

**Answer:** Errors are return values. Functions return `(T, error)`; callers check `if err != nil`, add context with `fmt.Errorf("…: %w", err)`, and inspect chains with `errors.Is` (sentinel match) and `errors.As` (type extraction). `panic` is reserved for unrecoverable programmer bugs, recovered only at goroutine/top-level boundaries.

**Key takeaway:** Return errors, wrap with %w, match with Is/As — panic only for bugs.

---

## Q3. Goroutine vs OS thread?

**Answer:** Goroutines are user-space tasks multiplexed by the Go scheduler (GMP) onto a few OS threads (`GOMAXPROCS`). They start with ~8KB stacks that grow, and blocking on network I/O parks only the goroutine (netpoller) — so 100k concurrent connections are routine, while 100k OS threads would collapse. Creation cost is a `go` statement, not a syscall.

**Key takeaway:** Goroutines = cheap, scheduler-managed, I/O-parking. Threads = expensive, kernel-managed.

---

## Q4. Buffered vs unbuffered channels?

**Answer:** Unbuffered (`make(chan T)`) = synchronous handoff: send blocks until a receiver takes the value — a synchronization point. Buffered (`make(chan T, n)`) = async queue: sends block only when full, receives block only when empty. Size buffers for bursts, not for "performance"; an unbounded-feeling buffer usually hides a missing backpressure design.

**Key takeaway:** Unbuffered synchronizes; buffered queues — and the sender closes.

---

## Q5. What's wrong with `for _, v := range xs { go func() { use(v) }() }`?

**Answer:** Before Go 1.22, all iterations shared one loop variable, so goroutines often all saw the last element — the fix was `v := v` shadowing. Since 1.22 each iteration gets fresh variables, so this code is correct as written. (You'd still bound the fan-out with a semaphore/errgroup and give each goroutine an exit path.)

**Key takeaway:** 1.22+ per-iteration variables killed the classic capture bug — but bound your goroutines anyway.

---

## Q6. Slice gotchas: append and sharing?

**Answer:** A slice is (pointer, length, capacity). `append` may reallocate — always use its return value (`s = append(s, x)`). Two slices can share an backing array, so writes through one visibly affect the other; `copy` or `slices.Clone` for independence. Passing a slice shares the array but copies the header — appends inside a callee don't grow the caller's length.

**Key takeaway:** Always take append's return; sharing is by array, length is by header.
