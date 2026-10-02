const { insertPaymentTransaction, isDuplicatePaymentError } = require('./paymentTransactions');

function query(db, sql, values = []) {
    return new Promise((resolve, reject) => db.query(sql, values, (error, rows) => error ? reject(error) : resolve(rows)));
}
function begin(db) { return new Promise((resolve, reject) => db.beginTransaction(error => error ? reject(error) : resolve())); }
function commit(db) { return new Promise((resolve, reject) => db.commit(error => error ? reject(error) : resolve())); }
function rollback(db) { return new Promise(resolve => db.rollback(() => resolve())); }
function insert(db, pending, ref) { return new Promise((resolve, reject) => insertPaymentTransaction(db, pending, ref, error => error ? reject(error) : resolve())); }

async function reconcilePaymentAtomically({ db, reference, pending, eventId, operator, reason, verificationSource }) {
    await begin(db);
    try {
        const existing = await query(db, 'SELECT id FROM payment_transactions WHERE reference_id = ? LIMIT 1 FOR UPDATE', [reference]);
        if (existing.length) { await rollback(db); return { outcome: 'already_reconciled' }; }
        const lockedRows = await query(db, `SELECT phone_number AS phone, amount, plan_name AS planLabel, exam_count AS examCount,
            price_per_exam AS priceToStore, school_id, service_type AS serviceType, resource_id AS resourceId,
            resource_title AS resourceTitle, expires_at AS expiresAt
            FROM pending_payment_requests WHERE payment_reference = ? LIMIT 1 FOR UPDATE`, [reference]);
        if (!lockedRows.length) throw new Error('Pending order disappeared while locking reconciliation.');
        const locked = lockedRows[0];
        if (String(locked.phone) !== String(pending.phone) || Number(locked.amount) !== Number(pending.amount) ||
            Number(locked.examCount) !== Number(pending.examCount) || new Date(locked.expiresAt).getTime() !== new Date(pending.expiresAt).getTime()) {
            throw new Error('Pending order changed while locking reconciliation.');
        }
        await insert(db, locked, reference);
        await query(db, `INSERT INTO payment_reconciliation_audit
            (payment_reference, provider_event_id, operator_name, reason, verification_source)
            VALUES (?, ?, ?, ?, ?)`, [reference, eventId, operator, reason, verificationSource]);
        await commit(db);
        return { outcome: 'reconciled' };
    } catch (error) {
        await rollback(db);
        if (isDuplicatePaymentError(error)) return { outcome: 'already_reconciled' };
        throw error;
    }
}

module.exports = { reconcilePaymentAtomically };
