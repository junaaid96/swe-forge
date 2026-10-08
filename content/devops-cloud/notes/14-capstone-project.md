# Capstone: `medilab-platform`

> One public repo that proves every line of the JD. It's worth more than any certificate at associate level, and it gives you real stories for every interview question. Build it in milestones; each one is independently demo-able.

---

## Repo structure

```
medilab-platform/
├── app/                        # Django API + Celery worker (or reuse one of your real apps)
│   ├── medilab/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── compose.yaml
├── charts/medilab/             # Helm chart (values-dev.yaml, values-prod.yaml)
├── infra/
│   ├── bootstrap/bootstrap.sh  # tfstate storage
│   ├── modules/{network,aks}/
│   └── envs/{dev,prod}/
├── k8s/platform/               # Gateway, monitoring rules, NetworkPolicies, SecretProviderClass
├── scripts/                    # wait-healthy.sh, cleanup-logs.sh, untagged.sh, pg-backup.sh
├── docs/
│   ├── architecture.md         # diagram + decisions
│   ├── runbooks/               # 2–3 runbooks from the troubleshooting runbooks
│   └── incidents/              # simulated incidents + mini postmortems
├── .github/workflows/
│   ├── app-ci-cd.yml
│   └── infra.yml               # fmt/validate/plan on PR, apply on merge
├── azure-pipelines.yml         # the same app pipeline in Azure DevOps (bonus)
├── .pre-commit-config.yaml     # gitleaks, shellcheck, terraform fmt
└── README.md
```

---

## Milestones and acceptance criteria

| # | Milestone | Done when… | Notes |
|---|---|---|---|
| M1 | **Containerize** | `docker compose up` runs api + worker + postgres + redis; the image is non-root, multi-stage, < ~250 MB; `/healthz` and `/readyz` exist | [Docker](./03-docker.md) |
| M2 | **CI** | Every PR runs lint + tests (Postgres service container) + a Trivy scan (pinned); main pushes `:<sha>` to ACR via **OIDC** (no secrets) | [CI/CD](./06-cicd.md) |
| M3 | **Kubernetes locally** | kind cluster runs the Deployment/Service/Job/HPA/PDB; all 8 break-it drills fixed and written up | [Kubernetes](./04-kubernetes.md), [Troubleshooting runbooks](./12-troubleshooting-runbooks.md) |
| M4 | **Helm** | `helm upgrade --install` with dev/prod values; migrations as a pre-upgrade hook; a checksum rollout on config change; a rollback demonstrated | [Helm](./05-helm.md) |
| M5 | **Terraform on Azure** | Remote state with locking; network module; ACR + AKS + Log Analytics + AcrPull; `plan` posted on PRs; `destroy` works cleanly | [Terraform](./07-terraform.md) |
| M6 | **CD to AKS** | Merge to main → deploys to dev automatically → smoke test; prod behind environment approval, promoting the **same tag** | [CI/CD](./06-cicd.md) |
| M7 | **Secrets and hardening** | Key Vault + Workload Identity + CSI; namespace `restricted` Pod Security; default-deny NetworkPolicies with DNS allowed | [Security](./10-security.md) |
| M8 | **Observability** | kube-prometheus-stack (or Azure Managed Prometheus/Grafana); one dashboard (RED); 2 alert rules with runbook links | [Observability](./09-observability.md) |
| M9 | **Docs** | README with an architecture diagram, a decisions log, 3 runbooks, 2 simulated-incident postmortems | This is what interviewers actually read |

Minimum for the application deadline: **M1 + M2 + M3 + a solid README.** Keep adding milestones before the interview.

---

## 💸 Cost control (read before creating anything on Azure)

- Create a **budget with email alerts** on your subscription first (e.g., at 50%, 80%, 100%)
- Do most Kubernetes practice on **kind** locally (free)
- Use Azure for M5–M8 in **short sessions**: `terraform apply` → test → `terraform destroy` the same day
- Smallest workable sizes: 1–2 nodes, `Standard_B`/`D2s` class; Basic ACR; 30-day Log Analytics retention
- `az aks stop` if you pause mid-session
- Check for orphans after `destroy`: `az resource list -o table`, especially the `MC_*` node resource group, public IPs, and disks
- Build images for **linux/amd64** from your Apple Silicon Mac

---

## README template

```markdown
# medilab-platform
Production-style delivery platform for a diagnostic-lab API: Docker → GitHub Actions (OIDC) → ACR → AKS via Helm,
infrastructure in Terraform, secrets in Key Vault (Workload Identity), monitoring with Prometheus/Grafana.

## Architecture
(diagram: dev push → CI → ACR → AKS; VNet with subnets; private endpoints; Key Vault; monitoring)

## What this demonstrates
| JD requirement | Where |
|---|---|
| CI/CD pipelines | .github/workflows/app-ci-cd.yml |
| Terraform IaC on Azure | infra/ |
| Docker + Kubernetes | app/Dockerfile, charts/medilab |
| Helm | charts/medilab |
| Secrets management & hardening | k8s/platform/, docs/architecture.md#security |
| Monitoring & incident response | k8s/platform/monitoring/, docs/incidents/ |
| Scripting | scripts/ |

## Run it locally (5 minutes)
docker compose up …  /  kind create cluster …  /  helm upgrade --install …

## Decisions & trade-offs
- Gateway API instead of ingress-nginx (retired March 2026)
- Actions pinned to commit SHAs (Trivy tag-hijack, March 2026)
- No CPU limits on the API (throttling vs latency) — memory limits enforced
- Managed Postgres over a StatefulSet (backups/HA/patching for patient data)

## Incidents I simulated
- OOMKilled after a PDF feature → limits + moved to worker (docs/incidents/001.md)
- 503 after a selector rename → added a CI check with `helm template | kubeconform` (docs/incidents/002.md)

## What I'd do next
GitOps with Flux/Argo CD · canary with Gateway API weights + automated analysis · image signing with Notation
```

---

## CV / LinkedIn lines (only claim what you've actually built)

- Built a containerized delivery platform for a Django healthcare API: multi-stage non-root images, GitHub Actions CI/CD with **Azure OIDC** (no stored secrets), and Helm deployments to **AKS** with automated rollback
- Provisioned Azure networking, ACR, AKS, and Log Analytics with **Terraform** modules and a remote, locked state backend
- Implemented Key Vault secret delivery via **AKS Workload Identity**, Pod Security `restricted`, and default-deny NetworkPolicies
- Set up Prometheus/Grafana monitoring with SLO-style alerts and wrote runbooks and postmortems for simulated incidents

Put the repo link at the **top** of your CV for this application.

---

## Demo script for the interview (3 minutes)

1. Open a PR with a small change → show CI running (tests, scan, plan comment)
2. Merge → watch the image push and the deploy to dev → the smoke test passes
3. `kubectl get pods -n medilab`, show the probes and security context in the manifest
4. Break something live (wrong image tag) → show the rollout stalling safely → `helm rollback`
5. Show the Grafana dashboard + an alert rule with its runbook link
6. Close with one trade-off you made and why
