const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { verifyReconciliationEvidence } = require('../helpers/paypackReconciliation');
const { insertPaymentTransaction, isDuplicatePaymentError } = require('../helpers/paymentTransactions');
const { reconcilePaymentAtomically } = require('../helpers/paymentReconciliationExecution');

const reference = 'reconciliation-ref';
const eventId = 'reconciliation-event';
const pending = { phone: '0781234567', amount: '100.00', planLabel: 'One exam', examCount: 1, priceToStore: 100, serviceType: 'EXAMS', expiresAt: '2026-10-01T23:36:53.000Z' };
const transaction = { ref: reference, kind: 'CASHIN', amount: 100, merchant: 'merchant', client: '0781234567' };
const eventsResponse = { transactions: [{ event_id: eventId, event_kind: 'transaction:processed', data: { ...transaction, status: 'successful', processed_at: '2026-10-01T23:32:05.000Z' } }] };

test('reconciliation requires authenticated processed-event success when transaction lookup omits status', () => {
  const evidence = verifyReconciliationEvidence({ transaction, eventsResponse, pending, reference, eventId, merchant: 'merchant' });
  assert.equal(evidence.ok, true);
  assert.equal(evidence.source, 'PAYPACK_EVENTS_API');

  for (const [events, expected] of [
    [{ transactions: [] }, 'processed_event_not_successful'],
    [{ transactions: [{ ...eventsResponse.transactions[0], data: { ...transaction, status: 'failed' } }] }, 'processed_event_not_successful'],
    [{ transactions: [{ ...eventsResponse.transactions[0], data: { ...transaction, amount: 101, status: 'successful' } }] }, 'event_mismatch']
  ]) {
    assert.equal(verifyReconciliationEvidence({ transaction, eventsResponse: events, pending, reference, eventId, merchant: 'merchant' }).reason, expected);
  }
  assert.equal(verifyReconciliationEvidence({ transaction: { ...transaction, merchant: 'other' }, eventsResponse, pending, reference, eventId, merchant: 'merchant' }).reason, 'transaction_mismatch');
  const late = { transactions: [{ ...eventsResponse.transactions[0], data: { ...eventsResponse.transactions[0].data, processed_at: '2026-10-01T23:40:00.000Z' } }] };
  assert.equal(verifyReconciliationEvidence({ transaction, eventsResponse: late, pending, reference, eventId, merchant: 'merchant' }).reason, 'event_outside_pending_order_window');
});

test('normal payment recording remains duplicate-safe for reconciliation and later webhook delivery', async () => {
  const references = new Set();
  const db = { query(sql, values, callback) {
    if (typeof values === 'function') callback = values;
    if (sql.includes('information_schema.columns')) return callback(null, [{ count: 1 }]);
    if (sql.startsWith('INSERT INTO payment_transactions')) {
      const ref = values[3];
      if (references.has(ref)) {
        const error = new Error('Duplicate reference'); error.code = 'ER_DUP_ENTRY';
        return callback(error);
      }
      references.add(ref); return callback(null, { affectedRows: 1 });
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }};
  const write = () => new Promise((resolve, reject) => insertPaymentTransaction(db, pending, reference, error => error ? reject(error) : resolve()));
  await write();
  await assert.rejects(write(), error => isDuplicatePaymentError(error));
  assert.equal(references.size, 1);
});

test('reconciliation commits the credit and audit together, and safely retries', async () => {
  const state = { payments: new Set(), audits: [], snapshot: null, failAudit: false };
  const db = {
    beginTransaction(callback) { state.snapshot = { payments: new Set(state.payments), audits: [...state.audits] }; callback(null); },
    commit(callback) { state.snapshot = null; callback(null); },
    rollback(callback) { if (state.snapshot) { state.payments = state.snapshot.payments; state.audits = state.snapshot.audits; } state.snapshot = null; callback(); },
    query(sql, values, callback) {
      if (typeof values === 'function') callback = values;
      if (sql.includes('information_schema.columns')) return callback(null, [{ count: 1 }]);
      if (sql.startsWith('SELECT id FROM payment_transactions')) return callback(null, state.payments.has(values[0]) ? [{ id: 1 }] : []);
      if (sql.includes('FROM pending_payment_requests')) return callback(null, [{ ...pending }]);
      if (sql.startsWith('INSERT INTO payment_transactions')) { state.payments.add(values[3]); return callback(null, { affectedRows: 1 }); }
      if (sql.includes('INSERT INTO payment_reconciliation_audit')) { if (state.failAudit) return callback(new Error('audit unavailable')); state.audits.push(values[0]); return callback(null, { affectedRows: 1 }); }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
  const args = { db, reference, pending, eventId, operator: 'operator', reason: 'verified recovery', verificationSource: 'PAYPACK_EVENTS_API' };
  assert.equal((await reconcilePaymentAtomically(args)).outcome, 'reconciled');
  assert.deepEqual([...state.payments], [reference]);
  assert.deepEqual(state.audits, [reference]);
  assert.equal((await reconcilePaymentAtomically(args)).outcome, 'already_reconciled');
  assert.equal(state.audits.length, 1);

  state.payments.clear(); state.audits = []; state.failAudit = true;
  await assert.rejects(reconcilePaymentAtomically(args), /audit unavailable/);
  assert.equal(state.payments.size, 0);
  assert.equal(state.audits.length, 0);
});

test('reconciliation command is explicit, audited, and has no direct payment insert', () => {
  const script = fs.readFileSync(require.resolve('../scripts/reconcile-paypack-payment'), 'utf8');
  const migration = fs.readFileSync(require.resolve('../Database/2026-10-payment-reconciliation-audit.sql'), 'utf8');
  assert.match(script, /--execute/);
  assert.match(script, /payment_reconciliation_audit/);
  assert.match(script, /insertPaymentTransaction/);
  assert.doesNotMatch(script, /INSERT INTO payment_transactions/);
  assert.match(migration, /UNIQUE KEY uq_payment_reconciliation_reference/);
});
