---
id: golang-deep-theory
track: theory
---

# Go — Deep: Theory

> The memory model, the GMP scheduler, and interface internals — the theory that makes concurrency bugs explainable.

---

## The Go memory model (what "happens-before" buys you)

A read `r` of variable `v` sees a write `w` only if `w` **happens-before** `r`. Synchronization primitives create these edges:

- **Channel ops:** a send happens-before the matching receive completes. Closing happens-before receives reporting closure.
- **Mutex:** `Unlock` happens-before the next `Lock` that observes it.
- **Once/atomic:** `Do(f)`'s return happens-before any later `Do` return; atomic ops are sequentially consistent.
- **Goroutine start/wait:** `go f()` happens-before anything in `f`; `WaitGroup.Wait` return happens-after all `Done` calls.

Anything else shared across goroutines is a race — including "benign" flag polling. The `-race` detector instruments exactly these edges; if it stays silent under load, the ordering is sound.

---

## GMP scheduler in one page

- **G** (goroutine): cheap stack (starts ~8KB, grows/shrinks), runs user code.
- **M** (machine): OS thread executing Go code. Count ≈ `GOMAXPROCS` for CPU work.
- **P** (processor): scheduling context holding a run queue. `GOMAXPROCS` Ps exist; an M must hold a P to run a G.

Scheduling points: channel ops, syscalls, allocations, function calls (async preemption since 1.14 — tight loops no longer starve). **Work stealing**: idle Ps steal half of busy Ps' queues. **Netpoller**: network waits park the G without holding a thread — that's why 100k idle connections cost ~nothing while 100k blocked *file* reads would eat threads.

Interview payoff: *"Why is Go good at I/O-bound servers?"* — netpoller + cheap Gs decouple connections from threads.

---

## Interfaces are (type, value) pairs

```go
var r io.Reader          // (nil, nil) → r == nil is true
var p *bytes.Buffer      // nil pointer
r = p                    // (type=*bytes.Buffer, value=nil) → r == nil is FALSE
```

The famous typed-nil gotcha falls out of the representation. Method dispatch: itab lookup for interface calls (small indirection; monomorphization doesn't apply). Empty interface (`any`) is (type, value) with no method table. Reflection (`reflect.TypeOf`) just reads the type word.

---

## Key takeaway

Memory model = happens-before edges from channels/mutexes/once; scheduler = GMP + work stealing + netpoller; interfaces = fat pointers. These three explain nearly every "why does my concurrent Go program behave like that?"
