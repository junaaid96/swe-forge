# Troubleshooting Runbooks

> DevOps interviews often include hands-on or scenario tasks. Interviewers judge your **method** more than recall. Practise these out loud with a timer: **5 minutes per scenario.**

---

## 0. The method (say it before you touch anything)

1. **Clarify impact:** who is affected, since when, is it all users or some, is data at risk?
2. **What changed?** Deploys, config, infrastructure, certificates, traffic, dependencies. (*Most incidents follow a change.*)
3. **Work layer by layer, outside in:** DNS → network → TLS → load balancer/gateway → service → pod → app → dependency (DB/cache/external API)
4. **Form a hypothesis → test it with ONE command → narrow down**
5. **Mitigate first** (rollback, scale, failover), then find the root cause
6. **Verify the fix** with the same signal that showed the problem
7. **Write it down:** timeline, cause, follow-up actions

🎯 Narrating this structure out loud, even before the first command, is often worth more than getting the answer fast.

---

## Runbook 1 — "The site is down"

```bash
dig +short api.medilab.example.com                    # DNS resolves? to the expected IP?
curl -sv https://api.medilab.example.com/healthz -o /dev/null 2>&1 | grep -E "Connected|HTTP/|SSL|expire"
kubectl get gateway,httproute -A                      # gateway programmed? route accepted?
kubectl get pods -n medilab -o wide                   # pods Running AND Ready?
kubectl get endpointslices -n medilab                 # service has endpoints?
kubectl logs deploy/medilab-api -n medilab --tail=50
helm history medilab -n medilab | tail -3             # recent deploy?
```

| Finding | Next step |
|---|---|
| DNS doesn't resolve / wrong IP | DNS record, TTL, recent DNS change, private vs public zone |
| `Connection timed out` | NSG/firewall, LB health probe failing, wrong public IP |
| TLS error | Expired or mismatched certificate (§ Runbook 9) |
| 502 / 503 / 504 | See the table in Runbook 3 |
| A recent deploy correlates | **Roll back first** (`helm rollback`), investigate after |

---

## Runbook 2 — Pod won't start

| Status | Command | Common causes → fixes |
|---|---|---|
| `Pending` | `kubectl describe pod` → Events: `Insufficient cpu/memory`, `untolerated taint`, `unbound PVC` | Lower the requests / add nodes (autoscaler) / add a toleration / fix the StorageClass or zone |
| `ImagePullBackOff` | Events: `not found` / `unauthorized` / `no match for platform` | Wrong tag → fix; missing **AcrPull** → `az aks update --attach-acr`; arm64 image → rebuild with `--platform linux/amd64` |
| `CrashLoopBackOff` | `kubectl logs <pod> --previous` | Missing env/secret, wrong command, DB unreachable at boot, migration not run, config typo |
| `CreateContainerConfigError` | Events: `secret "x" not found` / `key "y" not found` | Create the Secret/ConfigMap or fix the key name; check the CSI sync |
| `OOMKilled` | `describe` → Last State: `OOMKilled`, exit 137 | Raise the memory limit to real usage + headroom; look for leaks (`kubectl top`, Prometheus) |
| `Running` but `0/1` Ready | `describe` → `Readiness probe failed: ...` | Wrong path/port, the app listens on 127.0.0.1, a dependency check in readiness is failing |
| `Init:CrashLoopBackOff` | `kubectl logs <pod> -c <init-container>` | The init step (wait-for-db, migrations) is failing |

---

## Runbook 3 — Gateway returns 502 / 503 / 504

| Code | Gateway is telling you… | Check |
|---|---|---|
| **502** | "I reached a backend, but the connection failed or the response was invalid" | App crashed mid-request; wrong `targetPort`; the app speaks HTTP but the gateway expects HTTPS (or vice versa); keep-alive timeout mismatch |
| **503** | "I have **no healthy backend**" | No Ready pods; Service **selector mismatch** (0 endpoints); all pods failing readiness; a rollout stalled |
| **504** | "The backend **took too long**" | Slow DB queries; gunicorn `--timeout` or worker starvation; downstream API slow; CPU throttling |

```bash
kubectl get endpointslices -l kubernetes.io/service-name=medilab-api -n medilab   # empty = 503
kubectl get svc medilab-api -n medilab -o yaml | grep -A5 -E "selector|ports"
kubectl get pods -n medilab --show-labels                                         # compare labels to selector
kubectl port-forward svc/medilab-api 8080:80 -n medilab & curl -i localhost:8080/healthz   # bypass the gateway
```

If port-forward works but the gateway doesn't → the problem is the route, gateway, or NetworkPolicy. If port-forward also fails → the problem is the Service or the app.

---

## Runbook 4 — Slow responses (high p95)

1. **Scope:** all endpoints or one? All pods or one? (Prometheus by `route` and `pod`)
2. **Saturation:** `kubectl top pods`, CPU throttling (`container_cpu_cfs_throttled_periods_total`), memory near limit, HPA at max replicas?
3. **Dependencies:** DB query latency (Postgres `pg_stat_statements`, Azure Query Performance Insight), Redis latency, external APIs. **Traces** show which span is slow
4. **Recent change?** A new N+1 query in a Django view is a classic
5. **Mitigate:** scale out (if CPU-bound and the DB can take it), roll back, add a cache, move heavy work to Celery

🏥 Example: a PDF report generated synchronously in the request path → move it to the worker and return 202 + a polling/notification flow.

---

## Runbook 5 — Database connection errors ("too many connections")

**The math that causes it:**
`pods × gunicorn workers × (connections per worker)` + `celery workers × concurrency` + migrations and admin tools > Postgres `max_connections`.

Scaling the API from 3 to 10 pods (HPA!) can **triple the connections** and exhaust a small Flexible Server SKU.

| Fix | Notes |
|---|---|
| **Connection pooling** (PgBouncer) | Azure Database for PostgreSQL Flexible Server has a **built-in PgBouncer** (port 6432) |
| Right-size `CONN_MAX_AGE` / pool sizes | Persistent connections × many workers adds up |
| Cap `maxReplicas` in the HPA with the DB in mind | Autoscaling the app can DDoS your own DB |
| A bigger SKU | Raises the connection limit, but costs more |

```sql
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
SELECT usename, application_name, count(*) FROM pg_stat_activity GROUP BY 1,2 ORDER BY 3 DESC;
```

Private-endpoint variant: `could not translate host name` / timeouts right after enabling a private endpoint → **Private DNS zone** not linked to the VNet (see [Networking](./02-networking.md) §3).

---

## Runbook 6 — DNS inside the cluster

```bash
kubectl run -it --rm dnstest --image=busybox:1.36 --restart=Never -n medilab -- nslookup medilab-api
kubectl run -it --rm dnstest --image=busybox:1.36 --restart=Never -n medilab -- nslookup google.com
kubectl get pods -n kube-system -l k8s-app=kube-dns          # CoreDNS pods healthy?
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

| Symptom | Cause |
|---|---|
| Internal names fail from `medilab` only | NetworkPolicy blocks egress to port 53 |
| All lookups fail cluster-wide | CoreDNS down or crashlooping; CoreDNS config broken |
| External names fail, internal work | Upstream DNS / VNet DNS settings (custom DNS server on the VNet) |
| Intermittent slow lookups | CoreDNS overloaded; the `ndots:5` search-domain effect (many wasted queries for external names) |

---

## Runbook 7 — VM: disk full / high load / can't SSH

**Disk full:**
```bash
df -h; df -i
sudo du -xh / --max-depth=2 2>/dev/null | sort -h | tail -20
sudo lsof +L1                                    # deleted-but-open files
sudo journalctl --vacuum-size=500M
docker system df && docker system prune -af      # if Docker is the hog (⚠️ removes unused images)
```
Then prevent it: logrotate, a disk alert with `predict_linear`, and a bigger disk or cleanup timer.

**High load:** `uptime` → `top` (CPU% vs `wa`) → `iostat -x 1` (disk) → `free -h` + `dmesg -T | grep -i oom` → the app.

**Can't SSH to an Azure VM:**

| Check | How |
|---|---|
| Is the VM running? | `az vm get-instance-view -g RG -n VM --query instanceView.statuses[1]` |
| NSG allows 22 from *your* IP? | `az network nsg rule list ...`; Network Watcher **IP flow verify** |
| Public IP exists, or are you using Bastion? | |
| Right key / user / permissions? | `ssh -v`; key must be `chmod 600` |
| Guest OS broken (full disk, sshd config)? | **Serial console**, **Run Command** (`az vm run-command invoke`), boot diagnostics |

---

## Runbook 8 — CI/CD pipeline failures

| Where it fails | Typical cause | Fix |
|---|---|---|
| Azure login (OIDC) | Federated credential subject ≠ the run's branch/environment; missing `id-token: write` | Align the subject; add the permission |
| `docker push` unauthorized | Not logged in, wrong ACR name, identity lacks **AcrPush** | `az acr login -n`; role assignment |
| Tests only fail in CI | Missing service container, env differences, unpinned dependencies, timezone | Service containers, lock files, `TZ=UTC` |
| Helm: `unknown flag` | Helm 3 on the agent, Helm 4 flags in the script | Pin the Helm version in the pipeline |
| Helm: `another operation is in progress` | A previous run died mid-upgrade | `helm history` → `helm rollback` to the last good revision |
| Helm: `field is immutable` | Selector/Job spec changed | Don't change selectors; unique Job names or hooks with delete policies |
| Deploy "green", old version live | Mutable tag, wrong context/namespace, HPA/replicas confusion | SHA tags; print `kubectl config current-context` in the job |

---

## Runbook 9 — TLS certificate problems

```bash
echo | openssl s_client -connect api.medilab.example.com:443 -servername api.medilab.example.com 2>/dev/null \
  | openssl x509 -noout -dates -subject -ext subjectAltName
kubectl get certificate -A                  # cert-manager: READY column
kubectl describe certificate medilab-tls -n medilab
kubectl get challenges,orders -A            # stuck ACME challenges
```

| Error | Cause |
|---|---|
| `certificate has expired` | Renewal failed (ACME challenge blocked by NSG/WAF/DNS) or it was a manual certificate |
| `hostname mismatch` | SAN doesn't include the requested name |
| `unable to get local issuer certificate` | Incomplete chain (missing intermediate) |
| Works in the browser, fails in `curl`/Python | The browser cached the intermediate; the server isn't sending the full chain |

---

## Runbook 10 — Terraform errors

| Error | Meaning | Fix |
|---|---|---|
| `Error acquiring the state lock` | Another run holds the blob lease, or a crashed run left it | Confirm nobody is running → `terraform force-unlock <ID>` |
| `A resource with the ID ... already exists` | Created outside Terraform (or state was lost) | `import` block → plan → apply |
| `subscription_id is a required provider property` | azurerm ≥ 4.0 | Set `subscription_id` or `ARM_SUBSCRIPTION_ID` |
| Plan shows `-/+ destroy and then create replacement` | A **ForceNew** attribute changed (name, location, some SKUs) | Stop. Avoid the change, or plan a migration; `prevent_destroy` on critical resources |
| `AuthorizationFailed` | The identity lacks a role at that scope (often *role assignments* need Owner or User Access Administrator) | Grant the minimum needed; don't jump to Owner |
| Provider hash mismatch on CI | Lock file only has darwin_arm64 hashes | `terraform providers lock -platform=linux_amd64 -platform=darwin_arm64` |
| Plan wants to revert someone's portal change | **Drift** | Codify it or accept the revert. Talk to whoever changed it |

---

## Runbook 11 — "It works in staging, not in prod"

Diff the environments systematically:
- **Config:** `helm get values` in both; ConfigMaps; feature flags
- **Secrets:** present? right keys? (never print values; compare key names)
- **Image:** is the digest actually the same? (`kubectl get pod -o jsonpath='{..imageID}'`)
- **Infra:** network rules, private endpoints and DNS, SKU limits (connections, throughput)
- **Data:** volume/shape of prod data (a query fine on 1k rows dies on 10M), migrations applied?
- **Traffic:** load and concurrency levels; rate limits of external providers

---

## 🧪 Drill sheet — practise with a timer

| # | Break it like this (kind cluster) | Expected symptom |
|---|---|---|
| 1 | `image: medilab-api:doesnotexist` | ImagePullBackOff |
| 2 | Remove `DATABASE_URL` from the Secret | CrashLoopBackOff |
| 3 | `limits.memory: 32Mi` | OOMKilled |
| 4 | Service selector `app: medilab-apii` | 503 / no endpoints |
| 5 | Readiness path `/wrong` | 0/1 Ready, rollout stalls |
| 6 | `requests.cpu: "64"` | Pending |
| 7 | Default-deny NetworkPolicy without a DNS allow (needs a policy-enforcing CNI, e.g., Calico on kind) | Name resolution fails |
| 8 | Reference a ConfigMap that doesn't exist | CreateContainerConfigError |

For each one, say out loud: **symptom → command → evidence → fix → how to prevent it.**
