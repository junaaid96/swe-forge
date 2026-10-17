---
id: cyber-security-interview-medium
level: medium
---

# Cyber Security — Interview (Medium)

> Detection, crypto in practice, identity, and incident response. Pair with Cyber notes 2–3.

## Q1. How do you design a detection for credential dumping (Mimikatz-style)?

**Answer:** Layer signals: Sysmon Event 10 (LSASS access with `GrantedAccess` including `0x1010`/`0x1410`), Event 1 command lines (`sekurlsa::logonpasswords`), EDR LSASS-protection alerts, and hunt queries for rare processes touching LSASS. Harden in parallel: Credential Guard, PPL for LSASS, tiered admin (no Domain Admin logons to workstations), and assume breach — monitor, don't just block.

**Key takeaway:** Detect the *behavior* (LSASS access patterns), not the tool name.

---

## Q2. TLS 1.3 vs 1.2 — what changed and why does it matter?

**Answer:** 1.3 removed weak primitives (RSA key exchange, CBC modes, SHA-1, renegotiation), made forward secrecy mandatory (ephemeral Diffie-Hellman), cut the handshake to 1-RTT (0-RTT resumption with replay caveats), and encrypted more of the handshake (certificates). For defenders: less to misconfigure, but also less visibility — passive decryption of RSA key exchange no longer works, so endpoint telemetry matters more.

**Key takeaway:** 1.3 = fewer, stronger options + mandatory forward secrecy − passive inspection.

---

## Q3. AiTM phishing bypassed MFA — how, and what stops it?

**Answer:** Adversary-in-the-middle kits (Evilginx-style) proxy the real login page: the victim completes MFA on the attacker's domain, and the attacker steals the resulting **session cookie/token**, replaying it without needing credentials at all. Number-matching and SMS codes don't help. What stops it: **phishing-resistant MFA** (FIDO2/passkeys bound to origin) plus token protection (token binding / Conditional Access device compliance) and short session lifetimes with re-auth for sensitive actions.

**Key takeaway:** AiTM steals sessions, not passwords — only origin-bound auth defeats it.

---

## Q4. Walk me through ransomware response in the first hour.

**Answer:** 1) Confirm scope fast (which hosts, which shares, is it still spreading?) via EDR/SIEM. 2) Contain: isolate affected hosts from network (not power off — memory forensics), disable compromised accounts, block C2 at firewall/proxy. 3) Preserve evidence: images/logs before rebuild. 4) Invoke the incident plan: stakeholders, legal, comms; decide on ransom policy *before* pressure peaks (generally: don't pay, restore from offline backups). 5) Eradicate persistence + patch the entry vector before any restore, or you'll re-encrypt yourself.

**Key takeaway:** Scope → isolate (don't power off) → preserve → invoke plan → kill persistence before restore.

---

## Q5. Certificate pinning, CT logs, and private PKI — when do you use each?

**Answer:** **Public PKI + CT monitoring** is the default for internet services — watch Certificate Transparency logs for misissued certs in your domains. **Pinning** (mobile apps, high-risk clients) hard-codes expected keys to defeat rogue-CA/MITM, at the cost of breakage risk on rotation — use backup pins and short lifetimes. **Private PKI** for internal mTLS/service identity where public trust is wrong (service meshes, device fleets) — own the CA, automate issuance/rotation (short-lived certs, ACME/SPIRE-style).

**Key takeaway:** Public PKI + CT by default, pinning for high-risk clients, private PKI for internal identity.

---

## Q6. How do you investigate a suspicious PowerShell alert?

**Answer:** Read the full command line (decoded: `-enc` Base64, obfuscation via variables/concatenation/format operators), check parent process (Office macro? browser exploit? legitimate admin tool?), Sysmon Events 1/3/11/13 (process/network/file/registry), AMSI/ScriptBlock logging (Event 4104 shows deobfuscated content), and prevalence (first-seen binary/script in the fleet?). Benign admin scripts and malware both use PowerShell — parentage + obfuscation level + network behavior decide.

**Key takeaway:** Decode it, check its parent, and let AMSI 4104 show what obfuscation hides.
