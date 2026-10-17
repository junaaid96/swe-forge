---
id: rust-interview-basics
level: basics
---

# Rust — Interview (Basics)

> Ownership, borrowing, Result/Option, structs/enums. Pair with Rust note 1.

## Q1. What are Rust's ownership rules?

**Answer:** Every value has one owner; when the owner goes out of scope the value drops; and you may hold either many shared (`&T`) or one mutable (`&mut T`) reference — never both. Assignment moves non-`Copy` types (`String`, `Vec`); `Copy` types (ints, bool) duplicate bitwise. These three rules eliminate use-after-free, double-free, and data races at compile time.

**Key takeaway:** One owner, scoped drop, aliasing XOR mutability.

---

## Q2. `String` vs `&str` — when is each right?

**Answer:** `String` owns growable heap text; `&str` borrows a string slice (of a `String`, literal, or anything string-like). Take `&str` parameters (accepts both via deref coercion), store `String` in structs (owned data avoids lifetime plumbing), and return `String` when constructing. `to_string()`/`to_owned()` convert up; `&s[..]` borrows down.

**Key takeaway:** Borrow in (`&str`), own in structs (`String`), build to return (`String`).

---

## Q3. How does `Result` + `?` replace exceptions?

**Answer:** Fallible functions return `Result<T, E>`; `?` unwraps `Ok` or returns `Err` early (converting via `From`, so error types compose). Callers handle errors as values — `match`, `map_err`, combinators — and `main` can return `Result` too. Custom errors implement `std::error::Error`; crates use `thiserror` for typed errors, binaries often `anyhow`/`eyre` for context.

**Key takeaway:** Errors are values: `?` propagates, `From` converts, never exceptions.

---

## Q4. What does `match` guarantee that if-chains don't?

**Answer:** Exhaustiveness — the compiler rejects a `match` that misses a variant, so adding an enum variant breaks every consumer loudly instead of silently misbehaving. Combined with `Option`/`Result` (no null!), this forces handling of absence and failure at compile time. `if let` is for the single-variant case.

**Key takeaway:** Exhaustive matches turn "forgot a case" from runtime bug into compile error.

---

## Q5. Structs, enums, traits — how do they replace classes?

**Answer:** Structs hold data, enums hold *one of several* data shapes (with payloads — `Option`/`Result` are enums), traits declare shared behavior, and `impl` blocks attach methods. No inheritance: composition + trait bounds instead. A `trait Animal { fn speak(&self); }` with separate impls per struct gives polymorphism without class hierarchies.

**Key takeaway:** Data in structs/enums, behavior in traits/impls, reuse via composition.

---

## Q6. What is the borrow checker actually checking?

**Answer:** That every reference is valid where used: no use-after-move, no mutation through shared borrows, no borrows outliving their referent (lifetimes). With non-lexical lifetimes, borrows end at last use. When it errors, it's showing a real aliasing or lifetime violation — the fix is usually restructuring ownership, not fighting the error.

**Key takeaway:** Validity + aliasing + lifetimes, proven per function — read errors as region diagrams.
