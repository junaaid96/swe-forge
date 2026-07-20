---
id: api-design-deep-theory
track: theory
---

# API Design — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## APIs

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### REST Principles

REST = Representational State Transfer. Architectural style, not a protocol.

Stateless: each request is self-contained. NO server-side session. Auth info in header (JWT), not server memory.
Resource-based URLs: nouns not verbs.
  ✓ GET /orders/5/items        ✗ GET /getOrderItems?id=5
  ✓ POST /users                ✗ POST /createUser
Uniform interface: HTTP method defines the action on the resource.
Layered: client doesn't know if talking to server, proxy, or cache.

URL design:
  /orders           GET = list, POST = create
  /orders/{id}      GET = get one, PUT = replace, PATCH = update, DELETE = remove
  /orders?status=PENDING&page=0&size=20  (filter + paginate via query params)

### HTTP Methods & Status Codes

GET: read, idempotent, safe, cacheable. No body.
POST: create. NOT idempotent — calling twice may create two resources.
PUT: full replace, idempotent. Client sends complete representation.
PATCH: partial update. Send only changed fields.
DELETE: remove, idempotent. Return 204 No Content.

Status codes you must know:
200 OK | 201 Created (+ Location header) | 204 No Content
400 Bad Request | 401 Unauthorized (no/invalid auth) | 403 Forbidden (no permission)
404 Not Found | 409 Conflict | 422 Unprocessable Entity (validation failed)
429 Too Many Requests (+ Retry-After header) | 500 Internal Server Error | 503 Service Unavailable

Key: 401 = "who are you?" (not authenticated). 403 = "I know you, but no." (not authorized).

### Authentication: JWT & OAuth2

JWT: stateless auth. Structure: header.payload.signature (Base64 + dot-separated).
Server validates signature cryptographically on EVERY request — no DB lookup needed.
Access token: short-lived (15min–1hr). Refresh token: long-lived (7–30d), stored in HttpOnly cookie.
Include in request: Authorization: Bearer <token>

Spring Security JWT flow:
Request → JwtAuthFilter → extract token → validate signature + expiry → set SecurityContext → controller proceeds.

OAuth2: authorization framework for delegating access to third-party apps.
Flows: Authorization Code (web apps, most secure), Client Credentials (service-to-service), Implicit (deprecated — insecure).
OpenID Connect (OIDC): OAuth2 + identity layer. Returns id_token with user info.

### API Design Best Practices

Versioning: /api/v1/users from day 1. Breaking changes → /api/v2/. Never break existing consumers.
Pagination: offset-based (page+size) or cursor-based (last-seen ID, efficient for large datasets). Always return totalCount + next link.

Error format — consistent for ALL errors:
{"error": "VALIDATION_ERROR", "message": "...", "details": ["field: reason"]}

Rate limiting: return 429 + Retry-After header. Token bucket or sliding window algorithm.
Idempotency keys: payment endpoints accept X-Idempotency-Key. Same key → same response. Safe retry on timeout.
CORS: configure specific allowed origins in Spring Security. Never wildcard (*) in production.

### Idempotent APIs in practice

PUT/DELETE are idempotent by intent; POST create/charge is not.
For payments and order placement, require Idempotency-Key and persist results (see Idempotency topic).
Also: paginate lists, use correct status codes, version carefully, and document timeout/retry guidance for clients.

### Practical code

```
// Production Spring Boot REST API

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Validated
public class OrderController {

    private final OrderService orderService;

    // GET with filtering + pagination
    @GetMapping
    public ResponseEntity<Page<OrderDTO>> getOrders(
            @RequestParam(required = false) OrderStatus status,
            @PageableDefault(size = 20, sort = "createdAt",
                direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(orderService.getOrders(status, pageable));
    }

    // POST — 201 Created + Location header pointing to new resource
    @PostMapping
    public ResponseEntity<OrderDTO> createOrder(
            @Valid @RequestBody CreateOrderRequest req,
            @AuthenticationPrincipal UserDetails user) {
        OrderDTO created = orderService.create(req, user.getUsername());
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}").buildAndExpand(created.getId()).toUri();
        return ResponseEntity.created(location).body(created); // HTTP 201
    }

    // PATCH — partial update, only changed fields
    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderDTO> updateStatus(@PathVariable Long id,
            @Valid @RequestBody UpdateStatusRequest req) {
        return ResponseEntity.ok(orderService.updateStatus(id, req));
    }

    // DELETE — 204 No Content on success
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { orderService.delete(id); }
}

// Global error handler — ALWAYS use this pattern
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(404)
            .body(ErrorResponse.of("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException ex) {
        var errors = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage()).toList();
        return ResponseEntity.badRequest()
            .body(ErrorResponse.of("VALIDATION_ERROR", "Input invalid", errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> generic(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(500)
            .body(ErrorResponse.of("INTERNAL_ERROR", "An unexpected error occurred"));
    }
}
```

### Tips

- Nouns not verbs in URLs: /orders not /createOrder. The HTTP method IS the verb.
- 401 vs 403 distinction matters in interviews: 401 = unauthenticated (no/invalid token), 403 = authenticated but no permission to this resource
- JWT is stateless — server NEVER stores tokens. Validation is purely cryptographic. This is what makes horizontal scaling possible.
- Always use @RestControllerAdvice for global exception handling — raw Java exceptions must never reach the API consumer as stack traces
