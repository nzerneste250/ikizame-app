const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateExamAccessState } = require('../helpers/examAccess');

test('allows a valid paid exam session using active payment credit', () => {
  const result = evaluateExamAccessState({
    session: {
      examPhoneNumber: '0781234567',
      activePaymentRecordId: 42,
      assignedStudentId: null
    },
    paymentRows: [{ id: 42, phone_number: '0781234567', status: 'SUCCESS', remaining_exams: 5 }],
    schoolRows: []
  });

  assert.equal(result.allowed, true);
  assert.equal(result.source, 'payment');
  assert.equal(result.remaining, 5);
});

test('rejects a session with no active payment and no assigned exam credit', () => {
  const result = evaluateExamAccessState({
    session: {
      examPhoneNumber: '0781234567',
      activePaymentRecordId: null,
      assignedStudentId: null
    },
    paymentRows: [],
    schoolRows: []
  });

  assert.equal(result.allowed, false);
  assert.match(result.reason, /valid.*access|no.*exam/i);
});

test('allows owner bypass sessions without a payment record', () => {
  const result = evaluateExamAccessState({
    session: {
      examPhoneNumber: '0781234567',
      activePaymentRecordId: null,
      assignedStudentId: null,
      isOwnerBypass: true
    },
    paymentRows: [],
    schoolRows: []
  });

  assert.equal(result.allowed, true);
  assert.equal(result.source, 'owner-bypass');
});
