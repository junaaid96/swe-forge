---
id: rust-deep-pitfalls
track: pitfalls
---

# Rust — Deep: Pitfalls

> Borrow-checker fights, clone epidemics, async footguns, and lifetime gymnastics — and the idiom that replaces each.

---

## Fighting the borrow checker (and losing)

| Symptom | Root cause | Idiom |
|---|---|---|
| "cannot borrow as mutable" in a loop | Aliasing a collection while iterating it | Iterate by index, `split_at_mut`, or restructure (command queue) |
| Lifetimes infecting every struct | Storing references instead of owned data | Own it (`String`, not `&str`) unless the reference is the point |
| `Rc<RefCell<…>>` everywhere | Shared-mutable design from GC languages | Redesign ownership first; `Rc` is a bridge, not a home |
| `.clone()` on every other line | Unclear ownership | Clone at boundaries, borrow inside; profile before keeping clones |

The meta-rule: if the borrow checker fights you for an hour, the *design* is wrong for Rust — restructure ownership instead of appeasing errors.

## Async footguns

- **`await` inside locks** — holding `MutexGuard` across `.await` serializes tasks and can deadlock; use `tokio::sync` types and scope guards tightly.
- **Blocking the executor** — `std::thread::sleep`, sync file I/O, or heavy compute inside async tasks stalls the worker thread; use `spawn_blocking` / async APIs.
- **Unbounded `spawn`** — each task is cheap but not free; use `Semaphore` or `buffered` streams for fan-out.
- **Dropping futures silently** — `select!` cancels losers; ensure cancellation is safe (idempotent operations, explicit cleanup).

## Production sins

- `unwrap()`/`expect()` on user input or I/O — return `Result`, reserve expect for invariants with messages.
- `panic!` for control flow — panics unwind (or abort); libraries must never panic on recoverable conditions.
- Ignoring `#[must_use]`/`Result` — `let _ =` on a fallible call is a bug with extra steps.
- Edition drift — new crates on edition 2024 while the workspace MSRV is 1.70; set `rust-version` and test it in CI.

---

## Key takeaway

Rust errors point at design, not syntax: own your data, scope your borrows, never block the executor, never unwrap the outside world. The compiler is a design reviewer with infinite patience — listen to it.
