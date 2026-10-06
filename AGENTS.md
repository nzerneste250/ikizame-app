# AGENTS.md — IKIZAME NodeApp

## Purpose

IKIZAME is a Rwanda-focused provisional driving-license exam and study platform. It provides:

- Public Kinyarwanda/English-facing pages for learning, pricing, help, legal information, and exam access.
- A paid learner exam flow backed by PayPack payment verification.
- Driving-school accounts that can purchase exam credits and assign them to students.
- An administrative portal for question management, users, payments, resources, reports, and system operations.
- Exam results, score history, study resources, road-sign explanations, and a generated study plan.
- Transactional email for OTPs, reports, alerts, and payment notifications.
- Optional privacy-conscious GA4/site analytics with consent and admin exclusion.

The application is a server-rendered/static HTML Express application, not a frontend framework application. Most browser UI lives in `public/` and communicates with Express JSON endpoints.

## Runtime and commands

- Runtime: Node.js **24.x** (`.nvmrc` and `package.json`).
- Module system: CommonJS (`require`, `module.exports`).
- Main entry point: `server.js`.
- Database: MySQL via `mysql2` connection pooling.
- Session storage: MySQL session store when available; development fallback is an in-memory store.
- Production process documentation: `DEPLOYMENT.md` (PM2 process name: `ikizame`).

Common commands from `F:\IKIZAME-NodeApp`:

```powershell
npm test
node --test test/*.js
git diff --check
git status --short
npm start
```

`npm test` runs Node’s built-in test runner serially (`node --test --test-concurrency=1`). Do not assume a browser test runner or ORM exists; use the libraries already present in `package.json`.

## Application bootstrap

`server.js` is responsible for composition and process startup:

1. Loads `.env` with `dotenv`.
2. Selects local or production MySQL settings based on `NODE_ENV`.
3. Creates an Express app and trusts one reverse-proxy hop.
4. Redirects `www.ikizame.rw` to the canonical non-www HTTPS domain.
5. Installs Helmet, compression, JSON/urlencoded parsers, sessions, rate limits, and indexing headers.
6. Creates the MySQL pool and performs best-effort startup migrations/compatibility setup.
7. Configures SMTP through Gmail/Nodemailer.
8. Tracks public-page visitors in `site_visitors` (excluding configured local/owner IPs).
9. Serves public HTML routes and mounts API route modules.
10. Registers error handling and starts listening on `PORT` (default `3000`).

The JSON parser stores `req.rawBody`, which is required for PayPack webhook signature verification. Do not remove that behavior or replace it with a parser that loses the original request bytes.

## Directory guide

### Root

- `server.js`: Express composition, sessions, public routes, startup setup, reports, alerts, and server lifecycle.
- `package.json`: dependencies, Node version, `start`, and `test` scripts.
- `.env.example`: documented environment-variable names and safe placeholders. Never commit real secrets.
- `DEPLOYMENT.md`: pull/test/commit/push/server restart procedure. It is operational documentation, not an instruction to push during development.
- `check-users.js`, `send-real-report.js`, `tmp-check-live-review.js`: operational/diagnostic scripts; inspect before running against a live database.

### `routes/`

- `routes/exams.js`: exam question retrieval, randomized/locked 20-question sets, admin question CRUD, image uploads, duplicate detection, and exam-credit consumption.
- `routes/payments.js`: PayPack cash-in initiation, durable pending orders, signed webhook processing, transaction confirmation, reconciliation-related payment behavior, and payment notifications.
- `routes/admin.js`: admin login/logout, bcrypt password handling, OTP password reset, password-change flow, admin settings, payment/admin dashboards, and protected admin operations.
- `routes/school.js`: school registration and email OTP verification, school password setup/login, school wallet metrics, student management, assignments, and school payment behavior.
- `routes/amanota.js`: learner result/score endpoints.
- `routes/resources.js`: protected/public study-resource listing, upload/download, and resource access rules.
- `routes/reports.js`: report generation and email delivery helpers used by scheduled/manual report endpoints.

### `helpers/`

- `adminSettings.js`: protected report-recipient and admin configuration rules.
- `databaseMigrations.js`: safe/idempotent compatibility migrations such as `portal_admins.is_active`.
- `examAccess.js`: central exam entitlement evaluation for admin, owner bypass, paid credits, and active school assignments.
- `examImagePath.js`: normalizes/resolves exam image paths.
- `otp.js`: in-memory OTP issuance limits, cooldowns, expiration, invalid-attempt locks, and one-time verification.
- `paymentPhone.js`, `rwandaPhone.js`: Rwanda phone normalization/validation. Reuse these instead of implementing ad-hoc phone parsing.
- `paymentTransactions.js`: the shared successful-payment entitlement insert and duplicate-payment detection.
- `paymentReconciliationExecution.js`, `paypackReconciliation.js`: narrowly scoped PayPack recovery/reconciliation checks.
- `publicPageRenderer.js`: canonical tags, noindex behavior, analytics injection, and selected footer-link injection.
- `siteAnalytics.js`, `verifiedAnalyticsPurchase.js`: consent-aware analytics configuration, admin exclusion, safe purchase receipts, and verification requirements.

### `middleware/`

- `auth.js`: staging Basic Auth, admin session checks, admin idle timeout, and login redirects.
- `indexing.js`: adds `X-Robots-Tag: noindex, nofollow` outside the explicitly indexable public pages and production sitemap/robots assets.

### `public/`

Static HTML pages and assets. Important areas include:

- Public pages: `index.html`, `ifashanyigisho.html`, `ibiciro.html`, `ubufasha.html`, `about.html`, `terms.html`, `amanota.html`, and `exam-result.html`.
- Learner exam pages: `exam.html`, `exam-score.html`.
- Admin pages: `admin-login.html`, `dashboard.html`, `admin-users.html`, `admin-payments.html`, `admin-paypack.html`, `add-exam.html`, `edit-exam.html`, `upload-resource.html`, `visitors.html`, and related system pages.
- School portal pages: `school-auth.html`, `school-dashboard.html`, `school-profile.html`, `school-students.html`, `school-performance.html`, and `terms-school.html`/`about-school.html`.
- `public/assets/css/`: shared/design-specific styles.
- `public/assets/js/`: browser behavior, navigation, exam image handling, session handling, and analytics.
- `public/assets/uploads/`: public exam/resource image files. Treat filenames and references as compatibility-sensitive.
- `public/sw.js`: service-worker behavior.

### `Database/`

SQL backups and deployment migrations. Current migrations cover payment reconciliation/audit, webhook hardening, portal-admin activation, negative payment balances, and visitor data. Apply migrations deliberately and verify idempotence; do not casually edit a historical migration that may already have run in production.

### `test/`

Node built-in tests covering authentication, authorization, payments, PayPack webhooks/reconciliation, analytics/privacy, migrations, navigation, phone validation, study-plan behavior, and road-sign content/layout contracts. Many tests inspect source/HTML strings intentionally, so copy changes can require corresponding test updates.

## Main user workflows

### Learner exam access

1. The learner supplies a Rwanda phone number and identity/session details through the public exam flow.
2. The server normalizes the phone and stores exam context in the session.
3. Access is evaluated by `verifySessionExamAccess` in `helpers/examAccess.js`.
4. Valid sources are:
   - authenticated admin;
   - explicit owner bypass after OTP authorization;
   - a `SUCCESS` payment transaction with remaining credits;
   - an `ACTIVE` school student assignment with remaining assigned exams.
5. Exam questions are fetched from MySQL. A learner receives a randomized set of 20, which is locked in the session while in progress. Recent question IDs are tracked to reduce immediate repeats.
6. On submission, one credit is consumed from the selected payment or school entitlement. Avoid changing access checks and credit consumption independently; they must remain consistent.

### Payment flow

1. The browser submits a plan/phone/service request to the payments API.
2. The server validates the phone and derives pricing/entitlement values server-side; never trust client-provided exam counts or prices.
3. PayPack cash-in is initiated using a cached access token.
4. The returned reference is written to `pending_payment_requests` before the request is reported as successfully initiated.
5. PayPack sends a signed `transaction:processed` webhook.
6. The server verifies the raw-body signature, merchant, reference, kind, amount, phone, and successful provider status before creating a `SUCCESS` entitlement.
7. Duplicate callbacks are harmless because references/transaction writes are duplicate-safe.
8. Reconciliation must use provider evidence and must not directly grant credits from an unverified local status.

Important payment invariants:

- Only provider-confirmed successful payments grant access.
- Webhook signatures must be checked against `req.rawBody`.
- Merchant, amount, phone, reference, event ID, and time-window checks must remain aligned.
- A pending order is not a successful payment.
- Do not expose phone numbers, raw references, plan labels, or customer identity in analytics receipts.
- Keep payment writes idempotent and safe across retries, polling, process restarts, and concurrent callbacks.

### School portal

Schools register with name/email/phone, receive an email OTP, verify the account, set a bcrypt password, and log in. The school session stores the school account ID/name/email. Schools can purchase credits, view their wallet, manage students, assign exams, and inspect performance. School routes must verify the authenticated school session before returning private data.

### Admin portal

Admin login accepts the configured email or legacy username, verifies bcrypt passwords, upgrades legacy plaintext passwords after a successful match, and records an admin session. Admin sessions have a five-minute idle timeout. Admin pages/API operations must use `requireAdminLogin` or an equivalent explicit session check. Admin and school sessions are excluded from public analytics.

Password reset uses email OTPs with rate limits, expiration, invalid-attempt locks, and one-time deletion. Preserve these limits whenever changing login or reset flows.

### Public rendering and SEO

Public pages are read from `public/` and rendered through `renderPublicPage` where applicable. The renderer:

- injects one canonical URL for known public pages;
- adds `noindex, nofollow` for private/unknown rendered pages;
- injects analytics only when GA4 is explicitly enabled with a valid non-placeholder measurement ID;
- avoids analytics injection for admin/school sessions and avoids duplicate tags;
- adds About/Terms links to selected legacy pages when missing.

Keep canonical URLs, `sitemap.xml`, `robots.txt`, and indexing headers consistent when adding public pages.

## Security and privacy rules

- Never commit `.env`, credentials, API secrets, SMTP passwords, webhook secrets, or production database data.
- Use parameterized MySQL queries. Do not interpolate user input into SQL.
- Preserve Helmet, compression, request limits, rate limits, secure session cookies, and idle timeouts.
- Normalize and validate Rwanda phone numbers with the existing helpers.
- Do not bypass admin/school/exam authorization just to make a page or endpoint convenient.
- Do not grant payment entitlements from browser state, a pending order, a client callback, or a stored status without provider confirmation.
- Avoid logging OTPs, passwords, secrets, full phone numbers, or sensitive customer data.
- Keep analytics opt-in, anonymous, consent-aware, and disabled for admin/private activity.
- Treat uploaded files as untrusted. Preserve the existing upload directory, duplicate detection, image compression, and filename/path handling unless the security implications are understood.

## Coding conventions

- Match the existing CommonJS style and callback/Promise style of the file being changed.
- Keep route modules factory-based where they currently accept `db`, transport, or limiters.
- Prefer small helpers for cross-cutting rules and add focused unit tests for them.
- Use existing Kinyarwanda copy and terminology in learner-facing UI; avoid reintroducing English labels that existing tests deliberately reject.
- Preserve HTML IDs, endpoint paths, session property names, database column names, and asset filenames unless the change includes all consumers.
- When changing page copy or HTML structure, inspect the corresponding source-contract tests in `test/`.
- Do not add a dependency when Node/platform functionality or an installed package already solves the problem.

## Testing expectations

Before considering a change complete:

1. Run the narrowest relevant test file(s), then run the full suite with `npm test`.
2. Run `git diff --check`.
3. Inspect `git diff` and `git status --short`.
4. For payment/auth changes, verify both success and failure/replay/unauthorized paths.
5. For public HTML changes, check localization, canonical/indexing behavior, responsive contracts, and no accidental personal-data collection.

The test suite intentionally includes contract tests that read source files and HTML. A passing test suite is necessary but does not replace manual review of security-sensitive logic.

## Database and migration practices

- Local defaults use database `driving_db`; production values come from `PROD_DB_*` variables.
- Startup setup is best-effort and must not silently destroy or reset existing data.
- New schema changes should be represented by an explicit SQL migration in `Database/` when appropriate.
- Migrations should be idempotent or safely conditional and compatible with the deployed MySQL version.
- Preserve existing payment uniqueness/idempotency constraints and audit/reconciliation columns.
- Do not run destructive SQL against production without an explicit backup and review.

## Deployment and Git boundaries

This guide is for local coding agents. **Do not commit or push unless the user explicitly asks.** In particular:

- Do not run `git push` as part of ordinary implementation or verification.
- Do not use `git reset --hard` to discard user work.
- Do not overwrite unrelated working-tree changes.
- Review `git status` before and after edits; the repository may intentionally contain uncommitted changes.
- Follow `DEPLOYMENT.md` only when the user explicitly requests a deployment/publish operation.

Production currently expects a Node 24 runtime and a PM2 process named `ikizame`. A normal deploy pulls `main`, installs production dependencies only when package files changed, and restarts `ikizame` rather than all PM2 processes. Deployment credentials and server actions must never be copied into source files.

## Safe change checklist

Before editing:

- Read `git status --short` and preserve existing modifications.
- Identify the route, page, helper, database table, and tests involved.
- Check whether the behavior is security/payment/session sensitive.

While editing:

- Reuse existing helpers and naming conventions.
- Keep server-side validation authoritative.
- Keep user-facing copy localized and accessible.
- Add or update focused tests for the behavior changed.

After editing:

- Run relevant tests and `npm test`.
- Run `git diff --check`.
- Read back every edited file or inspect the final diff.
- Report what changed and clearly state that no commit or push was performed.