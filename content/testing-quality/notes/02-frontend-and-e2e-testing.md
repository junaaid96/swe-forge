# Frontend, Integration & E2E Testing

The testing strategy guide covers the pyramid and backend tactics. This guide is about testing user interfaces: component tests that resemble how people use the app, mocking the network, end-to-end suites that don't flake, and the extra safety nets (contract and visual regression tests).

---

## 1. Shape of a healthy suite

| Layer | Share | Tools | Purpose |
|---|---|---|---|
| Unit | many (~70%) | Vitest / Jest | pure logic, hooks, utilities |
| Integration / component | some (~20%) | React Testing Library + MSW | components with real children, real routing, mocked network |
| End-to-end | few (~10%) | Playwright, Cypress, Selenium | critical user journeys against a running app |

Anti-patterns: the **ice-cream cone** (mostly manual and E2E tests, few unit tests) and suites with no integration layer, where units pass but the wiring breaks. The "testing trophy" view argues integration tests give the best confidence per minute for frontends.

> **Asked as:** "Explain the testing pyramid." · "How do you decide what to test at which level?"

---

## 2. Component tests with React Testing Library

Guiding principle: *the more your tests resemble the way your software is used, the more confidence they give you.* Query by role and label, interact like a user, assert on what the user sees.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('submits the login form', async () => {
  const user = userEvent.setup();
  const onLogin = vi.fn();
  render(<LoginForm onLogin={onLogin} />);

  await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
  await user.type(screen.getByLabelText(/password/i), 'hunter2!');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(onLogin).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'hunter2!' });
  expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
});
```

| Choice | Prefer | Because |
|---|---|---|
| Queries | `getByRole`, `getByLabelText`, `getByText` | accessible queries double as accessibility checks |
| Fallback | `getByTestId` | only when no accessible handle exists |
| Interaction | `userEvent` | simulates full sequences (focus, keydown, input, keyup); `fireEvent` dispatches a single event |
| Async | `findBy*`, `waitFor` | wait for UI to settle instead of sleeping |
| Absence | `queryBy*` + `not.toBeInTheDocument()` | `getBy*` throws when missing |

Avoid testing implementation details (state variable names, internal methods, CSS classes); refactors should not break tests.

## 3. Mocking

- **Network:** Mock Service Worker (**MSW**) intercepts `fetch`/XHR at the network layer, so the same handlers work in tests, Storybook and local development.

```ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
export const server = setupServer(
  http.get('/api/user', () => HttpResponse.json({ id: 1, name: 'Ada' })),
);
beforeAll(() => server.listen()); afterEach(() => server.resetHandlers()); afterAll(() => server.close());
// per-test override:
server.use(http.get('/api/user', () => new HttpResponse(null, { status: 500 })));
```

- **Modules:** `vi.mock('./analytics')` / `jest.mock` for side-effectful modules; mock child components only when they are heavy or irrelevant.
- **Test doubles vocabulary:** *stub* returns canned data, *mock* verifies calls, *spy* wraps the real thing and records calls, *fake* is a working lightweight implementation (in-memory repo).

## 4. Snapshot tests

Useful for small, stable output (serialisers, error messages). Large component snapshots become noise that people update blindly. Keep them small, review diffs, and prefer explicit assertions.

---

## 5. End-to-end tests

```ts
// Playwright
import { test, expect } from '@playwright/test';
test('checkout happy path', async ({ page }) => {
  await page.goto('/products');
  await page.getByRole('button', { name: 'Add Coffee to cart' }).click();
  await page.getByRole('link', { name: 'Cart (1)' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
});
```

### 5.1 Selectors

Prefer role/label/text locators; use `data-testid` for elements without accessible names. Never select by styling classes or deep CSS paths; they change with every redesign.

### 5.2 Page Object Model

Wrap pages in classes that expose intent-level actions (`loginPage.signIn(user)`), so tests read like scenarios and selectors live in one place.

```ts
export class LoginPage {
  constructor(private page: Page) {}
  async signIn(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}
```

### 5.3 Preventing flaky tests

- Wait on conditions (auto-waiting locators, `expect(...).toBeVisible()`), never fixed `sleep`s.
- Isolate state: fresh user/session per test, seed data through APIs, reset the database between runs.
- Make data deterministic: fixed clocks, seeded randomness, stable test accounts.
- Retry only as a diagnostic aid (Playwright `retries`, trace on first retry) and fix the root cause; quarantine flaky tests visibly.
- Run in parallel with sharding in CI, and record traces/videos on failure.

---

## 6. Beyond functional tests

| Technique | What it catches | Tools |
|---|---|---|
| **Contract testing** | provider API changes that break consumers | Pact (consumer-driven contracts), schema checks against OpenAPI |
| **Visual regression** | unintended UI changes | Percy, Chromatic (Storybook), Playwright `toHaveScreenshot()` |
| **Accessibility checks** | missing labels, contrast, ARIA misuse | axe-core (`@axe-core/playwright`, jest-axe), Lighthouse |
| **Mutation testing** | tests that execute code but assert nothing useful | Stryker |
| **Coverage** | untested branches | v8/istanbul coverage; aim for meaningful ~80% on core logic, not 100% everywhere |
| **API/integration tests** | full request/response cycles | Supertest (Node), MockMvc/TestRestTemplate (Spring), Testcontainers for real databases |
