---
id: system-design-interview-medium
level: medium
---

# System Design — Interview (Medium)

> Placeholder Q&A stubs. Full answers will be filled in later.

## Q1. Caching layers and CDN

**Answer:** Content coming soon.

**Key takeaway:** TBD.

---

## Q2. Sharding and replication

**Answer:** Content coming soon.

**Key takeaway:** TBD.

---

## Q3. Message queues and fan-out

**Answer:** Content coming soon.

**Key takeaway:** TBD.

---

## Q-Guide-sd-url. Design a URL shortener?

**Answer:** Clarify: read/write ratio, custom aliases, expiry.
Core: base62 ids, DB mapping, Redis cache for redirects, analytics async.
Ops: cache stampede on hot links, rate limit creates.

**Key takeaway:** From interview guide (System Design Prompts).

---

## Q-Guide-sd-rate. Design a rate limiter?

**Answer:** Token bucket vs sliding window; Redis counters; per-user/IP/API-key.
Fail open vs closed; where to enforce (gateway vs service).

**Key takeaway:** From interview guide (System Design Prompts).

---

## Q-Guide-sd-chat. Design a chat app?

**Answer:** WebSockets/gateway; message store; fan-out; online presence; push.
Ordering per conversation; at-least-once delivery + idempotent clients.

**Key takeaway:** From interview guide (System Design Prompts).

---

## Q-Guide-sd-notify. Design a notification system?

**Answer:** Ingest events → queue → channel workers (email/SMS/push); templates; preferences; retries/DLQ.
Idempotency so users are not spammed on replay.

**Key takeaway:** From interview guide (System Design Prompts).

---

## Q-Guide-sd-rag. Design a RAG support chatbot?

**Answer:** Ingest/chunk/embed → vector DB → retrieve/rerank → LLM with citations.
Cost/latency budgets, evals, refusal when retrieval weak.

**Key takeaway:** From interview guide (System Design Prompts).

---
