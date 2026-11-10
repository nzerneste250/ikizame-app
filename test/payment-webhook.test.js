const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const axios = require('axios');
const { SCHOOL_PACKAGES } = require('../helpers/pricing');

test('PayPack webhook requires raw-body signatures and grants each confirmed order once', async t => {
  const previousSecret = process.env.PAYPACK_WEBHOOK_SECRET;
  const previousMerchant = process.env.PAYPACK_MERCHANT_CODE;
  process.env.PAYPACK_WEBHOOK_SECRET = 'test-webhook-secret';
  process.env.PAYPACK_MERCHANT_CODE = 'test-merchant';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.PAYPACK_WEBHOOK_SECRET;
    else process.env.PAYPACK_WEBHOOK_SECRET = previousSecret;
    if (previousMerchant === undefined) delete process.env.PAYPACK_MERCHANT_CODE;
    else process.env.PAYPACK_MERCHANT_CODE = previousMerchant;
  });

  t.mock.method(global, 'setTimeout', () => 0);
  t.mock.method(global, 'setInterval', () => 0);
  const createPaymentRouter = require('../routes/payments');
  t.mock.restoreAll();

  const orders = new Map([
    ['payment-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }],
    ['amount-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }],
    ['race-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }],
    ['lookup-status-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }],
    ['lookup-success-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }],
    ['lookup-failed-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }],
    ['currency-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }],
    ['merchant-ref', { phone: '0781234567', amount: 100, planLabel: 'Test pass', examCount: 1, priceToStore: 100, serviceType: 'EXAMS' }]
  ]);
  const confirmed = new Map([
    ['payment-ref', { ref: 'payment-ref', kind: 'CASHIN', status: 'successful', amount: 100, client: '0781234567', merchant: 'test-merchant' }],
    ['amount-ref', { ref: 'amount-ref', kind: 'CASHIN', status: 'successful', amount: 99, client: '0781234567', merchant: 'test-merchant' }],
    ['race-ref', { ref: 'race-ref', kind: 'CASHIN', status: 'successful', amount: 100, client: '0781234567', merchant: 'test-merchant' }],
    ['lookup-status-ref', { ref: 'lookup-status-ref', kind: 'CASHIN', amount: 100, client: '0781234567', merchant: 'test-merchant' }],
    ['lookup-success-ref', { ref: 'lookup-success-ref', kind: 'CASHIN', status: 'success', amount: 100, client: '0781234567', merchant: 'test-merchant' }],
    ['lookup-failed-ref', { ref: 'lookup-failed-ref', kind: 'CASHIN', status: 'failed', amount: 100, client: '0781234567', merchant: 'test-merchant' }],
    ['currency-ref', { ref: 'currency-ref', kind: 'CASHIN', status: 'successful', amount: 100, client: '0781234567', merchant: 'test-merchant', currency: 'USD' }],
    ['merchant-ref', { ref: 'merchant-ref', kind: 'CASHIN', status: 'successful', amount: 100, client: '0781234567', merchant: 'another-merchant' }]
  ]);
  const schoolPackages = SCHOOL_PACKAGES.map(pkg => ({
    id: pkg.id,
    reference: `school-${pkg.id}-ref`,
    name: pkg.name,
    amount: pkg.price,
    credits: pkg.examCredits
  }));
  for (const pkg of schoolPackages) {
    confirmed.set(pkg.reference, {
      ref: pkg.reference, kind: 'CASHIN', status: 'successful',
      amount: pkg.amount, client: '0781234567', merchant: 'test-merchant'
    });
  }
  confirmed.set('school-standard-wrong-amount-ref', {
    ref: 'school-standard-wrong-amount-ref', kind: 'CASHIN', status: 'successful',
    amount: 19999, client: '0781234567', merchant: 'test-merchant'
  });
  confirmed.set('school-pending-ref', {
    ref: 'school-pending-ref', kind: 'CASHIN', status: 'pending',
    amount: 10000, client: '0781234567', merchant: 'test-merchant'
  });
  confirmed.set('school-provider-failed-ref', {
    ref: 'school-provider-failed-ref', kind: 'CASHIN', status: 'failed',
    amount: 10000, client: '0781234567', merchant: 'test-merchant'
  });
  confirmed.set('school-concurrent-ref', {
    ref: 'school-concurrent-ref', kind: 'CASHIN', status: 'successful',
    amount: 10000, client: '0781234567', merchant: 'test-merchant'
  });
  confirmed.set('school-durable-only-ref', {
    ref: 'school-durable-only-ref', kind: 'CASHIN', status: 'successful',
    amount: 30000, client: '0781234567', merchant: 'test-merchant'
  });
  orders.set('school-durable-only-ref', {
    phone: '0781234567',
    amount: 30000,
    planLabel: 'Premium School Package (600 Exams)',
    examCount: 600,
    priceToStore: 50,
    schoolId: 42,
    serviceType: 'SCHOOL',
    packageId: 'premium',
    provider: 'PAYPACK',
    status: 'PENDING'
  });
  const { schoolPendingMap } = require('../routes/school');
  for (const pkg of schoolPackages) {
    const pending = {
      phone: '0781234567',
      schoolId: 7,
      schoolName: 'Test School',
      packageId: pkg.id,
      amount: pkg.amount,
      examCount: pkg.credits,
      priceToStore: pkg.amount / pkg.credits,
      planLabel: `${pkg.name} School Package (${pkg.credits} Exams)`
    };
    schoolPendingMap.set(pkg.reference, pending);
    orders.set(pkg.reference, {
      phone: pending.phone,
      amount: pending.amount,
      planLabel: pending.planLabel,
      examCount: pending.examCount,
      priceToStore: pending.priceToStore,
      schoolId: pending.schoolId,
      serviceType: 'SCHOOL',
      packageId: pending.packageId,
      provider: 'PAYPACK',
      status: 'PENDING'
    });
  }
  const addDurableSchoolOrder = (reference, pkg) => {
    const pending = {
      phone: '0781234567',
      schoolId: 7,
      packageId: pkg.id,
      amount: pkg.price,
      examCount: pkg.examCredits,
      priceToStore: pkg.price / pkg.examCredits,
      planLabel: `${pkg.name} School Package (${pkg.examCredits} Exams)`
    };
    schoolPendingMap.set(reference, pending);
    orders.set(reference, {
      phone: pending.phone,
      amount: pending.amount,
      planLabel: pending.planLabel,
      examCount: pending.examCount,
      priceToStore: pending.priceToStore,
      schoolId: pending.schoolId,
      serviceType: 'SCHOOL',
      packageId: pending.packageId,
      provider: 'PAYPACK',
      status: 'PENDING'
    });
  };
  addDurableSchoolOrder('school-failed-ref', SCHOOL_PACKAGES[2]);
  addDurableSchoolOrder('school-pending-ref', SCHOOL_PACKAGES[0]);
  addDurableSchoolOrder('school-standard-wrong-amount-ref', SCHOOL_PACKAGES[1]);
  addDurableSchoolOrder('school-provider-failed-ref', SCHOOL_PACKAGES[0]);
  addDurableSchoolOrder('school-concurrent-ref', SCHOOL_PACKAGES[0]);
  const rows = new Map();
  const insertAttempts = new Map();
  const insertedValues = new Map();
  const raceSelectCallbacks = [];
  let providerLookups = 0;
  const db = {
    query(sql, values, callback) {
      if (typeof values === 'function') callback = values;
      if (sql.trimStart().startsWith('ALTER TABLE') || sql.trimStart().startsWith('CREATE TABLE')) return callback?.(null, {});
      if (sql.includes('information_schema.columns')) return callback(null, [{ count: 1 }]);
      if (sql.startsWith('SELECT id FROM payment_transactions')) {
        if (values[0] === 'race-ref' || values[0] === 'school-concurrent-ref') {
          raceSelectCallbacks.push(() => callback(null, rows.has(values[0]) ? [{ id: 1 }] : []));
          if (raceSelectCallbacks.length === 2) raceSelectCallbacks.splice(0).forEach(release => release());
          return;
        }
        return callback(null, rows.has(values[0]) ? [{ id: 1 }] : []);
      }
      if (sql.includes('FROM pending_payment_requests')) {
        assert.match(sql, /service_type AS serviceType/);
        const pending = orders.get(values[0]);
        return callback(null, pending ? [pending] : []);
      }
      if (sql.startsWith('UPDATE pending_payment_requests')) {
        const order = orders.get(values[1]);
        if (order && order.serviceType === 'SCHOOL' && order.provider === 'PAYPACK' && ['PENDING', 'PROCESSING'].includes(order.status)) {
          order.status = values[0];
          return callback(null, { affectedRows: 1 });
        }
        return callback(null, { affectedRows: 0 });
      }
      if (sql.startsWith('INSERT INTO payment_transactions')) {
        const reference = values[3];
        insertAttempts.set(reference, (insertAttempts.get(reference) || 0) + 1);
        if (rows.has(reference)) {
          const duplicate = new Error('Duplicate reference');
          duplicate.code = 'ER_DUP_ENTRY';
          return callback(duplicate);
        }
        insertedValues.set(reference, values);
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
      data: { ref: reference, kind: 'CASHIN', status: options.status || 'successful', amount: 1 }
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
  const merchantMismatch = await send('merchant-ref');
  assert.equal(merchantMismatch.status, 409);
  assert.equal(rows.has('merchant-ref'), false);

  const missingLookupStatus = await send('lookup-status-ref');
  assert.equal(missingLookupStatus.status, 200);
  assert.equal(rows.has('lookup-status-ref'), true);

  const successLookupStatus = await send('lookup-success-ref', { status: 'success' });
  assert.equal(successLookupStatus.status, 200);
  assert.equal(rows.has('lookup-success-ref'), true);

  const failedLookupStatus = await send('lookup-failed-ref');
  assert.equal(failedLookupStatus.status, 409);
  assert.equal(rows.has('lookup-failed-ref'), false);

  const lookupsBeforeFailedEvent = providerLookups;
  const failedEvent = await send('unknown-failed-ref', { status: 'failed' });
  assert.equal(failedEvent.status, 200);
  assert.equal(providerLookups, lookupsBeforeFailedEvent);
  const failedSchoolPayment = await send('school-failed-ref', { status: 'failed' });
  assert.equal(failedSchoolPayment.status, 200);
  assert.equal(rows.has('school-failed-ref'), false);
  const lookupsBeforePendingSchool = providerLookups;
  const pendingSchoolPayment = await send('school-pending-ref', { status: 'pending' });
  assert.equal(pendingSchoolPayment.status, 200);
  assert.equal(providerLookups, lookupsBeforePendingSchool);
  assert.equal(rows.has('school-pending-ref'), false);
  assert.equal(orders.get('school-pending-ref').status, 'PENDING');
  const wrongSchoolAmount = await send('school-standard-wrong-amount-ref');
  assert.equal(wrongSchoolAmount.status, 409);
  assert.equal(rows.has('school-standard-wrong-amount-ref'), false);
  const providerFailedSchoolPayment = await send('school-provider-failed-ref');
  assert.equal(providerFailedSchoolPayment.status, 200);
  assert.equal(rows.has('school-provider-failed-ref'), false);
  assert.equal(orders.get('school-provider-failed-ref').status, 'FAILED');

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

  schoolPendingMap.delete('school-basic-ref');
  const recoveredSchoolPayment = await send('school-basic-ref');
  assert.equal(recoveredSchoolPayment.status, 200);
  assert.equal(rows.has('school-basic-ref'), true);
  assert.equal(insertedValues.get('school-basic-ref')[1], SCHOOL_PACKAGES[0].price);
  assert.equal(insertedValues.get('school-basic-ref')[5], SCHOOL_PACKAGES[0].examCredits);
  assert.equal(orders.get('school-basic-ref').status, 'SUCCESS');

  assert.equal(schoolPendingMap.has('school-durable-only-ref'), false);
  const durableOnlySchoolPayment = await send('school-durable-only-ref');
  assert.equal(durableOnlySchoolPayment.status, 200);
  assert.equal(rows.has('school-durable-only-ref'), true);
  assert.equal(insertedValues.get('school-durable-only-ref')[1], SCHOOL_PACKAGES[2].price);
  assert.equal(insertedValues.get('school-durable-only-ref')[5], SCHOOL_PACKAGES[2].examCredits);
  assert.equal(insertedValues.get('school-durable-only-ref')[6], SCHOOL_PACKAGES[2].examCredits);
  assert.equal(insertedValues.get('school-durable-only-ref')[7], SCHOOL_PACKAGES[2].price / SCHOOL_PACKAGES[2].examCredits);
  assert.equal(insertedValues.get('school-durable-only-ref')[8], 42);
  assert.equal(insertedValues.get('school-durable-only-ref')[9], 'SCHOOL');
  assert.equal(orders.get('school-durable-only-ref').status, 'SUCCESS');
  assert.equal(schoolPendingMap.has('school-durable-only-ref'), false);

  const concurrentSchoolCallbacks = await Promise.all([
    send('school-concurrent-ref'),
    send('school-concurrent-ref')
  ]);
  assert.deepEqual(concurrentSchoolCallbacks.map(response => response.status), [200, 200]);
  assert.equal(insertAttempts.get('school-concurrent-ref'), 2);
  assert.equal(rows.has('school-concurrent-ref'), true);
  assert.equal(orders.get('school-concurrent-ref').status, 'SUCCESS');

  for (const pkg of schoolPackages) {
    if (pkg.name === 'Basic') continue;
    const schoolPayment = await send(pkg.reference);
    assert.equal(schoolPayment.status, 200);
    assert.equal(rows.has(pkg.reference), true);
    assert.equal(insertedValues.get(pkg.reference)[1], pkg.amount);
    assert.equal(insertedValues.get(pkg.reference)[5], pkg.credits);
    assert.equal(insertedValues.get(pkg.reference)[6], pkg.credits);
    assert.equal(insertedValues.get(pkg.reference)[7], pkg.amount / pkg.credits);
    assert.equal(insertedValues.get(pkg.reference)[8], 7);
    assert.equal(insertedValues.get(pkg.reference)[9], 'SCHOOL');
    assert.equal(schoolPendingMap.has(pkg.reference), false);
  }
  const duplicateSchoolPayment = await send('school-basic-ref');
  assert.equal(duplicateSchoolPayment.status, 200);
  assert.equal(insertAttempts.get('school-basic-ref'), 1);
  assert.equal(rows.size, 9);
});
