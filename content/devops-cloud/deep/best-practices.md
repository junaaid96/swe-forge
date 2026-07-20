---
id: devops-cloud-deep-best-practices
track: best-practices
---

# DevOps & Cloud — Deep: Best Practices

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Observability

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Why Observability Shows Up in Interviews

Modern system design rubrics explicitly grade operational maturity: how you detect failure, measure latency, and roll back safely.

Observability ≠ just “we have logs.” It means you can answer:
• Is the user experience healthy right now?
• Where is time spent on a slow request?
• What changed (deploy, config, traffic)?
• Are we burning our error budget?

Tools: Prometheus/Grafana, OpenTelemetry, Datadog, ELK/Loki, CloudWatch — concepts transfer across vendors.

### Logs, Metrics, Traces

Logs: discrete events. Structured JSON + correlation/request IDs. Levels matter (INFO vs ERROR).

Metrics: aggregates over time. RED for services (Rate, Errors, Duration). USE for resources (Utilization, Saturation, Errors).

Traces: request journey across services as spans. Essential for microservices latency debugging.

Golden rule: propagate a correlation ID on every hop (HTTP header / message attribute).

### SLIs, SLOs, Alerts

SLI: quantitative measure of user happiness (e.g. successful requests / total).
SLO: target (e.g. 99.9% success over 30 days).
Error budget: how much unreliability you can “spend” on changes.

Alert on SLO burn / user symptoms, not every CPU spike. Include runbooks. Page humans for actionable pain; ticket the rest.

Dashboards should show deploy markers so you can correlate regressions instantly.

### Debugging with Telemetry

Slow p99?
1. Check RED dashboard + recent deploys
2. Open a slow trace — find the longest span
3. Confirm with DB metrics (locks, pool waits) or dependency errors
4. Fix (query, timeout, cache, capacity)
5. Verify p99 and error rate recover

Logging pitfalls: logging secrets/PII; unbounded debug logs in prod; missing IDs so you cannot stitch a story.

### Practical code

```
// OpenTelemetry-style mental model (pseudo)
Span root = tracer.spanBuilder("POST /orders").startSpan();
try (Scope s = root.makeCurrent()) {
  Span db = tracer.spanBuilder("db.findUser").startSpan();
  try { userRepo.find(userId); }
  finally { db.end(); }

  Span pay = tracer.spanBuilder("http.payment").startSpan();
  try { paymentClient.charge(order); }
  finally { pay.end(); }

  meter.counter("orders.created").add(1);
  log.info("order_created", Map.of("orderId", id, "traceId", root.getSpanContext().getTraceId()));
} finally {
  root.end();
}

// Prometheus RED (conceptual)
// http_requests_total{status}
// http_request_duration_seconds_bucket
// http_requests_errors_total
```

### Tips

- In system design, dedicate 60 seconds to monitoring, alerts, and rollback — interviewers notice.
- Prefer structured logs with requestId over free-text paragraphs.
- p50 can look fine while p99 burns users — always quote tail latency.
- Correlation IDs are the cheapest high-leverage observability feature.
