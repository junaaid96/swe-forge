# 05 · Kubernetes

> The JD says "exposure to Kubernetes" for associate level. In practice you'll be asked to **read manifests, deploy, and debug**. Architecture questions show depth, but debugging skill gets you hired.

---

## 1. Architecture — the control loop mindset

**Core idea:** you declare **desired state** (YAML) and store it in the API server. **Controllers** run reconciliation loops that constantly compare actual state to desired state and act to close the gap. Kubernetes is a database of intentions plus a set of robots.

```
                 CONTROL PLANE                                 WORKER NODE (×N)
┌──────────────────────────────────────────┐        ┌───────────────────────────────┐
│ kube-apiserver  ← the only thing that    │◄──────►│ kubelet   (runs pods, reports) │
│                   talks to etcd          │        │ kube-proxy (Service rules)     │
│ etcd            ← key-value store of     │        │ containerd (container runtime) │
│                   all cluster state      │        │ CNI plugin (pod networking)    │
│ kube-scheduler  ← picks a node per pod   │        └───────────────────────────────┘
│ controller-manager ← Deployment, RS,     │
│                   Node, Job controllers  │
│ cloud-controller-manager ← LBs, disks    │
└──────────────────────────────────────────┘
```

On **AKS**, Microsoft runs and manages the control plane. You manage node pools and workloads.

### What happens on `kubectl apply -f deployment.yaml`

1. `kubectl` sends the object to the **API server**
2. API server: **authentication** → **authorization (RBAC)** → **admission controllers** (mutating, then validating, e.g. Pod Security) → persisted to **etcd**
3. The **Deployment controller** sees a new Deployment → creates a **ReplicaSet**
4. The **ReplicaSet controller** sees it wants 3 pods and has 0 → creates 3 **Pod** objects (no node yet)
5. The **scheduler** sees unscheduled pods → filters nodes (resources, taints, affinity) → scores them → binds each pod to a node
6. The **kubelet** on that node sees a pod assigned to it → asks **containerd** to pull the image and start the containers → the CNI assigns a pod IP → probes start
7. When the **readiness** probe passes, the pod's IP is added to the Service's **EndpointSlice** → **kube-proxy** updates the node rules → traffic flows

🎯 **Interview:** walking through these 7 steps is one of the strongest answers you can give to "explain Kubernetes."

---

## 2. Workload types

| Object | What it manages | Use for | medilab example |
|---|---|---|---|
| **Pod** | 1+ containers sharing network and volumes | Never directly in prod (no self-healing) | — |
| **ReplicaSet** | N identical pods | Managed by a Deployment; rarely created directly | — |
| **Deployment** | ReplicaSets + rolling updates + rollback | **Stateless apps** | `medilab-api`, `medilab-worker` |
| **StatefulSet** | Pods with **stable names** (`db-0`, `db-1`), stable per-pod storage, ordered start/stop | Databases, Kafka, anything with identity | Redis if self-hosted (prefer managed services) |
| **DaemonSet** | One pod **per node** | Log shippers, node exporters, CNI agents | Monitoring agents |
| **Job** | Pods that run **to completion** | Migrations, one-off tasks | `manage.py migrate` |
| **CronJob** | Jobs on a schedule | Periodic tasks | Nightly cleanup of expired report links |

🎯 **Interview:** *"Deployment vs StatefulSet?"* → A Deployment's pods are interchangeable (random names, shared or no storage, any order). A StatefulSet gives stable identity, per-pod PVCs via `volumeClaimTemplates`, and ordered rollout. Needed when replicas are *not* interchangeable.

---

## 3. Services — stable networking for changing pods

Pods die and get new IPs. A **Service** gives a stable virtual IP and DNS name, and load-balances to pods matching its **label selector**.

| Type | Reachable from | How | Use |
|---|---|---|---|
| **ClusterIP** (default) | Inside the cluster | Virtual IP + DNS `svc.ns.svc.cluster.local` | Internal service-to-service |
| **NodePort** | `<any-node-ip>:30000-32767` | Opens a port on every node | Rarely in cloud; debugging |
| **LoadBalancer** | Internet or VNet | The cloud provisions an LB (Azure Load Balancer) | Exposing a gateway/ingress controller |
| **Headless** (`clusterIP: None`) | Inside the cluster | DNS returns the pod IPs directly, no VIP | StatefulSets, client-side load balancing |
| **ExternalName** | Inside the cluster | CNAME to an external name | Aliasing an external DB |

⚠️ **Gotcha — selector mismatch:** if the Service selector doesn't match the pod labels *exactly*, the Service has **no endpoints** → 503s. Check with `kubectl get endpointslices -l kubernetes.io/service-name=medilab-api -n medilab`.

⚠️ **Gotcha — `port` vs `targetPort`:** `port` is what the Service listens on; `targetPort` is the container port. Getting these wrong causes 502s or connection refused.

---

## 4. Ingress vs Gateway API — IMPORTANT 2026 update

**Ingress** = an L7 routing object (host/path → Service), implemented by an *Ingress controller*.

⚠️ **Current state:** the community **ingress-nginx** controller was **retired**. Best-effort maintenance ended **March 2026**, with no further releases or security fixes. Existing installs keep working, but it's an unpatched internet-facing component. The Kubernetes project recommends **Gateway API**.

| | Ingress | Gateway API |
|---|---|---|
| Objects | `Ingress` (+ a controller) | `GatewayClass` → `Gateway` (infra/platform team) → `HTTPRoute` (app team) |
| Role separation | One object mixes infra and app concerns | Split by role: platform owns the Gateway, apps own routes |
| Advanced routing | Via vendor-specific **annotations** (not portable) | Native: header matching, traffic splitting (canary weights), redirects |
| Protocols | HTTP(S) | HTTP, gRPC, TCP, UDP, TLS routes |
| Status | Stable, but frozen API | The actively developed successor |

🧪 **medilab HTTPRoute (Gateway API):**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: medilab-api
  namespace: medilab
spec:
  parentRefs:
    - name: public-gateway          # owned by the platform team
      namespace: gateway-system
  hostnames: ["api.medilab.example.com"]
  rules:
    - matches:
        - path: { type: PathPrefix, value: / }
      backendRefs:
        - name: medilab-api
          port: 80
          weight: 90                # canary: 90% stable
        - name: medilab-api-canary
          port: 80
          weight: 10                # 10% new version
```

🎯 **Interview:** mentioning the ingress-nginx retirement and Gateway API unprompted shows you follow the ecosystem, and AKS has a documented migration path to its Gateway API implementation.

---

## 5. Configuration: ConfigMaps and Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: medilab-config, namespace: medilab }
data:
  DJANGO_ALLOWED_HOSTS: "api.medilab.example.com"
  REPORT_BUCKET: "reports"
  LOG_LEVEL: "INFO"
```

⚠️ **Gotcha — Secrets are base64, NOT encrypted:** anyone who can `get secrets` in the namespace can read them. Protect them with RBAC, encryption at rest for etcd (AKS encrypts etcd; KMS integration adds your own key), and ideally keep the source of truth in **Key Vault** via the CSI driver (see [11-security](../devops-cloud/10-security.md)).

⚠️ **Gotcha — env vars don't hot-reload:** changing a ConfigMap does **not** restart pods using `envFrom`. Roll them (`kubectl rollout restart deploy/medilab-api`) or use the Helm checksum-annotation trick ([06-helm](../devops-cloud/05-helm.md)). Mounted-as-file ConfigMaps *do* update eventually, but your app must re-read them.

---

## 6. 🧪 The full medilab-api Deployment (every field is interview material)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: medilab-api
  namespace: medilab
  labels: { app.kubernetes.io/name: medilab-api }
spec:
  replicas: 3
  revisionHistoryLimit: 5                 # how many old ReplicaSets to keep for rollback
  selector:
    matchLabels: { app.kubernetes.io/name: medilab-api }   # immutable after creation!
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1                         # at most 1 extra pod during rollout
      maxUnavailable: 0                   # never drop below desired capacity
  template:
    metadata:
      labels: { app.kubernetes.io/name: medilab-api }
    spec:
      serviceAccountName: medilab-api
      terminationGracePeriodSeconds: 40   # > gunicorn graceful timeout
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        fsGroup: 10001
        seccompProfile: { type: RuntimeDefault }
      containers:
        - name: api
          image: medilabacr.azurecr.io/medilab-api:3f9c2ab   # immutable SHA tag
          ports:
            - { name: http, containerPort: 8000 }
          envFrom:
            - configMapRef: { name: medilab-config }
            - secretRef:    { name: medilab-secrets }
          resources:
            requests: { cpu: 250m, memory: 256Mi }   # what the scheduler reserves
            limits:   { memory: 512Mi }              # hard cap → OOMKilled above this
          startupProbe:                    # gives slow boots time; disables other probes until it passes
            httpGet: { path: /healthz, port: http }
            periodSeconds: 2
            failureThreshold: 30           # up to 60 s to start
          readinessProbe:                  # "send me traffic?" — failing removes pod from endpoints
            httpGet: { path: /readyz, port: http }
            periodSeconds: 5
          livenessProbe:                   # "am I stuck?" — failing RESTARTS the container
            httpGet: { path: /healthz, port: http }
            periodSeconds: 10
            failureThreshold: 3
          lifecycle:
            preStop:
              exec: { command: ["sleep", "5"] }   # let endpoint removal propagate before SIGTERM
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: ["ALL"] }
          volumeMounts:
            - { name: tmp, mountPath: /tmp }      # writable scratch for gunicorn
      volumes:
        - name: tmp
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata: { name: medilab-api, namespace: medilab }
spec:
  selector: { app.kubernetes.io/name: medilab-api }
  ports:
    - { name: http, port: 80, targetPort: http }
```

### Probes — the most misunderstood part

| Probe | Question it answers | On failure | Common mistake |
|---|---|---|---|
| **startup** | "Has the app finished booting?" | Keeps waiting until `failureThreshold`, then restarts | Not using one, so liveness kills slow-starting apps |
| **readiness** | "Can I take traffic *right now*?" | Removed from Service endpoints (**no restart**) | Missing → traffic hits pods that are still warming up |
| **liveness** | "Is the process wedged?" | **Container restarted** | ❌ Checking the **database** in liveness: when the DB blips, *every* pod restarts at once and turns a DB hiccup into a full outage |

✅ **Rule:** liveness checks *only the process itself* (cheap `/healthz`). Readiness may check critical dependencies (`/readyz` checks DB connectivity), because failing it only pauses traffic.

### Requests, limits, and QoS

- **Request** = what the scheduler *reserves* on a node. Used for placement and HPA percentages.
- **Limit** = the hard ceiling. **Memory over the limit → OOMKilled.** **CPU over the limit → throttled** (slowed down, not killed).

| QoS class | Condition | Eviction order under node pressure |
|---|---|---|
| **Guaranteed** | requests == limits for CPU and memory, on every container | Last |
| **Burstable** | Some requests set, not equal to limits | Middle |
| **BestEffort** | No requests or limits at all | **First** |

⚠️ **Gotcha — CPU limits and latency:** CPU limits cause CFS throttling even when the node has idle CPU, which shows up as mysterious p99 latency spikes. A common practice is to **set memory limits, set CPU requests, and skip CPU limits** for latency-sensitive apps. Know that this is a debated choice and be able to argue it either way.

### Graceful shutdown sequence (why `preStop` and the grace period matter)

1. The pod is marked Terminating → **in parallel**: removed from endpoints *and* the preStop hook starts
2. `preStop` sleeps 5 s, giving kube-proxy/gateways time to stop sending new requests
3. **SIGTERM** → gunicorn stops accepting connections and finishes in-flight requests
4. After `terminationGracePeriodSeconds` in total → **SIGKILL**

Without step 2, some requests still arrive at a pod that's shutting down → 502s on every deploy.

---

## 7. Rollouts and rollbacks

```bash
kubectl set image deploy/medilab-api api=medilabacr.azurecr.io/medilab-api:9ab1c2d -n medilab
kubectl rollout status deploy/medilab-api -n medilab     # waits; non-zero exit on failure (great for CI)
kubectl rollout history deploy/medilab-api -n medilab
kubectl rollout undo deploy/medilab-api -n medilab       # back to the previous ReplicaSet
kubectl rollout undo deploy/medilab-api --to-revision=3 -n medilab
kubectl rollout restart deploy/medilab-api -n medilab    # re-create pods (e.g., after a config change)
```

With `maxUnavailable: 0`, a new version that never becomes Ready **stalls the rollout** while the old pods keep serving. That's safe by design. `progressDeadlineSeconds` (default 600) marks it failed.

---

## 8. Jobs: database migrations done right

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: medilab-migrate-3f9c2ab           # unique per release (Jobs are immutable)
  namespace: medilab
spec:
  backoffLimit: 2
  ttlSecondsAfterFinished: 3600           # auto-cleanup
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: medilabacr.azurecr.io/medilab-api:3f9c2ab
          command: ["python", "manage.py", "migrate", "--noinput"]
          envFrom:
            - secretRef: { name: medilab-secrets }
```

⚠️ **Gotcha — running migrations in the container entrypoint:** with 3 replicas, 3 pods race to migrate at once. Use a single Job (or a Helm pre-upgrade hook), and write **backward-compatible migrations** (expand → deploy → contract) so old and new pods can run side by side during a rolling update.

---

## 9. Autoscaling

| Scaler | Scales | Based on |
|---|---|---|
| **HPA** | Pod replicas | CPU/memory (% of **request**), custom/external metrics |
| **VPA** | Pod requests/limits | Observed usage (recommendations or auto) |
| **Cluster Autoscaler** / AKS node autoprovisioning | **Nodes** | Pending pods that don't fit |
| **KEDA** | Pod replicas, **including to zero** | Event sources: queue length, Kafka lag, cron |

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: medilab-api, namespace: medilab }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: medilab-api }
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

⚠️ **Gotchas:** the HPA needs **metrics-server** and **CPU requests** set (utilization is computed against the request). HPA and VPA must not both act on CPU for the same workload. KEDA scaling `medilab-worker` on Redis queue length is the natural fit for Celery.

📌 **v1.37 note:** release coverage reports HPA scale-to-zero reaching **beta**. Until you rely on it, KEDA is the established scale-to-zero tool.

---

## 10. Availability: PodDisruptionBudget, spreading

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: medilab-api, namespace: medilab }
spec:
  minAvailable: 2
  selector:
    matchLabels: { app.kubernetes.io/name: medilab-api }
```

A PDB protects against **voluntary** disruptions (node drain during an AKS upgrade) taking out too many pods. It doesn't help with node crashes. For those, spread replicas:

```yaml
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels: { app.kubernetes.io/name: medilab-api }
```

⚠️ **Gotcha:** `minAvailable` equal to `replicas` (e.g., 3/3) means a node drain can **never** proceed, so AKS upgrades hang.

---

## 11. Scheduling controls

| Mechanism | Direction | Example |
|---|---|---|
| `nodeSelector` | Pod → "only nodes with this label" | `agentpool: general` |
| Node **affinity** | Pod → nodes (required or preferred, expressive) | Prefer zone 1 |
| Pod **anti-affinity** | Pod → away from similar pods | Don't put 2 API replicas on the same node |
| **Taints** (node) + **tolerations** (pod) | Node repels pods unless they tolerate it | A GPU pool tainted so only ML pods land there |

Memory aid: **affinity attracts, taints repel.**

---

## 12. Storage

| Object | Role |
|---|---|
| **StorageClass** | *How* to provision (Azure Disk vs Azure Files, SKU, reclaim policy) |
| **PersistentVolumeClaim (PVC)** | A pod's *request*: "I need 10Gi, ReadWriteOnce" |
| **PersistentVolume (PV)** | The actual provisioned disk, bound to the PVC |

| Access mode | Meaning | Azure backing |
|---|---|---|
| ReadWriteOnce | One node read/write | Azure Disk |
| ReadWriteMany | Many nodes read/write | Azure Files |

⚠️ **Gotcha:** an Azure Disk is **zonal**. A pod with a disk in zone 1 can't reschedule to a node in zone 2 → `Pending`. And a `reclaimPolicy: Delete` default means deleting the PVC deletes the data.

🏥 For medilab, keep **Postgres managed** (Flexible Server) rather than a StatefulSet. Backups, HA, and patching become Azure's job, which matters for patient data.

---

## 13. Security objects (details in [11-security](../devops-cloud/10-security.md))

**RBAC:** `Role` (namespaced) / `ClusterRole` (cluster-wide) define verbs on resources. `RoleBinding` / `ClusterRoleBinding` grant them to users, groups, or **ServiceAccounts**.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: { name: pod-reader, namespace: medilab }
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: { name: devs-read-pods, namespace: medilab }
subjects:
  - kind: Group
    name: "<entra-group-object-id>"      # AKS + Entra ID integration
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl auth can-i delete pods -n medilab --as=someone@corp.com
```

**NetworkPolicy — default deny, then allow:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny, namespace: medilab }
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: api-allow, namespace: medilab }
spec:
  podSelector:
    matchLabels: { app.kubernetes.io/name: medilab-api }
  policyTypes: ["Ingress", "Egress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: gateway-system }
      ports: [{ port: 8000 }]
  egress:
    - to:                                   # DNS — forget this and NOTHING resolves
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: kube-system }
      ports: [{ port: 53, protocol: UDP }, { port: 53, protocol: TCP }]
    - to:
        - ipBlock: { cidr: 10.10.9.0/24 }   # private endpoint subnet (Postgres)
      ports: [{ port: 5432 }]
```

⚠️ **Gotcha:** NetworkPolicy only works if the CNI enforces it (Azure NPM, Calico, or Cilium). On a plain kind cluster the default CNI ignores it silently.

---

## 14. Debugging playbook (the part that gets you hired)

| Status / symptom | First commands | Usual causes |
|---|---|---|
| `Pending` | `kubectl describe pod` → *Events* | Not enough CPU/mem for the **requests**; taints; PVC not bound; zone mismatch |
| `ImagePullBackOff` / `ErrImagePull` | `describe pod` → Events | Wrong tag, private registry without pull permission (AKS↔ACR `AcrPull`), arm64 vs amd64 image |
| `CrashLoopBackOff` | `kubectl logs <pod> --previous` | App crashes on start: missing env var/secret, bad config, can't reach DB, wrong command |
| `OOMKilled` (exit 137) | `describe pod` → Last State | Memory limit too low, or a leak |
| `CreateContainerConfigError` | `describe pod` | A referenced ConfigMap/Secret or key **doesn't exist** |
| `Running` but `0/1 READY` | `describe pod` → readiness failures | Readiness path wrong, dependency down, wrong port |
| Service returns 503 | `kubectl get endpointslices -l kubernetes.io/service-name=<svc>` | Selector mismatch, no ready pods |
| Works via port-forward, fails via gateway | Route/Gateway status, `kubectl describe httproute` | Hostname/path mismatch, wrong backend port, NetworkPolicy |
| Can't resolve other services | `kubectl exec ... -- nslookup medilab-api` | CoreDNS down, a NetworkPolicy blocking port 53 |

```bash
kubectl get pods -n medilab -o wide                 # node, IP, restarts
kubectl describe pod <pod> -n medilab               # EVENTS at the bottom = gold
kubectl logs <pod> -c api -n medilab --previous     # logs of the crashed instance
kubectl get events -n medilab --sort-by=.lastTimestamp | tail -20
kubectl top pods -n medilab                         # needs metrics-server
kubectl exec -it <pod> -n medilab -- sh
kubectl debug -it <pod> -n medilab --image=busybox:1.36 --target=api   # ephemeral debug container (for shell-less images)
kubectl port-forward svc/medilab-api 8080:80 -n medilab                 # bypass the gateway to test the service
kubectl get pod <pod> -n medilab -o yaml | less     # full spec + status
```

---

## 15. 🧪 Local lab with kind

```bash
kind create cluster --name medilab
docker build -t medilab-api:dev .
kind load docker-image medilab-api:dev --name medilab   # no registry needed
kubectl create namespace medilab
kubectl apply -f k8s/ -n medilab
kubectl port-forward svc/medilab-api 8080:80 -n medilab
```

**Break-it drills** (practise fixing each in under 5 minutes):
1. Change the image tag to one that doesn't exist → ImagePullBackOff
2. Remove a required env var → CrashLoopBackOff
3. Set the memory limit to `32Mi` → OOMKilled
4. Change the Service selector label → 503 / no endpoints
5. Point readinessProbe at `/wrong` → Running but not Ready; the rollout stalls
6. Request `cpu: 64` → Pending

---

## 16. 2026 version notes (v1.37, released 26 Aug 2026)

- 67 enhancements: 16 stable, 23 beta, 27 alpha, 1 deprecation/removal
- Release coverage highlights: HPA scale-to-zero **beta**, Workload/PodGroup (gang scheduling) APIs to **beta**, kube-proxy **IPVS mode removed**, **kube-dns dropped** in favour of CoreDNS → read the official changelog for the exact scope before you quote details
- **AKS versions lag upstream**, so check `az aks get-versions --location southeastasia -o table`

---

## 🎯 Quick-fire interview questions

1. What does etcd store, and why back it up? → All cluster state. Lose it and you lose the cluster's desired state (AKS manages it for you).
2. What happens if a node dies? → The node controller marks it NotReady. After a timeout its pods are evicted, and the ReplicaSet creates replacements on healthy nodes.
3. Readiness vs liveness? → See the §6 table. Readiness = traffic gate. Liveness = restart trigger.
4. How does a Service find its pods? → Label selector → EndpointSlices of *ready* pod IPs.
5. How do you do zero-downtime deploys? → RollingUpdate with `maxUnavailable: 0`, readiness probes, preStop + graceful SIGTERM, backward-compatible DB migrations, and a PDB.
6. Why not run the DB in Kubernetes? → You can (StatefulSets and operators), but a managed DB offloads backups, HA, and patching. For regulated data that's usually the right trade-off.
