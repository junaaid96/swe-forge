---
title: Notification service
emoji: 🔔
blurb: Multi-channel notifications with preferences and retries.
order: 5
rubric:
  - dimension: Requirements
    points:
      - Covers channels (push/email/SMS/in-app), preferences, templates, quiet hours
      - States delivery semantics (at-least-once) and per-channel SLAs
  - dimension: API
    points:
      - Defines enqueue/send APIs with idempotency keys and priority
      - Explains template rendering and user targeting
  - dimension: Data model
    points:
      - Stores notifications, preferences, templates and delivery receipts
      - Explains dedupe and rate caps per user
  - dimension: Scale & reliability
    points:
      - Uses queues + retries with backoff and DLQ per channel
      - Isolates providers so one outage doesn't block others
  - dimension: Trade-offs
    points:
      - Compares sync vs async send paths
      - Names cost-vs-reliability choices (SMS fallback, provider redundancy)
---

## Brief

Design a notification service for a consumer app: transactional (OTP, receipts) and marketing (campaigns) messages across push, email, SMS and in-app channels. Users control per-channel preferences and quiet hours. 100M users, peak 50K notifications/s, OTP delivery in seconds.

Cover requirements, the send pipeline, preferences and templating, retries, provider management, and cost controls.

## Model answer

### Requirements

Functional: enqueue by user/event, template rendering + localization, preferences (channel × category), quiet hours, frequency caps, delivery tracking, campaign scheduling. Non-functional: OTP p99 <10s; at-least-once with provider-level dedupe; marketing is best-effort and droppable under load (priority lanes).

### API

- `POST /notifications {userId|segment, template, data, channel?, priority, idempotencyKey}` → `202 {notificationId}`.
- `GET /users/{id}/preferences`, `PUT` for opt-outs and quiet hours; `GET /notifications/{id}` for receipts.
- Webhooks from providers (delivered/bounced/complained) update receipt state and suppress lists (bounces auto-mute that address).

### Data model

`notifications(id, user_id, channel, template, status, attempts, scheduled_for)`, `preferences(user_id, category, channel, enabled, quiet_hours)`, `templates(id, locale, subject, body)`, `receipts(notification_id, provider, status, ts)`. Idempotency keys (TTL 24h) dedupe retries. Per-user rolling counters enforce caps ("max 3 marketing pushes/day").

### Scale estimates

50K/s peak × small payloads: a partitioned queue (Kafka) with per-channel consumer groups. Push via FCM/APNs (multicast batches), email via SES/SendGrid, SMS via Twilio. Provider throughput quotas shape consumer concurrency; overflow spills to secondary providers.

### Architecture

API → validation (prefs, caps, suppression) → priority queues (OTP lane separate from bulk lane) → channel workers → providers → receipt webhooks. Template service renders at send time (fresh data, correct locale). Campaign scheduler injects bulk jobs with rate ramps. Each provider gets an adapter + circuit breaker + DLQ; a dead provider pages but never blocks other channels. Observability: per-template funnel (sent → delivered → opened).

### Trade-offs

- Async vs sync: async everywhere except OTP status reads; sync provider calls would couple availability and blow latency budgets.
- Redundancy vs cost: dual SMS providers double integration work but survive regional outages; email failover is cheap, SMS failover is not.
- Exact caps vs approximate: caps use local counters + periodic sync (slight over-send acceptable for marketing, strict for SMS cost).
- At 10x: provider quotas and queue depth dominate — pre-warm provider capacity, shed marketing load first, shard by user.
