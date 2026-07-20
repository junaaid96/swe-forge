---
id: api-design-deep-internals
track: internals
---

# API Design — Deep: Internals

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## GraphQL & gRPC

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### REST is not the only API style

REST/JSON over HTTP is the default public API. Internally and for specialized clients, GraphQL and gRPC are common.

Choose based on clients, coupling, tooling, and performance — not fashion.

### GraphQL core ideas

Schema defines types and queries/mutations/subscriptions.
Client asks for exactly the fields it needs.

Costs: complex authz, harder caching, N+1 in resolvers (DataLoader), need query cost limits.

### gRPC core ideas

Protobuf contracts, HTTP/2, codegen stubs. Excellent for service-to-service: low latency, strong typing, streaming RPCs.

Browser clients usually need grpc-web or a gateway.

### Comparison cheat sheet

Public multi-language clients → REST.
Many mobile screens needing flexible fields → GraphQL with discipline.
Internal microservice mesh / streaming → gRPC.

Mix: REST edge + gRPC interior.

### Practical pitfalls

GraphQL: unbounded queries as DoS — persist allowlists or cost analysis.
gRPC: version protobuf carefully; never reuse field numbers incorrectly.
Both still need authn/z, timeouts, observability, idempotency for writes.

### Practical code

```
type User { id: ID! name: String! orders: [Order!]! }
type Query { user(id: ID!): User }

service OrderService {
  rpc GetOrder (GetOrderRequest) returns (Order);
}
```

### Tips

- GraphQL without DataLoader often recreates N+1.
- gRPC shines inside the data center; REST still wins many public APIs.
- Limit GraphQL query cost — treat queries like untrusted code.
- Contracts (OpenAPI/protobuf/GraphQL schema) are part of API design.
