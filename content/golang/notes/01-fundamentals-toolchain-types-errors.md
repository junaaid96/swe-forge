# 1. Go Fundamentals — Toolchain, Types and Errors (2026)

Go in 2026 (1.24–1.27): a small language with a great toolchain. This guide covers the working core — modules, the type system, and idiomatic errors.

> **Asked as:** "Why Go for backend services? How do you handle errors without exceptions?"

---

## Toolchain: your unfair advantage

```bash
go mod init example.com/shop   # modules are the unit of versioning
go build ./... && go vet ./... # vet catches printf/lock-copy bugs
go test -race ./...            # race detector is non-negotiable in CI
go fix ./...                   # 1.26+: push-button modernizers (go fix -fix=atomictypes …)
```

`go fix` grew up: instead of one-off migrations it now hosts **modernizers** that rewrite old idioms (`interface{}` → `any`, loop-var copies, atomic types) across a repo. Run it deliberately on libraries — some rewrites change exported types.

Key facts: `GOPATH` mode is long dead (modules since 1.16); `go tool` (1.24) pins tool dependencies in `go.mod`; formatting is law (`gofmt`/`goimports` — never debate style).

---

## Types in 10 minutes

- **No classes, no inheritance.** Structs + interfaces. Composition via embedding.
- **Interfaces are implicit** — implement the method set and you satisfy it. Keep interfaces small (`io.Reader` is one method); accept interfaces, return structs.
- **`any`** (alias for `interface{}`) + **generics** (1.18+): `func Map[T, U any](s []T, f func(T) U) []U`. Constraints via `comparable` or `~` unions (`~int | ~string` = underlying types).
- **Maps/slices**: slices are views (ptr, len, cap) — append may reallocate, so always use the return value. Maps are not goroutine-safe; concurrent use needs `sync.Map` or a mutex.
- **Pointers without arithmetic.** `new(expr)` (1.26) returns `*T` initialized to a copy of `expr` — the old `ptr()` helpers are obsolete.

---

## Errors without exceptions

```go
data, err := os.ReadFile(path)
if err != nil {
    return fmt.Errorf("load config %s: %w", path, err) // %w wraps for errors.Is/As
}
// errors.Is(err, os.ErrNotExist)  — sentinel match through wraps
// errors.As(err, &pathErr)        — extract a *fs.PathError from the chain
```

Rules: errors are values — return them, wrap with context (`%w`), compare with `errors.Is`, extract with `errors.As`. `panic` is for programmer bugs (unreachable code, must-parse at init), not control flow; libraries should almost never panic. Custom errors: small structs or `errors.New` sentinels, documented next to the function.

---

## Key takeaway

Small syntax, strict tooling: modules + vet + race detector + go fix keep Go codebases boring in the best way. Master implicit interfaces, slice semantics, and wrapped errors and you can read any Go service.
