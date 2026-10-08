# 3. Web & APIs — REST, WebFlux, gRPC, OpenAPI, RestClient

## 3.1 REST APIs and API Versioning (new, first-class in Spring Framework 7)

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.findById(id));
    }

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        OrderResponse created = orderService.create(request);
        return ResponseEntity.created(URI.create("/api/orders/" + created.id())).body(created);
    }
}
```

**What's new — REST API versioning is built into the framework now**, not something you hand-roll with request matchers. Spring Framework 7 makes API versioning a first-class feature, and Spring Boot doesn't pick a strategy for you; you choose one based on your own API design guidelines. Four strategies are supported out of the box: path segment, request header, query parameter and media-type parameter.

```java
// Version-specific handlers; the configured strategy decides where the version is read from
@GetMapping(value = "/{id}", version = "1.0")
public OrderResponseV1 getOrderV1(@PathVariable UUID id) { ... }

@GetMapping(value = "/{id}", version = "2.0")
public OrderResponseV2 getOrderV2(@PathVariable UUID id) { ... }
```

```yaml
# Choose the strategy globally
spring:
  mvc:
    apiversion:
      use:
        header: X-API-Version   # or: query-parameter, path-segment, media-type-parameter
```

For an integration-heavy domain such as healthcare, **header-based versioning** is usually the pragmatic default — it keeps URLs stable (important when other systems, lab devices, or partner integrations hardcode paths) while still letting you evolve the contract.

## 3.2 Jackson — and the Jackson 3 migration

Jackson is Spring's default JSON (de)serializer. Custom serializers, `@JsonProperty`, `@JsonIgnore`, and `ObjectMapper` configuration are the usual touchpoints.

```java
public record OrderResponse(
    UUID id,
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    Instant createdAt,
    BigDecimal total,
    @JsonInclude(JsonInclude.Include.NON_NULL)
    String cancellationReason
) {}
```

**What's new:** Spring Boot 4 moves to Jackson 3. The main packages move from `com.fasterxml.jackson.*` to `tools.jackson.*` (the annotations such as `@JsonProperty` keep their `com.fasterxml.jackson.annotation` package), `ObjectMapper` is now built immutably via `JsonMapper.builder()`, and custom `Module`/serializer registrations may need updates. Boot still offers Jackson 2 support to ease the transition, so it isn't a hard cutover, but new code should target Jackson 3 APIs directly.

## 3.3 WebFlux — the reactive alternative to Spring MVC

Spring MVC is thread-per-request (traditionally); WebFlux is event-loop based, built on **Project Reactor** (`Mono<T>` for 0-or-1 results, `Flux<T>` for 0-to-N streams).

```java
@RestController
@RequestMapping("/api/orders")
public class ReactiveOrderController {

    @GetMapping("/{id}")
    public Mono<OrderResponse> getOrder(@PathVariable UUID id) {
        return orderRepository.findById(id)
            .map(OrderMapper::toResponse)
            .switchIfEmpty(Mono.error(new OrderNotFoundException(id)));
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<OrderResponse> streamOrders() {
        return orderRepository.findAll().map(OrderMapper::toResponse);
    }
}
```

**Should you actually switch to WebFlux?** For most CRUD-over-Postgres microservices — no. WebFlux earns its complexity when you're I/O-bound with *very* high concurrency (thousands of simultaneous slow connections — chat, streaming, gateway/proxy services) and your whole stack (DB driver, HTTP clients) is reactive end-to-end. Mixing blocking JDBC calls inside a WebFlux app defeats the purpose and is a common mistake. **With virtual threads now mainstream (see [Core framework](./01-core-framework.md)), the case for WebFlux on typical backend services has weakened further** — you get most of the concurrency benefit from `spring.threads.virtual.enabled: true` on plain Spring MVC, without rewriting your entire codebase in a reactive style.

## 3.4 RestClient — replacing RestTemplate

```java
@Configuration
public class HttpClientConfig {
    @Bean
    RestClient inventoryRestClient(RestClient.Builder builder) {
        return builder
            .baseUrl("https://inventory-service/api")
            .defaultHeader("Accept", "application/json")
            .build();
    }
}

@Service
public class InventoryClient {
    private final RestClient restClient;

    public InventoryClient(RestClient inventoryRestClient) {
        this.restClient = inventoryRestClient;
    }

    public StockLevel checkStock(String sku) {
        return restClient.get()
            .uri("/stock/{sku}", sku)
            .retrieve()
            .body(StockLevel.class);
    }
}
```

**What's changing and why it matters now:** the Spring team plans to deprecate `RestTemplate` in Spring Framework 7.1 (November 2026) in favour of `RestClient`, and to remove it in Spring Framework 8. If you have `RestTemplate` beans in your codebases, migrate proactively rather than under deadline pressure later. RestClient gives you a fluent, synchronous API with the same underlying HTTP client infrastructure WebClient uses — you get connection pooling and timeout configuration without committing to reactive types.

Also new: HTTP service groups (`@ImportHttpServices`) let you configure many declarative HTTP interface clients at once and have them share the same underlying RestClient — useful once you have several downstream service clients (inventory, payments, notifications) that should share connection pool and timeout settings.

## 3.5 gRPC

For internal service-to-service calls where you control both ends (as opposed to public REST APIs), gRPC's binary protocol (Protocol Buffers) and HTTP/2 multiplexing outperform JSON-over-HTTP significantly — smaller payloads, streaming support, generated strongly-typed clients/servers from a `.proto` contract.

```protobuf
// order_service.proto
service OrderService {
  rpc GetOrder(GetOrderRequest) returns (OrderResponse);
  rpc StreamOrderUpdates(OrderSubscription) returns (stream OrderResponse);
}
```

**What's new:** Spring Boot 4.1 (June 2026) adds first-party gRPC server and client auto-configuration (via Spring gRPC), either as a standalone Netty server or over Servlet HTTP/2. Previously you needed the separate Spring gRPC project or the third-party `grpc-spring-boot-starter`. Worth evaluating for internal calls between your own microservices, where you own both client and server and REST's self-descriptive URLs matter less than raw throughput.

## 3.6 OpenAPI / Swagger

```java
// build.gradle: implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:3.x'  (3.x for Boot 4; 2.x for Boot 3)
```

```java
@Operation(summary = "Retrieve an order by ID")
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "Order found"),
    @ApiResponse(responseCode = "404", description = "Order not found")
})
@GetMapping("/{id}")
public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID id) { ... }
```

`springdoc-openapi` scans your controllers and generates a live spec at `/v3/api-docs` and an interactive UI at `/swagger-ui.html` — zero manual spec maintenance as long as your annotations stay accurate. Given the API versioning feature above, make sure your springdoc config groups docs per API version rather than merging v1/v2 endpoints into one confusing spec.

## Go Deeper
- Backpressure in Project Reactor (`onBackpressureBuffer`, `onBackpressureDrop`) — only relevant once you actually adopt WebFlux for a streaming use case
- Contract testing (Pact) between your frontend and these versioned REST APIs
- Protobuf schema evolution rules (field numbering, reserved fields) if you adopt gRPC — mirrors the same "don't break consumers" discipline as REST versioning
- Next: [Security](./04-security.md) — every endpoint shown above needs an authorization story, and OAuth 2.1 changes what "correct" looks like in 2026
