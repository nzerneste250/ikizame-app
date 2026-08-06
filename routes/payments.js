const express = require('express');
const axios   = require('axios');
const crypto  = require('crypto');
const { normalizeAndValidatePaymentPhone } = require('../helpers/paymentPhone');

const PAYPACK_BASE     = 'https://payments.paypack.rw/api';
const PAYPACK_CLIENT   = process.env.PAYPACK_CLIENT_ID;
const PAYPACK_SECRET   = process.env.PAYPACK_CLIENT_SECRET;
const WEBHOOK_SECRET   = process.env.PAYPACK_WEBHOOK_SECRET;
const NOTIFY_EMAIL     = 'dotadostationarystore@gmail.com';

function sendPaymentNotification(transport, { phone, amount, planLabel, examCount, paypackRef, type }) {
    if (!transport) return;
    transport.sendMail({
        from: `"IKIZAME Payments" <${process.env.SMTP_USER}>`,
        to:   NOTIFY_EMAIL,
        subject: `💳 New Payment — ${Number(amount).toLocaleString()} RWF (${type})`,
        html: `<div style="font-family:Inter,sans-serif;background:#f8fafc;padding:24px;max-width:480px;">
            <div style="background:#0b698b;padding:16px 20px;border-radius:8px;margin-bottom:16px;">
                <h2 style="color:#fff;margin:0;font-size:17px;">💳 New Payment Received</h2>
                <p style="color:#bae6fd;margin:4px 0 0;font-size:12px;">${new Date().toLocaleString('en-GB')}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr style="background:#dcfce7;"><td colspan="2" style="padding:8px 12px;font-weight:800;color:#15803d;font-size:16px;">✅ ${Number(amount).toLocaleString()} RWF</td></tr>
                <tr><td style="padding:7px 12px;color:#64748b;">Phone</td><td style="padding:7px 12px;font-weight:700;">${phone}</td></tr>
                <tr style="background:#f8fafc;"><td style="padding:7px 12px;color:#64748b;">Plan</td><td style="padding:7px 12px;font-weight:700;">${planLabel}</td></tr>
                <tr><td style="padding:7px 12px;color:#64748b;">Exams</td><td style="padding:7px 12px;font-weight:700;">${examCount}</td></tr>
                <tr style="background:#f8fafc;"><td style="padding:7px 12px;color:#64748b;">Type</td><td style="padding:7px 12px;font-weight:700;">${type}</td></tr>
                <tr><td style="padding:7px 12px;color:#64748b;">Reference</td><td style="padding:7px 12px;font-family:monospace;font-size:11px;">${paypackRef}</td></tr>
            </table>
        </div>`
    }, (err) => { if (err) console.error('⚠️  Payment notification email failed:', err.message); });
}

let cachedToken  = null;
let tokenExpires = 0;
let tokenRefreshPromise = null;

function ensurePaymentColumns(db) {
    db.query(`ALTER TABLE payment_transactions ADD COLUMN service_type VARCHAR(50) NOT NULL DEFAULT 'EXAMS'`, () => {});
    db.query(`ALTER TABLE payment_transactions ADD COLUMN resource_id INT NULL`, () => {});
    db.query(`ALTER TABLE payment_transactions ADD COLUMN resource_title VARCHAR(255) NULL`, () => {});
    db.query(`
        CREATE TABLE IF NOT EXISTS pending_payment_requests (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            payment_reference VARCHAR(128) NOT NULL UNIQUE,
            phone_number VARCHAR(32) NULL,
            amount DECIMAL(10,2) NOT NULL,
            plan_name VARCHAR(255) NULL,
            exam_count INT NULL,
            price_per_exam DECIMAL(10,2) NULL,
            school_id INT NULL,
            service_type VARCHAR(50) NOT NULL DEFAULT 'EXAMS',
            resource_id INT NULL,
            resource_title VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ref (payment_reference)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, (err) => { if (err && !err.message.includes('already exists')) console.error('pending_payment_requests table error:', err.message); });
}

async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpires - 60000) return cachedToken;
    // Deduplicate concurrent token refresh calls
    if (tokenRefreshPromise) return tokenRefreshPromise;
    tokenRefreshPromise = axios.post(`${PAYPACK_BASE}/auth/agents/authorize`,
        { client_id: PAYPACK_CLIENT, client_secret: PAYPACK_SECRET },
        { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 8000 }
    ).then(({ data }) => {
        cachedToken  = data.access;
        tokenExpires = data.expires * 1000;
        tokenRefreshPromise = null;
        return cachedToken;
    }).catch(err => {
        tokenRefreshPromise = null;
        throw err;
    });
    return tokenRefreshPromise;
}

// Pre-warm token on startup
setTimeout(() => getAccessToken().catch(() => {}), 2000);
// Refresh token every 50 minutes to keep it warm
setInterval(() => getAccessToken().catch(() => {}), 50 * 60 * 1000);

function calcTieredAmount(qty) {
    if (qty <= 9)  return qty * 100;
    if (qty <= 14) return 900 + (qty - 9) * 80;
    if (qty <= 20) return 1300 + (qty - 14) * 70;
    return 1720 + (qty - 20) * 50;
}

function getPricePerExam(qty) {
    if (qty <= 9)  return 100;
    if (qty <= 14) return 80;
    if (qty <= 20) return 70;
    return 50;
}

// In-memory map: paypackRef -> pending tx data (cleared on webhook)
const pendingMap = new Map();

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
            db.query(
                `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, school_id)
                 VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?)`,
                baseValues,
                (err) => done(err)
            );
            return;
        }

        db.query(`SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'payment_transactions' AND column_name = 'resource_id'`, (resourceErr, resourceRows) => {
            if (resourceErr) return done(resourceErr);
            const hasResourceColumns = Number(resourceRows?.[0]?.count || 0) > 0;
            if (!hasResourceColumns) {
                db.query(
                    `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, school_id, service_type)
                     VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?, ?)`,
                    [...baseValues, serviceType],
                    (err) => done(err)
                );
                return;
            }

            db.query(
                `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, school_id, service_type, resource_id, resource_title)
                 VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?, ?, ?, ?)`,
                [...baseValues, serviceType, resourceIdValue, resourceTitleValue],
                (err) => done(err)
            );
        });
    });
}

module.exports = (db) => {
    const router = express.Router();
    ensurePaymentColumns(db);

    // POST — initiate USSD push, do NOT write to DB yet
    router.post('/momo-push', async (req, res) => {
        const { phoneNumber, checkoutIntentType, examQuantityVolume, pricePerExam, resourceId, resourceTitle, resourcePrice } = req.body;

        if (!phoneNumber || !checkoutIntentType)
            return res.status(400).json({ success: false, error: 'Missing mandatory payment fields.' });

        let phone;
        try {
            phone = normalizeAndValidatePaymentPhone(phoneNumber);
        } catch (validationErr) {
            return res.status(400).json({ success: false, error: validationErr.message });
        }

        let amount = 0, planLabel = '', examCount = 0, serviceType = 'EXAMS', resourceIdValue = null, resourceTitleValue = null;
        if (checkoutIntentType === 'SCHOOL') {
            amount = 10000; planLabel = 'School Driving Program (200 Exams Package)'; examCount = 200; serviceType = 'SCHOOL';
        } else if (checkoutIntentType === 'RESOURCE') {
            const parsedPrice = Number(resourcePrice || 0);
            if (!resourceTitle || !resourceId || !parsedPrice) {
                return res.status(400).json({ success: false, error: 'Resource payment details are incomplete.' });
            }
            amount = parsedPrice;
            planLabel = `Resource Access — ${resourceTitle}`;
            serviceType = 'RESOURCES';
            resourceIdValue = resourceId;
            resourceTitleValue = resourceTitle;
        } else {
            const qty = parseInt(examQuantityVolume, 10) || 1;
            examCount = qty;
            amount    = calcTieredAmount(qty);
            planLabel = `Personal Tiered Pass (${qty} Exams Package)`;
        }

        const submittedPx  = Number(pricePerExam);
        const validPrices  = [100, 80, 70, 50];
        const priceToStore = validPrices.includes(submittedPx) ? submittedPx : getPricePerExam(examCount);

        try {
            const token = await getAccessToken();
            const { data } = await axios.post(
                `${PAYPACK_BASE}/transactions/cashin`,
                { amount, number: phone },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type':  'application/json',
                        'Accept':        'application/json',
                        'X-Webhook-Mode': 'production'
                    },
                    timeout: 15000
                }
            );

            const paypackRef = data?.ref;
            if (!paypackRef) throw new Error('No ref returned from Paypack');

            // Store pending data in memory — DB insert happens only on successful webhook
            pendingMap.set(paypackRef, {
                phone, amount, planLabel, examCount, priceToStore,
                school_id: null,
                serviceType,
                resourceId: resourceIdValue,
                resourceTitle: resourceTitleValue,
                expires: Date.now() + 5 * 60 * 1000
            });

            // Also persist to DB so webhook can recover after server restart
            db.query(
                `INSERT IGNORE INTO pending_payment_requests (payment_reference, phone_number, amount, plan_name, exam_count, price_per_exam, school_id, service_type, resource_id, resource_title)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [paypackRef, phone, amount, planLabel, examCount || null, priceToStore || null, null, serviceType, resourceIdValue || null, resourceTitleValue || null],
                (dbErr) => { if (dbErr) console.error('⚠️  Failed to persist pending request:', dbErr.message); }
            );

            console.log(`✅ Paypack cashin initiated: ${paypackRef} for ${serviceType}`);
            res.json({ success: true, referenceId: paypackRef, paypackRef, allocatedPlan: planLabel });

        } catch (apiErr) {
            const errMsg = apiErr.response?.data?.message || apiErr.response?.data?.error || apiErr.message || 'Paypack API error';
            console.error('❌ Paypack cashin error:', errMsg);
            try { require('../server').sendErrorAlert('Paypack Cashin Failed', `Phone: ${phone}\nAmount: ${amount}\nError: ${errMsg}`); } catch(e) {}
            res.status(502).json({ success: false, error: 'Kwishyura byanze: ' + errMsg });
        }
    });

    // POST — Paypack webhook: insert to DB only on successful
    router.post('/callback', (req, res) => {
        if (WEBHOOK_SECRET) {
            const signature = req.headers['x-paypack-signature'] || '';
            const expected  = crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('base64');
            if (signature && signature !== expected) {
                console.warn('⚠️  Invalid Paypack webhook signature — rejected');
                return res.status(401).json({ ok: false });
            }
        }

        const body      = req.body;
        const eventKind = body.kind || '';
        const txData    = body.data || body;

        if (eventKind !== 'transaction:processed' && !txData.ref)
            return res.status(200).json({ ok: true });

        const paypackRef = txData.ref;
        const rawStatus  = (txData.status || '').toLowerCase();

        if (rawStatus !== 'successful') {
            pendingMap.delete(paypackRef);
            console.log(`ℹ️  Paypack webhook: ${paypackRef} → ${rawStatus} (not saved)`);
            return res.json({ ok: true });
        }

        // Check already inserted (duplicate webhook)
        db.query(
            `SELECT id FROM payment_transactions WHERE reference_id = ? LIMIT 1`,
            [paypackRef],
            (checkErr, checkRows) => {
                if (!checkErr && checkRows && checkRows.length > 0) {
                    console.log(`ℹ️  Paypack webhook: ${paypackRef} already processed — skipping`);
                    return res.json({ ok: true });
                }

                const doInsert = (pending) => {
                    pendingMap.delete(paypackRef);
                    insertPaymentTransaction(db, pending, paypackRef, (err) => {
                        if (err) { console.error('❌ Webhook DB insert error:', err.message); return res.status(500).json({ ok: false }); }
                        console.log(`✅ Paypack webhook: ${paypackRef} → SUCCESS (inserted)`);
                        sendPaymentNotification(req.app.get('emailTransport'), {
                            phone: pending.phone, amount: pending.amount,
                            planLabel: pending.planLabel, examCount: pending.examCount,
                            paypackRef, type: pending.serviceType === 'SCHOOL' ? 'School Payment' : pending.serviceType === 'RESOURCES' ? 'Resource Payment' : 'Self Payment'
                        });
                        res.json({ ok: true });
                    });
                };

                // Try in-memory map first
                const memPending = pendingMap.get(paypackRef);
                if (memPending) return doInsert(memPending);

                // Fallback: load from pending_payment_requests table (survives restarts)
                db.query(
                    `SELECT phone_number AS phone, amount, plan_name AS planLabel, exam_count AS examCount,
                            price_per_exam AS priceToStore, school_id, service_type AS serviceType,
                            resource_id AS resourceId, resource_title AS resourceTitle
                     FROM pending_payment_requests WHERE payment_reference = ? LIMIT 1`,
                    [paypackRef],
                    (dbErr, dbRows) => {
                        if (!dbErr && dbRows && dbRows.length > 0) {
                            console.log(`ℹ️  Paypack webhook: ${paypackRef} loaded from DB pending table`);
                            return doInsert(dbRows[0]);
                        }
                        // Unknown ref — try school
                        return handleSchoolWebhook(db, paypackRef, txData, res);
                    }
                );
            }
        );
    });

    // GET — poll payment status
    router.get('/verify/:refId', (req, res) => {
        const ref = req.params.refId;
        db.query(
            `SELECT status, plan_name FROM payment_transactions WHERE reference_id = ? OR rwandapay_tx_id = ? LIMIT 1`,
            [ref, ref],
            (err, results) => {
                if (!err && results && results.length > 0)
                    return res.json({ status: results[0].status, plan: results[0].plan_name });
                return res.json({ status: 'PENDING' });
            }
        );
    });

    // POST — cancel (just remove from pending map, nothing in DB to cancel)
    router.post('/cancel/:refId', (req, res) => {
        pendingMap.delete(req.params.refId);
        console.log(`🚫 Payment cancelled (timeout): ${req.params.refId}`);
        res.json({ ok: true });
    });

    return router;
};

// Handle webhook for school payments
function handleSchoolWebhook(db, paypackRef, txData, res) {
    const { schoolPendingMap } = require('./school');
    const pending = schoolPendingMap ? schoolPendingMap.get(paypackRef) : null;
    if (!pending) {
        console.log(`ℹ️  Webhook for unknown ref: ${paypackRef}`);
        return res.json({ ok: true });
    }
    schoolPendingMap.delete(paypackRef);
    const planLabel = `School Driving Pass (${pending.schoolName})`;
    insertPaymentTransaction(db, {
        phone: pending.phone,
        amount: 10000,
        planLabel,
        examCount: 200,
        priceToStore: Number((10000/200).toFixed(2)),
        school_id: pending.schoolId,
        serviceType: 'SCHOOL'
    }, paypackRef, (err) => {
        if (err) { console.error('❌ School webhook DB insert error:', err.message); return res.status(500).json({ ok: false }); }
        console.log(`✅ School webhook: ${paypackRef} → SUCCESS (inserted)`);
        sendPaymentNotification(res.req.app.get('emailTransport'), {
            phone: pending.phone, amount: 10000,
            planLabel, examCount: 200,
            paypackRef, type: 'School Payment'
        });
        res.json({ ok: true });
    });
}
