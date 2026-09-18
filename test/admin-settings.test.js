const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizePhoneNumber, getConfiguredReportEmails } = require('../helpers/adminSettings');

test('normalizePhoneNumber keeps Rwanda phone numbers in the expected format', () => {
  assert.equal(normalizePhoneNumber('0786663377'), '0786663377');
  assert.equal(normalizePhoneNumber('+250786663377'), '0786663377');
  assert.equal(normalizePhoneNumber('250786663377'), '0786663377');
});

test('getConfiguredReportEmails resolves fallback values when no configuration rows are present', () => {
  const emails = getConfiguredReportEmails([], ['ops@example.com']);
  assert.deepEqual(emails, ['ops@example.com']);
});
