# Azure for DevOps

> "Work with Azure cloud services, virtual networks, compute, storage, and related platform services." You know cloud concepts from your AWS-focused prep. This note maps them to Azure vocabulary and covers the Azure-specific ideas interviewers probe: **identity, RBAC, and networking**.

---

## 1. Resource hierarchy

```
Microsoft Entra ID tenant   (identity boundary — users, groups, apps)
└── Management groups        (policy/RBAC across many subscriptions)
    └── Subscriptions         (billing + quota boundary; e.g., sub-medilab-prod)
        └── Resource groups   (lifecycle container: delete the RG → delete everything inside)
            └── Resources     (VNet, AKS, Key Vault, ...)
```

- **RBAC and Policy inherit downward.** Contributor at the subscription level = Contributor on every RG inside it.
- **Resource group = lifecycle unit.** Group things that live and die together (all dev resources for medilab).
- A common enterprise pattern: **separate subscriptions for prod and non-prod** (blast radius, billing, access).

🎯 **Interview:** *"Why separate subscriptions per environment?"* → Isolation of access (devs can be Contributor in dev, Reader in prod), clear billing, separate quotas, and policy differences.

---

## 2. Identity — Entra ID, service principals, managed identities

| Identity | What | Credential | Use |
|---|---|---|---|
| **User** | A human | Password + MFA | People |
| **Group** | A set of users | — | Assign RBAC to groups, not individuals |
| **App registration / Service principal** | An identity for an application | Client secret, certificate, or **federated credential (OIDC)** | CI/CD from outside Azure (GitHub Actions), third-party apps |
| **Managed identity** | An identity Azure manages *for an Azure resource* | **None to handle** — Azure rotates it | VMs, AKS, App Service, Functions accessing Key Vault, Storage, SQL |

| | System-assigned MI | User-assigned MI |
|---|---|---|
| Lifecycle | Tied to one resource; deleted with it | A standalone resource; you manage it |
| Shared across resources | ❌ | ✅ |
| Use for | Simple one-resource cases | AKS Workload Identity, CI identities, shared access patterns |

🎯 **Interview:** *"How should an app on AKS read a Key Vault secret?"* → **Workload Identity**: a user-assigned managed identity + a federated credential trusting the AKS OIDC issuer for a specific Kubernetes ServiceAccount, plus the **Key Vault Secrets User** role on the vault. No secrets stored anywhere. Details in [Security](./10-security.md).

---

## 3. Access control: RBAC vs Policy

**Azure RBAC** = *who* can do *what* at *which scope*. A role assignment = **security principal + role definition + scope**.

| Built-in role | Can do | Note |
|---|---|---|
| **Owner** | Everything, **including granting access** | Give sparingly |
| **Contributor** | Create and manage everything, **cannot grant access** | The typical deployer role |
| **Reader** | View only | |
| **User Access Administrator** | Manage role assignments only | |
| **AcrPull / AcrPush** | Pull / push container images | Kubelet identity / CI |
| **Key Vault Secrets User** | Read secret values | Data-plane role |
| **Storage Blob Data Contributor** | Read/write blob **data** | ⚠️ Contributor alone does NOT grant data access when using Entra ID auth |
| **Azure Kubernetes Service RBAC Reader/Writer/Admin** | Kubernetes API access via Azure RBAC | For AKS clusters with Azure RBAC enabled |

⚠️ **Gotcha — control plane vs data plane:** "Contributor" can *manage* a storage account (create it, change settings) but can't *read blobs* with Entra ID auth unless it also has a **data** role. Same for Key Vault (manage the vault ≠ read secrets).

| | Azure RBAC | Azure Policy |
|---|---|---|
| Question | *Who* may perform an action? | *Is this resource configuration allowed?* |
| Example | "Devs can deploy to dev RG" | "Only Southeast Asia region", "Storage must disable public access", "Resources must have an `owner` tag" |
| Effects | Allow (additive) | `Deny`, `Audit`, `Modify`, `DeployIfNotExists`, `Append` |

🏥 **Healthcare angle:** Policy is how you *prove* guardrails to auditors ("no public blob access for PHI storage" enforced with Deny), and RBAC plus Entra ID sign-in logs give you the access audit trail.

---

## 4. Networking

| Service | What it is | AWS equivalent |
|---|---|---|
| **VNet** | Private network, regional, with a CIDR range | VPC |
| **Subnet** | A range inside the VNet; resources attach here | Subnet |
| **NSG** | **Stateful** allow/deny rules (priority 100–4096), attached to a subnet or NIC | Security Group (+ NACL-ish placement) |
| **ASG** (Application Security Group) | Group NICs by role and use it in NSG rules ("web" → "db" on 5432) | SG referencing SG |
| **Route table (UDR)** | Custom routes, e.g., force egress through a firewall | Route table |
| **VNet peering** | Private connectivity between VNets (**non-transitive**) | VPC peering |
| **VPN Gateway / ExpressRoute** | Site-to-site VPN / private circuit to on-prem | VPN / Direct Connect |
| **NAT Gateway** | Scalable, static outbound IP for subnets | NAT Gateway |
| **Azure Firewall** | Managed stateful L3–L7 firewall | Network Firewall |
| **Azure Bastion** | Browser-based RDP/SSH to VMs **without public IPs** | SSM Session Manager (similar goal) |
| **Private DNS zone** | Internal name resolution, required for private endpoints | Route 53 private hosted zone |

### Private endpoint vs service endpoint

| | Service endpoint | Private endpoint (Private Link) |
|---|---|---|
| The PaaS service gets… | Stays on its **public IP**; only your subnet is allowed | A **private IP inside your VNet** |
| Reachable from on-prem/peered networks | ❌ Generally no | ✅ Yes |
| Can disable public access entirely | Partially | ✅ Yes |
| DNS changes needed | No | **Yes** — a Private DNS zone (`privatelink.*`) |
| Cost | Free | Paid per endpoint + data |
| Recommended for sensitive data | OK | **Preferred** |

### Load balancing — which one?

| Service | Layer | Scope | Key features | Use when |
|---|---|---|---|---|
| **Azure Load Balancer** | L4 (TCP/UDP) | Regional | Fast, any protocol | Non-HTTP, or in front of an ingress/gateway controller (AKS `LoadBalancer` Services) |
| **Application Gateway** | L7 (HTTP) | Regional | Path/host routing, TLS termination, **WAF**, AKS integration | Single-region web apps needing WAF |
| **Front Door** | L7 (HTTP) | **Global** edge | CDN, WAF, global failover, TLS at the edge | Multi-region or global users |
| **Traffic Manager** | **DNS** | Global | Routes by DNS answer (priority, performance, geo) | Failover for any protocol at DNS level |

🎯 **Interview:** *"Hub-and-spoke?"* → A hub VNet holds shared services (firewall, VPN gateway, Bastion). Spoke VNets (per app/env) peer to the hub. Because peering is non-transitive, spoke-to-spoke traffic routes through the hub firewall via UDRs. That's central inspection and control.

---

## 5. Compute — picking the right service

| Service | You manage | Good for | medilab? |
|---|---|---|---|
| **Virtual Machines** | OS and up | Legacy apps, full control | Jump boxes, legacy |
| **VM Scale Sets** | OS image; Azure scales the count | Stateless VM fleets | AKS nodes are VMSS underneath |
| **App Service** | Just code or container | Simple web apps/APIs, fast to ship | A small client site |
| **Container Apps** | Containers (serverless, KEDA and Dapr built in, scale to zero) | Microservices without operating Kubernetes | A strong alternative |
| **AKS** | Workloads + node pools (Azure manages the control plane) | Many services, platform teams, full K8s control | ✅ Our target |
| **Container Instances** | A single container group | Short jobs, burst | Batch jobs |
| **Functions** | Code only (event-driven) | Triggers: queue, timer, HTTP | Webhook handlers |

🎯 **Interview:** *"When would you NOT choose AKS?"* → A small team with a few services: Container Apps or App Service give most of the value without Kubernetes' operational cost (upgrades, node pools, networking, security). Knowing when *not* to use Kubernetes is a senior-sounding answer.

**AKS specifics worth knowing:**
- **System vs user node pools:** system pools run CoreDNS and metrics-server. Put apps in user pools.
- **Upgrades:** control plane first, then node pools (surge nodes, cordon, and drain, which respects PDBs). **Auto-upgrade channels** and **planned maintenance windows**.
- `az aks stop` / `start` — stop a dev cluster overnight to save money.
- **Networking modes:** Azure CNI Overlay (the common default), Azure CNI with pod subnet, kubenet (legacy). Azure CNI powered by **Cilium** for eBPF dataplane and network policy.

---

## 6. Storage

**Storage account** = the container for Blob, File, Queue, and Table services.

| Redundancy | Copies | Survives |
|---|---|---|
| **LRS** | 3 in one datacenter | Disk/rack failure |
| **ZRS** | 3 across **availability zones** | A zone outage |
| **GRS** | LRS + async copy to the **paired region** | A regional disaster (failover needed) |
| **GZRS** | ZRS + async to the paired region | Zone and region failures |

| Blob access tier | Use | Retrieval |
|---|---|---|
| **Hot** | Frequently accessed | Instant, highest storage cost |
| **Cool** | 30+ days, infrequent | Instant, access fee |
| **Cold** | 90+ days | Instant, higher access fee |
| **Archive** | 180+ days, rarely | **Offline**: hours to rehydrate |

**Lifecycle management policies** move blobs between tiers automatically. 🏥 Lab reports: hot for 30 days, cool after, archive after a year, and **immutable storage (WORM)** if regulations require that records can't be altered.

**Managed disks** (for VMs/AKS): Standard HDD / Standard SSD / Premium SSD / Premium SSD v2 / Ultra.

---

## 7. Data services (know which to recommend)

| Service | Use |
|---|---|
| **Azure Database for PostgreSQL – Flexible Server** | Managed Postgres (HA with zone redundancy, backups, PITR). The medilab DB |
| **Azure SQL Database** | Managed SQL Server (common in .NET shops) |
| **Cosmos DB** | Globally distributed NoSQL, multiple APIs |
| **Azure Cache for Redis** / Azure Managed Redis | Managed Redis |
| **Service Bus** | Enterprise messaging (queues/topics) |
| **Event Hubs** | High-throughput event streaming (Kafka-compatible endpoint) |

---

## 8. Containers and secrets

- **ACR (Azure Container Registry):** Basic/Standard/Premium (Premium adds geo-replication and private endpoints). Pull via **AcrPull** on the AKS kubelet identity. **ACR Tasks** can build images in Azure. It also stores **Helm charts as OCI artifacts**.
- **Key Vault:** secrets, keys, certificates. Use the **RBAC permission model** (recommended over legacy access policies). Enable **soft delete + purge protection**, private endpoint, and diagnostic logs.

---

## 9. Monitoring (details in [Observability](./09-observability.md))

| Service | Holds |
|---|---|
| **Azure Monitor Metrics** | Platform metrics (CPU, requests), near real-time |
| **Log Analytics workspace** | Logs, queried with **KQL** |
| **Container Insights** | AKS node/pod metrics and container logs → Log Analytics |
| **Application Insights** | APM: requests, dependencies, exceptions, distributed traces (OpenTelemetry) |
| **Managed Prometheus** (Azure Monitor workspace) + **Azure Managed Grafana** | Prometheus metrics without running Prometheus yourself |
| **Alerts + Action Groups** | Rules → notify (email, SMS, Teams, webhook) or automate |
| **Activity Log** | *Who did what* at the control plane (created/deleted/changed resources) |

🎯 **Interview:** *"Someone deleted a resource — how do you find out who?"* → **Activity Log** (filter by resource and operation `Delete`). Send it to Log Analytics for longer retention.

---

## 10. Cost awareness (asked more often than you'd think)

- **Budgets + alerts** in Cost Management (set one on your personal subscription *today*)
- **Tags** (`env`, `owner`, `project`) for cost allocation, enforced by Policy
- Right-size VMs and node pools; **autoscale**; stop dev clusters out of hours (`az aks stop`)
- **Reservations / savings plans** for steady workloads; **Spot** VMs/node pools for interruptible jobs
- Delete orphans: unattached disks, old public IPs, idle load balancers, stale snapshots

---

## 11. AWS → Azure translation table

| AWS | Azure |
|---|---|
| Account / Organization | Subscription / Management group |
| IAM user/role/policy | Entra ID user / service principal or managed identity / RBAC role assignment |
| IAM role for EC2 | Managed identity |
| IRSA / EKS Pod Identity | **AKS Workload Identity** |
| VPC / SG / NACL | VNet / NSG (ASG) |
| EC2 / ASG | VM / VM Scale Sets |
| EKS / ECS / Fargate | AKS / Container Apps / Container Instances |
| Lambda | Functions |
| S3 | Blob Storage |
| EBS / EFS | Managed Disks / Azure Files |
| RDS | Azure Database for PostgreSQL/MySQL, Azure SQL |
| ECR | ACR |
| Secrets Manager / KMS | Key Vault |
| CloudWatch / X-Ray | Azure Monitor + Log Analytics / Application Insights |
| CloudTrail | Activity Log |
| ALB / NLB / CloudFront / Route 53 | Application Gateway / Load Balancer / Front Door / Azure DNS (+ Traffic Manager) |
| CloudFormation | ARM / **Bicep** |
| AWS Config / SCPs | Azure Policy |

---

## 12. 🧪 az CLI cheat sheet (practical-test speed)

```bash
az login
az account list -o table
az account set --subscription "<name-or-id>"
az group create -n rg-medilab-lab -l southeastasia
az resource list -g rg-medilab-lab -o table

# VM with SSH key only, no public IP (use Bastion) — or with a public IP for a quick lab
az vm create -g rg-medilab-lab -n vm-lab --image Ubuntu2404 \
  --admin-username azureuser --generate-ssh-keys --size Standard_B2s
az vm open-port -g rg-medilab-lab -n vm-lab --port 443 --priority 900

# NSG rule
az network nsg rule create -g rg-medilab-lab --nsg-name vm-labNSG -n allow-https \
  --priority 200 --direction Inbound --access Allow --protocol Tcp --destination-port-ranges 443

# AKS
az aks get-versions -l southeastasia -o table
az aks create -g rg-medilab-lab -n aks-lab --node-count 1 --node-vm-size Standard_D2s_v5 \
  --network-plugin azure --network-plugin-mode overlay \
  --enable-oidc-issuer --enable-workload-identity --generate-ssh-keys
az aks get-credentials -g rg-medilab-lab -n aks-lab
az aks stop -g rg-medilab-lab -n aks-lab           # save money

# ACR
az acr create -g rg-medilab-lab -n medilabacrlab --sku Basic
az aks update -g rg-medilab-lab -n aks-lab --attach-acr medilabacrlab   # grants AcrPull

# Key Vault (RBAC model)
az keyvault create -g rg-medilab-lab -n kv-medilab-lab --enable-rbac-authorization true
az keyvault secret set --vault-name kv-medilab-lab -n db-password --value "$(openssl rand -base64 24)"

# Querying output with JMESPath
az vm list --query "[].{name:name, rg:resourceGroup, size:hardwareProfile.vmSize}" -o table

# Clean up EVERYTHING in the lab
az group delete -n rg-medilab-lab --yes --no-wait
```

---

## 🎯 Quick-fire interview questions

1. Managed identity vs service principal? → An MI is a special service principal whose credentials Azure manages and rotates. Use an MI for Azure-hosted workloads, an SP (ideally with OIDC federation) for external systems like GitHub
2. How do you give AKS access to ACR? → The **AcrPull** role for the kubelet identity on the ACR (`az aks update --attach-acr`)
3. NSG — stateful or stateless? → **Stateful**
4. How do you make a PaaS database unreachable from the internet? → A private endpoint + Private DNS zone, and disable public network access
5. Availability set vs availability zone? → A set spreads VMs across fault/update domains **within one datacenter**. Zones are **physically separate datacenters** in a region, giving a higher SLA
6. What's the Azure Activity Log? → The control-plane audit log of who did what to which resource
