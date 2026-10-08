# 10 · Observability, Alerting & Incident Response

> "Monitor applications and infrastructure, investigate alerts, and support incident resolution." At associate level you'll be the first person looking at an alert. You need to know **where the signal comes from, what it means, and what to do next.**

---

## 1. Monitoring vs observability

| | Monitoring | Observability |
|---|---|---|
| Answers | "Is it broken?" — the **known** failure modes | "**Why** is it broken?" — including failures nobody predicted |
| Approach | Dashboards and threshold alerts on chosen metrics | High-cardinality telemetry you can slice and correlate |
| Built from | Metrics | Metrics + logs + traces, correlated |

### The telemetry signals

| Signal | What | Strength | Weakness | Tools |
|---|---|---|---|---|
| **Metrics** | Numeric time series (`requests_total`, CPU) | Cheap, fast, great for alerts and trends | Little context | Prometheus, Azure Monitor Metrics |
| **Logs** | Timestamped events/text | Rich detail | Expensive at volume; hard to aggregate | Loki, ELK, Log Analytics |
| **Traces** | One request's path across services (spans) | Shows *where* latency or errors happen | Instrumentation effort; sampling | OpenTelemetry → Tempo/Jaeger/App Insights |
| **Profiles** | CPU/memory per function over time | Finds the code-level cause | Newer tooling | Pyroscope, Parca |

**OpenTelemetry (OTel)** is the vendor-neutral standard (SDKs + Collector) for emitting all of these. Instrument once and send anywhere. Django and Express have auto-instrumentation.

🎯 **Interview:** *"How do you correlate a log line with a trace?"* → Inject the **trace ID** into structured logs (OTel does this). From a slow trace you jump to that request's logs.

---

## 2. What to measure — three frameworks

| Framework | For | Signals |
|---|---|---|
| **Four Golden Signals** (Google SRE) | User-facing services | **Latency, Traffic, Errors, Saturation** |
| **RED** | Request-driven services (medilab-api) | **Rate, Errors, Duration** |
| **USE** | Resources (nodes, disks, DB) | **Utilization, Saturation, Errors** |

⚠️ **Gotcha — averages lie:** alert on **percentiles** (p95/p99 latency), not the mean. A 200 ms average can hide 5% of patients waiting 8 seconds for their report.

---

## 3. Prometheus — how it works

```
 targets expose /metrics  ◄── Prometheus SCRAPES (pull) every 15–30 s ──► TSDB (local time series)
 (app, node-exporter,                     │
  kube-state-metrics)                     ├── evaluates recording + alerting rules
                                          │           │
                                   Grafana (queries)  └──► Alertmanager → dedupe, group, route → Slack/Teams/PagerDuty/email
```

- **Pull model:** Prometheus scrapes targets. Service discovery finds pods through the Kubernetes API (with **ServiceMonitor/PodMonitor** CRDs via the Prometheus Operator).
- **Metric types:** **counter** (only goes up: `http_requests_total`), **gauge** (up/down: memory in use), **histogram** (buckets → percentiles), summary.
- ⚠️ **High cardinality** (a label per user ID or order ID) explodes memory. Labels should have bounded values (method, status, route template).

**The three exporters people confuse:**

| Component | Exposes | Used by |
|---|---|---|
| **metrics-server** | Current CPU/memory per pod/node (in memory, **not** Prometheus format) | `kubectl top`, **HPA** |
| **node-exporter** (DaemonSet) | **Node/OS** metrics: CPU, memory, disk, filesystem, network | Prometheus (USE on nodes) |
| **kube-state-metrics** | The **state of K8s objects**: desired vs available replicas, pod phase, restarts, container status reasons | Prometheus ("is the Deployment healthy?") |

🧪 **Install the standard stack:**

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
```

On Azure, the managed alternative is **Azure Monitor managed service for Prometheus + Azure Managed Grafana**: you don't operate Prometheus storage or HA yourself.

### PromQL you should be able to write

```promql
# Request rate (per second) over 5 min, by status code
sum by (status) (rate(http_requests_total{namespace="medilab"}[5m]))

# Error ratio (5xx / all)
sum(rate(http_requests_total{namespace="medilab", status=~"5.."}[5m]))
/
sum(rate(http_requests_total{namespace="medilab"}[5m]))

# p95 latency from a histogram
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket{namespace="medilab"}[5m])))

# Pods restarting in the last 15 minutes (kube-state-metrics)
increase(kube_pod_container_status_restarts_total{namespace="medilab"}[15m]) > 0

# Container memory as % of its limit (close to 100% → OOMKilled soon)
max by (pod) (container_memory_working_set_bytes{namespace="medilab", container="api"})
/
max by (pod) (kube_pod_container_resource_limits{namespace="medilab", container="api", resource="memory"})

# Node disk will fill within 4 hours (predictive)
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4 * 3600) < 0
```

⚠️ **Gotcha:** always `rate()` a counter before summing or graphing it. A raw counter just climbs and resets on restart. `rate()` handles the resets.

*(Metric names depend on your instrumentation library, e.g. `django-prometheus` or OTel. Check your app's `/metrics` for the exact names.)*

---

## 4. 🧪 Alert rules for medilab

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: medilab-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack          # must match the operator's rule selector
spec:
  groups:
    - name: medilab.rules
      rules:
        - alert: MedilabHighErrorRate
          expr: |
            sum(rate(http_requests_total{namespace="medilab", status=~"5.."}[5m]))
            / sum(rate(http_requests_total{namespace="medilab"}[5m])) > 0.05
          for: 10m                               # must persist → fewer flappy pages
          labels: { severity: page }
          annotations:
            summary: "medilab-api 5xx ratio above 5% for 10m"
            runbook_url: "https://prepshelf.local/devops/13-troubleshooting-runbooks"
        - alert: MedilabPodCrashLooping
          expr: increase(kube_pod_container_status_restarts_total{namespace="medilab"}[15m]) > 3
          for: 5m
          labels: { severity: ticket }
          annotations:
            summary: "{{ $labels.pod }} restarted >3 times in 15m"
        - alert: MedilabHighLatencyP95
          expr: |
            histogram_quantile(0.95, sum by (le)
              (rate(http_request_duration_seconds_bucket{namespace="medilab"}[5m]))) > 1
          for: 15m
          labels: { severity: ticket }
```

### Alerting principles

| Principle | Meaning |
|---|---|
| **Alert on symptoms, not causes** | Page on "users see errors/latency", not on "CPU 80%" (high CPU with happy users is fine) |
| **Every page is actionable** | If the responder can't do anything, it's a dashboard or a ticket, not a page |
| **Use `for:`** | Avoid paging on 30-second blips |
| **Severity routing** | `page` (wake someone) vs `ticket` (fix in work hours) |
| **Link a runbook** | Every alert says what to check first |
| **Fight alert fatigue** | Noisy alerts get ignored, and then the real one is missed too |

---

## 5. SLI, SLO, SLA, error budgets

| Term | Definition | medilab example |
|---|---|---|
| **SLI** (indicator) | A measured ratio of good events | % of report-download requests that succeed in < 1 s |
| **SLO** (objective) | Your internal target for the SLI | 99.5% over 30 days |
| **SLA** (agreement) | A contractual promise with penalties (looser than the SLO) | 99% monthly, or service credits |
| **Error budget** | 100% − SLO = allowed unreliability | 0.5% of 30 days ≈ **3.6 hours** |

**How the error budget is used:** budget remaining → ship features faster. Budget burned → freeze risky releases and prioritise reliability work. It turns "dev vs ops" arguments into a number both sides agree on.

Availability math to know: 99.9% ≈ 43.8 min/month · 99.95% ≈ 21.9 min/month · 99.99% ≈ 4.4 min/month.

---

## 6. Logs — structured and centralised

✅ Log **JSON to stdout** with consistent fields:

```json
{"ts":"2026-09-23T10:02:11Z","level":"ERROR","service":"medilab-api","trace_id":"4bf9...","route":"/orders/{id}","status":500,"duration_ms":1840,"msg":"db timeout"}
```

🏥 ⚠️ **Never log PHI** (patient names, test results, national IDs) or secrets. Log IDs, not content. Put a redaction layer in the logging config.

**KQL (Log Analytics / Container Insights):**

```kusto
// Errors per pod over the last hour, 5-minute buckets
ContainerLogV2
| where TimeGenerated > ago(1h)
| where PodNamespace == "medilab"
| where LogMessage has "ERROR"
| summarize errors = count() by bin(TimeGenerated, 5m), PodName
| order by TimeGenerated desc

// Pods that restarted recently
KubePodInventory
| where TimeGenerated > ago(30m) and Namespace == "medilab"
| summarize maxRestarts = max(ContainerRestartCount) by Name
| where maxRestarts > 0

// Who deleted what (control plane audit)
AzureActivity
| where OperationNameValue endswith "DELETE"
| project TimeGenerated, Caller, ResourceGroup, _ResourceId
```

| Log stack | Notes |
|---|---|
| **Log Analytics (KQL)** | Native on Azure; Container Insights feeds it; can get pricey at volume, so use basic logs and filtering |
| **Loki + Grafana** | Indexes labels only, so it's cheap; pairs naturally with Prometheus |
| **ELK/OpenSearch** | Full-text indexing; powerful; heavier to run |

---

## 7. Incident response — the process

**Lifecycle:** Detect → Triage (severity) → Mitigate → Resolve → Postmortem → Follow-up actions

| Severity | Example | Response |
|---|---|---|
| **SEV1** | Report delivery down for all labs; data exposure | All hands, status page, leadership informed |
| **SEV2** | Degraded: slow, or one feature broken | On-call + owner team |
| **SEV3** | Minor, a workaround exists | Ticket |

**Roles in a bigger incident:** Incident Commander (coordinates, decides), Ops/Tech lead (hands on keyboard), Communications (stakeholders, status page), Scribe (timeline).

**Mitigate first, root-cause later:** roll back, scale up, fail over, or disable a feature flag. Restore service, *then* investigate. The most common and most effective mitigation: **"what changed recently? → roll it back."**

🎯 **Interview — how an associate should answer "an alert fires at 2 a.m.":**
1. Acknowledge the alert so others know someone has it
2. Check impact: is it user-facing? how many? (dashboards, error rate)
3. Check recent changes: deploys, config, infra (pipeline history, `helm history`, Activity Log)
4. Follow the runbook linked in the alert
5. Mitigate (a rollback is usually safest). Escalate early if it's beyond your access or knowledge. Escalating is not failure
6. Communicate status on a regular cadence
7. Afterwards: timeline + postmortem

---

## 8. Blameless postmortem template

```markdown
# Postmortem: medilab report downloads failing — 2026-09-20

**Severity:** SEV2 · **Duration:** 10:05–10:47 (42 min) · **Author:** … · **Status:** Actions in progress

## Summary
Two sentences: what broke, who was affected, how it was fixed.

## Impact
~18% of report downloads returned 504 for 42 minutes; no data loss; 3 labs affected.

## Timeline (UTC+6)
- 09:58 Deploy v1.4.2 (added PDF watermarking)
- 10:05 Alert MedilabHighErrorRate fired
- 10:12 On-call acknowledged; saw p95 latency 9s on /reports/*
- 10:31 Identified: watermarking synchronous in request path, CPU-throttled
- 10:40 helm rollback to rev 17
- 10:47 Error rate normal

## Root cause (and contributing factors)
Why it happened — and why our safeguards didn't catch it (no load test; canary not used).

## What went well / what went poorly / where we got lucky

## Action items
| Action | Owner | Due |
|---|---|---|
| Move watermarking to Celery worker | dev | 09-30 |
| Add p95 latency gate to canary analysis | devops | 10-05 |
```

**Blameless** = focus on systems and process ("the pipeline allowed X"), not on people ("Rahim did X"). Otherwise people hide mistakes, and you lose the information you need to improve.

---

## 🎯 Quick-fire interview questions

1. Difference between metrics-server and Prometheus? → metrics-server holds a short-lived current snapshot for HPA and `kubectl top`. Prometheus stores history and powers alerting and dashboards
2. What would you alert on for a web API? → Error ratio, p95/p99 latency, availability (probe), saturation (pods near their memory limit), plus certificate expiry and disk fill prediction
3. MTTR vs MTTD? → Mean time to *recover* vs to *detect*. Good alerting lowers MTTD; runbooks and rollback lower MTTR
4. Why use `for:` in alert rules? → The condition must persist, which reduces noise from blips
5. What is an error budget? → The allowed unreliability under the SLO; it governs the pace of releases
