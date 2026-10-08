# System Design Interview Playbook

The architecture guides explain the building blocks. This playbook is about the interview itself: a five-step structure, estimation with numbers you should know by heart, the reliability and scaling patterns to reach for, and sketches of the classic questions.

---

## 1. The five steps

1. **Clarify requirements (5 min).** Functional: what users do (post, follow, read feed). Non-functional: scale (DAU, QPS), latency targets, availability, consistency needs, read/write ratio, data retention. Write them down.
2. **Estimate (3–5 min).** Requests per second, storage per year, bandwidth, cache size. Round aggressively; the point is orders of magnitude.
3. **High-level design (10 min).** Clients → CDN / load balancer → stateless services → cache → databases / object storage → queues and workers. Define the main APIs and the core data model.
4. **Deep dive (15 min).** The interviewer picks, or you propose, the hardest parts: schema and partitioning, the hot path, consistency, the fan-out strategy.
5. **Bottlenecks and trade-offs (5 min).** Single points of failure, hotspots, what happens at 10× load, monitoring, and what you would do differently with more time.

> **Asked as:** "Design X." Every system design question is really "show me you can run this process."

---

## 2. Numbers to remember

| Quantity | Value |
|---|---|
| L1 cache / main memory reference | ~1 ns / ~100 ns |
| SSD random read | ~100 µs |
| Round trip within a data centre | ~0.5 ms |
| Disk seek (HDD) | ~10 ms |
| Round trip across the internet / continents | ~100–150 ms |
| 1 day | ~86,400 s ≈ 10⁵ s |
| 1 million requests/day | ≈ 12 requests/s average (plan for 2–5× peak) |
| 1 million QPS | ~1,000 servers if each handles ~1,000 RPS |
| 1 KB × 1 billion | 1 TB |
| 99.9% availability | ~8.76 hours downtime/year (~43 min/month) |
| 99.99% | ~52.6 minutes/year |
| 99.999% | ~5.3 minutes/year |

**Worked example:** 100M DAU, each reads 50 feed items and writes 1 post per day. Reads ≈ 100M × 50 / 10⁵ ≈ 50k QPS (peak ~150k). Writes ≈ 1.2k QPS. Posts at 1 KB ≈ 100 GB/day ≈ 36 TB/year before media. The system is read-heavy, so caching and precomputed feeds matter most.

---

## 3. Fundamentals checklist

- **CAP:** during a network partition you choose consistency (reject or block requests) or availability (serve possibly stale data). CP examples: HBase, ZooKeeper, MongoDB with majority concerns. AP examples: Cassandra, DynamoDB (tunable). PACELC adds: *else*, latency vs consistency.
- **Scaling:** vertical (bigger box, simple, limited) vs horizontal (more boxes, needs stateless services and partitioned data).
- **Load balancing:** round robin, least connections, consistent-hash/IP-hash (stickiness); L4 (TCP, fast) vs L7 (HTTP-aware routing, TLS termination); health checks; avoid sticky sessions by keeping state in Redis or a DB.
- **Caching layers:** browser → CDN → API gateway → application (Redis/Memcached) → database buffer cache. Each layer gets its own TTL and invalidation story.

## 4. Reliability patterns

| Pattern | What it prevents | Key details |
|---|---|---|
| Redundancy + failover | single points of failure | active-active vs active-passive; test failover |
| **Circuit breaker** | cascading failures | closed → open after an error/timeout threshold → half-open trial requests |
| **Retry with exponential backoff + jitter** | transient errors without thundering herds | cap attempts; retry only idempotent operations or use idempotency keys |
| **Timeouts** | stuck threads/connections | every network call; budget them end to end |
| **Rate limiting** | abuse, overload | token bucket (bursty), leaky bucket (smooth), sliding window; per user / IP / API key; return 429 + `Retry-After` |
| **Bulkhead** | one dependency exhausting shared resources | separate pools/queues per dependency or tenant |
| **Load shedding / backpressure** | collapse under overload | reject early with 503, prioritise critical traffic |

## 5. Microservices toolkit

- **Communication:** REST (simple), gRPC (fast, typed, streaming, internal), messaging (Kafka for event logs and replay, RabbitMQ for work queues, SQS for managed queues).
- **Service discovery:** client-side (Eureka) or server-side (Consul, Kubernetes Services/DNS); a **service mesh** (Istio, Linkerd with Envoy sidecars) adds mTLS, retries and traffic shifting.
- **API gateway:** single entry point for routing, auth, rate limiting, request aggregation (Kong, AWS API Gateway, NGINX).
- **Data:** database per service; **sagas** (choreography via events or orchestration via a coordinator) with compensating transactions instead of distributed ACID; **event sourcing** stores events as the source of truth; **CQRS** splits write and read models; the **outbox pattern** publishes events reliably with the DB write.
- **Operations:** distributed tracing (trace IDs propagated via headers; OpenTelemetry → Jaeger/Zipkin/Tempo), centralised logs (ELK/Loki), metrics (Prometheus + Grafana) and SLO-based alerting; centralised configuration (Spring Cloud Config, Consul, Kubernetes ConfigMaps/Secrets).

## 6. Scale patterns

- **Cache strategies:** cache-aside (app reads cache, falls back to DB, populates; invalidate on write), write-through (write cache + DB together; fresh reads, slower writes), write-behind (write cache, flush async; fast, risk of loss), refresh-ahead (refresh hot keys before expiry). Guard against **stampedes** with request coalescing, locks or early probabilistic refresh.
- **Database:** read replicas (watch lag), sharding by a well-chosen key with consistent hashing, connection pooling, denormalised read models.
- **Async processing:** queues decouple producers from consumers; design consumers to be **idempotent**, use **dead-letter queues** for poison messages, and partition by key when ordering matters. Background job systems: Sidekiq, Celery, BullMQ.

---

## 7. Classic questions in one paragraph each

**URL shortener.** Write path generates a short code (base62 of a unique ID from a counter/Snowflake service, or a hash with collision checks); store `code → url` in a key-value store; read path is a cache-first lookup returning 301/302. Read-heavy (100:1), so CDN and Redis carry most traffic. Discuss custom aliases, expiry and analytics via an async click stream.

**News feed / Twitter timeline.** Fan-out on write (push post IDs into followers' precomputed timelines in Redis) gives fast reads but is expensive for celebrities; fan-out on read (merge followees' recent posts at read time) is cheap to write but slow to read. Use a **hybrid**: push for normal users, pull for accounts with millions of followers. Rank, paginate with cursors, and cache hydrated posts.

**Rate limiter.** Token bucket per key stored in Redis, updated atomically with a Lua script (or sliding-window counters with sorted sets). Run it at the gateway; decide fail-open vs fail-closed when Redis is down; return `X-RateLimit-*` headers.

**Chat system.** Clients hold WebSocket connections to gateway servers; a presence service tracks who is connected where; messages go through a queue/log (Kafka) partitioned by conversation for ordering; store history in a wide-column DB (Cassandra) keyed by conversation + time; delivery receipts and offline push notifications; idempotent message IDs for at-least-once delivery.

**Video platform.** Upload to object storage via pre-signed URLs → transcoding pipeline (queue + workers) into multiple bitrates and segments (HLS/DASH) → CDN for delivery with adaptive bitrate streaming → metadata in SQL, view counts via approximate counters and stream processing.

---

## 8. Signals interviewers look for

You drive the conversation, quantify instead of hand-waving, name trade-offs explicitly ("we accept eventual consistency on likes to keep writes cheap"), design for failure, and know when *not* to add complexity (a single Postgres instance handles more than most people think).
