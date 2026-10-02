#!/usr/bin/env node
// Intentionally not an HTTP endpoint. Default mode is read-only verification.
// --execute requires an approved operator/reason and the audit-table migration.
require('dotenv').config();

const axios = require('axios');
const mysql = require('mysql2');
const { verifyReconciliationEvidence } = require('../helpers/paypackReconciliation');
const { reconcilePaymentAtomically } = require('../helpers/paymentReconciliationExecution');

const BASE = 'https://payments.paypack.rw/api';
const p = process.env;
const execute = process.argv.includes('--execute');
const reference = p.PAYPACK_RECONCILIATION_REFERENCE;
const eventId = p.PAYPACK_RECONCILIATION_EVENT_ID;
const operator = p.PAYPACK_RECONCILIATION_OPERATOR;
const reason = p.PAYPACK_RECONCILIATION_REASON;
const merchant = (p.PAYPACK_MERCHANT_CODE || '').trim();

function fail(message) { throw new Error(message); }
function query(db, sql, values = []) {
    return new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
}
function publicResult(result) { console.log(JSON.stringify(result, null, 2)); }

async function providerEvidence(pending) {
    const { data: auth } = await axios.post(`${BASE}/auth/agents/authorize`,
        { client_id: p.PAYPACK_CLIENT_ID, client_secret: p.PAYPACK_CLIENT_SECRET }, { timeout: 10000 });
    const headers = { Authorization: `Bearer ${auth.access}`, Accept: 'application/json' };
    const [{ data: transaction }, { data: eventsResponse }] = await Promise.all([
        axios.get(`${BASE}/transactions/find/${encodeURIComponent(reference)}`, { headers, timeout: 10000 }),
        axios.get(`${BASE}/events/transactions`, { headers, params: { ref: reference, kind: 'CASHIN' }, timeout: 10000 })
    ]);
    return verifyReconciliationEvidence({ transaction, eventsResponse, pending, reference, eventId, merchant });
}

async function main() {
    if (!reference || !eventId || !merchant) fail('Reference, event ID, and merchant configuration are required.');
    if (execute && (!operator || !reason)) fail('Execution requires operator and reason for the audit trail.');

    const db = mysql.createConnection({
        host: p.PROD_DB_HOST || 'localhost', port: Number(p.PROD_DB_PORT || 3306),
        user: p.PROD_DB_USER, password: p.PROD_DB_PASSWORD, database: p.PROD_DB_NAME
    });
    await new Promise((resolve, reject) => db.connect(error => error ? reject(error) : resolve()));
    try {
        const existing = await query(db, 'SELECT id FROM payment_transactions WHERE reference_id = ? LIMIT 1', [reference]);
        if (existing.length) return publicResult({ outcome: 'already_reconciled', credited_payments: 1 });
        const orders = await query(db, `SELECT phone_number AS phone, amount, plan_name AS planLabel, exam_count AS examCount, expires_at AS expiresAt,
            price_per_exam AS priceToStore, school_id, service_type AS serviceType, resource_id AS resourceId,
            resource_title AS resourceTitle FROM pending_payment_requests WHERE payment_reference = ? LIMIT 1`, [reference]);
        if (!orders.length) fail('No pending order exists for this reference.');
        const pending = orders[0];
        const evidence = await providerEvidence(pending);
        if (!evidence.ok) fail(`Provider verification failed: ${evidence.reason}`);

        if (!execute) return publicResult({
            outcome: 'verified_dry_run', verification_source: evidence.source,
            expected_effect: { successful_payment_records: 1, exam_credits: Number(pending.examCount || 0) }
        });

        const result = await reconcilePaymentAtomically({ db, reference, pending, eventId, operator, reason, verificationSource: evidence.source });
        return publicResult({ ...result, credited_payments: 1, verification_source: evidence.source });
    } finally {
        db.end();
    }
}

main().catch(error => { console.error(`RECONCILIATION_REFUSED: ${error.message}`); process.exitCode = 1; });
