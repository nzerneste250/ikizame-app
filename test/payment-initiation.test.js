const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const axios = require('axios');

test('payment initiation derives resource pricing on the server and durably records the pending order', async t => {
  t.mock.method(global, 'setTimeout', () => 0);
  t.mock.method(global, 'setInterval', () => 0);
  const createPaymentRouter = require('../routes/payments');
  t.mock.restoreAll();

  const calls = [];
  const db = { query(sql, values, callback) {
    if (typeof values === 'function') callback = values;
    calls.push({ sql, values });
    if (sql.trimStart().startsWith('CREATE TABLE')) return callback?.(null, {});
    if (sql.startsWith('SELECT id, title, is_paid, price')) {
      return callback(null, [{ id: 8, title: 'Database title', is_paid: 1, price: 750 }]);
    }
    if (sql.startsWith('INSERT INTO pending_payment_requests')) return callback(null, { affectedRows: 1 });
    throw new Error(`Unexpected SQL: ${sql}`);
  }};
  t.mock.method(axios, 'post', async (url, body) => {
    if (url.endsWith('/authorize')) return { data: { access: 'test-token', expires: Date.now() / 1000 + 3600 } };
    assert.equal(url, 'https://payments.paypack.rw/api/transactions/cashin');
    assert.deepEqual(body, { amount: 750, number: '0781234567' });
    return { data: { ref: 'resource-ref' } };
  });

  const app = express();
  app.use(express.json());
  app.use('/api/payments', createPaymentRouter(db));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/momo-push`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '0781234567', checkoutIntentType: 'RESOURCE', resourceId: 8, resourceTitle: 'Forged', resourcePrice: 1 })
  });
  assert.equal(response.status, 200);
  const pendingInsert = calls.find(call => call.sql.startsWith('INSERT INTO pending_payment_requests'));
  assert.deepEqual(pendingInsert.values, ['resource-ref', '0781234567', 750, 'Resource Access — Database title', null, null, null, 'RESOURCES', 8, 'Database title']);

  const rejected = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/momo-push`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '0781234567', checkoutIntentType: 'forged' })
  });
  assert.equal(rejected.status, 400);
});
