---
id: backend-deep-performance
track: performance
---

# Backend — Deep: Performance

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Caching

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Why cache — and what breaks

Caching stores expensive results closer to the caller: CPU L1, process memory, Redis, CDN. Goal: lower latency and protect the database.

Broken caches cause:
• Stale reads (users see old prices)
• Cache stampede / thundering herd when a hot key expires
• Cache as source of truth (data loss on flush)
• Giant values / no TTL → OOM

Always know: what is authoritative? how fresh must it be? what is the invalidation story?

### Cache-aside vs write-through

Cache-aside (lazy): app reads cache; on miss load DB and populate. On write, update DB then invalidate (or update) cache.
Write-through: write DB and cache together in the write path.
Write-behind: write cache first, flush DB async — dangerous for money.

Default for most CRUD APIs: cache-aside + invalidate on write.

### TTL, eviction, and keys

TTL: soft bound on staleness. Short TTL for volatile data; longer for reference data.
Eviction: LRU/LFU when memory pressure hits — size your Redis.
Key design: namespace:entity:id:version — e.g. user:v2:42. Include version when schema changes.
Never store secrets in shared caches without encryption + access control.

### Thundering herd (stampede)

When a popular key expires, 1,000 requests miss and stampede the DB.

Mitigations:
• Singleflight / request coalescing — one loader, others wait
• Probabilistic early expiration / soft TTL refresh
• Lock around populate (SETNX) with short lock TTL
• Stale-while-revalidate: serve stale briefly while refreshing

Measure: DB QPS spikes aligned with TTL boundaries.

### Invalidation strategies

Hardest problem in CS (joke with truth).

Patterns:
• Delete key on write (simple, brief miss storm possible)
• Versioned keys: bump version so old keys become unreachable
• Pub/sub invalidation across nodes for local Caffeine caches
• Time-based only when occasional staleness is acceptable

Document freshness SLOs per endpoint ("product name may lag 30s").

### Practical Redis usage

Use Redis for: session store, rate limits, hot entity cache, distributed locks (carefully), leaderboards (ZSET).

Do not use Redis as your only database for durable business records.

Observability: hit ratio, eviction rate, memory, p99 get latency, stampede indicators.

### Practical code

```
// Cache-aside with singleflight-ish lock (Redis)
public User getUser(long id) {
  String key = "user:" + id;
  String cached = redis.get(key);
  if (cached != null) return decode(cached);

  String lock = "lock:user:" + id;
  if (redis.setNx(lock, "1", Duration.ofSeconds(5))) {
    try {
      User u = db.findUser(id);
      redis.setEx(key, Duration.ofMinutes(10), encode(u));
      return u;
    } finally {
      redis.del(lock);
    }
  }
  // someone else loading — brief wait + retry or return stale if available
  Thread.sleep(20);
  return getUser(id);
}

// Invalidate on write
@Transactional
public void rename(long id, String name) {
  db.updateName(id, name);
  redis.del("user:" + id);
}
```

### Tips

- Invalidate-on-write beats hoping TTL is “good enough” for user-edited data.
- Always bound memory and set TTLs — caches without eviction policies become outages.
- Stampede control is mandatory for hot keys.
- Cache hit ratio without latency/error context can mislead — watch the DB too.
