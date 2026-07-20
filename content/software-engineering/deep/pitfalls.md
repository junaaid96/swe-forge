---
id: software-engineering-deep-pitfalls
track: pitfalls
---

# Software Engineering — Deep: Pitfalls

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Debugging

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Systematic Process

1. Reproduce: make the bug happen consistently. If you can't reproduce it, you can't fix it. Find the minimal reproduction case.

2. Isolate: binary search your codebase. Add logging to narrow down — is it in the controller? Service? DB query? External API call?

3. Identify ROOT CAUSE: symptom ≠ cause. NullPointerException at line 42 means something BEFORE line 42 returned null. Ask "why?" 5 times.

4. Fix the ROOT CAUSE, not the symptom. Adding a null check without understanding why the object was null = hiding the bug, not fixing it.

5. Verify: confirm fix resolves the issue AND doesn't break other things. Run full test suite.

6. Prevent: write a test that would have caught this. The bug reveals a gap in test coverage.

### IntelliJ IDE Debugging

Breakpoints: click in gutter (red circle). Right-click for options:
• Conditional: only pause when condition is true (userId.equals(42L))
• Log: evaluate + print expression without stopping execution
• Exception breakpoint: pause when specific exception is thrown (even if caught)

Navigation:
F8   Step Over — execute current line, go to next
F7   Step Into — enter the method being called
Shift+F8  Step Out — exit current method, return to caller
F9   Resume — run until next breakpoint
Alt+F8  Evaluate Expression — run arbitrary code in current context

Watches: monitor expression values at each step.
Hot Code Swap: edit method body while debugging — no restart needed for method body changes.

### Logging Best Practices

Always use SLF4J + Logback (Spring Boot default). NEVER System.out.println() in production code.
With Lombok: @Slf4j on class → auto-generates static Logger field.

Log levels (ascending severity):
TRACE: finest detail — disabled in production
DEBUG: developer info (intermediate values, cache hit/miss)
INFO: business events ("Order created: 123", "Payment processed", "User logged in")
WARN: unexpected but recoverable ("Retry 2/3", "Cache miss for hot key")
ERROR: failure requiring attention — pass exception as LAST argument → SLF4J logs full stack trace

MDC (Mapped Diagnostic Context): attach correlation ID to ALL log lines in a request thread.
Pattern in logback.xml: [%X{correlationId}] %-5level %logger - %msg%n
Essential in microservices — trace a single request across 5 services in logs.

### Common Java Bugs

NullPointerException: use Optional<>, @NonNull, Objects.requireNonNull(), defensive null checks.
ConcurrentModificationException: modifying collection while iterating it. Fix: Iterator.remove(), stream filter+collect, CopyOnWriteArrayList.
LazyInitializationException (JPA): accessing lazy association after Hibernate session closes. Fix: JOIN FETCH in query, or @Transactional on service method.
StackOverflowError: infinite recursion. Check your base case — it's always missing or wrong.
OutOfMemoryError: memory leak — unclosed streams, static collections growing forever. Fix: try-with-resources.
Deadlock: two threads waiting for each other's locks. Fix: consistent lock ordering, tryLock() with timeout.

Production tools:
jstack <pid>: thread dump → find BLOCKED threads (deadlock detection).
jmap -dump:file=h.hprof <pid>: heap dump → analyze in VisualVM or Eclipse MAT.
Spring Actuator /actuator/loggers: change log level at runtime without restart.

### Practical code

```
// Production debugging patterns in Spring Boot

// 1. @Slf4j + structured logging (Lombok)
@Service
@Slf4j
public class PaymentService {

    public PaymentResult processPayment(PaymentRequest request) {
        // {} placeholders are lazily evaluated — safe and performant
        log.debug("Processing payment: requestId={}, amount={}, userId={}",
                  request.getId(), request.getAmount(), request.getUserId());
        try {
            PaymentResult result = gateway.charge(request);
            log.info("Payment successful: requestId={}, transactionId={}",
                     request.getId(), result.getTransactionId());
            return result;
        } catch (GatewayTimeoutException ex) {
            log.warn("Gateway timeout, retry pending: requestId={}", request.getId());
            throw ex;
        } catch (Exception ex) {
            // Pass exception as LAST argument → SLF4J prints the full stack trace
            log.error("Unexpected payment failure: requestId={}", request.getId(), ex);
            throw new PaymentException("Payment failed", ex);
        }
    }
}

// 2. Correlation ID via MDC — trace requests across microservices
@Component
public class CorrelationFilter implements OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req,
            HttpServletResponse res, FilterChain chain) throws IOException, ServletException {
        String id = Optional.ofNullable(req.getHeader("X-Correlation-Id"))
            .orElse(UUID.randomUUID().toString());
        MDC.put("correlationId", id);         // appended to ALL log lines in this thread
        res.setHeader("X-Correlation-Id", id);
        try   { chain.doFilter(req, res); }
        finally { MDC.clear(); }              // MUST clear — thread pool reuses threads!
    }
}
// logback.xml pattern: %d [%X{correlationId}] %-5level %logger - %msg%n
// Output: 2024-01-15 [req-abc-123] INFO  PaymentService - Payment successful: tx-456

// 3. LazyInitializationException — most common Spring JPA bug
// WRONG: Hibernate session closes after findById() returns
@RestController
public class OrderController {
    public OrderDTO getOrder(@PathVariable Long id) {
        Order order = orderRepo.findById(id).get(); // transaction + session ends here
        order.getItems().size(); // 💥 LazyInitializationException — session is closed!
    }
}

// FIX 1: JOIN FETCH — loads Order + Items in ONE query (preferred)
@Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.id = :id")
Optional<Order> findByIdWithItems(@Param("id") Long id);

// FIX 2: @Transactional on service — keeps session open until method returns
@Service
public class OrderService {
    @Transactional(readOnly = true)
    public OrderDTO getOrderWithItems(Long id) {
        Order order = orderRepo.findById(id).orElseThrow();
        order.getItems().size(); // session still open — works correctly
        return OrderDTO.from(order);
    }
}
```

### Tips

- When you find a bug, ask 'what test would have caught this?' then write that test. Every bug reveals a coverage gap.
- NEVER System.out.println in production — no log level, no timestamp, no context, can't be filtered, can't be aggregated by log tooling
- LazyInitializationException = JPA association accessed after session closed. 95% of the time: add JOIN FETCH to your JPQL query.
- Correlation IDs are essential in microservices — without them, tracing one request through 5 services' logs is nearly impossible
