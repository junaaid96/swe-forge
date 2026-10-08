---
id: system-design-interview-medium
level: medium
---

# System Design — Interview (Medium)

> Five classic prompts with the shape of a strong answer: clarify, sketch the core, then go deep on the hard part. Pair with the System Design notes and the interview playbook.

## Q1. Design a URL shortener.

**Answer:**
- **Clarify:** read/write ratio (often 100:1), custom aliases, expiry, analytics, scale (e.g., 100M new links/month).
- **API:** `POST /links {longUrl, alias?, expiresAt?}` → short code; `GET /{code}` → `301`/`302` redirect (`302` if you need every click for analytics).
- **IDs:** base62-encode a unique 64-bit ID (from a sequence, a Snowflake-style generator, or pre-allocated ranges per server); 7 base62 characters give ~3.5 trillion codes. Hashing the URL needs collision handling.
- **Storage:** a key-value table `code → longUrl, ownerId, expiresAt`; any KV store or sharded SQL works because lookups are by primary key.
- **Read path:** Redis cache (plus CDN for very hot links) in front of the store; analytics events go to a queue asynchronously so redirects stay fast.
- **Risks:** hot keys, abuse and spam (rate-limit creation, scan target URLs), enumeration of sequential codes (shuffle or salt IDs).

**Key takeaway:** It's a read-heavy key-value lookup; the interesting parts are ID generation, caching and abuse control.

---

## Q2. Design a rate limiter.

**Answer:**
- **Clarify:** limit per user, IP or API key; global or per endpoint; hard vs soft limits; where it runs (API gateway, sidecar or in-service).
- **Algorithms:** fixed window (simple, but allows ~2× bursts at window edges), sliding-window log (exact, memory-heavy), sliding-window counter (good approximation), token bucket (allows controlled bursts, smooth refill — the common default).
- **Distributed state:** counters in Redis with atomic operations (`INCR` + `EXPIRE`, or a Lua script for token bucket) keyed by `limit:{key}:{window}`.
- **Response:** `429 Too Many Requests` with `Retry-After` and rate-limit headers.
- **Failure mode:** if Redis is down, fail **open** for most APIs (availability) but **closed** for sensitive ones such as login or OTP endpoints.

**Key takeaway:** Pick the algorithm for the burst behaviour you want, keep counters in shared atomic storage, and decide the fail-open/closed policy explicitly.

---

## Q3. Design a chat application (1:1 and group).

**Answer:**
- **Connections:** clients keep a WebSocket to a stateless gateway tier; a presence/session store (Redis) maps `userId → gateway node`.
- **Send path:** the message is persisted first (with a server-assigned, per-conversation sequence number), then fanned out via pub/sub to the recipients' gateway nodes; offline users get a push notification.
- **Storage:** messages partitioned by `conversationId` and ordered by sequence (Cassandra/ScyllaDB or sharded Postgres).
- **Ordering and delivery:** order is guaranteed per conversation, not globally; delivery is at-least-once, so clients dedupe by a client-generated message ID and ack the last sequence they've seen (which also gives read receipts).
- **Group chats:** fan-out on write for small groups; for very large groups, fan-out on read.
- **Extras:** media goes to object storage via pre-signed URLs; end-to-end encryption changes what the server can index or search.

**Key takeaway:** Persist then fan out, order per conversation with sequence numbers, and make clients idempotent.

---

## Q4. Design a notification system (email, SMS, push).

**Answer:**
- **Ingest:** services publish `NotificationRequested` events (user, template, data, priority, idempotency key) to a queue or topic.
- **Processing:** a notification service checks user preferences and quiet hours, renders the template, and routes to per-channel queues (email, SMS, push) so a slow provider can't block the others.
- **Delivery workers:** call providers (SES, Twilio, FCM/APNs) with timeouts, retries with exponential backoff + jitter, and a dead-letter queue for poison messages; fail over to a secondary provider for critical channels.
- **Idempotency:** dedupe on the idempotency key so replays and retries don't spam users.
- **Tracking:** store status per notification (queued, sent, delivered, failed, opened) from provider webhooks; rate-limit per user and per provider.

**Key takeaway:** Queue per channel, preferences before sending, retries plus DLQ, and idempotency so users never get the same message twice.

---

## Q5. Design a RAG-based support chatbot.

**Answer:**
- **Ingestion:** pull docs and tickets, clean them, chunk them (with overlap and headings kept as metadata), create embeddings, and upsert them into a vector store (pgvector, OpenSearch, Pinecone) with access-control tags. Re-index on document changes.
- **Query path:** embed the question → hybrid retrieval (vector + keyword/BM25) filtered by the user's permissions → rerank the top-k → build a prompt with the best chunks → the LLM answers **with citations**.
- **Guardrails:** refuse or hand off to a human when retrieval confidence is low; block prompt injection coming from retrieved content; redact PII.
- **Cost and latency:** cache frequent answers, route easy questions to a smaller model, stream tokens, cap context size.
- **Evaluation:** an offline golden set (retrieval recall, answer groundedness), online feedback (thumbs, escalation rate), and tracing of every retrieval and generation.

**Key takeaway:** Retrieval quality, permissions and evaluation decide whether a RAG bot is trustworthy; the LLM call is the easy part.
