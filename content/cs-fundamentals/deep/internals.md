---
id: cs-fundamentals-deep-internals
track: internals
---

# CS Fundamentals — Deep: Internals

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Concurrency & Multithreading

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Why concurrency matters in backends

A single-threaded request handler can serve many users via async I/O, but CPU-bound work, parallel fan-out, and shared caches still force you to reason about simultaneous execution.

Failure modes you will see in production:
• Lost updates when two threads read-modify-write the same counter
• Dirty reads of half-written objects
• Deadlocks when lock order differs across code paths
• Thread-pool exhaustion: all workers blocked on slow DB → latency cliff

Concurrency is not "use more threads." It is coordinating access to shared state and bounded resources under failure.

### Threads, pools, and virtual threads

Platform threads are OS-scheduled and expensive. Backend servers almost never create a Thread per request manually — they use a pool (ExecutorService, Tomcat/Jetty workers, Netty event loops).

Rules of thumb:
• Bound the pool. Unbounded executors hide overload until the JVM dies.
• Separate pools for different workloads (HTTP vs CPU vs blocking IO) so one cannot starve the other.
• Java 21 virtual threads: cheap to block; great for "one task per request" style code. Still not a free pass on shared mutable state — races remain.

Ask: Is my work CPU-bound, blocking I/O, or async event-driven? Pick the model that matches.

### Races, visibility, and happens-before

A race condition: correctness depends on unlucky timing.

Two classic bugs:
1) Check-then-act: if (!map.contains(k)) map.put(k, v) — two threads both insert.
2) Visibility: Thread A writes flag=true; Thread B never sees it without synchronization (CPU caches / reordering).

Java tools:
• synchronized / ReentrantLock — mutual exclusion + visibility
• volatile — visibility for a single field, not atomic compound actions
• AtomicInteger / AtomicReference — CAS loops for counters and lock-free updates
• ConcurrentHashMap — concurrent map operations (still careful with multi-step logic)

Prefer immutability and message-passing so fewer things need locks.

### Deadlocks and lock ordering

Deadlock: Thread A holds Lock1 waits Lock2; Thread B holds Lock2 waits Lock1.

Prevention:
• Always acquire locks in a global order (accountId ascending for transfers)
• Prefer tryLock with timeout and retry/backoff
• Keep critical sections tiny — no remote calls inside synchronized
• Prefer higher-level concurrency (actors, queues, DB transactions with consistent lock order)

Detect: thread dumps (jstack), deadlock detection MXBean, blocked-thread metrics.

### Practical patterns for services

1) Striped locks: lock per userId/orderId instead of one global lock.
2) Single-writer: funnel mutations for an entity through one queue/partition.
3) Optimistic concurrency: @Version / ETag — retry on conflict.
4) Bulkheads: isolate thread pools and connection pools per dependency.
5) Timeouts everywhere: never wait forever on a lock or remote call.

Anti-pattern: synchronizing on a public String or Boolean — other code can lock the same object.

### Testing concurrent code

Unit tests that always pass on your laptop often miss races. Techniques:
• Stress loops (run the scenario 10k times)
• JCStress / concurrency test harnesses
• Inject sleeps/yields at critical points in tests (temporary)
• Property: after N parallel increments, counter == N
• Prefer designing races out (immutable messages) over proving locks correct

### Practical code

```
// Lost update vs AtomicInteger vs striped lock

// BAD: race
class Counter {
  private int n;
  void inc() { n = n + 1; } // read-modify-write race
}

// GOOD: atomic
class AtomicCounter {
  private final AtomicInteger n = new AtomicInteger();
  void inc() { n.incrementAndGet(); }
}

// Transfer with ordered locks (avoid deadlock)
class Accounts {
  void transfer(Account a, Account b, long amount) {
    Account first = a.id < b.id ? a : b;
    Account second = a.id < b.id ? b : a;
    synchronized (first) {
      synchronized (second) {
        if (a.balance < amount) throw new IllegalStateException("insufficient");
        a.balance -= amount;
        b.balance += amount;
      }
    }
  }
}

// Bounded pool for blocking work
ExecutorService dbPool = Executors.newFixedThreadPool(16,
  new ThreadFactoryBuilder().setNameFormat("db-%d").build());
```

### Tips

- Never hold a lock across network I/O — that is how pools die.
- volatile ≠ atomic compound actions. Use Atomic* or locks for check-then-act.
- Virtual threads help blocking style code; they do not fix shared mutable state.
- Reproduce races with load tests + thread dumps, not hope.
