---
id: testing-quality-deep-best-practices
track: best-practices
---

# Testing & Quality — Deep: Best Practices

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## TDD — Test-Driven Development

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### What TDD is (and is not)

TDD: write a failing test (red), write the minimal code to pass (green), improve design (refactor) while tests stay green.

TDD is not write tests after if you have time. It is a design feedback loop. It is also not 100% coverage theater — you still pick meaningful behaviors.

Use TDD heavily for domain logic and pure transforms; use broader tests for framework wiring.

### The cycle in practice

1) Name a behavior: reject negative payment amounts
2) Write a test that fails for the right reason
3) Implement the simplest fix
4) Refactor names/structure
5) Next behavior

Keep tests in AAA form: Arrange, Act, Assert. One logical assertion theme per test.

### Test doubles without over-mocking

Stub: returns canned data.
Mock: verifies interactions.
Fake: in-memory repo.

Over-mocking leads to brittle tests that mirror implementation. Prefer fakes for repositories when exercising domain services; mock only awkward boundaries (payment gateway, clock, random).

### Outside-in vs inside-out

Inside-out: start from domain units.
Outside-in (ATDD): start from an acceptance test, discover collaborators.

For APIs: one acceptance test for the happy path + focused unit TDD for rules (discounts, eligibility).

### Characterizing legacy code

Cannot TDD a ball of mud instantly. Add characterization tests that lock current behavior, then refactor under that safety net, then grow TDD for new features.

Seams: extract pure functions, introduce interfaces at I/O boundaries.

### CI and team habits

Tests must be deterministic and fast. Flakes destroy trust.
TDD works when the team protects the red-green-refactor rhythm in PRs — not when coverage badges replace thinking.

### Practical code

```
@Test
void rejectsNegativeAmount() {
  PaymentService svc = new PaymentService(new FakeGateway());
  assertThrows(InvalidPaymentException.class,
    () -> svc.charge(new Money(new BigDecimal("-1"), USD)));
}

public Receipt charge(Money m) {
  if (m.amount().signum() < 0) throw new InvalidPaymentException();
  return gateway.charge(m);
}
```

### Tips

- Fail for the right reason — a wrong compile error is not a good red.
- Refactor only on green; never mix refactor with new behavior.
- Prefer fakes over heavy mocks for repositories.
- Characterization tests unlock legacy refactors safely.
