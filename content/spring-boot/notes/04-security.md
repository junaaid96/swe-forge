# 4. Security — Spring Security, OAuth 2.1, Keycloak, RBAC/ABAC

Application security is one of the highest-leverage tracks for a backend engineer, so this guide goes a bit deeper than the others.

## 4.1 Spring Security — the filter chain mental model

Every request passes through an ordered chain of servlet filters before it reaches your controller. Understanding this chain is what turns "copy config from a tutorial" into "actually debug why a request got a 403."

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // stateless JWT APIs don't need CSRF — see 4.4
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/orders/**").hasAuthority("SCOPE_orders:read")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
```

`WebSecurityConfigurerAdapter` is gone — it was deprecated in Spring Security 5.7 and fully removed in 6.0. If you ever see a tutorial extending it, that's outdated content; the `SecurityFilterChain` bean style above is the only supported approach in Spring Security 6/7.

## 4.2 JWT + OAuth2 Resource Server pattern

For stateless microservices calling each other, the standard shape is: an Authorization Server (Keycloak, or Spring's own Authorization Server) issues JWTs; each downstream service is an OAuth2 **resource server** that only needs to *validate* tokens, not manage sessions.

```java
@RestController
public class OrderController {
    @GetMapping("/api/orders/mine")
    public List<OrderResponse> myOrders(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        List<String> roles = jwt.getClaimAsStringList("roles");
        return orderService.findByCustomer(userId);
    }
}
```

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com/realms/acme
```

The consistent recommendation for microservices is stateless JWT / OAuth2 Resource Server for APIs, avoiding server-side sessions across services, and always validating the signature, the `iss`/`aud` claims and expiry, with keys fetched from the issuer's JWKS so they can rotate. Note that `issuer-uri` alone validates `iss`; add `spring.security.oauth2.resourceserver.jwt.audiences` to validate `aud` too.

## 4.3 OAuth 2.1 — what actually changed (relevant even though it's "just" a draft)

OAuth 2.1 is still an IETF Internet-Draft, not a finalized RFC, but its rules match the OAuth 2.0 Security Best Current Practice (RFC 9700, January 2025), are already implemented in Spring Authorization Server, and every major identity provider treats the retired grant types as deprecated. This is the practical situation for OAuth today: treat it as adopted, because it already is in every tool you'll touch.

What OAuth 2.1 removes and why it matters for anything you build going forward:

- The Implicit grant (`response_type=token`) is removed — putting the access token in the URL fragment is a documented attack vector. Replace with **Authorization Code + PKCE** for any browser/SPA client (Angular, React and so on).
- The Resource Owner Password Credentials grant is removed — it exposes user credentials directly to the client app and prevents MFA. Use Authorization Code + PKCE for user logins, and the **Client Credentials** grant for service-to-service calls.
- PKCE becomes the norm for every Authorization Code client: mandatory for public clients (SPAs, mobile apps) and expected for confidential server-side clients too, whereas OAuth 2.0 only recommended it for public clients.
- Redirect URIs must be exact string matches — remove wildcards from registered clients.

```java
// Spring Security 6/7 — PKCE on the client side
@Bean
OAuth2AuthorizationRequestResolver authorizationRequestResolver(ClientRegistrationRepository repo) {
    var resolver = new DefaultOAuth2AuthorizationRequestResolver(repo, "/oauth2/authorization");
    resolver.setAuthorizationRequestCustomizer(OAuth2AuthorizationRequestCustomizers.withPkce());
    return resolver;
}
```

## 4.4 CSRF — when to enable it and when to disable it

CSRF protection matters for **session-cookie-based** authentication (browser automatically attaches cookies to any request, including forged ones from a malicious site). It's irrelevant for stateless JWT-in-Authorization-header APIs, because a malicious site can't read or attach your bearer token without your JS explicitly sending it. Rule of thumb: server-rendered forms with session cookies → CSRF on. Pure JSON API consumed by a JS SPA with Bearer tokens → CSRF off, but CORS must be locked down correctly instead.

## 4.5 RBAC vs ABAC

**RBAC (Role-Based Access Control):** permissions attached to roles, users assigned roles. Simple, works well until you need "a doctor can view a patient's record only if assigned to that patient" — that's not expressible as a static role.

```java
@PreAuthorize("hasRole('DOCTOR')")
@GetMapping("/patients/{id}/records")
public PatientRecord getRecord(@PathVariable UUID id) { ... }
```

**ABAC (Attribute-Based Access Control):** decisions based on attributes of the user, resource, and context — exactly the "assigned to that patient" case above, which is typical of healthcare and other record-level-sensitive systems.

```java
@PreAuthorize("@patientAccessEvaluator.canAccess(authentication, #patientId)")
@GetMapping("/patients/{patientId}/records")
public PatientRecord getRecord(@PathVariable UUID patientId) { ... }

@Component
public class PatientAccessEvaluator {
    private final AssignmentRepository assignmentRepository;

    public PatientAccessEvaluator(AssignmentRepository assignmentRepository) {
        this.assignmentRepository = assignmentRepository;
    }

    public boolean canAccess(Authentication auth, UUID patientId) {
        String doctorId = auth.getName();
        return assignmentRepository.existsByDoctorIdAndPatientId(doctorId, patientId);
    }
}
```

Most real systems are RBAC for broad access tiers (admin/staff/patient) layered with ABAC for record-level checks — exactly what a patient-records system needs.

## 4.6 Keycloak

Keycloak is the most common self-hosted Authorization Server / Identity Provider paired with Spring Security — handles login UI, MFA, social login, and issues the JWTs your resource servers validate. Alternative to running Spring's own Authorization Server when you need a full IAM product (user federation, admin console, multi-realm support for multi-tenant setups).

## 4.7 Passkeys / WebAuthn (built in since Spring Security 6.4)

A passkey is a password-less credential based on FIDO2/WebAuthn: a public/private key pair where the private key never leaves the user's device, unlocked via biometrics or a local PIN, making it phishing-resistant by design since there's no shared secret to steal.

```java
@Bean
SecurityFilterChain passkeyFilterChain(HttpSecurity http) throws Exception {
    http.webAuthn(webAuthn -> webAuthn
        .rpName("Acme Health Portal")
        .rpId("portal.example.com")
        .allowedOrigins("https://portal.example.com")
    );
    return http.build();
}
```

Worth prototyping for any patient-facing or staff-facing portal where credential phishing is a real risk (healthcare data is a high-value target).

## 4.8 TLS/HTTPS basics you shouldn't skip

- Terminate TLS at the load balancer/ingress in production, but use `server.ssl.*` properties for local dev/testing parity.
- Enforce `Strict-Transport-Security` headers.
- For service-to-service calls inside a cluster, mutual TLS (mTLS) via a service mesh (Istio/Linkerd) is the modern default over trusting network-boundary security alone — it connects directly to the Zero Trust model (NIST SP 800-207).

## Go Deeper
- Method-level security (`@PreAuthorize`/`@PostAuthorize`) evaluation order vs URL-level `authorizeHttpRequests` — subtle bugs happen when they disagree
- Spring Authorization Server as a self-hosted alternative to Keycloak when you want full control without a separate product to operate
- OWASP API Security Top 10 (2023 edition) — pair directly with this guide, especially Broken Object Level Authorization (BOLA), which is what ABAC above is designed to prevent
- Next: [Messaging & async](./05-messaging-and-async.md) — securing async message payloads (never put sensitive personal or health data in plaintext Kafka messages) carries straight over
