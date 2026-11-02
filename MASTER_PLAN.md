# AI Personal Finance Manager — Deployment-First Master Plan

Version: 1.0  
Prepared: 2 November 2026  
Primary timezone: Asia/Kolkata  
Primary currency: INR  
Status: Planning baseline; update this document before implementation when requirements change.

## 1. Product outcome

Build a private, single-user personal-finance manager that is useful from Telegram, is deployed from the first usable phase, and can run at zero monetary cost while it remains inside current provider free-tier limits.

The system will:

- log income, expenses, transfers, credit-card activity, EMIs, money lent/borrowed, repayments, and Exam Vault allocations;
- understand English and Manglish text, followed later by voice notes and payment screenshots;
- calculate budgets, runway, income allocation, debt plans, card utilization, and affordability deterministically;
- send reminders and digests through Telegram;
- expose a private dashboard after the chat workflow is reliable;
- reconcile its ledger with real balances and support encrypted backups and export.

This is a decision-support and record-keeping tool, not licensed financial, credit, tax, or investment advice. It must never promise a CIBIL score change.

## 2. Non-negotiable engineering rules

1. **Deployed-first:** beginning in Phase 1, every accepted phase must work on hosted staging and then production. Local execution is only a development aid, never the delivered outcome.
2. **One phase at a time:** do not start the next phase until the current exit gate passes and evidence is saved.
3. **Code owns all money math:** Gemini may extract intent and phrase explanations; it must never calculate balances, allocations, budgets, payoff dates, or YES/NO affordability verdicts.
4. **Amounts are integer paise:** store INR 45.50 as `4550`; never use floating point for money.
5. **UTC in storage, IST in product:** store timestamps as `timestamptz`; calculate user-facing periods in `Asia/Kolkata`.
6. **No silent guessing:** low-confidence extraction requires confirmation. Missing account, person, date, direction, or amount must be clarified.
7. **Append-only financial history:** correct errors with reversals and replacement entries. Do not hard-delete posted transactions.
8. **Idempotent external events:** Telegram `update_id`, callback IDs, scheduler run keys, and payment reference IDs must have unique constraints.
9. **Least privilege:** browser code uses only the Supabase publishable key under RLS. The Supabase secret key stays server-side and every privileged endpoint performs its own authorization.
10. **No sensitive logs or files:** never log message bodies, tokens, card numbers, screenshots, audio, or full AI prompts. Media is processed in memory and is not persisted by this application.
11. **No card credentials:** never accept or store CVV, PIN, OTP, internet-banking password, UPI PIN, or full card/account numbers.
12. **Provider portability:** Gemini model ID, thresholds, timezone, and reminder rules are configuration, not hard-coded assumptions.

## 3. Important meaning of “completely free”

The target is **zero monetary cost under current free-tier allowances**, not a guarantee that third-party pricing will never change.

- Vercel Hobby is suitable only for a personal, non-commercial project.
- Supabase Free may pause a low-activity project and does not include downloadable automatic backups.
- Gemini free-tier quotas vary by model/account, and free-tier content may be used by Google to improve its products.
- Cloudflare Worker limits and all other quotas can change.
- A monthly automated quota/configuration check and a documented migration path are therefore part of the product.

If “financial data must not be used for model improvement” is mandatory, a fully free remote Gemini design is not acceptable. The choices are: disable AI for sensitive inputs, accept the free-tier privacy trade-off, or use a paid/API tier whose terms meet the requirement. This decision is a gate before real multimodal data is tested.

## 4. Locked baseline architecture

| Concern | Choice | Reason |
|---|---|---|
| Source repository | Private GitHub repository under a personal account | CI/CD, versioned migrations, and free personal workflow allowance |
| Application | Next.js + TypeScript on Vercel Hobby | One repository for webhook API, engine, and dashboard |
| Chat | Telegram Bot API webhook | Free, immediate, text/voice/photo capable |
| Database and auth | Supabase Postgres + Auth + RLS | Relational integrity and row-level authorization |
| AI extraction | Current stable Gemini free-tier Flash/Flash-Lite model through `GEMINI_MODEL` | Structured multimodal extraction without coupling to one retiring model |
| Initial AI model | `gemini-3.5-flash-lite`, subject to an availability test at setup | Stable, multimodal, structured output, free-tier pricing at plan date |
| Scheduled wake-up | Cloudflare Worker Cron every 15 minutes | Vercel Hobby cron cannot run more than daily; external calls also provide activity |
| Tests | Vitest unit/property tests + integration tests + Playwright dashboard smoke tests | Fast logic verification and deployed end-to-end checks |
| Validation | Zod schemas plus database constraints | Reject malformed AI and API output before it reaches the ledger |
| Backup | Weekly GitHub Action: `pg_dump`, public-key encrypt, retain encrypted artifact/snapshot | Supabase Free has no downloadable managed backup |
| Observability | Sanitized structured events in Postgres plus provider logs | Avoid introducing a paid dependency or logging finance content |

Use two Supabase Free projects if the account has both slots available:

- `finance-staging`: synthetic data only; preview and integration tests.
- `finance-production`: real user data only; production deployment.

If two free projects are unavailable, use one production project and run tests against isolated test-user rows with mandatory cleanup; never run destructive schema experiments against production.

## 5. Financial domain model

Do not treat actual money and budget labels as the same thing.

### 5.1 Actual balances

- `accounts`: cash, bank, wallet, credit card, and optional receivable/payable control accounts.
- `transactions`: immutable business event header, source, status, occurred time, note, and idempotency keys.
- `postings`: signed account movements belonging to a transaction.
- A transfer has equal and opposite postings and does not create income or expense.
- A credit-card purchase increases card liability and records an expense; a card payment decreases bank cash and card liability without creating another expense.

### 5.2 Categories and budgets

- `categories`: expense/income classification and aliases.
- `budget_periods`, `budget_caps`, `budget_events`: weekly/monthly limits and alert history.
- `envelopes` and `envelope_allocations`: virtual assignments such as Essentials, Exam Vault, Debt Repayment, and Discretionary.
- Envelope allocations do not move bank money unless a real transfer to a separate account is recorded.

### 5.3 Commitments, debts, and credit

- `commitments`: rent, recharge, subscriptions, EMI, minimum card payments, due dates, recurrence, priority.
- `people`, `peer_debts`, `debt_payments`: both money owed by the user and money owed to the user; partial payments and reversals supported.
- `credit_cards`, `card_statements`, `credit_score_snapshots`: limits, statement/due dates, outstanding, utilization target, and manually supplied score history.
- `exam_goals`: target amount/date, current virtual allocation, priority, and pause rules.

### 5.4 Reliability and audit

- `telegram_updates`: one row per `update_id` before processing.
- `processing_jobs`: retry state, next attempt, attempt count, sanitized error code, and dead-letter state.
- `outbox_messages`: Telegram replies with dedupe keys and delivery status.
- `confirmations`: proposed structured entries awaiting the user's approval.
- `alert_events`: one-time-per-threshold/per-period enforcement.
- `audit_events`: who/what changed configuration, without storing secrets or raw sensitive content.
- Every domain table carries `user_id`; RLS isolates that user even though v1 is single-user.

### 5.5 Core invariants

1. For every balanced transaction, the sum of postings is zero under the selected accounting representation.
2. A transfer changes account composition but not net worth or income/expense totals.
3. `bank/cash assets - liabilities` equals computed liquid net position from ledger postings.
4. `sum(virtual envelope balances) + unallocated = allocatable liquid cash`; envelopes cannot allocate the same rupee twice.
5. A credit-card payment never counts as a second expense.
6. A repayment cannot exceed an open peer-debt balance unless explicitly confirmed as an overpayment/adjustment.
7. Income waterfall allocations sum exactly to the allocatable income event, including rounding remainder.
8. Posted transactions are changed only by reversal/replacement, with a complete audit link.
9. The same external event can be replayed any number of times with exactly one financial result.

## 6. Delivery workflow and evidence standard

For every phase:

1. create a small issue/checklist from this document;
2. add migrations and tests before or with behavior;
3. pass lint, type-check, unit, and relevant integration tests in CI;
4. deploy to staging and run the phase's hosted acceptance script;
5. deploy the same commit to production;
6. save `evidence/phase-N.md` containing commit SHA, deployment URL, test output summary, bot transcript/screenshots with sensitive data redacted, known limitations, and rollback instructions;
7. obtain user acceptance before the next phase.

Every production change must be recoverable by reverting the application deployment and, for schema changes, by a tested forward-fix migration. Avoid destructive down-migrations on financial data.

## 7. Phase plan

### Phase 0 — Requirements freeze and financial calibration

**Build/decide**

- Confirm this is single-user, personal, non-commercial use.
- Define opening bank/cash/wallet/card balances and the reconciliation date.
- Define categories, aliases, Manglish examples, accounts, people debts, cards, EMIs, fixed bills, Exam Vault goal/date, essential reserve floor, quiet hours, and utilization target.
- Decide week start, monthly period boundaries, rounding remainder priority, and whether carry-over is allowed per category.
- Define the P0-P5 waterfall percentages/floors and the debt “tightness guard.”
- Record privacy acceptance: common text will use deterministic parsing first; ambiguous text/media may be sent to Gemini free tier.
- Put only fake/sample values in Git. Real initialization data goes through a protected setup command/page directly into production.

**Hosted test/outcome**

- No application deploy is required yet.
- Produce an approved configuration sheet using fake examples and at least 30 labeled input sentences: expense, income, transfer, card charge/payment, EMI, loan given, borrowed, repayment, correction, and ambiguous cases in English/Manglish.
- Hand-calculate five “golden scenarios,” including zero income for one month and a card statement-utilization example.

**Exit gate**

- No undefined financial term remains.
- Expected outputs for all golden scenarios are approved.
- Privacy choice is explicitly recorded.

### Phase 1 — Hosted foundation, CI/CD, and private bot shell

**Build**

- Create the private repo, Next.js TypeScript app, formatting/lint/type-check/test scripts, environment schema, and CI.
- Create staging/production Vercel projects or environments and corresponding Supabase projects.
- Add `/api/health` returning build SHA and dependency health without secrets.
- Create the Telegram bot; register the HTTPS webhook with Telegram's secret-token header.
- Enforce both allowed Telegram user ID and chat ID. Return a generic response or ignore all other senders.
- Add `/start`, `/help`, and `/status`; do not add financial writes yet.
- Configure branch protection and secret scanning; ensure `.env*` and dumps are ignored.

**Hosted test/outcome**

- Production health endpoint is green.
- The authorized chat receives “Bot online — Phase 1.”
- A different account/chat receives no financial functionality.
- A forged webhook request without the secret gets `401/403`.
- A commit with failing tests cannot promote to production.

**Exit gate**

- CI, staging, and production are reproducible from the repo.
- Zero secrets appear in source, browser bundle, or logs.

### Phase 2 — Secure schema, migrations, RLS, and seeded synthetic ledger

**Build**

- Add the schema in Section 5 through versioned SQL migrations.
- Add checks, foreign keys, unique idempotency constraints, indexes, and immutable-posting protections.
- Implement Supabase Auth for one pre-authorized dashboard user.
- Enable RLS on every public table and write policies based on `auth.uid()`.
- Keep privileged server access behind authenticated endpoints; never expose the secret key.
- Add synthetic staging seed data and deterministic reset for staging only.

**Hosted test/outcome**

- A migration creates staging from empty state.
- Authenticated user can read only their rows.
- Anonymous access and a second test user cannot read/write the owner's rows.
- Attempts to create unbalanced, duplicate, negative-invalid, or orphan records fail.
- Golden ledger queries produce the expected balances.

**Exit gate**

- RLS denial tests pass for every table.
- Schema can be rebuilt from migrations without dashboard-only manual SQL.

### Phase 3 — Text ledger vertical slice

**Build**

- Persist each Telegram update before processing and reject duplicates at the database boundary.
- Use a deterministic parser first for explicit commands and common forms.
- Send only ambiguous permitted text to Gemini with the user's aliases and a minimal relevant context window.
- Require Gemini structured output; validate with Zod and domain rules.
- Add confidence routing: high = post and receipt; medium = proposed receipt with Confirm/Edit/Cancel; low = clarification without posting.
- Support expense, income, and transfer first, then card purchase/payment, EMI, loan given, borrowing, and repayment.
- Return a mini-receipt with amount, account, category/person, date, resulting account balance, period spend, and undo button.
- Implement `/undo` as reversal and a structured edit flow as reversal + replacement.

**Hosted test/outcome**

- The approved examples such as “chaya 45,” “got salary 4500,” and Manglish phrases create the correct entries.
- A deliberately ambiguous message does not write before confirmation.
- Replaying the same Telegram update 10 times creates one transaction.
- Credit-card purchase/payment and transfer totals do not double-count expenses.
- `/undo` restores all affected balances and preserves history.

**Exit gate**

- At least 30/30 labeled text cases have correct intent, amount, direction, account, and link target, with confirmation used where expected.
- No AI-produced value bypasses validation.

### Phase 4 — Delivery reliability, retries, and recovery

**Build**

- Implement durable processing jobs and Telegram outbox delivery.
- Classify retryable errors (`429`, provider `5xx`, network timeout) versus permanent validation errors.
- Use bounded exponential backoff, attempt limits, and a dead-letter state.
- Add `/status` for pending/failed jobs and a safe owner-only `/retry` action.
- Keep webhook processing within Vercel limits; persist before slow provider calls.
- Add sanitized error events and correlation IDs.

**Hosted test/outcome**

- Simulated Gemini `429`, Telegram `500`, function timeout, and duplicate webhook lose no accepted input and create no duplicate money movement/message.
- Pending input visibly says it is queued; successful retry produces one final receipt.
- Permanent invalid input asks the user for correction and does not retry forever.

**Exit gate**

- Failure-injection suite passes in hosted staging.
- Dead-letter items can be inspected and safely replayed without database access.

### Phase 5 — Deterministic budget and cash-safety engine

**Build**

- Put pure functions in `engine/`: period boundaries, category remaining, `spendable`, `safeDaily`, `runway`, `recoveryAdjustment`, carry-over, and alert eligibility.
- Define inputs/outputs and formulas in a versioned specification before implementation.
- Add example tests, boundary tests, and property tests for rounding and invariants.
- Add weekly envelopes and 75/90/100% once-per-period alerts with quiet hours.
- Display category remaining and safe daily amount on receipts.

**Hosted test/outcome**

- All Phase 0 hand calculations match exactly to the paise.
- Test zero balance, negative available cash, month-end, leap day, IST midnight, no income, overspend, and rounding remainder.
- Replaying scheduler/transactions never repeats the same threshold alert.

**Exit gate**

- Engine has no network/database dependency and 100% branch coverage on financial formulas.
- Receipt and dashboard/API projections use the same engine output.

### Phase 6 — Commitments, income waterfall, and Exam Vault

**Build**

- Add recurring commitments and due-instance generation.
- Reserve P0 card/EMI, P1 fixed bills, P2 essentials, P3 Exam Vault, P4 people debt, and P5 discretionary in that order.
- Make percentages, caps, floors, and rounding destination configurable.
- Add exam target/date, required pace, ahead/behind adjustment, and virtual allocation history.
- Add a deterministic scenario endpoint/command that never writes: `/whatif income 0 next-month`.

**Hosted test/outcome**

- Each income receipt shows a proposed or applied waterfall with exact totals.
- Sum of allocations plus unallocated remainder equals the income amount exactly.
- Virtual allocations do not alter the real bank balance.
- Zero-income, late-income, insufficient-income, overdue-commitment, and exam-ahead/behind golden scenarios match approved results.

**Exit gate**

- No plan allocates unavailable cash or violates the essential reserve floor.
- User approves the waterfall output using real configuration with a harmless small test entry/reversal.

### Phase 7 — People-debt workflow

**Build**

- Model both payable and receivable debts, original principal, open balance, dates, priority, agreed amount, and notes.
- Link partial payments/refunds to a specific debt; support confirmation when names are ambiguous.
- Define a transparent deterministic priority score and debt-free-date projection.
- Apply the runway floor/tightness guard before suggesting a payment.
- Generate user-initiated share text and `wa.me` deep links only; do not send messages to third parties automatically.
- Support exam-month pause rules and missed-plan recalculation.

**Hosted test/outcome**

- “Rahul-nu 300 thirichu koduthu” links to the correct open payable only after confirmation if multiple Rahul records exist.
- Partial payment reduces the right debt once; reversal restores it.
- Suggested payment becomes zero/WAIT when runway falls below the configured floor.
- Projection clearly changes after payment, new income, and paused month.

**Exit gate**

- All open debt totals reconcile with ledger control totals.
- No third-party message is sent without the user's explicit action.

### Phase 8 — Credit-card and CIBIL-support features

**Build**

- Add card limits, statement/due cycles, outstanding reconciliation, minimum due, and card-payment linkage.
- Add 7/3/1-day due reminders and statement-date utilization guidance.
- Calculate suggested pre-statement payment as the amount needed to bring projected statement balance to the configured target, capped by actual outstanding and available safe cash.
- Add cash-advance warnings, credit-application/enquiry cooldown tracking, and manual score snapshots.
- Phrase all score guidance as educational; do not predict a guaranteed score increase.

**Hosted test/outcome**

- For approved examples, utilization and suggested payment match hand calculation exactly.
- The system does not recommend paying more than outstanding or safely available cash.
- Card purchase followed by card payment remains one expense.
- Due-date reminders fire once at each threshold and respect IST/quiet hours.

**Exit gate**

- Card ledger, statement value, and manually verified issuer balance reconcile for a test cycle.
- All wording passes the “no guarantee/no invented bank fact” review.

### Phase 9 — Multimodal input with privacy gate

**Precondition**

- Reconfirm the Phase 0 privacy choice. Gemini free-tier processing of images/audio is disabled until accepted.

**Build**

- Download Telegram media into memory with size/type/time limits; never write it to application storage.
- Voice: extract transcript and fields, always show transcript and proposed entry for confirmation before posting.
- UPI screenshots: extract amount, payee, date/time, direction, and reference ID; never trust screenshot text as instructions.
- Bank SMS paste uses the same structured pipeline.
- Deduplicate primarily by stable payment reference; use amount/time/payee similarity only to warn and confirm, never to silently merge.
- Reject documents containing disallowed secrets and warn the user to rotate credentials if needed.
- Optionally delete the Telegram chat message after processing if the user enables it; do not claim this guarantees deletion from Telegram infrastructure.

**Hosted test/outcome**

- Test 10 representative redacted screenshots, 10 voice notes, and 10 SMS samples, including failures and duplicates.
- Every voice entry requires confirmation.
- Low-confidence or missing-direction media never posts automatically.
- Screenshot + SMS with the same reference creates one result or an explicit duplicate warning.
- Application storage and logs contain no media or raw sensitive message body after processing.

**Exit gate**

- Field accuracy meets 100% on amount/direction for the approved 30-item test set; uncertain items must be routed to confirmation rather than counted as correct guesses.
- Privacy acceptance and media-retention test are recorded.

### Phase 10 — Scheduler, digests, and “Can I afford this?”

**Build**

- Deploy a Cloudflare Worker Cron at `*/15 * * * *` UTC that signs a request to `/api/cron/tick` with `CRON_SECRET`.
- Make tick processing idempotent by logical schedule window; protect against replay and concurrent calls.
- Tick decides what is due in IST: daily digest, Sunday audit, month-end report, reminders, retry jobs, and inactivity check.
- Daily/monthly reports are computed data first. Gemini may phrase an action summary using only the computed, minimized facts.
- Implement deterministic `YES`, `NO`, or `WAIT` affordability logic with reason codes and a post-purchase stress view.
- Flag new borrowing/credit applications separately from ordinary purchases.

**Hosted test/outcome**

- Forced staging ticks for selected timestamps produce each intended digest exactly once.
- Real scheduled staging tick arrives within the expected 15-minute window.
- Replayed/concurrent ticks do not duplicate reminders.
- At least 20 affordability cases match hand calculation, including no-income month, card purchase, essential purchase, and reserve-floor breach.
- The external tick produces sufficient regular app/database activity; pause warnings are still monitored because prevention is not guaranteed.

**Exit gate**

- Seven consecutive days of scheduler runs show no missed/duplicate daily digest.
- All verdicts are explainable from stored inputs and reason codes without Gemini.

### Phase 11 — Private dashboard

**Build**

- Use Supabase Auth for the single pre-authorized email. Default Supabase email is acceptable for this owner's address during personal use; document its low/best-effort limits.
- Add Home, Transactions, People & Debts, Credit Health, Exam Vault, Commitments, and Cashflow screens.
- Add daily/weekly/monthly views, accessible charts, filters, and CSV export.
- Render engine results returned from shared server code; never reimplement finance formulas in React.
- Hide secrets and sensitive identifiers from client bundles and error messages.

**Hosted test/outcome**

- Unauthorized/incognito access redirects to sign-in and cannot query rows directly.
- Every dashboard total matches a bot command/API snapshot for the same timestamp and timezone.
- Playwright smoke tests cover sign-in, main screens, filters, and export on deployed staging.
- Mobile layout is usable at common phone width.

**Exit gate**

- Zero unexplained difference between dashboard, bot, and ledger query totals.
- No privileged Supabase key appears in browser network/source inspection.

### Phase 12 — Backup, reconciliation, hardening, and production release

**Build**

- Weekly backup workflow: schema + data dump, checksum, public-key encryption, encrypted artifact/snapshot, retention rotation, and failure notification.
- Keep the decryption private key outside GitHub/Vercel/Supabase; document recovery.
- Perform a real restore drill into staging; a backup is not accepted until restored and reconciled.
- Add weekly balance reconciliation. Differences require explicit confirmation and become an auditable adjustment category, never silently “unlogged spending.”
- Add `/export`, `/privacy`, `/delete-my-data` preparation/confirmation, and owner runbook.
- Add dependency/security scanning, rate limiting, input-size limits, CSP/security headers, key-rotation procedure, provider quota review, and incident/rollback runbooks.
- Perform end-to-end regression with only redacted/synthetic data, then a controlled production initialization.

**Hosted test/outcome**

- Restore the latest encrypted backup into staging and match table counts, checksums, balances, open debts, card liabilities, and envelope totals.
- Rotate webhook/cron/test secrets without downtime.
- Reconciliation correctly handles exact match, missing expense, missing income, transfer mismatch, and unknown difference.
- Simulated provider outage leaves accepted messages queued and recoverable.
- Full acceptance suite passes against the production deployment with reversible test entries.

**Exit gate / v1 release**

- Restore drill passes.
- Security checklist has no critical/high unresolved item.
- User signs off the real opening balances, liabilities, debts, commitments, budget settings, and privacy choices.
- Operations runbook can recover from a broken deploy, expired key, paused Supabase project, Gemini quota exhaustion, and scheduler failure.

## 8. Commands and user experiences required by v1

| Command/action | Purpose |
|---|---|
| `/start`, `/help`, `/status` | onboarding, examples, system/job status |
| natural-language entry | log or propose a transaction |
| Confirm / Edit / Cancel | approve uncertain extraction |
| Undo | create a reversal for the last eligible entry |
| `/today`, `/week`, `/month` | summaries from deterministic engine |
| `/balance` | accounts, liquid position, and reconciliation age |
| `/budget` | category/envelope remaining and safe daily spend |
| `/debts` | people debts and next safe action |
| `/cards` | outstanding, utilization, statement/due reminders |
| `/vault` | Exam Vault target, pace, and allocation |
| `/afford 1200 headphones` | deterministic YES/NO/WAIT analysis |
| `/whatif income 0 next-month` | non-writing scenario stress test |
| `/reconcile` | compare real balances and propose adjustments |
| `/export` | owner-only portable export |

## 9. Test strategy

### Unit/property tests

- Money conversion and rounding.
- IST/UTC period boundaries and recurrence.
- Balanced postings and reversals.
- Budget, runway, waterfall, Exam Vault, debt priority, utilization, and affordability formulas.
- Idempotency and alert-once keys.

### Integration tests

- Supabase migrations, constraints, RLS, and auth.
- Telegram update/callback shapes and forged-secret rejection.
- Gemini output validation using fixtures; live calls limited to explicit smoke tests.
- Retry/outbox/dead-letter behavior with injected provider failures.
- Cron replay/concurrency.

### End-to-end hosted tests

- Telegram message to receipt to dashboard total.
- Confirmation, edit, undo/reversal, and duplicate replay.
- Scheduled digest and reminder.
- Backup restore and reconciliation.

Production tests must use tiny reversible entries and must never rely on deleting financial history.

## 10. Environment and secret inventory

Server only:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `ALLOWED_TELEGRAM_USER_ID`
- `ALLOWED_TELEGRAM_CHAT_ID`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `CRON_SECRET`
- `APP_TIMEZONE=Asia/Kolkata`
- backup public encryption recipient/key (public material only in CI)

Browser-safe only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Validate required environment variables at build/startup. Production and preview secrets must be separate. Never paste secret values into an AI chat, issue, commit, screenshot, log, or test fixture.

## 11. Explicitly deferred scope

Do not add these before v1 Phase 12 passes:

- WhatsApp Business API or automated third-party messages;
- bank account/UPI credential integration or transaction initiation;
- investments, tax filing, trading, or lending decisions;
- multi-user/household collaboration;
- automatic CIBIL scraping or credit-report parsing;
- OCR/report storage in Supabase;
- native mobile app;
- autonomous financial actions.

After v1, optional report parsing must redact identifiers before processing and undergo a separate privacy/security review.

## 12. Definition of complete

The project is complete for v1 only when it is deployed, the owner can use it without a local server, all Phase 0–12 exit gates pass, the latest backup has been restored successfully, all real opening balances are reconciled, and the user has accepted the documented free-tier and privacy trade-offs.

