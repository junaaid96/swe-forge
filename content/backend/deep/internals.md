---
id: backend-deep-internals
track: internals
---

# Backend — Deep: Internals

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Streaming & Messaging

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Why messaging exists

Synchronous chains amplify latency and failure. Queues/streams decouple producers from consumers, absorb spikes, and enable multiple independent consumers.

Use messaging for: emails, webhooks, search indexing, fan-out, workflow steps, event-driven integration.

Do not use messaging to avoid designing an API — it adds operational complexity (ordering, duplicates, poison messages).

### Kafka mental model

Topics + partitions. Partition key chooses ordering scope (e.g. orderId). Consumers in a group split partitions.

Guarantees commonly relied on:
• Durable log, replayable
• At-least-once delivery to consumers (duplicates happen)
• Ordering per partition, not global

Producer idempotence (enable.idempotence=true, acks=all) prevents duplicate writes into Kafka — it does NOT make your DB side effects exactly-once.

### Transactional Outbox (2026 must-know)

Dual-write bug: update orders table, then publish to Kafka — process crashes between → lost event (or the opposite ordering publishes an event for rolled-back work).

Outbox pattern:
1) In one DB transaction: write business row + outbox row
2) Relay process publishes outbox → Kafka and marks published
3) Consumers process idempotently

This is the standard integrity pattern for event-driven microservices.

### Idempotent consumers & DLQ

Assume every message can arrive twice.

Consumer pattern:
• Derive stable eventId
• Begin DB transaction; insert into processed_events(event_id) unique; if conflict, skip
• Apply business effect; commit

Poison messages: after N failures, push to Dead Letter Queue for inspection — do not block the partition forever. Alert on DLQ depth.

### RabbitMQ vs Kafka (practical)

RabbitMQ: flexible routing (exchanges), classic work queues, ack per message — great for task distribution.
Kafka: high-throughput log, replay, event streaming, many independent consumer groups.

Choose Kafka when you need replay/fan-out history; choose Rabbit when you need complex routing and classic workers. Either way: idempotency + observability.

### Ops metrics that matter

• Consumer lag (Kafka) — are you falling behind?
• Publish failure rate / relay lag (outbox age)
• DLQ count
• Handler p99 duration
• Partition hot-key skew

Lag growing under stable traffic = under-provisioned consumers or stuck handler.

### Practical code

```
// Outbox write (same transaction)
@Transactional
public Order createOrder(CreateOrder cmd) {
  Order o = orderRepo.save(Order.from(cmd));
  outboxRepo.save(new OutboxEvent(
    UUID.randomUUID(), "OrderCreated", o.id(), toJson(o), OutboxStatus.PENDING));
  return o;
}

// Idempotent consumer
@Transactional
public void onOrderCreated(Event e) {
  try {
    processedRepo.insert(e.id()); // unique(event_id)
  } catch (DuplicateKeyException ex) {
    return; // already processed
  }
  searchIndex.add(e.payload());
}

// Kafka producer essentials
props.put("acks", "all");
props.put("enable.idempotence", "true");
```

### Tips

- Kafka producer idempotence ≠ exactly-once business effects — still dedupe in the consumer/DB.
- Outbox is mandatory when DB + event must not diverge.
- Alert on consumer lag and DLQ depth, not only error logs.
- Pick partition keys for the ordering you actually need.
