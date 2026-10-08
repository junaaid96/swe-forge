# Docker & Containers

> You've used Docker as a developer. The DevOps bar is higher: you need **small, secure, reproducible images**, correct signal handling, and to know what a container *is* at the kernel level.

---

## 1. What a container actually is (under the hood)

A container is **a normal Linux process** with two kernel features applied:

| Feature | What it does | Example |
|---|---|---|
| **Namespaces** | *Isolation* — what the process can **see** | `pid` (own PID 1), `net` (own interfaces/IP), `mnt` (own filesystem view), `uts` (own hostname), `ipc`, `user` (uid mapping), `cgroup` |
| **cgroups** (v2) | *Limits* — what the process can **use** | CPU, memory, I/O, and PID limits. `--memory=512m` becomes a cgroup setting; exceeding it triggers the OOM kill |
| **Union filesystem** (overlay2) | Image layers stacked read-only, plus a thin writable layer on top | Many containers share the same base layers on disk |

| | Container | Virtual machine |
|---|---|---|
| Isolation boundary | Shared host **kernel** (namespaces) | A **hypervisor**; each VM has its own kernel |
| Startup | Milliseconds to seconds | Tens of seconds to minutes |
| Size | MBs | GBs |
| Security isolation | Weaker (kernel escape = host) | Stronger |
| Can run a different OS kernel? | No (Linux containers need a Linux kernel; Docker Desktop on your Mac runs a hidden Linux VM) | Yes |

🎯 **Interview:** *"Is a container a lightweight VM?"* → No. It's an isolated process sharing the host kernel. Isolation comes from namespaces, limits come from cgroups.

**The runtime stack:** `docker` CLI → `dockerd` → **containerd** → `runc` (creates the namespaces and cgroups). Kubernetes talks to containerd directly through the CRI. That's why "Kubernetes removed Docker" (dockershim, in 1.24) didn't break images: images are standard **OCI** images.

---

## 2. Images and layers

- Each Dockerfile instruction that changes the filesystem (`RUN`, `COPY`, `ADD`) creates a **layer**.
- Layers are **cached**. If an instruction and its inputs haven't changed, Docker reuses the layer. **The first changed layer invalidates every layer after it.**
- Images are identified by **digest** (`sha256:...`), which is immutable. **Tags** (`:1.4.0`, `:latest`) are movable labels.

⚠️ **Gotcha — layer ordering kills build speed:**

```dockerfile
# ❌ Any code change re-installs every dependency
COPY . .
RUN pip install -r requirements.txt

# ✅ Dependencies are cached until requirements.txt changes
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
```

⚠️ **Gotcha — deleting in a later layer doesn't shrink the image:** `RUN apt-get install ...` followed by `RUN rm -rf /var/lib/apt/lists/*` in a *separate* layer still ships the files. Clean up in the **same** `RUN`.

⚠️ **Gotcha — secrets in layers:** `ENV DB_PASSWORD=...` or `COPY .env .` bakes the secret into the image forever (`docker history` shows it). Pass secrets at runtime, or use BuildKit `--mount=type=secret` for build-time secrets.

---

## 3. 🧪 Production Dockerfile for medilab-api (Django + gunicorn)

```dockerfile
# syntax=docker/dockerfile:1

############ Stage 1: build wheels (has compilers) ############
FROM python:3.13-slim AS builder
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential libpq-dev \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY requirements.txt .
# BuildKit cache mount: pip cache persists between builds, not in the image
RUN --mount=type=cache,target=/root/.cache/pip \
    pip wheel --wheel-dir /wheels -r requirements.txt

############ Stage 2: runtime (no compilers) ############
FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=medilab.settings.prod
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 tini \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 10001 app \
 && useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app
WORKDIR /app
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels
COPY --chown=app:app . .
USER 10001
EXPOSE 8000
# tini is PID 1: forwards signals and reaps zombies
ENTRYPOINT ["/usr/bin/tini", "--"]
# exec form → gunicorn receives SIGTERM directly
CMD ["gunicorn", "medilab.wsgi:application", \
     "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "30", \
     "--access-logfile", "-", "--error-logfile", "-"]
```

Why each choice matters:

| Choice | Reason |
|---|---|
| Multi-stage build | Compilers and headers stay in the builder. The runtime image is smaller with a smaller attack surface |
| `-slim`, not `alpine`, for Python | Alpine uses **musl**; many Python wheels are built for glibc → slow source builds and odd bugs |
| Numeric non-root `USER 10001` | Kubernetes `runAsNonRoot` can verify a numeric UID. Root in a container is root on the host if the container escapes |
| `tini` as PID 1 | PID 1 has special signal semantics and must reap zombies |
| Exec form `CMD [...]` | Shell form (`CMD gunicorn ...`) runs under `/bin/sh -c`, so **sh** is PID 1 and may not forward SIGTERM |
| Logs to stdout/stderr (`-`) | The container platform collects stdout. Never log to files inside a container |
| `PYTHONUNBUFFERED=1` | Logs appear immediately instead of sitting in a buffer |

**`.dockerignore`** — as important as the Dockerfile:

```
.git
.venv
__pycache__/
*.pyc
.env
*.sqlite3
node_modules
tests/
Dockerfile*
```

Without it, `COPY . .` sends `.git`, local virtualenvs, and `.env` secrets into the build context and possibly the image.

---

## 4. CMD vs ENTRYPOINT, COPY vs ADD

| | `ENTRYPOINT` | `CMD` |
|---|---|---|
| Role | The executable that always runs | Default arguments (or the default command) |
| Overridden by | `docker run --entrypoint` | Anything after the image name in `docker run image <args>` |
| Common pattern | `ENTRYPOINT ["tini","--"]` + `CMD ["gunicorn", ...]` | |
| In Kubernetes | `command:` overrides ENTRYPOINT | `args:` overrides CMD |

| | `COPY` | `ADD` |
|---|---|---|
| Local files | ✅ | ✅ |
| Remote URLs | ❌ | ✅ (but unpinned, no checksum by default) |
| Auto-extracts tar | ❌ | ✅ (surprising) |
| Recommendation | **Default** | Only when you specifically want tar extraction |

---

## 5. Docker Compose for local development

```yaml
# compose.yaml
services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env                    # local only; never commit
    depends_on:
      db:
        condition: service_healthy    # wait for READY, not just "started"
      redis:
        condition: service_started
  worker:
    build: .
    command: ["celery", "-A", "medilab", "worker", "-l", "info"]
    env_file: .env
    depends_on: [db, redis]
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: medilab
      POSTGRES_USER: medilab
      POSTGRES_PASSWORD: localdev
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medilab -d medilab"]
      interval: 5s
      retries: 10
  redis:
    image: redis:7-alpine
volumes:
  pgdata:
```

⚠️ **Gotcha — `localhost` inside a container** is *that container*. From `api`, the database is at host `db:5432` (Compose DNS by service name), not `localhost:5432`.

⚠️ **Gotcha — plain `depends_on`** only waits for the container to *start*, not for Postgres to accept connections. Use `condition: service_healthy`, and make the app retry DB connections anyway.

---

## 6. Storage and networking

| | Named volume | Bind mount | tmpfs |
|---|---|---|---|
| Managed by | Docker (`/var/lib/docker/volumes`) | You (a host path) | Memory |
| Use | DB data, persistent state | Local dev (live code reload) | Scratch space, sensitive temp files |
| Portable? | ✅ | ❌ Depends on the host path | n/a |

| Network mode | Behaviour |
|---|---|
| `bridge` (default) | Private network + NAT. Containers on a user-defined bridge resolve each other by name |
| `host` | Shares the host's network stack. No isolation, no port mapping |
| `none` | No networking |

---

## 7. Tagging and registries

| Tag strategy | Verdict |
|---|---|
| `:latest` | ❌ In deployments. Mutable, not traceable, and with `IfNotPresent` nodes may run different versions |
| `:<git-sha>` | ✅ Immutable and traceable. The default for CI builds |
| `:1.4.0` (semver) | ✅ For releases. Add it alongside the SHA tag |
| `@sha256:<digest>` | ✅✅ Strongest pinning. The tag can't be moved under you |

Registry for this role: **Azure Container Registry (ACR)**. Push with `az acr login -n <acr>` then `docker push <acr>.azurecr.io/medilab-api:<sha>`. AKS pulls using the **AcrPull** role on the kubelet identity, with no passwords (see [Terraform](./07-terraform.md)).

---

## 8. Image security and size

```bash
docker images medilab-api                  # size
docker history medilab-api:<tag>           # size per layer (and leaked ENV!)
trivy image medilab-api:<tag>              # CVE scan (pin the Trivy version — see the Security guide)
docker scout cves medilab-api:<tag>        # Docker's scanner
```

Checklist: minimal base · multi-stage · non-root · no secrets in layers · pinned base image (by digest for high assurance) · rebuild regularly for base-image patches · scan in CI and fail on HIGH/CRITICAL with a fix available.

---

## 9. Debugging containers

```bash
docker ps -a                             # includes exited containers
docker logs -f --tail=100 <c>
docker inspect <c> | jq '.[0].State'     # ExitCode, OOMKilled, Error
docker exec -it <c> sh                   # shell in (if the image has one)
docker stats                             # live CPU/mem per container
docker system df                         # disk used by images/volumes/cache
docker system prune -af --volumes        # ⚠️ destructive: cleans everything unused
docker run --rm -it --entrypoint sh medilab-api:<tag>   # poke inside an image
```

| Exit code | Meaning |
|---|---|
| 0 | Clean exit (for a web server, often means "the command wasn't long-running") |
| 1 | Application error |
| 126 / 127 | Not executable / command not found (wrong path in CMD) |
| 137 | SIGKILL — **OOM** or forced kill |
| 143 | SIGTERM — graceful stop |

---

## 10. Gotchas summary

| Trap | Fix |
|---|---|
| `HEALTHCHECK` in a Dockerfile is ignored by Kubernetes | Use K8s liveness/readiness probes |
| Shell-form CMD breaks graceful shutdown | Exec form + tini |
| `.env` copied into the image | `.dockerignore` |
| Image is 1.2 GB | Multi-stage, slim base, clean up in the same RUN |
| Build is slow on every change | Order layers: dependencies before code; BuildKit cache mounts |
| Container works on a Mac, fails on AKS (`exec format error`) | You built **arm64** on Apple Silicon and AKS nodes are **amd64**. Use `docker buildx build --platform linux/amd64` |

⚠️ That last one applies directly to you: your Mac is Apple Silicon.

---

## 🎯 Quick-fire interview questions

1. How do you reduce image size? → Multi-stage, slim base, fewer layers with cleanup in the same RUN, `.dockerignore`, no dev dependencies
2. What happens to data written inside a container when it's removed? → Lost with the writable layer. Use volumes
3. Why run as non-root? → Limits the blast radius of an app compromise or container escape; required by restricted Pod Security
4. Difference between an image and a container? → Image = read-only template (layers). Container = a running instance with a writable layer
5. What is OCI? → The Open Container Initiative: standard image and runtime specs, so images built by Docker run on containerd, CRI-O, and others
