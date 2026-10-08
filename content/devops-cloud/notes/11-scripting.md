# Scripting for DevOps — Bash & Python

> "Scripting knowledge in Bash, Python, or a similar language." Your Python is already strong. The gap is usually **defensive Bash**: scripts that fail loudly and safely instead of silently doing damage.

---

## 1. Bash vs Python — pick the right tool

| Use Bash when… | Use Python when… |
|---|---|
| Gluing CLI tools together (`az`, `kubectl`, `docker`, `helm`) | Logic grows: branching, data structures, error handling |
| Short (< ~100 lines), linear steps | You parse JSON/YAML heavily or call APIs/SDKs |
| Pipeline steps, container entrypoints | You need tests, retries, concurrency, reuse |
| No runtime dependencies wanted | You'd otherwise write `jq` pipelines 5 levels deep |

---

## 2. Defensive Bash — the header every script needs

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

| Setting | Effect | Without it |
|---|---|---|
| `set -e` | Exit when a command fails | The script keeps going after a failure (deploys after a failed build) |
| `set -u` | Error on **unset variables** | `rm -rf "$DIR/"` with an empty `DIR` → `rm -rf /` 😱 |
| `set -o pipefail` | A pipeline fails if **any** command in it fails | `curl bad-url \| jq .` "succeeds" because `jq` succeeded |
| `IFS=$'\n\t'` | Word splitting only on newline/tab | Filenames with spaces split into pieces |

⚠️ **`set -e` gotchas (interview favourite):** it does **not** trigger inside `if` conditions, `while` conditions, or commands followed by `||`/`&&`, and it can behave surprisingly in functions called from those contexts. It's a safety net, not error handling. Check critical commands explicitly.

### Essentials

```bash
name="medilab"                      # no spaces around =
echo "$name"                        # ALWAYS quote expansions
env="${ENV:-dev}"                   # default if unset/empty
: "${SUBSCRIPTION_ID:?must be set}" # fail with a message if unset
files=("a.log" "b log.txt")         # arrays
for f in "${files[@]}"; do echo "$f"; done
count=$(( 3 + 4 ))                  # arithmetic
today=$(date -u +%F)                # command substitution (not backticks)

if [[ -f "$file" && "$env" == "prod" ]]; then ...; fi   # [[ ]] is safer than [ ]
case "$env" in
  dev|staging) replicas=2 ;;
  prod)        replicas=3 ;;
  *)           echo "unknown env: $env" >&2; exit 1 ;;
esac

log()  { printf '%s [%s] %s\n' "$(date -u +%FT%TZ)" "${FUNCNAME[1]:-main}" "$*" >&2; }   # logs to stderr
die()  { log "ERROR: $*"; exit 1; }

cleanup() { rm -rf "${TMPDIR_CREATED:-}"; }
trap cleanup EXIT                    # runs on success, failure, or Ctrl+C
TMPDIR_CREATED=$(mktemp -d)
```

| Test | Meaning |
|---|---|
| `-f file` / `-d dir` / `-e path` | Is a file / is a directory / exists |
| `-z "$s"` / `-n "$s"` | Empty / non-empty string |
| `$?` | Exit code of the last command (0 = success) |

**Always run `shellcheck script.sh`.** It catches most quoting bugs. Put it in CI.

---

## 3. 🧪 Script 1 — wait for a deployment to become healthy (retry + backoff)

```bash
#!/usr/bin/env bash
# wait-healthy.sh <url> [max_attempts]
set -euo pipefail

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >&2; }

URL="${1:?usage: $0 <url> [max_attempts]}"
MAX="${2:-20}"
delay=2

for (( i = 1; i <= MAX; i++ )); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$URL") || true   # 000 on connection error
  if [[ "$code" == "200" ]]; then
    log "healthy after $i attempt(s)"
    exit 0
  fi
  log "attempt $i/$MAX: HTTP $code — retrying in ${delay}s"
  sleep "$delay"
  delay=$(( delay < 30 ? delay * 2 : 30 ))       # exponential backoff, capped at 30s
done

log "still unhealthy after $MAX attempts: $URL"
exit 1
```

Use it as the smoke-test step after `helm upgrade`. A non-zero exit fails the pipeline.

---

## 4. 🧪 Script 2 — log cleanup with dry-run and a disk alert

```bash
#!/usr/bin/env bash
# cleanup-logs.sh — delete old logs; DRY_RUN=true by default (safe)
set -euo pipefail

LOG_DIR="${LOG_DIR:-/var/log/medilab}"
DAYS="${DAYS:-14}"
DRY_RUN="${DRY_RUN:-true}"
THRESHOLD="${THRESHOLD:-85}"

[[ -d "$LOG_DIR" ]] || { echo "no such directory: $LOG_DIR" >&2; exit 1; }

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] would delete:"
  find "$LOG_DIR" -type f -name '*.log*' -mtime +"$DAYS" -print
else
  find "$LOG_DIR" -type f -name '*.log*' -mtime +"$DAYS" -print -delete
fi

usage=$(df --output=pcent / | tail -1 | tr -dc '0-9')
if (( usage > THRESHOLD )); then
  echo "WARNING: root filesystem at ${usage}% (threshold ${THRESHOLD}%)" >&2
  exit 2                                        # distinct exit code for "ran OK, but disk is high"
fi
```

Patterns to point out in an interview: **dry-run by default**, validating inputs, `-mtime +N`, and **distinct exit codes** so a scheduler or monitor can tell outcomes apart.

---

## 5. 🧪 Script 3 — cloud hygiene with `az` + `jq`

```bash
#!/usr/bin/env bash
# untagged.sh — list resources missing an "owner" tag (cost & governance)
set -euo pipefail

az resource list -o json \
  | jq -r '.[]
           | select((.tags // {}) | has("owner") | not)
           | [.resourceGroup, .type, .name] | @tsv' \
  | sort | column -t
```

Same thing with the built-in JMESPath `--query` (no jq needed):

```bash
az resource list --query "[?tags.owner == null].{rg:resourceGroup, type:type, name:name}" -o table
```

More one-liners you'll reuse:

```bash
# Unattached managed disks (paying for nothing)
az disk list --query "[?diskState=='Unattached'].{name:name, rg:resourceGroup, gb:diskSizeGb}" -o table

# Stop all VMs in a dev resource group at night
az vm list -g rg-medilab-dev --query "[].id" -o tsv | xargs -r az vm deallocate --no-wait --ids

# Pods not Running/Succeeded across all namespaces
kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded

# Containers with > 3 restarts, and why they last died
kubectl get pods -n medilab -o json | jq -r '
  .items[] | .metadata.name as $pod
  | .status.containerStatuses[]?
  | select(.restartCount > 3)
  | "\($pod)\t\(.name)\t\(.restartCount)\t\(.lastState.terminated.reason // "-")"'

# Decode a secret value (debugging only — it's base64, not encrypted)
kubectl get secret medilab-secrets -n medilab -o jsonpath='{.data.DB_PASSWORD}' | base64 -d
```

---

## 6. 🧪 Script 4 — Postgres backup to Blob Storage

```bash
#!/usr/bin/env bash
# pg-backup.sh — expects PGHOST, PGUSER, PGDATABASE (+ PGPASSWORD or an Entra token), STORAGE_ACCOUNT
set -euo pipefail
: "${PGHOST:?}" "${PGDATABASE:?}" "${STORAGE_ACCOUNT:?}"

ts=$(date -u +%Y%m%dT%H%M%SZ)
file="$(mktemp -d)/${PGDATABASE}-${ts}.dump"
trap 'rm -rf "$(dirname "$file")"' EXIT

pg_dump --format=custom --no-owner --file="$file"
az storage blob upload \
  --account-name "$STORAGE_ACCOUNT" --container-name backups \
  --name "postgres/${PGDATABASE}/$(basename "$file")" \
  --file "$file" --auth-mode login --only-show-errors

echo "backup uploaded: $(basename "$file")"
```

🏥 Flexible Server already has automated backups with point-in-time restore. A script like this is for **logical exports** (migrations, long-term archives), and the restore should be **tested** (`pg_restore` into a scratch DB) on a schedule.

---

## 7. Python for DevOps

### Calling CLIs safely

```python
import subprocess

def run(cmd: list[str]) -> str:
    """Run a command; raise with stderr on failure. Never use shell=True with user input."""
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return result.stdout.strip()

tag = run(["git", "rev-parse", "--short", "HEAD"])
run(["helm", "upgrade", "--install", "medilab", "charts/medilab",
     "-n", "medilab", "--set", f"image.tag={tag}", "--wait"])
```

⚠️ Passing a **list** avoids shell injection. `shell=True` with interpolated strings is a security bug.

### 🧪 Azure SDK: untagged resources (the same job as Script 3)

```python
# pip install azure-identity azure-mgmt-resource
import os
from azure.identity import DefaultAzureCredential
from azure.mgmt.resource import ResourceManagementClient

cred = DefaultAzureCredential()   # az login locally; managed identity / OIDC in Azure & CI
client = ResourceManagementClient(cred, os.environ["AZURE_SUBSCRIPTION_ID"])

missing = [r for r in client.resources.list() if "owner" not in (r.tags or {})]
for r in sorted(missing, key=lambda r: r.id):
    print(f"{r.type:55} {r.name}")
print(f"\n{len(missing)} resource(s) without an owner tag")
```

`DefaultAzureCredential` tries environment variables, workload identity, managed identity, and Azure CLI login in order. **The same code works on your laptop and in AKS** with no secrets. That's the point.

### 🧪 Kubernetes client: restart report

```python
# pip install kubernetes
from kubernetes import client, config

config.load_kube_config()          # in-cluster: config.load_incluster_config()
v1 = client.CoreV1Api()

for pod in v1.list_namespaced_pod("medilab").items:
    for cs in pod.status.container_statuses or []:
        if cs.restart_count > 3:
            reason = cs.last_state.terminated.reason if cs.last_state.terminated else "-"
            print(f"{pod.metadata.name:40} {cs.name:10} restarts={cs.restart_count:<4} last={reason}")
```

### Small CLI tool skeleton (argparse + exit codes)

```python
#!/usr/bin/env python3
import argparse, sys, time, urllib.request

def check(url: str, timeout: float) -> int:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return r.status
    except Exception:
        return 0

def main() -> int:
    p = argparse.ArgumentParser(description="Wait until a URL returns 200")
    p.add_argument("url")
    p.add_argument("--attempts", type=int, default=20)
    p.add_argument("--timeout", type=float, default=5)
    a = p.parse_args()
    delay = 2
    for i in range(1, a.attempts + 1):
        status = check(a.url, a.timeout)
        if status == 200:
            print(f"healthy after {i} attempt(s)", file=sys.stderr)
            return 0
        print(f"attempt {i}: status {status}, retry in {delay}s", file=sys.stderr)
        time.sleep(delay)
        delay = min(delay * 2, 30)
    return 1

if __name__ == "__main__":
    sys.exit(main())
```

---

## 8. Gotchas summary

| Trap | Fix |
|---|---|
| Unquoted `$var` with spaces or globs | Always `"$var"`; shellcheck |
| `rm -rf "$DIR"/*` when DIR is empty | `set -u` and `"${DIR:?}"` |
| `cd somewhere` fails, then later commands run in the wrong directory | `cd somewhere \|\| exit 1` (or rely on `set -e` and check) |
| Pipeline hides failures | `set -o pipefail` |
| Parsing `ls` output | Use globs or `find -print0 \| xargs -0` |
| Secrets in script args (visible in `ps`) | Pass via env/files; never `echo` them |
| Scripts only work on your Mac | macOS ships BSD `sed`/`date`/`find` — flags differ from GNU on Linux. Test in a Linux container |

⚠️ That last one applies to you directly: `sed -i ''` (BSD) vs `sed -i` (GNU), and `date -d` is GNU-only.

---

## 🎯 Quick-fire interview questions / live tasks

1. Write a one-liner to count HTTP status codes in an access log → `awk '{print $9}' access.log | sort | uniq -c | sort -rn`
2. What does `set -euo pipefail` do? → §2 table
3. How do you make a script safe to run twice (idempotent)? → Check before acting (`if ! az group exists ...`), use declarative tools (`helm upgrade --install`, `kubectl apply`), and `mkdir -p`
4. `$@` vs `$*`? → `"$@"` preserves each argument separately (almost always what you want). `"$*"` joins them into one string
5. How would you run a script every night on a VM? On Kubernetes? → A systemd timer (or cron) / a CronJob
