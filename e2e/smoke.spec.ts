/**
 * Forgeline smoke suite (Phase 1 safety net).
 *
 * Runs against `npm run preview` (see playwright.config.ts). No external
 * network is allowed: anything outside localhost is aborted, except Groq,
 * which is mocked — the app must never need it in these flows.
 */
import { expect, test, type Page } from '@playwright/test';

const PROGRESS_KEY = 'forgeline:progress:v1';
const PRACTICE_KEY = 'forgeline:practice:v1';
const THEME_KEY = 'forgeline:theme';
const ARENA_KEY = 'forgeline:arena:v1';

const GROQ_MOCK = {
  choices: [{ message: { content: '{"score": 1, "feedback": "Mocked AI grade."}' } }],
  usage: { prompt_tokens: 10, completion_tokens: 10 },
};

let externalRequests: string[];
let groqCalls: string[];

async function guardNetwork(page: Page) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (!url.startsWith('http://') && !url.startsWith('https://')) return route.continue();
    if (url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1')) return route.continue();
    if (url.includes('api.groq.com')) {
      groqCalls.push(url);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GROQ_MOCK) });
    }
    externalRequests.push(url);
    return route.abort();
  });
}

test.beforeEach(async ({ page }) => {
  externalRequests = [];
  groqCalls = [];
  await guardNetwork(page);
});

test.afterEach(async () => {
  expect(externalRequests, 'unexpected external network requests').toEqual([]);
});

async function stored<T>(page: Page, key: string): Promise<T | null> {
  return page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : null;
  }, key);
}

test('home loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('home-title')).toBeVisible();
  await expect(page).toHaveTitle(/Forgeline/);
});

test('command palette searches and navigates', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('search-trigger').click();
  await page.getByTestId('palette-input').fill('closure');
  const results = page.getByTestId('palette-results').locator('li[data-idx]');
  await expect.poll(async () => results.count(), { message: 'palette shows results' }).toBeGreaterThan(0);
  await page.getByTestId('palette-input').press('Enter');
  await expect.poll(() => page.url(), { message: 'palette navigates away from home' }).not.toBe('http://localhost:4173/');
});

test('reading a guide marks it read', async ({ page }) => {
  const catalog = (await page.request.get('/data/catalog.json').then((r) => r.json())) as {
    topics: Array<{ pages: Array<{ key: string; url: string }> }>;
  };
  const target = catalog.topics.flatMap((t) => t.pages).find((p) => p.url.includes('/notes/'));
  expect(target, 'catalog has a guide page').toBeTruthy();
  await page.goto(target!.url);
  await page.getByTestId('mark-read').click();
  await expect(page.getByTestId('mark-read')).toContainText('Read');
  const state = await stored<{ pages: Record<string, { readAt?: number }> }>(page, PROGRESS_KEY);
  expect(state?.pages[target!.key]?.readAt, 'readAt persisted').toBeTruthy();
});

test('a flashcard review updates SM-2 state', async ({ page }) => {
  await page.goto('/flashcards');
  await page.getByTestId('flash-start').click();
  await expect(page.getByTestId('flashcard')).toBeVisible();
  // MCQ cards flip via an option; recall cards via Show answer.
  if (await page.getByTestId('show-answer').isVisible()) {
    await page.getByTestId('show-answer').click();
  } else {
    await page.getByTestId('flashcard').locator('[role="radio"]').first().click();
  }
  await page.getByTestId('grade-good').click();
  const state = await stored<{ cards: Record<string, { reps: number }>; reviews: Record<string, number> }>(page, PROGRESS_KEY);
  expect(Object.keys(state?.cards ?? {}).length, 'reviewed card stored').toBeGreaterThanOrEqual(1);
  expect(Object.values(state?.reviews ?? {}).reduce((a, b) => a + b, 0), 'review counted').toBeGreaterThanOrEqual(1);
});

test('a mock interview runs from setup to summary', async ({ page }) => {
  await page.goto('/mock');
  await expect(page.getByTestId('mock-setup')).toBeVisible();
  // MCQ-only keeps the run deterministic (no self-grading branch).
  await page.getByRole('button', { name: 'Interview Q&A' }).click();
  await page.getByRole('button', { name: 'Prep map' }).click();
  await page.getByRole('radio', { name: '5', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Interview Q&A' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('mock-start').click();
  for (let step = 0; step < 6; step++) {
    await expect(page.getByTestId('mock-run').or(page.getByTestId('mock-summary'))).toBeVisible();
    if (await page.getByTestId('mock-summary').isVisible()) break;
    await page.getByTestId('mock-options').locator('[role="radio"]').first().click();
    await page.getByTestId('mock-next').click();
  }
  await expect(page.getByTestId('mock-summary')).toBeVisible();
  const state = await stored<{ mocks: unknown[] }>(page, PROGRESS_KEY);
  expect(state?.mocks.length, 'mock result saved').toBe(1);
});

test('the arena runs to a result', async ({ page }) => {
  await page.goto('/arena');
  await expect(page.getByTestId('arena-setup')).toBeVisible();
  await page.getByTestId('arena-start').click();
  for (let step = 0; step < 12; step++) {
    await expect(page.getByTestId('arena-run').or(page.getByTestId('arena-over'))).toBeVisible();
    if (await page.getByTestId('arena-over').isVisible()) break;
    await page.getByTestId('arena-options').locator('[role="radio"]').first().click();
    await page.getByTestId('arena-next').click();
  }
  await expect(page.getByTestId('arena-over')).toBeVisible();
  const best = await stored<{ games: number }>(page, ARENA_KEY);
  expect(best?.games, 'arena game recorded').toBeGreaterThanOrEqual(1);
});

test('theme persists without a flash', async ({ page, context }) => {
  // Seed dark before first paint: the inline script in index.html must apply
  // it synchronously, so the very first read already shows dark.
  await page.addInitScript((key) => localStorage.setItem(key, 'dark'), THEME_KEY);
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.dataset.theme), 'theme applied pre-hydration').toBe('dark');
  await page.getByTestId('theme-toggle').click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  // A fresh page in the same context shares localStorage but not the seed
  // script, so it proves the toggled value persisted.
  const again = await context.newPage();
  await guardNetwork(again);
  await again.goto('/');
  expect(await again.evaluate(() => document.documentElement.dataset.theme), 'theme survives reload').toBe('light');
  expect(await again.evaluate((k) => localStorage.getItem(k), THEME_KEY)).toBe('light');
});

test('export/import round trip preserves progress', async ({ page }, testInfo) => {
  const catalog = (await page.request.get('/data/catalog.json').then((r) => r.json())) as {
    topics: Array<{ pages: Array<{ key: string; url: string }> }>;
  };
  const target = catalog.topics.flatMap((t) => t.pages).find((p) => p.url.includes('/notes/'));
  await page.goto(target!.url);
  await page.getByTestId('mark-read').click();
  await page.goto('/skills');
  const download = page.waitForEvent('download');
  await page.getByTestId('export-btn').click();
  const file = testInfo.outputPath('forgeline-export.json');
  await (await download).saveAs(file);
  // Wipe everything, then import the file back.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('import-file').setInputFiles(file);
  await expect(page.getByTestId('transfer-msg')).toContainText('Progress imported');
  const state = await stored<{ pages: Record<string, { readAt?: number }> }>(page, PROGRESS_KEY);
  expect(state?.pages[target!.key]?.readAt, 'read page restored by import').toBeTruthy();
});

test('the JS practice runner fails the starter and passes the solution', async ({ page }) => {
  await page.goto('/practice/dsa/two-sum');
  await page.getByTestId('practice-run').click();
  const results = page.getByTestId('practice-results');
  await expect(results).toBeVisible();
  await expect(results.getByText('Fail').first(), 'starter fails at least one case').toBeVisible();
  // Seed the reference solution as an editor draft, then run again.
  await page.evaluate(async ({ key, id }) => {
    const ch = await fetch('/data/pages/dsa/practice/two-sum.json').then((r) => r.json());
    const raw = localStorage.getItem(key);
    const state = raw ? JSON.parse(raw) : { version: 1, records: {} };
    state.records[id] = { attempts: 0, hintsUsed: 0, timeMs: 0, drafts: { javascript: ch.solution.code.javascript } };
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: PRACTICE_KEY, id: 'dsa/two-sum' });
  await page.reload();
  // Submit runs visible + hidden tests; the reference solution must clear all.
  await page.getByTestId('practice-submit').click();
  await expect(results).toBeVisible();
  const summary = await results.locator('.results-summary').innerText();
  const m = summary.match(/(\d+)\/(\d+) passed/);
  expect(m, `summary shows a pass count (got: ${summary})`).toBeTruthy();
  expect(Number(m![1]), 'solution passes every visible and hidden case').toBe(Number(m![2]));
  expect(Number(m![2])).toBeGreaterThan(0);
});

test('learning paths show steps and a next step', async ({ page }) => {
  await page.goto('/paths');
  await expect(page.getByTestId('paths-hub')).toBeVisible();
  await page.getByTestId('paths-hub').locator('.topic-card').first().click();
  await expect(page.getByTestId('path-detail')).toBeVisible();
  const next = page.getByTestId('next-step');
  await expect(next).toBeVisible();
  const href = await next.getAttribute('href');
  expect(href, 'next step links somewhere').toBeTruthy();
  await next.click();
  await expect.poll(() => page.url(), { message: 'next step navigates' }).toContain(href!.split('#')[0]);
});

test('the daily challenge shows on home and persists', async ({ page }) => {
  await page.goto('/');
  const card = page.getByTestId('daily-card');
  await expect(card).toBeVisible();
  await expect(card.locator('a.btn, .chip-good').first()).toBeVisible();
  const day = await stored<{ date: string; kind: string; topic: string }>(page, 'forgeline:daily:v1');
  expect(day?.topic, 'daily topic picked').toBeTruthy();
  const now = new Date();
  const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  expect(day?.date, 'daily date is today').toBe(localToday);
});

test('a study plan generates days and exports .ics', async ({ page }) => {
  await page.goto('/plan');
  await page.getByTestId('plan-form').getByLabel('Days available').fill('3');
  await page.getByTestId('plan-generate').click();
  await expect(page.getByTestId('plan-schedule')).toBeVisible();
  await expect(page.getByTestId('plan-day')).toHaveCount(3);
  const download = page.waitForEvent('download');
  await page.getByTestId('plan-export').click();
  const path = await (await download).path();
  expect(path, 'ics downloaded').toBeTruthy();
});

test('badges and the share card render on the skill map', async ({ page }) => {
  await page.goto('/skills');
  await expect(page.getByTestId('badges')).toBeVisible();
  await expect(page.getByTestId('badges').locator('.badge-item')).toHaveCount(12);
  await expect(page.getByTestId('skills-paths')).toBeVisible();
  await page.getByTestId('share-name').fill('Playwright');
  const download = page.waitForEvent('download');
  await page.getByTestId('share-download').click();
  expect(await (await download).path(), 'png downloaded').toBeTruthy();
});

test('text selection creates a highlight that survives reload', async ({ page }) => {
  const catalog = (await page.request.get('/data/catalog.json').then((r) => r.json())) as {
    topics: Array<{ pages: Array<{ key: string; url: string }> }>;
  };
  const target = catalog.topics.flatMap((t) => t.pages).find((p) => p.url.includes('/notes/'));
  await page.goto(target!.url);
  const para = page.locator('.prose p').first();
  await para.click({ clickCount: 3 });
  await expect(page.getByTestId('sel-toolbar')).toBeVisible();
  await page.getByTestId('hl-color-green').click();
  await expect(page.locator('mark[data-note-id]').first()).toBeVisible();
  await page.reload();
  await expect(page.locator('mark[data-note-id]').first(), 'highlight re-anchored after reload').toBeVisible();
  const notes = await stored<{ notes: Array<{ quote: string; orphaned: boolean }> }>(page, 'forgeline:notes:v1');
  expect(notes?.notes.length).toBe(1);
  expect(notes?.notes[0].orphaned).toBe(false);
  await page.goto('/notes');
  await expect(page.getByTestId('note-item')).toHaveCount(1);
  await expect(page.getByTestId('note-item').first()).toContainText(notes!.notes[0].quote);
});

test('AI card generation previews and accepts mocked cards', async ({ page }) => {
  await page.route('**/api.groq.com/**', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                cards: [
                  { type: 'recall', question: 'What is the temporal dead zone in one sentence?', answer: 'The period where a let/const binding exists but cannot be accessed.' },
                  { type: 'mcq', question: 'Which method copies an array?', answer: 'slice', options: ['slice', 'splice', 'split'], correctIndex: 0 },
                ],
              }),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 80 },
      }),
    }),
  );
  const catalog = (await page.request.get('/data/catalog.json').then((r) => r.json())) as {
    topics: Array<{ slug: string; pages: Array<{ key: string; url: string }> }>;
  };
  const topic = catalog.topics.find((t) => t.slug === 'javascript')!;
  await page.goto(topic.pages[0].url);
  await page.evaluate(() => localStorage.setItem('forgeline:groq:key', 'gsk_test'));
  await page.getByTestId('gen-open').click();
  await page.getByTestId('gen-start').click();
  await expect(page.getByTestId('gen-draft')).toHaveCount(2);
  await page.getByTestId('gen-accept').click();
  await expect(page.getByTestId('gen-cards')).toContainText('2 cards added');
  const customs = await stored<{ cards: Array<{ q: string; ai: boolean }> }>(page, 'forgeline:custom-cards:v1');
  expect(customs?.cards.length).toBe(2);
  expect(customs?.cards.every((c) => c.ai)).toBe(true);
  await page.goto('/flashcards');
  await expect(page.getByRole('heading', { name: 'Flashcards' })).toBeVisible();
  await expect(page.locator('.page-head')).toContainText('plus 2 of your own');
});

for (const { w, h, name } of [
  { w: 1440, h: 900, name: 'desktop' },
  { w: 390, h: 844, name: 'mobile' },
]) {
  test(`practice filters do not overflow (${name})`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/practice');
    await expect(page.locator('.practice-filters')).toBeVisible();
    const overflow = await page.evaluate(() => {
      const bar = document.querySelector('.practice-filters')!;
      const bb = bar.getBoundingClientRect();
      const bad: string[] = [];
      for (const el of bar.querySelectorAll('.field')) {
        const r = el.getBoundingClientRect();
        if (r.right > bb.right + 1 || r.left < bb.left - 1) bad.push('field box outside bar');
      }
      for (const el of bar.querySelectorAll('input, select')) {
        const r = el.getBoundingClientRect();
        if (r.right > bb.right + 1) bad.push(`${el.getAttribute('aria-label')}: control spills past bar`);
      }
      return bad;
    });
    expect(overflow).toEqual([]);
  });
}

for (const id of ['sorting', 'graph-traversal', 'event-loop', 'btree-index', 'hash-table']) {
  test(`visualizer ${id} loads and steps`, async ({ page }) => {
    await page.goto(`/visualize/${id}`);
    await expect(page.getByTestId('viz-detail')).toBeVisible();
    await page.getByTestId('viz-step').click();
    await expect(page.getByText(/Step 2\//)).toBeVisible();
  });
}

test('guides embed visualizers', async ({ page }) => {
  await page.goto('/topics/dsa/notes/01-complexity-and-core-structures');
  const embed = page.getByTestId('viz-embed-sorting');
  await embed.scrollIntoViewIfNeeded();
  await expect(embed.getByTestId('viz-step')).toBeVisible();
});

test('system design workspace saves and reveals', async ({ page }) => {
  await page.goto('/design');
  await expect(page.getByTestId('design-hub').locator('.topic-card')).toHaveCount(6);
  await page.getByTestId('design-hub').locator('.topic-card').first().click();
  await expect(page.getByTestId('design-workspace')).toBeVisible();
  await page.getByTestId('design-tab-workspace').click();
  await page.getByTestId('design-requirements').fill('Handle 40 writes/s and 4K reads/s.');
  await page.getByTestId('design-tab-rubric').click();
  await page.getByTestId('design-workspace').locator('.rubric-points input').first().check();
  await page.reload();
  await page.getByTestId('design-tab-workspace').click();
  await expect(page.getByTestId('design-requirements')).toHaveValue('Handle 40 writes/s and 4K reads/s.');
  await expect(page.locator('.diagram svg').first()).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('design-tab-model').click();
  await page.getByTestId('design-reveal').click();
  await expect(page.getByTestId('design-model')).toContainText('Trade-offs');
});

test('a mock interview with a coding round solves and scores', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/mock');
  await page.getByRole('button', { name: 'Interview Q&A' }).click();
  await page.getByRole('button', { name: 'Prep map' }).click();
  await page.getByRole('radio', { name: '5', exact: true }).click();
  // Frontend has exactly one runnable challenge, so the pick is deterministic.
  await page.getByRole('button', { name: /Frontend/ }).first().click();
  await page.getByRole('radiogroup', { name: 'Coding challenges' }).getByRole('radio', { name: '1', exact: true }).click();
  await page.getByTestId('mock-start').click();
  for (let step = 0; step < 6; step++) {
    await expect(page.getByTestId('mock-run').or(page.getByTestId('mock-summary')).or(page.getByTestId('mock-coding'))).toBeVisible();
    if (await page.getByTestId('mock-coding').isVisible()) break;
    if (await page.getByTestId('mock-summary').isVisible()) break;
    await page.getByTestId('mock-options').locator('[role="radio"]').first().click();
    await page.getByTestId('mock-next').click();
  }
  await expect(page.getByTestId('mock-coding')).toBeVisible();
  // Type the reference solution into the editor, then run the full round.
  const ch = (await page.request.get('/data/pages/frontend/practice/cx.json').then((r) => r.json())) as {
    solution: { code: Record<string, string> };
  };
  const editor = page.getByTestId('mock-coding').locator('.cm-content');
  await editor.click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
  await page.keyboard.type(ch.solution.code.javascript, { delay: 0 });
  await page.getByTestId('mock-code-run').click();
  await expect(page.getByText(/passed/)).toBeVisible();
  await page.getByTestId('mock-code-submit-tests').click();
  await expect(page.getByTestId('mock-code-next')).toBeEnabled({ timeout: 30_000 });
  await page.getByTestId('mock-code-next').click();
  await expect(page.getByTestId('mock-summary')).toBeVisible();
  await expect(page.getByTestId('mock-coding-results')).toContainText('100%');
  await expect(page.getByTestId('mock-coding-results').locator('pre code')).not.toBeEmpty();
});

test('the Python practice runner executes in the browser', async ({ page }) => {
  test.setTimeout(120_000);
  // Seed the reference solution first so the single run proves execution.
  await page.goto('/practice/python/word-counts');
  await page.evaluate(async ({ key, id }) => {
    const ch = await fetch('/data/pages/python/practice/word-counts.json').then((r) => r.json());
    const raw = localStorage.getItem(key);
    const state = raw ? JSON.parse(raw) : { version: 1, records: {} };
    state.records[id] = { attempts: 0, hintsUsed: 0, timeMs: 0, drafts: { python: ch.solution.code.python } };
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: PRACTICE_KEY, id: 'python/word-counts' });
  await page.reload();
  await page.getByTestId('practice-submit').click();
  const results = page.getByTestId('practice-results');
  await expect(results).toBeVisible({ timeout: 60_000 });
  const summary = await results.locator('.results-summary').innerText();
  const m = summary.match(/(\d+)\/(\d+) passed/);
  expect(m, `summary shows a pass count (got: ${summary})`).toBeTruthy();
  expect(Number(m![1]), 'python solution passes (runtime loaded, no classic-worker error)').toBe(Number(m![2]));
  expect(Number(m![2])).toBeGreaterThan(0);
});
