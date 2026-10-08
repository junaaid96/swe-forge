# Spring AOP, Request Lifecycle & Interview Checklist

This chapter fills the remaining gaps from the Spring track: aspect-oriented programming with `@Aspect`, how a request flows through `DispatcherServlet`, profiles and configuration, and a rapid-fire checklist of the Spring questions that come up most.

---

## 1. Aspect-oriented programming

AOP lets you apply **cross-cutting concerns** (logging, metrics, security checks, transactions, caching, retries) without scattering that code through every method.

| Term | Meaning |
|---|---|
| **Aspect** | a class that bundles cross-cutting logic (`@Aspect`) |
| **Join point** | a point in execution; in Spring AOP always a method call |
| **Pointcut** | an expression selecting join points (`execution(* com.app.service..*(..))`, `@annotation(Audited)`) |
| **Advice** | code that runs at a join point: `@Before`, `@AfterReturning`, `@AfterThrowing`, `@After`, `@Around` |
| **Weaving** | linking aspects to targets; Spring does it at runtime with **proxies** |

```java
@Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD)
public @interface Timed {}

@Aspect
@Component
public class TimingAspect {
  private static final Logger log = LoggerFactory.getLogger(TimingAspect.class);

  @Around("@annotation(com.app.Timed)")
  public Object time(ProceedingJoinPoint pjp) throws Throwable {
    long start = System.nanoTime();
    try {
      return pjp.proceed();
    } finally {
      log.info("{} took {} ms", pjp.getSignature().toShortString(),
               (System.nanoTime() - start) / 1_000_000);
    }
  }
}
```

### 1.1 Proxies and their pitfalls

- Spring wraps beans in a **JDK dynamic proxy** (when the bean implements an interface) or a **CGLIB subclass proxy**. Spring Boot defaults to CGLIB.
- **Self-invocation bypasses the proxy:** calling `this.otherMethod()` inside the same bean skips `@Transactional`, `@Cacheable`, `@Async` and your aspects. Move the method to another bean or inject the proxy.
- Only **public** methods are reliably advised; `final` classes and methods cannot be proxied by CGLIB.
- `@Transactional` itself is implemented as an aspect: that's why these rules matter for transactions too.

> **Asked as:** "Why doesn't `@Transactional` work when I call the method from the same class?"

## 2. Request lifecycle in Spring MVC

1. The servlet container (Tomcat) receives the request; **servlet filters** run (Spring Security's filter chain lives here).
2. **`DispatcherServlet`** (the front controller) asks **`HandlerMapping`** which controller method matches.
3. **`HandlerInterceptor.preHandle`** runs (logging, locale, simple auth checks).
4. The **`HandlerAdapter`** resolves arguments (`@PathVariable`, `@RequestParam`, `@RequestBody` via `HttpMessageConverter`/Jackson), runs validation (`@Valid`), and invokes the controller.
5. The return value is serialised by a message converter (REST) or resolved by a **`ViewResolver`** (MVC views).
6. Exceptions go to **`@ControllerAdvice` / `@ExceptionHandler`** to become consistent error responses (e.g. RFC 7807 `ProblemDetail`).
7. `postHandle` / `afterCompletion` interceptors run, then filters unwind.

**Filter vs interceptor vs aspect:** filters are servlet-level and see every request (including static resources); interceptors are Spring MVC-level and know the handler; aspects work on any Spring bean method, not just web calls.

## 3. Configuration and profiles

- `application.yml` + `application-{profile}.yml`; activate with `spring.profiles.active=prod` or `SPRING_PROFILES_ACTIVE`.
- `@Profile("dev")` on beans or configuration classes; `@ConditionalOnProperty` for feature toggles.
- **Type-safe config:** `@ConfigurationProperties(prefix = "app.mail")` on a record, validated with `@Validated`.
- **Precedence (high → low, simplified):** command-line args → environment variables → profile-specific files → `application.yml` → defaults. Secrets come from env vars or a vault, never from committed files.

---

## 4. Rapid-fire checklist

| Question | One-line answer |
|---|---|
| Spring vs Spring Boot? | Boot adds auto-configuration, starter dependencies, an embedded server and production defaults on top of Spring. |
| How does auto-configuration work? | `@EnableAutoConfiguration` loads candidates listed in `AutoConfiguration.imports`; `@ConditionalOnClass/OnMissingBean/OnProperty` decide which apply. |
| Bean scopes? | singleton (default), prototype, request, session, application, websocket. |
| Constructor vs field injection? | Constructor: immutable, required deps explicit, easy to test without Spring. |
| `@Component` vs `@Bean`? | `@Component` marks your class for scanning; `@Bean` methods create third-party or custom-configured objects. |
| Bean lifecycle hooks? | constructor → dependency injection → `@PostConstruct` → in use → `@PreDestroy`; `BeanPostProcessor`s wrap beans (that's where proxies are created). |
| Transaction propagation? | `REQUIRED` joins or creates; `REQUIRES_NEW` suspends and starts a new one; `NESTED` uses savepoints. Rollback by default only on unchecked exceptions. |
| N+1 queries in JPA? | lazy associations loaded per row; fix with `JOIN FETCH`, `@EntityGraph`, batch fetching, or DTO projections. |
| `@RestController`? | `@Controller` + `@ResponseBody`. |
| Security basics? | `SecurityFilterChain` bean; stateless JWT resource server or session-based; method security with `@PreAuthorize`. |
| Actuator? | health, metrics (Micrometer → Prometheus), info, env endpoints; lock them down in production. |
| Testing slices? | `@WebMvcTest` (controllers + MockMvc), `@DataJpaTest` (repositories), `@SpringBootTest` (full context), Testcontainers for real databases. |
