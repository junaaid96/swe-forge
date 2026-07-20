---
id: security-deep-theory
track: theory
---

# Security — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Security

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Security Is Now a Core SWE Skill

Cybersecurity ranks among the most important upskill areas for practitioners. You do not need to be a pentester — you need secure defaults:

• Authenticate and authorize every sensitive action
• Validate and encode untrusted input/output
• Protect secrets and use HTTPS everywhere
• Limit blast radius with least privilege
• Log security-relevant events for forensics

OWASP Top 10 is still the practical checklist for web APIs.

### AuthN vs AuthZ

Authentication (AuthN): who are you? (password, OAuth2/OIDC, passkeys, JWT)
Authorization (AuthZ): what can you do? (RBAC, ABAC, ownership checks)

JWT tips:
• Short-lived access tokens + refresh rotation
• Validate signature, iss, aud, exp
• Do not store sensitive PII in claims
• Prefer opaque tokens + introspection for high-security cases

Never trust the client: check resource ownership on the server (userId from token ≠ userId from body blindly).

### Injection, XSS, CSRF

SQL/NoSQL injection: parameterized queries / ORM bind variables. Never string-concat user input into queries.

XSS: escape output by context (HTML/attr/JS). Prefer frameworks that auto-escape. Content-Security-Policy as defense in depth.

CSRF: dangerous when browsers auto-send cookies. Mitigate with SameSite cookies and/or anti-CSRF tokens. Pure Bearer-token APIs are less exposed to classic CSRF.

SSRF, path traversal, mass assignment: validate URLs, canonicalize paths, use allow-lists and DTOs (never bind entities directly).

### Secrets, Crypto, Supply Chain

Passwords: bcrypt/argon2 with unique salts — never reversible encryption for passwords.
Secrets: rotate on leak; use secret managers; enable git secret scanning.
Dependencies: lockfiles, vulnerability scans (SCA), pin versions in CI images.
Transport: TLS everywhere; HSTS on public sites.
Defense in depth: WAF/rate limits help, but app-layer fixes are mandatory.

### Auth stack pointer (TLS / JWT / OAuth)

Security principles (injection, XSS, least privilege) pair with a concrete auth stack:
• TLS everywhere (see auth-tls)
• Short-lived JWTs validated with JWKS
• OAuth2 for delegated login and M2M
• Never log bearer tokens

Go deep in the Auth & TLS topic for flows, mTLS, and Spring resource-server wiring.

### Practical code

```
// Spring Security — parameterized query + ownership check

@RestController
@RequiredArgsConstructor
public class TransferController {
  private final TransferService transfers;

  @PostMapping("/api/transfers")
  public TransferResult transfer(@AuthenticationPrincipal UserPrincipal user,
                                 @Valid @RequestBody TransferRequest req) {
    // AuthZ: payer must own the from-account (never trust body alone)
    return transfers.transfer(user.getId(), req.fromAccountId(), req.toAccountId(), req.amount());
  }
}

// JDBC — SAFE
jdbcTemplate.update(
  "INSERT INTO audit(user_id, action) VALUES (?, ?)",
  userId, action);

// JDBC — UNSAFE (SQL injection)
// jdbcTemplate.update("INSERT INTO audit VALUES (" + userId + ", '" + action + "')");
```

### Tips

- Interviewers love: “parameterized queries + least privilege + short-lived tokens.”
- Separate AuthN failure (401) from AuthZ failure (403).
- If a secret hits git: rotate first, then clean history — order matters.
- Mass assignment: accept DTOs, not JPA entities, on controllers.
