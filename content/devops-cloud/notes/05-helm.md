# Helm

> The JD lists "maintain … Helm charts" as a direct responsibility. Expect to read a chart, change values per environment, debug a failed upgrade, and roll back.

---

## 1. Concept — what Helm adds on top of raw YAML

Raw manifests have three problems: **duplication** across environments, **no versioned release unit**, and **no rollback of a group of resources**. Helm solves them with:

- **Chart** — a package of *templated* manifests plus default `values.yaml`
- **Values** — per-environment inputs (`values-dev.yaml`, `values-prod.yaml`, `--set`)
- **Release** — an installed instance of a chart. Helm stores each revision's rendered manifest as a **Secret** (`sh.helm.release.v1.<name>.v<N>`) in the namespace, which is what makes `helm rollback` possible

🎯 **Interview:** *"Where does Helm store release state?"* → In Secrets in the release namespace, one per revision. There's no server-side component (Tiller was removed in Helm 3).

---

## 2. 2026 state: Helm 4

- **Helm 4.0 went GA in November 2025.** Highlights: **server-side apply**, a redesigned plugin system (WebAssembly plugins, post-renderers as plugins), kstatus-based waiting, and reproducible chart builds.
- **Helm 3 timeline:** the last Helm 3 minor release, **v3.22.0**, shipped in September 2026 and bug fixes ended with it; security-only patches continue until **10 Feb 2027**, after which Helm 3 gets no releases at all.
- Existing releases and charts carry over without migration. The breaking changes are mostly **CLI flags**, which silently break CI scripts:

| Helm 3 | Helm 4 |
|---|---|
| `--atomic` | `--rollback-on-failure` |
| `--force` | `--force-replace` (plus a new `--force-conflicts` for SSA field conflicts) |
| `--wait` (on/off) | `--wait` takes a strategy: `watcher`, `hookOnly`, `legacy` |
| Client-side three-way merge | **Server-side apply** by default for new installs |
| `helm version --client` | Removed |

⚠️ **Gotcha:** CI agents may have Helm 3 preinstalled. **Install and pin the Helm version in the pipeline**, or a Helm 4 flag will fail with "unknown flag."

---

## 3. Chart anatomy

```
charts/medilab/
├── Chart.yaml              # name, version (chart), appVersion (app)
├── values.yaml             # defaults
├── values-dev.yaml         # overrides per environment
├── values-prod.yaml
├── templates/
│   ├── _helpers.tpl        # named templates (labels, fullname)
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── httproute.yaml
│   ├── configmap.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   ├── migrate-job.yaml    # pre-upgrade hook
│   └── NOTES.txt           # printed after install
└── .helmignore
```

```yaml
# Chart.yaml
apiVersion: v2
name: medilab
description: medilab-api and worker
type: application
version: 0.3.0          # CHART version — bump when templates change
appVersion: "3f9c2ab"   # APP version — informational (the image tag comes from values)
```

⚠️ **Gotcha — `version` vs `appVersion`:** `version` is the chart's own SemVer (required, must bump for a new chart package). `appVersion` describes the app. Mixing them up is a common interview slip.

---

## 4. 🧪 Templates and values

```yaml
# values.yaml
image:
  repository: medilabacr.azurecr.io/medilab-api
  tag: ""                      # set by CI: --set image.tag=<sha>
  pullPolicy: IfNotPresent
replicaCount: 2
resources:
  requests: { cpu: 250m, memory: 256Mi }
  limits:   { memory: 512Mi }
config:
  LOG_LEVEL: INFO
autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 6
  targetCPU: 70
route:
  hostname: api-dev.medilab.example.com
  gateway: { name: public-gateway, namespace: gateway-system }
```

```yaml
# values-prod.yaml — only what differs
replicaCount: 3
resources:
  requests: { cpu: 500m, memory: 512Mi }
  limits:   { memory: 1Gi }
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
route:
  hostname: api.medilab.example.com
```

```yaml
# templates/_helpers.tpl
{{- define "medilab.fullname" -}}
{{- printf "%s-api" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "medilab.labels" -}}
app.kubernetes.io/name: {{ include "medilab.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Values.image.tag | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "medilab.selectorLabels" -}}
app.kubernetes.io/name: {{ include "medilab.fullname" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
```

```yaml
# templates/deployment.yaml (excerpt)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "medilab.fullname" . }}
  labels:
    {{- include "medilab.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}      # omit when HPA owns replicas!
  {{- end }}
  selector:
    matchLabels:
      {{- include "medilab.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "medilab.selectorLabels" . | nindent 8 }}
      annotations:
        # Changing the ConfigMap changes this hash → pods roll automatically
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ required "image.tag is required" .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          envFrom:
            - configMapRef:
                name: {{ include "medilab.fullname" . }}
```

Template techniques worth naming in an interview:

| Technique | Why |
|---|---|
| `required "msg" .Values.x` | Fail the render if a critical value is missing, instead of deploying `image:` with no tag |
| `nindent` / `toYaml` | Correct indentation (YAML's #1 failure mode) |
| `checksum/config` annotation | Pods restart when config changes |
| Omitting `replicas` when the HPA is on | Otherwise every `helm upgrade` resets the replica count and fights the HPA |
| `selectorLabels` kept separate from `labels` | Selectors are **immutable**. Putting the version label in the selector breaks upgrades |

⚠️ **Gotcha — immutable selector:** if a new chart version changes `spec.selector.matchLabels`, the upgrade fails with *"field is immutable"*. You'd have to delete and recreate the Deployment (downtime), so design selectors once.

---

## 5. Hooks — migrations before the new pods start

```yaml
# templates/migrate-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "medilab.fullname" . }}-migrate
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "0"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  backoffLimit: 1
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          command: ["python", "manage.py", "migrate", "--noinput"]
          envFrom:
            - secretRef: { name: medilab-secrets }
```

⚠️ **Gotcha — `pre-install` hooks and chart-created resources:** on the *first* install, pre-install hooks run **before** the chart's other resources exist. A hook that needs a Secret the chart itself creates will fail. Create secrets outside the chart (Key Vault CSI / External Secrets), or use `post-install` for the first run.

If the hook Job fails, the upgrade fails. With `--rollback-on-failure`, Helm rolls back, so **pods never run code against an un-migrated schema.**

---

## 6. Daily commands

```bash
helm lint charts/medilab -f charts/medilab/values-prod.yaml
helm template medilab charts/medilab -f charts/medilab/values-dev.yaml --set image.tag=abc123 | less   # render locally
helm upgrade --install medilab charts/medilab \
  -n medilab --create-namespace \
  -f charts/medilab/values-dev.yaml \
  --set image.tag="$GIT_SHA" \
  --rollback-on-failure --wait --timeout 10m        # Helm 4 flags
helm list -n medilab
helm status medilab -n medilab
helm history medilab -n medilab
helm rollback medilab 7 -n medilab                  # to revision 7
helm get values medilab -n medilab                  # values actually used
helm get manifest medilab -n medilab                # what was actually applied
helm diff upgrade medilab charts/medilab -f values-prod.yaml   # plugin: preview changes (like terraform plan)
```

`helm upgrade --install` is **idempotent**: it installs if absent and upgrades if present. It's the only form you should use in CI.

### Charts in ACR (OCI registry)

```bash
helm package charts/medilab                      # → medilab-0.3.0.tgz
TOKEN=$(az acr login -n medilabacr --expose-token --query accessToken -o tsv)
helm registry login medilabacr.azurecr.io \
  --username 00000000-0000-0000-0000-000000000000 --password "$TOKEN"
helm push medilab-0.3.0.tgz oci://medilabacr.azurecr.io/helm
helm upgrade --install medilab oci://medilabacr.azurecr.io/helm/medilab --version 0.3.0 ...
```

---

## 7. Troubleshooting failed releases

| Symptom | Cause | Fix |
|---|---|---|
| `another operation (install/upgrade/rollback) is in progress` | A previous run was killed mid-upgrade; the release is stuck in `pending-upgrade` | `helm history` → `helm rollback <name> <last-good-rev>` |
| `UPGRADE FAILED: ... field is immutable` | Changed a selector, a Job spec, or a Service `clusterIP` | Don't change immutable fields. Rename the resource or delete and recreate deliberately |
| `rendered manifests contain a resource that already exists` | The resource was created outside Helm (`kubectl apply`) | Delete it, or adopt it by adding Helm ownership labels/annotations |
| Upgrade "succeeds" but pods are broken | No `--wait`, so Helm returned as soon as the objects were accepted | Always use `--wait` + `--rollback-on-failure` in CI |
| Values not applied | Wrong file order or a typo in a key path | `helm get values`; later `-f` files override earlier ones, and `--set` overrides all |
| SSA conflict errors (Helm 4) | Another manager (kubectl, HPA, an operator) owns that field | Stop the other writer, or `--force-conflicts` deliberately |

---

## 8. Helm vs Kustomize vs plain YAML

| | Plain YAML | Kustomize | Helm |
|---|---|---|---|
| Templating | None | None (patches and overlays) | Go templates |
| Per-env config | Copy files | `base/` + `overlays/dev,prod` | Values files |
| Packaging and versioning | ❌ | ❌ | ✅ Chart versions, OCI registries |
| Release history and rollback | ❌ | ❌ | ✅ |
| Third-party software (Prometheus, cert-manager) | Painful | Possible | ✅ The ecosystem standard |
| Built into kubectl | ✅ | ✅ `kubectl apply -k` | ❌ Separate binary |
| Downsides | Duplication | Complex patches get hard to read | Templates can become unreadable; YAML-in-Go-templates |

🎯 **Interview answer:** "Helm for packaging and installing third-party software and for our own apps with multiple environments. Kustomize when you only need small environment overlays on plain YAML. Many teams combine them: Helm renders, Kustomize patches (via a post-renderer)."

---

## 🎯 Quick-fire interview questions

1. How do you roll back a bad Helm release? → `helm history` → `helm rollback <release> <rev>` (or automatically with `--rollback-on-failure`)
2. How do you pass secrets to a chart? → Ideally you don't. The chart references a Secret synced from Key Vault. `--set password=` ends up in the release Secret and in shell history.
3. What's the difference between `helm install` and `helm upgrade --install`? → The latter is idempotent, so it's the one for CI.
4. How do you preview changes? → `helm template` (render), `helm diff` (plugin), or `--dry-run=server`
5. What changed in Helm 4 that affects CI? → Server-side apply and renamed flags (`--rollback-on-failure`, `--force-replace`, `--wait` strategies)
