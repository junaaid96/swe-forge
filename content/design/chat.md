---
title: Chat service
emoji: 💬
blurb: '1:1 and group messaging with presence and history.'
order: 3
rubric:
  - dimension: Requirements
    points:
      - Covers send/receive, 1:1 + groups, presence, history sync, offline delivery
      - States ordering, delivery (at-least-once) and latency targets
  - dimension: API
    points:
      - Picks realtime transport (WebSocket/SSE) and REST surface for history
      - Defines message schema with ids for idempotency and acks
  - dimension: Data model
    points:
      - Persists conversations + messages with a sharding story
      - Explains sequence numbers / ordering per conversation
  - dimension: Scale & reliability
    points:
      - Routes messages across connection servers (pub/sub)
      - Handles reconnects, missed messages and presence fan-out cost
  - dimension: Trade-offs
    points:
      - Compares push-vs-pull and transport choices
      - Names the 10x bottleneck (fan-out, connection count, storage growth)
---

## Brief

Design a chat service supporting 1:1 and group conversations (up to 500 members), online presence, typing indicators, message history on new devices, and offline delivery. Target 50M users, 1M concurrent connections, <200ms send-to-receive latency.

Cover requirements, realtime transport and API, persistence and ordering, presence, and how the system behaves across reconnects.

## Model answer

### Requirements

Functional: send/receive text (+ attachments via object storage), 1:1 and groups ≤500, presence, typing indicators, multi-device history, offline queue. Non-functional: at-least-once delivery with client dedupe, per-conversation ordering, p99 <200ms, 99.95% send availability.

Scale: 1M concurrent sockets; 50M users × 20 msgs/day ≈ 12K msgs/s average, 100K/s peak. Storage: 1KB avg × 1B msgs/day ≈ 1TB/day before compression/retention.

### API

- Realtime: WebSocket (bidirectional, low overhead) with heartbeat; SSE/long-poll fallback for restrictive networks.
- `POST /messages {convId, clientMsgId, body}` → `202 {serverSeq}`; server assigns per-conversation sequence numbers.
- `GET /conversations/{id}/history?beforeSeq&limit` for backfill; `GET /sync?since` for missed messages after reconnect.
- Acks: client acks highest contiguous `serverSeq` per conversation; sender sees sent → delivered → read states.

### Data model

`conversations(id, type, member_ids, created_at)`, `messages(conv_id, seq, sender, body_ref, ts)` partitioned by `conv_id`, `devices(user_id, last_sync_seq)`. Sequence per conversation from a sequencer (DB sequence per conversation or a dedicated service) — ordering falls out of `(conv_id, seq)`. Media in S3-style storage, messages hold references. Shard by conversation hash.

### Scale estimates

1M sockets ≈ 20–50 connection servers (20–50K sockets each). Peak 100K msgs/s × small payloads is fine for a pub/sub backbone (Redis Streams/Kafka). Presence: heartbeat every 30s → ~30K updates/s, fanned out only to relevant conversations (cap: groups >100 get sampled presence).

### Architecture

Clients → LB (sticky) → stateful connection servers holding sockets. Send path: persist message (get seq) → publish to `conv:{id}` topic → connection servers push to online members; offline members get APNs/FCM + sync on return. Presence service tracks online maps with TTL heartbeats. History reads hit the message store directly (cache recent windows in Redis).

### Trade-offs

- WebSocket vs SSE+POST: sockets win for chat (bidirectional, multiplexed); SSE is simpler for broadcast-only feeds.
- At-least-once + dedupe vs exactly-once: the former is achievable (`clientMsgId` dedupe); true exactly-once isn't.
- Sequence-per-conversation vs global clock: per-conversation is simple and sufficient; global ordering needs TrueTime-style infrastructure.
- At 10x: group fan-out and connection count dominate — add edge PoPs, fan-out workers, and conversation-level rate limits.
