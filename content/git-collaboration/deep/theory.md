---
id: git-collaboration-deep-theory
track: theory
---

# Git & Collaboration — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Git

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Core Commands

Stage & commit:
git add -p                # interactive staging — add specific hunks, not entire files
git commit -m "..."       # commit with message
git commit --amend        # fix last commit message OR add a forgotten file

Branch:
git checkout -b feature/x     # create + switch in one command
git branch -d feature/x       # delete branch after merge

Sync with remote:
git fetch origin               # download changes, DON'T merge (safe to inspect first)
git pull --rebase origin main  # fetch + rebase local commits on top (cleaner history)
git push --force-with-lease    # safe force push — fails if remote has new commits

History:
git log --oneline --graph --all  # visual branch tree in terminal
git blame File.java              # who changed each line, and when
git diff main..feature/x         # all changes between branches

### Branching Strategies

GitFlow: main + develop + feature/* + release/* + hotfix/*.
Good for products with scheduled release cycles. Complex — many long-lived branches.
Feature PR → develop. Release PR → main + develop. Hotfix → main + develop.

Trunk-Based Development (TBD): everyone commits to main (or <1 day feature branches).
Requires: feature flags for incomplete work, fast CI (<10min), comprehensive tests.
Benefits: no merge conflicts, always-shippable main, fast feedback loops.
Preferred for modern CI/CD teams.

GitHub Flow (most common for web apps): main + feature branches + PR → deploy.
Simple and effective. No separate develop branch.

At eGeneration: likely GitHub Flow or GitFlow with feature branches + PRs into develop/main.

### Rebase vs Merge

Merge: creates a merge commit, preserves full history, non-destructive.
git merge feature/x
→ Result: feature history intact + merge commit visible. Safe for shared branches.

Rebase: replays feature commits on top of target, linear history, no merge commit.
git rebase main
→ Result: feature commits rewritten on latest main. Clean, linear.

GOLDEN RULE: NEVER rebase a branch that others are working on.
Rebase rewrites commit SHAs. Co-workers' branches break if you force-push.

When to use:
• Rebase your feature branch on main before raising a PR (clean history)
• Merge when integrating completed feature into main or develop

Interactive rebase (git rebase -i HEAD~3):
pick = keep, squash = merge with previous, reword = edit message, drop = delete.

### Conventional Commits & Recovery

Format: type(scope): description

Types: feat, fix, docs, style, refactor, test, chore, perf, ci
Examples:
feat(auth): implement JWT refresh token rotation
fix(order): prevent duplicate creation on concurrent retry
refactor(payment): extract bKash gateway into adapter
chore(deps): upgrade Spring Boot 3.1 → 3.3

Benefits: auto-generate CHANGELOG, enable semantic versioning, clear PR history.

Recovery commands:
git stash / git stash pop           # shelve and restore uncommitted changes
git cherry-pick <sha>               # apply one specific commit to current branch
git bisect start/bad/good <sha>     # binary search for bug-introducing commit
git reflog                          # ALL HEAD movements — recover "lost" commits
git reset --soft HEAD~1             # undo last commit, keep changes staged (safe)
git revert <sha>                    # new commit that undoes another (safe on shared branches)

### Practical code

```
# ── Complete feature workflow ─────────────────────────────
# 1. Start fresh from updated main
git checkout main && git pull --rebase origin main
git checkout -b feature/patient-bulk-import

# 2. Atomic, conventional commits
git add src/main/java/com/egeneration/patient/
git commit -m "feat(patient): add CSV bulk import endpoint"

git add src/test/
git commit -m "test(patient): add unit tests for bulk import service"

git add src/main/resources/db/migration/
git commit -m "chore(db): add import_log table migration V12"

# 3. Sync with main before PR (prevent conflicts)
git fetch origin && git rebase origin/main
# On conflict: edit file → git add → git rebase --continue

# 4. Clean up WIP commits before PR (squash into logical units)
git rebase -i HEAD~4
# Editor opens:
#   pick a1b2c3 feat(patient): add CSV bulk import endpoint
#   squash d4e5f6 fix typo in import service         ← merge into previous
#   squash 789abc forgot to add null check            ← merge into previous
#   pick 012def test(patient): add unit tests

# 5. Push and open PR
git push origin feature/patient-bulk-import --force-with-lease
# --force-with-lease: rejects if remote has new commits — much safer than --force

# ── Recovery commands ──────────────────────────────────────
# Undo last commit, keep changes staged (safe)
git reset --soft HEAD~1

# Recover a "lost" commit after accidental reset
git reflog                             # find SHA of lost commit: e.g. abc1234
git checkout -b recovery-branch abc1234  # create branch from that exact point

# Find which commit introduced a bug (binary search — 7 steps for 100 commits!)
git bisect start
git bisect bad HEAD                    # current state is broken
git bisect good v2.1.0                # last known working version
# Git checks out midpoint → test it → git bisect good OR git bisect bad
# Repeat until Git prints: "abc1234 is the first bad commit"
git bisect reset

# .gitignore for Spring Boot
# target/  *.class  .env
# application-local.yml   ← local overrides, NEVER commit API keys or passwords!
# .idea/   *.iml   logs/
```

### Tips

- git reflog is your safety net — almost nothing in Git is truly lost within 30 days of doing it
- --force-with-lease is always safer than --force: it rejects the push if someone else pushed to that branch since your last fetch
- Never commit secrets — .env, passwords, API keys. Use Spring profiles + environment variables. Add *.env to .gitignore immediately.
- git bisect is underrated: binary search through 128 commits finds the breaking one in just 7 steps (log₂ 128 = 7)
