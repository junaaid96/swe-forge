# AWS Cloud Essentials & Deployment Strategies

The DevOps track uses Azure for its cloud chapter. Many interviews assume AWS vocabulary, so this guide maps the core AWS services, compares infrastructure-as-code options, and summarises container and release strategies.

---

## 1. Core services map

| Need | AWS | Azure equivalent | Choose it when |
|---|---|---|---|
| Virtual machines | **EC2** (+ Auto Scaling Groups) | Virtual Machines / VMSS | full OS control, long-running workloads |
| Serverless functions | **Lambda** | Functions | event-driven, spiky or low traffic; 15-min max runtime; pay per invocation |
| Containers (managed) | **ECS** (Fargate = serverless) | Container Apps / ACI | containers without running Kubernetes |
| Kubernetes | **EKS** | AKS | you need the Kubernetes API and ecosystem |
| Object storage | **S3** | Blob Storage | files, backups, static sites, data lakes; 11 nines durability |
| Block storage | **EBS** | Managed Disks | a disk for one EC2 instance |
| Shared file system | **EFS** | Azure Files | NFS shared across instances |
| Managed SQL | **RDS** / **Aurora** | Azure SQL / Database for PostgreSQL | Postgres/MySQL without managing servers; Multi-AZ for HA, read replicas for scale |
| NoSQL key-value | **DynamoDB** | Cosmos DB | single-digit-ms at any scale; design around access patterns and partition keys |
| In-memory cache | **ElastiCache** (Redis/Valkey, Memcached) | Azure Cache for Redis | caching, sessions, leaderboards |
| Queues / pub-sub | **SQS** / **SNS** / **EventBridge** | Service Bus / Event Grid | decoupling, fan-out, event routing |
| CDN | **CloudFront** | Front Door / CDN | edge caching, TLS, WAF integration |
| DNS | **Route 53** | Azure DNS | domains, health-checked failover routing |
| Secrets | **Secrets Manager** / SSM Parameter Store | Key Vault | rotating credentials, config |
| Identity | **IAM** | Entra ID + RBAC | least-privilege roles for people and workloads |
| Observability | **CloudWatch**, X-Ray | Monitor, App Insights | metrics, logs, alarms, traces |

> **Asked as:** "EC2 vs Lambda vs ECS: how do you choose?" · "S3 vs EBS vs EFS?" · "RDS vs DynamoDB?"

## 2. Networking basics

- **VPC:** your private network, split into **subnets** per Availability Zone. Public subnets route to an **Internet Gateway**; private subnets reach out through a **NAT Gateway**.
- **Security groups** are stateful, instance-level allow lists; **network ACLs** are stateless, subnet-level rules.
- **Load balancers:** **ALB** (layer 7: HTTP routing by path/host, WebSockets, TLS termination) vs **NLB** (layer 4: TCP/UDP, static IPs, extreme throughput).
- High availability = spread across at least two AZs; disaster recovery = across regions (backup/restore → pilot light → warm standby → active-active, in rising cost).

## 3. Infrastructure as code

| | Terraform / OpenTofu | CloudFormation (+ CDK) |
|---|---|---|
| Scope | multi-cloud + SaaS providers | AWS only |
| Language | HCL (declarative) | YAML/JSON; CDK lets you use TypeScript/Python |
| State | state file you store and lock (S3 + DynamoDB, Terraform Cloud) | managed by AWS as **stacks** |
| Drift & rollback | `plan` shows changes; no automatic rollback | change sets; automatic rollback on failed deploys |
| Reuse | modules, registry | nested stacks, CDK constructs |

Benefits either way: version-controlled infrastructure, code review for changes, reproducible environments, documentation by default, and faster disaster recovery.

---

## 4. Containers in one page

- **Image vs container:** an image is an immutable, layered template; a container is a running instance with a writable layer on top (union file system).
- **Dockerfile best practices:** multi-stage builds (build tools stay out of the runtime image), order instructions for layer caching (copy lockfiles and install deps before copying source), small base images (distroless, slim, Alpine with care), `.dockerignore`, non-root user, pinned versions, one process per container, `HEALTHCHECK`.

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]
```

- **Docker Compose:** declare multi-container dev environments (app + DB + cache) with networks and volumes.
- **Orchestration:** Kubernetes (EKS/AKS/GKE), ECS, or Docker Swarm provide scheduling, service discovery, scaling, rolling updates and health checks.

## 5. CI/CD pipeline stages

1. **Build:** install with a lockfile, compile/bundle, cache dependencies.
2. **Test:** lint, unit, integration and E2E tests in parallel; fail fast; publish coverage.
3. **Package:** build and scan the image (Trivy/Grype), sign it, push to a registry (ECR).
4. **Deploy:** staging automatically, production behind approval or automated checks; infrastructure via Terraform/CloudFormation in the same pipeline.
5. **Verify:** smoke tests, SLO dashboards, automatic rollback triggers.

Tools: GitHub Actions, GitLab CI, Jenkins, CircleCI, AWS CodePipeline. Secrets come from the platform's secret store or OIDC federation to the cloud (no long-lived keys in CI).

## 6. Release strategies

| Strategy | How | Pros | Cons |
|---|---|---|---|
| **Rolling** | replace instances a few at a time | no extra capacity, zero downtime | slow rollback; two versions live at once |
| **Blue-green** | stand up the new environment, switch traffic at the LB/DNS | instant rollback, clean cut-over | double capacity during the switch; DB migrations need care |
| **Canary** | send 1% → 10% → 50% → 100% while watching metrics | limits blast radius, data-driven | needs good observability and traffic splitting |
| **Feature flags** | deploy dark, enable per user/segment | decouples deploy from release, A/B tests, kill switch | flag debt; test both paths |

> **Asked as:** "Blue-green vs canary?" · "How do you roll back a bad deploy?" · "How do you handle DB migrations with zero downtime?" (expand → migrate → contract: add new columns first, dual-write, backfill, switch reads, then drop the old ones)
