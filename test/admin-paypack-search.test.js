const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  normalizePaypackReferenceSearch,
  matchesPaypackReference,
  filterPaypackTransactionsByReference
} = require('../helpers/paypackReferenceSearch');

const page = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin-paypack.html'), 'utf8');
const adminRoutes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'admin.js'), 'utf8');
const reference = 'd5ea25da-3879-40bc-ae80-a5616627c58c';
const rows = [
  { ref: reference, number: '0781234567', email: 'customer@example.test' },
  { ref: 'other-ref-123', number: '0789999999', email: 'd5ea25da@example.test' }
];

test('ADMIN_PAYPACK_SEARCH_REF_ONLY=PASS', () => {
  assert.match(page, /Search by Ref only/);
  assert.match(page, /searchReference\(this\.value\)/);
  const matchExpression = page.match(/const matches = ([^;]+);/)?.[1] || '';
  assert.match(matchExpression, /matchesReference\(row, term\)/);
  assert.doesNotMatch(matchExpression, /number|phone|email|amount|status|created_at/);
});

test('ADMIN_PAYPACK_FULL_REF_SEARCH=PASS', () => {
  assert.equal(matchesPaypackReference(rows[0], reference), true);
});

test('ADMIN_PAYPACK_PREFIX_REF_SEARCH=PASS', () => {
  assert.equal(filterPaypackTransactionsByReference(rows, 'd5ea25da').length, 1);
});

test('ADMIN_PAYPACK_SHORTENED_REF_SEARCH=PASS', () => {
  assert.equal(matchesPaypackReference(rows[0], 'd5ea25da...7c58c'), true);
});

test('ADMIN_PAYPACK_REF_PREFIX_LABEL_STRIPPED=PASS', () => {
  assert.equal(normalizePaypackReferenceSearch(' Ref: ' + reference), reference);
  assert.equal(matchesPaypackReference(rows[0], 'REF: d5ea25da...7c58c'), true);
});

test('ADMIN_PAYPACK_SEARCH_PARAMETERIZED=PASS', () => {
  assert.doesNotMatch(page, /SELECT|INSERT|UPDATE|DELETE|\bWHERE\b/i);
  assert.doesNotMatch(adminRoutes, /paypack-transactions[\s\S]{0,1500}(?:req\.query\.ref|reference.*\+|\+.*reference)/i);
});

test('ADMIN_PAYPACK_SEARCH_NO_PHONE_MATCH=PASS', () => {
  assert.equal(filterPaypackTransactionsByReference(rows, '0781234567').length, 0);
});

test('ADMIN_PAYPACK_SEARCH_NO_EMAIL_MATCH=PASS', () => {
  assert.equal(filterPaypackTransactionsByReference(rows, 'customer@example.test').length, 0);
});

test('ADMIN_PAYPACK_AUTH_PRESERVED=PASS', () => {
  assert.match(adminRoutes, /router\.get\('\/paypack-transactions', requireAdminLogin/);
});