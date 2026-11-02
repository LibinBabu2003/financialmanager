# Private Finance Manager

A private, single-user, Telegram-first personal finance manager for irregular income, commitments, people-debt repayment, credit rebuilding, and an Exam Vault.

Current implementation: **Phase 1 — hosted foundation**.

Financial writes are deliberately disabled until the Phase 2 ledger, constraints, and Row Level Security are deployed.

## Local verification

```bash
npm install
npm run check
npm run build
```

Local execution is for development only. The delivered application is hosted on Vercel.

## Phase 1 endpoints

- `GET /api/health` — non-secret deployment and dependency readiness.
- `POST /api/telegram/webhook` — Telegram secret-header and owner-allowlist protected webhook.

The bot shell supports `/start`, `/help`, and `/status` only.

## Configuration

Copy `.env.example` to `.env.local` for local development and enter values locally. Never commit `.env.local` or paste credentials into chat, issues, screenshots, or documentation.

See [docs/PHASE_1_DEPLOYMENT.md](./docs/PHASE_1_DEPLOYMENT.md) for hosted setup and acceptance tests.

## Security boundaries

- The Telegram webhook requires the official secret-token header.
- Both Telegram user ID and chat ID must match the allowlist.
- Secrets are parsed server-side at request time and are never exposed to the browser.
- Incoming message bodies and credentials are not logged.
- CI runs a repository secret-pattern detector before lint, type-check, and tests.
- The production dependency audit currently contains no known vulnerabilities.

Owner-specific planning and calibration documents are stored locally in `phase-0/` and intentionally excluded from the public repository. They are never deployed with the application.
