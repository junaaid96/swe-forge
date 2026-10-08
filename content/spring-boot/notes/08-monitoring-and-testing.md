# 8. Monitoring & Testing — Actuator, Prometheus, Grafana, Resilience4j, Observability

## 8.1 Spring Boot Actuator — the foundation everything else builds on

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, metrics, prometheus, info
  endpoint:
    health:
      probes:
        enabled: true          # exposes /actuator/health/liveness and /readiness — see Cloud & DevOps
      show-details: when-authorized
```

`/actuator/health`, `/actuator/metrics`, `/actuator/prometheus` — Actuator exposes operational data about your running app without you writing any of this yourself. Never expose the full Actuator surface publicly without securing it (`/actuator/env` can leak secrets) — restrict it to an internal network path or lock it behind the security config from the [Security](./04-security.md) guide.

## 8.2 Micrometer + OpenTelemetry — the new default combo

Micrometer is the metrics *facade* (vendor-neutral API — you code against Micrometer, it ships to Prometheus/Datadog/whatever backend you choose). **What's new in Spring Boot 4:** a first-party `spring-boot-starter-opentelemetry` (Boot 4.0 ships Micrometer 1.16; Boot 4.1 moves to Micrometer 1.17). One dependency now gives you the OpenTelemetry SDK, Micrometer Tracing bridged to OTel, and OTLP export for traces, metrics and logs; previously you wired Micrometer Tracing and an OTel exporter together yourself.

```java
@Service
public class OrderService {
    private final MeterRegistry meterRegistry;

    public OrderService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public void placeOrder(Order order) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            // ... business logic ...
            meterRegistry.counter("orders.placed", "status", "success").increment();
        } finally {
            sample.stop(meterRegistry.timer("orders.placement.duration"));
        }
    }
}
```

**Distributed tracing in practice:** `RestClient`, `WebClient` and the declarative HTTP interface clients built on them are instrumented with Micrometer Observation, so as long as you build them from Boot's auto-configured builders, trace context (W3C `traceparent`) propagates on every outbound call without manual code. A trace started at your API gateway flows through the order, payment and inventory calls, and you see one end-to-end waterfall in Grafana Tempo or Jaeger instead of stitching logs together by hand. A client created with `new RestTemplate()` or a bare `RestClient.create()` skips this instrumentation, which is the usual reason traces break.

## 8.3 Prometheus + Grafana — the metrics pipeline

```
Your app exposes /actuator/prometheus
        ↓ (Prometheus scrapes on an interval)
Prometheus (time-series DB, stores metrics + runs alerting rules)
        ↓
Grafana (dashboards — queries Prometheus via PromQL)
```

```promql
# Example PromQL: 95th percentile order placement latency over 5 minutes
histogram_quantile(0.95, rate(orders_placement_duration_seconds_bucket[5m]))
```

A minimal, high-value dashboard for any microservice: request rate, error rate, p95/p99 latency (the "RED" method — Rate, Errors, Duration), plus JVM heap usage and GC pause time (directly relevant given the virtual threads discussion in [Core framework](./01-core-framework.md) — watch for carrier-thread pinning via JFR events, not just heap graphs).

## 8.4 Distributed tracing — Zipkin vs Jaeger vs OTel Collector

All three do the same fundamental job (collect and visualize distributed traces); the current default architecture in 2026 is to export via the **OpenTelemetry Protocol (OTLP)** to an **OTel Collector**, which then fans out to whichever backend you want (Jaeger, Zipkin, Grafana Tempo, a commercial APM) — this decouples your application code from any specific tracing backend, so switching backends later doesn't require touching instrumentation code.

```yaml
management:
  tracing:
    sampling:
      probability: 0.1   # sample 10% of requests — 100% is rarely worth the storage/perf cost in production
  opentelemetry:
    tracing:
      export:
        otlp:
          endpoint: http://otel-collector:4318/v1/traces   # Boot 3.x used management.otlp.tracing.endpoint
```

## 8.5 Resilience4j — and how much of it Spring Boot 4 now absorbs

Resilience4j gives you circuit breakers, retries, rate limiters, and bulkheads as composable decorators. It replaced Netflix Hystrix, which has been in maintenance mode since 2018.

```java
@Service
public class InventoryClient {
    @CircuitBreaker(name = "inventoryService", fallbackMethod = "fallbackStock")
    @Retry(name = "inventoryService")
    @RateLimiter(name = "inventoryService")
    public StockLevel checkStock(String sku) {
        return restClient.get().uri("/stock/{sku}", sku).retrieve().body(StockLevel.class);
    }

    private StockLevel fallbackStock(String sku, Exception ex) {
        return StockLevel.unknown(sku); // degrade gracefully instead of failing the whole request
    }
}
```

```yaml
resilience4j:
  circuitbreaker:
    instances:
      inventoryService:
        sliding-window-size: 20
        failure-rate-threshold: 50
        wait-duration-in-open-state: 10s
  retry:
    instances:
      inventoryService:
        max-attempts: 3
        wait-duration: 500ms
```

**What's new and directly relevant here:** Spring Framework 7 (the base of Spring Boot 4) builds retry and concurrency throttling into the core framework: `@Retryable`, `@ConcurrencyLimit` and `RetryTemplate`, switched on with `@EnableResilientMethods`. For simple, single-call retry/throttling needs, you may no longer need the Resilience4j dependency at all going forward. For the full pattern set — circuit breakers with fallback methods, bulkheads, composed multi-decorator policies — Resilience4j remains the more complete toolkit; treat the new framework-native features as covering the simple 80% case, not a full replacement.

## 8.6 Testcontainers — the modern default for integration tests

Instead of testing against H2 (whose SQL dialect diverges from Postgres in subtle ways) or a shared "test database" that different test runs can corrupt for each other, Testcontainers spins up real Docker containers (real Postgres, real Kafka, real Redis) scoped to your test run.

```java
@SpringBootTest
@Testcontainers
class OrderServiceIntegrationTest {

    // @ServiceConnection (Boot 3.1+) wires the datasource URL/credentials and
    // Kafka bootstrap servers automatically — no @DynamicPropertySource needed
    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18-alpine");

    @Container
    @ServiceConnection
    static KafkaContainer kafka = new KafkaContainer("apache/kafka:4.1.0");

    @Test
    void placingOrderPublishesOutboxEvent() {
        // real Postgres, real Kafka, real behavior — including real constraint violations,
        // real transaction semantics, real serialization — none of which H2 reliably reproduces
    }
}
```

This is the single highest-value testing change to adopt if you're not already using it: it catches an entire category of "worked in tests, broke in production because H2 doesn't enforce the same constraint/behaves differently" bugs, and it directly exercises the Outbox/Kafka flow from [Messaging & async](./05-messaging-and-async.md) end-to-end instead of mocking it away.

## 8.7 Putting it together — the observability story for one request

1. Request hits the Gateway (Cloud & DevOps) → trace ID generated, propagated via OTel.
2. Passes through the Spring Security filter chain (Security) → auth failures show up as a metric + a span event, not just a log line.
3. Hits `OrderController` → Micrometer records request duration; RED-method Grafana dashboard updates.
4. Calls `InventoryClient` wrapped in Resilience4j → circuit breaker state itself is exported as a metric (`resilience4j_circuitbreaker_state`), so you can alert *before* it fully opens, not just after.
5. Publishes to Kafka via the Outbox (Messaging & async) → trace context propagates into the Kafka message headers, so the trace continues into the downstream consumer's processing span.
6. A Testcontainers-based integration test in CI (the Cloud & DevOps pipeline) already exercised this exact path with real infrastructure before it ever reached production.

## Go Deeper
- SLOs/error budgets (Google SRE model) built on top of the RED metrics above — turns "the dashboard looks bad" into "we've burned 40% of this month's error budget"
- Structured logging (JSON logs with trace ID correlation) so logs, metrics, and traces all pivot on the same identifier in Grafana
- Chaos engineering (deliberately killing a pod, injecting latency) to verify the circuit breakers and readiness probes above actually behave as designed under failure, not just in the happy path
