---
id: rust-interview-medium
level: medium
---

# Rust — Interview (Medium)

> Lifetimes, smart pointers, traits/dispatch, iterators, error design. Pair with Rust note 1 (§2–6).

## Q1. When do you write explicit lifetime parameters?

**Answer:** When elision can't relate inputs to outputs — typically functions taking multiple references and returning one (`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str`), or structs holding references. Lifetimes name *relationships* ("output lives as long as the shorter input"), not durations. If every struct grows lifetime parameters, store owned data instead.

**Key takeaway:** Lifetimes relate borrows; owned data beats lifetime plumbing in structs.

---

## Q2. `Box` vs `Rc` vs `Arc` vs `&T` — how do you choose?

**Answer:** `&T` for temporary borrows (no cost, no ownership change). `Box<T>` for single-owned heap data (recursive types, large values, trait objects). `Rc<T>` for shared ownership in one thread (+ `RefCell` for mutation — runtime-checked). `Arc<T>` for shared ownership across threads (+ `Mutex`/`RwLock`/atomics for mutation). `Rc` is not `Send`; reaching for it first usually means the design needs rethinking.

**Key takeaway:** Borrow by default, Box to own, Rc to share locally, Arc to share across threads.

---

## Q3. Static vs dynamic dispatch — monomorphization vs `dyn Trait`?

**Answer:** Generics monomorphize: a specialized copy per type — fastest calls, larger binaries, longer compiles. `dyn Trait` uses vtables through fat pointers — one code path, small indirection, flexible (heterogeneous collections). Use generics at hot boundaries and for inlining; `dyn` at plugin boundaries and to cap binary bloat. Object safety (`dyn`-compatible) forbids generic methods and `Self` returns.

**Key takeaway:** Generics for speed, `dyn` for flexibility and size — measure before converting.

---

## Q4. How do you design error types for a library vs a binary?

**Answer:** Libraries expose typed errors: an enum implementing `std::error::Error` (via `thiserror`), with variants per failure mode and `#[from]` conversions — callers can match precisely. Binaries prioritize context: `anyhow::Result` + `.context("…")` chains that print causal chains. Never `Box<dyn Error>` in public library APIs (callers can't match); never `unwrap` on external input anywhere.

**Key takeaway:** Typed errors (thiserror) for libraries, context chains (anyhow) for binaries.

---

## Q5. Why are iterators "zero-cost"? Give a non-trivial example.

**Answer:** Iterator chains (`map`, `filter`, `fold`) monomorphize into the equivalent loop — no allocation, no virtual calls, often autovectorized. Example: `lines.iter().filter_map(|l| l.parse::<u64>().ok()).sum()` compiles to a tight loop. Laziness means `take(n)` never touches element n+1. The cost appears only with `collect` (intentional allocation) or boxed trait objects.

**Key takeaway:** Chains compile to loops — lazy, inlined, allocation-free until you collect.

---

## Q6. Interior mutability: `Cell`, `RefCell`, `Mutex` — what's the trade?

**Answer:** All allow mutation through `&T` by moving borrow checks: `Cell` (Copy types, no runtime cost, no borrows to track), `RefCell` (runtime borrow counting — panics on violation, single-threaded), `Mutex`/`RwLock` (thread-safe, blocking cost). Use for caches, memoization, and shared configs. A `RefCell` panic is a logic bug the compiler couldn't see — treat it like one.

**Key takeaway:** Same aliasing rules, enforced at runtime instead of compile time — pick by thread and cost.
