# Security: Access, Secrets, Hardening, Supply Chain

> "Apply basic cloud security, access control, secrets management, and infrastructure hardening practices." Employers routinely list cloud security next to automation and scalability. Show a **principled** approach, not a list of tools.

---

## 1. The principles (say these words)

| Principle | In practice |
|---|---|
| **Least privilege** | Every identity (human, pipeline, pod) gets the minimum role at the narrowest scope |
| **Defence in depth** | Several independent layers: network, identity, workload, data. One failure isn't a breach |
| **Identity over secrets** | Prefer managed/workload identities and OIDC federation, so there are no passwords to leak |
| **Secure by default** | Private endpoints, non-root containers, deny-by-default network policies, templates that bake this in |
| **Shift left** | Scan code, dependencies, IaC, and images **in CI**, before production |
| **Assume breach** | Segment networks, log everything important, rotate credentials, and have a response plan |
| **Shared responsibility** | Azure secures the platform; **you** secure identities, configuration, data, and workloads |

---

## 2. Identity and access

- Humans: **Entra ID + MFA**, access through **groups**, Privileged Identity Management (**just-in-time** elevation for Owner/Contributor in prod)
- Pipelines: **OIDC federation** (GitHub Actions / Azure DevOps workload identity federation) → no stored client secrets
- Azure workloads: **managed identities**
- Pods on AKS: **Workload Identity** (below)
- AKS API access: **Entra ID integration + Azure RBAC**, and disable local accounts so nobody holds a static admin kubeconfig

🎯 **Interview:** *"How do you audit access?"* → Entra sign-in logs, Azure Activity Log, Key Vault diagnostic logs (who read which secret), and Kubernetes audit logs, all shipped to Log Analytics with retention.

---

## 3. Secrets management

### Where secrets must never live

Git (including history) · Docker image layers (`ENV`, `COPY .env`) · Helm values committed to Git · pipeline logs (`echo $PASSWORD`) · Terraform state without protection · Slack/Teams messages

### 🧪 Pattern: Key Vault → AKS via Workload Identity + Secrets Store CSI driver

**Step 1 — identity and trust (az CLI):**

```bash
RG=rg-medilab-dev; AKS=aks-medilab-dev; KV=kv-medilab-dev
az aks enable-addons -g $RG -n $AKS --addons azure-keyvault-secrets-provider

ISSUER=$(az aks show -g $RG -n $AKS --query oidcIssuerProfile.issuerUrl -o tsv)
az identity create -g $RG -n id-medilab-api
CLIENT_ID=$(az identity show -g $RG -n id-medilab-api --query clientId -o tsv)
PRINCIPAL_ID=$(az identity show -g $RG -n id-medilab-api --query principalId -o tsv)

# Trust: "tokens for K8s ServiceAccount medilab/medilab-api from THIS cluster may act as this identity"
az identity federated-credential create -g $RG --identity-name id-medilab-api \
  --name fc-medilab-api --issuer "$ISSUER" \
  --subject system:serviceaccount:medilab:medilab-api \
  --audiences api://AzureADTokenExchange

# Permission: read secrets from this ONE vault (data-plane role)
az role assignment create --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope "$(az keyvault show -n $KV --query id -o tsv)"
```

**Step 2 — Kubernetes objects:**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: medilab-api
  namespace: medilab
  annotations:
    azure.workload.identity/client-id: "<CLIENT_ID>"
---
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: medilab-kv
  namespace: medilab
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    clientID: "<CLIENT_ID>"            # workload identity client ID
    keyvaultName: kv-medilab-dev
    tenantId: "<TENANT_ID>"
    objects: |
      array:
        - |
          objectName: db-password
          objectType: secret
  secretObjects:                       # optionally mirror into a K8s Secret for envFrom
    - secretName: medilab-secrets
      type: Opaque
      data:
        - objectName: db-password
          key: DB_PASSWORD
```

**Step 3 — in the Deployment's pod template:**

```yaml
metadata:
  labels:
    azure.workload.identity/use: "true"    # opt the pod into token injection
spec:
  serviceAccountName: medilab-api
  containers:
    - name: api
      volumeMounts:
        - { name: kv, mountPath: /mnt/secrets, readOnly: true }
  volumes:
    - name: kv
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes: { secretProviderClass: medilab-kv }
```

⚠️ **Gotchas:**
- The synced K8s Secret (`secretObjects`) only exists **while a pod mounts the volume**.
- A secret rotated in Key Vault reaches the mounted *file* after the rotation poll interval (if rotation is enabled), but **env vars don't change** until the pod restarts.
- The federated credential **subject must match exactly** (`system:serviceaccount:<ns>:<sa>`). A typo gives cryptic token-exchange errors.

| Approach | How | Pros | Cons |
|---|---|---|---|
| **Secrets Store CSI driver** (AKS add-on) | Mounts Key Vault secrets as files (optional K8s Secret sync) | Microsoft-supported add-on; secrets can stay out of etcd | Pod must mount a volume; env sync is indirect |
| **External Secrets Operator** | A controller syncs Key Vault → K8s Secrets | Works nicely with `envFrom` and GitOps; multi-provider | Secrets do land in etcd; one more operator to run |
| **Sealed Secrets / SOPS** | Encrypted secrets committed to Git | Pure GitOps | Key management; rotation is manual |
| Plain K8s Secrets from CI | CI runs `kubectl create secret` | Simple | CI holds the secrets; no rotation story |

---

## 4. Network security

- **Private by default:** private endpoints for Postgres, Key Vault, ACR, and Storage, with public network access **disabled**
- **NSGs** on subnets. Only the edge (App Gateway/Front Door with **WAF**) is public
- **No public IPs on VMs.** Use **Azure Bastion** or just-in-time access
- **Egress control:** route outbound traffic through Azure Firewall/NAT with an allow-list (limits exfiltration and C2)
- **In the cluster:** `default-deny` NetworkPolicies + explicit allows ([Kubernetes](./04-kubernetes.md) §13), and optionally mTLS with a service mesh
- **Private AKS cluster** (the API server has no public endpoint) or authorized IP ranges on the API server

---

## 5. Workload / container hardening

**Pod Security Admission** (built into Kubernetes) enforces one of three profiles per namespace:

| Level | Allows | Use |
|---|---|---|
| `privileged` | Everything | System components only |
| `baseline` | Blocks known escalations (hostNetwork, privileged containers, hostPath...) | Minimum for apps |
| `restricted` | Also requires non-root, dropping ALL capabilities, a seccomp profile, no privilege escalation | ✅ Target for medilab |

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: medilab
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
```

The Deployment in [Kubernetes](./04-kubernetes.md) §6 already passes `restricted`: `runAsNonRoot`, `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`, `seccompProfile: RuntimeDefault`, plus a `readOnlyRootFilesystem`.

Also: resource limits (a noisy or compromised pod can't starve the node), no `hostPath` mounts, and `automountServiceAccountToken: false` for pods that don't call the Kubernetes API.

---

## 6. Supply-chain security

| Layer | Control | Tool examples |
|---|---|---|
| Source | Branch protection, required reviews, signed commits, secret scanning | GitHub push protection, gitleaks |
| Dependencies | Vulnerability alerts, lock files, automatic update PRs | Dependabot, Renovate, `pip-audit`, `npm audit` |
| IaC | Misconfiguration scanning before apply | Checkov, tfsec/Trivy config, tflint |
| Images | CVE scanning, minimal base images, regular rebuilds | Trivy, Grype, Docker Scout, **Defender for Containers** |
| Provenance | Sign images; verify signatures at admission; SBOMs | cosign/Sigstore, **Notation** (Notary Project, integrates with ACR), Ratify |
| Pipeline | Pin actions to SHAs, least-privilege tokens, OIDC | See [CI/CD](./06-cicd.md) §6 |

### 🧨 Case study to quote: the Trivy compromise (March 2026)

On **19 March 2026**, attackers used compromised credentials to publish a malicious **Trivy v0.69.4**, force-push **76 of 77** `trivy-action` tags and all `setup-trivy` tags to credential-stealing code, and later push malicious Docker Hub images (v0.69.5/v0.69.6). It grew out of an intrusion in late February: credential rotation after the first disclosure was **not atomic**, which left residual access. It's tracked as **CVE-2026-33634** and listed in CISA KEV.

**Lessons:**
1. **Your security tools are part of your attack surface.** A scanner runs with your pipeline's secrets.
2. **Pin to immutable references** (full commit SHAs, image digests), not tags.
3. **Rotate credentials atomically.** A half-finished rotation leaves the door open.
4. If a compromised component *might* have run → **treat every reachable secret as exposed and rotate all of them.**
5. Short-lived credentials (OIDC) limit the value of anything stolen.

🎯 Bringing this up when asked "how would you secure a CI/CD pipeline?" shows current, practical awareness.

---

## 7. Linux / VM hardening

```bash
# /etc/ssh/sshd_config.d/10-hardening.conf
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AllowGroups ssh-users
MaxAuthTries 3
```

```bash
sudo sshd -t && sudo systemctl reload ssh   # VALIDATE first — a broken config can lock you out
```

⚠️ **Gotcha:** keep your current SSH session open while you test a new login in a *second* terminal. If the config is wrong, you still have a way in.

Checklist: key-only SSH (ed25519) · no root login · automatic security updates · minimal packages · host firewall (ufw) as well as the NSG · fail2ban for anything exposed · time sync · logs shipped off-box (an attacker can't erase them) · disk encryption (Azure encrypts managed disks at rest by default; add CMK or encryption at host for stricter needs) · CIS Benchmark as the reference.

---

## 8. Data protection (🏥 PHI)

| Control | Azure implementation |
|---|---|
| Encryption at rest | On by default (platform-managed keys); **customer-managed keys** in Key Vault for regulated data |
| Encryption in transit | TLS 1.2+ everywhere; `require_secure_transport` on Postgres; HTTPS-only on storage |
| Access minimisation | Private endpoints; RBAC data roles; no shared accounts |
| Audit | Diagnostic settings → Log Analytics for Key Vault, Storage, Postgres (pgaudit) |
| Backups | Automated backups + tested restores (a restore you never tested is a hope, not a backup) |
| Retention and immutability | Lifecycle policies; immutable blob storage for records |
| Data minimisation in logs | No PHI in logs or traces; IDs only |
| Residency | Choose the region deliberately and document it |

---

## 9. Incident: "a secret leaked" — response runbook

1. **Revoke/rotate** the secret immediately (Key Vault new version → restart consumers)
2. **Scope the exposure:** where was it visible (repo, logs, image)? For how long?
3. **Check usage:** sign-in logs, Key Vault logs, DB connection logs for unusual access during the window
4. **Remove it** from the source (history rewrite, delete the image tag, purge logs where possible)
5. **Prevent it next time:** add a scanner or hook, switch to workload identity or OIDC so the secret no longer exists
6. **Postmortem** (blameless)

---

## 10. Gotchas summary

| Myth | Reality |
|---|---|
| "K8s Secrets are encrypted" | Base64 in the API. Protect with RBAC, etcd encryption, and external stores |
| "Private cluster = secure" | Still need RBAC, pod security, network policies, patched images |
| "We scan images, so we're safe" | The scanner itself can be compromised (Trivy 2026). Pin and verify |
| "Contributor is fine for the pipeline" | Scope to the RG, and add data roles only where needed. Never Owner |
| "The NSG blocks it, so the app port can be open" | Defence in depth: the next misconfiguration opens it |

---

## 🎯 Quick-fire interview questions

1. How do you store secrets for an app on AKS? → Key Vault + Workload Identity + CSI driver (or ESO). Never in Git or images
2. What is least privilege, concretely, for a CI pipeline? → OIDC identity, Contributor on the **dev RG only**, AcrPush on the ACR, no rights in prod; a separate prod identity behind an approval
3. How do you harden a container? → Minimal base, non-root, read-only root FS, drop capabilities, no privilege escalation, resource limits, scanned and signed image
4. What's the difference between authentication and authorization? → AuthN = who you are (Entra ID sign-in). AuthZ = what you may do (RBAC)
5. What would you check first on a newly created public VM? → NSG inbound rules (is SSH open to `*`?), password auth disabled, OS updates, whether it needs a public IP at all
