---
title: URL shortener
emoji: 🔗
blurb: 'Design a bit.ly clone: short links, redirects, click analytics.'
order: 1
rubric:
  - dimension: Requirements
    points:
      - States functional (shorten, redirect, expiry, analytics) and non-functional (read-heavy, low latency) needs
      - 'Quantifies scale: URLs/month, redirect QPS, retention'
  - dimension: API
    points:
      - Defines create/resolve endpoints with methods, params, status codes
      - Handles custom aliases, collisions and rate limiting
  - dimension: Data model
    points:
      - Chooses key encoding (hash vs counter + base62) and justifies it
      - Schema covers links, users, clicks with indexes
  - dimension: Scale & reliability
    points:
      - Caches hot links and sizes the cache from the read ratio
      - Addresses single points of failure (DB, ID generator)
  - dimension: Trade-offs
    points:
      - Compares at least two design alternatives explicitly
      - Names what breaks first at 10x scale
---

## Brief

Design a URL shortening service like bit.ly. Users create short links from long URLs, share them, and get redirected in milliseconds. Link owners can set custom aliases and expiry dates, and see how many times each link was clicked.

Assume 100M new URLs per month, a 10:1 read-to-write ratio, links kept for 5 years, and 99.9% redirect availability. Walk through requirements, API, data model, scale estimates, architecture and trade-offs, and sketch the data flow as a diagram.

## Model answer

### Requirements

Functional: shorten URL, redirect by code, custom aliases, optional expiry, per-link click counts. Non-functional: p99 redirect latency < 50ms, 99.9% availability, read-heavy (10:1).

Scale: 100M writes/month ≈ 40 writes/s average, ~400/s peak. Reads ≈ 4K/s peak. 5 years × 1.2B URLs/year = 6B rows; at ~500 bytes/row ≈ 3TB plus indexes and click logs.

### API

- `POST /api/links {url, alias?, expiresAt?}` → `201 {code}` / `409` on alias collision. Authenticated, rate-limited per key.
- `GET /{code}` → `302` to the long URL (302 keeps clicks measurable; 301 would cache permanently). `404` for unknown/expired codes.
- `GET /api/links/{code}/stats` → click counts, coarse time series.

### Data model

Counter + base62 gives short, dense, collision-free codes: a distributed ID generator (Snowflake-style or a DB-backed block allocator) mints IDs, encoded to 7 chars (62^7 ≈ 3.5T). Hashing (MD5 prefix) is simpler but needs collision retries and longer codes.

Tables: `links(code PK, url, owner_id, created_at, expires_at)`, `clicks(code, ts, referrer, country)` append-only (columnar/OLAP store, not the OLTP DB), optional `users`. Index on `owner_id` for dashboards; TTL sweep for expired rows.

### Scale estimates

Peak ~4K redirects/s is trivially cacheable: the top 20% of links serve ~80%+ of traffic, so a Redis/cluster cache of hot codes (say 50M entries ≈ 25GB) absorbs most reads. Cache miss → DB read → backfill. Writes are tiny; one primary + replicas suffices for years.

### Architecture

Edge (CDN + WAF) → stateless API fleet → cache-aside Redis → Postgres (primary + read replicas). Click events go to a queue → stream processor → OLAP store + counters. ID generator as a separate highly-available service. Multi-region: serve redirects from regional caches, replicate the link table asynchronously.

### Trade-offs

- 302 vs 301: measurability beats edge-cacheability; mitigate with short CDN TTLs.
- Counter vs hash: density and no collisions vs one more service to operate.
- Strong vs eventual: link creation is strongly consistent (single primary); analytics are eventual (minutes of lag is fine).
- First bottleneck at 10x: the single Postgres primary's write throughput and the click pipeline — shard links by code hash and partition the event stream next.
