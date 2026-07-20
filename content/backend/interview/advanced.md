---
id: backend-interview-advanced
level: advanced
---

# Backend — Interview (Advanced)

> Messaging, jobs, and rate limiting — pair with Backend Deep (internals / best-practices / performance).

## Q1. Explain the transactional outbox pattern. Why not dual-write DB + Kafka directly?

**Answer:** Dual-write (commit DB then publish) can fail between steps → lost events or inconsistent state. Outbox: in the same DB transaction as the business write, insert an outbox row; a relay publishes to Kafka/Rabbit and marks rows sent. Consumers remain idempotent.

**Key takeaway:** Atomicity of “state change + event intent” lives in one DB transaction; the broker is fed asynchronously.

---

## Q2. At-least-once vs exactly-once delivery — what do you actually guarantee?

**Answer:** Most brokers give at-least-once (or effectively so with retries). “Exactly-once” end-to-end usually means **idempotent processing** (dedupe by message/business id) plus careful offset commits. Kafka producer idempotence prevents duplicate *broker* records for the same producer epoch — it does not equal unique business side-effects.

**Key takeaway:** Design for duplicates; make handlers safe to re-run.

---

## Q3. How do you design a background job pipeline for emails/webhooks?

**Answer:** API enqueues work (or writes outbox) → workers pull with visibility timeout → success ack / failure retry with exponential backoff + jitter → poison messages to DLQ after N attempts. Track job id, correlation id, and metrics (queue depth, lag, failure rate). Prefer idempotent job keys.

**Key takeaway:** Queue + retries + DLQ + observability; never do slow side-effects inline in the request path if latency SLOs matter.

---

## Q4. How would you rate-limit an API across many instances?

**Answer:** Per-instance in-memory counters break under horizontal scale. Use a shared store (Redis INCR + TTL / token bucket / sliding window) keyed by user/IP/API key. Return `429` with `Retry-After`. Combine with gateway limits and abuse detection. For fairness, separate burst vs sustained limits.

**Key takeaway:** Distributed rate limits need shared state; document limits in the API contract.

---

## Q5. When is a message queue the wrong tool?

**Answer:** When you need a synchronous request/response with immediate user-facing errors; when ordering + low volume makes a simple DB workflow clearer; when the team cannot operate brokers (lag, rebalances, poison messages). Queues add operational complexity — use them for decoupling, spikes, and fan-out, not as a substitute for API design.

**Key takeaway:** Messaging is an architecture choice with ops cost, not a default.

---
