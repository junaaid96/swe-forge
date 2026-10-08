# Interview Question Bank — Associate DevOps

> Answer format that works: **definition in one line → why it matters → a concrete example (medilab or your real work) → a trade-off or gotcha.** Aim for 60–90 seconds per answer. Practise out loud.

Difficulty markers: 🟢 almost certain · 🟡 likely · 🔴 stretch (shows depth)

---

## A. Linux & networking

1. 🟢 **How do you check which process is using port 8000?** → `ss -tulpn | grep 8000` or `lsof -i :8000`.
2. 🟢 **The server is slow. Walk me through it.** → `uptime` (load vs `nproc`) → `top` (CPU, `wa` for I/O wait, memory) → `free -h` (available, swap) → `df -h`/`df -i` → `dmesg -T` (OOM) → app logs → recent changes.
3. 🟢 **Explain file permissions 644 and 600.** → Owner rw + others read / owner rw only. SSH keys and `.env` files must be 600.
4. 🟡 **Disk is 100% but you can't find big files.** → Deleted-but-open files: `lsof +L1`, restart or truncate. Or inode exhaustion: `df -i`.
5. 🟡 **SIGTERM vs SIGKILL, and why it matters for deployments.** → TERM is catchable, so the app can drain gracefully. KILL is immediate. Kubernetes sends TERM, waits for the grace period, then KILLs. Apps must handle TERM or deploys drop requests.
6. 🟢 **Connection refused vs connection timed out?** → Refused: the host is reachable but nothing is listening. Timeout: packets are dropped (firewall/NSG/routing/host down).
7. 🟢 **What happens when you type a URL?** → DNS → TCP → TLS → edge/WAF → gateway → Service → pod → DB, and back. (See [Networking](./02-networking.md) §7.)
8. 🟢 **How many usable IPs in a /24 in Azure?** → 256 − 5 reserved = 251.
9. 🟡 **L4 vs L7 load balancing?** → IP/port vs HTTP-aware (host/path, TLS termination, WAF). Azure Load Balancer vs Application Gateway / Front Door.
10. 🔴 **Why must VNet CIDRs not overlap?** → Peering and VPN need unique routing. Overlaps block connectivity, and fixing them means re-IPing.

## B. Git & CI/CD

11. 🟢 **CI vs Continuous Delivery vs Continuous Deployment?** → Automatically build and test every change / always deployable, with manual release / automatically released.
12. 🟢 **Describe a pipeline you'd build for a web app.** → lint+test → build image tagged with the SHA → scan → push to ACR → deploy dev automatically → smoke test → staging → approval → prod, with auto-rollback. The same artifact is promoted through every environment.
13. 🟢 **How do you handle secrets in pipelines?** → OIDC federation to Azure (no stored cloud secrets), Key Vault-linked variables, masked secrets, least-privilege identities per environment.
14. 🟡 **Merge vs rebase?** → A merge preserves history. A rebase rewrites it to be linear. Never rebase shared branches.
15. 🟢 **Rolling back a bad release?** → Roll back the *deployment* first (`helm rollback` / previous tag), then `git revert` the cause. Don't force-push main.
16. 🟡 **Blue-green vs canary?** → Two full environments with an instant switch vs gradual traffic shifting based on metrics. Trade-offs: cost vs. complexity and observability needs.
17. 🟡 **Why tag images with the commit SHA instead of `latest`?** → Immutable, traceable, reproducible rollbacks; no node-cache surprises.
18. 🔴 **How would you secure a CI/CD pipeline?** → Pin actions to SHAs (cite the **March 2026 Trivy tag-hijack**), minimal `permissions:`, OIDC, environment protection rules, separate build and deploy identities, scanning, signed images.
19. 🟡 **Push-based CD vs GitOps?** → The pipeline applies to the cluster vs an in-cluster agent pulling from Git (no cluster creds in CI, drift correction, Git as the audit log).

## C. Docker

20. 🟢 **Container vs VM?** → A process isolated by namespaces and limited by cgroups on a shared kernel vs a full OS on a hypervisor.
21. 🟢 **How do you make an image smaller?** → Multi-stage build, slim base, `.dockerignore`, cleanup in the same RUN, no dev dependencies.
22. 🟢 **CMD vs ENTRYPOINT?** → The fixed executable vs the default arguments. Use exec form for signal handling.
23. 🟡 **Why does my container ignore `docker stop` for 10 seconds?** → Shell-form CMD makes `/bin/sh` PID 1 and it doesn't forward SIGTERM. Use exec form + tini.
24. 🟡 **Volume vs bind mount?** → Docker-managed persistent storage vs a host path (dev live-reload).
25. 🟡 **Built on your Mac, fails on the server with `exec format error` — why?** → arm64 vs amd64. `buildx --platform linux/amd64`.
26. 🔴 **How does a container get its own network?** → A network namespace + a veth pair to a bridge + NAT via iptables/nftables.

## D. Kubernetes

27. 🟢 **Explain Kubernetes architecture.** → The control plane (API server, etcd, scheduler, controller-manager) + nodes (kubelet, kube-proxy, runtime). Desired state + reconciliation loops.
28. 🟢 **What happens when you `kubectl apply` a Deployment?** → The 7-step flow in [Kubernetes](./04-kubernetes.md) §1.
29. 🟢 **Deployment vs StatefulSet vs DaemonSet?** → Stateless replicas / stable identity + storage / one per node.
30. 🟢 **Service types?** → ClusterIP / NodePort / LoadBalancer / headless / ExternalName.
31. 🟢 **Liveness vs readiness vs startup probes?** → Restart / traffic gate / slow-boot guard. Never check the DB in liveness.
32. 🟢 **Pod is CrashLoopBackOff. What do you do?** → `describe` (events), `logs --previous`, check env/secrets/config, dependencies, recent changes.
33. 🟢 **ImagePullBackOff on AKS?** → Tag exists? AcrPull for the kubelet identity? Architecture?
34. 🟡 **Requests vs limits, and what happens when each is exceeded?** → Requests = scheduling reservation. Memory over the limit → OOMKilled (137). CPU over the limit → throttled.
35. 🟡 **How does HPA work, and what does it need?** → Scales replicas on metrics vs targets. Needs metrics-server and CPU **requests**.
36. 🟡 **How do you achieve zero-downtime deployments?** → RollingUpdate `maxUnavailable: 0`, readiness probes, preStop + graceful SIGTERM, a PDB, backward-compatible migrations.
37. 🟡 **ConfigMap vs Secret? Are Secrets secure?** → Non-sensitive vs sensitive config. Secrets are only base64 → RBAC, etcd encryption, Key Vault + CSI/ESO.
38. 🟡 **Ingress vs Gateway API?** → Gateway API is the role-oriented, more expressive successor. **ingress-nginx was retired in March 2026** (no more security fixes), so migrating is now a priority.
39. 🟡 **What is a PodDisruptionBudget?** → The minimum available pods during voluntary disruptions (node drains/upgrades).
40. 🔴 **Taints/tolerations vs node affinity?** → Nodes repel pods vs pods are attracted to nodes. Often used together for dedicated pools.
41. 🔴 **How do NetworkPolicies work, and what's the classic mistake?** → Label-based allow rules enforced by the CNI. Default-deny egress without allowing DNS breaks everything.
42. 🔴 **What's new in recent Kubernetes?** → v1.37 (Aug 2026): HPA scale-to-zero beta (on by default), gang scheduling/Workload APIs to beta, kube-proxy IPVS mode and kube-dns deprecated. Check AKS version availability.

## E. Helm

43. 🟢 **Why Helm?** → Templating per environment, versioned packages, release history and rollback, the ecosystem of third-party charts.
44. 🟢 **How do you roll back?** → `helm history` → `helm rollback <rel> <rev>`; `--rollback-on-failure` in CI.
45. 🟡 **Chart `version` vs `appVersion`?** → The chart package version vs the application version (informational).
46. 🟡 **How do you restart pods when a ConfigMap changes?** → A checksum annotation in the pod template.
47. 🔴 **What changed in Helm 4?** → Server-side apply, WASM plugins, renamed flags (`--atomic` → `--rollback-on-failure`). Helm 3 security support ends Feb 2027.

## F. Terraform

48. 🟢 **What is state and why remote?** → The mapping of code to real resources. Remote for teamwork, locking, durability. It contains secrets, so protect it.
49. 🟢 **init / plan / apply?** → Providers and backend / diff / execute (apply a saved plan in CI).
50. 🟢 **Two people apply at once?** → Locking prevents it (Azure blob lease). A stale lock → `force-unlock` after checking.
51. 🟡 **count vs for_each?** → Index vs key. Removing a middle item with `count` recreates the items after it.
52. 🟡 **How do you import an existing resource?** → An `import` block + `plan -generate-config-out`.
53. 🟡 **What is drift and how do you detect it?** → Reality ≠ code. `plan -refresh-only` / scheduled `plan -detailed-exitcode`.
54. 🟡 **How do you structure multiple environments?** → A directory per env with shared modules, separate state keys, per-env tfvars.
55. 🟡 **Terraform vs Ansible? vs Bicep?** → Provisioning vs configuration / multi-cloud with state vs Azure-native without a state file.
56. 🔴 **Why pin versions? Give a real example.** → Terraform 1.15.0 (Apr 2026) had critical bugs → 1.15.1. `~> 1.15.1` vs `~> 1.15` semantics. Commit the lock file with multi-platform hashes.
57. 🔴 **azurerm 4.x gotcha?** → `subscription_id` is required in the provider block.

## G. Azure

58. 🟢 **Explain the Azure resource hierarchy.** → Tenant → management groups → subscriptions → resource groups → resources. RBAC and Policy inherit.
59. 🟢 **Managed identity vs service principal?** → Azure-managed credentials for Azure resources vs an app identity for external systems (use OIDC federation).
60. 🟢 **NSG — stateful or stateless? How do priorities work?** → Stateful. Lower number evaluated first; first match wins.
61. 🟡 **Private endpoint vs service endpoint?** → A private IP in your VNet (needs a Private DNS zone) vs a public IP restricted to your subnet.
62. 🟡 **Load Balancer vs App Gateway vs Front Door vs Traffic Manager?** → L4 regional / L7 regional + WAF / L7 global edge + WAF + CDN / DNS-based global.
63. 🟡 **How does AKS pull from ACR without passwords?** → The AcrPull role for the kubelet managed identity (`--attach-acr`).
64. 🟡 **Storage redundancy options?** → LRS / ZRS / GRS / GZRS.
65. 🟡 **How do you control Azure costs?** → Budgets and alerts, tags + Policy, right-sizing, autoscaling, stopping dev clusters, reservations, spot instances, cleaning up orphans.
66. 🔴 **How would a pod read a Key Vault secret securely?** → Workload Identity + a federated credential + Key Vault Secrets User + the CSI driver.
67. 🔴 **When would you NOT use AKS?** → Small teams or few services → Container Apps / App Service.

## H. Observability & incidents

68. 🟢 **What do you monitor for a web API?** → The golden signals / RED: error ratio, p95 latency, traffic, saturation. Plus cert expiry and disk prediction.
69. 🟢 **An alert fires at 2 a.m. Walk me through it.** → Acknowledge → impact → recent changes → runbook → mitigate (rollback) → escalate early → communicate → postmortem.
70. 🟡 **metrics-server vs Prometheus vs kube-state-metrics vs node-exporter?** → See [Observability](./09-observability.md) §3.
71. 🟡 **SLI/SLO/SLA/error budget?** → Measurement / internal target / contract / allowed unreliability that governs release pace.
72. 🟡 **What is a blameless postmortem?** → Focus on systems, not people; timeline, root cause, contributing factors, owned actions.
73. 🔴 **Why alert on symptoms rather than causes?** → Users feel symptoms. Cause-based alerts (CPU 80%) are noisy and often not actionable.

## I. Security

74. 🟢 **What is least privilege? Give an example.** → The CI identity has Contributor on the dev RG + AcrPush, nothing in prod.
75. 🟢 **How do you harden a container / pod?** → Non-root, read-only FS, drop capabilities, no privilege escalation, seccomp, limits, the `restricted` Pod Security level.
76. 🟡 **A secret was committed to Git. What do you do?** → Rotate FIRST, check usage, then purge history, then prevent recurrence.
77. 🟡 **How do you secure SSH on a VM?** → Keys only, no root login, restricted source IPs/Bastion, `sshd -t` before reload, patching.
78. 🔴 **What's supply-chain security?** → Securing everything that builds and ships code: dependencies, actions, base images, signing, SBOMs. Example: the Trivy 2026 compromise.

---

## J. Behavioural questions (STAR: Situation, Task, Action, Result)

Prepare **real** stories from your own jobs and projects. Fill in the templates. Don't invent details.

| Question | Story to prepare | Hook to DevOps |
|---|---|---|
| **Why DevOps, when you're a software engineer?** | You've owned deployment for your own services and client projects | "I found reliability is decided between `git push` and prod. I want to own that path, and my dev background lets me help developers directly" |
| **Will you go back to development?** | Hybrid is your strength | "I see this as platform engineering: I'll keep writing code, but for automation, pipelines, and tools that make every developer faster" |
| **Tell me about a production issue you handled** | A real outage or bug in a healthcare service | Structure it: detection → impact → mitigation → root cause → prevention |
| **A time you automated something manual** | A deploy script, a dev-environment setup repo, a CLI tool: anything that shows an automation mindset | Time saved, errors avoided |
| **A disagreement with a teammate** | A technical disagreement you resolved with data | Collaboration with dev/security teams is in the JD |
| **Something you learned quickly** | Picking up Spring Boot/Django deeply; this DevOps prep | Show the method: plan → build → break → fix |
| **A mistake you made** | Honest, small, what you changed afterwards | Blameless mindset |

**The 30-second intro:** name → current role (e.g., software engineer on microservices) → the DevOps-relevant things you already do (Docker, deploying client projects, CI) → what you built to prepare (e.g., the capstone repo) → why this company (its platform, cloud stack and teams, researched beforehand).

---

## K. Questions to ask them (pick 2–3)

1. "What does the delivery path look like today — GitHub Actions or Azure DevOps, Helm or GitOps with Argo/Flux?"
2. "How is on-call structured for associates? Is there shadowing before joining the rotation?"
3. "What's the biggest reliability or platform problem the team is tackling this year?"
4. "How do DevOps engineers work with the product teams day to day?"
5. "What would a successful first 90 days look like for this role?"
6. "How does the path from Associate to Mid-level work? What ownership marks the step?"

---

## L. Practical-test tactics

- **Read the whole task first.** List the requirements and tick them off (candidates often report that grading focused on requirements they'd overlooked).
- **Commit early and often, with clear messages.** Graders read history.
- **README first:** what you built, how to run it, what you'd do with more time. Assumptions written down.
- **Get it working end-to-end simply, then improve.** A working pipeline with one stage beats half of a perfect one.
- **Name trade-offs explicitly** ("I used a Kubernetes Secret here for time; in production I'd use Key Vault + Workload Identity").
- **Security basics in everything:** no secrets in the repo, non-root containers, pinned versions.
- **If stuck:** say what you've checked and what you'd check next. Interviewers grade the method.
