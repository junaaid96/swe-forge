# The Spring Boot Ecosystem — Full Reference Series (2026)

Based on the "iceberg" post: Spring Boot looks like `@RestController` + `@Service` + `@Autowired`, but production systems run on 8 layers underneath. This series covers every layer with explanations, runnable-style examples, and what's actually current in 2026 — not 2022 tutorial content.

## How to use this series

Each guide is self-contained. Read them in order for the full picture, or jump straight to the layer you need. Every guide ends with **Go Deeper** pointers to the specific next thing worth learning.

| # | Guide | Covers |
|---|------|--------|
| 1 | [Core framework](./01-core-framework.md) | Spring Core, IoC/DI, Bean Lifecycle, Spring MVC, Auto-configuration, ApplicationEvents |
| 2 | [Data layer](./02-data-layer.md) | Hibernate ORM, Spring Data JPA, PostgreSQL, HikariCP, Flyway/Liquibase, JDBC Template, MongoDB, H2 |
| 3 | [Web & APIs](./03-web-and-apis.md) | REST APIs, WebFlux, gRPC, OpenAPI/Swagger, Jackson, Project Reactor, RestClient |
| 4 | [Security](./04-security.md) | Spring Security, JWT/OAuth 2.1, Keycloak, RBAC/ABAC, CSRF, TLS, Spring Authorization Server, Passkeys |
| 5 | [Messaging & async](./05-messaging-and-async.md) | Kafka, RabbitMQ, @Async/@Scheduled, Outbox Pattern, Saga |
| 6 | [Caching & storage](./06-caching-and-storage.md) | Redis, MongoDB, AWS SQS/SNS, Cassandra, Ehcache, caching strategy |
| 7 | [Cloud & DevOps](./07-cloud-and-devops.md) | Docker, Kubernetes, Spring Cloud, Config Server, Gateway, Helm, Ingress/Gateway API, CI/CD, Terraform |
| 8 | [Monitoring & testing](./08-monitoring-and-testing.md) | Actuator, Prometheus, Grafana, Resilience4j, Micrometer, OpenTelemetry/Zipkin/Jaeger, Testcontainers |
| 9 | [AOP & interview checklist](./09-spring-aop-and-interview-checklist.md) | Spring AOP, proxies, and a final interview checklist |

## Who this series is for

It assumes you already build Java + Spring Boot services (typically with PostgreSQL and a SPA frontend) and know the core distributed-systems patterns (Saga, Outbox, Strangler Fig, idempotency, consistent hashing). It doesn't re-teach those patterns from scratch; instead each guide shows **where in the Spring Boot stack a pattern actually gets implemented** (Outbox → [Messaging & async](./05-messaging-and-async.md), retries and circuit breaking → [Monitoring & testing](./08-monitoring-and-testing.md)).

## The single biggest change: Spring Boot 4 / Spring Framework 7

If you last used Spring seriously in the Boot 3.x / Framework 6 era, this is the update that matters most, and it touches almost every guide in this series:

- **Released:** Spring Framework 7.0 and Spring Boot 4.0 shipped in November 2025. Spring Boot 4.1 followed in June 2026; as of October 2026 the current stable releases are **Spring Boot 4.1.1** (with 4.0.x supported until the end of 2026) on **Spring Framework 7.0.x**, and Boot 4.2 is in milestones.
- **Baseline:** Java 17 remains the minimum; Java 21 or Java 25 (the current LTS) is strongly recommended for virtual threads. Spring Framework 7 also moves to **Jakarta EE 11** (Servlet 6.1, JPA 3.2) and **Kotlin 2.2** baselines.
- **Resilience is built into the framework:** Spring Framework 7 adds `@Retryable`, `@ConcurrencyLimit` and `RetryTemplate` in core (enabled with `@EnableResilientMethods`), so simple retry and throttling no longer need Resilience4j.
- **JSON and modularity:** Spring Boot 4 moves to **Jackson 3** (with a Jackson 2 compatibility path), and the monolithic `spring-boot-autoconfigure` JAR is split into focused modules so you're not evaluating configuration for tech you don't use.
- **API versioning is first-class**, with four strategies out of the box: path segment, request header, query parameter and media-type parameter. Spring doesn't pick one for you.
- **RestTemplate is on its way out:** the Spring team plans to deprecate it in Spring Framework 7.1 (November 2026) in favour of `RestClient`, and to remove it in Framework 8.
- **No Undertow:** Undertow isn't compatible with Servlet 6.1 yet, so Spring Boot 4 drops support for it. Use Tomcat or Jetty.

Every guide below flags where a specific technology intersects with this Boot 4 shift.

## Suggested reading order

1. [Core framework](./01-core-framework.md) and [Data layer](./02-data-layer.md) — a quick refresh, since these underpin everything else.
2. [Security](./04-security.md) — usually the highest-leverage track; OAuth 2.1 practices and passkey support are new since the Boot 3 era.
3. [Web & APIs](./03-web-and-apis.md) — built-in API versioning and the RestTemplate → RestClient migration affect code you write every week.
4. [Messaging & async](./05-messaging-and-async.md) and [Caching & storage](./06-caching-and-storage.md) — lighter if you already know Outbox/Saga/idempotency; these fill in the Spring-specific plumbing.
5. [Cloud & DevOps](./07-cloud-and-devops.md) — Gateway API replacing Ingress is the big shift here.
6. [Monitoring & testing](./08-monitoring-and-testing.md) — closes the loop on how you'd know any of the above is working in production.
