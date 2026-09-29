const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { evaluateExamAccessState } = require('../helpers/examAccess');
const createExamRouter = require('../routes/exams');

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

test('submits a paid exam using the newest eligible payment when no active record is set', async () => {
  let creditUpdate;
  const db = {
    query(sql, values, callback) {
      if (typeof values === 'function') callback = values;
      if (sql.startsWith('SELECT id, phone_number, status, remaining_exams FROM payment_transactions')) {
        return callback(null, [{ id: 42, phone_number: '0781234567', status: 'SUCCESS', remaining_exams: 1 }]);
      }
      if (sql.startsWith('SELECT id, correct_option, question')) {
        return callback(null, [{ id: 1, correct_option: 'A' }]);
      }
      if (sql.startsWith('INSERT INTO exam_attempts')) return callback(null, {});
      if (sql.startsWith('UPDATE payment_transactions')) {
        creditUpdate = { sql, values };
        return callback(null, { affectedRows: 1 });
      }
      throw new Error(`Unexpected query: ${sql}`);
    }
  };

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = {
      examStudentName: 'Test Student',
      examPhoneNumber: '0781234567',
      activePaymentRecordId: null,
      lockedExamQuestionIds: [1]
    };
    next();
  });
  app.use('/api/exams', createExamRouter(db));

  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/exams/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_1: 'A' })
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { score: 1, total: 1 });
    assert.match(creditUpdate.sql, /WHERE id = \(\s*SELECT id FROM \(\s*SELECT id FROM payment_transactions/);
    assert.match(creditUpdate.sql, /ORDER BY id DESC LIMIT 1\s*\) AS eligible_payment/);
    assert.deepEqual(creditUpdate.values, ['781234567']);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
});

test('limits exam sessions to 20 questions while admins can request the full question bank', async () => {
  const questions = Array.from({ length: 30 }, (_, index) => ({
    id: index + 1,
    question: `Question ${index + 1}`
  }));
  const db = {
    query(sql, values, callback) {
      if (typeof values === 'function') callback = values;
      callback(null, questions);
    }
  };

  const router = createExamRouter(db);
  const listRoute = router.stack.find((layer) => layer.route?.path === '/' && layer.route.methods.get);
  const getExamList = listRoute.route.stack[0].handle;
  const session = { isAdminAuthenticated: true, lockedExamQuestionIds: [] };
  const executeListRequest = (query) => new Promise((resolve) => {
    getExamList({ query, session }, { json: resolve });
  });

  const examQuestions = await executeListRequest({});
  const allQuestions = await executeListRequest({ full: '1' });

  assert.equal(examQuestions.length, 20);
  assert.equal(allQuestions.length, 30);
});
