const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const axios = require('axios');

test('payment verification preserves statuses and exposes analytics only after provider-confirmed success', async t => {
  // Stub only provider token-refresh startup timers; never call the payment provider.
  t.mock.method(global, 'setTimeout', () => 0);
  t.mock.method(global, 'setInterval', () => 0);
  const createPaymentRouter = require('../routes/payments');
  t.mock.restoreAll();
  let lookups = 0, providerUnavailable = false;
  t.mock.method(axios, 'post', async () => ({ data: { access: 'test-token', expires: Date.now() / 1000 + 3600 } }));
  t.mock.method(axios, 'get', async (url, options) => {
    lookups++;
    assert.equal(url, 'https://payments.paypack.rw/api/transactions/find/payment-ref');
    assert.equal(options.maxRedirects, 0);
    if (providerUnavailable) throw new Error('Provider unavailable');
    return { data: { ref: 'payment-ref', status: 'successful', kind: 'CASHIN', amount: 100 } };
  });
  const saved = { enabled: process.env.GA4_ENABLED, id: process.env.GA4_MEASUREMENT_ID };
  t.after(() => {
    for (const [key, value] of [['GA4_ENABLED', saved.enabled], ['GA4_MEASUREMENT_ID', saved.id]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  let row, admin = false;
  const db = { query(sql, values, callback) {
    if (typeof values === 'function') callback = values;
    if (sql.startsWith('SELECT status')) { assert.deepEqual(values, ['payment-ref', 'payment-ref']); return callback(null, row ? [row] : []); }
    // Existing schema initialization; no real database writes in this test.
    callback?.(null, {});
  } };
  const app = express();
  app.use((req, res, next) => { req.session = { isAdminAuthenticated: admin }; next(); });
  app.use('/api/payments', createPaymentRouter(db));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const verify = async () => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/verify/payment-ref`);
      assert.equal(response.status, 200);
      return response.json();
    };
    process.env.GA4_ENABLED = 'true'; process.env.GA4_MEASUREMENT_ID = 'G-A1B2C3D4E5';
    assert.deepEqual(await verify(), { status: 'PENDING' });
    row = { status: 'FAILED', plan_name: 'Existing Plan', amount: 100, reference_id: 'payment-ref' };
    assert.deepEqual(await verify(), { status: 'FAILED', plan: 'Existing Plan' });
    assert.equal(lookups, 0);
    row.status = 'SUCCESS';
    const success = await verify();
    assert.equal(success.status, 'SUCCESS'); assert.equal(success.plan, 'Existing Plan');
    assert.equal(success.analyticsPurchase.value, 100); assert.equal(success.analyticsPurchase.currency, 'RWF');
    assert.doesNotMatch(JSON.stringify(success.analyticsPurchase), /Existing Plan|payment-ref/);
    assert.equal((await verify()).analyticsPurchase.transaction_id, success.analyticsPurchase.transaction_id);
    assert.equal(lookups, 1);
    process.env.GA4_ENABLED = 'false';
    assert.deepEqual(await verify(), { status: 'SUCCESS', plan: 'Existing Plan' });
    process.env.GA4_ENABLED = 'true'; admin = true;
    assert.deepEqual(await verify(), { status: 'SUCCESS', plan: 'Existing Plan' });
    assert.equal(lookups, 1);
    admin = false; row.amount = 200;
    assert.deepEqual(await verify(), { status: 'SUCCESS', plan: 'Existing Plan' });
    assert.equal(lookups, 2); // Mismatch cannot fabricate analytics or change status.
    row.amount = 300; providerUnavailable = true;
    assert.deepEqual(await verify(), { status: 'SUCCESS', plan: 'Existing Plan' });
    assert.equal(lookups, 3);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
