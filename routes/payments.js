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
}

function ensureResourcePurchaseSessionsTable(db) {
    db.query(`
        CREATE TABLE IF NOT EXISTS resource_purchase_sessions (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            purchase_session_id CHAR(36) NOT NULL UNIQUE,
            resource_id INT NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            payment_reference VARCHAR(128) NOT NULL,
            payment_status ENUM('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
            browser_fingerprint VARCHAR(255) NULL,
            ip_address VARCHAR(45) NULL,
            user_agent TEXT NULL,
            phone_number VARCHAR(32) NULL,
            plan_name VARCHAR(255) NULL,
            exam_count INT NULL,
            price_per_exam DECIMAL(10,2) NULL,
            service_type VARCHAR(50) NOT NULL DEFAULT 'RESOURCES',
            resource_title VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            paid_at DATETIME NULL,
            download_token VARCHAR(128) UNIQUE NULL,
            token_expires_at DATETIME NULL,
            token_used TINYINT(1) NOT NULL DEFAULT 0,
            token_used_at DATETIME NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_payment_reference (payment_reference),
            INDEX idx_resource_id (resource_id),
            INDEX idx_download_token (download_token)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `, (err) => {
        if (err) console.error('⚠️  Failed to ensure resource_purchase_sessions table:', err.message);
    });
}

function getPendingResourceSession(db, paypackRef, done) {
    db.query(
        `SELECT purchase_session_id, resource_id, amount, payment_reference, payment_status, browser_fingerprint, ip_address, user_agent,
                phone_number AS phone, plan_name AS planLabel, exam_count AS examCount, price_per_exam AS priceToStore,
                service_type AS serviceType, resource_title AS resourceTitle
         FROM resource_purchase_sessions WHERE payment_reference = ? LIMIT 1`,
        [paypackRef],
        (err, rows) => {
            if (err) return done(err);
            if (!rows || rows.length === 0) return done(null, null);
            done(null, rows[0]);
        }
    );
}

function insertPaymentTransaction(db, pending, paypackRef, done, conn = null) {
    const query = conn ? conn.query.bind(conn) : db.query.bind(db);
    const serviceType = pending.serviceType || 'EXAMS';
    const resourceIdValue = pending.resourceId || null;
    const resourceTitleValue = pending.resourceTitle || null;
    const baseValues = [pending.phone, pending.amount, pending.planLabel, paypackRef, paypackRef,
        pending.examCount, pending.examCount, pending.priceToStore, pending.school_id || null];

    query(`SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'payment_transactions' AND column_name = 'service_type'`, (colErr, colRows) => {
        if (colErr) return done(colErr);
        const hasServiceColumns = Number(colRows?.[0]?.count || 0) > 0;
        if (!hasServiceColumns) {
            query(
                `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, school_id)
                 VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?)`,
                baseValues,
                (err) => done(err)
            );
            return;
        }

        query(`SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'payment_transactions' AND column_name = 'resource_id'`, (resourceErr, resourceRows) => {
            if (resourceErr) return done(resourceErr);
            const hasResourceColumns = Number(resourceRows?.[0]?.count || 0) > 0;
            if (!hasResourceColumns) {
                query(
                    `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, school_id, service_type)
                     VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?, ?)`,
                    [...baseValues, serviceType],
                    (err) => done(err)
                );
                return;
            }

            query(
                `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, school_id, service_type, resource_id, resource_title)
                 VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?, ?, ?, ?)`,
                [...baseValues, serviceType, resourceIdValue, resourceTitleValue],
                (err) => done(err)
            );
        });
    });
}

function processResourcePurchaseSession(db, pending, paypackRef, done) {
    db.getConnection((connErr, conn) => {
        if (connErr) return done(connErr);
        conn.beginTransaction((txErr) => {
            if (txErr) {
                conn.release();
                return done(txErr);
            }

            conn.query(
                `SELECT * FROM resource_purchase_sessions WHERE payment_reference = ? FOR UPDATE`,
                [paypackRef],
                (selectErr, rows) => {
                    if (selectErr) {
                        return conn.rollback(() => { conn.release(); done(selectErr); });
                    }
                    if (!rows || rows.length === 0) {
                        return conn.rollback(() => { conn.release(); done(new Error('Purchase session not found')); });
                    }
                    const sessionRow = rows[0];
                    if (sessionRow.payment_status === 'PAID') {
                        return conn.commit((commitErr) => { conn.release(); done(null, { alreadyPaid: true, downloadToken: sessionRow.download_token }); });
                    }
                    if (sessionRow.payment_status !== 'PENDING') {
                        return conn.commit((commitErr) => { conn.release(); done(null, { alreadyFailed: true }); });
                    }

                    const downloadToken = crypto.randomBytes(32).toString('hex');
                    conn.query(
                        `UPDATE resource_purchase_sessions SET payment_status = 'PAID', paid_at = NOW(), download_token = ?, token_expires_at = DATE_ADD(NOW(), INTERVAL 60 SECOND) WHERE payment_reference = ?`,
                        [downloadToken, paypackRef],
                        (updateErr) => {
                            if (updateErr) {
                                return conn.rollback(() => { conn.release(); done(updateErr); });
                            }

                            const pendingForInsert = {
                                phone: pending.phone,
                                amount: pending.amount,
                                planLabel: pending.planLabel,
                                examCount: pending.examCount,
                                priceToStore: pending.priceToStore,
                                school_id: pending.school_id,
                                serviceType: pending.serviceType,
                                resourceId: pending.resourceId,
                                resourceTitle: pending.resourceTitle
                            };

                            insertPaymentTransaction(db, pendingForInsert, paypackRef, (insertErr) => {
                                if (insertErr) {
                                    return conn.rollback(() => { conn.release(); done(insertErr); });
                                }
                                conn.commit((commitErr) => {
                                    if (commitErr) {
                                        return conn.rollback(() => { conn.release(); done(commitErr); });
                                    }
                                    conn.release();
                                    done(null, { alreadyPaid: false, downloadToken });
                                });
                            }, conn);
                        }
                    );
                }
            );
        });
    });
}

function findPaypackTransactionPayload(data, ref) {
    if (!data) return null;
    if (Array.isArray(data)) {
        for (const item of data) {
            const tx = findPaypackTransactionPayload(item, ref);
            if (tx) return tx;
        }
        return null;
    }

    if (typeof data === 'object') {
        const txRef = String(data.ref || data.reference_id || data.rwandapay_tx_id || data.reference || '').trim();
        if (txRef && txRef === String(ref).trim()) {
            const status = String(data.status || data.state || data.tx_status || data.transaction_status || '').toLowerCase();
            return { status, ref: txRef, raw: data };
        }
        if (Array.isArray(data.transactions)) {
            return findPaypackTransactionPayload(data.transactions, ref);
        }
        if (Array.isArray(data.data)) {
            return findPaypackTransactionPayload(data.data, ref);
        }
        if (typeof data.transaction === 'object') {
            return findPaypackTransactionPayload(data.transaction, ref);
        }
    }
    return null;
}

async function verifyPaypackTransaction(ref) {
    const token = await getAccessToken();
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    };

    const attempts = [
        `${PAYPACK_BASE}/transactions/${encodeURIComponent(ref)}`,
        `${PAYPACK_BASE}/transactions/status?ref=${encodeURIComponent(ref)}`,
        `${PAYPACK_BASE}/transactions/list?offset=0&limit=50&ref=${encodeURIComponent(ref)}`,
        `${PAYPACK_BASE}/transactions/list?offset=0&limit=1000`
    ];

    for (const url of attempts) {
        try {
            const { data } = await axios.get(url, { headers, timeout: 15000 });
            const tx = findPaypackTransactionPayload(data, ref);
            if (tx) return tx;
        } catch (err) {
            continue;
        }
    }

    throw new Error('Unable to verify Paypack transaction: ' + ref);
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
    ensureResourcePurchaseSessionsTable(db);

    // POST — initiate USSD push, do NOT write to DB yet
    router.post('/momo-push', async (req, res) => {
        const { phoneNumber, checkoutIntentType, examQuantityVolume, pricePerExam, resourceId, resourceTitle, resourcePrice, browserFingerprint } = req.body;

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

            const purchaseSessionId = crypto.randomUUID();
            const ipAddress = (req.ip || req.connection.remoteAddress || '').replace(/^::ffff:/i, '').replace(/^::1$/, '127.0.0.1');
            const userAgent = String(req.headers['user-agent'] || '').substring(0, 2048);

            db.query(
                `INSERT INTO resource_purchase_sessions (purchase_session_id, resource_id, amount, payment_reference, payment_status, browser_fingerprint, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
                [purchaseSessionId, resourceIdValue, amount, paypackRef, browserFingerprint || null, ipAddress, userAgent],
                (insertErr) => {
                    if (insertErr) {
                        console.error('❌ Failed to persist purchase session:', insertErr.message);
                        return res.status(500).json({ success: false, error: 'Server error creating purchase session.' });
                    }

                    pendingMap.set(paypackRef, {
                        phone, amount, planLabel, examCount, priceToStore,
                        school_id: null,
                        serviceType,
                        resourceId: resourceIdValue,
                        resourceTitle: resourceTitleValue,
                        purchaseSessionId,
                        expires: Date.now() + 5 * 60 * 1000 // 5 min TTL
                    });

                    console.log(`✅ Paypack cashin initiated: ${paypackRef} for resource ${resourceIdValue}`);
                    res.json({ success: true, referenceId: paypackRef, paypackRef, allocatedPlan: planLabel, purchaseSessionId });
                }
            );

        } catch (apiErr) {
            const errMsg = apiErr.response?.data?.message || apiErr.response?.data?.error || apiErr.message || 'Paypack API error';
            console.error('❌ Paypack cashin error:', errMsg);
            try { require('../server').sendErrorAlert('Paypack Cashin Failed', `Phone: ${phone}\nAmount: ${amount}\nError: ${errMsg}`); } catch(e) {}
            res.status(502).json({ success: false, error: 'Kwishyura byanze: ' + errMsg });
        }
    });

    // POST — Paypack webhook: insert to DB only on successful
    router.post('/callback', async (req, res) => {
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

        const pending = pendingMap.get(paypackRef);
        const handleVerifiedResource = async (pendingPayload) => {
            try {
                const verification = await verifyPaypackTransaction(paypackRef);
                if (!verification || verification.status !== 'successful') {
                    console.warn(`⚠️  Paypack webhook payload not verified for ref ${paypackRef}`);
                    return res.status(400).json({ ok: false });
                }
            } catch (verifyErr) {
                console.error('❌ Paypack verification failed:', verifyErr.message);
                return res.status(500).json({ ok: false });
            }

            if (pendingPayload.serviceType === 'RESOURCES') {
                processResourcePurchaseSession(db, pendingPayload, paypackRef, (processErr, result) => {
                    if (processErr) {
                        console.error('❌ Resource payment processing failed:', processErr.message);
                        return res.status(500).json({ ok: false });
                    }
                    if (result && result.alreadyPaid) {
                        return res.json({ ok: true });
                    }
                    console.log(`✅ Paypack webhook: ${paypackRef} → SUCCESS (resource purchase processed)`);
                    sendPaymentNotification(req.app.get('emailTransport'), {
                        phone: pendingPayload.phone, amount: pendingPayload.amount,
                        planLabel: pendingPayload.planLabel, examCount: pendingPayload.examCount,
                        paypackRef, type: 'Resource Payment'
                    });
                    res.json({ ok: true });
                });
                return;
            }

            insertPaymentTransaction(db, pendingPayload, paypackRef, (err) => {
                if (err) { console.error('❌ Webhook DB insert error:', err.message); return res.status(500).json({ ok: false }); }
                console.log(`✅ Paypack webhook: ${paypackRef} → SUCCESS (inserted)`);
                sendPaymentNotification(req.app.get('emailTransport'), {
                    phone: pendingPayload.phone, amount: pendingPayload.amount,
                    planLabel: pendingPayload.planLabel, examCount: pendingPayload.examCount,
                    paypackRef, type: pendingPayload.serviceType === 'RESOURCES' ? 'Resource Payment' : 'Self Payment'
                });
                res.json({ ok: true });
            });
        };

        if (!pending) {
            getPendingResourceSession(db, paypackRef, (sessionErr, session) => {
                if (sessionErr) {
                    console.error('❌ Failed to load pending resource session:', sessionErr.message);
                    return res.status(500).json({ ok: false });
                }
                if (!session) {
                    return handleSchoolWebhook(db, paypackRef, txData, res);
                }
                if (session.payment_status === 'PAID') {
                    return res.json({ ok: true });
                }
                if (session.payment_status !== 'PENDING') {
                    return res.json({ ok: true });
                }

                const pendingPayload = {
                    phone: session.phone,
                    amount: session.amount,
                    planLabel: session.plan_name || `Resource Access`,
                    examCount: session.exam_count || 0,
                    priceToStore: session.price_per_exam || session.amount,
                    school_id: null,
                    serviceType: session.service_type || 'RESOURCES',
                    resourceId: session.resource_id,
                    resourceTitle: session.resource_title
                };
                return handleVerifiedResource(pendingPayload);
            });
            return;
        }

        pendingMap.delete(paypackRef);
        handleVerifiedResource(pending);
    });

    // GET — poll payment status (check if webhook has inserted the record)
    router.get('/verify/:refId', (req, res) => {
        const ref = req.params.refId;
        db.query(
            `SELECT status, plan_name FROM payment_transactions WHERE reference_id = ? OR rwandapay_tx_id = ?`,
            [ref, ref],
            (err, results) => {
                if (err || !results || results.length === 0) {
                    return res.json({ status: pendingMap.has(ref) ? 'PENDING' : 'PENDING' });
                }
                res.json({ status: results[0].status, plan: results[0].plan_name });
            }
        );
    });

    // GET — resource purchase session status and download token
    router.get('/purchase-session/:sessionId', (req, res) => {
        const sessionId = req.params.sessionId;
        db.query(
            `SELECT purchase_session_id, payment_status, download_token, token_expires_at, token_used, created_at, paid_at FROM resource_purchase_sessions WHERE purchase_session_id = ? LIMIT 1`,
            [sessionId],
            (err, rows) => {
                if (err) return res.status(500).json({ success: false, error: err.message });
                if (!rows || rows.length === 0) return res.status(404).json({ success: false, error: 'Purchase session not found.' });
                const session = rows[0];
                res.json({
                    success: true,
                    paymentStatus: session.payment_status,
                    downloadToken: session.payment_status === 'PAID' ? session.download_token : null,
                    tokenExpiresAt: session.token_expires_at,
                    tokenUsed: !!Number(session.token_used || 0),
                    createdAt: session.created_at,
                    paidAt: session.paid_at
                });
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
