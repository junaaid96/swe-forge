# 1. Core Framework — Spring Core, IoC/DI, MVC, Auto-configuration

This is the layer everyone touches without thinking about it. `@Service`, `@Autowired`, `@RestController` all sit on top of these mechanisms.

---

## 1.1 IoC (Inversion of Control) & Dependency Injection

**What it is:** Instead of a class creating its own dependencies (`new PaymentService()`), you declare what you need and a container (the `ApplicationContext`) hands it to you. Control over object creation is inverted — the framework controls it, not your code.

**Why it matters:** Testability (swap in a mock), loose coupling (swap implementations without touching callers), and centralized lifecycle management.

```java
// Constructor injection — the recommended style since Spring 4.3+
// (no @Autowired needed on a single constructor)
@Service
public class OrderService {
    private final PaymentGateway paymentGateway;
    private final InventoryClient inventoryClient;

    public OrderService(PaymentGateway paymentGateway, InventoryClient inventoryClient) {
        this.paymentGateway = paymentGateway;
        this.inventoryClient = inventoryClient;
    }
}
```

Why constructor injection over field injection (`@Autowired private X x;`)? Fields can't be `final`, can't fail fast at startup as clearly, and make circular dependencies invisible until runtime. Constructor injection makes required dependencies explicit and lets you write plain unit tests with `new OrderService(mockGateway, mockClient)` — no Spring context needed.

**Bean scopes you'll actually use:**
| Scope | Lifetime |
|---|---|
| `singleton` (default) | One instance per Spring container |
| `prototype` | New instance every time it's requested |
| `request` | One instance per HTTP request (web apps) |
| `session` | One instance per HTTP session |

## 1.2 Bean Lifecycle

Every singleton bean goes through a defined sequence: **Instantiate → Populate properties (DI) → `@PostConstruct` → bean ready for use → `@PreDestroy` on shutdown.**

```java
@Component
public class CacheWarmer {
    @PostConstruct
    void warmUp() {
        // runs once, right after dependencies are injected
    }

    @PreDestroy
    void cleanup() {
        // runs on graceful shutdown — release connections, flush buffers
    }
}
```

For more control, implement `InitializingBean`/`DisposableBean`, or `BeanPostProcessor` if you need to intercept *every* bean's creation (used internally for things like `@Async` proxy creation).

## 1.3 ApplicationContext, Component Scanning, Stereotypes

`@Component`, `@Service`, `@Repository`, `@Controller` are all the same mechanism (they're all meta-annotated with `@Component`) — the different names exist purely for readability and, in `@Repository`'s case, automatic exception translation (JDBC/JPA exceptions get wrapped into Spring's `DataAccessException` hierarchy).

`@ComponentScan` (implied by `@SpringBootApplication`) walks your package tree at startup and registers matching classes as beans.

## 1.4 ApplicationEvent — decoupled communication inside one JVM

Before reaching for Kafka/RabbitMQ for something that's happening *within the same service*, consider Spring's built-in event bus. It's synchronous by default, in-process, and requires zero infrastructure.

```java
public record OrderPlacedEvent(String orderId, BigDecimal amount) {}

@Service
public class OrderService {
    private final ApplicationEventPublisher publisher;

    public void placeOrder(Order order) {
        // ... persist order ...
        publisher.publishEvent(new OrderPlacedEvent(order.getId(), order.getTotal()));
    }
}

@Component
public class OrderEventListener {
    @Async // run on a separate thread instead of blocking the publisher
    @EventListener
    public void onOrderPlaced(OrderPlacedEvent event) {
        // send confirmation email, update analytics, etc.
    }

    // Fires ONLY after the surrounding @Transactional commits successfully —
    // this is the pattern you want for "notify after DB write is durable"
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCommitted(OrderPlacedEvent event) {
        // safe to trigger external side effects here
    }
}
```

**How this relates to the Outbox Pattern:** the outbox row must be written *inside* the business transaction (directly in the service method, or from a `@TransactionalEventListener(phase = BEFORE_COMMIT)` listener) so that the state change and the event commit or roll back together; Debezium or a poller then ships it out as a real message. `AFTER_COMMIT` listeners are for best-effort side effects: if the process crashes right after the commit, that work is lost, which is exactly the gap the outbox closes.

## 1.5 Auto-configuration — the "magic"

Auto-configuration is just conditional `@Bean` registration. Spring Boot ships hundreds of `@Configuration` classes guarded by conditions like `@ConditionalOnClass`, `@ConditionalOnMissingBean`, `@ConditionalOnProperty`. If `PostgreSQL` driver + `DataSource` class are on the classpath and you haven't defined your own `DataSource` bean, Boot configures one for you from `application.yml`.

```java
@Configuration
@ConditionalOnClass(DataSource.class)
@ConditionalOnProperty(prefix = "app.feature", name = "custom-datasource", havingValue = "true")
public class MyDataSourceAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource(DataSourceProperties props) {
        return props.initializeDataSourceBuilder().build();
    }
}
```

**What's new in Spring Boot 4 (2026):** the autoconfigure JAR was a single giant module scanned on every startup regardless of which pieces you actually used — Spring Boot 4 breaks that monolith into modules, so your app only loads and evaluates conditions for the autoconfiguration relevant to dependencies actually on your classpath. Net effect: faster startup, especially noticeable on smaller microservices where the old scan was disproportionately expensive.

## 1.6 Java baseline: Java 21 vs Java 25 LTS

This affects every service you write, not just Spring. **Java 25** (September 2025) is the current LTS; **Java 27** (September 2026) is the latest six-month feature release, and the next LTS is expected to be Java 29 (September 2027). Most production systems still run Java 21 LTS. The practical migration advice: get every service onto Java 21 first, then move to Java 25 service by service once your dependencies certify support, rather than jumping straight to 25 everywhere.

Why Java 25 is worth planning for specifically:
- JDK 25 is the first LTS that includes JEP 491 (*Synchronize Virtual Threads without Pinning*, delivered in JDK 24) and final Scoped Values (JEP 506). This matters a lot if you use virtual threads (see below): in JDK 21, a virtual thread that blocked inside a `synchronized` block couldn't unmount from its carrier thread, silently degrading the concurrency benefit.
- ZGC (generational-only since JDK 24) keeps pause times typically under a millisecond, even on very large heaps.
- Compact object headers (JEP 519) are a product feature in JDK 25, enabled with `-XX:+UseCompactObjectHeaders`; they shrink object headers from 12 to 8 bytes on 64-bit JVMs. JDK 27 turns them on by default.

### Virtual Threads (Project Loom)

```java
// application.yml — turn on virtual threads for Tomcat request handling
spring:
  threads:
    virtual:
      enabled: true
```

With this one property, every servlet request runs on a virtual thread instead of a pooled platform thread. Blocking JDBC/HTTP calls no longer tie up a scarce OS thread — the JVM parks the virtual thread and frees the carrier thread to do other work. This is the single highest-leverage runtime change you can make to a typical blocking Spring MVC service without rewriting it reactively.

**The catch to actually understand, not just enable:** virtual threads don't eliminate bottlenecks, they relocate them. You can now generate far more concurrent requests than your downstream systems can handle, so explicitly bound every downstream resource (DB connection pool, HTTP client pool, semaphores around slow APIs). The remaining production risk is in application code: audit heavy `ThreadLocal` use (millions of virtual threads means millions of copies), check native/JNI calls that can still pin, and keep the JFR `jdk.VirtualThreadPinned` event on with alerts.

**Structured Concurrency** (still a preview API: fifth preview in JDK 25, seventh in JDK 27, so it needs `--enable-preview`) lets you treat a group of related subtasks (e.g., "fetch user profile" + "fetch user permissions" in parallel) as a single unit that fails/cancels together, instead of manually juggling `Future`s:

```java
try (var scope = StructuredTaskScope.open()) {
    var userTask = scope.fork(() -> userClient.fetch(userId));
    var permsTask = scope.fork(() -> permissionClient.fetch(userId));
    scope.join(); // waits for both; if either fails, cancels the other and throws
    return new UserView(userTask.get(), permsTask.get());
}
```

## Go Deeper
- Bean scopes edge cases: `@Scope("prototype")` inside a singleton (proxy issues) — search "Spring prototype bean in singleton scoped proxy"
- `@ConditionalOnClass` vs `@ConditionalOnBean` ordering pitfalls when writing your own starter
- Virtual threads + pinning: on JDK 21, run staging with `-Djdk.tracePinnedThreads=full` before enabling in production (the flag was removed in JDK 24; on newer JDKs record the JFR `jdk.VirtualThreadPinned` event instead)
- Next: [Data layer](./02-data-layer.md) — HikariCP pool sizing interacts directly with virtual threads. Once request threads stop being the bottleneck, connections become the contended resource; size the pool for what the database can handle, not for request concurrency
