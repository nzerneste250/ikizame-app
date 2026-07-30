const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const axios  = require('axios');
const { normalizeAndValidatePaymentPhone } = require('../helpers/paymentPhone');
const BCRYPT_ROUNDS = 10;

const PAYPACK_BASE   = 'https://payments.paypack.rw/api';
const PAYPACK_CLIENT = process.env.PAYPACK_CLIENT_ID;
const PAYPACK_SECRET = process.env.PAYPACK_CLIENT_SECRET;
let _tok = null, _tokExp = 0;
async function getToken() {
    if (_tok && Date.now() < _tokExp - 30000) return _tok;
    const { data } = await axios.post(`${PAYPACK_BASE}/auth/agents/authorize`,
        { client_id: PAYPACK_CLIENT, client_secret: PAYPACK_SECRET },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    _tok = data.access; _tokExp = data.expires * 1000;
    return _tok;
}

// In-memory pending map for school payments
const schoolPendingMap = new Map();
exports.schoolPendingMap = schoolPendingMap;

module.exports = (db, emailTransport, loginLimiter, otpLimiter) => {

    // POST register school (sends OTP) — rate limited
    router.post('/register', otpLimiter, (req, res) => {
        const { schoolName, email, phoneNumber } = req.body;
        if (!schoolName || !email || !phoneNumber) {
            return res.status(400).json({ success: false, error: 'Uzuza bisabwa byose: Izina, Email, na Telephone.' });
        }

        let cleanPhone = phoneNumber.toString().replace(/[\s\-\+]+/g, '').trim();
        if (cleanPhone.startsWith('250')) cleanPhone = '0' + cleanPhone.substring(3);

        const generatedOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const targetedRecipientEmail = email.trim().toLowerCase();

        const htmlTemplate = `
            <div style="font-family:'Inter',sans-serif;max-width:550px;margin:0 auto;background:#f8fafc;padding:30px;border-radius:12px;border:1px solid #e2e8f0;color:#0f172a;">
                <div style="text-align:center;margin-bottom:24px;">
                    <h2 style="color:#0b698b;text-transform:uppercase;letter-spacing:1px;margin:0;font-size:22px;">IKIZAME DRIVING SCHOOL</h2>
                    <p style="font-size:12px;color:#64748b;margin-top:4px;">Sisitemu Igezweho y'Ibizamini n'Imfashanyigisho</p>
                </div>
                <div style="background:#ffffff;border-radius:8px;padding:24px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">
                    <p style="font-size:15px;font-weight:700;margin-bottom:12px;color:#1e293b;">Muraho ${schoolName.trim()},</p>
                    <p style="font-size:14px;line-height:1.6;color:#475569;margin-bottom:20px;">Mwakiriye iyi email kuko muriko mufungura Konti y'Ishuri ryanyu rya Shofere kuri IKIZAME Portal.</p>
                    <div style="background:#f1f5f9;padding:16px;border-radius:8px;text-align:center;font-size:28px;font-weight:800;letter-spacing:6px;color:#0b698b;border:1px dashed #cbd5e1;margin-bottom:20px;">${generatedOtpCode}</div>
                    <p style="font-size:12px;color:#ef4444;font-weight:600;">⚠️ Ntiwigeze uha iyi kode undi muntu.</p>
                </div>
                <div style="text-align:center;margin-top:24px;font-size:11px;color:#94a3b8;">&copy; 2026 IKIZAME Platform &bull; Dotado Stationery Store Ltd</div>
            </div>`;

        db.query(`SELECT id FROM driving_schools WHERE email = ?`, [targetedRecipientEmail], (err, emailResults) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            const saveQuery = emailResults && emailResults.length > 0
                ? `UPDATE driving_schools SET school_name = ?, phone_number = ?, otp_code = ? WHERE email = ?`
                : `INSERT INTO driving_schools (school_name, email, phone_number, otp_code, is_verified) VALUES (?, ?, ?, ?, 0)`;

            const saveParams = emailResults && emailResults.length > 0
                ? [schoolName.trim(), cleanPhone, generatedOtpCode, targetedRecipientEmail]
                : [schoolName.trim(), targetedRecipientEmail, cleanPhone, generatedOtpCode];

            db.query(saveQuery, saveParams, (dbErr) => {
                if (dbErr) return res.status(500).json({ success: false, error: dbErr.message });

                emailTransport.sendMail({
                    from: '"IKIZAME Support Engine" <nzerneste250@gmail.com>',
                    to: targetedRecipientEmail,
                    subject: `${generatedOtpCode} ni kode yawe y'umutekano — IKIZAME Portal`,
                    html: htmlTemplate
                }, (mailErr) => {
                    if (mailErr) {
                        console.error('❌ SMTP Dispatch Fault:', mailErr);
                        return res.status(500).json({ success: false, error: 'Kohereza email byanze. Gerageza nanone.' });
                    }
                    console.log(`✓ OTP sent to [${targetedRecipientEmail}]`);
                    res.json({ success: true, message: 'Konti yafunguwe. Reba kode ya OTP muri Email yawe.', email: targetedRecipientEmail });
                });
            });
        });
    });

    // POST verify OTP
    router.post('/verify-otp', (req, res) => {
        const { email, otpCode } = req.body;
        if (!email || !otpCode) return res.status(400).json({ success: false, error: 'Injiza email hamwe na OTP.' });

        db.query(`SELECT id FROM driving_schools WHERE email = ? AND otp_code = ?`, [email.trim().toLowerCase(), otpCode.trim()], (err, results) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            if (!results || results.length === 0) return res.status(400).json({ success: false, error: 'OTP code wanditse ntabwo ari yo.' });
            res.json({ success: true, message: 'OTP yemejwe neza.' });
        });
    });

    // POST set password
    router.post('/set-password', (req, res) => {
        const { email, password } = req.body;
        if (!email || !password || password.trim().length < 6) {
            return res.status(400).json({ success: false, error: 'Password igomba kuba ifite inyandiko 6+.' });
        }
        bcrypt.hash(password.trim(), BCRYPT_ROUNDS, (hashErr, hash) => {
            if (hashErr) return res.status(500).json({ success: false, error: 'Encryption error.' });
            db.query(`UPDATE driving_schools SET password_hash = ?, is_verified = 1, otp_code = NULL WHERE email = ?`, [hash, email.trim().toLowerCase()], (err) => {
                if (err) return res.status(500).json({ success: false, error: err.message });
                res.json({ success: true, message: 'Password yaguzwe neza!' });
            });
        });
    });

    // POST login — rate limited
    router.post('/login', loginLimiter, (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ success: false, error: 'Andika Email na Password.' });

        db.query(`SELECT id, school_name, email, is_verified, is_active, password_hash FROM driving_schools WHERE email = ?`, [email.trim().toLowerCase()], (err, results) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            if (!results || results.length === 0) return res.status(401).json({ success: false, error: 'Email cyangwa Password ntabwo ari byo.' });

            const school = results[0];
            if (school.is_verified !== 1) return res.status(403).json({ success: false, error: 'Konti yawe ntabwo iratungana.' });
            if (school.is_active === 0) return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });

            bcrypt.compare(password.trim(), school.password_hash, (cmpErr, match) => {
                if (cmpErr || !match) return res.status(401).json({ success: false, error: 'Email cyangwa Password ntabwo ari byo.' });
                req.session.cookie.httpOnly = true;
                req.session.cookie.sameSite = 'lax';
                req.session.cookie.secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
                req.session.isSchoolAuthenticated = true;
                req.session.schoolAccountId = school.id;
                req.session.schoolAccountName = school.school_name;
                req.session.schoolAccountEmail = school.email;
                res.json({ success: true, message: 'Kwinjira byakunze!', redirect: '/school-dashboard' });
            });
        });
    });

    // GET wallet metrics
    router.get('/wallet-metrics', (req, res) => {
        if (!req.session || !req.session.isSchoolAuthenticated) return res.status(401).json({ success: false, error: 'Session expired.' });
        const schoolId = req.session.schoolAccountId;
        db.query(`SELECT SUM(remaining_exams) as total_exams_pool FROM payment_transactions WHERE school_id = ? AND status = 'SUCCESS' AND remaining_exams > 0`, [schoolId], (err, results) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            const balance = results && results[0].total_exams_pool ? parseInt(results[0].total_exams_pool, 10) : 0;
            res.json({
                success: true,
                schoolName: req.session.schoolAccountName,
                email: req.session.schoolAccountEmail,
                remainingExams: balance,
                licenseStatus: balance > 0 ? 'ACTIVE_LICENSED' : 'EXPIRED_NO_CREDITS'
            });
        });
    });

    // POST renew license — real Paypack USSD push, no DB insert until webhook confirms
    router.post('/renew-license', async (req, res) => {
        if (!req.session || !req.session.isSchoolAuthenticated) return res.status(401).json({ success: false, error: 'Session timeout.' });
        const { phoneNumber } = req.body;
        const schoolId   = req.session.schoolAccountId;
        const schoolName = req.session.schoolAccountName;

        if (!phoneNumber || phoneNumber.trim().length < 10) return res.status(400).json({ success: false, error: 'Injiza nomero ya telephone yuzuye.' });

        let phone;
        try {
            phone = normalizeAndValidatePaymentPhone(phoneNumber);
        } catch (validationErr) {
            return res.status(400).json({ success: false, error: validationErr.message });
        }

        try {
            const token = await getToken();
            const { data } = await axios.post(
                `${PAYPACK_BASE}/transactions/cashin`,
                { amount: 10000, number: phone },
                { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Webhook-Mode': 'production' }, timeout: 20000 }
            );
            const paypackRef = data?.ref;
            if (!paypackRef) throw new Error('No ref returned from Paypack');

            // Store in memory — DB insert happens only on successful webhook
            schoolPendingMap.set(paypackRef, {
                phone, schoolId, schoolName,
                expires: Date.now() + 5 * 60 * 1000
            });

            console.log(`✅ School cashin initiated: ${paypackRef}`);
            res.json({ success: true, referenceId: paypackRef });
        } catch (apiErr) {
            const msg = apiErr.response?.data?.message || apiErr.message || 'Paypack API error';
            try { require('../server').sendErrorAlert('School Cashin Failed', `School: ${schoolName}\nPhone: ${phone}\nError: ${msg}`); } catch(e) {}
            res.status(502).json({ success: false, error: 'Kwishyura byanze: ' + msg });
        }
    });

    // GET poll renewal status — check if webhook inserted the record
    router.get('/renew-status/:refId', (req, res) => {
        if (!req.session || !req.session.isSchoolAuthenticated) return res.status(401).json({ success: false });
        const ref = req.params.refId;
        db.query(`SELECT status FROM payment_transactions WHERE reference_id = ? OR rwandapay_tx_id = ?`, [ref, ref], (err, rows) => {
            if (err || !rows.length) return res.json({ status: schoolPendingMap.has(ref) ? 'PENDING' : 'PENDING' });
            res.json({ status: rows[0].status });
        });
    });

    // POST forgot password — rate limited
    router.post('/forgot-password', otpLimiter, (req, res) => {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'Injiza email yawe.' });
        const cleanEmail = email.trim().toLowerCase();

        db.query('SELECT id, school_name FROM driving_schools WHERE email = ? AND is_verified = 1', [cleanEmail], (err, results) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            if (!results || results.length === 0) return res.status(404).json({ success: false, error: 'Nta Konti yabonetse kuri iyi email.' });

            const schoolName = results[0].school_name;
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            db.query('UPDATE driving_schools SET otp_code = ? WHERE email = ?', [otp, cleanEmail], (updErr) => {
                if (updErr) return res.status(500).json({ success: false, error: updErr.message });

                const html = `<div style="font-family:'Inter',sans-serif;max-width:550px;margin:0 auto;background:#f8fafc;padding:30px;border-radius:12px;border:1px solid #e2e8f0;color:#0f172a;">
                    <h2 style="color:#0b698b;text-align:center;">IKIZAME DRIVING SCHOOL</h2>
                    <p>Muraho ${schoolName}, koresha kode ikurikira gusubiramo password:</p>
                    <div style="background:#f1f5f9;padding:16px;border-radius:8px;text-align:center;font-size:28px;font-weight:800;letter-spacing:6px;color:#0b698b;">${otp}</div>
                    <p style="color:#ef4444;font-size:12px;">⚠️ Niba utasabye gusubiramo password, irengageze iyi email.</p>
                </div>`;

                emailTransport.sendMail({
                    from: '"IKIZAME Support Engine" <nzerneste250@gmail.com>',
                    to: cleanEmail,
                    subject: `${otp} — Gusubiramo Password kwa IKIZAME`,
                    html
                }, (mailErr) => {
                    if (mailErr) {
                        console.error('❌ Forgot password mail error:', mailErr);
                        return res.status(500).json({ success: false, error: 'Kohereza email byanze.' });
                    }
                    res.json({ success: true });
                });
            });
        });
    });

    // POST reset password
    router.post('/reset-password', (req, res) => {
        const { email, password } = req.body;
        if (!email || !password || password.trim().length < 6) return res.status(400).json({ success: false, error: 'Password igomba kuba ifite inyandiko 6+.' });
        bcrypt.hash(password.trim(), BCRYPT_ROUNDS, (hashErr, hash) => {
            if (hashErr) return res.status(500).json({ success: false, error: 'Encryption error.' });
            db.query('UPDATE driving_schools SET password_hash = ?, otp_code = NULL WHERE email = ?', [hash, email.trim().toLowerCase()], (err) => {
                if (err) return res.status(500).json({ success: false, error: err.message });
                res.json({ success: true });
            });
        });
    });

    function ensureSchoolStudentsTable(next) {
        db.query(`
            CREATE TABLE IF NOT EXISTS school_students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                school_id INT NOT NULL,
                student_name VARCHAR(150) NOT NULL,
                phone_number VARCHAR(20) NOT NULL,
                assigned_exams INT NOT NULL DEFAULT 0,
                status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_school_students_school_id (school_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `, (err) => next(err));
    }

    router.get('/students', (req, res) => {
        if (!req.session || !req.session.isSchoolAuthenticated) return res.status(401).json({ success: false, error: 'Session expired.' });

        ensureSchoolStudentsTable((tableErr) => {
            if (tableErr) return res.status(500).json({ success: false, error: tableErr.message });
            db.query(
                'SELECT id, student_name, phone_number, assigned_exams, status, created_at FROM school_students WHERE school_id = ? ORDER BY id DESC',
                [req.session.schoolAccountId],
                (err, rows) => {
                    if (err) return res.status(500).json({ success: false, error: err.message });
                    res.json({ success: true, students: rows || [] });
                }
            );
        });
    });

    router.post('/register-student', (req, res) => {
        if (!req.session || !req.session.isSchoolAuthenticated) return res.status(401).json({ success: false, error: 'Session expired.' });

        const { studentName, phoneNumber, examCount } = req.body;
        const schoolId = req.session.schoolAccountId;
        const trimmedName = (studentName || '').trim();
        const cleanedPhone = (phoneNumber || '').toString().replace(/[^0-9+]/g, '').trim();
        const assignedExams = parseInt(examCount || '0', 10);

        if (!trimmedName || !cleanedPhone || assignedExams <= 0) {
            return res.status(400).json({ success: false, error: 'Andika amazina, telephone, hamwe n’ibizamini byahawe.' });
        }

        ensureSchoolStudentsTable((tableErr) => {
            if (tableErr) return res.status(500).json({ success: false, error: tableErr.message });

            db.query('SELECT id, remaining_exams FROM payment_transactions WHERE school_id = ? AND status = ? AND remaining_exams > 0 ORDER BY id ASC', [schoolId, 'SUCCESS'], (payErr, paymentRows) => {
                if (payErr) return res.status(500).json({ success: false, error: payErr.message });

                let remainingNeeded = assignedExams;
                const updates = [];
                let canAllocate = true;

                paymentRows.forEach((row) => {
                    if (!canAllocate) return;
                    if (remainingNeeded <= 0) return;
                    if (row.remaining_exams >= remainingNeeded) {
                        updates.push({ id: row.id, remaining: row.remaining_exams - remainingNeeded });
                        remainingNeeded = 0;
                    } else {
                        updates.push({ id: row.id, remaining: 0 });
                        remainingNeeded -= row.remaining_exams;
                    }
                });

                if (remainingNeeded > 0) {
                    return res.status(400).json({ success: false, error: 'Ishuri rifite ibizamini bike cyane. Vugurura package yawe mbere yo gutanga ibizamini.' });
                }

                const applyUpdates = () => {
                    if (!updates.length) {
                        return db.query('INSERT INTO school_students (school_id, student_name, phone_number, assigned_exams) VALUES (?, ?, ?, ?)', [schoolId, trimmedName, cleanedPhone, assignedExams], (insertErr) => {
                            if (insertErr) return res.status(500).json({ success: false, error: insertErr.message });
                            return res.json({ success: true, message: 'Umuyobozi yandikishije abanyeshuri kandi ibizamini byatangiwe.' });
                        });
                    }

                    let pending = updates.length;
                    updates.forEach((entry) => {
                        db.query('UPDATE payment_transactions SET remaining_exams = ? WHERE id = ?', [entry.remaining, entry.id], (updateErr) => {
                            if (updateErr) {
                                canAllocate = false;
                            }
                            pending -= 1;
                            if (pending === 0) {
                                if (!canAllocate) return res.status(500).json({ success: false, error: 'Guhindura ibizamini byanze.' });
                                db.query('INSERT INTO school_students (school_id, student_name, phone_number, assigned_exams) VALUES (?, ?, ?, ?)', [schoolId, trimmedName, cleanedPhone, assignedExams], (insertErr) => {
                                    if (insertErr) return res.status(500).json({ success: false, error: insertErr.message });
                                    res.json({ success: true, message: 'Umuyobozi yandikishije abanyeshuri kandi ibizamini byatangiwe.' });
                                });
                            }
                        });
                    });
                };

                applyUpdates();
            });
        });
    });

    router.patch('/students/:id', (req, res) => {
        if (!req.session || !req.session.isSchoolAuthenticated) return res.status(401).json({ success: false, error: 'Session expired.' });

        const studentId = parseInt(req.params.id, 10);
        const { studentName, phoneNumber, examCount } = req.body;
        const trimmedName = (studentName || '').trim();
        const cleanedPhone = (phoneNumber || '').toString().replace(/[^0-9+]/g, '').trim();
        const assignedExams = parseInt(examCount || '0', 10);
        if (!studentId || !trimmedName || !cleanedPhone || assignedExams <= 0) {
            return res.status(400).json({ success: false, error: 'Andika amazina, telefone, kandi ubaze exams 1+.' });
        }

        ensureSchoolStudentsTable((tableErr) => {
            if (tableErr) return res.status(500).json({ success: false, error: tableErr.message });
            // Fetch current assigned_exams for this student to compute delta
            db.query('SELECT assigned_exams FROM school_students WHERE id = ? AND school_id = ?', [studentId, req.session.schoolAccountId], (fErr, fRows) => {
                if (fErr) return res.status(500).json({ success: false, error: fErr.message });
                if (!fRows || fRows.length === 0) return res.status(404).json({ success: false, error: 'Student not found.' });

                const currentAssigned = parseInt(fRows[0].assigned_exams || 0, 10);
                const delta = assignedExams - currentAssigned;

                const finalizeUpdate = () => {
                    db.query('UPDATE school_students SET student_name = ?, phone_number = ?, assigned_exams = ? WHERE id = ? AND school_id = ?', [trimmedName, cleanedPhone, assignedExams, studentId, req.session.schoolAccountId], (err, result) => {
                        if (err) return res.status(500).json({ success: false, error: err.message });
                        if (!result || result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Student not found.' });
                        res.json({ success: true, message: 'Student record updated.' });
                    });
                };

                if (delta === 0) return finalizeUpdate();

                // If exams increased, allocate from school's payment_transactions
                if (delta > 0) {
                    const schoolId = req.session.schoolAccountId;
                    db.query('SELECT id, remaining_exams FROM payment_transactions WHERE school_id = ? AND status = ? AND remaining_exams > 0 ORDER BY id ASC', [schoolId, 'SUCCESS'], (payErr, paymentRows) => {
                        if (payErr) return res.status(500).json({ success: false, error: payErr.message });

                        let remainingNeeded = delta;
                        const updates = [];
                        let canAllocate = true;

                        paymentRows.forEach((row) => {
                            if (!canAllocate) return;
                            if (remainingNeeded <= 0) return;
                            if (row.remaining_exams >= remainingNeeded) {
                                updates.push({ id: row.id, remaining: row.remaining_exams - remainingNeeded });
                                remainingNeeded = 0;
                            } else {
                                updates.push({ id: row.id, remaining: 0 });
                                remainingNeeded -= row.remaining_exams;
                            }
                        });

                        if (remainingNeeded > 0) return res.status(400).json({ success: false, error: 'Ishuri rifite ibizamini bike cyane. Ntabwo bivuye ku isoko.' });

                        let pending = updates.length;
                        if (pending === 0) return finalizeUpdate();

                        updates.forEach((entry) => {
                            db.query('UPDATE payment_transactions SET remaining_exams = ? WHERE id = ?', [entry.remaining, entry.id], (uErr) => {
                                if (uErr) canAllocate = false;
                                pending -= 1;
                                if (pending === 0) {
                                    if (!canAllocate) return res.status(500).json({ success: false, error: 'Guhindura ibizamini byanze.' });
                                    return finalizeUpdate();
                                }
                            });
                        });
                    });
                    return;
                }

                // If exams decreased, return credits back to school's pool (add to most recent payment)
                if (delta < 0) {
                    const returnCount = Math.abs(delta);
                    const schoolId = req.session.schoolAccountId;
                    db.query('SELECT id, remaining_exams FROM payment_transactions WHERE school_id = ? AND status = ? ORDER BY id DESC LIMIT 1', [schoolId, 'SUCCESS'], (pErr, pRows) => {
                        if (pErr) return res.status(500).json({ success: false, error: pErr.message });
                        if (!pRows || pRows.length === 0) {
                            // No payment row to credit, just finalize update
                            return finalizeUpdate();
                        }
                        const target = pRows[0];
                        const newRemaining = (parseInt(target.remaining_exams || 0, 10) + returnCount);
                        db.query('UPDATE payment_transactions SET remaining_exams = ? WHERE id = ?', [newRemaining, target.id], (updErr) => {
                            if (updErr) return res.status(500).json({ success: false, error: updErr.message });
                            return finalizeUpdate();
                        });
                    });
                    return;
                }
            });
        });
    });

    router.patch('/students/:id/status', (req, res) => {
        if (!req.session || !req.session.isSchoolAuthenticated) return res.status(401).json({ success: false, error: 'Session expired.' });

        const studentId = parseInt(req.params.id, 10);
        const { status } = req.body;
        if (!studentId || !['ACTIVE', 'BLOCKED'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Status is invalid.' });
        }

        ensureSchoolStudentsTable((tableErr) => {
            if (tableErr) return res.status(500).json({ success: false, error: tableErr.message });
            db.query('UPDATE school_students SET status = ? WHERE id = ? AND school_id = ?', [status, studentId, req.session.schoolAccountId], (err, result) => {
                if (err) return res.status(500).json({ success: false, error: err.message });
                if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Student not found.' });
                res.json({ success: true, message: `Student status set to ${status}.` });
            });
        });
    });

    // GET students performance
    router.get('/students-performance', (req, res) => {
        if (!req.session || !req.session.isSchoolAuthenticated) return res.status(401).json({ success: false, error: 'Session expired.' });

        // Fetch school phone and all registered students' phone numbers, then return attempts for those phones
        const schoolId = req.session.schoolAccountId;
        db.query('SELECT phone_number FROM driving_schools WHERE id = ?', [schoolId], (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: 'Gushaka amakuru byanze.' });
            const schoolPhone = (rows && rows[0] && rows[0].phone_number) ? rows[0].phone_number : null;

            ensureSchoolStudentsTable((tableErr) => {
                if (tableErr) return res.status(500).json({ success: false, error: tableErr.message });

                db.query('SELECT id, student_name, phone_number FROM school_students WHERE school_id = ?', [schoolId], (sErr, students) => {
                    if (sErr) return res.status(500).json({ success: false, error: sErr.message });

                    const last9Set = new Set();
                    if (schoolPhone) last9Set.add(schoolPhone.slice(-9));
                    const studentMap = {};
                    (students || []).forEach(s => {
                        if (s.phone_number && s.phone_number.length >= 9) {
                            const l9 = s.phone_number.slice(-9);
                            last9Set.add(l9);
                            studentMap[l9] = studentMap[l9] || [];
                            studentMap[l9].push({ id: s.id, name: s.student_name });
                        }
                    });

                    const last9s = Array.from(last9Set).filter(Boolean);
                    if (last9s.length === 0) return res.json({ success: true, stats: { total: 0, passed: 0, passRate: 0, avgScore: 0, avgPct: 0, uniqueStudents: 0, dist: { excellent:0, good:0, average:0, poor:0 } }, data: [] });

                    const placeholders = last9s.map(() => '?').join(',');
                    db.query(
                        `SELECT id, student_name, phone_number, score, total_questions, correct_count, wrong_count, skipped_count, created_at FROM exam_attempts WHERE RIGHT(phone_number, 9) IN (${placeholders}) ORDER BY id DESC`,
                        last9s,
                        (e2, attempts) => {
                            if (e2) return res.status(500).json({ success: false, error: e2.message });

                            // Annotate attempts with matched student info when available
                            const enriched = (attempts || []).map(a => {
                                const l9 = a.phone_number.slice(-9);
                                const matched = studentMap[l9] && studentMap[l9][0] ? studentMap[l9][0] : null;
                                return Object.assign({}, a, { matchedStudent: matched });
                            });

                            const total = enriched.length;
                            const passed = enriched.filter(a => a.score >= Math.ceil((a.total_questions || 20) * 0.6)).length;
                            const avgScore = total > 0 ? parseFloat((enriched.reduce((s, a) => s + (a.score || 0), 0) / total).toFixed(1)) : 0;
                            const avgPct = total > 0 ? Math.round((enriched.reduce((s, a) => s + ((a.score / (a.total_questions || 20)) * 100 || 0), 0) / total)) : 0;
                            const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

                            const dist = { excellent: 0, good: 0, average: 0, poor: 0 };
                            enriched.forEach(a => {
                                const pct = (a.score / (a.total_questions || 20)) * 100;
                                if (pct >= 85) dist.excellent++;
                                else if (pct >= 70) dist.good++;
                                else if (pct >= 50) dist.average++;
                                else dist.poor++;
                            });

                            const uniqueStudents = [...new Set(enriched.map(a => a.phone_number.slice(-9)))].length;
                            res.json({ success: true, stats: { total, passed, passRate, avgScore, avgPct, uniqueStudents, dist }, data: enriched });
                        }
                    );
                });
            });
        });
    });

    // GET profile
    router.get('/profile', (req, res) => {
        if (!req.session || !req.session.isSchoolAuthenticated) return res.status(401).json({ success: false, error: 'Session expired.' });
        res.json({ success: true, schoolName: req.session.schoolAccountName, email: req.session.schoolAccountEmail });
    });

    // POST update profile
    router.post('/update-profile', (req, res) => {
        if (!req.session || !req.session.isSchoolAuthenticated) return res.status(401).json({ success: false, error: 'Session expired.' });

        const { schoolName, currentPassword, newPassword } = req.body;
        const schoolId = req.session.schoolAccountId;
        const trimmedName = schoolName ? schoolName.trim() : '';
        if (!trimmedName) return res.status(400).json({ success: false, error: 'Izina ry\'ishuri rirakenewe.' });

        db.query('SELECT id FROM driving_schools WHERE school_name = ? AND id != ?', [trimmedName, schoolId], (err, rows) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            if (rows.length > 0) return res.status(409).json({ success: false, error: 'Izina ry\'ishuri rirahari.' });

            if (newPassword && newPassword.trim().length > 0) {
                if (newPassword.trim().length < 6) return res.status(400).json({ success: false, error: 'Password nshya igomba kuba ifite inyandiko 6+.' });
                if (!currentPassword) return res.status(400).json({ success: false, error: 'Injiza password ya kera.' });

                db.query('SELECT password_hash FROM driving_schools WHERE id = ?', [schoolId], (e2, r2) => {
                    if (e2 || !r2.length) return res.status(500).json({ success: false, error: 'Gushaka amakuru byanze.' });
                    bcrypt.compare(currentPassword.trim(), r2[0].password_hash, (cmpErr, match) => {
                        if (cmpErr || !match) return res.status(401).json({ success: false, error: 'Password ya kera ntabwo ari yo.' });
                        bcrypt.hash(newPassword.trim(), BCRYPT_ROUNDS, (hashErr, hash) => {
                            if (hashErr) return res.status(500).json({ success: false, error: 'Encryption error.' });
                            db.query('UPDATE driving_schools SET school_name = ?, password_hash = ? WHERE id = ?', [trimmedName, hash, schoolId], (e3) => {
                                if (e3) return res.status(500).json({ success: false, error: e3.message });
                                req.session.schoolAccountName = trimmedName;
                                res.json({ success: true, message: 'Profil na password byahinduwe neza!' });
                            });
                        });
                    });
                });
            } else {
                db.query('UPDATE driving_schools SET school_name = ? WHERE id = ?', [trimmedName, schoolId], (e2) => {
                    if (e2) return res.status(500).json({ success: false, error: e2.message });
                    req.session.schoolAccountName = trimmedName;
                    res.json({ success: true, message: 'Izina ry\'ishuri ryahinduwe neza!' });
                });
            }
        });
    });

    // GET all schools (for viewer/admin reports)
    router.get('/list-all', (req, res) => {
        db.query('SELECT id, school_name, phone_number, email, is_verified, created_at FROM driving_schools ORDER BY id DESC', (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        });
    });

    // POST logout
    router.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ success: false, error: 'Logout failed.' });
            res.json({ success: true, redirect: '/school-auth' });
        });
    });

    // GET logout (compatibility)
    router.get('/logout', (req, res) => {
        req.session.destroy(() => res.redirect('/school-auth'));
    });

    return router;
};
