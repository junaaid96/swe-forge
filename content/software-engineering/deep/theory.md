---
id: software-engineering-deep-theory
track: theory
---

# Software Engineering — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Programming Fundamentals

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### OOP — 4 Pillars

Encapsulation: hide internal state, expose behavior via public methods. Private fields + getters/setters. Data safety first.

Inheritance: subclass inherits from parent (extends). Prefer composition over inheritance — "has-a" is safer than "is-a". Avoid deep chains.

Polymorphism: one interface, many implementations. Method overriding = runtime polymorphism (actual object type decides at runtime). Method overloading = compile-time.

Abstraction: expose only what's necessary. Abstract class = shared state + partial behavior. Interface = pure contract (multiple allowed in Java).

### SOLID Principles

S — Single Responsibility: one class = one reason to change. Don't mix DB logic + email logic + business logic.
O — Open/Closed: open for extension, closed for modification. Add behavior via new class, not editing existing.
L — Liskov Substitution: subclasses must be substitutable for their parent type without breaking behavior.
I — Interface Segregation: don't force classes to implement unused methods. Split large interfaces into focused ones.
D — Dependency Inversion: depend on abstractions (interfaces), not concrete implementations. Spring @Autowired enforces this.

### Key Design Patterns

Creational — HOW objects are created:
• Singleton: one shared instance (Spring @Component beans are singleton by default)
• Factory: decouple creation from usage
• Builder: step-by-step construction (Lombok @Builder, HttpRequest.newBuilder())

Structural — HOW objects are composed:
• Adapter: bridge between incompatible interfaces
• Decorator: add behavior without modifying class (Java I/O streams)

Behavioral — HOW objects communicate:
• Observer: pub/sub events (Spring ApplicationEvents, Kafka consumer)
• Strategy: swap algorithm at runtime (payment methods: bKash/card/cash)
• Command: encapsulate request as an object

### Clean Code Rules

Meaningful names: processPayment() not p(). UserRepository not UR.
Small functions: one function = one thing, ~20 lines max.
DRY: Don't Repeat Yourself — extract repeated logic into shared methods/utilities.
KISS: Keep It Simple. Simplest working solution is usually best.
Comment WHY, not WHAT. Code should be self-documenting.
No magic numbers: use named constants (static final int MAX_RETRY = 3).

### SOLID in production (deep dive)

Beyond definitions — how SOLID shows up in Spring services:

S: OrderService should not also send email and write SQL. Split orchestration vs infrastructure.
O: New payment method = new PaymentStrategy class, not a growing switch with 40 cases (unless sealed and exhaustive on purpose).
L: Don't make Ostrich extend Bird.fly() if it cannot fly — model capabilities as interfaces.
I: Avoid God interfaces like UserOps with 30 methods; split read vs admin ops.
D: Controllers/services depend on UserRepository interface; tests inject fakes.

Related deep topics: design-patterns, tdd, immutability.

### Practical code

```
// SOLID applied with Spring Boot

// BAD: one class, multiple responsibilities (SRP + DIP violated)
public class OrderService {
    public void placeOrder(Order order) {
        if (order.getAmount() <= 0) throw new RuntimeException("bad");
        DriverManager.getConnection("jdbc:...");  // DB — violates SRP + DIP
        new SmtpClient().send("order placed");    // email — violates SRP
    }
}

// GOOD: SOLID + Spring constructor injection
public interface OrderRepository    { void save(Order order); }      // I
public interface NotificationService { void notify(String msg); }    // I

@Service
public class OrderService {                                  // S — one responsibility
    private final OrderRepository repo;                     // D — interface, not impl
    private final NotificationService notifier;             // D

    public OrderService(OrderRepository repo,               // Spring resolves at runtime
                        NotificationService notifier) {
        this.repo = repo; this.notifier = notifier;
    }

    public void placeOrder(Order order) {
        validate(order);
        repo.save(order);                                   // SRP — delegates to repo
        notifier.notify("Order placed: " + order.getId());
    }

    private void validate(Order order) {
        if (order.getAmount().compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Amount must be positive");
    }
}

// Strategy Pattern — O (Open/Closed): add new payment without editing existing code
public interface PaymentStrategy { PaymentResult pay(BigDecimal amount); }
@Component("bkash") public class BkashPayment implements PaymentStrategy { ... }
@Component("card")  public class CardPayment  implements PaymentStrategy { ... }

@Service
public class CheckoutService {
    private final Map<String, PaymentStrategy> strategies; // Spring injects ALL impls
    public PaymentResult checkout(Order order, String method) {
        return strategies.get(method).pay(order.getAmount());
    }
}
```

### Tips

- Explain SOLID with concrete code from your eGeneration work — showing a class that violates SRP and how you split it is very powerful in interviews
- Abstract class vs interface: abstract class has state + partial implementation; interface is a pure contract. Java allows multiple interfaces.
- Design pattern questions: always explain the INTENT (why it solves the problem), not just the structure (what it looks like)
- Spring beans are Singleton by default — be aware of shared mutable state bugs in singleton services (never store request data in fields)
