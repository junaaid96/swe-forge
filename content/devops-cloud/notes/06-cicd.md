# CI/CD — GitHub Actions & Azure Pipelines

> "Assist in maintaining CI/CD pipelines and automated deployment workflows." You'll likely be asked to **read or fix a pipeline YAML live**. Know both GitHub Actions and Azure DevOps Pipelines. Microsoft-centric shops often use Azure DevOps.

---

## 1. Concepts

| Term | Meaning | Gate before production |
|---|---|---|
| **Continuous Integration** | Every change is merged often and **automatically built and tested** | — |
| **Continuous Delivery** | Every green build is *deployable*. Release to prod is a **manual decision** | Human approval |
| **Continuous Deployment** | Every green build **goes to prod automatically** | None (tests + monitors are the gate) |

🎯 **Interview:** *"Delivery vs deployment?"* is literally that table. The difference is whether a human presses the button.

### The canonical pipeline

```
 PR / push
   │
   ▼
[lint + unit tests] → [build image :<sha>] → [scan image + deps] → [push to ACR]
                                                                        │
             ┌──────────────────────────────────────────────────────────┘
             ▼
 [deploy DEV (auto)] → [smoke tests] → [deploy STAGING] → [approval] → [deploy PROD] → [verify / auto-rollback]
```

Principles:
- **Build once, promote the same artifact.** The same image digest goes to dev, staging, and prod. Only configuration differs.
- **Fail fast.** Cheap checks (lint, unit tests) run first.
- **Everything as code.** The pipeline YAML lives in the repo and is reviewed like code.
- **Pipelines have no long-lived cloud secrets.** Use OIDC federation (§3).

### DORA metrics (how teams measure delivery performance)

| Metric | Question |
|---|---|
| Deployment frequency | How often do we ship? |
| Lead time for changes | Commit → running in prod: how long? |
| Change failure rate | What % of deploys cause an incident or rollback? |
| Failed deployment recovery time (MTTR) | How fast do we restore after a bad deploy? |

---

## 2. GitHub Actions — the model

| Concept | Meaning |
|---|---|
| **Workflow** | A YAML file in `.github/workflows/`, triggered by events (`push`, `pull_request`, `workflow_dispatch`, `schedule`) |
| **Job** | A set of steps on one **runner**. Jobs run in parallel unless `needs:` chains them |
| **Step** | A shell command (`run:`) or a reusable **action** (`uses:`) |
| **Runner** | A GitHub-hosted VM (`ubuntu-latest`) or **self-hosted** (inside your VNet, to reach private AKS) |
| **Secrets / Variables** | Repo-, environment-, or org-level. Secrets are masked in logs |
| **Environments** | `dev`, `prod` with **protection rules** (required reviewers, wait timers, branch restrictions) and env-scoped secrets |
| **Artifacts / cache** | Pass files between jobs / speed up dependency installs |

📌 **2026 state:** `actions/checkout` is at **v6**. Runners default to **Node 24** since 4 March 2026, so old Node 20 actions raise deprecation warnings.

---

## 3. 🧪 Full workflow: test → build → scan → push → deploy (with OIDC)

**Why OIDC:** instead of storing an Azure client secret in GitHub (long-lived, can leak, needs rotation), GitHub issues a **short-lived OIDC token** per run. Azure trusts it through a **federated credential** on an app registration or user-assigned managed identity, scoped to `repo:<org>/<repo>:environment:prod`. No secret exists to steal.

```yaml
# .github/workflows/ci-cd.yml
name: ci-cd

on:
  pull_request:
  push:
    branches: [main]

permissions:            # least privilege for the GITHUB_TOKEN
  contents: read

env:
  ACR_NAME: medilabacr
  IMAGE: medilabacr.azurecr.io/medilab-api

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_DB: medilab_test
          POSTGRES_USER: ci
          POSTGRES_PASSWORD: ci
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U ci"
          --health-interval 5s --health-retries 10
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v6
        with:
          python-version: "3.13"
          cache: pip
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: ruff check .
      - run: pytest -q --maxfail=1
        env:
          DATABASE_URL: postgres://ci:ci@localhost:5432/medilab_test

  build-scan-push:
    if: github.event_name == 'push'          # only on main, not on PRs
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write                        # REQUIRED for OIDC to Azure
    environment: dev
    outputs:
      tag: ${{ steps.meta.outputs.tag }}
    steps:
      - uses: actions/checkout@v6
      - id: meta
        run: echo "tag=${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"
      - uses: azure/login@v2                 # pin to a full SHA in real repos (see §6)
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      - run: az acr login --name "$ACR_NAME"
      - run: |
          docker buildx build --platform linux/amd64 \
            -t "$IMAGE:${{ steps.meta.outputs.tag }}" --load .
      - name: Scan image (fail on fixable HIGH/CRITICAL)
        run: |
          # Install a PINNED, verified Trivy version — see the Security guide for the March 2026 incident
          trivy image --exit-code 1 --ignore-unfixed --severity HIGH,CRITICAL \
            "$IMAGE:${{ steps.meta.outputs.tag }}"
      - run: docker push "$IMAGE:${{ steps.meta.outputs.tag }}"

  deploy-dev:
    needs: build-scan-push
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    environment: dev
    concurrency:
      group: deploy-dev
      cancel-in-progress: false             # never cancel a deploy halfway
    steps:
      - uses: actions/checkout@v6
      - uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      - uses: azure/setup-helm@v4
        with:
          version: v4.2.3                   # PIN the Helm version (Helm 4 flags below)
      - name: Get AKS credentials
        run: |
          az aks get-credentials -g rg-medilab-dev -n aks-medilab-dev --overwrite-existing
          az aks install-cli                 # installs kubelogin (Entra ID-enabled clusters)
          kubelogin convert-kubeconfig -l azurecli
      - name: Helm deploy
        run: |
          helm upgrade --install medilab charts/medilab \
            -n medilab --create-namespace \
            -f charts/medilab/values-dev.yaml \
            --set image.tag=${{ needs.build-scan-push.outputs.tag }} \
            --rollback-on-failure --wait --timeout 10m
      - name: Smoke test
        run: |
          for i in $(seq 1 10); do
            code=$(curl -s -o /dev/null -w "%{http_code}" https://api-dev.medilab.example.com/healthz) || true
            [ "$code" = "200" ] && exit 0
            sleep 6
          done
          echo "smoke test failed"; exit 1
```

**Promotion to prod** is a separate job with `environment: prod`. GitHub pauses until a required reviewer approves, then deploys the **same tag**.

⚠️ **Gotchas in that file:**
- Without `id-token: write`, `azure/login` fails with a vague error.
- `${GITHUB_SHA::7}` works because `run:` defaults to bash on Linux runners.
- A private AKS cluster isn't reachable from GitHub-hosted runners. Use a **self-hosted runner inside the VNet**, or `az aks command invoke`.
- `pull_request` from **forks** doesn't get secrets (by design). Never use `pull_request_target` to run untrusted fork code with secrets.

---

## 4. Azure DevOps Pipelines — same pipeline, Azure flavour

| GitHub Actions | Azure Pipelines |
|---|---|
| Workflow file | `azure-pipelines.yml` |
| Job / steps | **Stages → Jobs → Steps** (stages are a first-class level) |
| Action (`uses:`) | **Task** (`task: Docker@2`) |
| Secrets | Variable groups (can be **linked to Key Vault**), secret variables |
| Azure auth | **Service connection** (supports workload identity federation = OIDC) |
| Environment + reviewers | **Environments** with approvals and checks |
| Reusable workflow | **Templates** (`template: templates/deploy.yml`) |
| Runner | **Agent** (Microsoft-hosted or self-hosted agent pool) |

```yaml
# azure-pipelines.yml
trigger:
  branches: { include: [main] }
pr:
  branches: { include: [main] }

pool:
  vmImage: ubuntu-latest

variables:
  acrServiceConnection: sc-acr-medilab          # service connections, created in Project Settings
  armServiceConnection: sc-arm-medilab-dev
  imageRepository: medilab-api
  tag: $(Build.SourceVersion)

stages:
  - stage: CI
    jobs:
      - job: Test
        steps:
          - task: UsePythonVersion@0
            inputs: { versionSpec: "3.13" }
          - script: |
              pip install -r requirements.txt -r requirements-dev.txt
              pytest -q
            displayName: Run tests

      - job: BuildPush
        dependsOn: Test
        condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
        steps:
          - task: Docker@2
            displayName: Build and push to ACR
            inputs:
              containerRegistry: $(acrServiceConnection)
              repository: $(imageRepository)
              command: buildAndPush
              Dockerfile: Dockerfile
              tags: $(tag)

  - stage: DeployDev
    dependsOn: CI
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: HelmDeploy
        environment: medilab-dev                 # approvals/checks configured on the environment
        strategy:
          runOnce:
            deploy:
              steps:
                - checkout: self                 # ⚠️ deployment jobs do NOT check out code by default
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: $(armServiceConnection)
                    scriptType: bash
                    scriptLocation: inlineScript
                    inlineScript: |
                      set -euo pipefail
                      az aks get-credentials -g rg-medilab-dev -n aks-medilab-dev --overwrite-existing
                      # install a pinned Helm version here — hosted agents may ship Helm 3
                      helm upgrade --install medilab charts/medilab -n medilab \
                        -f charts/medilab/values-dev.yaml --set image.tag=$(tag) \
                        --rollback-on-failure --wait --timeout 10m
```

⚠️ **Gotcha:** `deployment:` jobs skip the automatic checkout. Forgetting `- checkout: self` gives you "chart not found."

---

## 5. Deployment strategies

| Strategy | How | Rollback | Cost | Risk |
|---|---|---|---|---|
| **Recreate** | Stop all old, start all new | Redeploy the old version | Lowest | **Downtime** |
| **Rolling** (K8s default) | Replace pods gradually | `rollout undo` (takes time) | Low | Old and new run together, so they must be compatible |
| **Blue-green** | Full new environment ("green") next to the old ("blue"); switch traffic at once | **Instant**: switch back | 2× resources during the switch | DB schema must work for both |
| **Canary** | Send a small % of traffic (e.g., 10%) to the new version, watch metrics, increase gradually | Shift the weight back to 0 | Low–medium | Needs good metrics; can be automated (Argo Rollouts / Flagger) |
| **Feature flags** | Deploy the code dark; enable it per user or % at runtime | Toggle off | Low | Flag debt |

🎯 **Interview:** tie canary to Gateway API `HTTPRoute` weights ([Kubernetes](./04-kubernetes.md) §4), and blue-green to the deployment patterns in [Backend optimization patterns](../backend/02-backend-optimization-patterns.md).

🏥 **Healthcare angle:** for report-generation changes, canary + feature flags let you ship to one branch lab first. That limits the blast radius if patient reports render wrongly.

---

## 6. Pipeline security (supply chain) — hot topic in 2026

**Case study: the Trivy compromise (March 2026, CVE-2026-33634).** Attackers with stolen credentials **force-pushed 76 of 77 version tags** of `aquasecurity/trivy-action` (and all tags of `setup-trivy`) to point at a **credential stealer**. Any pipeline using `@v0.x` or `@master` ran malware *before* the real scan, so the pipelines looked green while leaking cloud and Kubernetes secrets. Safe versions: trivy-action **0.35.0**, setup-trivy **0.2.6** (recreated), Trivy binary **0.69.2/0.69.3**.

Lessons to quote:

| Practice | Why |
|---|---|
| **Pin third-party actions to a full 40-char commit SHA** (`uses: org/action@<sha> # v1.2.3`) | Tags are mutable and can be force-pushed. SHAs can't |
| Let **Dependabot/Renovate** bump those SHAs | Pinned without staying stale |
| Minimal `permissions:` per job | Limits what a compromised step can do with `GITHUB_TOKEN` |
| **OIDC**, not stored cloud secrets | Nothing long-lived to exfiltrate |
| Separate build and deploy credentials; environment-scoped secrets | A compromised PR build can't reach prod |
| Treat any exposure as a full compromise → **rotate all secrets** the pipeline could access | The Trivy advisory's own guidance |

---

## 7. GitOps (push vs pull deployment)

| | Push (pipeline deploys) | Pull / GitOps (Argo CD, Flux) |
|---|---|---|
| Who applies to the cluster | CI runner with cluster credentials | An agent **inside** the cluster pulls from Git |
| Cluster credentials in CI | Yes | **No** |
| Drift correction | No (a manual `kubectl edit` persists) | Yes: the agent reverts drift to match Git |
| Audit trail | Pipeline logs | **Git history = deployment history** |
| Rollback | Re-run the old pipeline | `git revert` |
| Learning curve | Low | Medium |

Typical GitOps flow: CI builds and pushes the image → CI opens a PR bumping `image.tag` in a **config repo** → merge → Argo CD syncs. AKS offers Flux as a managed **GitOps extension**.

---

## 8. Making pipelines fast and reliable

- **Cache** dependencies (`setup-python` `cache: pip`, Docker layer cache `--cache-from type=gha`)
- **Parallelise** independent jobs; use `paths:` filters in monorepos
- **Idempotent deploy steps** (`helm upgrade --install`, `terraform apply` of a saved plan)
- **Concurrency groups** so two deploys to the same environment never overlap
- **Flaky tests** are a pipeline bug. Quarantine them and fix them. Blind retries hide real failures

---

## 9. Common pipeline failures — the practical test favourites

| Error | Cause | Fix |
|---|---|---|
| `unauthorized: authentication required` on push | Not logged in to ACR / wrong registry name | `az acr login -n <acr>`; check the identity has **AcrPush** |
| `AADSTS700016` / `No matching federated identity record` | The OIDC subject doesn't match (wrong branch/environment in the federated credential) | Fix the federated credential subject, e.g. `repo:org/repo:environment:dev` |
| `ImagePullBackOff` after a successful deploy | AKS kubelet identity lacks **AcrPull**, or the tag was never pushed | Role assignment; check the push step actually ran |
| `exec format error` in pods | arm64 image built on an Apple Silicon Mac/runner | `--platform linux/amd64` |
| `Error: unknown flag: --rollback-on-failure` | The agent has Helm 3 | Pin and install Helm 4 |
| Tests pass locally, fail in CI | Missing service (DB), timezone/locale, unpinned dependency versions | Service containers, lock files, pinned versions |
| Deploy "succeeded" but the old version is running | Deployed `:latest` with `IfNotPresent`, or the wrong kube context/namespace | Immutable SHA tags; print context and namespace in logs |

---

## 🎯 Quick-fire interview questions

1. How do you keep secrets out of pipelines? → OIDC federation to Azure; Key Vault-linked variable groups; masked secrets; never echo them; least-privilege identities per environment
2. How do you roll back a deployment? → `helm rollback` / `rollout undo`, or redeploy the previous immutable tag. Then `git revert` the cause
3. How do you prevent a broken build from reaching prod? → Tests + scans as gates, dev/staging promotion, manual approval on prod, `--wait` + auto-rollback, smoke tests, canary
4. What's a self-hosted runner/agent and when do you need one? → A runner you operate. Needed for private network access (private AKS, private endpoints), special hardware, or cost
5. Why pin actions to SHAs? → Tags are mutable. The 2026 Trivy compromise force-pushed existing tags to malware
