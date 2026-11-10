# AGENTS.md — IKIZAME NodeApp

**Last updated: 2026-11-10**

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
- `pricing.js`: authoritative individual exam pricing (1–15: 100 RWF each; 16–25: 80 RWF each; 26–50: 70 RWF each) and school packages (Basic: 10,000 RWF/100 credits; Standard: 20,000 RWF/300 credits; Premium: 30,000 RWF/600 credits). Do not duplicate pricing rules or invent a price for quantities above 50.
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
2. The server validates the phone and derives pricing/entitlement values server-side using `helpers/pricing.js`; never trust client-provided exam counts, prices, or credits. Individual purchases are priced for quantities 1–50; reject unsupported quantities rather than inventing a rate.
3. PayPack cash-in is initiated using a cached access token. The documented cash-in request accepts `amount` and `number`; PayPack generates the transaction reference.
4. After PayPack returns a reference, it is written to `pending_payment_requests` before initiation is reported as successful to the browser. This does not make the order durable while the provider request is in flight.
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
- Keep payment writes idempotent across retries and concurrent callbacks, backed by the unique payment reference constraint.
- School package callbacks must load the persisted order and re-derive the package amount and credits from `helpers/pricing.js`; never trust browser-submitted price or credit values.
- The [documented PayPack cash-in API](https://docs.paypack.rw/quickstart/api-reference) supports an optional `Idempotency-Key` header (maximum 32 characters) and says repeated requests with the same key are not charged more than once. Its documented request body has only `amount` and `number`; the transaction reference is provider-generated. Do not assume retrying a key returns the original reference: that response behavior is not documented and must be confirmed with PayPack before relying on it for automated recovery.
- A school order currently becomes durable only after the PayPack response supplies its reference. A callback can therefore arrive before the database insert, and a crash or lost response after PayPack creates the charge can leave no durable local reference. Do not describe that initiation window as restart-recoverable.
- Before claiming reliable recovery from this window, persist a school purchase intent and stable idempotency key before contacting PayPack, durably associate the generated reference after initiation, and persist authenticated callbacks that arrive before association in a durable inbox for later processing. Do not automatically create a new provider request with a new key for an uncertain initiation. If the provider cannot recover the original reference by idempotency key, leave the order unresolved for reconciliation; never grant credits from an unmatched callback.

Pricing rules are defined centrally in `helpers/pricing.js` and must not be duplicated as independent server-side pricing logic:

- Individual exams: 1–15 at 100 RWF each, 16–25 at 80 RWF each, and 26–50 at 70 RWF each. Reject non-whole, out-of-range, or greater-than-50 quantities; do not invent another tier.
- School packages: Basic is 10,000 RWF for 100 credits; Standard is 20,000 RWF for 300 credits; Premium is 30,000 RWF for 600 credits.

### School portal

Schools register with name/email/phone, receive an email OTP, verify the account, set a bcrypt password, and log in. The school session stores the school account ID/name/email. Schools can select one of the Basic, Standard, or Premium exam-credit packages in the dashboard; the server resolves its price and credits from `helpers/pricing.js`. Schools can view their wallet, manage students, assign exams, and inspect performance. School routes must verify the authenticated school session before returning private data.

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
- School PayPack package orders use `pending_payment_requests`; apply `Database/2026-10-payment-webhook-hardening.sql` first, then `Database/2026-11-school-payment-orders.sql`, before deploying code that reads the package/provider/status fields.
- Supporting a durable pre-initiation school order requires additive schema support for an order without a provider reference, a stable idempotency key and lifecycle state, plus durable storage for early webhook events. Preserve existing pending rows and historical transactions. The repository backup identifies MariaDB 10.4.32; verify migration syntax against the actual deployment server version before applying. Existing conditional migrations use `information_schema` and prepared statements; do not assume a migration was tested merely because it is idempotent by inspection.
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

### Pricing and payment record integrity

- Admin payment edits may change remaining credits only. Preserve the transaction's original amount, unit price, purchased quantity, plan, and status; reject attempted edits to those fields.
- School PayPack package orders are persisted with the school, package, expected amount, credit count, provider, reference, and pending status. Callback processing reloads the durable order, re-derives package values from `helpers/pricing.js`, and relies on the unique payment reference constraint to prevent duplicate credit allocation.
- Apply `Database/2026-10-payment-webhook-hardening.sql` first if needed to create `pending_payment_requests`, then apply `Database/2026-11-school-payment-orders.sql` before deploying code that uses the added columns. The latter migration is additive and preserves existing rows.
- Test coverage currently simulates callback concurrency and durable lookup with mocked database behavior; it does not replace verification against MySQL or execution of the migration on a supported MySQL version.

### Pricing update review report (2026-11-09)

- Review outcome for the scoped pricing corrections: **SAFE TO COMMIT**. This recommendation covers only strict individual quantity validation, the corresponding pricing request payload, and the corrected public FAQ; it does not clear or approve every other change in the worktree.
- Individual pricing remains 1–15 exams at 100 RWF each, 16–25 at 80 RWF each, and 26–50 at 70 RWF each. `helpers/pricing.js` accepts only numeric whole quantities from 1 through 50, and the payment route passes the request value directly to the helper without coercion. The browser sends the quantity as a JSON number.
- Focused validation covers missing input, strings, empty strings, booleans, arrays, objects, `null`, decimals, zero, negative values, quantities above 50, and valid pricing boundaries/totals.
- `public/ubufasha.html` now describes the 100 RWF tier as applying to 1–15 exams. The pricing page and school package display/selection were verified against the configured tiers and packages.
- The scoped correction did not change payment initiation, PayPack/RwandaPay integrations, webhook verification, callbacks, credit allocation, database schema, migrations, or historical transactions. The existing school-order durability risk remains: the order is persisted only after PayPack returns its generated reference, so an earlier callback or process crash can leave an initiated payment without a recoverable local order. This risk is outside the scoped pricing recommendation and remains unresolved.
- Verification after the scoped correction: full `npm test` passed **194/194**; `git diff --check` passed; `git status --short` was reviewed. No migration, commit, push, or deployment was performed.
- Files changed for the scoped correction: `helpers/pricing.js`, `routes/payments.js`, `public/ibiciro.html`, `public/ubufasha.html`, `test/pricing.test.js`, and `test/payment-ux.test.js`. Other prior uncommitted pricing/payment files remain in the worktree and must be reviewed separately; new files should be explicitly included when staging if intended.

### Admin balance and school payment persistence handling (2026-11-10)

- Admin `remaining_exams` edits accept only non-negative safe-integer JSON numbers or digit-only strings that parse to safe integers. Booleans, arrays, objects, null/missing/empty values, whitespace, decimals, negatives, and unsafe integers are rejected. The school transaction exclusion, immutable financial fields, and `school_id IS NULL` update condition remain enforced.
- When PayPack returns a school payment reference but the pending-order database insert fails, the API now returns HTTP 202 with `paymentInitiated: true`, `reconciliationRequired: true`, and the reference. The message warns the school not to retry and directs them to preserve the reference for reconciliation; the dashboard leaves the purchase controls disabled.
- This response does not imply the order was durably stored or recovered. The in-memory callback fallback may still be lost on process restart; no credits are granted by the persistence-failure response, and entitlement still requires the existing verified callback flow.
- Verification on 2026-11-10: focused admin/pricing tests passed **7/7**; full `npm test` passed **194/194**; `git diff --check` passed. No migration, commit, push, or deployment was performed.
- Files changed for this correction: `routes/admin.js`, `routes/school.js`, `public/school-dashboard.html`, `test/admin-payment-editor.test.js`, and `test/pricing.test.js`. Other existing worktree changes were preserved.

### Admin payment transaction ID validation report (2026-11-10)

- The payment transaction editor now validates the raw route ID as a positive digit-only string before numeric conversion, then requires a safe integer greater than or equal to 1. This rejects zero, negatives, decimals, scientific notation, non-numeric text, and values above `Number.MAX_SAFE_INTEGER` before any database query.
- Tests cover a valid ID with leading zeroes, `Number.MAX_SAFE_INTEGER`, and each requested invalid format/range. They assert invalid IDs return HTTP 400 without invoking database queries.
- Existing authorization, school transaction protection, immutable financial fields, and remaining-credit validation are preserved.
- Verification: `node --test test/admin-payment-editor.test.js` passed **2/2**; full `npm test` passed **194/194**; `git diff --check` passed.
- Files changed for this correction: `routes/admin.js` and `test/admin-payment-editor.test.js`. No commit, push, or deployment was performed.

### School payment polling safety report (2026-11-10)

- If school payment-status polling reaches its maximum attempts or encounters a network error, the dashboard now keeps the purchase button and package choices disabled, stops polling, and warns the school not to initiate another payment. The warning includes the payment reference and directs the school to contact support.
- Existing HTTP 202 `reconciliationRequired` behavior and confirmed `SUCCESS`, `FAILED`, and `CANCELLED` handling remain unchanged.
- Regression tests cover both the polling-timeout and polling-network-error paths, including disabled controls and the warning/reference.
- Verification: focused `test/pricing.test.js` passed **6/6**; full `npm test` passed **195/195**; `git diff --check` passed.
- Files changed for this correction: `public/school-dashboard.html` and `test/pricing.test.js`. No migration, commit, push, or deployment was performed.
