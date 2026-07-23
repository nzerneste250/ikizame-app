const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

process.env.PAYPACK_TEST_MODE = 'true';

const { normalizeAndValidatePaymentPhone } = require('../helpers/paymentPhone');

test('accepts standard mobile numbers', () => {
  assert.equal(normalizeAndValidatePaymentPhone('0786663377'), '0786663377');
  assert.equal(normalizeAndValidatePaymentPhone('+250789245524'), '0789245524');
});

test('accepts non-test numbers even when test mode is enabled', () => {
  assert.equal(normalizeAndValidatePaymentPhone('0781234567'), '0781234567');
});

test('defaults to live mode unless explicitly enabled', () => {
  delete process.env.PAYPACK_TEST_MODE;
  delete require.cache[require.resolve('../helpers/paymentPhone')];
  const { normalizeAndValidatePaymentPhone: validateWithoutFlag } = require('../helpers/paymentPhone');
  assert.equal(validateWithoutFlag('0781234567'), '0781234567');
  process.env.PAYPACK_TEST_MODE = 'true';
  delete require.cache[require.resolve('../helpers/paymentPhone')];
  require('../helpers/paymentPhone');
});
