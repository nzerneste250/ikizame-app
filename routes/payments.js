const express = require('express');
const axios   = require('axios');
const crypto  = require('crypto');

const PAYPACK_BASE     = 'https://payments.paypack.rw/api';
const PAYPACK_CLIENT   = process.env.PAYPACK_CLIENT_ID;
const PAYPACK_SECRET   = process.env.PAYPACK_CLIENT_SECRET;
const WEBHOOK_SECRET   = process.env.PAYPACK_WEBHOOK_SECRET;

let cachedToken  = null;
let tokenExpires = 0;
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

// In-memory map: paypackRef -> pending tx data (cleared on webhook)
const pendingMap = new Map();

module.exports = (db) => {
    const router = express.Router();

    // POST — initiate USSD push, do NOT write to DB yet
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
            amount = 10000; planLabel = 'School Driving Center Monthly Pass'; examCount = 9999;
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
                    timeout: 20000
                }
            );

            const paypackRef = data?.ref;
            if (!paypackRef) throw new Error('No ref returned from Paypack');

            // Store pending data in memory — DB insert happens only on successful webhook
            pendingMap.set(paypackRef, {
                phone, amount, planLabel, examCount, priceToStore,
                school_id: null,
                expires: Date.now() + 5 * 60 * 1000 // 5 min TTL
            });

            console.log(`✅ Paypack cashin initiated: ${paypackRef}`);
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
            // Not successful — discard pending entry, do not write to DB
            pendingMap.delete(paypackRef);
            console.log(`ℹ️  Paypack webhook: ${paypackRef} → ${rawStatus} (not saved)`);
            return res.json({ ok: true });
        }

        const pending = pendingMap.get(paypackRef);
        if (!pending) {
            // Webhook for unknown ref (e.g. school payment) — check school pending map
            return handleSchoolWebhook(db, paypackRef, txData, res);
        }

        pendingMap.delete(paypackRef);

        // Insert confirmed transaction into DB
        db.query(
            `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, school_id)
             VALUES (?, ?, ?, ?, ?, 'SUCCESS', ?, ?, ?, ?)`,
            [pending.phone, pending.amount, pending.planLabel, paypackRef, paypackRef,
             pending.examCount, pending.examCount, pending.priceToStore, pending.school_id || null],
            (err) => {
                if (err) { console.error('❌ Webhook DB insert error:', err.message); return res.status(500).json({ ok: false }); }
                console.log(`✅ Paypack webhook: ${paypackRef} → SUCCESS (inserted)`);
                res.json({ ok: true });
            }
        );
    });

    // GET — poll payment status (check if webhook has inserted the record)
    router.get('/verify/:refId', (req, res) => {
        const ref = req.params.refId;
        db.query(
            `SELECT status, plan_name FROM payment_transactions WHERE reference_id = ? OR rwandapay_tx_id = ?`,
            [ref, ref],
            (err, results) => {
                if (err || !results || results.length === 0) {
                    // Still pending in memory
                    return res.json({ status: pendingMap.has(ref) ? 'PENDING' : 'PENDING' });
                }
                res.json({ status: results[0].status, plan: results[0].plan_name });
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
    db.query(
        `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, school_id)
         VALUES (?, 10000, ?, ?, ?, 'SUCCESS', 9999, 9999, ?, ?)`,
        [pending.phone, planLabel, paypackRef, paypackRef, Number((10000/9999).toFixed(2)), pending.schoolId],
        (err) => {
            if (err) { console.error('❌ School webhook DB insert error:', err.message); return res.status(500).json({ ok: false }); }
            console.log(`✅ School webhook: ${paypackRef} → SUCCESS (inserted)`);
            res.json({ ok: true });
        }
    );
}
