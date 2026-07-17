const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

process.env.PAYPACK_TEST_MODE = 'true';

const { normalizeAndValidatePaymentPhone } = require('../helpers/paymentPhone');

test('accepts the Paypack test numbers', () => {
  assert.equal(normalizeAndValidatePaymentPhone('0786663377'), '0786663377');
  assert.equal(normalizeAndValidatePaymentPhone('+250789245524'), '0789245524');
});

test('rejects non-test numbers in test mode', () => {
  assert.throws(
    () => normalizeAndValidatePaymentPhone('0781234567'),
    /test mode/i
  );
});

test('defaults to test mode unless explicitly disabled', () => {
  delete process.env.PAYPACK_TEST_MODE;
  delete require.cache[require.resolve('../helpers/paymentPhone')];
  const { normalizeAndValidatePaymentPhone: validateWithoutFlag } = require('../helpers/paymentPhone');
  assert.throws(
    () => validateWithoutFlag('0781234567'),
    /test mode/i
  );
  process.env.PAYPACK_TEST_MODE = 'true';
  delete require.cache[require.resolve('../helpers/paymentPhone')];
  require('../helpers/paymentPhone');
});
