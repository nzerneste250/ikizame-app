const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  normalizePaypackReferenceSearch,
  getPaypackReference,
  matchesPaypackReference,
  filterPaypackTransactionsByReference
} = require('../helpers/paypackReferenceSearch');
const {
  getPaypackStatus,
  getPaypackPhone,
  getPaypackTimestamp,
  formatPaypackTimestamp
} = require('../helpers/paypackLedgerDisplay');

const page = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin-paypack.html'), 'utf8');
const paymentsPage = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin-payments.html'), 'utf8');
const adminRoutes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
const reference = 'd5ea25da-3879-40bc-ae80-a5616627c58c';
const providerRow = { ref: reference, kind: 'CASHIN', amount: 200, status: 'PENDING' };
const localRow = { rwandapay_tx_id: reference, reference_id: 'local-reference' };

test('ADMIN_PAYMENT_REF_FULL_MATCH=PASS', () => {
  assert.equal(matchesPaypackReference(localRow, reference), true);
});

test('ADMIN_PAYMENT_REF_PREFIX_MATCH=PASS', () => {
  assert.equal(matchesPaypackReference(localRow, 'd5ea25da'), true);
});

test('ADMIN_PAYMENT_REF_SHORT_MATCH=PASS', () => {
  assert.equal(matchesPaypackReference(localRow, 'd5ea25da...7c58c'), true);
});

test('ADMIN_PAYMENT_REF_LABEL_NORMALIZED=PASS', () => {
  assert.equal(normalizePaypackReferenceSearch(' Ref: d5ea25da…7c58c '), 'd5ea25da...7c58c');
  assert.equal(matchesPaypackReference(localRow, 'REF: d5ea25da...7c58c'), true);
});

test('ADMIN_PAYMENT_REF_ONLY=PASS', () => {
  assert.equal(filterPaypackTransactionsByReference([localRow], '0788123456').length, 0);
  assert.equal(filterPaypackTransactionsByReference([localRow], '200').length, 0);
  assert.equal(filterPaypackTransactionsByReference([localRow], 'CASHIN').length, 0);
  assert.match(paymentsPage, /Search by Ref only, e\.g\. d5ea25da\.\.\.7c58c/);
  assert.match(paymentsPage, /data-reference/);
});

test('PAYPACK_LEDGER_REF_FULL_MATCH=PASS', () => {
  assert.equal(matchesPaypackReference(providerRow, reference), true);
});

test('PAYPACK_LEDGER_REF_PREFIX_MATCH=PASS', () => {
  assert.equal(matchesPaypackReference(providerRow, 'd5ea25da'), true);
});

test('PAYPACK_LEDGER_REF_SHORT_MATCH=PASS', () => {
  assert.equal(matchesPaypackReference(providerRow, 'd5ea25da...7c58c'), true);
});

test('PAYPACK_REFERENCE_NEGATIVE_CASES=PASS', () => {
  assert.equal(matchesPaypackReference(providerRow, '7c58c...d5ea25da'), false);
  assert.equal(matchesPaypackReference(providerRow, 'random-reference'), false);
  assert.equal(matchesPaypackReference(providerRow, '0788xxxxxx'), false);
  assert.equal(matchesPaypackReference(providerRow, '200'), false);
  assert.equal(matchesPaypackReference(providerRow, 'CASHIN'), false);
});

test('PAYPACK_LEDGER_RESULT_COUNT_ACCURATE=PASS', () => {
  assert.equal(filterPaypackTransactionsByReference([providerRow, { ref: 'other-ref' }], reference).length, 1);
  assert.match(page, /count\.textContent = `\$\{matches\.length\} transaction/);
});

test('PAYPACK_LEDGER_NO_FALSE_NO_RESULT=PASS', () => {
  assert.match(page, /if \(matches\.length\) \{/);
  assert.doesNotMatch(page, /const payments = matches\.filter/);
  assert.match(page, /No transaction found.*Try a full or partial PayPack reference/);
});

test('PAYPACK_LEDGER_EMPTY_STATE_ZERO_ONLY=PASS', () => {
  assert.match(page, /renderLedgerRows\(matches\)/);
  assert.match(page, /if \(!rows\.length\).*aria-hidden="true"/);
  assert.doesNotMatch(page, /No matching PayPack transactions found/);
});

test('PAYPACK_LEDGER_API_ERROR_DISTINCT=PASS', () => {
  assert.match(page, /ledgerState = 'error'/);
  assert.match(page, /Unable to load PayPack transactions\. Try again\./);
  assert.match(page, /ledgerState = 'loading'/);
});

test('PAYPACK_LEDGER_AUTH_PRESERVED=PASS', () => {
  assert.match(adminRoutes, /router\.get\('\/paypack-transactions', requireAdminLogin/);
  assert.match(adminRoutes, /router\.get\('\/payment-transactions', requireAdminLogin/);
});

test('PAYPACK_LEDGER_NO_PAYMENT_MUTATION=PASS', () => {
  const ledgerScript = page.slice(page.indexOf('<script src="assets/js/admin-responsive.js">'));
  assert.doesNotMatch(ledgerScript, /fetch\([^)]*payment-transaction/i);
  assert.doesNotMatch(ledgerScript, /payment-transaction\//);
});

test('PAYPACK_LEDGER_RESPONSIVE=PASS', () => {
  assert.match(page, /@media \(max-width:560px\)/);
  assert.match(page, /\.table-wrap \{ overflow-x:auto; \}/);
  assert.match(page, /min-width:760px/);
});

test('PAYPACK_LEDGER_UNKNOWN_STATUS_NOT_INFERRED=PASS', () => {
  assert.match(page, /return \[status \? String\(status\)\.trim\(\) : 'Not checked'/);
  assert.match(page, /function statusPresentation/);
  assert.doesNotMatch(page, /statusLabel.*SUCCESS|status.*CASHIN.*SUCCESS/i);
});

test('PAYPACK_STATUS_NOT_CHECKED_INITIAL=PASS', () => {
  assert.match(page, /Not checked/);
  assert.match(page, /Check status/);
});

test('PAYPACK_STATUS_LOOKUP_AUTHORITATIVE=PASS', () => {
  assert.match(adminRoutes, /router\.get\('\/paypack-transaction-status', requireAdminLogin/);
  assert.match(adminRoutes, /transactions\/find/);
  assert.match(adminRoutes, /events\/transactions/);
  assert.match(page, /paypack-transaction-status\?ref=/);
});

test('PAYPACK_STATUS_LOOKUP_NO_MUTATION=PASS', () => {
  assert.match(adminRoutes, /paypackStatusCache/);
  assert.doesNotMatch(adminRoutes, /UPDATE payment_transactions.*paypack-transaction-status/);
  assert.doesNotMatch(adminRoutes, /INSERT INTO payment_transactions.*paypack-transaction-status/);
});

test('PAYPACK_STATUS_NO_BULK_LOOKUPS=PASS', () => {
  assert.match(page, /matches\.length === 1/);
  assert.match(page, /checkTransactionStatus\(referenceValue\(matches\[0\]\)/);
  assert.doesNotMatch(page, /rows\.forEach\(.*checkTransactionStatus/s);
});

test('PAYPACK_STATUS_LOOKUP_FAILURE_SAFE=PASS', () => {
  assert.match(adminRoutes, /status: 'Status unavailable'/);
  assert.match(page, /row\.status = 'Status unavailable'/);
});

test('ADMIN_PAYPACK_PAGE_GUARD_AND_SAFE_RETURN=PASS', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  const auth = fs.readFileSync(path.join(__dirname, '..', 'middleware', 'auth.js'), 'utf8');
  assert.match(server, /app\.get\(\['\/admin-paypack', '\/admin-paypack\/'\]/);
  assert.match(server, /redirectToAdminLogin\(req, res\)/);
  assert.match(auth, /getSafeAdminPath/);
  assert.match(auth, /startsWith\('\/\/'\)/);
  assert.match(auth, /includes\('\:\/\/'\)/);
  assert.match(auth, /replace\(\/\\\/\$\//);
});

test('ADMIN_PAYPACK_IDLE_TIMEOUT_120_SECONDS=PASS', () => {
  assert.match(page, /const IDLE_MS = 120 \* 1000/);
  assert.match(page, /fetch\('\/api\/admin\/logout'/);
  assert.match(page, /visibilitychange/);
  assert.match(page, /localStorage\.setItem\('ikizame-admin-paypack-logout'/);
  assert.match(page, /event\.key === 'ikizame-admin-paypack-logout'/);
});

test('PAYPACK_REFERENCE_EXTRACTION_USES_OBSERVED_FIELDS=PASS', () => {
  assert.equal(getPaypackReference(providerRow), reference);
  assert.equal(getPaypackReference(localRow), reference);
  assert.equal(getPaypackReference({ reference }), reference);
  assert.equal(getPaypackReference({ paypack_reference: reference }), '');
});

test('PAYPACK_COPY_REFERENCE_EXACT=PASS', () => {
  assert.match(page, /navigator\.clipboard\.writeText\(value\)/);
  assert.match(page, /fallbackCopy/);
});

test('PAYPACK_COPY_REFERENCE_FEEDBACK=PASS', () => {
  assert.match(page, /setFeedback\('Copied', 'copied', 'fa-check'\)/);
  assert.match(page, /setTimeout\(\(\) =>/);
  assert.match(page, /1800/);
});

test('PAYPACK_COPY_REFERENCE_FAILURE_STATE=PASS', () => {
  assert.match(page, /setFeedback\('Copy failed', 'failed', 'fa-xmark'\)/);
  assert.match(page, /Copy failed/);
});

test('PAYPACK_COPY_REFERENCE_ACCESSIBLE=PASS', () => {
  assert.match(page, /aria-label="Copy reference"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /button\.setAttribute\('aria-label', label\)/);
  assert.match(page, /type="button"/);
});

test('PAYPACK_SEARCH_WIDER_DESKTOP=PASS', () => {
  assert.match(page, /width:min\(100%, 900px\)/);
  assert.match(page, /\.contact-search-input \{ width:100%/);
});

test('PAYPACK_SEARCH_RESPONSIVE=PASS', () => {
  assert.match(page, /\.contact-search-row \{ align-items:stretch; flex-direction:column; \}/);
  assert.match(page, /overflow-x:auto/);
});

test('PAYPACK_STATUS_REAL_FIELD_USED_IF_PRESENT=PASS', () => {
  assert.equal(getPaypackStatus({ status: 'successful' }), 'successful');
  assert.match(page, /String\(row\.status \|\| ''\)/);
});

test('PAYPACK_STATUS_NOT_INFERRED=PASS', () => {
  assert.equal(getPaypackStatus({ kind: 'CASHIN', amount: 200, fee: 7 }), '');
  assert.match(page, /return \[status \? String\(status\)\.trim\(\) : 'Not checked'/);
  assert.doesNotMatch(page, /kind === 'CASHIN'.*status/);
});

test('PAYPACK_PHONE_REAL_FIELD_USED_IF_PRESENT=PASS', () => {
  assert.equal(getPaypackPhone({ client: '0781234567' }), '0781234567');
  assert.match(page, /row\.client \|\| ''/);
});

test('PAYPACK_PHONE_NOT_GUESSED=PASS', () => {
  assert.equal(getPaypackPhone({ ref: reference, phone: '0781234567' }), '');
  assert.match(page, /phone === 'Not provided' \? 'Not supplied by PayPack'/);
});

test('PAYPACK_DATE_REAL_FIELD_USED_IF_PRESENT=PASS', () => {
  const timestamp = '2026-10-09T18:25:00.000Z';
  assert.equal(getPaypackTimestamp({ timestamp }), timestamp);
  assert.match(formatPaypackTimestamp(timestamp), /09 Oct 2026/);
  assert.match(page, /row\.timestamp \|\| ''/);
});

test('PAYPACK_DATE_NOT_SYNTHESIZED=PASS', () => {
  assert.equal(getPaypackTimestamp({ created_at: '2026-10-09T18:25:00.000Z' }), '');
  assert.equal(formatPaypackTimestamp(''), 'Not provided');
  assert.match(page, /timestamp \? formatPaypackTimestamp\(timestamp\) : 'Not provided'/);
});

test('PAYPACK_MISSING_PROVIDER_FIELDS_SAFE_FALLBACK=PASS', () => {
  assert.equal(getPaypackStatus(providerRow), 'PENDING');
  assert.equal(getPaypackPhone({ ref: reference }), '');
  assert.equal(getPaypackTimestamp({ ref: reference }), '');
  assert.match(page, /Not checked/);
  assert.match(page, /Not provided/);
  assert.match(page, /Not supplied by PayPack/);
});