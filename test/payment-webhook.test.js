const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const axios = require('axios');

test('PayPack webhook requires raw-body signatures and grants each confirmed order once', async t => {
  const previousSecret = process.env.PAYPACK_WEBHOOK_SECRET;
  process.env.PAYPACK_WEBHOOK_SECRET = 'test-webhook-secret';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.PAYPACK_WEBHOOK_SECRET;
    else process.env.PAYPACK_WEBHOOK_SECRET = previousSecret;
  });

  t.mock.method(global, 'setTimeout', () => 0);
  t.mock.method(global, 'setInterval', () => 0);
  const createPaymentRouter = require('../routes/payments');
  t.mock.restoreAll();

  const orders = new Map([
    ['payment-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }],
    ['amount-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }],
    ['race-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }],
    ['currency-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }]
  ]);
  const confirmed = new Map([
    ['payment-ref', { ref: 'payment-ref', kind: 'CASHIN', status: 'successful', amount: 100, client: '0781234567' }],
    ['amount-ref', { ref: 'amount-ref', kind: 'CASHIN', status: 'successful', amount: 99, client: '0781234567' }],
    ['race-ref', { ref: 'race-ref', kind: 'CASHIN', status: 'successful', amount: 100, client: '0781234567' }],
    ['currency-ref', { ref: 'currency-ref', kind: 'CASHIN', status: 'successful', amount: 100, client: '0781234567', currency: 'USD' }],
    ['school-ref', { ref: 'school-ref', kind: 'CASHIN', status: 'successful', amount: 10000, client: '0781234567' }]
  ]);
  const { schoolPendingMap } = require('../routes/school');
  schoolPendingMap.set('school-ref', { phone: '0781234567', schoolId: 7, schoolName: 'Test School' });
  const rows = new Map();
  const insertAttempts = new Map();
  const raceSelectCallbacks = [];
  let providerLookups = 0;
  const db = {
    query(sql, values, callback) {
      if (typeof values === 'function') callback = values;
      if (sql.trimStart().startsWith('ALTER TABLE') || sql.trimStart().startsWith('CREATE TABLE')) return callback?.(null, {});
      if (sql.includes('information_schema.columns')) return callback(null, [{ count: 1 }]);
      if (sql.startsWith('SELECT id FROM payment_transactions')) {
        if (values[0] === 'race-ref') {
          raceSelectCallbacks.push(() => callback(null, rows.has(values[0]) ? [{ id: 1 }] : []));
          if (raceSelectCallbacks.length === 2) raceSelectCallbacks.splice(0).forEach(release => release());
          return;
        }
        return callback(null, rows.has(values[0]) ? [{ id: 1 }] : []);
      }
      if (sql.includes('FROM pending_payment_requests')) {
        const pending = orders.get(values[0]);
        return callback(null, pending ? [pending] : []);
      }
      if (sql.startsWith('INSERT INTO payment_transactions')) {
        const reference = values[3];
        insertAttempts.set(reference, (insertAttempts.get(reference) || 0) + 1);
        if (rows.has(reference)) {
          const duplicate = new Error('Duplicate reference');
          duplicate.code = 'ER_DUP_ENTRY';
          return callback(duplicate);
        }
        rows.set(reference, { id: rows.size + 1 });
        return callback(null, { insertId: rows.size });
      }
      throw new Error(`Unexpected test SQL: ${sql}`);
    }
  };

  t.mock.method(axios, 'post', async () => ({ data: { access: 'mock-token', expires: Date.now() / 1000 + 3600 } }));
  t.mock.method(axios, 'get', async url => {
    providerLookups++;
    const reference = decodeURIComponent(url.split('/').at(-1));
    return { data: confirmed.get(reference) };
  });

  const app = express();
  app.use(express.json({ verify: (req, res, buffer) => { req.rawBody = buffer; } }));
  app.use('/api/payments', createPaymentRouter(db));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const send = async (reference, options = {}) => {
    const payload = {
      kind: 'transaction:processed',
      data: { ref: reference, kind: 'CASHIN', status: 'successful', amount: 1 }
    };
    const body = JSON.stringify(payload, null, options.pretty ? 2 : undefined);
    const signature = options.signature === false
      ? undefined
      : crypto.createHmac('sha256', 'test-webhook-secret').update(body).digest('base64');
    const headers = { 'content-type': 'application/json' };
    if (signature) headers['x-paypack-signature'] = options.invalid ? 'invalid' : signature;
    return fetch(`http://127.0.0.1:${server.address().port}/api/payments/callback`, {
      method: 'POST', headers, body
    });
  };

  const missingSignature = await send('payment-ref', { signature: false });
  assert.equal(missingSignature.status, 401);
  const invalidSignature = await send('payment-ref', { invalid: true });
  assert.equal(invalidSignature.status, 401);
  assert.equal(providerLookups, 0);
  assert.equal(rows.size, 0);

  const mismatch = await send('currency-ref');
  assert.equal(mismatch.status, 409);
  assert.equal(rows.has('currency-ref'), false);
  const amountMismatch = await send('amount-ref');
  assert.equal(amountMismatch.status, 409);
  assert.equal(rows.has('amount-ref'), false);

  const successful = await send('payment-ref', { pretty: true });
  assert.equal(successful.status, 200);
  assert.equal(rows.has('payment-ref'), true);
  assert.equal(insertAttempts.get('payment-ref'), 1);

  const duplicate = await send('payment-ref');
  assert.equal(duplicate.status, 200);
  assert.equal(insertAttempts.get('payment-ref'), 1);

  const raced = await Promise.all([send('race-ref'), send('race-ref')]);
  assert.deepEqual(raced.map(response => response.status), [200, 200]);
  assert.equal(insertAttempts.get('race-ref'), 2);
  const schoolPayment = await send('school-ref');
  assert.equal(schoolPayment.status, 200);
  assert.equal(rows.has('school-ref'), true);
  assert.equal(schoolPendingMap.has('school-ref'), false);
  assert.equal(rows.size, 3);
});