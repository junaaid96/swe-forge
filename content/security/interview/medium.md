---
id: security-interview-medium
level: medium
---

# Security — Interview (Medium)

> Authn/z and common web failures. Pair with Security Deep (theory / internals).

## Q1. Authentication vs authorization?

**Answer:** Authentication establishes **who** you are (login, token, mTLS identity). Authorization decides **what** you may do (roles, scopes, policies). Mixing them causes bugs like “any logged-in user can hit admin APIs.”

**Key takeaway:** Authenticate first, then authorize every sensitive action with explicit checks.

---

## Q2. Why prefer RS256/JWKS over shared HS256 across microservices?

**Answer:** HS256 needs the same secret on every verifier — a leak in any service forges tokens for all. RS256: auth server signs with private key; services verify with public JWKS that can rotate. Validates `iss`, `aud`, `exp` as well as signature.

**Key takeaway:** Asymmetric verification localizes trust to the issuer’s private key.

---

## Q3. How do you stop XSS, CSRF, and SQL injection in an API + SPA?

**Answer:**
- **SQLi:** parameterized queries / ORM bind variables — never string-concat SQL.
- **XSS:** encode output by context; CSP; avoid `dangerouslySetInnerHTML` with untrusted data.
- **CSRF:** for cookie sessions use SameSite + CSRF tokens; prefer Bearer tokens in `Authorization` for SPAs (not cookie-auth for APIs unless carefully hardened).

**Key takeaway:** Fix classes of bugs with defaults (parameterized SQL, encoding, safe cookie policy) — not one-off patches.

---

## Q4. How do you verify an inbound webhook?

**Answer:** Shared secret HMAC over the raw body (or canonical payload), compare with constant-time equality, reject skew outside a timestamp window, require HTTPS, and process idempotently by event id.

**Key takeaway:** Signature + timestamp + idempotency — never trust the body alone.

---
