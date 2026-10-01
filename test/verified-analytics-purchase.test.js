const test = require('node:test');
const assert = require('node:assert/strict');
const { createPurchaseVerifier } = require('../helpers/verifiedAnalyticsPurchase');
const row = { status: 'SUCCESS', reference_id: 'ref', amount: 100 };
const valid = { ref: 'ref', status: 'successful', kind: 'CASHIN', amount: 100 };

test('analytics receipts require matching provider-confirmed cashin, not merely stored success', async () => {
  for (const response of [null, {}, { ...valid, ref: 'other' }, { ...valid, status: 'pending' },
    { ...valid, status: 'failed' }, { ...valid, kind: 'CASHOUT' }, { ...valid, amount: 101 },
    { ...valid, currency: 'USD' }]) {
    assert.equal(await createPurchaseVerifier(async () => response)(row), null);
  }
  const receipt = await createPurchaseVerifier(async () => valid)(row);
  assert.equal(receipt.value, 100);
  assert.equal(receipt.currency, 'RWF');
  assert.doesNotMatch(JSON.stringify(receipt), /"ref"/);
});

test('provider failures/timeouts omit telemetry; confirmation is cached and concurrent lookups coalesce', async () => {
  assert.equal(await createPurchaseVerifier(async () => { throw new Error('provider unavailable'); })(row), null);
  assert.equal(await createPurchaseVerifier(() => new Promise(() => {}), { timeoutMs: 10 })(row), null);
  let calls = 0;
  const verify = createPurchaseVerifier(async () => { calls++; return valid; });
  const [first, second] = await Promise.all([verify(row), verify(row)]);
  assert.deepEqual(first, second);
  assert.equal(calls, 1);
  assert.equal(await verify({ ...row, status: 'PENDING' }), null);
  assert.equal(calls, 1);
  assert.equal(await verify({ ...row, amount: 101 }), null);
  assert.equal(calls, 2);
});
