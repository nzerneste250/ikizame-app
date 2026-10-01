# GA4 and Search Console: review and setup

## Review status

Changes are on `feat/ga4-search-console-validation`. They have not been merged or deployed. No Google property, ownership verification, account connection, or live analytics collection has been confirmed. The owner has not created the GA4 stream, so analytics defaults to disabled with an empty Measurement ID.

The existing exam scoring, access guards, authentication, payment initiation, payment status, and entitlement logic are preserved. Enabled analytics adds an optional consent interface. Disabled analytics adds no banner or Google tag. The shared public renderer supplies canonical tags and the optional external analytics bootstrap.

## Dependencies and validation

The repository declares Node `20.x`; `.nvmrc` now selects Node 20. Install that version before running:

```sh
npm ci
npm test
```

The lockfile is version 3 and is unchanged. Installation and tests used Node 20.20.2. The baseline passed all 15 existing tests, including all five exam-access tests after Express was installed. The final suite passes **28 tests, zero failures, zero skips**, retaining all existing tests. The new npm test script uses the built-in Node test runner.

A local Edge/Playwright smoke check exercised the real rendered pages and their browser scripts: six public pages, exam questions and submission, score navigation, both checkout flows, resource download navigation, consent rejection/acceptance, duplicate purchase suppression, admin exclusion, and disabled analytics markup. All external requests were intercepted; payment and exam responses were fixtures. No live database, SMS/email delivery, PayPack payment, production login session, or Google collection was tested. Existing access and OTP tests passed, but a complete production login/payment journey remains to be checked in an approved staging environment.

Installation reported **nine existing dependency vulnerabilities: six moderate and three high**. Affected dependencies include Axios, MySQL2/session dependencies, Nodemailer, Express dependencies, and node-cron. Broad dependency upgrades were left out because several fixes change major versions and require separate compatibility work. Node 20 is now end of life; this change follows the declared runtime, and migration to a supported runtime remains a separate task. See [Node releases](https://nodejs.org/en/download) and [npm ci](https://docs.npmjs.com/cli/commands/npm-ci/).

An SMTP password was present in the tracked environment example. It has been replaced by a placeholder. **Rotate that credential**: removing it from the current file does not remove it from Git history. The real `.env` was not edited.

## Create and configure GA4 — owner steps

1. In Google Analytics, create a GA4 property and a Web data stream for `https://ikizame.rw`. Choose the appropriate reporting timezone and RWF reporting currency.
2. Copy the actual stream Measurement ID beginning with `G-`. No invented ID is supplied in the application configuration.
3. **Turn off Enhanced Measurement for this stream before enabling this implementation.** It can otherwise generate extra history page views, form, search, download, and outbound-link events outside this code's strict payload allowlist. Keep Google Signals, advertising personalization, and user-provided data collection disabled. Do not install another Google tag through a CMS, Tag Manager, or hosting panel alongside this one. See [Enhanced Measurement settings](https://support.google.com/analytics/answer/9216061).
4. After code review and a separately approved deployment, set the actual application environment:

```dotenv
GA4_ENABLED=false
GA4_MEASUREMENT_ID=
GA4_DEBUG=false
```

Fill `GA4_MEASUREMENT_ID` with the real stream ID, then change `GA4_ENABLED` to `true` when ready to validate. Use `GA4_DEBUG=true` temporarily for DebugView, then return it to `false`. Restart the application using the existing deployment procedure. Missing/invalid/placeholder IDs or disabled configuration do not load Google tracking. No production configuration was changed here.

## Consent, privacy, and events — completed code

No existing analytics tag or consent system was found. This implementation uses basic consent mode: Google scripts and requests start only after explicit acceptance. A small Kinyarwanda banner offers acceptance or continued use without analytics; an “Analytics preferences” button allows changes. The preference is stored under `ikizame.analytics-consent.v1`. Rejection/revocation stops future events, disables the tag, and expires the known analytics cookies. Actions before consent are not replayed. Consent changes propagate across tabs. See [Google consent implementation](https://developers.google.com/tag-platform/security/guides/consent).

Only `/`, `/ifashanyigisho`, `/ibiciro`, `/ubufasha`, `/about`, `/terms`, and the guarded `/exam` can load analytics. Admin and school-admin sessions are excluded even on public pages. Results, score lookup, downloads, authentication, dashboards, and admin pages do not load analytics.

| Event | Trigger and payload |
| --- | --- |
| `page_view` | One manual event per rendered page after consent; fixed canonical page URL and title, empty referrer. |
| `exam_started` | Successful question loading; question count only. |
| `exam_completed` | Successful submission response with a valid score/total; question count only, no score or answers. |
| `begin_checkout` | Validated exam/resource checkout initiation; fixed generic service item and RWF currency. |
| `purchase` | Stored `SUCCESS` **and** an authenticated PayPack transaction lookup confirming matching reference, successful CASHIN, and matching positive amount; generic item, RWF value, hashed transaction ID. |

The browser never receives provider response details for analytics. Names, phone numbers, email addresses, passwords, access codes, raw payment references, resource titles, answers, scores, query strings, hashes, and customer-provided labels are excluded from Google payloads. Normal GA4 browser/device/network metadata still applies; this does not claim that analytics collects no data about visitors.

The optional purchase confirmation uses PayPack's documented [transaction lookup](https://docs.paypack.rw/quickstart/api-reference). It performs no charge or database write. Only enabled analytics for non-admin requests attempts the lookup. The existing status/plan response and entitlements remain intact if confirmation fails. The confirmation has a 2.5-second response deadline, a bounded five-minute cache, and concurrent-request coalescing. Missing credentials, provider errors, legacy transactions that cannot be confirmed, mismatched amounts, failed/pending transactions, and timeouts omit the receipt rather than manufacture a purchase. The existing token authorization request may finish after that deadline; checkout does not wait for it beyond the deadline.

Browser purchase suppression uses the stable hashed transaction ID, memory and local storage, and cross-tab locks where supported. GA4 also deduplicates purchases by transaction ID. See [GA4 ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce) and [transaction ID deduplication](https://support.google.com/analytics/answer/12313109). The marker records dispatch, not confirmed Google delivery. Consent refusal, ad blockers, provider outages, navigation, unavailable storage, or network failures can cause missing telemetry. No server-side replay or historical purchase backfill is implemented.

The pre-existing PayPack callback can accept a missing signature and hashes reserialized JSON rather than raw request bytes. That payment security issue remains for separate remediation because this task preserves payment processing. **The new analytics path independently confirms purchases with PayPack rather than trusting that callback alone.** Do not interpret this change as fixing webhook security; see [PayPack signature requirements](https://docs.paypack.rw/quickstart/webhooks).

## Validate GA4 — owner steps after approved deployment

1. With fresh browser storage, confirm no Google requests before consent and none after rejection. Accept analytics and confirm one Google loader and one page view. Visit the public pages and confirm their fixed page URLs contain no query strings or customer information.
2. With `GA4_DEBUG=true`, open Analytics DebugView; also check Realtime. Complete a staging exam and both checkout types. Verify `exam_started`, `exam_completed`, and `begin_checkout`. A pending or failed payment must never emit `purchase`.
3. Confirm one purchase only after the server has both stored success and confirmed it through PayPack. Repeat polling/reload the checkout return URL and confirm the same transaction does not create another purchase. A return URL claiming success alone is insufficient.
4. Test admin sessions and result/login/download pages: no Google tag. Revoke consent and check that later actions do not send events. Disable debug mode after validation.

Use [Google's Realtime and DebugView guidance](https://support.google.com/analytics/answer/9322688). No event arrival in a real property has been verified yet. Do not send actual customer details in diagnostic screenshots or test fixtures.

## Security headers

The existing Helmet configuration disables Content Security Policy, and the live public responses inspected did not supply a CSP header. Other security headers are retained. This change uses external self-hosted JS/CSS and does not introduce an inline tracking bootstrap or relax headers.

If the hosting layer later enables CSP, follow [Google's CSP guidance](https://developers.google.com/tag-platform/security/guides/csp): allow the self-hosted bootstrap, consent stylesheet, the Google tag script origin `https://www.googletagmanager.com`, and the appropriate Analytics collection origins under `https://*.google-analytics.com`, `https://*.analytics.google.com`, and `https://*.googletagmanager.com` in the applicable script/connect/image directives. The loader propagates a bootstrap nonce when supplied. Review the whole application's existing inline scripts before introducing a strict CSP; do not turn off other protections or add unrestricted sources merely to make tracking work.

## Search indexing — completed code

The sitemap now lists exactly these canonical public pages:

- `https://ikizame.rw/`
- `https://ikizame.rw/ifashanyigisho`
- `https://ikizame.rw/ibiciro`
- `https://ikizame.rw/ubufasha`
- `https://ikizame.rw/about`
- `https://ikizame.rw/terms`

The renderer inserts one correct canonical on each public page; `/index` canonicals to `/`. Admin/authentication pages, exams, private scores/results, APIs, and tokenized download links are excluded from the sitemap and receive `X-Robots-Tag: noindex, nofollow`. Private HTML served by the renderer also gets a robots meta tag. Non-production pages receive a noindex header; deploy with the correct existing production environment setting to keep public pages indexable.

`robots.txt` advertises the sitemap and disallows APIs. Private HTML is crawlable so crawlers can see its noindex directive; authentication still protects access. Robots directives are not access controls, and a robots block alone cannot ensure deindexing. Removed fabricated/stale sitemap last-modified values. See [robots meta rules](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) and [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

The live public pages responded successfully during the read-only audit, but these canonical/sitemap/header changes are only in the review branch until deployed.

## Verify Search Console at Afriregister — owner steps

1. Open Google Search Console, add a **Domain** property, and enter `ikizame.rw` without a scheme or path.
2. Google will display a DNS TXT verification value. **Copy the entire exact value Google supplies.** No verification token has been created or guessed in this repository. If help applying it is needed, provide that exact value.
3. Sign in to [Afriregister](https://www.afriregister.com/), select the domain, and open its DNS zone/record management. Menu names vary. Check the authoritative nameservers: if DNS is hosted elsewhere, add the record at that actual DNS host instead of the registrar.
4. Add a TXT record at the root/apex (`@` or a blank host, according to the panel), paste Google's exact verification value, and retain the default TTL. Preserve existing A, MX, and TXT records. Do not replace an SPF or other existing TXT record.
5. Allow DNS propagation, then click **Verify** in Search Console. Keep the TXT record after verification. If verification fails, check that the TXT record is visible at the authoritative DNS host before retrying. See [Google DNS verification](https://support.google.com/webmasters/answer/9008080).
6. After this branch has been reviewed and deployed, submit `https://ikizame.rw/sitemap.xml` in Search Console's Sitemaps screen. Inspect the important public URLs, confirm the canonical URL and indexing eligibility, and request indexing where appropriate. Sitemap submission is not a promise of indexing.

## Link Search Console and GA4 — owner steps

After the real GA4 web stream exists and the Search Console property is verified, open GA4 **Admin → Product links → Search Console links → Link**, choose the verified property and matching web stream, and submit the link. The account needs GA4 Editor permission and verified Search Console ownership. See [Google linking requirements](https://support.google.com/analytics/answer/10737381). This account connection has not been performed.
