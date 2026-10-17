# 3. Generics, Iterators and Modern Idioms

Go 1.18–1.26 quietly made the language expressive: generics for containers/algorithms, range-over-func for lazy sequences, and stdlib packages that kill boilerplate.

> **Asked as:** "When do you reach for generics? What are range-over-func iterators?"

---

## Generics that earn their keep

```go
func Map[T, U any](s []T, f func(T) U) []U {
    out := make([]U, 0, len(s))
    for _, v := range s { out = append(out, f(v)) }
    return out
}

func Keys[K comparable, V any](m map[K]V) []K { ... }  // comparable = usable as map key

type Number interface { ~int | ~int64 | ~float64 }     // underlying-type union
func Sum[T Number](s []T) T { ... }
```

Use generics for **containers, algorithms, and adapters** (Result/Option-ish types, pools, caches). Don't genericize business logic — an interface or two concrete functions read better. 1.26 allows **self-referential type parameters**, simplifying builders and recursive data structures.

---

## Range-over-func: `iter.Seq` (1.23+)

```go
// A sequence is just a yield function:
func Where[T any](seq iter.Seq[T], keep func(T) bool) iter.Seq[T] {
    return func(yield func(T) bool) {
        for v := range seq {
            if keep(v) && !yield(v) { return }  // false = consumer stopped early
        }
    }
}

for v := range Where(slices.Values(users), isActive) { ... }  // lazy, composable
```

`iter.Seq[T]` (values) and `iter.Seq2[K,V]` (pairs) power the new stdlib: `slices.Values/All`, `maps.Keys/Values/All`. Returning `false` from `yield` stops iteration — that's how `break` propagates through lazy chains. Also: `for i := range n` (1.22) ranges over integers directly.

---

## Idioms to adopt (and retire)

| Adopt | Retire |
|---|---|
| `any`, `min`/`max`, `clear()` | `interface{}`, hand-rolled min/max |
| `slices`/`maps` packages (Sort, Compact, Clone, Keys…) | hand loops for contains/delete/sort |
| `for range n`, `wg.Go()` | `for i := 0; …`, manual Add/Done |
| `new(expr)`, `unique` interning | `ptr()` helpers, string-dup maps |
| `omitzero`, `encoding/json/v2` path | `omitempty` hacks on `time.Time` |

Run `go fix` to apply most of these mechanically — then read the diff to learn the idiom.

---

## Key takeaway

Modern Go = generics for data structures, `iter.Seq` for lazy pipelines, stdlib `slices`/`maps` for the rest. If you're hand-rolling contains/filter/sort in 2026, check the standard library first.
