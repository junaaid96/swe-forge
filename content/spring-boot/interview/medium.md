---
id: spring-boot-interview-medium
level: medium
---

# Spring Boot — Interview (Medium)

# Spring Boot Intermediate — Interview Study Guide (Q1–23)

> **Spring Boot 3.x** · Jakarta EE (`jakarta.*`) · Java 17+ · Maven

---

## Q1. Basic Spring Boot annotations (intermediate depth)

**Answer:** Beyond stereotypes, intermediate apps rely on web, validation, transaction, and configuration annotations:

| Category | Annotations |
|----------|-------------|
| **Web** | `@RestController`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `@PathVariable`, `@RequestParam`, `@RequestBody`, `@ResponseStatus` |
| **Validation** | `@Valid`, `@NotNull`, `@NotBlank`, `@Size`, `@Email` (Jakarta Validation) |
| **Persistence** | `@Entity`, `@Table`, `@Id`, `@GeneratedValue`, `@Column`, `@Transactional` |
| **Config** | `@Configuration`, `@Bean`, `@ConfigurationProperties`, `@Import`, `@ConditionalOnProperty` |
| **Testing** | `@SpringBootTest`, `@WebMvcTest`, `@MockBean`, `@Autowired` |

**Example:**

```java
@RestController
@RequestMapping("/api/items")
@Validated
public class ItemController {

    @PostMapping
    public ResponseEntity<ItemDto> create(@Valid @RequestBody CreateItemRequest req) {
        // @Valid triggers Jakarta Bean Validation
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }
}
```

```java
public record CreateItemRequest(
    @NotBlank String name,
    @Positive BigDecimal price
) {}
```

**Key takeaway:** Prefer **constructor injection** + **records/DTOs with validation annotations** — this is the modern Boot 3 style interviewers expect.

---

## Q2. How do you change the Tomcat port?

**Answer:** Set `server.port` in properties, YAML, environment variable, or command line. Boot's embedded Tomcat binds to this port on startup.

**Example:**

```properties
server.port=9090
```

```yaml
server:
  port: 9090
```

```bash
SERVER_PORT=9090 java -jar app.jar
java -jar app.jar --server.port=9090
```

**Key takeaway:** `server.port` is the single most common override — know all four configuration sources (file, YAML, env, CLI).

---

## Q3. What is the starter dependency of a Spring Boot module?

**Answer:** Each Spring Boot feature area publishes a starter artifact (`spring-boot-starter-{feature}`) that transitively pulls required libraries. Your module's `pom.xml` declares starters instead of individual JARs. The starter itself contains almost no code — it is a curated dependency list.

**Example:**

```xml
<!-- This ONE dependency brings: Spring MVC, Jackson, Tomcat, Logback, validation API -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

Inspect the dependency tree:

```bash
mvn dependency:tree -Dincludes=org.springframework.boot
```

**Key takeaway:** When asked "what does your web module depend on?" — answer with the **starter name**, then explain what it transitively includes.

---

## Q4. What is the default Tomcat port?

**Answer:** **8080**. If port 8080 is in use, Boot fails fast at startup with `PortInUseException` unless you configure `server.port` or enable random port (`server.port=0`).

**Example:**

```yaml
# Random available port (useful in tests)
server:
  port: 0
```

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiIntegrationTest {
    @LocalServerPort
    int port;
}
```

**Key takeaway:** Default is **8080** — mention random port assignment for parallel integration tests.

---

## Q5. How do you disable the default web server?

**Answer:** Set `spring.main.web-application-type=none` to run a non-web application (batch jobs, CLI runners). Alternatively exclude servlet auto-configuration classes.

**Example:**

```yaml
spring:
  main:
    web-application-type: none
```

```java
@SpringBootApplication
public class BatchApplication implements CommandLineRunner {

    public static void main(String[] args) {
        SpringApplication.run(BatchApplication.class, args);
    }

    @Override
    public void run(String... args) {
        System.out.println("Batch job finished — no HTTP server started");
    }
}
```

**Key takeaway:** `web-application-type=none` prevents Tomcat from starting — use for workers, schedulers, and Kafka consumers that don't serve HTTP.

---

## Q6. How do you disable specific auto-configuration?

**Answer:** Use `@SpringBootApplication(exclude = {...})` or `@EnableAutoConfiguration(exclude = {...})` to prevent unwanted auto-config classes from loading. Also use `spring.autoconfigure.exclude` in properties.

**Example:**

```java
@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class
})
public class NoDatabaseApp { ... }
```

```properties
spring.autoconfigure.exclude=\
  org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,\
  org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration
```

```yaml
spring:
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration
```

**Key takeaway:** Exclude auto-config when the classpath has libraries you don't want activated (e.g., H2 on classpath in a non-DB service) — prefer exclusion over `@Conditional` hacks.

---

## Q7. How do you create a non-web Spring Boot application?

**Answer:** Combine `spring.main.web-application-type=none` with a `CommandLineRunner`, `ApplicationRunner`, or `@Scheduled` tasks. Use `spring-boot-starter` (not `starter-web`) to avoid pulling servlet APIs.

**Example:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter</artifactId>
</dependency>
```

```java
@SpringBootApplication
public class ReportGeneratorApp {

    public static void main(String[] args) {
        new SpringApplicationBuilder(ReportGeneratorApp.class)
            .web(WebApplicationType.NONE)
            .run(args);
    }

    @Bean
    CommandLineRunner generateReport(ReportService service) {
        return args -> service.generate(args[0]);
    }
}
```

**Key takeaway:** Non-web apps still benefit from Boot's DI, config, and Actuator — just skip `starter-web`.

---

## Q8. Explain `@RestController` (intermediate depth)

**Answer:** `@RestController` = `@Controller` + `@ResponseBody`. Handler return values bypass view resolution and go through `HttpMessageConverter` (Jackson for JSON). Supports content negotiation via `produces`/`consumes`, status codes via `@ResponseStatus` or `ResponseEntity`, and validation via `@Valid`.

**Example:**

```java
@RestController
@RequestMapping(value = "/api/products", produces = MediaType.APPLICATION_JSON_VALUE)
public class ProductController {

    @GetMapping("/{id}")
    public ProductDto get(@PathVariable Long id) {
        return productService.findById(id);
    }

    @ExceptionHandler(ProductNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> notFound(ProductNotFoundException ex) {
        return Map.of("error", ex.getMessage());
    }
}
```

**Key takeaway:** `@RestController` is for **API endpoints returning serialized bodies** — pair with DTOs, not entities, to control JSON shape and avoid lazy-loading issues.

---

## Q9. `@Controller` vs `@RestController`

**Answer:**

| | `@Controller` | `@RestController` |
|---|---------------|-------------------|
| **Return type** | View name (`String`) or model | JSON/XML body |
| **`@ResponseBody`** | Required per method for JSON | Implicit on all methods |
| **Use case** | Server-rendered HTML (Thymeleaf) | REST APIs |
| **Example return** | `"home"` → resolves `home.html` | `UserDto` → JSON |

**Example:**

```java
@Controller
public class PageController {
    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("title", "Welcome");
        return "index";  // templates/index.html
    }

    @GetMapping("/api/status")
    @ResponseBody
    public Map<String, String> status() {
        return Map.of("status", "ok");
    }
}
```

**Key takeaway:** MVC apps often use **both** — `@Controller` for pages, `@RestController` (or `@ResponseBody`) for AJAX/API endpoints.

---

## Q10. `@RequestMapping` vs `@GetMapping`

**Answer:** `@GetMapping` is a composed annotation equivalent to `@RequestMapping(method = RequestMethod.GET)`. Composed mappings (`@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping`, `@PatchMapping`) are preferred for readability. `@RequestMapping` remains useful for class-level base paths or mapping multiple HTTP methods.

**Example:**

```java
// Equivalent pairs:
@GetMapping("/users")
public List<User> list() { ... }

@RequestMapping(value = "/users", method = RequestMethod.GET)
public List<User> listLegacy() { ... }

// @RequestMapping shines for multiple methods:
@RequestMapping(value = "/resource", method = {GET, HEAD})
public ResponseEntity<Void> check() { ... }
```

**Key takeaway:** Use **HTTP verb-specific annotations** in REST APIs; reserve `@RequestMapping` for shared prefixes and edge cases.

---

## Q11. Profiles (intermediate depth)

**Answer:** Profiles isolate beans and configuration per environment. Activate via `spring.profiles.active`, env var `SPRING_PROFILES_ACTIVE`, or CLI. Multiple profiles: `dev,local`. `@Profile` on `@Configuration` or `@Bean` controls bean registration. Profile-specific files: `application-prod.yml`.

**Example:**

```java
@Bean
@Profile("!prod")
public DataSource devDataSource() {
    return new EmbeddedDatabaseBuilder()
        .setType(EmbeddedDatabaseType.H2)
        .build();
}

@Bean
@Profile("prod")
@ConfigurationProperties("spring.datasource")
public DataSource prodDataSource() {
    return DataSourceBuilder.create().build();
}
```

```yaml
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: jdbc:postgresql://${DB_HOST}/app
```

**Key takeaway:** Use `@Profile("!prod")` for dev-only beans; never commit prod secrets — inject via env vars in profile-specific config.

---

## Q12. How do you enable Actuator?

**Answer:** Add `spring-boot-starter-actuator` dependency and configure endpoint exposure. Boot 3 exposes only `health` over HTTP by default; explicitly enable others.

**Example:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

```yaml
management:
  endpoints:
    web:
      base-path: /actuator
      exposure:
        include: health,info,metrics,env,loggers
  endpoint:
    health:
      probes:
        enabled: true  # Kubernetes liveness/readiness
  info:
    env:
      enabled: true
info:
  app:
    name: Order Service
    version: 1.2.0
```

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/metrics/jvm.memory.used
```

**Key takeaway:** Actuator is **off by default for sensitive endpoints** — always configure exposure + secure with Spring Security in production.

---

## Q13. Exception handling with `@ControllerAdvice` and `@ExceptionHandler`

**Answer:** `@ControllerAdvice` (or `@RestControllerAdvice`) defines global exception handlers across controllers. `@ExceptionHandler` on a method handles specific exception types and returns consistent error responses.

**Example:**

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
            .toList();
        return new ErrorResponse("VALIDATION_ERROR", "Invalid request", details);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse("NOT_FOUND", ex.getMessage(), List.of());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGeneral(Exception ex) {
        return new ErrorResponse("INTERNAL_ERROR", "Unexpected error", List.of());
    }
}

public record ErrorResponse(String code, String message, List<String> details) {}
```

**Key takeaway:** Centralized exception handling produces **consistent API error contracts** — never leak stack traces to clients in production.

---

## Q14. Swagger / OpenAPI integration

**Answer:** Spring Boot 3 uses **springdoc-openapi** (not Springfox, which is incompatible with Boot 3). It auto-generates OpenAPI 3 docs from controllers and exposes Swagger UI.

**Example:**

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.6.0</version>
</dependency>
```

```yaml
springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
```

```java
@OpenAPIDefinition(info = @Info(title = "Order API", version = "v1"))
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Operation(summary = "Get order by ID")
    @ApiResponse(responseCode = "404", description = "Order not found")
    @GetMapping("/{id}")
    public OrderDto get(@PathVariable Long id) { ... }
}
```

Access: `http://localhost:8080/swagger-ui.html`

**Key takeaway:** **springdoc-openapi** is the Boot 3 standard — mention Springfox is legacy and breaks on Jakarta EE namespace migration.

---

## Q15. Spring Security basics

**Answer:** Spring Security protects endpoints via a `SecurityFilterChain` bean. Boot 3 uses lambda DSL configuration (no `WebSecurityConfigurerAdapter` — removed). Default behavior: all endpoints require authentication, HTTP Basic enabled, CSRF enabled for browser forms.

**Example:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .httpBasic(Customizer.withDefaults())
            .csrf(csrf -> csrf.ignoringRequestMatchers("/api/**"))
            .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

**Key takeaway:** Boot 3 Security = **`SecurityFilterChain` `@Bean`** + `authorizeHttpRequests` — know role-based access and which endpoints to permit (health, swagger in dev only).

---

## Q16. Configuration ways (properties, YAML, env, command line)

**Answer:** Boot's relaxed binding accepts the same property in multiple formats. Priority (highest wins): command-line args > Java system properties > OS env vars > profile-specific config files > `application.properties/yml`.

**Example:**

```yaml
# application.yml
app:
  max-retries: 3
  api-key: ${API_KEY:default-dev-key}
```

```bash
# Environment variable (relaxed binding)
export APP_MAX_RETRIES=5

# Command line (highest priority)
java -jar app.jar --app.max-retries=10 --spring.profiles.active=prod
```

```java
@ConfigurationProperties(prefix = "app")
public record AppConfig(int maxRetries, String apiKey) {}

@Configuration
@EnableConfigurationProperties(AppConfig.class)
public class AppConfigRegistration {}
```

**Key takeaway:** **Relaxed binding** maps `app.max-retries`, `APP_MAX_RETRIES`, and `app.maxRetries` to the same field — critical for 12-factor apps.

---

## Q17. Spring Data JPA vs Hibernate

**Answer:**

| | **Hibernate** | **Spring Data JPA** |
|---|---------------|---------------------|
| **What** | JPA implementation (ORM engine) | Abstraction layer on top of JPA |
| **Role** | Maps objects ↔ SQL, session management, caching | Repository interfaces, query methods, pagination |
| **API** | `EntityManager`, Criteria API, HQL | `JpaRepository`, `@Query`, derived queries |
| **Boilerplate** | More manual CRUD code | `save()`, `findById()` generated for free |

Hibernate **is** the default JPA provider in Boot. Spring Data JPA **uses** Hibernate under the hood.

**Example:**

```java
// Spring Data JPA — no implementation class needed
public interface OrderRepository extends JpaRepository<Order, Long> {
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    @Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.id = :id")
    Optional<Order> findByIdWithItems(@Param("id") Long id);
}

// Raw Hibernate/JPA — EntityManager approach
@Service
public class OrderService {
    @PersistenceContext
    private EntityManager em;

    public Order find(Long id) {
        return em.find(Order.class, id);
    }
}
```

**Key takeaway:** Use **Spring Data JPA for repositories**; drop to `EntityManager` or `@Query` only when derived queries aren't expressive enough.

---

## Q18. Docker basics for Spring Boot

**Answer:** Package the app as an executable JAR and containerize with a JVM base image. Use multi-stage builds in production (see Advanced Q4). Set `SERVER_PORT` to match container EXPOSE port. Prefer distroless or slim JRE images.

**Example:**

```dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY target/demo-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: prod
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/app
    depends_on:
      - db
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: secret
```

```bash
mvn clean package -DskipTests
docker build -t myapp:1.0 .
docker run -p 8080:8080 -e SPRING_PROFILES_ACTIVE=prod myapp:1.0
```

**Key takeaway:** Boot's fat JAR + Docker = standard cloud deployment — configure via **environment variables**, not baked-in properties files with secrets.

---

## Q19. `@Component` vs `@Service` vs `@Repository`

**Answer:** All three are stereotyped `@Component` annotations detected by component scanning. Semantic differences:

| Annotation | Layer | Special behavior |
|------------|-------|------------------|
| `@Component` | Generic bean | None |
| `@Service` | Business logic | None (semantic only) |
| `@Repository` | Data access | `@PersistenceExceptionTranslationPostProcessor` translates DB exceptions to Spring `DataAccessException` |

**Example:**

```java
@Component
public class IdGenerator {
    public String next() { return UUID.randomUUID().toString(); }
}

@Service
@Transactional
public class OrderService {
    private final OrderRepository repo;
    public OrderService(OrderRepository repo) { this.repo = repo; }
}

@Repository
public class AuditJdbcRepository {
    private final JdbcTemplate jdbc;
    public AuditJdbcRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
}
```

**Key takeaway:** The JVM treats them identically — use the right stereotype for **clarity and exception translation** (`@Repository`).

---

## Q20. Testing REST APIs (`@WebMvcTest`, MockMvc, `@SpringBootTest`)

**Answer:**

| Annotation | Scope | Speed |
|------------|-------|-------|
| `@WebMvcTest` | Web layer only (single controller) | Fast |
| `@SpringBootTest` | Full application context | Slow |
| `@DataJpaTest` | JPA + in-memory DB | Medium |

**Example:**

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    OrderService orderService;

    @Test
    void getOrder_returns200() throws Exception {
        when(orderService.findById(1L)).thenReturn(new OrderDto(1L, "PAID"));

        mockMvc.perform(get("/api/orders/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PAID"));
    }
}
```

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderIntegrationTest {

    @Autowired
    TestRestTemplate restTemplate;

    @Test
    void healthCheck() {
        ResponseEntity<String> response =
            restTemplate.getForEntity("/actuator/health", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
```

**Key takeaway:** **Test pyramid** — many `@WebMvcTest` unit-slice tests, fewer `@SpringBootTest` integration tests; use `@MockBean` to isolate layers.

---

## Q21. Multiple data sources

**Answer:** Define multiple `DataSource` beans with `@Primary` on the default. Create separate `@Configuration` classes for each `LocalContainerEntityManagerFactoryBean` and `JpaTransactionManager`. Mark repositories with `@EnableJpaRepositories` pointing to the correct factory/ref.

**Example:**

```yaml
spring:
  datasource:
    primary:
      url: jdbc:postgresql://localhost/orders
      username: orders_user
      password: secret
    analytics:
      url: jdbc:postgresql://localhost/analytics
      username: analytics_user
      password: secret
```

```java
@Configuration
@EnableConfigurationProperties
public class DataSourceConfig {

    @Primary
    @Bean
    @ConfigurationProperties("spring.datasource.primary")
    DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean
    @ConfigurationProperties("spring.datasource.analytics")
    DataSource analyticsDataSource() {
        return DataSourceBuilder.create().build();
    }
}
```

See **Advanced Q7** for full dual-EMF configuration.

**Key takeaway:** Multiple datasources require **explicit bean wiring** — auto-config handles only one primary `DataSource`.

---

## Q22. Actuator role (intermediate depth)

**Answer:** Actuator bridges development and operations:

- **Health checks** — liveness/readiness for Kubernetes (`/actuator/health/liveness`)
- **Metrics** — JVM, HTTP, custom timers/counters (Micrometer → Prometheus/Grafana)
- **Info** — build version, git commit (`/actuator/info`)
- **Loggers** — change log levels at runtime without restart
- **Env/Configprops** — debug configuration (lock down in prod)

**Example:**

```java
@Component
public class OrderMetrics {
    private final Counter ordersCreated;

    public OrderMetrics(MeterRegistry registry) {
        this.ordersCreated = registry.counter("orders.created");
    }

    public void recordCreated() {
        ordersCreated.increment();
    }
}
```

```yaml
management:
  metrics:
    export:
      prometheus:
        enabled: true
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
```

**Key takeaway:** Actuator turns Boot apps into **observable services** — pair with Micrometer and secure sensitive endpoints.

---

## Q23. Kafka integration

**Answer:** Add `spring-kafka` starter. Configure bootstrap servers, consumer group, serializers. Use `@KafkaListener` for consumers and `KafkaTemplate` for producers. Boot auto-configures `ConsumerFactory`, `ProducerFactory`, and `KafkaTemplate`.

**Example:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-kafka</artifactId>
</dependency>
```

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: order-service
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: com.example.events
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
```

```java
@Service
public class OrderEventPublisher {
    private final KafkaTemplate<String, OrderCreatedEvent> kafka;

    public OrderEventPublisher(KafkaTemplate<String, OrderCreatedEvent> kafka) {
        this.kafka = kafka;
    }

    public void publish(OrderCreatedEvent event) {
        kafka.send("order-created", event.orderId(), event);
    }
}

@Component
public class OrderEventConsumer {

    @KafkaListener(topics = "order-created", groupId = "inventory-service")
    public void handle(OrderCreatedEvent event) {
        // process event idempotently
    }
}
```

**Key takeaway:** Spring Kafka abstracts broker wiring — design consumers to be **idempotent** and handle at-least-once delivery semantics.
