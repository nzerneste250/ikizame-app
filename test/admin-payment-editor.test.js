const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

const page = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin-payments.html'), 'utf8');

test('admin payment editor displays original financial values and submits only remaining credits', () => {
  assert.match(page, /id="editPaymentTotalExams" readonly/);
  assert.match(page, /id="editPaymentAmount" min="0" readonly/);
  assert.match(page, /id="editPaymentPricePerExam" readonly/);
  assert.doesNotMatch(page, /function calculateTieredExamAmount/);
  assert.match(page, /JSON\.stringify\(\{ remaining_exams \}\)/);
  assert.doesNotMatch(page, /JSON\.stringify\(\{ total_exams, remaining_exams \}\)/);
});

test('admin UI hides school transaction edits and backend rejects direct school edits', async t => {
  const createAdminRouter = require('../routes/admin');
  const calls = [];
  const transactions = new Map([
    [1, { school_id: null, total_exams: 30, remaining_exams: 4, amount: 2220, price_per_exam: 50, status: 'SUCCESS' }],
    [2, { school_id: 7, total_exams: 300, remaining_exams: 200, amount: 20000, price_per_exam: 66.67, status: 'SUCCESS' }]
  ]);
  const db = {
    query(sql, values, callback) {
      calls.push({ sql, values });
      if (sql.startsWith('SELECT school_id FROM payment_transactions')) {
        const row = transactions.get(values[0]);
        return callback(null, row ? [row] : []);
      }
      if (sql.startsWith('SELECT school_id, total_exams, remaining_exams FROM payment_transactions')) {
        const row = transactions.get(values[0]);
        return callback(null, row ? [{
          school_id: row.school_id,
          total_exams: row.total_exams,
          remaining_exams: row.remaining_exams
        }] : []);
      }
      if (sql.startsWith('UPDATE payment_transactions')) {
        assert.match(sql, /^UPDATE payment_transactions SET remaining_exams=\?/);
        const row = transactions.get(values[1]);
        row.remaining_exams = values[0];
        return callback(null, { affectedRows: 1 });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = { isAdminAuthenticated: true, adminRole: 'superadmin', lastAdminActivity: Date.now() };
    next();
  });
  const noOpLimiter = (req, res, next) => next();
  app.use('/api/admin', createAdminRouter(db, noOpLimiter));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const url = id => `http://127.0.0.1:${server.address().port}/api/admin/payment-transaction/${id}`;
  const validIdBoundary = await fetch(url('0001'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ remaining_exams: 4 })
  });
  assert.equal(validIdBoundary.status, 200);
  assert.equal(calls.at(-1).values[0], 1);

  const queriesBeforeInvalidIds = calls.length;
  for (const id of ['0', '-1', '1.5', '1e2', 'abc', '9007199254740992']) {
    const invalidIdResponse = await fetch(url(id), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ remaining_exams: 4 })
    });
    assert.equal(invalidIdResponse.status, 400, `expected transaction ID ${id} to be rejected`);
  }
  assert.equal(calls.length, queriesBeforeInvalidIds, 'invalid IDs must not trigger database queries');

  const maximumSafeId = await fetch(url(String(Number.MAX_SAFE_INTEGER)), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ remaining_exams: 0 })
  });
  assert.equal(maximumSafeId.status, 404);
  assert.equal(calls.at(-1).values[0], Number.MAX_SAFE_INTEGER);

  const schoolResponse = await fetch(url(2), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ total_exams: 300, remaining_exams: 200 })
  });
  assert.equal(schoolResponse.status, 400);
  assert.equal(calls.some(call => call.sql.startsWith('UPDATE payment_transactions')), false);

  const personalResponse = await fetch(url(1), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ remaining_exams: 10 })
  });
  assert.equal(personalResponse.status, 200);
  const update = calls.find(call => call.sql.startsWith('UPDATE payment_transactions'));
  assert.match(update.sql, /school_id IS NULL/);
  assert.deepEqual(update.values, [10, 1]);
  assert.deepEqual(transactions.get(1), {
    school_id: null, total_exams: 30, remaining_exams: 10, amount: 2220,
    price_per_exam: 50, status: 'SUCCESS'
  });

  const quantityChange = await fetch(url(1), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ total_exams: 16, remaining_exams: 10 })
  });
  assert.equal(quantityChange.status, 400);
  assert.match((await quantityChange.json()).error, /cannot be changed/i);

  const financialChange = await fetch(url(1), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ amount: 1280, price_per_exam: 80, remaining_exams: 10 })
  });
  assert.equal(financialChange.status, 400);
  assert.deepEqual(transactions.get(1), {
    school_id: null, total_exams: 30, remaining_exams: 10, amount: 2220,
    price_per_exam: 50, status: 'SUCCESS'
  });

  for (const remaining_exams of [
    undefined, true, false, [], [1], {}, null, '', ' ', '1.5', '-1',
    1.5, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '9007199254740992'
  ]) {
    const invalidEdit = await fetch(url(1), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ remaining_exams })
    });
    assert.equal(invalidEdit.status, 400, `expected ${JSON.stringify(remaining_exams)} to be rejected`);
  }
  assert.equal(calls.some(call => call.sql.startsWith('UPDATE payment_transactions') && call.values[0] !== 10), false);

  const zeroBalance = await fetch(url(1), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ remaining_exams: 0 })
  });
  assert.equal(zeroBalance.status, 200);
  assert.equal(transactions.get(1).remaining_exams, 0);

  const digitStringBoundary = await fetch(url(1), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ remaining_exams: '30' })
  });
  assert.equal(digitStringBoundary.status, 200);
  assert.equal(transactions.get(1).remaining_exams, 30);

  const sourceEditAction = page.slice(page.indexOf('const editAction ='), page.indexOf('return `<tr', page.indexOf('const editAction =')));
  assert.match(sourceEditAction, /tx\.school_id != null/);
  assert.match(sourceEditAction, /School package transactions cannot be edited here/);
});
