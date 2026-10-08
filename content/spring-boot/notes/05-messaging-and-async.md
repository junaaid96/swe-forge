# 5. Messaging & Async — Kafka, RabbitMQ, Outbox, Saga in Spring Boot

This guide assumes you know Outbox, Saga and idempotency at the architecture-pattern level (see [Backend architecture patterns](../backend/01-backend-architecture-patterns.md)). It's deliberately lighter on theory and focused on **how those patterns actually get wired up in Spring Boot code**, plus what changed in Kafka 4.x.

## 5.1 Kafka 4.0 — ZooKeeper is gone, not deprecated

This is the headline Kafka infrastructure change. Apache Kafka 4.0 (March 2025) ships with ZooKeeper mode fully removed — KRaft, Kafka's own Raft-based metadata consensus, is now the only supported mode. The metadata quorum now lives inside Kafka itself, run by dedicated controller nodes executing the Raft protocol — for most platform teams this is the biggest operational shift since tiered storage, because it removes an entire separate distributed system (ZooKeeper) from your infrastructure.

Practical implications if you're standing up new Kafka clusters:
- Broker upgrades to 4.0+ require KRaft mode. A cluster still running in ZooKeeper mode must first move to a 3.x bridge release (3.9 is recommended), migrate its metadata to KRaft there, and only then upgrade to 4.x; you cannot jump straight from a ZooKeeper-based 3.x cluster to 4.0.
- The migration is real work but time-boxed, and the payoff (one fewer distributed system to run, patch and monitor) is ongoing.
- Kafka 4.0 also brings general availability of KIP-848, a new consumer group rebalance protocol designed to dramatically improve rebalance performance — fewer "stop the world" pauses during consumer scaling events.
- KIP-932 (Queues for Kafka) introduces **share groups**: cooperative consumption where multiple consumers in the same group can read from the same partition with per-record acknowledgement (accept, release, reject), giving traditional queue (RabbitMQ-style) semantics on top of Kafka's log. It was early access in 4.0, preview in 4.1, and became **generally available in Kafka 4.2** (February 2026) via `KafkaShareConsumer`. Worth evaluating if you've ever reached for RabbitMQ only because Kafka's one-consumer-per-partition model didn't fit.

## 5.2 Spring Kafka — basic producer/consumer

```java
@Service
public class OrderEventProducer {
    private final KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate;

    public void publish(OrderPlacedEvent event) {
        kafkaTemplate.send("order-events", event.orderId(), event);
    }
}

@Component
public class OrderEventConsumer {
    @KafkaListener(topics = "order-events", groupId = "inventory-service")
    public void onOrderPlaced(OrderPlacedEvent event, Acknowledgment ack) {
        inventoryService.reserveStock(event);
        ack.acknowledge(); // manual ack — only after successful processing
    }
}
```

```yaml
spring:
  kafka:
    consumer:
      enable-auto-commit: false           # Spring Kafka commits offsets for you
      isolation-level: read_committed     # only see committed transactional messages
    listener:
      ack-mode: manual                    # pairs with Acknowledgment above
```

## 5.3 Where Outbox actually lives in this stack

The Transactional Outbox Pattern solves the dual-write problem: you can't atomically both (a) commit a DB change and (b) publish a Kafka message, because they're two different systems. Here's the concrete Spring Boot shape:

```java
@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final OutboxEventRepository outboxRepository;

    @Transactional
    public void placeOrder(Order order) {
        orderRepository.save(order);                       // (1) business write
        outboxRepository.save(new OutboxEvent(              // (2) SAME transaction, SAME DB
            "OrderPlaced", order.getId(), toJson(order)
        ));
        // Both commit together or neither does — no dual-write problem.
    }
}
```

Then either:
- **Debezium (CDC)** tails the Postgres write-ahead log, sees the new `outbox_events` row, and publishes it to Kafka — no application polling code needed and the lowest latency, at the cost of running CDC infrastructure.
- **A `@Scheduled` poller** queries `outbox_events where published = false` every few seconds and publishes + marks as sent — simpler to reason about, no CDC infrastructure, but adds polling latency and load.

```java
@Scheduled(fixedDelay = 2000)
@Transactional
public void publishPendingEvents() {
    List<OutboxEvent> pending = outboxRepository.findTop100ByPublishedFalseOrderByCreatedAt();
    for (OutboxEvent evt : pending) {
        // Wait for the broker ack before marking the row as sent; a crash in between
        // just means the event is re-published later (consumers must be idempotent).
        kafkaTemplate.send(evt.getTopic(), evt.getAggregateId(), evt.getPayload()).join();
        evt.markPublished();
    }
}
```

With several app instances, make sure only one poller claims a batch at a time (for example `SELECT ... FOR UPDATE SKIP LOCKED`, or ShedLock around the scheduled method).

## 5.4 Where idempotency actually lives

Idempotency bites hardest on the consumer side. Kafka (and most brokers) guarantee **at-least-once** delivery by default, meaning your `@KafkaListener` method *will* occasionally receive the same message twice (consumer crash after processing but before committing offset, rebalance timing, etc.). The fix is always the same shape — a dedup/idempotency-key check before the side effect:

```java
@KafkaListener(topics = "order-events")
@Transactional
public void onOrderPlaced(OrderPlacedEvent event) {
    if (processedEventRepository.existsById(event.eventId())) {
        return; // already handled — safe no-op
    }
    inventoryService.reserveStock(event);
    processedEventRepository.save(new ProcessedEvent(event.eventId(), Instant.now()));
}
```

Keep the dedupe insert and the side effect in the **same database transaction**, and give `processed_events.event_id` a primary-key or unique constraint: if two deliveries race past the `existsById` check, the second insert fails and its transaction rolls back instead of reserving stock twice.

On the producer side, Kafka's **transactional producer** (read by consumers with the `read_committed` isolation shown above) plus idempotent producer config (`enable.idempotence=true`, on by default since Kafka 3.0) protects the *producer* side from duplicate writes on retry — but consumer-side idempotency like above is still your responsibility, because "exactly-once" only holds within a single Kafka-to-Kafka pipeline, not once you cross into your own database or an external API call.

## 5.5 Saga — orchestration vs choreography, in code terms

**Choreography** (each service reacts to events, no central coordinator):
```java
// Payment service listens for OrderPlaced, and itself emits PaymentCompleted/PaymentFailed
@KafkaListener(topics = "order-events")
public void onOrderPlaced(OrderPlacedEvent event) {
    boolean success = paymentGateway.charge(event.customerId(), event.amount());
    kafkaTemplate.send(success ? "payment-completed" : "payment-failed", event.orderId());
}
```

**Orchestration** (a saga coordinator service explicitly calls each step and handles compensation):
```java
public class OrderSagaOrchestrator {
    public void execute(OrderSagaContext ctx) {
        try {
            paymentService.charge(ctx);
            inventoryService.reserve(ctx);
            shippingService.schedule(ctx);
        } catch (SagaStepException e) {
            compensate(ctx, e.failedStep());
        }
    }
}
```

Choreography scales better with fewer services and less central coupling; orchestration becomes easier to reason about and debug once you have 4+ steps with real compensation logic — the coordinator gives you one place to look instead of tracing events across five services' logs.

## 5.6 RabbitMQ — when it's the better fit over Kafka

Kafka is a distributed commit log optimized for high-throughput, replayable event streams. RabbitMQ is a traditional message broker optimized for flexible routing (topic/fanout/direct exchanges), per-message priority, and complex queueing semantics without needing consumer groups or partitioning to reason about. Choose RabbitMQ when you need request/reply-style messaging, complex routing rules, or a queue depth is small enough that Kafka's operational overhead isn't justified — choose Kafka when you need replay, high throughput, and multiple independent consumer groups reading the same stream.

## 5.7 @Async and @Scheduled — the lightweight, no-broker option

```java
@EnableAsync
@Configuration
public class AsyncConfig {
    @Bean(name = "taskExecutor") // the name @Async looks up by default
    Executor taskExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor(); // Java 21+, see Core framework
    }
}

@Service
public class NotificationService {
    @Async
    public void sendConfirmationEmail(Order order) { ... } // fire-and-forget, off the request thread
}
```

## Go Deeper
- Kafka Streams / ksqlDB if you need stream processing (windowed aggregations, joins between topics) rather than just pub/sub
- Schema Registry (Avro/Protobuf) for enforcing message contracts across producer/consumer teams — prevents the "someone changed the JSON shape and broke three consumers" incident
- Dead-letter queues and retry topics — what happens after your idempotency check *still* fails N times
- Next: [Caching & storage](./06-caching-and-storage.md) — the Outbox table itself is a storage design decision, and this is where that discussion continues
