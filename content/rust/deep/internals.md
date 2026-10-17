---
id: rust-deep-internals
track: internals
---

# Rust — Deep: Internals

> What the compiler emits: monomorphization, async state machines, and the unsafe boundary.

---

## Monomorphization and codegen

Generic functions stamp out a specialized copy per concrete type substitution — full optimization per type, at the cost of binary size and compile time (the classic `-Z` self-profiling target). Mitigations: `dyn Trait` at boundaries (one vtable call vs N copies), type erasure for cold paths, and splitting generic shells over non-generic cores. LTO + `codegen-units = 1` trade slower builds for smaller/faster release binaries.

---

## Async: futures are state machines

```rust
async fn fetch(url: &str) -> String { … }   // desugars to a generator-like state machine
```

An `async fn` returns an anonymous `Future`; each `.await` is a suspension point where locals live in the generator's saved state. Consequences:

1. **Futures are lazy** — nothing runs until polled by an executor (Tokio, async-std, embassy). Dropping a future cancels it (hence `tokio::select!` cancellation semantics).
2. **`Send`-ness is structural** — holding a non-`Send` type (e.g. `Rc`, some DB guards) across `.await` makes the future non-`Send`, so `tokio::spawn` rejects it. Scope guards tightly or use `spawn_blocking`.
3. **No async Drop** — cleanup in `Drop` can't await; designs use explicit `shutdown().await` methods or background tasks.
4. **Pinning** — self-referential generator state must not move after polling starts; `Box::pin` + `Pin<&mut T>` enforce it. You rarely touch `Pin` directly unless writing combinators.

---

## The unsafe boundary

Safe Rust can't have UB; `unsafe` can — the audit burden is the point. Legitimate uses: FFI (`unsafe extern` blocks in edition 2024), intrusive collections, SIMD, lock-free primitives, OS/hardware access. Rules: wrap every unsafe block in a safe abstraction with documented invariants (`// SAFETY:` comments), keep blocks minimal (the `unsafe_op_in_unsafe_fn` lint enforces granularity), and test with Miri (`cargo +nightly miri test`) which catches UB unit tests miss.

---

## Key takeaway

Zero-cost abstractions have visible costs: monomorphization (size/time), async (state machines + Send-infected APIs), unsafe (audit burden). Knowing the desugaring turns "fighting the compiler" into reading its output.
