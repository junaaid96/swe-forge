# Contributing to Forgeline

Thanks for helping improve Forgeline! Content fixes, new topics, Practice Lab challenges and bug fixes are all welcome.

## Getting started

```bash
git clone https://github.com/junaaid96/swe-forge.git
cd swe-forge
npm install
npm run dev        # compiles content, then starts Vite on http://localhost:5173
```

Requires Node 20+ (tested on Node 22).

## Before you open a pull request

```bash
npm run validate   # content validator + every Practice Lab reference solution
npm run lint       # oxlint
npm run build      # type-check and production build
npm run e2e        # Playwright smoke suite (needs a build first: npm run build)
```

CI runs the same checks on every push and pull request.

## Content guidelines

- Content is plain Markdown under `content/`. Do not paste tool-generated markup such as citation tags.
- Write explanations from scratch. Roadmap topic checklists are inspired by [roadmap.sh](https://roadmap.sh/); do not copy text from it or from other sites.
- Keep facts current (2026). Cite versions, not "latest".
- Interview files use `## Q1. Question` headings with `**Answer:**`, `**Example:**`, `**Key takeaway:**` sections.
- See the *Content model* section of the README for the folder layout, and *Practice Lab sandbox* for how challenges are written (every reference solution must pass its own tests).

## Pull request checklist

- [ ] One focused change per PR, with a clear description
- [ ] `npm run validate`, `npm run lint` and `npm run build` pass
- [ ] New UI works in light and dark themes and on mobile
- [ ] No secrets, API keys or personal data committed

## Reporting bugs and ideas

Use the [issue templates](https://github.com/junaaid96/swe-forge/issues/new/choose). For security problems, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
