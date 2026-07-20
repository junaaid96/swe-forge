---
id: spring-boot-interview-basics
level: basics
---

# Spring Boot — Interview (Basics)

# Spring Boot Basics — Interview Study Guide (Q1–23)

> **Spring Boot 3.x** · Jakarta EE (`jakarta.*`) · Java 17+ · Maven

---

## Q1. What is Spring Boot?

**Answer:** Spring Boot is an opinionated framework built on top of the Spring Framework that simplifies creating production-ready, standalone Spring applications. It provides auto-configuration, embedded servers, starter dependencies, and sensible defaults so you can focus on business logic instead of boilerplate XML or manual bean wiring. Spring Boot is not a replacement for Spring — it is Spring with batteries included.

**Example:**

```java
@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

**Key takeaway:** Spring Boot = Spring Framework + auto-configuration + embedded server + starter dependencies + production-ready features (Actuator, metrics, health checks).

---

## Q2. What are the advantages of Spring Boot?

**Answer:**

| Advantage | What it means |
|-----------|---------------|
| **Fast setup** | Generate a working app in minutes via Spring Initializr |
| **Convention over configuration** | Sensible defaults; override only what you need |
| **Embedded servers** | No external Tomcat/Jetty install — run as `java -jar app.jar` |
| **Starter dependencies** | One dependency pulls a curated, tested set of libraries |
| **Auto-configuration** | Beans created automatically when classpath conditions match |
| **Production-ready** | Actuator, metrics, health, externalized config out of the box |
| **Microservices-friendly** | Lightweight, cloud-native, works with Docker/Kubernetes |

**Example:** Adding `spring-boot-starter-web` gives you Spring MVC, Jackson, Tomcat, and validation — no manual version alignment.

**Key takeaway:** Boot reduces time-to-first-HTTP-response from hours/days to minutes while keeping Spring's flexibility.

---

## Q3. What are the main features of Spring Boot?

**Answer:**

1. **Auto-configuration** — `@EnableAutoConfiguration` (included in `@SpringBootApplication`) configures beans based on classpath and properties.
2. **Starter dependencies** — Curated BOM-style dependency bundles (`spring-boot-starter-*`).
3. **Embedded servlet containers** — Tomcat (default), Jetty, or Undertow.
4. **Externalized configuration** — `application.properties`, YAML, env vars, command-line args.
5. **Spring Boot Actuator** — Health, metrics, info, env, loggers endpoints.
6. **DevTools** — Hot reload during development.
7. **CLI & Initializr** — Rapid project scaffolding.
8. **Native image support** — GraalVM native compilation (Spring Boot 3+).

**Example:**

```yaml
# application.yml — externalized config
spring:
  application:
    name: order-service
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

**Key takeaway:** The four pillars interviewers expect: **auto-config, starters, embedded server, externalized config**.

---

## Q4. What are the differences between Spring and Spring Boot?

**Answer:**

| Aspect | Spring Framework | Spring Boot |
|--------|------------------|-------------|
| **Nature** | Core IoC/DI container + modules (MVC, Data, Security) | Opinionated layer on top of Spring |
| **Configuration** | Manual `@Configuration`, XML, or Java config | Auto-configuration + minimal explicit config |
| **Deployment** | WAR to external servlet container | Executable JAR with embedded server |
| **Dependencies** | You pick and align versions manually | Starters + `spring-boot-dependencies` BOM |
| **Boilerplate** | More setup code | Less setup code |
| **Production ops** | Add Actuator/metrics yourself | Actuator available via starter |

**Example:** Plain Spring requires you to configure `DispatcherServlet`, `ViewResolver`, and `DataSource` manually. Boot detects `spring-boot-starter-web` + H2 on classpath and wires MVC + datasource automatically.

**Key takeaway:** Spring is the engine; Spring Boot is the car with the engine, wheels, and dashboard already assembled.

---

## Q5. How does Spring Boot simplify development?

**Answer:** Spring Boot removes repetitive infrastructure work through:

1. **Conditional auto-configuration** — `@ConditionalOnClass`, `@ConditionalOnMissingBean` etc. only activate when relevant.
2. **Starter POMs** — Transitive dependencies with compatible versions.
3. **Embedded server** — No separate deployment step.
4. **Property-driven tuning** — Change behavior without code changes.
5. **DevTools** — Automatic restart on classpath change.
6. **Testing support** — `@SpringBootTest`, test slices (`@WebMvcTest`, `@DataJpaTest`).

**Example:**

```properties
# Change DB from H2 to PostgreSQL — no Java code change
spring.datasource.url=jdbc:postgresql://localhost:5432/mydb
spring.datasource.username=app
spring.datasource.password=secret
spring.jpa.hibernate.ddl-auto=validate
```

**Key takeaway:** Boot answers "how do I wire a web app + JPA + security?" with starters and properties instead of hundreds of lines of config.

---

## Q6. How do you create a Spring Boot project with Maven?

**Answer:** Use `spring-boot-starter-parent` as the parent POM. It imports the Spring Boot BOM, sets plugin versions, and provides default compiler/resource settings. Minimum Java 17 for Boot 3.x.

**Example:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.5</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>demo</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>demo</name>

    <properties>
        <java.version>17</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

**Key takeaway:** Parent POM + `spring-boot-maven-plugin` = reproducible builds and executable fat JAR (`mvn spring-boot:run` or `java -jar target/demo.jar`).

---

## Q7. How do you create a Spring Boot project with Spring Initializr?

**Answer:** Spring Initializr (https://start.spring.io) generates a project skeleton with chosen dependencies, Java version, packaging, and build tool. Download, unzip, open in IDE, run.

**Example (CLI alternative):**

```bash
curl https://start.spring.io/starter.zip \
  -d type=maven-project \
  -d language=java \
  -d bootVersion=3.3.5 \
  -d baseDir=hello-api \
  -d groupId=com.example \
  -d artifactId=hello-api \
  -d name=hello-api \
  -d packageName=com.example.hello \
  -d javaVersion=17 \
  -d dependencies=web,actuator \
  -o hello-api.zip
```

**Key takeaway:** Initializr is the fastest way to bootstrap — always pick Java 17+, Boot 3.x, and only the starters you need.

---

## Q8. Write a simple Spring Boot Hello World REST application.

**Answer:** A minimal REST app needs: Maven POM with `spring-boot-starter-web`, a main class annotated with `@SpringBootApplication`, and a controller returning JSON or text.

**Example:**

```java
// DemoApplication.java
package com.example.hello;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

```java
// HelloController.java
package com.example.hello;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/hello")
    public String hello(@RequestParam(defaultValue = "World") String name) {
        return "Hello, " + name + "!";
    }
}
```

```properties
# application.properties
server.port=8080
spring.application.name=hello-api
```

```bash
mvn spring-boot:run
curl http://localhost:8080/hello?name=Spring
# → Hello, Spring!
```

**Key takeaway:** Three files (POM, main class, controller) are enough for a running REST API — that is Boot's core value proposition.

---

## Q9. What are Spring Boot Starters?

**Answer:** Starters are dependency descriptors that pull in a set of related libraries with versions tested together by the Spring team. They follow the naming convention `spring-boot-starter-{name}`. Custom starters use `your-org-spring-boot-starter-{name}` (name last).

**Example:**

```xml
<!-- Web API -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- JPA + Hibernate + JDBC + connection pool -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

**Key takeaway:** Starters are **curated dependency bundles**, not code libraries — they simplify POMs and guarantee version compatibility via the Boot BOM.

---

## Q10. What is `@SpringBootApplication`?

**Answer:** `@SpringBootApplication` is a convenience composite annotation equivalent to:

```java
@Configuration
@EnableAutoConfiguration
@ComponentScan(excludeFilters = { /* auto-config exclusions */ })
```

It marks the main configuration class, enables component scanning in the package and sub-packages, and triggers auto-configuration.

**Example:**

```java
@SpringBootApplication
public class OrderApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderApplication.class, args);
    }
}
```

```java
// Equivalent explicit form (rarely used)
@Configuration
@EnableAutoConfiguration
@ComponentScan(basePackages = "com.example.order")
public class OrderApplication { ... }
```

**Key takeaway:** Place `@SpringBootApplication` in the root package of your app so `@ComponentScan` discovers all beans in sub-packages.

---

## Q11. What is Spring Initializr?

**Answer:** Spring Initializr is a web service and library that generates Spring Boot project structures. It is integrated into start.spring.io, IntelliJ IDEA ("New Project → Spring Initializr"), VS Code, and the Spring Boot CLI. You select project metadata (group, artifact, Java version) and dependencies; it outputs a ready-to-build ZIP.

**Example:** Generated structure:

```
my-app/
├── pom.xml
├── src/main/java/com/example/myapp/MyAppApplication.java
├── src/main/resources/application.properties
└── src/test/java/com/example/myapp/MyAppApplicationTests.java
```

**Key takeaway:** Initializr and `@SpringBootApplication` together define the standard Boot project bootstrap — know both the UI and CLI/curl workflows.

---

## Q12. Spring Boot annotations overview (beginner essentials)

**Answer:**

| Annotation | Purpose |
|------------|---------|
| `@SpringBootApplication` | Main entry + config + component scan + auto-config |
| `@RestController` | REST controller; `@ResponseBody` on all handler methods |
| `@Controller` | MVC controller (returns view names unless `@ResponseBody`) |
| `@Service` | Business logic layer stereotype |
| `@Repository` | Data access layer stereotype |
| `@Component` | Generic Spring-managed bean |
| `@Autowired` / constructor injection | Dependency injection (prefer constructor) |
| `@Configuration` | Java-based `@Bean` definitions |
| `@Bean` | Register a method return value as a Spring bean |
| `@Value("${key}")` | Inject property value |
| `@ConfigurationProperties` | Bind a prefix of properties to a POJO |
| `@Profile("dev")` | Activate bean only under a profile |
| `@ConditionalOnProperty` | Auto-config condition on property value |

**Example:**

```java
@Service
public class GreetingService {
    private final String prefix;

    public GreetingService(@Value("${app.greeting:Hello}") String prefix) {
        this.prefix = prefix;
    }

    public String greet(String name) {
        return prefix + ", " + name;
    }
}
```

**Key takeaway:** Stereotype annotations (`@Service`, `@Repository`, `@Controller`) are specialized `@Component` — they enable layer-based scanning and AOP (e.g., `@Repository` translates exceptions).

---

## Q13. How does Spring Boot manage dependencies?

**Answer:** Spring Boot uses **`spring-boot-dependencies`** BOM (Bill of Materials) imported by `spring-boot-starter-parent`. The BOM pins compatible versions for Spring projects and third-party libraries (Hibernate, Jackson, Tomcat, etc.). You declare starters **without version numbers**; the parent/BOM resolves them.

**Example:**

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.3.5</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- No version needed — BOM provides it -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

**Key takeaway:** Never manually align Hibernate/Jackson/Tomcat versions when using Boot — override only when you have a specific reason and test thoroughly.

---

## Q14. What are Spring Boot properties?

**Answer:** Externalized configuration lets you change behavior without recompiling. Boot loads properties from (highest priority last in this list for overlapping keys — later sources override earlier):

1. Default properties (inside `@SpringBootApplication`)
2. `@PropertySource` on `@Configuration`
3. Config data (`application.properties`, `application.yml`, profile-specific files)
4. OS environment variables
5. Java system properties
6. Command-line arguments

**Example:**

```yaml
# application.yml
server:
  port: 9090

app:
  greeting: Hi

spring:
  profiles:
    active: dev
```

```yaml
# application-dev.yml
server:
  port: 8081
logging:
  level:
    com.example: DEBUG
```

```java
@ConfigurationProperties(prefix = "app")
public record AppProperties(String greeting) {}
```

**Key takeaway:** Use `application-{profile}.yml` for environment-specific overrides; bind groups of properties with `@ConfigurationProperties` instead of many `@Value` annotations.

---

## Q15. Common Spring Boot Starters (expanded)

**Answer:** See also **Q9**. Frequently used starters in production:

| Starter | Brings in |
|---------|-----------|
| `spring-boot-starter-web` | Spring MVC, Jackson, Tomcat, validation |
| `spring-boot-starter-data-jpa` | JPA, Hibernate, JDBC, HikariCP, transactions |
| `spring-boot-starter-jdbc` | JDBC, HikariCP (no JPA/Hibernate) |
| `spring-boot-starter-security` | Spring Security filter chain |
| `spring-boot-starter-actuator` | Health, metrics, info endpoints |
| `spring-boot-starter-validation` | Jakarta Bean Validation (Hibernate Validator) |
| `spring-boot-starter-test` | JUnit 5, Mockito, AssertJ, Spring Test |
| `spring-boot-starter-data-redis` | Lettuce client, Spring Data Redis |
| `spring-boot-starter-amqp` | Spring AMQP + RabbitMQ client |
| `spring-boot-starter-kafka` | Spring Kafka |
| `spring-boot-starter-mail` | JavaMail |
| `spring-boot-starter-cache` | Spring Cache abstraction |
| `spring-boot-starter-oauth2-resource-server` | JWT/OAuth2 resource server |

**Example:**

```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
</dependencies>
```

**Key takeaway:** Pick the smallest set of starters that match your stack — each starter adds classpath surface that triggers auto-configuration.

---

## Q16. What is Spring Boot Actuator?

**Answer:** Actuator adds production-ready operational endpoints and metrics for monitoring and managing your application: health checks, application info, metrics, environment details, loggers, and more. Endpoints can be exposed over HTTP or JMX.

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
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when_authorized
```

```bash
curl http://localhost:8080/actuator/health
# {"status":"UP"}

curl http://localhost:8080/actuator/info
```

**Key takeaway:** By default only `/actuator/health` is exposed over HTTP in Boot 3 — explicitly whitelist endpoints in production and secure them with Spring Security.

---

## Q17. How do you connect a database with JPA?

**Answer:** Add `spring-boot-starter-data-jpa` and a JDBC driver. Boot auto-configures `DataSource` (HikariCP), `EntityManagerFactory`, and `JpaTransactionManager`. Define `@Entity` classes and extend `JpaRepository`.

**Example:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/shop
    username: app
    password: secret
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: true
    properties:
      hibernate:
        format_sql: true
```

```java
@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String name;
    private BigDecimal price;
    // getters/setters
}

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByNameContainingIgnoreCase(String name);
}
```

**Key takeaway:** Use `ddl-auto=validate` or Flyway/Liquibase in production — never `create-drop`. JPA uses **`jakarta.persistence.*`** annotations in Boot 3.

---

## Q18. How do you connect a database with JDBC?

**Answer:** Use `spring-boot-starter-jdbc` for plain JDBC without ORM. Boot provides a `JdbcTemplate` and `NamedParameterJdbcTemplate` beans when a `DataSource` is configured.

**Example:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

```properties
spring.datasource.url=jdbc:h2:mem:demo;DB_CLOSE_DELAY=-1
spring.datasource.username=sa
spring.datasource.password=
```

```java
@Repository
public class UserJdbcRepository {
    private final JdbcTemplate jdbc;

    public UserJdbcRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<User> findById(long id) {
        return jdbc.query(
            "SELECT id, email FROM users WHERE id = ?",
            rs -> rs.next()
                ? Optional.of(new User(rs.getLong("id"), rs.getString("email")))
                : Optional.empty(),
            id
        );
    }
}
```

**Key takeaway:** JDBC is lighter than JPA for simple queries; JPA wins for domain modeling and complex object graphs. Both share the same `DataSource` auto-configuration.

---

## Q19. What is `@RestController`?

**Answer:** `@RestController` combines `@Controller` and `@ResponseBody`. Every handler method's return value is serialized directly to the HTTP response body (typically JSON via Jackson) instead of resolving a view template.

**Example:**

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public UserDto getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@Valid @RequestBody CreateUserRequest req) {
        return userService.create(req);
    }
}
```

**Key takeaway:** Use `@RestController` for REST APIs; use `@Controller` when returning Thymeleaf/JSP view names.

---

## Q20. What is `@RequestMapping`?

**Answer:** `@RequestMapping` maps HTTP requests to handler methods. It can be applied at class and method level. In modern Boot apps, prefer composed annotations (`@GetMapping`, `@PostMapping`, etc.) for clarity. `@RequestMapping` still useful for multi-method or custom mappings.

**Example:**

```java
@RestController
@RequestMapping(value = "/api/orders", produces = MediaType.APPLICATION_JSON_VALUE)
public class OrderController {

    @RequestMapping(method = RequestMethod.GET)
    public List<OrderDto> list() { ... }

    @GetMapping("/{id}")  // preferred over @RequestMapping(GET)
    public OrderDto get(@PathVariable Long id) { ... }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public OrderDto create(@RequestBody CreateOrderRequest req) { ... }
}
```

**Key takeaway:** Class-level `@RequestMapping` sets a base path; method-level annotations add the final URL segment and HTTP verb.

---

## Q21. How does Spring Boot simplify dependency management?

**Answer:** Boot eliminates "dependency hell" through:

1. **`spring-boot-starter-parent`** — inherits plugin config and property defaults.
2. **BOM (`spring-boot-dependencies`)** — single source of truth for 200+ library versions.
3. **Starters** — one dependency instead of listing 10+ artifacts.
4. **`spring-boot-maven-plugin`** — repackages as executable JAR with nested libs.
5. **Dependency convergence** — Maven enforces BOM versions unless you explicitly override.

**Example:** Without Boot you might manually specify:

```xml
<!-- Avoid this when using Boot -->
<dependency>
    <groupId>org.hibernate.orm</groupId>
    <artifactId>hibernate-core</artifactId>
    <version>6.4.4.Final</version>  <!-- must match Spring Boot's tested version -->
</dependency>
```

With Boot:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
    <!-- version managed by BOM -->
</dependency>
```

**Key takeaway:** Trust the BOM; override versions sparingly and run integration tests when you do.

---

## Q22. What is the role of embedded servers?

**Answer:** Spring Boot embeds a servlet container (Tomcat by default) inside the executable JAR. The app runs as a standalone process — no WAR deployment to an external appserver. This enables cloud-native deployment, Docker containers, and `java -jar` simplicity.

**Example:**

```xml
<!-- Default: Tomcat (transitive from spring-boot-starter-web) -->

<!-- Switch to Jetty -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jetty</artifactId>
</dependency>
```

```properties
server.port=8443
server.servlet.context-path=/api
```

**Key takeaway:** Embedded server = **self-contained deployment unit**. Production still uses reverse proxies (nginx, ALB) in front for TLS termination and load balancing.

---

## Q23. What are Spring Boot Profiles?

**Answer:** Profiles let you define environment-specific configuration (`dev`, `test`, `staging`, `prod`). Beans annotated with `@Profile("dev")` only load when that profile is active. Profile-specific property files follow the pattern `application-{profile}.properties|yml`.

**Example:**

```yaml
# application.yml
spring:
  profiles:
    active: dev
```

```yaml
# application-dev.yml
spring:
  datasource:
    url: jdbc:h2:mem:devdb
logging:
  level:
    root: DEBUG
```

```yaml
# application-prod.yml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:5432/${DB_NAME}
logging:
  level:
    root: WARN
```

```java
@Configuration
@Profile("dev")
public class DevSecurityConfig {
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                   .csrf(csrf -> csrf.disable())
                   .build();
    }
}
```

```bash
java -jar app.jar --spring.profiles.active=prod
# or: SPRING_PROFILES_ACTIVE=prod java -jar app.jar
```

**Key takeaway:** Profiles separate **environment config** from code — never hardcode URLs, credentials, or feature flags for specific environments in Java source.
