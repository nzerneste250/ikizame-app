const express = require('express');
const axios   = require('axios');

const BASE_URL     = process.env.RWANDAPAY_BASE_URL    || 'https://api.rwandapay.rw';
const SECRET_KEY   = process.env.RWANDAPAY_SECRET_KEY;
const PUBLIC_KEY   = process.env.RWANDAPAY_PUBLIC_KEY;
const CALLBACK_URL = process.env.RWANDAPAY_CALLBACK_URL || 'https://ikizame.rw/api/payments/callback';

module.exports = (db) => {
    const router = express.Router();

    // POST — initiate mobile money payment
    router.post('/momo-push', async (req, res) => {
        const { phoneNumber, checkoutIntentType, examQuantityVolume, pricePerExam } = req.body;

        if (!phoneNumber || !checkoutIntentType)
            return res.status(400).json({ success: false, error: 'Missing mandatory payment fields.' });

        let phone = phoneNumber.toString().replace(/[\s\-\+]+/g, '').trim();
        if (phone.startsWith('250')) phone = '0' + phone.substring(3);

        let carrier = 'UNKNOWN';
        if (/^078|^079/.test(phone)) carrier = 'MTN_MOMO';
        else if (/^072|^073/.test(phone)) carrier = 'AIRTEL_MONEY';

        if (carrier === 'UNKNOWN' || phone.length < 10)
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

        const txRef        = 'RWP_REF_' + Date.now();
        const submittedPx  = Number(pricePerExam);
        const validPrices  = [100, 80, 70, 50];
        const priceToStore = validPrices.includes(submittedPx) ? submittedPx : getPricePerExam(examCount);

        // RwandaPay requires phone in format 2507XXXXXXXX
        const phoneForApi = '250' + phone.substring(1);

        db.query(
            `INSERT INTO payment_transactions
             (phone_number, amount, plan_name, reference_id, status, total_exams, remaining_exams, price_per_exam)
             VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
            [phone, amount, planLabel, txRef, examCount, examCount, priceToStore],
            async (insertErr) => {
                if (insertErr)
                    return res.status(500).json({ success: false, error: 'Database Write Error: ' + insertErr.message });

                try {
                    const { data } = await axios.post(
                        `${BASE_URL}/api/v1/collections/momo-push`,
                        {
                            public_key:   PUBLIC_KEY,
                            phone_number: phoneForApi,
                            amount:       String(amount),
                            currency:     'RWF',
                            tx_ref:       txRef,
                            narration:    planLabel,
                            callback_url: CALLBACK_URL
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${SECRET_KEY}`,
                                'Content-Type':  'application/json',
                                'Accept':        'application/json'
                            },
                            timeout: 20000
                        }
                    );

                    // Store RwandaPay's own transaction ID if returned
                    const rwTxId = data?.data?.id || data?.transaction_id || data?.id || null;
                    if (rwTxId) {
                        db.query(
                            `UPDATE payment_transactions SET rwandapay_tx_id = ? WHERE reference_id = ?`,
                            [String(rwTxId), txRef],
                            () => {}
                        );
                    }

                    res.json({ success: true, referenceId: txRef, provider: carrier, allocatedPlan: planLabel });

                } catch (apiErr) {
                    const errMsg = apiErr.response?.data?.message
                        || apiErr.response?.data?.error
                        || apiErr.message
                        || 'RwandaPay API error';

                    console.error('❌ RwandaPay initiation error:', errMsg, apiErr.response?.data);
                    db.query(`UPDATE payment_transactions SET status = 'FAILED' WHERE reference_id = ?`, [txRef], () => {});
                    res.status(502).json({ success: false, error: 'Kwishyura byanze: ' + errMsg });
                }
            }
        );
    });

    // POST — RwandaPay webhook callback (called by RwandaPay server when payment completes)
    router.post('/callback', (req, res) => {
        const body = req.body;

        // RwandaPay may send: tx_ref or reference, status, id or transaction_id
        const reference    = body.tx_ref || body.reference || body.txRef;
        const rawStatus    = (body.status || '').toUpperCase();
        const rwTxId       = body.id || body.transaction_id || null;

        if (!reference) {
            console.warn('⚠️  Payment callback received with no reference:', body);
            return res.status(400).json({ ok: false, error: 'No reference provided' });
        }

        const newStatus = ['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID'].includes(rawStatus)
            ? 'SUCCESS'
            : 'FAILED';

        db.query(
            `UPDATE payment_transactions
             SET status = ?, rwandapay_tx_id = COALESCE(?, rwandapay_tx_id)
             WHERE reference_id = ?`,
            [newStatus, rwTxId ? String(rwTxId) : null, reference],
            (err) => {
                if (err) {
                    console.error('❌ Callback DB update error:', err.message);
                    return res.status(500).json({ ok: false });
                }
                console.log(`✅ Payment callback: ${reference} → ${newStatus}`);
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
