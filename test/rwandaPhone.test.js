const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRwandaPhone } = require('../helpers/rwandaPhone');

test('accepts valid Rwanda mobile prefixes', () => {
  for (const phone of ['0781234567', '0791234567', '0721234567', '0731234567']) {
    assert.equal(normalizeRwandaPhone(phone), phone);
  }
});

test('normalizes international and formatted numbers before validating', () => {
  assert.equal(normalizeRwandaPhone('+250 72 123 4567'), '0721234567');
  assert.equal(normalizeRwandaPhone('250791234567'), '0791234567');
  assert.equal(normalizeRwandaPhone('72-123-4567'), '0721234567');
});

test('rejects unsupported prefixes and invalid lengths', () => {
  for (const phone of ['0711234567', '0741234567', '072123456', '07212345678', '1234567890']) {
    assert.throws(() => normalizeRwandaPhone(phone), /Nomero igomba gutangira/);
  }
});
