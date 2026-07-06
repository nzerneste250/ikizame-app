const express = require('express');
const axios   = require('axios');
const crypto  = require('crypto');

const PAYPACK_BASE     = 'https://payments.paypack.rw/api';
const PAYPACK_CLIENT   = process.env.PAYPACK_CLIENT_ID;
const PAYPACK_SECRET   = process.env.PAYPACK_CLIENT_SECRET;
const WEBHOOK_SECRET   = process.env.PAYPACK_WEBHOOK_SECRET;

// ── Token cache (access token expires in ~15min) ──────────────────────────
let cachedToken   = null;
let tokenExpires  = 0;

async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpires - 30000) return cachedToken;
    const { data } = await axios.post(`${PAYPACK_BASE}/auth/agents/authorize`,
        { client_id: PAYPACK_CLIENT, client_secret: PAYPACK_SECRET },
        { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 10000 }
    );
    cachedToken  = data.access;
    tokenExpires = data.expires * 1000;
    return cachedToken;
}

module.exports = (db) => {
    const router = express.Router();

    // POST — initiate direct USSD push (no redirect, no popup)
    router.post('/momo-push', async (req, res) => {
        const { phoneNumber, checkoutIntentType, examQuantityVolume, pricePerExam } = req.body;

        if (!phoneNumber || !checkoutIntentType)
            return res.status(400).json({ success: false, error: 'Missing mandatory payment fields.' });

        let phone = phoneNumber.toString().replace(/[\s\-\+]+/g, '').trim();
        if (phone.startsWith('250')) phone = '0' + phone.substring(3);

        if (phone.length < 10)
            return res.status(400).json({ success: false, error: "Nomero yishuriwe ntabwo ari iy'i Rwanda." });

        let amount = 0, planLabel = '', examCount = 0;

        if (checkoutIntentType === 'SCHOOL') {
            amount    = 10000;
            planLabel = 'School Driving Center Monthly Pass';
            examCount = 9999;
        } else {
            const qty = parseInt(examQuantityVolume, 10) || 1;
            examCount = qty;
            amount    = calcTieredAmount(qty);
            planLabel = `Personal Tiered Pass (${qty} Exams Package)`;
        }

        const txRef        = 'PKP_REF_' + Date.now();
        const submittedPx  = Number(pricePerExam);
        const validPrices  = [100, 80, 70, 50];
        const priceToStore = validPrices.includes(submittedPx) ? submittedPx : getPricePerExam(examCount);

        db.query(
            `INSERT INTO payment_transactions
             (phone_number, amount, plan_name, reference_id, status, total_exams, remaining_exams, price_per_exam)
             VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
            [phone, amount, planLabel, txRef, examCount, examCount, priceToStore],
            async (insertErr) => {
                if (insertErr)
                    return res.status(500).json({ success: false, error: 'Database Write Error: ' + insertErr.message });

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
                            timeout: 20000
                        }
                    );

                    // Store Paypack's transaction ref
                    const paypackRef = data?.ref || null;
                    if (paypackRef) {
                        db.query(
                            `UPDATE payment_transactions SET rwandapay_tx_id = ? WHERE reference_id = ?`,
                            [paypackRef, txRef],
                            () => {}
                        );
                    }

                    console.log(`✅ Paypack cashin initiated: ${txRef} → ${paypackRef}`);
                    res.json({ success: true, referenceId: txRef, paypackRef, allocatedPlan: planLabel });

                } catch (apiErr) {
                    const errMsg = apiErr.response?.data?.message
                        || apiErr.response?.data?.error
                        || apiErr.message
                        || 'Paypack API error';

                    console.error('❌ Paypack cashin error:', errMsg, apiErr.response?.data);
                    db.query(`UPDATE payment_transactions SET status = 'FAILED' WHERE reference_id = ?`, [txRef], () => {});
                    res.status(502).json({ success: false, error: 'Kwishyura byanze: ' + errMsg });
                }
            }
        );
    });

    // POST — Paypack webhook callback
    router.post('/callback', (req, res) => {
        // Verify signature
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

        // Only process transaction:processed events
        if (eventKind !== 'transaction:processed' && !txData.ref) {
            return res.status(200).json({ ok: true });
        }

        const paypackRef = txData.ref;
        const rawStatus  = (txData.status || '').toLowerCase();
        const newStatus  = rawStatus === 'successful' ? 'SUCCESS' : 'FAILED';

        // Find our transaction by paypack ref and update it
        db.query(
            `UPDATE payment_transactions
             SET status = ?
             WHERE rwandapay_tx_id = ? AND status = 'PENDING'`,
            [newStatus, paypackRef],
            (err, result) => {
                if (err) { console.error('❌ Callback DB error:', err.message); return res.status(500).json({ ok: false }); }
                console.log(`✅ Paypack webhook: ${paypackRef} → ${newStatus} (${result.affectedRows} rows)`);
                res.json({ ok: true });
            }
        );
    });

    // POST — cancel a pending transaction (timeout)
    router.post('/cancel/:refId', (req, res) => {
        db.query(
            `UPDATE payment_transactions SET status = 'CANCELLED' WHERE reference_id = ? AND status = 'PENDING'`,
            [req.params.refId],
            (err) => {
                if (err) return res.status(500).json({ ok: false });
                console.log(`🚫 Payment cancelled (timeout): ${req.params.refId}`);
                res.json({ ok: true });
            }
        );
    });

    // GET — poll payment status from frontend
    router.get('/verify/:refId', (req, res) => {
        db.query(
            `SELECT status, plan_name FROM payment_transactions WHERE reference_id = ?`,
            [req.params.refId],
            (err, results) => {
                if (err || !results || results.length === 0) return res.json({ status: 'PENDING' });
                res.json({ status: results[0].status, plan: results[0].plan_name });
            }
        );
    });

    return router;
};

function calcTieredAmount(qty) {
    qty = Number(qty) || 0;
    if (qty <= 0)  return 0;
    if (qty <= 9)  return qty * 100;
    if (qty <= 14) return 900  + (qty - 9)  * 80;
    if (qty <= 20) return 1300 + (qty - 14) * 70;
    return 1720 + (qty - 20) * 50;
}
function getPricePerExam(qty) {
    qty = Number(qty) || 0;
    if (qty <= 0)  return 0;
    if (qty <= 9)  return 100;
    if (qty <= 14) return 80;
    if (qty <= 20) return 70;
    return 50;
}
