# 2. Concurrency — Goroutines, Channels and Context

"Don't communicate by sharing memory; share memory by communicating." Goroutines are cheap (KB stacks, multiplexed on threads); channels and `context` make the patterns safe.

> **Asked as:** "Goroutine vs thread? Buffered vs unbuffered channel? How do you cancel work?"

---

## Goroutines and channels

```go
go doWork(arg)              // runs concurrently; caller doesn't wait

ch := make(chan Result)     // unbuffered: send blocks until a receive
buf := make(chan Job, 100)  // buffered: send blocks only when full

select {
case r := <-ch:
    use(r)
case <-time.After(2 * time.Second):
    return ctx.Err()        // timeout branch
case <-ctx.Done():
    return ctx.Err()        // cancellation branch
}
```

**Rules that prevent 90% of bugs:**

1. The **sender closes** the channel; receivers range until close. Closing twice or sending on closed panics.
2. Never leak: every `go` needs an exit path (done channel, context, or WaitGroup-bounded lifetime).
3. `select` with `default:` = non-blocking try. Without `default`, it waits — add timeouts for external calls.
4. Share by communicating *or* guard with `sync.Mutex`/`atomic` — pick one per datum, and run `go test -race`.

---

## sync essentials (modern)

```go
var wg sync.WaitGroup
for _, url := range urls {
    wg.Go(func() { fetch(url) })   // 1.25+: Go() adds + runs, no Add/Done dance
}
wg.Wait()

var mu sync.Mutex
var count atomic.Int64             // typed atomics (1.19+) beat sync/atomic funcs
count.Add(1)
```

`sync.Once` for lazy singletons, `sync.Pool` for hot garbage (buffers), `errgroup.Group` with `SetLimit(n)` for bounded fan-out with error collection.

---

## Context: request-scoped cancellation

```go
func handler(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
    defer cancel()
    user, err := store.GetUser(ctx, id)   // passes ctx down: DB, HTTP, retries
    ...
}
```

Context carries **deadline, cancellation, and request-scoped values** (trace IDs — never passwords or optional params). Don't store `ctx` in structs; pass it as the first argument. When the client disconnects, `r.Context()` cancels — propagate it so abandoned work actually stops.

---

## Key takeaway

Concurrency = cheap goroutines + explicit lifetimes. Channels for handoff, mutexes/atomics for sharing, context for cancellation — and the race detector in CI to prove it.
