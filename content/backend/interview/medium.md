---
id: backend-interview-medium
level: medium
---

# Backend — Interview (Medium)

> Practical backend interview Q&A (caching, webhooks, realtime). Pair with Deep tracks on this topic.

## Q1. Explain cache-aside vs write-through. When do you use each?

**Answer:** Cache-aside (lazy): on read, check cache → on miss load DB and populate; on write, update DB then invalidate (or update) the cache. Write-through updates DB and cache together on the write path. Write-behind writes cache first and flushes DB asynchronously — risky for money/orders.

Most CRUD APIs default to **cache-aside + invalidate on write**. Use write-through when reads must almost always hit a warm cache and write latency budget allows dual writes.

**Key takeaway:** Authoritative store is the DB; cache is a performance layer with an explicit invalidation story.

---

## Q2. What is a cache stampede (thundering herd) and how do you prevent it?

**Answer:** When a hot key expires, many concurrent requests miss and all hit the database at once.

Mitigations: request coalescing / singleflight (one loader, others wait), SETNX lock around populate with short TTL, probabilistic early refresh, or stale-while-revalidate. Measure DB QPS spikes aligned with TTL boundaries.

**Key takeaway:** Synchronized expiry of hot keys is a DB denial-of-service — design for soft expiry and coalescing.

---

## Q3. What is a webhook and how do you secure + make it reliable?

**Answer:** A webhook is an HTTP callback your system receives (or sends) when an event happens (payment captured, repo push).

Secure inbound webhooks with: HMAC signature verification (shared secret), timestamp skew checks to block replay, TLS only, and least-privilege handlers. Reliability: treat delivery as **at-least-once** — make handlers idempotent (event id dedupe), return 2xx quickly, process async via a queue, retry with backoff + DLQ on poison messages.

**Key takeaway:** Verify signatures, assume duplicates, ack fast, process asynchronously.

---

## Q4. WebSocket vs SSE vs long polling — when to use which?

**Answer:**
- **WebSocket:** full-duplex, low-latency bidirectional (chat, collaborative editing, games). Needs sticky sessions or a pub/sub fan-out layer behind many nodes.
- **SSE:** server→client stream over HTTP; simpler than WS when clients only listen (live feeds, notifications).
- **Long polling:** client holds a request until an event; fallback for constrained environments — higher overhead than SSE/WS.

**Key takeaway:** Prefer SSE for one-way push; WebSocket when both sides talk; always plan auth + reconnect + horizontal scale.

---

## Q5. What does idempotency mean for APIs and why do networks force it?

**Answer:** An idempotent operation can be applied multiple times with the same effect as once. Networks retry; clients double-click; load balancers replay — without idempotency you double-charge or create duplicate orders.

Patterns: client `Idempotency-Key` header, server stores key → response (or resource id) with TTL, unique constraints on business keys, and idempotent consumers for queue messages.

**Key takeaway:** Exactly-once *effect* is achieved with at-least-once delivery + idempotent handlers — not by hoping retries never happen.

---
