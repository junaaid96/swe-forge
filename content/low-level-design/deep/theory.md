---
id: low-level-design-deep-theory
track: theory
---

# Low-Level Design — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Design Patterns

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Patterns are named solutions, not goals

A design pattern captures a recurring structure and the intent behind it. Memorizing UML is useless; explaining WHY you reached for Factory vs new Foo() is what matters.

Focus patterns for backends (GFG shortlist + daily Spring usage):
• Singleton — one shared instance (careful with state)
• Factory — decouple creation
• Decorator — add behavior without rewriting the core
• Observer — react to events

Also know Strategy (swap algorithms) — you already use it for payments.

### Singleton — when and when not

Intent: exactly one instance, global access.

Spring: @Component/@Service beans are singleton by default — that is usually what you want for stateless services.

Dangers:
• Mutable fields on singletons = request crosstalk under concurrency
• Classic double-checked locking bugs (pre-modern Java)
• Hard to test if accessed via static getInstance()

Prefer dependency injection over static singletons. Treat “singleton” as a lifecycle, not a pattern to force everywhere.

### Factory — create without coupling

Intent: let callers ask for a product without knowing concrete classes.

Examples:
• PaymentFactory.create("bkash") → BkashPayment
• ObjectMapper / HttpClient builders
• Spring BeanFactory / @Configuration @Bean methods

Use when creation logic is non-trivial (config, env, feature flags) or when you need to swap implementations.

### Decorator — extend without modify

Intent: wrap an object to add behavior while keeping the same interface (Open/Closed).

Examples:
• Java I/O: new BufferedInputStream(new FileInputStream(...))
• Spring: DataSource wrapping for metrics, caching decorator around a repository
• HTTP middleware / servlet filters chain

Decorator vs inheritance: wrapping composes at runtime; deep inheritance freezes hierarchy.

### Observer — react to changes

Intent: dependents get notified when a subject changes.

In-process: Spring ApplicationEventPublisher + @EventListener.
Across services: message broker topics (Kafka) — Observer at distributed scale.

Rules:
• Keep listeners fast or hand off to async executors
• Do not assume ordering unless the bus guarantees it
• Make handlers idempotent if events can replay

### Choosing among them

Need one shared stateless service? Singleton lifecycle via DI.
Need to construct variants? Factory/Strategy.
Need cross-cutting add-ons (logging, retry, metrics)? Decorator/middleware.
Need decoupled reactions? Observer/events.

Anti-pattern: Pattern zoo — three Factories wrapping two Singletons for a simple CRUD.

### Practical code

```
// Factory
public interface PaymentGateway { PaymentResult charge(Money m); }
public class PaymentFactory {
  public PaymentGateway create(String type) {
    return switch (type) {
      case "bkash" -> new BkashGateway();
      case "card" -> new CardGateway();
      default -> throw new IllegalArgumentException(type);
    };
  }
}

// Decorator — caching repository
public class CachingUserRepository implements UserRepository {
  private final UserRepository inner;
  private final Cache cache;
  public User findById(Long id) {
    return cache.get("u:"+id, () -> inner.findById(id));
  }
}

// Observer — Spring style
@Component
class OrderService {
  private final ApplicationEventPublisher events;
  public void place(Order o) {
    repo.save(o);
    events.publishEvent(new OrderPlaced(o.id()));
  }
}
@Component
class EmailListener {
  @EventListener @Async
  void on(OrderPlaced e) { mail.send(e.orderId()); }
}
```

### Tips

- Name the intent first, then the pattern — interviewers listen for intent.
- Spring singletons must stay stateless or use thread-safe structures.
- Decorator chains are middleware; keep each layer focused.
- Distributed Observer = messaging; assume at-least-once delivery.
