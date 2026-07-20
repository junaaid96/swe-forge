---
id: security-deep-internals
track: internals
---

# Security — Deep: Internals

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## SSL, JWT & OAuth

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### TLS/SSL — encrypt the pipe

TLS (successor of SSL) provides confidentiality and integrity for data in transit. HTTPS = HTTP over TLS.

Without TLS, bearer tokens and passwords can be sniffed. OAuth and JWT do NOT encrypt the channel by themselves — HTTPS is mandatory in production.

Also know: certificate chains, expiry, HSTS, and terminating TLS at a load balancer vs mTLS between services.

### JWT structure and pitfalls

JWT: header.payload.signature (base64url). Common claims: sub, iss, aud, exp, iat.

Production rules (2026):
• Prefer RS256/ES256 with JWKS over shared HS256 across many services
• Short-lived access tokens (minutes) + refresh token rotation
• Validate exp/iss/aud/signature; reject alg=none
• Do not stuff sensitive PII into tokens
• JWTs are hard to revoke — keep them short or use denylist/introspection for high-risk cases

### OAuth2 flows you must know

Authorization Code + PKCE: SPAs/mobile/user login (delegated access).
Client Credentials: service-to-service, no user present.
Refresh tokens: obtain new access tokens; rotate and detect reuse.

Resource Server (your API) validates access tokens. Authorization Server (Keycloak/Auth0/Cognito) issues them.

### mTLS for service identity

Mutual TLS: both sides present certificates. Proves service identity on the network, complementary to user JWTs.

At scale, service mesh (Istio) automates short-lived certs. App still checks user JWT for user-level authorization.

Defense in depth: mTLS (service) + JWT (user) + RBAC on the action.

### Spring-shaped practical wiring

API as OAuth2 resource server: validate JWT via issuer-uri / jwk-set-uri.
Separate authentication (401) from authorization (403).
Protect /token endpoints with rate limits.
Store client secrets in a secret manager — never in git.

### Common failures

• HS256 secret leaked from any microservice → forge tokens for all
• Eternal JWTs with no exp
• Accepting tokens without aud check (token confusion)
• CORS + cookies misconfig leading to token theft
• Logging Authorization headers

### Practical code

```yaml
# Spring Resource Server — validate JWT via JWKS (RS256)
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com/realms/app
          # loads jwks_uri from OIDC discovery; validates iss/exp/signature
```

```java
// Conceptual checks every service should enforce
Jwt jwt = decoder.decode(token);
Assert.isTrue(now.isBefore(jwt.getExpiresAt()), "expired");
Assert.isTrue(expectedIssuer.equals(jwt.getIssuer()), "bad iss");
Assert.isTrue(jwt.getAudience().contains(expectedAud), "bad aud");
// Prefer RS256 + JWKS over a shared HS256 secret across microservices
```

```text
OAuth2 browser SPA: Authorization Code + PKCE (no client secret in browser)
Machine-to-machine: Client Credentials
Service mesh / zero-trust: mTLS between services + short-lived workload identity
Refresh tokens: rotate on use; revoke family on reuse detection
```

### Tips

- HTTPS first — tokens on cleartext HTTP are already compromised.
- RS256 + JWKS scales safer than a shared HS256 secret.
- Short access token TTL + rotating refresh tokens.
- 401 unauthenticated vs 403 unauthorized — use both correctly.
- Never log `Authorization` headers or raw refresh tokens.
