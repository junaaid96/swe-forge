---
id: cyber-security-interview-basics
level: basics
---

# Cyber Security — Interview (Basics)

> CIA triad, threat vocabulary, crypto hygiene, and defence basics. Pair with the Cyber Security notes.

## Q1. What is the CIA triad?

**Answer:** **Confidentiality** (only authorized parties read data — encryption, access control), **Integrity** (data isn't altered undetectably — hashing, signatures, audit logs), **Availability** (systems stay reachable — redundancy, DDoS mitigation, backups). Most controls map to one of the three; interviews love "which leg does this control strengthen?"

**Key takeaway:** Every control protects confidentiality, integrity, or availability — name the leg.

---

## Q2. Name common attack types and one defence for each.

**Answer:** **Phishing** → phishing-resistant MFA (FIDO2/passkeys) + training; **Malware/ransomware** → patching, EDR, offline backups; **DDoS** → CDN scrubbing + rate limiting; **SQL injection** → parameterized queries; **XSS** → output encoding + CSP; **Credential stuffing** → MFA + breach-password screening + rate limits. Defences layer — no single control stops everything.

**Key takeaway:** Answer attacks in pairs: vector + concrete control.

---

## Q3. Symmetric vs asymmetric encryption — when is each used?

**Answer:** **Symmetric** (AES-GCM) uses one shared key — fast, ideal for bulk data, but key distribution is the hard problem. **Asymmetric** (RSA, ECDH/ECDSA, X25519) uses public/private pairs — solves distribution and enables signatures, but is slow for bulk data. Real systems combine them: TLS handshakes use asymmetric crypto to agree a symmetric session key (hybrid encryption).

**Key takeaway:** Asymmetric for key exchange and signatures, symmetric for bulk — TLS does both.

---

## Q4. What is MITRE ATT&CK and how do defenders use it?

**Answer:** A public catalogue of real adversary **tactics** (why: initial access, persistence, exfiltration) and **techniques** (how: T1059 command execution, T1078 valid accounts). SOCs map detections to techniques to find coverage gaps, describe incidents precisely ("hands-on-keyboard via T1021 RDP"), and prioritize hunts. It's a shared vocabulary, not a product.

**Key takeaway:** ATT&CK turns "we were hacked" into a precise, coverable technique map.

---

## Q5. What does a SOC analyst do when an alert fires?

**Answer:** Triage: is it a true positive? Correlate (user, host, process tree, network, threat intel), scope (one host or lateral movement?), contain (isolate host, revoke sessions/keys), eradicate and recover (remove persistence, patch, restore), then document and tune the rule to cut false positives. Speed matters, but scoping before containing avoids alerting the intruder prematurely.

**Key takeaway:** Triage → scope → contain → recover → learn. Scope before you contain.

---

## Q6. Passwords vs passkeys — why is the industry moving?

**Answer:** Passwords are phishable, reused, and breached by the billions; even with hashing (Argon2/bcrypt) the *human* part fails. **Passkeys (FIDO2/WebAuthn)** bind a per-site keypair to the real origin — the credential simply won't authenticate to a lookalike domain, defeating phishing and AiTM kits, with no shared secret to breach. SMS OTPs are the weakest MFA (SIM swap); authenticator apps are better; passkeys/security keys are phishing-resistant.

**Key takeaway:** Phishing resistance is the goal — passkeys bind auth to the true origin.
