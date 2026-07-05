const express = require('express');

module.exports = (db) => {
    const router = express.Router();

    // POST initiate MoMo payment
    router.post('/momo-push', (req, res) => {
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

        const txRef            = 'RWP_REF_' + Date.now();
        const submittedPrice   = Number(pricePerExam);
        const validPrices      = [100, 80, 70, 50];
        const priceToStore     = validPrices.includes(submittedPrice) ? submittedPrice : getPricePerExam(examCount);

        db.query(
            `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, status, total_exams, remaining_exams, price_per_exam) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
            [phone, amount, planLabel, txRef, examCount, examCount, priceToStore],
            (insertErr) => {
                if (insertErr) return res.status(500).json({ success: false, error: 'Database Write Error: ' + insertErr.message });

                // Simulate payment confirmation after 4 seconds
                setTimeout(() => {
                    db.query(`UPDATE payment_transactions SET status = 'SUCCESS' WHERE reference_id = ?`, [txRef], (updateErr) => {
                        if (!updateErr) {
                            req.session.hasPaidPremiumAccess = true;
                            req.session.paidPlanType         = planLabel;
                            req.session.examPhoneNumber      = phone;
                        }
                    });
                }, 4000);

                res.json({ success: true, referenceId: txRef, provider: carrier, allocatedPlan: planLabel });
            }
        );
    });

    // GET verify payment status by reference ID
    router.get('/verify/:refId', (req, res) => {
        db.query(`SELECT status, plan_name FROM payment_transactions WHERE reference_id = ?`, [req.params.refId], (err, results) => {
            if (err || !results || results.length === 0) return res.json({ status: 'PENDING' });
            res.json({ status: results[0].status, plan: results[0].plan_name });
        });
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
