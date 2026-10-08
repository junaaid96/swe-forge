---
id: software-engineering-interview-basics
level: basics
---

# Software Engineering — Interview (Basics)

> Foundational questions on how software gets built well. Pair with Software Engineering Deep (theory / best practices / pitfalls).

## Q1. What are DRY, KISS and YAGNI?

**Answer:**
- **DRY (Don't Repeat Yourself):** every piece of *knowledge* (a business rule, a validation, a constant) should have one authoritative place. It's about duplicated knowledge, not identical-looking lines; merging code that only looks alike creates the wrong abstraction.
- **KISS (Keep It Simple):** prefer the simplest design that meets today's requirements; simple code is easier to read, test and change.
- **YAGNI (You Aren't Gonna Need It):** don't build features or extension points for imagined future needs; add them when a real requirement arrives.

**Key takeaway:** All three reduce the cost of change — and they pull against over-engineering as much as against sloppiness.

---

## Q2. What is technical debt, and how do you manage it?

**Answer:** Technical debt is the future cost of shortcuts or outdated design: it makes every later change slower or riskier, like interest on a loan. Some debt is deliberate (ship now, clean up after launch) and some is accidental (the design no longer fits). Manage it by making it visible (tickets with impact), paying it down continuously (the Boy Scout Rule, a slice of each sprint), prioritizing debt in code that changes often, and refactoring under test coverage.

**Key takeaway:** Debt isn't always bad; untracked debt in hot code paths is.

---

## Q3. Unit vs integration vs end-to-end tests?

**Answer:**
- **Unit tests** check one unit (a function or class) in isolation, with collaborators faked; they're fast and pinpoint failures.
- **Integration tests** check that components work together with real infrastructure (a real database via Testcontainers, a real HTTP layer).
- **End-to-end tests** drive the whole system like a user (e.g., Playwright in a browser); they're the most realistic and the slowest and flakiest.

The test pyramid says: many unit tests, fewer integration tests, a handful of E2E tests for critical journeys.

**Key takeaway:** Choose the cheapest test that would catch the bug you're worried about.

---

## Q4. What is refactoring, and when should you do it?

**Answer:** Refactoring changes the internal structure of code **without changing its external behaviour**, in small, safe steps (rename, extract method, move function, replace conditional with polymorphism). Do it when you're about to change code that's hard to understand ("make the change easy, then make the easy change"), when you see a code smell in code you're touching, and always with tests as a safety net. Keep refactoring commits separate from behaviour changes so reviews stay clear.

**Key takeaway:** Refactoring without tests is just editing and hoping.

---

## Q5. What makes a good code review?

**Answer:** As a reviewer, focus on correctness, design, readability, security and test coverage; leave formatting to automated tools. Be specific and kind, explain the *why*, and mark nits as optional. As an author, keep pull requests small and focused, describe what changed and why, self-review first, and respond to feedback without defensiveness. The team should agree on a response-time expectation so reviews don't block delivery.

**Key takeaway:** Small PRs plus a clear description make every other part of review work.

---

## Q6. Agile, Scrum and Kanban — what's the difference?

**Answer:** **Agile** is a set of values: deliver working software in small increments, collaborate with customers, and respond to change. **Scrum** is one Agile framework, with fixed-length sprints, defined roles (Product Owner, Scrum Master, developers) and events (planning, daily scrum, review, retrospective). **Kanban** is continuous flow: visualize work on a board, limit work in progress, and optimize cycle time, with no fixed iterations.

**Key takeaway:** Scrum fits feature teams that plan in increments; Kanban fits flow-based work such as support and operations.

---

## Q7. What does version control give a team, beyond backups?

**Answer:** A shared history of *why* the code changed (commits and messages), safe parallel work on branches, code review through pull requests, the ability to bisect regressions (`git bisect`) and revert bad changes, and a trigger for CI/CD. Good habits: small atomic commits with meaningful messages, short-lived branches, a protected main branch with required CI checks, and no secrets in the repository.

**Key takeaway:** Commit history is team communication; treat it like documentation.

---

## Q8. How would you structure an 8-week interview-prep plan?

**Answer:**
1. **Week 1 — Foundations:** programming fundamentals and SOLID, immutability, OS basics. Practice: explain SRP with a real service split; write an immutable `Money` type.
2. **Week 2 — Concurrency and patterns:** threads, locks and atomics; Factory, Decorator, Singleton, Observer. Practice: fix a lost-update counter; decorate a repository with metrics.
3. **Week 3 — Data and APIs:** databases and indexing, REST design, idempotency, caching. Practice: fix an N+1 query; design an `Idempotency-Key` flow; cache-aside with stampede control.
4. **Week 4 — Distributed building blocks:** messaging and streaming, networking, system design basics. Practice: outbox + idempotent consumer; sketch a URL shortener.
5. **Week 5 — Security and cloud:** OWASP Top 10, TLS/JWT/OAuth, cloud and DevOps basics. Practice: a JWT validation checklist; choose OAuth flows for an SPA vs a cron job.
6. **Week 6 — Quality and operations:** testing and TDD, observability, debugging. Practice: red → green → refactor on a domain rule; define a RED dashboard and an SLO.
7. **Week 7 — DSA patterns and design prompts:** hash maps, two pointers, sliding window, BFS/DFS, light DP; design a rate limiter, chat and notifications, always covering failure modes and metrics.
8. **Week 8 — Mocks and behavioral:** full mock loops (coding + design + STAR stories on ownership, conflict and failure); revisit weak topics and retake quizzes until you score 80% or more.

**Key takeaway:** Alternate learning with practice every week, and finish with full mock interviews rather than more reading.
