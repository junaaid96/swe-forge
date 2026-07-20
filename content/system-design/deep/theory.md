---
id: system-design-deep-theory
track: theory
---

# System Design — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## System Design

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Scalability Fundamentals

Vertical scaling (scale up): add CPU/RAM to one server. Simple but limited ceiling + single point of failure.
Horizontal scaling (scale out): add more servers. Load balancer + stateless services. Theoretically unlimited.

Stateless = scalable: NO server-side session. Store session in Redis or use JWT. ANY server can handle ANY request.

Find your bottleneck first (profile, don't guess):
CPU-bound → threads, async processing, cache computed results
DB-bound → indexing, read replicas, caching, query optimization
Network-bound → CDN for static assets, gRPC instead of REST, compression
Memory-bound → stream large files, paginate large results, efficient data structures

### CAP Theorem

In a distributed system, pick 2 of 3:
C — Consistency: every read returns the most recent write
A — Availability: every request gets a response (may not be latest data)
P — Partition Tolerance: system works despite network failures between nodes

Since network partitions ALWAYS happen, you must have P. Real choice: CP or AP.

CP — consistency over availability:
→ MongoDB, HBase, ZooKeeper, etcd
→ Use for: banking, inventory, booking (stale data = incorrect result)

AP — availability over consistency (eventually consistent):
→ Cassandra, DynamoDB, CouchDB
→ Use for: social media, shopping cart, analytics (stale data = acceptable)

BASE = Basically Available, Soft-state, Eventually Consistent. NoSQL alternative to ACID.

### Caching Strategies

Cache-aside (most common): app checks cache → hit: return. Miss: load from DB → store in cache → return.
Risk: cache stampede on cold start. Fix: staggered TTL, mutex locking, pre-warming.

Write-through: write to cache AND DB simultaneously. Always consistent. Higher write latency.
Write-behind: write to cache → async write to DB. Fast writes. Risk: data loss if cache crashes before async write.

Cache invalidation strategies:
• TTL-based: expire after time. Simple but may serve stale data briefly.
• Event-based: invalidate cache when data changes. Consistent but complex.
• Write-through: automatically consistent.

Redis use cases: session storage, rate limiting (sliding window counter), distributed locks, pub/sub, leaderboards (sorted sets).

### Microservices & Resilience

Monolith → Microservices tradeoffs:
Benefits: independent deployment, scale individual services, fault isolation, technology freedom.
Costs: network latency, distributed transactions, 12 services = 12 CI/CDs + 12 Dockerfiles + 12 monitoring configs.

Service communication:
Sync (REST, gRPC): immediate response. Simple. Creates coupling risk. Cascading failures if downstream is slow.
Async (Kafka, RabbitMQ): fire-and-forget. Decoupled. Resilient. Harder to trace.

Circuit Breaker (Resilience4j): prevents cascading failures.
CLOSED (normal) → OPEN (fast-fail after N failures) → HALF-OPEN (test recovery).

Saga Pattern: distributed transaction without 2PC (two-phase commit).
Each service: local transaction → publish event → next service reacts. On failure: compensating transactions.

### Caching and messaging building blocks

Most design interviews hinge on a few blocks used well:
• Cache-aside Redis with TTL + invalidation + stampede control (Caching topic)
• Async via Kafka/queues with outbox + idempotent consumers (Messaging topic)
• Idempotency keys on write APIs
• Observability: RED metrics, lag, DLQ

Learn those topics deeply, then return here to assemble them into end-to-end designs.

### Practical code

```
// System Design patterns in Spring Boot

// 1. Redis caching with @Cacheable
@Service
@CacheConfig(cacheNames = "patients")
public class PatientService {

    @Cacheable(key = "#id", unless = "#result == null")
    @Transactional(readOnly = true)
    public PatientDTO getPatient(Long id) {
        // Called ONLY on cache MISS. Cache hit returns immediately — zero DB roundtrip.
        return patientRepo.findById(id).map(PatientDTO::from)
            .orElseThrow(() -> new ResourceNotFoundException("Patient " + id));
    }

    @CacheEvict(key = "#id") // invalidate when patient data changes
    public PatientDTO updatePatient(Long id, UpdatePatientRequest req) { ... }
}
// application.yml:
// spring.cache.type: redis
// spring.cache.redis.time-to-live: 3600000  # 1 hour TTL

// 2. Circuit Breaker with Resilience4j
@Service
public class DiagnosticsGateway {

    @CircuitBreaker(name = "diagnostics", fallbackMethod = "fallback")
    @Retry(name = "diagnostics", fallbackMethod = "fallback")
    @TimeLimiter(name = "diagnostics")
    public CompletableFuture<Report> fetchReport(Long patientId) {
        return CompletableFuture.supplyAsync(() -> externalApi.getReport(patientId));
    }

    // Called when circuit is OPEN — serve stale cached data gracefully
    private CompletableFuture<Report> fallback(Long patientId, Throwable ex) {
        log.warn("Diagnostics API down, serving cache: {}", ex.getMessage());
        return CompletableFuture.completedFuture(Report.fromCache(patientId));
    }
}

/*
 eG-Health Platform Architecture (simplified):

 Angular SPA → CDN (static assets, edge caching)
             → Nginx (SSL termination, reverse proxy)
                  → API Gateway (auth, rate limiting, routing)
                       ┌──────────────┬────────────────┐
                   Patient SVC    Diagnostic SVC   Billing SVC
                  (Spring Boot)  (Spring Boot)   (Spring Boot)
                       │              │                │
                  PostgreSQL     PostgreSQL         Kafka
                 (patient data)  (reports)       (async events)
                       │              │                │
                     Redis        Redis         Notification SVC
                  (sessions)    (report cache)   (SMS/email)
*/
```

### Tips

- System design interview order: clarify scope → estimate scale → high-level architecture → deep dive one component → identify bottlenecks
- Start simple (monolith), scale when needed. Over-engineering from day one is a red flag.
- CAP theorem: always ask 'what happens on network partition?' Bank account balance = CP (can't serve stale). Social media likes = AP (stale is fine).
- Async (Kafka) vs sync (REST): use async when you don't need an immediate response. Async decouples services and improves resilience.
