# 01 · Linux for DevOps

> Almost every container, Kubernetes node, and Azure VM you touch runs Linux. Troubleshooting skill is mostly Linux skill.

---

## 1. Filesystem hierarchy — where things live

| Path | What's there | Why you care |
|---|---|---|
| `/etc` | System and service config (`/etc/ssh/sshd_config`, `/etc/hosts`, `/etc/resolv.conf`) | Most config fixes happen here |
| `/var/log` | Logs (`syslog`, `auth.log`, nginx logs) | The first place to look when something breaks |
| `/var/lib` | Service state (`/var/lib/docker`, `/var/lib/postgresql`) | Often the directory that fills the disk |
| `/proc` | A virtual FS exposing kernel and process info (`/proc/cpuinfo`, `/proc/<pid>/`) | How `top`, `ps`, and `free` get their data |
| `/sys` | A virtual FS for devices and kernel tunables (cgroups live under `/sys/fs/cgroup`) | Containers are cgroups under the hood |
| `/tmp` | Temporary files, often cleared on reboot | Never put state here |
| `/opt` | Third-party software | Where you install vendor tools |
| `/home`, `/root` | User homes | `~/.ssh/authorized_keys` lives here |

🎯 **Interview:** *"Where would you look for the logs of a service that won't start?"* → `systemctl status <svc>`, then `journalctl -u <svc> -e`, then the app's own log in `/var/log/<app>/`.

---

## 2. Processes and signals

**Concept:** a process is a running program with a PID, a parent (PPID), an owner, and open file descriptors. The kernel talks to processes through **signals**.

| Signal | Number | Default action | Can the process catch it? | Real use |
|---|---|---|---|---|
| `SIGTERM` | 15 | Terminate | ✅ yes | A polite stop, so the app can finish requests and close DB connections. **Kubernetes sends this first** |
| `SIGKILL` | 9 | Kill immediately | ❌ no | Last resort. No cleanup runs. Kubernetes sends it after `terminationGracePeriodSeconds` |
| `SIGINT` | 2 | Terminate | ✅ | Ctrl+C |
| `SIGHUP` | 1 | Terminate | ✅ | Many daemons use it to *reload config* (`nginx -s reload`) |
| `SIGSTOP` / `SIGCONT` | 19 / 18 | Pause / resume | ❌ / ✅ | Freezing a process |

**Why it matters:** if your app ignores SIGTERM (for example, a shell script is PID 1 and doesn't forward signals), every deploy drops in-flight requests. You get a 30-second hang, then SIGKILL. This is the most common cause of "our deploys cause errors."

```bash
ps aux --sort=-%mem | head          # top memory consumers
ps -ef --forest                     # process tree (who spawned whom)
pgrep -a gunicorn                   # find by name
kill -TERM <pid>                    # graceful
kill -9 <pid>                       # force (last resort)
lsof -p <pid>                       # files and sockets a process has open
```

⚠️ **Gotcha — zombies vs orphans:** a *zombie* has finished, but its parent hasn't called `wait()` on it, so it takes a PID slot but no memory. An *orphan*'s parent died, so it gets re-parented to PID 1. In containers, if PID 1 doesn't reap children, zombies pile up. That's why `tini` and `docker run --init` exist.

---

## 3. systemd — managing services on a VM

**Concept:** systemd is PID 1 on modern distros. It starts services from *unit files*, restarts them on failure, and collects their logs in the **journal**.

🧪 **Lab — run medilab-api under systemd with gunicorn:**

```ini
# /etc/systemd/system/medilab-api.service
[Unit]
Description=medilab-api (gunicorn)
After=network-online.target
Wants=network-online.target

[Service]
User=medilab
Group=medilab
WorkingDirectory=/opt/medilab
EnvironmentFile=/etc/medilab/env          # secrets here, chmod 600, owned by root
ExecStart=/opt/medilab/.venv/bin/gunicorn medilab.wsgi:application \
          --bind 127.0.0.1:8000 --workers 3 --timeout 30
Restart=on-failure
RestartSec=5
# Hardening — cheap wins
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/medilab
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload            # after editing a unit file
sudo systemctl enable --now medilab-api # start now and on boot
systemctl status medilab-api            # state + last log lines
journalctl -u medilab-api -f            # follow logs
journalctl -u medilab-api --since "10 min ago" -p err   # errors only
systemctl list-units --failed           # what's broken on this box
```

⚠️ **Gotcha:** forgetting `daemon-reload` after editing a unit. systemd keeps using the old definition.

### cron vs systemd timers

| | cron | systemd timer |
|---|---|---|
| Config | One line in `crontab -e` | `.timer` + `.service` pair |
| Logs | You redirect them yourself (often lost) | Automatically in `journalctl` |
| Missed runs (box was off) | Skipped | `Persistent=true` catches up |
| Environment | Minimal `PATH` — the classic "works in shell, fails in cron" | Same as the service |
| When to pick | Quick and simple | Anything you'll need to debug later |

---

## 4. Users, groups, permissions

```
-rw-r-----  1 medilab medilab  512 Sep 23 10:00 env
│└┬┘└┬┘└┬┘
│ u  g  o      u=owner, g=group, o=others; r=4 w=2 x=1
└ type (- file, d dir, l symlink)
```

| Octal | Meaning | Typical use |
|---|---|---|
| `600` | Owner read/write | SSH private keys, `.env` files with secrets |
| `644` | Owner rw, everyone read | Normal config files |
| `700` | Owner full | `~/.ssh` directory |
| `755` | Owner full, everyone read/execute | Scripts, binaries, web directories |
| `777` | Everyone everything | ❌ Never. The interviewer is testing whether you'll say it |

```bash
chmod 600 ~/.ssh/id_ed25519
chown -R medilab:medilab /var/lib/medilab
sudo -u medilab whoami       # run as another user
id medilab                   # uid, gid, groups
```

⚠️ **Gotcha:** SSH refuses a private key that is readable by others ("UNPROTECTED PRIVATE KEY FILE"). Fix it with `chmod 600`.

🎯 **Interview:** *"What does the x bit mean on a directory?"* → Permission to *enter* (traverse) it. `r` on a directory lets you *list* it. You need `x` on every parent directory to reach a file.

---

## 5. Disk

```bash
df -h                    # space per filesystem
df -i                    # INODES — can be exhausted while space remains
du -sh /var/* | sort -h  # what is big
du -xh / --max-depth=1 2>/dev/null | sort -h | tail
lsof +L1                 # deleted files still held open
ncdu /var                # interactive (if installed)
```

⚠️ **Gotcha — "df says 100% but du finds nothing":** a process still holds a *deleted* file open, usually a log that was `rm`'d instead of rotated. The space isn't freed until the process closes it. Find it with `lsof +L1`, then restart the process or truncate via `/proc/<pid>/fd/<n>`. Lesson: rotate logs with `logrotate` (`copytruncate` or a signal) instead of deleting them.

⚠️ **Gotcha — inodes:** millions of tiny files (session files, cache files) can exhaust inodes. `df -h` looks fine, but writes fail with "No space left on device". Check `df -i`.

Common disk hogs on DevOps boxes: `/var/lib/docker` (old images → `docker system prune`), `/var/log/journal` (→ `journalctl --vacuum-size=500M`), and application logs.

---

## 6. Memory and CPU

```bash
free -h            # look at "available", not "free"
vmstat 1 5         # si/so columns = swapping (bad)
top / htop         # press M (memory) or P (CPU) to sort
uptime             # load averages: 1, 5, 15 min
nproc              # number of CPUs
dmesg -T | grep -i -E "oom|killed process"   # OOM killer evidence
```

**Concept — "free" vs "available":** Linux uses spare RAM as **page cache** (buff/cache). That memory is reclaimable, so low "free" is normal. Worry when **available** is low and swap is active.

**Concept — load average:** the number of processes running *or waiting* (for CPU, or in uninterruptible disk I/O). Compare it to `nproc`: a load of 4 on a 4-core box is fully busy, while a load of 4 on a 16-core box is fine. A high load with low CPU% usually means **I/O wait** (check `wa` in `top`).

**Concept — OOM killer:** when memory runs out, the kernel picks a process (based on `oom_score`) and SIGKILLs it. In Kubernetes this shows up as `OOMKilled` (exit code 137 = 128 + 9).

🎯 **Interview:** *"Exit code 137 — what happened?"* → The process received SIGKILL, most often from the OOM killer or a memory limit. Exit code 143 = 128 + 15 = SIGTERM.

---

## 7. Networking commands (see [02-networking](../devops-cloud/02-networking.md) for the theory)

```bash
ip a                        # interfaces and IPs
ip r                        # routing table (default gateway)
ss -tulpn                   # listening TCP/UDP sockets + owning process
ss -tn state established    # active connections
curl -v http://localhost:8000/healthz   # full request/response
curl -sS -o /dev/null -w "%{http_code} %{time_total}s\n" https://api.example.com
dig +short api.example.com  # DNS
nc -zv db.internal 5432     # is the port reachable?
traceroute / mtr host       # path and where packets die
sudo tcpdump -i any port 5432 -nn   # watch packets
```

⚠️ **Gotcha — `127.0.0.1` vs `0.0.0.0`:** a server bound to `127.0.0.1` only accepts local connections. Inside a container, binding gunicorn to `127.0.0.1` means *nothing outside the container can reach it*. Bind to `0.0.0.0`.

---

## 8. Text processing — log analysis in one line

🧪 **Lab — top endpoints returning 5xx in an nginx access log (combined format):**

```bash
# $9 = status, $7 = path
awk '$9 ~ /^5/ {print $7}' /var/log/nginx/access.log \
  | sort | uniq -c | sort -rn | head
```

```bash
grep -c " 502 " access.log                       # count
grep -E "ERROR|CRITICAL" app.log | tail -50       # last errors
sed -n '/2026-09-23 10:00/,/2026-09-23 10:15/p' app.log   # time window
journalctl -u medilab-api -o json | jq -r '.MESSAGE' | grep -i timeout
tail -f app.log | grep --line-buffered ERROR     # live filter
```

| Tool | Best at |
|---|---|
| `grep` | Finding lines |
| `awk` | Working with columns and fields; small calculations |
| `sed` | Stream edits and substitution; printing line ranges |
| `sort \| uniq -c` | Counting occurrences |
| `jq` | JSON (az CLI output, kubectl `-o json`, structured logs) |

---

## 9. Package management and updates

```bash
sudo apt update && sudo apt upgrade -y      # Debian/Ubuntu
apt list --upgradable
sudo unattended-upgrades --dry-run          # automatic security patches
```

🏥 **Healthcare angle:** patching cadence is a compliance question. Be ready to say *how* you'd keep VMs patched: unattended-upgrades for security updates, Azure Update Manager for fleet visibility, and immutable images (rebuild instead of patching in place) where possible.

---

## 10. Gotchas summary

| Trap | Reality |
|---|---|
| `kill -9` first | It skips cleanup. Use SIGTERM, wait, then SIGKILL |
| Deleting a live log file | Space isn't freed. Rotate instead |
| `chmod 777` to "fix" permissions | A security hole. Find the right owner/group |
| Cron job works manually but not in cron | Cron's `PATH` and env are minimal. Use absolute paths, or a systemd timer |
| Low "free" memory = problem | Look at "available". Cache is reclaimable |
| High load = high CPU | It can be I/O wait. Check `wa` and `iostat` |

---

## 🎯 Quick-fire interview questions

1. How do you find which process is listening on port 8000? → `ss -tulpn | grep 8000` (or `lsof -i :8000`)
2. Difference between a hard link and a symlink? → A hard link is another name for the same inode (can't cross filesystems, survives deletion of the original). A symlink is a pointer to a path (breaks if the target moves).
3. How do you make a service start on boot? → `systemctl enable`
4. The server is slow. What do you check, in order? → `uptime` (load) → `top` (CPU/mem, `wa`) → `free -h` → `df -h` / `df -i` → `dmesg -T` → the app logs
5. What is `/proc`? → A virtual filesystem the kernel generates on the fly. It's how process and system info is exposed.
