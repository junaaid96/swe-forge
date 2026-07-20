---
id: software-engineering-interview-medium
level: medium
---

# Software Engineering — Interview (Medium)

> SOLID, architecture habits, and review culture. Pair with Deep theory / best-practices.

## Q1. Explain all five SOLID principles with a backend example.

**Answer:**
- **S**ingle Responsibility — one reason to change (OrderService should not also send email and open JDBC).
- **O**pen/Closed — extend via new Strategy classes, not endless switches.
- **L**iskov — subtypes must honor the parent contract (don’t make Ostrich.fly() throw).
- **I**nterface Segregation — small focused interfaces beat a 30-method God interface.
- **D**ependency Inversion — depend on abstractions; inject repositories, don’t `new` infra in domain code.

**Key takeaway:** SOLID is about change-safety and testability — illustrate with a service split you’ve actually done.

---

## Q2. What belongs in a Definition of Done?

**Answer:** Code merged with review, tests for the behavior, docs/ADR updated if design changed, lint/SAST green, feature flag or migration plan if needed, and observability (log/metric) for new failure modes. “Works on my machine” is not Done.

**Key takeaway:** DoD is a quality contract for the team, not a personal preference.

---

## Q3. How should you give and receive code review feedback?

**Answer:** Review for correctness, design, and risk — not nitpick style already enforced by formatters. Keep PRs small; respond within a team SLA. Comment on code, not people. As author: assume good intent, reply with context, and don’t take every suggestion as mandatory without discussion.

**Key takeaway:** Review is a learning + safety gate; small PRs make both possible.

---

## Q4. Conventional commits and branching — what do interviewers want to hear?

**Answer:** Meaningful commit messages that explain *why*; prefer trunk-based or short-lived feature branches over long-lived forks; protect main with CI. GitFlow is fine for release trains but slows continuous delivery if overused.

**Key takeaway:** History is communication; branching strategy must match release cadence.

---
