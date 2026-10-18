---
title: Rate limiter
emoji: 🚦
blurb: Protect an API with distributed, fair rate limiting.
order: 2
rubric:
  - dimension: Requirements
    points:
      - Distinguishes burst vs sustained limits and per-key vs global scopes
      - States accuracy needs (exact vs approximate) and failure behavior
  - dimension: API
    points:
      - Defines limit headers (Limit/Remaining/Reset) and 429 + Retry-After
      - Covers multiple rules per caller (tiered plans)
  - dimension: Data model
    points:
      - Picks an algorithm (token bucket / sliding window) and justifies it
      - Explains counter storage, keys and TTLs
  - dimension: Scale & reliability
    points:
      - Works across instances (shared state) with <5ms overhead
      - Chooses fail-open vs fail-closed when the limiter is down
  - dimension: Trade-offs
    points:
      - Compares at least two algorithms on burst handling and cost
      - Names clock-skew and thundering-herd edge cases
---

## Brief

Design a rate limiter for a public API with free and paid tiers. Free callers get 100 requests/minute with small bursts; paid callers get 10K/minute. Limits apply per API key, plus a global safety ceiling. The API runs on dozens of instances behind a gateway, and limit checks must add negligible latency.

Cover requirements, the client-facing contract (headers, errors), the counting algorithm, storage, distributed correctness and failure modes.

## Model answer

### Requirements

Functional: enforce per-key sustained + burst limits, per-tier rules, global ceiling; return machine-readable limit state. Non-functional: <5ms p99 overhead, exact within one window (billing depends on it), no single point of failure. On limiter outage: fail open for paid (availability) with alerting, fail closed for anonymous abuse-prone endpoints.

### API

Every response carries `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Over-limit → `429 Too Many Requests` with `Retry-After`. Rules are data: `{key, window, sustained, burst}` resolved from the caller's plan at request time, so plan changes need no deploy.

### Data model

Sliding-window counter in Redis: key `rl:{apiKey}:{windowStart}`, `INCR` + `EXPIRE`, plus the previous window weighted for smoothness. Token bucket is the alternative when smooth burst shaping matters more than exact window accounting.

Storage: a Redis cluster (or gateway-local Envoy/Redis) holding counters with TTL = window length. Memory is bounded: keys × windows × small integers. Lua scripts make check-and-increment atomic.

### Scale estimates

100K rps × 1 Redis round-trip ≈ 100K ops/s — a small cluster handles this; pipeline/batching and local short-TTL caches cut it further. Each check is one Lua eval (~0.2ms). Rule fetches are cached per gateway worker.

### Architecture

Enforcement at the edge/gateway (reject fast, before app servers). Gateway → Redis cluster for counters; async audit log of 429s to the analytics pipeline for abuse detection. Rules service pushes tier changes to gateway config. Global ceiling via a single aggregated counter with local-estimate fallback if Redis is unreachable.

### Trade-offs

- Fixed window vs sliding: fixed is one key and simple but allows 2x bursts at boundaries; sliding costs 2 keys per check.
- Redis vs in-process: in-process is fastest but wrong across instances — shared state is the whole point.
- Exact vs approximate: billing needs exact; abuse ceilings can use probabilistic sketches.
- At 10x: Redis becomes the hotspot — shard by key hash, add gateway-local token buckets as a first-pass filter, keep Redis as the authority.
