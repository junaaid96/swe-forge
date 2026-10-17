---
id: golang-deep-pitfalls
track: pitfalls
---

# Go — Deep: Pitfalls

> Goroutine leaks, nil-interface traps, context abuse, and the loop-var era (pre-1.22) — the bugs every Go team hits once.

---

## Goroutine leaks

Every `go` without an exit path leaks a stack forever. Classic sources: `for { select { case v := <-ch: … } }` with no done branch; `time.Tick` (uncancellable — use `NewTicker` + `Stop`); HTTP handlers spawning background work tied to nothing. Detection: `runtime.NumGoroutine()` trending up in metrics, goroutine pprof dumps. Fix: derive lifetimes from `context.Context`, bound pools with `errgroup.SetLimit`, and never `go` inside a loop without a cap.

---

## The nil-interface trap

```go
func find(id string) (*User, error) {
    var u *User
    ...
    return u, nil   // BUG if u is nil: caller gets non-nil error? no — non-nil *User? no…
}
```

The real trap is the reverse: `return nil, err` where `err` holds a typed nil (`(*MyError)(nil)`) — the interface is **non-nil** because it carries a type descriptor. Callers' `err != nil` misfires. Rules: return literal `nil` for "no error"; construct errors at the return site; beware named-return + deferred modification. `go vet` doesn't catch this — code review does.

---

## Context misuse

- Storing `ctx` in structs (it expires; pass it as arg 1).
- `context.Background()` deep in call graphs (breaks cancellation chains — take it from the caller).
- Stuffing optional params/business data into values (use explicit args; values are for trace IDs, auth claims).
- Ignoring `ctx.Err()` after blocking calls (you can't tell timeout from failure).

---

## Loop variables and other fossils

Pre-1.22, `for _, v := range xs { go func() { use(v) }() }` shared one `v` — every goroutine saw the last element. **1.22+ gives each iteration fresh variables**, so the `v := v` shim is dead code `go fix` removes. Similar fossils: `ioutil` (use `io`/`os`), `interface{}` (use `any`), GOPATH tricks, and `time.Sleep`-based test sync (use channels or `synctest`).

---

## Key takeaway

Leaks (exit paths), typed nils (literal nils), context (arg 1, never stored), fossils (`go fix` them away). Four habits that separate production Go from tutorial Go.
