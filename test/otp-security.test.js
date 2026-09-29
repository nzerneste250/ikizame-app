const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createOtpState,
  canIssueOtp,
  registerOtpCode,
  verifyOtpCode
} = require('../helpers/otp');

test('OTP requests are rate-limited and cooldown is enforced', () => {
  const state = createOtpState();
  const key = 'admin@example.com';

  assert.equal(canIssueOtp(state, key).ok, true);
  registerOtpCode(state, key, '123456', 10 * 60 * 1000);

  const secondIssue = canIssueOtp(state, key);
  assert.equal(secondIssue.ok, false);
  assert.match(secondIssue.error, /cooldown|wait|rate/i);
});

test('incorrect OTP attempts are limited and expired codes are rejected', () => {
  const state = createOtpState();
  const key = 'school@example.com';
  registerOtpCode(state, key, '654321', 10 * 60 * 1000);

  const invalidResult = verifyOtpCode(state, key, '111111', { maxAttempts: 3, lockMs: 60000 });
  assert.equal(invalidResult.ok, false);
  assert.match(invalidResult.error, /invalid|incorrect|otp/i);

  const expiredState = createOtpState();
  registerOtpCode(expiredState, key, '999999', -1000);
  const expiredResult = verifyOtpCode(expiredState, key, '999999');
  assert.equal(expiredResult.ok, false);
  assert.match(expiredResult.error, /yarangiye|expired/i);
});

test('correct OTP verification succeeds once and clears the code', () => {
  const state = createOtpState();
  const key = 'learner@example.com';
  registerOtpCode(state, key, '777777', 10 * 60 * 1000);

  const validResult = verifyOtpCode(state, key, '777777');
  assert.equal(validResult.ok, true);
  assert.equal(state.entries.has(key), false);
});
