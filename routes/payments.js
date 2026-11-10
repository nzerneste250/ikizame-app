const express = require('express');
const axios   = require('axios');
const crypto  = require('crypto');
const { normalizeAndValidatePaymentPhone } = require('../helpers/paymentPhone');
const { PROTECTED_REPORT_EMAIL } = require('../helpers/adminSettings');
const { analyticsConfig, excludeAdmin } = require('../helpers/siteAnalytics');
const { createPurchaseVerifier } = require('../helpers/verifiedAnalyticsPurchase');
const { insertPaymentTransaction, isDuplicatePaymentError } = require('../helpers/paymentTransactions');
const { getIndividualExamPricing, getSchoolPackage } = require('../helpers/pricing');

const PAYPACK_BASE     = 'https://payments.paypack.rw/api';
const PAYPACK_CLIENT   = process.env.PAYPACK_CLIENT_ID;
const PAYPACK_SECRET   = process.env.PAYPACK_CLIENT_SECRET;
const WEBHOOK_SECRET   = process.env.PAYPACK_WEBHOOK_SECRET;
const PAYPACK_MERCHANT = (process.env.PAYPACK_MERCHANT_CODE || '').trim();
const NOTIFY_EMAIL     = PROTECTED_REPORT_EMAIL;

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
    // The deployment migration establishes these columns and the unique reference
    // constraint.  Keep this best-effort compatibility creation only for the
    // pending-order table; silently attempting ALTERs here could leave an
    // apparently healthy process with duplicate-credit protection absent.
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
            package_id VARCHAR(32) NULL,
            provider VARCHAR(32) NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            expires_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

function verifyPaypackSignature(rawBody, signature, secret) {
    if (!Buffer.isBuffer(rawBody) || !secret || typeof signature !== 'string') return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
    const supplied = Buffer.from(signature, 'base64');
    return supplied.length === expected.length && supplied.toString('base64') === signature && crypto.timingSafeEqual(supplied, expected);
}

function isSuccessfulPaypackStatus(status) {
    const normalized = String(status || '').toLowerCase();
    return normalized === 'successful' || normalized === 'success';
}

function confirmsExpectedPayment(transaction, reference, expectedAmount, expectedMerchant, webhookStatus) {
    const status = transaction?.status == null ? webhookStatus : transaction.status;
    if (!transaction || transaction.ref !== reference || transaction.kind !== 'CASHIN' ||
        !isSuccessfulPaypackStatus(status)) return false;
    if (!expectedMerchant || String(transaction.merchant || '') !== expectedMerchant) return false;
    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount !== Number(expectedAmount)) return false;
    const currency = transaction.currency || transaction.currency_code;
    return !currency || String(currency).toUpperCase() === 'RWF';
}

function confirmsExpectedPayer(transaction, pending) {
    try {
        return normalizeAndValidatePaymentPhone(transaction.client) === normalizeAndValidatePaymentPhone(pending.phone);
    } catch (_) {
        return false;
    }
}

function markSchoolOrderStatus(db, reference, status, callback) {
    const eligibleStatuses = status === 'SUCCESS'
        ? `status IN ('PENDING', 'PROCESSING', 'FAILED')`
        : `status IN ('PENDING', 'PROCESSING')`;
    db.query(
        `UPDATE pending_payment_requests
         SET status = ?
         WHERE payment_reference = ? AND service_type = 'SCHOOL' AND provider = 'PAYPACK'
           AND ${eligibleStatuses}`,
        [status, reference],
        callback
    );
}

function schoolPendingFromRow(row) {
    if (row.serviceType !== 'SCHOOL' || row.provider !== 'PAYPACK' ||
        !['PENDING', 'FAILED'].includes(row.status)) return null;
    const pkg = getSchoolPackage(row.packageId);
    if (!pkg || Number(row.amount) !== pkg.price || Number(row.examCount) !== pkg.examCredits ||
        !Number.isInteger(Number(row.schoolId)) || Number(row.schoolId) < 1 || !row.phone) return null;
    return {
        phone: row.phone,
        amount: pkg.price,
        planLabel: `${pkg.name} School Package (${pkg.examCredits} Exams)`,
        examCount: pkg.examCredits,
        priceToStore: pkg.price / pkg.examCredits,
        school_id: Number(row.schoolId),
        serviceType: 'SCHOOL'
    };
}

// In-memory map: paypackRef -> pending tx data (cleared on webhook)
const pendingMap = new Map();

module.exports = (db) => {
    const router = express.Router();
    ensurePaymentColumns(db);
    const verifiedAnalyticsReceipt = createPurchaseVerifier(async reference => {
        const token = await getAccessToken();
        const { data } = await axios.get(`${PAYPACK_BASE}/transactions/find/${encodeURIComponent(reference)}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            timeout: 2000,
            maxRedirects: 0
        });
        return data;
    }, { expectedMerchant: PAYPACK_MERCHANT });

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

        let amount = 0, planLabel = '', examCount = 0, serviceType = 'EXAMS', resourceIdValue = null, resourceTitleValue = null, priceToStoreForExams = null;
        if (checkoutIntentType === 'SCHOOL') {
            return res.status(400).json({ success: false, error: 'Choose a school package through the school portal.' });
        } else if (checkoutIntentType === 'RESOURCE') {
            if (!resourceId) {
                return res.status(400).json({ success: false, error: 'Resource payment details are incomplete.' });
            }
            let resource;
            try {
                const rows = await new Promise((resolve, reject) => {
                    db.query('SELECT id, title, is_paid, price FROM learning_resources WHERE id = ? LIMIT 1', [resourceId], (err, results) => {
                        if (err) return reject(err);
                        resolve(results || []);
                    });
                });
                resource = rows[0];
            } catch (error) {
                console.error('Resource payment lookup failed:', error.message);
                return res.status(500).json({ success: false, error: 'Resource payment could not be validated.' });
            }
            amount = Number(resource?.price);
            if (!resource || Number(resource.is_paid) !== 1 || !Number.isFinite(amount) || amount <= 0) {
                return res.status(400).json({ success: false, error: 'This resource is not available for paid access.' });
            }
            planLabel = `Resource Access — ${resource.title}`;
            serviceType = 'RESOURCES';
            resourceIdValue = resource.id;
            resourceTitleValue = resource.title;
        } else if (checkoutIntentType === 'PERSONAL' || checkoutIntentType === 'EXAMS') {
            const qty = examQuantityVolume;
            const pricing = getIndividualExamPricing(qty);
            if (!pricing) return res.status(400).json({ success: false, error: 'Exam quantity must be a positive whole number and the total must not exceed 99,999,999 RWF.' });
            examCount = qty;
            amount    = pricing.amount;
            planLabel = `Personal Tiered Pass (${qty} Exams Package)`;
            priceToStoreForExams = pricing.pricePerExam;
        } else {
            return res.status(400).json({ success: false, error: 'Unknown checkout type.' });
        }

        // Amount and unit price are server-derived. Client-provided pricing is
        // display data only and must never influence a stored order.
        const priceToStore = serviceType === 'EXAMS' ? priceToStoreForExams : null;

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
            const expiresAt = Date.now() + 5 * 60 * 1000;

            // Store pending data in memory — DB insert happens only on successful webhook
            pendingMap.set(paypackRef, {
                phone, amount, planLabel, examCount, priceToStore,
                school_id: null,
                serviceType,
                resourceId: resourceIdValue,
                resourceTitle: resourceTitleValue,
                expires: expiresAt
            });

            // Do not claim that a payment was initiated until its order is
            // durable. Otherwise a restart between these two operations can
            // make a legitimate paid callback unrecoverable.
            await new Promise((resolve, reject) => {
                db.query(
                    `INSERT INTO pending_payment_requests (payment_reference, phone_number, amount, plan_name, exam_count, price_per_exam, school_id, service_type, resource_id, resource_title, expires_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE payment_reference = VALUES(payment_reference)`,
                    [paypackRef, phone, amount, planLabel, examCount || null, priceToStore, null, serviceType, resourceIdValue || null, resourceTitleValue || null, new Date(expiresAt)],
                    (dbErr) => dbErr ? reject(dbErr) : resolve()
                );
            });

            console.log(`✅ Paypack cashin initiated: ${paypackRef} for ${serviceType}`);
            res.json({ success: true, referenceId: paypackRef, paypackRef, allocatedPlan: planLabel });

        } catch (apiErr) {
            const errMsg = apiErr.response?.data?.message || apiErr.response?.data?.error || apiErr.message || 'Paypack API error';
            console.error('❌ Paypack cashin error:', errMsg);
            try { require('../server').sendErrorAlert('Paypack Cashin Failed', `Phone: ${phone}\nAmount: ${amount}\nError: ${errMsg}`); } catch(e) {}
            res.status(502).json({ success: false, error: 'Kwishyura byanze: ' + errMsg });
        }
    });

    router.head('/callback', (req, res) => res.sendStatus(200));

    // POST — verify the signed event and confirm the transaction before granting access.
    router.post('/callback', async (req, res) => {
        if (!WEBHOOK_SECRET) return res.status(503).json({ ok: false });
        if (!PAYPACK_MERCHANT) return res.status(503).json({ ok: false });
        if (!verifyPaypackSignature(req.rawBody, req.get('X-Paypack-Signature'), WEBHOOK_SECRET)) {
            console.warn('Invalid Paypack webhook signature — rejected');
            return res.status(401).json({ ok: false });
        }

        const body = req.body;
        if (!body || body.kind !== 'transaction:processed' || !body.data || typeof body.data.ref !== 'string') {
            return res.status(400).json({ ok: false });
        }

        const txData = body.data;
        const paypackRef = txData.ref;
        if (!isSuccessfulPaypackStatus(txData.status)) {
            if (String(txData.status || '').toLowerCase() !== 'failed') return res.json({ ok: true });
            pendingMap.delete(paypackRef);
            const { schoolPendingMap } = require('./school');
            schoolPendingMap.delete(paypackRef);
            return markSchoolOrderStatus(db, paypackRef, 'FAILED', (statusErr) => {
                if (statusErr) return res.status(500).json({ ok: false });
                return res.json({ ok: true });
            });
        }

        db.query(`SELECT id FROM payment_transactions WHERE reference_id = ? LIMIT 1`, [paypackRef], async (checkErr, checkRows) => {
            if (checkErr) return res.status(500).json({ ok: false });
            if (checkRows && checkRows.length > 0) {
                pendingMap.delete(paypackRef);
                const { schoolPendingMap } = require('./school');
                schoolPendingMap.delete(paypackRef);
                return markSchoolOrderStatus(db, paypackRef, 'SUCCESS', (statusErr) => {
                    if (statusErr) return res.status(500).json({ ok: false });
                    return res.json({ ok: true });
                });
            }

            const confirmAndInsert = async (pending, schoolPending = null) => {
                if (!pending || !Number.isFinite(Number(pending.amount)) || Number(pending.amount) <= 0) {
                    return res.status(409).json({ ok: false });
                }

                try {
                    const token = await getAccessToken();
                    const { data: confirmedTransaction } = await axios.get(
                        `${PAYPACK_BASE}/transactions/find/${encodeURIComponent(paypackRef)}`,
                        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, timeout: 8000, maxRedirects: 0 }
                    );
                    if (pending.serviceType === 'SCHOOL' &&
                        String(confirmedTransaction?.status || '').toLowerCase() === 'failed' &&
                        confirmedTransaction.ref === paypackRef &&
                        confirmedTransaction.kind === 'CASHIN' &&
                        String(confirmedTransaction.merchant || '') === PAYPACK_MERCHANT &&
                        Number(confirmedTransaction.amount) === Number(pending.amount) &&
                        confirmsExpectedPayer(confirmedTransaction, pending)) {
                        return markSchoolOrderStatus(db, paypackRef, 'FAILED', (statusErr) => {
                            if (statusErr) return res.status(500).json({ ok: false });
                            if (schoolPending?.map) schoolPending.map.delete(paypackRef);
                            return res.json({ ok: true });
                        });
                    }

                    if (!confirmsExpectedPayment(confirmedTransaction, paypackRef, pending.amount, PAYPACK_MERCHANT, txData.status) ||
                        !confirmsExpectedPayer(confirmedTransaction, pending)) {
                        console.warn(`Paypack webhook confirmation mismatch for ${paypackRef}`);
                        return res.status(409).json({ ok: false });
                    }

                    const complete = (err) => {
                        const duplicate = isDuplicatePaymentError(err);
                        if (err && !duplicate) {
                            console.error('Webhook DB insert error:', err.message);
                            return res.status(500).json({ ok: false });
                        }
                        pendingMap.delete(paypackRef);
                        if (schoolPending?.map) schoolPending.map.delete(paypackRef);
                        const finish = (statusErr) => {
                            if (statusErr) {
                                console.error('Webhook pending-order status update failed:', statusErr.message);
                                return res.status(500).json({ ok: false });
                            }
                            if (!duplicate) {
                                sendPaymentNotification(req.app.get('emailTransport'), {
                                    phone: pending.phone, amount: pending.amount,
                                    planLabel: pending.planLabel, examCount: pending.examCount,
                                    paypackRef,
                                    type: pending.serviceType === 'SCHOOL' ? 'School Payment' : pending.serviceType === 'RESOURCES' ? 'Resource Payment' : 'Self Payment'
                                });
                            }
                            return res.json({ ok: true });
                        };
                        if (pending.serviceType === 'SCHOOL') {
                            return markSchoolOrderStatus(db, paypackRef, 'SUCCESS', finish);
                        }
                        return finish(null);
                    };

                    if (pending.serviceType === 'SCHOOL') {
                        return insertPaymentTransaction(db, {
                            phone: pending.phone,
                            amount: Number(pending.amount),
                            planLabel: pending.planLabel,
                            examCount: pending.examCount,
                            priceToStore: pending.priceToStore,
                            school_id: pending.school_id,
                            serviceType: 'SCHOOL'
                        }, paypackRef, complete);
                    }
                    return insertPaymentTransaction(db, pending, paypackRef, complete);
                } catch (error) {
                    console.error('Paypack transaction confirmation failed:', error.message);
                    return res.status(502).json({ ok: false });
                }
            };

            db.query(
                `SELECT phone_number AS phone, amount, plan_name AS planLabel, exam_count AS examCount,
                        price_per_exam AS priceToStore, school_id AS schoolId, service_type AS serviceType,
                        resource_id AS resourceId, resource_title AS resourceTitle,
                        package_id AS packageId, provider, status
                 FROM pending_payment_requests WHERE payment_reference = ? LIMIT 1`,
                [paypackRef],
                (pendingErr, pendingRows) => {
                    if (pendingErr) return res.status(500).json({ ok: false });
                    if (pendingRows && pendingRows.length > 0) {
                        const stored = pendingRows[0];
                        if (stored.serviceType === 'SCHOOL') {
                            if (!['PENDING', 'FAILED'].includes(stored.status)) return res.json({ ok: true });
                            const schoolOrder = schoolPendingFromRow(stored);
                            if (!schoolOrder) {
                                console.error(`Invalid durable school payment order for ${paypackRef}`);
                                return res.status(409).json({ ok: false });
                            }
                            const { schoolPendingMap } = require('./school');
                            return confirmAndInsert(schoolOrder, { map: schoolPendingMap, durable: true });
                        }
                        return confirmAndInsert(stored);
                    }

                    const { schoolPendingMap } = require('./school');
                    const schoolOrder = schoolPendingMap.get(paypackRef);
                    if (!schoolOrder) return res.json({ ok: true });
                    const confirmMemoryOrder = () => {
                        const pkg = getSchoolPackage(schoolOrder.packageId);
                        if (!pkg || Number(schoolOrder.amount) !== pkg.price || Number(schoolOrder.examCount) !== pkg.examCredits) {
                            return res.status(409).json({ ok: false });
                        }
                        return confirmAndInsert({
                            phone: schoolOrder.phone,
                            amount: pkg.price,
                            planLabel: `${pkg.name} School Package (${pkg.examCredits} Exams)`,
                            examCount: pkg.examCredits,
                            priceToStore: pkg.price / pkg.examCredits,
                            school_id: Number(schoolOrder.schoolId),
                            serviceType: 'SCHOOL'
                        }, { map: schoolPendingMap, durable: false });
                    };
                    if (schoolOrder.persistPromise) {
                        return schoolOrder.persistPromise.then(confirmMemoryOrder).catch((persistErr) => {
                            console.error('School pending-order persistence failed before callback:', persistErr.message);
                            return confirmMemoryOrder();
                        });
                    }
                    return confirmMemoryOrder();
                }
            );
        });
    });

    // GET — poll payment status
    router.get('/verify/:refId', (req, res) => {
        const ref = req.params.refId;
        db.query(
            `SELECT status, plan_name, amount, reference_id FROM payment_transactions WHERE reference_id = ? OR rwandapay_tx_id = ? LIMIT 1`,
            [ref, ref],
            async (err, results) => {
                if (!err && results && results.length > 0) {
                    const response = { status: results[0].status, plan: results[0].plan_name };
                    if (analyticsConfig().enabled && !excludeAdmin(req)) {
                        const receipt = await verifiedAnalyticsReceipt(results[0]);
                        if (receipt) response.analyticsPurchase = receipt;
                    }
                    return res.json(response);
                }
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
    const planLabel = pending.planLabel;
    insertPaymentTransaction(db, {
        phone: pending.phone,
        amount: pending.amount,
        planLabel,
        examCount: pending.examCount,
        priceToStore: pending.priceToStore,
        school_id: pending.schoolId,
        serviceType: 'SCHOOL'
    }, paypackRef, (err) => {
        if (err) { console.error('❌ School webhook DB insert error:', err.message); return res.status(500).json({ ok: false }); }
        console.log(`✅ School webhook: ${paypackRef} → SUCCESS (inserted)`);
        sendPaymentNotification(res.req.app.get('emailTransport'), {
            phone: pending.phone, amount: pending.amount,
            planLabel, examCount: pending.examCount,
            paypackRef, type: 'School Payment'
        });
        res.json({ ok: true });
    });
}
