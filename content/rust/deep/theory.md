---
id: rust-deep-theory
track: theory
---

# Rust — Deep: Theory

> The ownership model as a type system: borrow checking, variance, and trait coherence — why the compiler can prove memory safety.

---

## Ownership as affine types

Every value has one owner; assignment *moves* unless the type is `Copy`. This is an **affine type system** (use-at-most-once), which statically rules out use-after-free and double-free: the compiler knows exactly where each value dies (`drop` at end of owner scope, reverse declaration order).

References add the second rule — **aliasing XOR mutability**: either many `&T` or one `&mut T`. The borrow checker proves this per-function using lifetimes (regions of validity), including non-lexical lifetimes (NLL): a borrow ends at its last use, not at scope end. Data races need shared mutation — impossible under these rules, hence "fearless concurrency" for safe code.

---

## Lifetimes, variance, elision

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str  // output lives as long as the shorter input
```

Lifetime parameters name *relationships*, not durations. Three elision rules cover most functions (each input gets a lifetime; one input → output inherits it; `&self` methods → output inherits `&self`). **Variance**: `&'long T` coerces to `&'short T` (covariance); `&mut T` and `Cell<T>` are invariant — a common source of "lifetime mismatch" errors when aliasing + mutation meet generics.

---

## Traits, coherence, dispatch

- **Coherence (orphan rule):** you can implement your trait for any type, or any trait for your type — never a foreign trait for a foreign type. Guarantees no conflicting impls across crates.
- **Static dispatch:** generics monomorphize per concrete type — zero-cost, bigger binaries.
- **Dynamic dispatch:** `dyn Trait` = fat pointer (data + vtable); `dyn` is object-safe only without generics/`Self`-returns. Trait upcasting (1.86) lets `&dyn Sub` coerce to `&dyn Super`.
- **Blanket impls** (`impl<T: Display> ToString for T`) + specialization limits explain many "conflicting implementation" errors.

---

## Key takeaway

Rust's safety is three interlocking proofs: affine ownership (no use-after-free), borrow rules (no data races), coherence (no impl conflicts). Lifetime errors are the compiler showing its work — read them as region diagrams, not complaints.
