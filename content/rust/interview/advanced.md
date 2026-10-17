---
id: rust-interview-advanced
level: advanced
---

# Rust — Interview (Advanced)

> Async internals, unsafe, 2024 edition, variance/coherence. Pair with Rust note 2 + deep tracks.

## Q1. How does async/await actually work? Why must futures be `Send` for spawn?

**Answer:** An `async fn` desugars to a state machine implementing `Future`; `.await` suspends, saving locals across the suspension point. The future is lazy — nothing runs until an executor polls it. `tokio::spawn` requires `Send` because workers may move the future between threads; holding non-`Send` state (e.g. `Rc`, some guards) across `.await` poisons the whole future — scope such values tightly or use `spawn_blocking`.

**Key takeaway:** Futures are lazy state machines; Send-ness is structural across every await.

---

## Q2. What's new in Edition 2024 that changes daily code?

**Answer:** Async closures (`async |x| …` with `AsyncFn` traits) replacing `|| async move` hacks; let-chains (`if let Some(x) = o && x > 0`); precise RPIT capturing (`impl Trait + use<'a>`); trait upcasting (`&dyn Sub` → `&dyn Super`); `unsafe extern` blocks making FFI audit-visible; and the `gen` keyword reservation. New crates should target edition 2024 with MSRV ≥ 1.85.

**Key takeaway:** Async closures + let-chains + precise capture = the daily-code wins.

---

## Q3. When is `unsafe` justified, and how do you contain it?

**Answer:** FFI, intrusive/lock-free structures, SIMD, OS/hardware access — places the type system can't verify. Contain it: minimal `unsafe` blocks with `// SAFETY:` invariant comments, wrapped in safe abstractions, `unsafe_op_in_unsafe_fn` granularity, and Miri (`cargo miri test`) for UB detection. Unsafe code must uphold every invariant safe code assumes — that audit burden is the whole point.

**Key takeaway:** Unsafe is an audit boundary: minimal blocks, documented invariants, Miri-tested.

---

## Q4. Explain variance and why `&mut T` is invariant.

**Answer:** Variance describes lifetime/type-parameter coercion: `&'long T` → `&'short T` is safe (covariance — you promise less). `&mut T` is invariant because it both reads and writes: allowing `&'long mut T` → `&'short mut T`… actually the danger is type-level — `&mut` must forbid substituting longer/shorter or sub/supertypes, since a writer could smuggle the wrong type in. `Cell<T>` is invariant for the same reason. Errors here mean aliasing + mutation met generics — restructure, don't force.

**Key takeaway:** Shared refs coerce (covariant); mutable/cell types can't (invariant) — by soundness, not spite.

---

## Q5. The orphan rule rejected your impl. What are the real options?

**Answer:** Coherence forbids foreign-trait-for-foreign-type impls so no two crates conflict. Options: newtype wrapper (`struct MyVec(Vec<T>)` + impl on it), move the trait or type into your crate, use generics/trait bounds instead of the impl, or contribute the impl upstream. Never fork dependencies to dodge coherence — the conflict the rule prevents will find you at link time.

**Key takeaway:** Newtype, own the trait/type, or go generic — coherence conflicts are real.

---

## Q6. Pinning: why can't async state move after first poll?

**Answer:** Generator state machines may be self-referential (a local borrowed across `.await` points into the state itself); moving the future would invalidate those internal pointers. `Pin<&mut F>` guarantees the value won't move after polling begins. In practice: `Box::pin` futures for `select!`/spawning, `pin!` macro for stack pinning, and only implement `Future` manually when writing combinators — application code rarely touches `Pin` directly.

**Key takeaway:** Self-referential state must not move — Pin is the compiler-enforced promise.
