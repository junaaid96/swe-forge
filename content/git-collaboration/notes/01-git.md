# 03 · Git for DevOps

> As a developer you use Git daily. The DevOps angle is Git as the **source of truth for deployments**: branching models that drive pipelines, tags that map to releases, and what to do when a secret gets committed.

---

## 1. Git under the hood (one minute)

- Git stores **snapshots**, not diffs. Objects: **blob** (file content), **tree** (a directory), **commit** (a tree + parent(s) + metadata), **tag**.
- Every object is addressed by its hash. That's why a commit SHA is an immutable pointer, and why CI pins to SHAs.
- A **branch** is just a movable pointer to a commit. `HEAD` points to the current branch.

🎯 **Interview:** *"Why do pipelines tag images with the commit SHA and not the branch name?"* → A SHA is immutable and traceable. From a running container you can find the exact code. A branch name moves.

---

## 2. Branching strategies

| | Trunk-based | GitHub Flow | GitFlow |
|---|---|---|---|
| Shape | Everyone merges to `main` at least daily; short-lived branches | Feature branch → PR → `main` → deploy | `develop`, `feature/*`, `release/*`, `hotfix/*`, `main` |
| Release | From `main`, often continuously | From `main` | From `release/*` branches |
| Needs | Strong CI, **feature flags** | Good CI | Discipline; suits scheduled releases |
| Merge pain | Low | Low | High (long-lived branches drift) |
| DevOps fit | ✅ Best for CI/CD | ✅ Good | ⚠️ Heavier; common in agencies with versioned client releases |

**How branches map to environments (a typical setup):**

```
PR opened        → CI: lint, test, build, scan (no deploy)
merge to main    → build image :<sha> → deploy to DEV automatically
tag v1.4.0       → promote the SAME image to STAGING → manual approval → PROD
```

⚠️ **Gotcha — rebuilding per environment:** build the image **once** and promote the *same artifact* through environments. Rebuilding for prod means prod runs something you never tested.

---

## 3. Merge vs rebase vs squash

| | Merge commit | Rebase | Squash merge |
|---|---|---|---|
| History | True, with merge bubbles | Linear, rewritten | One commit per PR |
| Rewrites commits? | No | Yes (new SHAs) | Yes (new single commit) |
| Safe on shared branches? | ✅ | ❌ Never rebase what others have pulled | ✅ (done at PR merge time) |
| Good for | Preserving exact history | Cleaning up *your own* branch before a PR | Clean `main`, one PR = one revertable unit |

---

## 4. Undoing things — especially on `main`

| Command | What it does | Use on shared branches? |
|---|---|---|
| `git revert <sha>` | Creates a **new** commit that undoes `<sha>` | ✅ Yes — the safe way to roll back prod code |
| `git reset --soft <sha>` | Moves the branch pointer; keeps changes staged | Local only |
| `git reset --hard <sha>` | Moves the pointer and **discards** changes | ❌ Local only, dangerous |
| `git restore <file>` | Discards working-directory changes to a file | Local |
| `git reflog` | Shows where HEAD has been. Recovers "lost" commits | Your safety net |

🎯 **Interview:** *"A bad commit reached main and was deployed. How do you roll back?"* → Fastest: **roll back the deployment** to the previous image (`helm rollback`, `kubectl rollout undo`, or redeploy the previous SHA). Then fix the code with `git revert` so `main` matches reality. Don't force-push `main`.

---

## 5. Tags and versioning

```bash
git tag -a v1.4.0 -m "Release 1.4.0: report PDF watermark"
git push origin v1.4.0
git describe --tags          # v1.4.0-3-gabc1234 (3 commits after v1.4.0)
```

**SemVer:** `MAJOR.MINOR.PATCH`: breaking change . new feature . bug fix.

---

## 6. A secret was committed — incident response

🧪 Walk through this order. **Order matters:**

1. **Rotate/revoke the secret immediately.** Assume it's compromised the moment it was pushed. Bots scan public GitHub within minutes.
2. Check the access logs for the secret's usage window.
3. *Then* remove it from history (`git filter-repo --replace-text` or BFG) and force-push. Tell the team to re-clone. Note that forks and caches may keep it, which is why step 1 comes first.
4. Prevent it next time: **pre-commit hooks** (gitleaks), GitHub **push protection** / secret scanning, and `.gitignore` for `.env`.

⚠️ **Gotcha:** deleting the file in a new commit does nothing. It's still in history.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.x.x        # pin a real tag or SHA
    hooks:
      - id: gitleaks
```

---

## 7. Repo hygiene that DevOps owns

- **Branch protection on `main`:** require PR review, required status checks (CI green), no force-push, linear history optional
- **CODEOWNERS:** e.g., `/infra/ @devops-team` so infrastructure changes get reviewed by the right people
- **Conventional commits** (`feat:`, `fix:`, `chore:`) → automatic changelogs and version bumps
- **Monorepo vs polyrepo:**

| | Monorepo | Polyrepo |
|---|---|---|
| Atomic cross-service changes | ✅ | ❌ |
| CI complexity | Needs path filters (`paths:` in Actions) | Simpler per repo |
| Access control | Coarser | Per repo |

---

## 8. Commands worth having in muscle memory

```bash
git log --oneline --graph --decorate -20
git log -p -- path/to/file            # history of one file
git blame -L 40,60 settings.py        # who changed these lines
git bisect start; git bisect bad; git bisect good v1.3.0   # binary-search a regression
git stash push -m "wip"; git stash pop
git cherry-pick <sha>                 # e.g., backport a hotfix to a release branch
git diff main...feature               # changes since the branch diverged
```

---

## 🎯 Quick-fire interview questions

1. Fetch vs pull? → `fetch` downloads refs and objects only. `pull` = fetch + merge (or rebase).
2. What's a detached HEAD? → HEAD points at a commit, not a branch. It's what CI checkouts typically do.
3. How would you find which commit introduced a bug? → `git bisect`
4. How does a pipeline know what changed in a monorepo? → Path filters, or `git diff --name-only $BASE...$HEAD`
5. What's GitOps? → Git is the source of truth for *desired cluster state*, and an in-cluster agent (Argo CD / Flux) pulls and reconciles it. See [07-cicd](../devops-cloud/06-cicd.md) §7.
