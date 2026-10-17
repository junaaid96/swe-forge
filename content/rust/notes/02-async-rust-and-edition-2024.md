# Async Rust and Edition 2024 — What's New and How to Use It

Edition 2024 (Rust 1.85, stabilized Feb 2025) is the default for new crates, and the 1.85–1.90 releases landed the features that make modern async code readable. This guide covers what to adopt and how it changes interviews.

> **Asked as:** "What's new in Edition 2024? How do async closures differ from closures returning futures?"

---

## Async closures (1.85)

```rust
// Before: a closure returning a future — borrows couldn't cross the await
let f = |x: i32| async move { x * 2 };

// After: native async closures capture like normal closures
let f = async |x: i32| x * 2;
let fut = f(21);              // impl Future<Output = i32>
```

New `AsyncFn`, `AsyncFnMut`, `AsyncFnOnce` traits express bounds that `Fn() -> impl Future` cannot (higher-ranked async bounds). Combined with native `async fn` in traits (stable since 1.75), most code no longer needs `#[async_trait]`.

## Let-chains (1.88)

```rust
// Before: nested pyramids
if let Some(x) = opt {
    if x > 0 { … }
}
// After:
if let Some(x) = opt && x > 0 { … }
```

`let` bindings now combine with `&&` directly in `if`/`while` — the single biggest readability win for pattern-heavy code.

## Smaller 2024-edition changes that show up in reviews

| Change | What it means |
|---|---|
| Precise capturing (`impl Trait + use<'a>`) | RPIT captures exactly the lifetimes you name — fewer "lifetime too long" errors |
| Trait upcasting (1.86) | `&dyn Sub` coerces to `&dyn Super` directly |
| `unsafe extern` blocks | All FFI declarations are explicitly unsafe — audit surface is visible |
| `unsafe_op_in_unsafe_fn` lint | Unsafe ops inside `unsafe fn` need their own `unsafe {}` blocks |
| `gen` keyword reserved | Generator syntax incoming; don't name variables `gen` |
| `LazyLock` (std) | One-time init without `once_cell` for most cases |

## Migration in practice

```bash
cargo fix --edition        # automates most edition migration
cargo clippy -- -W clippy::all -W clippy::pedantic   # then read the lints
```

MSRV matters: adopting edition 2024 requires Rust 1.85+. Libraries supporting older compilers gate new syntax behind version checks or stay on 2021 until their floor rises.

---

## Key takeaway

Adopt edition 2024 + async closures + let-chains for all new code; they remove the boilerplate that made async Rust infamous. In interviews, showing 2024-idiomatic code signals currency.
