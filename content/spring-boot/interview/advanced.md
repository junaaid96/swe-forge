---
id: spring-boot-interview-advanced
level: advanced
---

# Spring Boot — Interview (Advanced)

# Spring Boot Advanced — Interview Study Guide (Q1–13)

> **Spring Boot 3.x** · Jakarta EE (`jakarta.*`) · Java 17+ · Maven

---

## Q1. Interceptor annotations (`HandlerInterceptor`, `WebMvcConfigurer`)

**Answer:** Spring MVC interceptors run before/after controller execution (and after view rendering). Implement `HandlerInterceptor` (or extend `HandlerInterceptorAdapter` — deprecated) and register via `WebMvcConfigurer.addInterceptors()`. Use for logging, auth checks, timing, locale switching — not for business logic.

**Example:**

```java
@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        long start = System.currentTimeMillis();
        request.setAttribute("startTime", start);
        return true;  // false = abort request
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler, Exception ex) {
        long start = (long) request.getAttribute("startTime");
        long duration = System.currentTimeMillis() - start;
        // log request.getRequestURI(), duration, response.getStatus()
    }
}
```

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final RequestLoggingInterceptor loggingInterceptor;

    public WebConfig(RequestLoggingInterceptor loggingInterceptor) {
        this.loggingInterceptor = loggingInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loggingInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/public/**");
    }
}
```

**Key takeaway:** Interceptors sit in the **MVC pipeline** (not the Servlet Filter chain) — use Filters for security/header manipulation, Interceptors for MVC-specific cross-cutting concerns.

---

## Q2. Swagger purpose (advanced perspective)

**Answer:** Swagger (now OpenAPI) provides a **machine-readable API contract** and interactive documentation UI. Benefits: client code generation, contract testing, API discovery, and developer onboarding. In Boot 3, springdoc-openapi generates specs from runtime introspection of controllers, DTOs, and validation annotations.

**Example:**

```java
@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI orderApi() {
        return new OpenAPI()
            .info(new Info()
                .title("Order Service API")
                .version("v1")
                .description("Internal order management"))
            .components(new Components()
                .addSecuritySchemes("bearer-jwt",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
            .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"));
    }
}
```

```yaml
# Export spec at build time (CI artifact)
springdoc:
  api-docs:
    enabled: true
  writer-with-default-pretty-printer: true
```

**Key takeaway:** OpenAPI is the **contract between teams** — treat generated specs as source-of-truth for API versioning and consumer-driven tests.

---

## Q3. Spring Data JPA vs Hibernate (deeper comparison)

**Answer:**

**Hibernate** (JPA provider):
- Session-level cache (first-level), optional second-level cache (EhCache, Redis via Hibernate ORM)
- Dirty checking, lazy loading, flush modes
- `@Entity` lifecycle callbacks, `@Embeddable`, inheritance strategies
- N+1 problem originates here — fix with `JOIN FETCH`, `@EntityGraph`, DTO projections

**Spring Data JPA**:
- Repository abstraction — no `EntityManager` boilerplate
- Derived query methods, `@Query` (JPQL/native), Specifications, Projections
- Pagination/sorting via `Pageable`
- `@Modifying` for bulk updates, `@Transactional` on repository methods

**When to bypass Spring Data JPA:**
- Complex dynamic queries → Criteria API or QueryDSL
- Bulk JDBC operations → `JdbcTemplate` or jOOQ
- Performance-critical paths → native queries with `@Query(nativeQuery = true)`

**Example:**

```java
@Entity
@NamedEntityGraph(name = "Order.withItems",
    attributeNodes = @NamedAttributeNode("items"))
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    private List<OrderItem> items = new ArrayList<>();
}

public interface OrderRepository extends JpaRepository<Order, Long> {

    @EntityGraph(value = "Order.withItems", type = EntityGraph.EntityGraphType.FETCH)
    Optional<Order> findWithItemsById(Long id);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Order o SET o.status = :status WHERE o.id = :id")
    int updateStatus(@Param("id") Long id, @Param("status") OrderStatus status);
}
```

**Key takeaway:** Hibernate owns **ORM behavior and performance traps** (N+1, lazy init); Spring Data JPA owns **repository ergonomics** — know both layers for senior interviews.

---

## Q4. Docker deeper (multi-stage Dockerfile)

**Answer:** Multi-stage builds separate build and runtime environments: Stage 1 uses full JDK + Maven to compile; Stage 2 copies only the JAR into a slim JRE image. This reduces image size, attack surface, and excludes source/build tools from production.

**Example:**

```dockerfile
# Stage 1: Build
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN apk add --no-cache maven && \
    mvn -B -DskipTests clean package

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /build/target/demo-*.jar app.jar
USER app
EXPOSE 8080

# JVM container-aware defaults
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

```yaml
# Kubernetes deployment snippet
spec:
  containers:
    - name: order-service
      image: registry.example.com/order-service:1.2.0
      ports:
        - containerPort: 8080
      env:
        - name: SPRING_PROFILES_ACTIVE
          value: prod
      livenessProbe:
        httpGet:
          path: /actuator/health/liveness
          port: 8080
      readinessProbe:
        httpGet:
          path: /actuator/health/readiness
          port: 8080
```

**Key takeaway:** Multi-stage + non-root user + JRE-only runtime + Actuator probes = **production-grade container pattern** for Boot services.

---

## Q5. Caching (`@EnableCaching`, `@Cacheable`)

**Answer:** Spring Cache abstraction decouples caching from implementation (ConcurrentHashMap default, Redis, Caffeine, EhCache). Enable with `@EnableCaching`. Annotate read methods with `@Cacheable`, updates with `@CachePut`, deletes with `@CacheEvict`.

**Example:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

```java
@SpringBootApplication
@EnableCaching
public class App { ... }
```

```yaml
spring:
  cache:
    type: redis
    redis:
      time-to-live: 3600000  # 1 hour ms
  data:
    redis:
      host: localhost
      port: 6379
```

```java
@Service
@CacheConfig(cacheNames = "products")
public class ProductService {

    @Cacheable(key = "#id", unless = "#result == null")
    @Transactional(readOnly = true)
    public ProductDto findById(Long id) {
        return repo.findById(id).map(ProductDto::from).orElse(null);
    }

    @CacheEvict(key = "#id")
    public ProductDto update(Long id, UpdateProductRequest req) {
        // update DB, return fresh DTO
    }

    @CacheEvict(allEntries = true)
    public void rebuildCatalog() { ... }
}
```

**Key takeaway:** `@Cacheable` uses **AOP proxies** — self-invocation within the same class bypasses cache; inject self or move cache annotations to a separate facade.

---

## Q6. Async processing (`@EnableAsync`, `@Async`)

**Answer:** `@EnableAsync` activates Spring's async method execution via `TaskExecutor` beans. `@Async` on methods runs them in a separate thread pool. Return `CompletableFuture` or `void`. Configure a custom executor for production load.

**Example:**

```java
@SpringBootApplication
@EnableAsync
public class App { ... }
```

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    @Bean(name = "taskExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(16);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}
```

```java
@Service
public class NotificationService {

    @Async("taskExecutor")
    public CompletableFuture<Void> sendEmailAsync(String to, String body) {
        // long-running email send
        return CompletableFuture.completedFuture(null);
    }
}

@Service
public class OrderService {
    public void placeOrder(Order order) {
        repo.save(order);
        notificationService.sendEmailAsync(order.getEmail(), "Order confirmed");
        // returns immediately — email sends in background
    }
}
```

**Key takeaway:** `@Async` breaks **transaction boundaries** — the async method runs outside the caller's transaction; handle errors via `AsyncUncaughtExceptionHandler`.

---

## Q7. Multiple data sources (full config classes)

**Answer:** For two JPA persistence units, create separate `@Configuration` classes each with `@EnableJpaRepositories`, `LocalContainerEntityManagerFactoryBean`, and `JpaTransactionManager`. Mark one `@Primary`.

**Example:**

```java
@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(
    basePackages = "com.example.orders.repo",
    entityManagerFactoryRef = "primaryEntityManagerFactory",
    transactionManagerRef = "primaryTransactionManager"
)
public class PrimaryJpaConfig {

    @Primary
    @Bean
    @ConfigurationProperties("spring.datasource.primary")
    DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Primary
    @Bean
    LocalContainerEntityManagerFactoryBean primaryEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("primaryDataSource") DataSource ds) {
        return builder
            .dataSource(ds)
            .packages("com.example.orders.entity")
            .persistenceUnit("primary")
            .build();
    }

    @Primary
    @Bean
    PlatformTransactionManager primaryTransactionManager(
            @Qualifier("primaryEntityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }
}
```

```java
@Configuration
@EnableJpaRepositories(
    basePackages = "com.example.analytics.repo",
    entityManagerFactoryRef = "analyticsEntityManagerFactory",
    transactionManagerRef = "analyticsTransactionManager"
)
public class AnalyticsJpaConfig {

    @Bean
    @ConfigurationProperties("spring.datasource.analytics")
    DataSource analyticsDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    LocalContainerEntityManagerFactoryBean analyticsEntityManagerFactory(
            EntityManagerFactoryBuilder builder,
            @Qualifier("analyticsDataSource") DataSource ds) {
        return builder
            .dataSource(ds)
            .packages("com.example.analytics.entity")
            .persistenceUnit("analytics")
            .build();
    }

    @Bean
    PlatformTransactionManager analyticsTransactionManager(
            @Qualifier("analyticsEntityManagerFactory") EntityManagerFactory emf) {
        return new JpaTransactionManager(emf);
    }
}
```

```java
@Service
public class ReportingService {
    @Transactional("analyticsTransactionManager")
    public void saveReport(Report report) {
        analyticsRepo.save(report);
    }
}
```

**Key takeaway:** Each persistence unit needs its own **EMF + TransactionManager + `@EnableJpaRepositories` scope** — specify `transactionManager` on `@Transactional` when crossing units.

---

## Q8. `@ComponentScan` purpose

**Answer:** `@ComponentScan` tells Spring where to search for stereotyped classes (`@Component`, `@Service`, `@Repository`, `@Controller`, `@Configuration`). `@SpringBootApplication` includes `@ComponentScan` on its own package and sub-packages. Use explicit `basePackages` when beans live outside the main package tree.

**Example:**

```java
@SpringBootApplication
@ComponentScan(basePackages = {
    "com.example.orders",
    "com.example.shared.lib"
})
public class OrderApplication { ... }
```

```java
// Exclude specific auto-config or components
@ComponentScan(
    basePackages = "com.example",
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.REGEX,
        pattern = "com\\.example\\.legacy\\..*"
    )
)
```

```java
// @Import for explicit configuration classes (not component scanning)
@Configuration
@Import({RedisConfig.class, MetricsConfig.class})
public class InfraConfig { ... }
```

**Key takeaway:** Misplaced `@SpringBootApplication` (wrong package) is a **common "beans not found" bug** — root package must be an ancestor of all `@Component` classes.

---

## Q9. Monitor with Actuator (expose endpoints, custom)

**Answer:** Production monitoring combines endpoint exposure, Micrometer metrics, custom health indicators, and optional custom Actuator endpoints via `@Endpoint` / `@ReadOperation`.

**Example:**

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,loggers
  endpoint:
    health:
      show-details: when_authorized
      group:
        readiness:
          include: db,redis,customService
  metrics:
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active:default}
```

```java
@Component
public class PaymentGatewayHealthIndicator implements HealthIndicator {

    private final PaymentClient client;

    public PaymentGatewayHealthIndicator(PaymentClient client) {
        this.client = client;
    }

    @Override
    public Health health() {
        try {
            client.ping();
            return Health.up().withDetail("gateway", "reachable").build();
        } catch (Exception ex) {
            return Health.down(ex).withDetail("gateway", "unreachable").build();
        }
    }
}
```

```java
@Component
@Endpoint(id = "features")
public class FeatureFlagEndpoint {

    private final FeatureService features;

    public FeatureFlagEndpoint(FeatureService features) {
        this.features = features;
    }

    @ReadOperation
    public Map<String, Boolean> flags() {
        return features.allFlags();
    }
}
```

**Key takeaway:** Use **health groups** for K8s probes, **Micrometer + Prometheus** for metrics, and custom `@Endpoint` for operational toggles — never expose `/env` publicly.

---

## Q10. Distributed tracing with OpenTelemetry

**Answer:** Spring Boot 3.2+ integrates Micrometer Tracing with OpenTelemetry as the default tracer. Traces propagate across HTTP calls and messaging. Export spans to Jaeger, Zipkin, or OTLP collectors.

**Example:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-otlp</artifactId>
</dependency>
```

```yaml
management:
  tracing:
    sampling:
      probability: 1.0  # reduce in prod (e.g., 0.1)
  otlp:
    tracing:
      endpoint: http://otel-collector:4318/v1/traces

logging:
  pattern:
    level: "%5p [${spring.application.name:},%X{traceId:-},%X{spanId:-}]"
```

```java
@RestController
public class OrderController {
    private final Tracer tracer;  // Micrometer Tracer

    @GetMapping("/api/orders/{id}")
    public OrderDto get(@PathVariable Long id) {
        Span span = tracer.nextSpan().name("fetch-order").start();
        try (Tracer.SpanInScope ws = tracer.withSpan(span)) {
            span.tag("order.id", String.valueOf(id));
            return orderService.findById(id);
        } finally {
            span.end();
        }
    }
}
```

**Key takeaway:** Correlate logs with **`traceId`/`spanId` in MDC** — OpenTelemetry is the Boot 3 standard; Sleuth is legacy.

---

## Q11. Enable HTTPS (keystore, `server.ssl.*`)

**Answer:** Configure embedded Tomcat for TLS using a keystore (JKS or PKCS12). Set `server.ssl.*` properties. In production, TLS often terminates at a load balancer; embedded HTTPS is common for local/dev and service-mesh mTLS.

**Example:**

```bash
# Generate PKCS12 keystore (dev only)
keytool -genkeypair -alias tomcat -keyalg RSA -keysize 2048 \
  -storetype PKCS12 -keystore keystore.p12 -validity 365 \
  -storepass changeit -keypass changeit \
  -dname "CN=localhost, OU=Dev, O=Example, L=City, ST=State, C=US"
```

```yaml
server:
  port: 8443
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: changeit
    key-store-type: PKCS12
    key-alias: tomcat
    # Optional: enforce TLS 1.2+
    enabled-protocols: TLSv1.2,TLSv1.3
```

```java
// Redirect HTTP → HTTPS (if running dual connectors)
@Configuration
public class HttpsRedirectConfig {

    @Bean
    ServletWebServerFactory servletContainer() {
        TomcatServletWebServerFactory tomcat = new TomcatServletWebServerFactory();
        tomcat.addAdditionalTomcatConnectors(httpConnector());
        return tomcat;
    }

    private Connector httpConnector() {
        Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
        connector.setScheme("http");
        connector.setPort(8080);
        connector.setSecure(false);
        connector.setRedirectPort(8443);
        return connector;
    }
}
```

**Key takeaway:** Never commit keystore passwords — use env vars (`SERVER_SSL_KEY_STORE_PASSWORD`) and prefer **edge TLS termination** in cloud deployments.

---

## Q12. Custom health checks (`HealthIndicator`)

**Answer:** Implement `HealthIndicator` (or extend `AbstractHealthIndicator`) to report subsystem status aggregated into `/actuator/health`. Boot auto-registers all `HealthIndicator` beans. Use `HealthContributorRegistry` for dynamic registration.

**Example:**

```java
@Component
public class DatabaseMigrationHealthIndicator implements HealthIndicator {

    private final MigrationStatusService migrationStatus;

    public DatabaseMigrationHealthIndicator(MigrationStatusService migrationStatus) {
        this.migrationStatus = migrationStatus;
    }

    @Override
    public Health health() {
        if (migrationStatus.isUpToDate()) {
            return Health.up()
                .withDetail("latestVersion", migrationStatus.latestVersion())
                .build();
        }
        return Health.outOfService()
            .withDetail("pendingMigrations", migrationStatus.pendingCount())
            .build();
    }
}
```

```yaml
management:
  health:
    db:
      enabled: true
    diskspace:
      enabled: true
  endpoint:
    health:
      group:
        readiness:
          include: readinessState,db,databaseMigrationHealthIndicator
        liveness:
          include: livenessState
```

```java
// Reactive variant for WebFlux
@Component
public class ExternalApiHealthIndicator implements ReactiveHealthIndicator {
    @Override
    public Mono<Health> health() {
        return webClient.get().uri("/ping")
            .retrieve()
            .toBodilessEntity()
            .map(r -> Health.up().build())
            .onErrorResume(ex -> Mono.just(Health.down(ex).build()));
    }
}
```

**Key takeaway:** Custom health indicators drive **orchestrator routing decisions** — return `OUT_OF_SERVICE` for dependency failures that should drain traffic, `DOWN` for fatal errors.

---

## Q13. RabbitMQ send/receive

**Answer:** Use `spring-boot-starter-amqp` for Spring AMQP + RabbitMQ. Boot auto-configures `ConnectionFactory`, `RabbitTemplate`, and `RabbitAdmin`. Define queues/exchanges via `@Bean` or `@RabbitListener` declarations. Use JSON message conversion for DTOs.

**Example:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

```yaml
spring:
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest
    listener:
      simple:
        acknowledge-mode: manual
        prefetch: 10
        default-requeue-rejected: false
```

```java
@Configuration
public class RabbitConfig {

    public static final String EXCHANGE = "orders.exchange";
    public static final String QUEUE = "orders.created";
    public static final String ROUTING_KEY = "order.created";

    @Bean
    Queue orderCreatedQueue() {
        return QueueBuilder.durable(QUEUE).build();
    }

    @Bean
    DirectExchange orderExchange() {
        return new DirectExchange(EXCHANGE);
    }

    @Bean
    Binding binding(Queue orderCreatedQueue, DirectExchange orderExchange) {
        return BindingBuilder.bind(orderCreatedQueue)
            .to(orderExchange)
            .with(ROUTING_KEY);
    }

    @Bean
    MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
```

```java
@Service
public class OrderEventPublisher {
    private final RabbitTemplate rabbit;

    public OrderEventPublisher(RabbitTemplate rabbit) {
        this.rabbit = rabbit;
    }

    public void publishOrderCreated(OrderCreatedEvent event) {
        rabbit.convertAndSend(
            RabbitConfig.EXCHANGE,
            RabbitConfig.ROUTING_KEY,
            event
        );
    }
}
```

```java
@Component
public class OrderEventListener {

    @RabbitListener(queues = RabbitConfig.QUEUE)
    public void onOrderCreated(OrderCreatedEvent event, Channel channel,
                               @Header(AmqpHeaders.DELIVERY_TAG) long tag) throws IOException {
        try {
            // idempotent processing
            channel.basicAck(tag, false);
        } catch (Exception ex) {
            channel.basicNack(tag, false, false);  // send to DLQ
        }
    }
}
```

**Key takeaway:** Use **manual acks + DLQ (dead-letter queue)** for reliable messaging — design consumers to be idempotent because RabbitMQ guarantees at-least-once delivery.
