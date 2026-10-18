# Security policy

## Supported versions

Only the latest version on the `main` branch (deployed at https://swe-forge.vercel.app/) receives security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Email **codejborg@junaidul.pro.bd** with:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept helps),
- the browser and version you used.

You can expect an acknowledgement within a few days and a fix or mitigation plan once the report is confirmed. Please give us reasonable time to fix the issue before disclosing it publicly.

## Scope notes

- Forgeline is a static site with no backend and no accounts. Progress is stored in your browser's `localStorage`.
- The Practice Lab runs your own code in sandboxed Web Workers with network access neutralised. It is designed to stop accidents, not a determined attacker running their own code against their own session (see the README for the honest limits).
- AI keys (Groq) are bring-your-own, stay in the browser, and are never exported or synced.
