function isDuplicatePaymentError(error) {
    return error && error.code === 'ER_DUP_ENTRY';
}

// This is the single entitlement write used by both the signed webhook and the
// narrowly-scoped recovery command. A successful row is the exam credit; no
// separate balance mutation is performed.
function insertPaymentTransaction(db, pending, paypackRef, done) {
    const serviceType = pending.serviceType || 'EXAMS';
    const resourceIdValue = pending.resourceId || null;
    const resourceTitleValue = pending.resourceTitle || null;
    const baseValues = [pending.phone, pending.amount, pending.planLabel, paypackRef, paypackRef,
        pending.examCount, pending.examCount, pending.priceToStore, pending.school_id || null];

    db.query(`SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'payment_transactions' AND column_name = 'service_type'`, (colErr, colRows) => {
        if (colErr) return done(colErr);
        const hasServiceColumns = Number(colRows?.[0]?.count || 0) > 0;
        if (!hasServiceColumns) {
            return db.query(
                `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, school_id)
                 VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?)`,
                baseValues, done
            );
        }

        db.query(`SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'payment_transactions' AND column_name = 'resource_id'`, (resourceErr, resourceRows) => {
            if (resourceErr) return done(resourceErr);
            const hasResourceColumns = Number(resourceRows?.[0]?.count || 0) > 0;
            if (!hasResourceColumns) {
                return db.query(
                    `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, school_id, service_type)
                     VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?, ?)`,
                    [...baseValues, serviceType], done
                );
            }

            return db.query(
                `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, school_id, service_type, resource_id, resource_title)
                 VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?, ?, ?, ?)`,
                [...baseValues, serviceType, resourceIdValue, resourceTitleValue], done
            );
        });
    });
}

module.exports = { insertPaymentTransaction, isDuplicatePaymentError };
