---
id: backend-deep-best-practices
track: best-practices
---

# Backend — Deep: Best Practices

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Idempotency

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Definition and why networks force it

An operation is idempotent if performing it once or many times has the same effect as performing it once.

In distributed systems, timeouts are ambiguous: the server may have succeeded while the client saw failure. Clients retry. Without idempotency you get double charges, duplicate orders, and double emails.

Reliability requires retries; retries require idempotency.

### HTTP semantics reminder

GET, PUT, DELETE are idempotent by spec intent (PUT replaces the same resource).
POST is not idempotent by default — creating a payment twice creates two payments.

Make POST safe with Idempotency-Key (Stripe-style):
• Client sends unique key per logical action
• Server stores key → response/result
• Retries with same key return the original result without re-executing side effects

### Implementation pattern

1) Require Idempotency-Key on sensitive POSTs
2) Begin transaction
3) INSERT into idempotency_keys(key, request_hash, status, response) — unique(key)
4) If duplicate key with same hash: return stored response
5) If duplicate with different hash: 409 conflict
6) Else perform work, store response, commit

Include request hash so a reused key with a different body cannot silently do the wrong thing.
Expire keys after a retention window (e.g. 24h) with a TTL job.

### Messaging and exactly-once effect

Brokers give at-least-once. Exactly-once effect is an application property:
• Stable event identity
• Dedupe table or upsert natural key
• Side effects inside the same transaction as the dedupe insert when possible

Kafka EOS helps Kafka-internal pipelines; once you touch an external DB/API, you still design idempotent handlers.

### Practical examples

Payments: key = wallet-tx-uuid from client.
Order create: key per checkout attempt.
Webhook handlers: use provider event id as dedupe key.
Email: store notification already sent for order X type Y.

Anti-pattern: dedupe only in Redis without DB uniqueness — Redis flush re-enables duplicates.

### Testing idempotency

Replay the same request 10 times — assert one row, one charge, same response body/code.
Chaos: kill the server between commit and response; client retries; still one effect.
For consumers: deliver the same Kafka record twice in a test harness.

### Practical code

```
@PostMapping("/payments")
public ResponseEntity<?> pay(@RequestHeader("Idempotency-Key") String key,
                             @RequestBody PaymentRequest req) {
  String hash = sha256(req);
  return tx.execute(status -> {
    var existing = idemRepo.find(key);
    if (existing.isPresent()) {
      if (!existing.get().hash.equals(hash))
        return ResponseEntity.status(409).body("key reused with different body");
      return ResponseEntity.status(existing.get().code).body(existing.get().body);
    }
    PaymentResult result = payments.charge(req);
    idemRepo.insert(key, hash, 201, result);
    return ResponseEntity.status(201).body(result);
  });
}
```

### Tips

- Treat every timeout as maybe succeeded — design retries accordingly.
- Persist idempotency records in the same DB as the side effect when you can.
- Hash the request body with the key to prevent key reuse mistakes.
- Idempotency is a product feature for payments, not an afterthought.
