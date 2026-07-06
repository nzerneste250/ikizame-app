const express = require('express');
const axios   = require('axios');
const crypto  = require('crypto');

const BASE_URL       = 'https://pay.rwandapay.rw/api/v1';
const SECRET_KEY     = process.env.RWANDAPAY_SECRET_KEY;
const PUBLIC_KEY     = process.env.RWANDAPAY_PUBLIC_KEY;
const WEBHOOK_SECRET = process.env.RWANDAPAY_WEBHOOK_SECRET;
const REDIRECT_URL   = 'https://ikizame.rw/ibiciro';
const WEBHOOK_URL    = 'https://ikizame.rw/api/payments/callback';

module.exports = (db) => {
    const router = express.Router();

    // POST — initiate hosted checkout session
    router.post('/momo-push', async (req, res) => {
        const { phoneNumber, checkoutIntentType, examQuantityVolume, pricePerExam, customerName, customerEmail } = req.body;

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

        const txRef        = 'RWP_REF_' + Date.now();
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
                    const { data } = await axios.post(
                        `${BASE_URL}/checkout/initialize`,
                        {
                            amount:       amount,
                            currency:     'RWF',
                            tx_ref:       txRef,
                            description:  planLabel,
                            redirect_url: REDIRECT_URL + '?ref=' + txRef,
                            webhook_url:  WEBHOOK_URL,
                            customer: {
                                name:  customerName  || 'Ikizame Customer',
                                email: customerEmail || 'customer@ikizame.rw',
                                phone: phone
                            }
                        },
                        {
                            headers: {
                                'X-Public-Key': PUBLIC_KEY,
                                'X-Secret-Key': SECRET_KEY,
                                'Content-Type': 'application/json',
                                'Accept':       'application/json'
                            },
                            timeout: 20000
                        }
                    );

                    // Store RwandaPay transaction ID
                    const rwTxId = data?.data?.id || data?.id || null;
                    if (rwTxId) {
                        db.query(
                            `UPDATE payment_transactions SET rwandapay_tx_id = ? WHERE reference_id = ?`,
                            [String(rwTxId), txRef],
                            () => {}
                        );
                    }

                    // Return payment_url so frontend can redirect customer
                    const paymentUrl = data?.data?.payment_url || data?.payment_url || null;
                    if (!paymentUrl)
                        return res.status(502).json({ success: false, error: 'RwandaPay did not return a payment URL.' });

                    res.json({ success: true, referenceId: txRef, paymentUrl, allocatedPlan: planLabel });

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

    // POST — RwandaPay webhook (server-to-server payment confirmation)
    router.post('/callback', (req, res) => {
        if (WEBHOOK_SECRET) {
            const signature = req.headers['x-rwandapay-signature'] || req.headers['x-webhook-signature'] || '';
            const expected  = crypto.createHmac('sha256', WEBHOOK_SECRET).update(JSON.stringify(req.body)).digest('hex');
            if (signature && signature !== expected) {
                console.warn('⚠️  Invalid webhook signature — rejected');
                return res.status(401).json({ ok: false });
            }
        }

        const body      = req.body;
        const reference = body.tx_ref || body.reference || body.txRef;
        const rawStatus = (body.status || '').toUpperCase();
        const rwTxId    = body.id || body.transaction_id || null;

        if (!reference) {
            console.warn('⚠️  Callback received with no reference:', body);
            return res.status(400).json({ ok: false });
        }

        const newStatus = ['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID'].includes(rawStatus)
            ? 'SUCCESS' : 'FAILED';

        db.query(
            `UPDATE payment_transactions
             SET status = ?, rwandapay_tx_id = COALESCE(?, rwandapay_tx_id)
             WHERE reference_id = ?`,
            [newStatus, rwTxId ? String(rwTxId) : null, reference],
            (err) => {
                if (err) { console.error('❌ Callback DB error:', err.message); return res.status(500).json({ ok: false }); }
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
