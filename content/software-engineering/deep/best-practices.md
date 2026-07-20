---
id: software-engineering-deep-best-practices
track: best-practices
---

# Software Engineering — Deep: Best Practices

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Immutability

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### What immutability buys you

An immutable object’s state never changes after construction. Threads can share it freely without locks. Reasoning becomes local: if you hold a reference, you know the values.

Mutable shared state is the #1 source of Heisenbugs in backends. Immutability does not remove all concurrency issues (you still coordinate who publishes the next version), but it removes an entire class of in-place corruption bugs.

### How to build immutable types

Java patterns:
• private final fields; no setters
• defensive copies of mutable inputs (List.copyOf, Map.copyOf)
• return unmodifiable views
• records (Java 16+) for transparent carriers
• builders that produce a final instance

Kotlin data class with val, TypeScript readonly / as const, Python frozen dataclasses — same idea across languages.

### Updating immutable state

You do not mutate — you create a new version:
Order updated = order.withStatus(SHIPPED);

Persistent/functional collections (e.g. structural sharing) make this cheap for large trees. In typical services, copying a DTO/record is fine.

At the system level: event sourcing and append-only logs are immutability applied to history.

### Where mutation is OK

Local variables inside a method, StringBuilder while building a string, arrays in a tight algorithm before publishing an immutable result — mutation in a confined scope is fine.

Danger zone: caches, singletons, static maps, session objects visible to many threads. Prefer ConcurrentHashMap of immutable values, or replace the whole reference atomically (AtomicReference / volatile field of immutable snapshot).

### Practical domain modeling

Money: use immutable Money(amount, currency) — never setters on amount.
IDs: wrap in typed Id records.
API responses: map entities → immutable DTOs so controllers cannot accidentally dirty the persistence context.

Anti-pattern: “immutable” class with a final List field that is still mutable via list.add(). Use List.copyOf in the constructor.

### Practical code

```
public record Money(BigDecimal amount, Currency currency) {
  public Money {
    Objects.requireNonNull(amount);
    Objects.requireNonNull(currency);
    if (amount.scale() > currency.getDefaultFractionDigits())
      throw new IllegalArgumentException("scale");
  }
  public Money plus(Money other) {
    if (!currency.equals(other.currency)) throw new IllegalArgumentException("fx");
    return new Money(amount.add(other.amount), currency);
  }
}

public final class Order {
  private final String id;
  private final List<LineItem> items; // immutable
  private final OrderStatus status;

  public Order(String id, List<LineItem> items, OrderStatus status) {
    this.id = id;
    this.items = List.copyOf(items); // defensive copy
    this.status = status;
  }
  public List<LineItem> items() { return items; }
  public Order withStatus(OrderStatus s) { return new Order(id, items, s); }
}
```

### Tips

- final fields alone are not enough if they hold mutable collections.
- Prefer records for simple values; keep domain invariants in compact constructors.
- Share immutable snapshots across threads; publish new versions instead of editing.
- Immutability + messaging beats locks for many service designs.
