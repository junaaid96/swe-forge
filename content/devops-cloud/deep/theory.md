---
id: devops-cloud-deep-theory
track: theory
---

# DevOps & Cloud — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Cloud & DevOps

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Why Cloud + DevOps Dominate 2026 Job Posts

Job-market analyses keep ranking AWS/Azure, Docker, Kubernetes, CI/CD, Terraform, and monitoring near the top of Software Engineer postings.

You are expected to:
• Package apps so they run the same in every environment
• Automate test → build → deploy
• Reason about health checks, rollbacks, and config/secrets
• Speak the language of cloud services (compute, storage, networking, IAM)

This topic is the bridge from “it works on my machine” to “it works in production.”

### Containers & Orchestration

Docker image = app + runtime + deps. Tag immutably (git SHA). Keep images small (multi-stage builds).

Kubernetes concepts you must know:
• Pod: smallest deployable unit
• Deployment: desired replica count + rolling updates
• Service: stable networking to pods
• Ingress / Gateway: HTTP entry
• ConfigMap / Secret: configuration injection
• Liveness vs Readiness probes: restart vs stop traffic

Stateless services scale horizontally. Put session/state in Redis/DB — not in the pod filesystem (ephemeral).

### CI/CD & Infrastructure as Code

CI (Continuous Integration): every push runs lint, unit/integration tests, builds artifacts.
CD (Continuous Delivery/Deployment): promote artifacts to staging/prod with gates.

Typical pipeline:
checkout → test → build image → scan vulnerabilities → push registry → deploy → smoke test → notify

IaC (Terraform/Pulumi/CloudFormation):
• Infra is versioned and reviewable
• Environments are reproducible
• Drift is detectable

Secrets: inject from a secret manager. Never commit .env with real keys.

### Cloud Building Blocks

Compute: VMs, containers, serverless functions
Storage: object (S3), block, file
Data: managed Postgres, caches (Redis), queues (SQS/Kafka)
Networking: VPC, subnets, load balancers, DNS, TLS termination
Identity: IAM roles with least privilege

Design habit: prefer managed services when ops cost > control benefit. Know when you need Kubernetes vs a simpler PaaS (Render, Railway, Elastic Beanstalk, Cloud Run).

### Practical code

```
# Dockerfile — multi-stage Spring Boot example
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/app.jar app.jar
ENV PORT=8080
EXPOSE 8080
# Bind 0.0.0.0 for cloud platforms (Render, etc.)
ENTRYPOINT ["java","-jar","app.jar"]

# GitHub Actions sketch
# on: [push]
# jobs:
#   build:
#     runs-on: ubuntu-latest
#     steps:
#       - uses: actions/checkout@v4
#       - run: ./mvnw test
#       - run: docker build -t ghcr.io/org/api:$GITHUB_SHA .
#       - run: helm upgrade --install api ./chart --set image.tag=$GITHUB_SHA
```

### Tips

- In interviews, describe a pipeline you actually ran: tests that gate merges, image tags, and how you roll back.
- Know liveness vs readiness — confusing them causes restart loops or black-hole traffic.
- Ephemeral filesystems: local disk is not durable. Use object storage or a database.
- Say “IAM least privilege” when discussing cloud access — seniors listen for that phrase.
