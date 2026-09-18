const test = require('node:test');
const assert = require('node:assert/strict');

const { PROTECTED_REPORT_EMAIL, normalizePhoneNumber, getConfiguredReportEmails } = require('../helpers/adminSettings');

test('normalizePhoneNumber keeps Rwanda phone numbers in the expected format', () => {
  assert.equal(normalizePhoneNumber('0786663377'), '0786663377');
  assert.equal(normalizePhoneNumber('+250786663377'), '0786663377');
  assert.equal(normalizePhoneNumber('250786663377'), '0786663377');
});

test('getConfiguredReportEmails resolves fallback values when no configuration rows are present', () => {
  const emails = getConfiguredReportEmails([], ['ops@example.com']);
  assert.deepEqual(emails, [PROTECTED_REPORT_EMAIL, 'ops@example.com']);
});

test('getConfiguredReportEmails always protects the default and removes the legacy recipient', () => {
  const emails = getConfiguredReportEmails([
    { email: 'dotadostationerystore@gmail.com' },
    { email: 'dotadostationarystore@gmail.com' },
    { email: 'team@example.com' },
    { email: PROTECTED_REPORT_EMAIL }
  ]);
  assert.deepEqual(emails, [PROTECTED_REPORT_EMAIL, 'team@example.com']);
});
