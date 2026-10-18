---
title: News feed
emoji: 📰
blurb: Personalized social feed with fan-out and ranking.
order: 4
rubric:
  - dimension: Requirements
    points:
      - Covers post, follow, timeline read, like/comment with freshness targets
      - Distinguishes celebrity vs normal-user fan-out needs
  - dimension: API
    points:
      - Defines feed pagination (cursor-based) and post/mutation endpoints
      - Handles deletes/edits propagating to materialized feeds
  - dimension: Data model
    points:
      - Stores posts, graph edges and feed items with a sharding key
      - Explains feed materialization vs on-read assembly
  - dimension: Scale & reliability
    points:
      - Picks push/pull/hybrid fan-out with the celebrity exception
      - Sizes cache and handles hot users without meltdown
  - dimension: Trade-offs
    points:
      - Compares fan-out strategies on write vs read cost
      - Names ranking-vs-chronology and consistency trade-offs
---

## Brief

Design a social news feed: users post updates, follow others, and read a personalized reverse-chronological feed with likes and comments. 200M users, average 200 follows, some celebrities with 50M followers. Feed reads must be <200ms; new posts should appear within seconds.

Cover requirements, the fan-out strategy, storage, ranking hooks, and failure modes.

## Model answer

### Requirements

Functional: post (text + media refs), follow/unfollow, home feed (paginated), likes/comments, delete propagation. Non-functional: p99 feed read <200ms, post-to-feed <5s for normal users, available reads during partial outages (stale feed beats no feed).

Scale: 200M users × 0.2 posts/day ≈ 500 posts/s average, 5K/s peak. Reads dominate: ~100K feed reads/s. Average fan-out 200 → 1M feed-item writes/s at peak.

### API

- `POST /posts {body, mediaIds}` → `201 {postId}`; `DELETE /posts/{id}`; `POST /follows {userId}`.
- `GET /feed?cursor&limit=20` → cursor-paginated items (time+id cursor, stable under inserts).
- `POST /posts/{id}/likes`, `POST /posts/{id}/comments`; counters updated asynchronously.

### Data model

`posts(post_id, author, body, media, ts)` by author shard; `follows(follower, followee)` both directions indexed; `feed_items(user_id, post_id, ts, reason)` sharded by reader. Media in object storage. Feed items are denormalized pointers (post body fetched at read or cached).

### Scale estimates

Hybrid fan-out: normal users push to followers' `feed_items` (async workers, ~1M writes/s at peak — shardable). Celebrities (>10K followers, or a threshold) skip push; readers merge a "celebrity posts" pull at read time. Feed read = one indexed range scan + merge ≤ a few celebrity lookups, all cached in Redis (recent 1000 items/user, TTL + LRU).

### Architecture

Write path: API → post store → fan-out workers (queue partitioned by author) → feed store + cache invalidation. Read path: API → feed store/cache → hydrate posts → rank (chronological now; ML ranker as a scorer stage later) → paginate. Deletes tombstone the post and lazily filter feed items. Graph service serves follow lists with heavy caching.

### Trade-offs

- Push vs pull: push makes reads O(1) but writes scale with followers; pure pull melts at read time. Hybrid with the celebrity exception is the standard answer.
- Consistency: feeds are eventually consistent (seconds of lag acceptable); likes/comments counters even more so.
- Chronological vs ranked: ship chronological, reserve a scoring hook; ranking adds training/serving infrastructure.
- At 10x: fan-out worker throughput and feed-store write volume — raise the celebrity threshold, batch fan-out, tier storage by recency.
