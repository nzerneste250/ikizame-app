const express = require('express');
const bcrypt  = require('bcrypt');
const axios   = require('axios');
const BCRYPT_ROUNDS = 10;
const { requireAdminLogin, getAdminSessionState } = require('../middleware/auth');

const PAYPACK_BASE   = 'https://payments.paypack.rw/api';
const PAYPACK_CLIENT = process.env.PAYPACK_CLIENT_ID;
const PAYPACK_SECRET = process.env.PAYPACK_CLIENT_SECRET;
let _cachedToken = null, _tokenExpires = 0;
async function getAdminToken() {
    if (_cachedToken && Date.now() < _tokenExpires - 30000) return _cachedToken;
    const { data } = await axios.post(`${PAYPACK_BASE}/auth/agents/authorize`,
        { client_id: PAYPACK_CLIENT, client_secret: PAYPACK_SECRET },
        { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, timeout: 10000 }
    );
    _cachedToken = data.access; _tokenExpires = data.expires * 1000;
    return _cachedToken;
}

module.exports = (db, loginLimiter) => {
    const router = express.Router();

    // In-memory OTP store: email -> { otp, expires }
    const otpStore = new Map();

    // POST admin login — uses email instead of username
    router.post('/auth', loginLimiter, (req, res) => {
        const { email, password } = req.body;
        if (!email || !password)
            return res.redirect('/admin-login?error=missing');

        db.query('SELECT * FROM portal_admins WHERE email = ? OR username = ?', [email, email], (err, results) => {
            if (err) return res.status(500).send('Database Auth Error: ' + err.message);
            if (!results || results.length === 0)
                return res.redirect('/admin-login?error=invalid');

            const admin = results[0];
            const storedPassword = admin.password;
            const isHashed = storedPassword && storedPassword.startsWith('$2');

            const handleMatch = (match) => {
                if (!match) return res.redirect('/admin-login?error=invalid');
                if (!isHashed) {
                    bcrypt.hash(storedPassword, BCRYPT_ROUNDS, (hashErr, hash) => {
                        if (!hashErr) db.query('UPDATE portal_admins SET password = ? WHERE id = ?', [hash, admin.id], () => {});
                    });
                }
                req.session.isAdminAuthenticated = true;
                req.session.adminRole            = admin.role || 'superadmin';
                req.session.adminEmail           = admin.email || admin.username;
                req.session.adminId              = admin.id;
                req.session.mustChangePassword   = !!admin.must_change_password;
                req.session.lastAdminActivity    = Date.now();
                if (req.session.mustChangePassword) return res.redirect('/change-password');
                if (req.session.adminRole === 'viewer') return res.redirect('/viewer-dashboard');
                res.redirect('/dashboard');
            };

            if (isHashed) bcrypt.compare(password, storedPassword, (cmpErr, match) => handleMatch(!cmpErr && match));
            else handleMatch(password === storedPassword);
        });
    });

    // POST forgot password — send OTP to admin email
    router.post('/forgot-password', loginLimiter, (req, res) => {
        const { email } = req.body;
        if (!email) return res.json({ ok: false, error: 'Email irakenewe.' });

        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
        if (email.toLowerCase() !== adminEmail.toLowerCase())
            return res.json({ ok: false, error: 'Iyi email ntabwo izwi nk\'iy\'umunyamabanga.' });

        const otp     = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 10 * 60 * 1000; // 10 min
        otpStore.set(email.toLowerCase(), { otp, expires });

        const transport = req.app.get('emailTransport');
        if (!transport) return res.json({ ok: false, error: 'Email service ntabwo itangiye.' });

        transport.sendMail({
            from: `"IKIZAME Security" <${process.env.SMTP_USER}>`,
            to:   adminEmail,
            subject: '🔐 IKIZAME Admin — OTP Code yo Guhindura Password',
            html: `<div style="font-family:Inter,sans-serif;max-width:420px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
                <div style="background:#0b698b;padding:16px 20px;border-radius:8px;margin-bottom:20px;text-align:center;">
                    <h2 style="color:#fff;margin:0;font-size:20px;">🔐 IKIZAME Admin</h2>
                    <p style="color:#bae6fd;margin:4px 0 0;font-size:13px;">Password Reset OTP</p>
                </div>
                <p style="color:#475569;font-size:14px;margin-bottom:16px;">Warasabye guhindura password. Koresha OTP ikurikira:</p>
                <div style="background:#0f172a;color:#38bdf8;font-size:36px;font-weight:900;letter-spacing:10px;text-align:center;padding:20px;border-radius:8px;margin-bottom:16px;font-family:monospace;">${otp}</div>
                <p style="color:#94a3b8;font-size:12px;">Iyi code izarangira mu minota 10. Niba utayisabye, irengageze.</p>
            </div>`
        }, (err) => {
            if (err) return res.json({ ok: false, error: 'Kohereza email byanze. Gerageza nanone.' });
            res.json({ ok: true });
        });
    });

    // POST verify OTP + reset password
    router.post('/reset-password', loginLimiter, (req, res) => {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword)
            return res.json({ ok: false, error: 'Amakuru yose arakenewe.' });
        if (newPassword.length < 8)
            return res.json({ ok: false, error: 'Password igomba kuba nibura inyuguti 8.' });

        const record = otpStore.get(email.toLowerCase());
        if (!record) return res.json({ ok: false, error: 'Nta OTP yoherejwe kuri iyi email.' });
        if (Date.now() > record.expires) {
            otpStore.delete(email.toLowerCase());
            return res.json({ ok: false, error: 'OTP yarangiye. Saba indi.' });
        }
        if (record.otp !== otp.trim())
            return res.json({ ok: false, error: 'OTP ntabwo ari yo. Gerageza nanone.' });

        otpStore.delete(email.toLowerCase());

        bcrypt.hash(newPassword, BCRYPT_ROUNDS, (hashErr, hash) => {
            if (hashErr) return res.json({ ok: false, error: 'Hashage yabuze.' });
            const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
            db.query('UPDATE portal_admins SET password = ? WHERE email = ? OR username = ?',
                [hash, adminEmail, adminEmail],
                (err) => {
                    if (err) return res.json({ ok: false, error: err.message });
                    res.json({ ok: true });
                }
            );
        });
    });

    // POST change password (first login)
    router.post('/change-password', (req, res) => {
        if (!getAdminSessionState(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8)
            return res.json({ ok: false, error: 'Password igomba kuba nibura inyuguti 8.' });
        bcrypt.hash(newPassword, BCRYPT_ROUNDS, (hashErr, hash) => {
            if (hashErr) return res.json({ ok: false, error: 'Hash yabuze.' });
            db.query('UPDATE portal_admins SET password=?, must_change_password=0 WHERE id=?',
                [hash, req.session.adminId],
                (err) => {
                    if (err) return res.json({ ok: false, error: err.message });
                    req.session.mustChangePassword = false;
                    res.json({ ok: true, role: req.session.adminRole });
                }
            );
        });
    });

    // POST logout
    router.post('/logout', (req, res) => {
        req.session.destroy(() => res.json({ success: true }));
    });

    // GET logout
    router.get('/logout', (req, res) => {
        req.session.destroy(() => res.redirect('/admin-login'));
    });

    // GET check session liveness
    router.get('/check-session', (req, res) => {
        if (getAdminSessionState(req)) return res.json({ ok: true, role: req.session.adminRole || 'superadmin', email: req.session.adminEmail || '' });
        res.status(401).json({ ok: false });
    });

    // ── USER MANAGEMENT (superadmin only) ────────────────────────────────
    function requireSuperAdmin(req, res, next) {
        if (!req.session || !req.session.isAdminAuthenticated) return res.status(401).json({ error: 'Unauthorized' });
        if ((req.session.adminRole || 'superadmin') !== 'superadmin') return res.status(403).json({ error: 'Superadmin only.' });
        req.session.lastAdminActivity = Date.now();
        next();
    }

    // GET list all admin users
    router.get('/users', requireSuperAdmin, (req, res) => {
        db.query('SELECT id, username, email, role, COALESCE(is_active, 1) AS is_active, created_at FROM portal_admins ORDER BY id ASC', (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });

    // POST create new admin user — generates temp password, sends welcome email
    router.post('/users', requireSuperAdmin, (req, res) => {
        const { email, role } = req.body;
        if (!email) return res.json({ ok: false, error: 'Email irakenewe.' });
        const userRole = role === 'viewer' ? 'viewer' : 'superadmin';

        db.query('SELECT id FROM portal_admins WHERE email = ?', [email], (err, rows) => {
            if (err) return res.json({ ok: false, error: err.message });
            if (rows.length > 0) return res.json({ ok: false, error: 'Iyi email isanzwe ikoreshwa.' });

            // Generate random temp password
            const tempPass = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!';

            bcrypt.hash(tempPass, BCRYPT_ROUNDS, (hashErr, hash) => {
                if (hashErr) return res.json({ ok: false, error: 'Hash yabuze.' });
                db.query(
                    'INSERT INTO portal_admins (username, email, password, role, must_change_password) VALUES (?, ?, ?, ?, 1)',
                    [email.split('@')[0], email, hash, userRole],
                    (err2) => {
                        if (err2) return res.json({ ok: false, error: err2.message });

                        // Send welcome email with temp password
                        const transport = req.app.get('emailTransport');
                        if (transport) {
                            transport.sendMail({
                                from: `"IKIZAME Admin" <${process.env.SMTP_USER}>`,
                                to: email,
                                subject: '🎉 IKIZAME — Your Admin Account Has Been Created',
                                html: `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
                                    <div style="background:#0b698b;padding:20px;border-radius:8px;margin-bottom:20px;text-align:center;">
                                        <h2 style="color:#fff;margin:0;font-size:20px;">🎉 Welcome to IKIZAME</h2>
                                        <p style="color:#bae6fd;margin:4px 0 0;font-size:13px;">Your ${userRole === 'viewer' ? 'Viewer (Read-Only)' : 'Super Admin'} account is ready</p>
                                    </div>
                                    <p style="color:#475569;font-size:14px;margin-bottom:16px;">Your account has been created. Use the credentials below to log in:</p>
                                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;">
                                        <div style="margin-bottom:10px;"><span style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Email</span><br><span style="font-size:15px;font-weight:700;color:#0f172a;">${email}</span></div>
                                        <div><span style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Temporary Password</span><br><span style="font-size:20px;font-weight:900;color:#0b698b;font-family:monospace;letter-spacing:2px;">${tempPass}</span></div>
                                    </div>
                                    <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:16px;">
                                        <p style="color:#92400e;font-size:13px;font-weight:600;margin:0;">⚠️ You will be required to create a new strong password on your first login.</p>
                                    </div>
                                    <a href="https://ikizame.rw/admin-login" style="display:block;background:#0b698b;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Login to IKIZAME →</a>
                                    <p style="color:#94a3b8;font-size:11px;margin-top:16px;text-align:center;">If you did not expect this email, please ignore it.</p>
                                </div>`
                            }, () => {});
                        }
                        res.json({ ok: true, email, role: userRole });
                    }
                );
            });
        });
    });

    // PATCH edit user email/role
    router.patch('/users/:id', requireSuperAdmin, (req, res) => {
        const id = Number(req.params.id);
        const { email, role } = req.body;
        if (!email && !role) return res.json({ ok: false, error: 'Nta makuru yoherejwe.' });
        db.query('SELECT email FROM portal_admins WHERE id = ?', [id], (err, rows) => {
            if (err || !rows.length) return res.json({ ok: false, error: 'User ntabwo abonetse.' });
            const updates = [];
            const vals = [];
            if (email) { updates.push('email=?'); vals.push(email); }
            if (role)  { updates.push('role=?');  vals.push(role === 'viewer' ? 'viewer' : 'superadmin'); }
            vals.push(id);
            db.query(`UPDATE portal_admins SET ${updates.join(',')} WHERE id=?`, vals, (err2) => {
                if (err2) return res.json({ ok: false, error: err2.message });
                res.json({ ok: true });
            });
        });
    });

    // PATCH toggle user active status
    router.patch('/users/:id/status', requireSuperAdmin, (req, res) => {
        const id = Number(req.params.id);
        const { active } = req.body;
        db.query('SELECT email FROM portal_admins WHERE id = ?', [id], (err, rows) => {
            if (err || !rows.length) return res.json({ ok: false, error: 'User ntabwo abonetse.' });
            if (rows[0].email === req.session.adminEmail) return res.json({ ok: false, error: 'Ntushobora guhindura konti yawe.' });
            db.query('UPDATE portal_admins SET is_active=? WHERE id=?', [active ? 1 : 0, id], (err2) => {
                if (err2) return res.json({ ok: false, error: err2.message });
                res.json({ ok: true });
            });
        });
    });

    // DELETE admin user
    router.delete('/users/:id', requireSuperAdmin, (req, res) => {
        const id = Number(req.params.id);
        db.query('SELECT email FROM portal_admins WHERE id = ?', [id], (err, rows) => {
            if (err || !rows.length) return res.json({ ok: false, error: 'User ntabwo abonetse.' });
            if (rows[0].email === req.session.adminEmail) return res.json({ ok: false, error: 'Ntushobora gusiba konti yawe.' });
            db.query('DELETE FROM portal_admins WHERE id = ?', [id], (err2) => {
                if (err2) return res.json({ ok: false, error: err2.message });
                res.json({ ok: true });
            });
        });
    });

    // GET viewer dashboard data — payments + schools summary (read-only)
    router.get('/viewer-data', requireAdminLogin, (req, res) => {
        db.query(`
            SELECT pt.id, pt.phone_number, pt.amount, pt.plan_name, pt.status,
                   pt.total_exams, pt.remaining_exams, pt.created_at,
                   ds.school_name
            FROM payment_transactions pt
            LEFT JOIN driving_schools ds ON pt.school_id = ds.id
            WHERE pt.status = 'SUCCESS'
            ORDER BY pt.id DESC LIMIT 500`,
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                db.query(`SELECT COUNT(*) AS total_tx, COALESCE(SUM(amount),0) AS total_revenue,
                          COALESCE(SUM(total_exams),0) AS total_exams
                          FROM payment_transactions WHERE status='SUCCESS'`, (e2, sum) => {
                    db.query(`SELECT COUNT(*) AS total_schools FROM driving_schools WHERE is_verified=1`, (e3, sch) => {
                        res.json({
                            transactions: rows,
                            summary: sum ? sum[0] : {},
                            totalSchools: sch ? sch[0].total_schools : 0
                        });
                    });
                });
            }
        );
    });

    // GET all payment transactions
    router.get('/payment-transactions', requireAdminLogin, (req, res) => {
        db.query(
            `SELECT id, phone_number, amount, plan_name, reference_id, rwandapay_tx_id, status, total_exams, remaining_exams, price_per_exam, created_at FROM payment_transactions ORDER BY id DESC LIMIT 500`,
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows);
            }
        );
    });

    // GET payments summary
    router.get('/payments-summary', requireAdminLogin, (req, res) => {
        db.query(
            `SELECT COUNT(*) AS totalPayments, COALESCE(SUM(amount), 0) AS totalRevenue, COALESCE(SUM(remaining_exams), 0) AS totalExamCredits FROM payment_transactions WHERE status = 'SUCCESS'`,
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const r = rows[0] || {};
                res.json({
                    totalPayments:    r.totalPayments    || 0,
                    totalRevenue:     r.totalRevenue     || 0,
                    totalExamCredits: r.totalExamCredits || 0
                });
            }
        );
    });

    // POST update a payment transaction
    router.post('/payment-transaction/:id', requireAdminLogin, (req, res) => {
        const transactionId   = Number(req.params.id);
        const total_exams     = Number(req.body.total_exams     || 0);
        const remaining_exams = Number(req.body.remaining_exams || 0);

        if (!transactionId || isNaN(total_exams) || isNaN(remaining_exams) || total_exams < 0 || remaining_exams < 0)
            return res.status(400).json({ success: false, error: 'Invalid numeric values.' });
        if (remaining_exams > total_exams)
            return res.status(400).json({ success: false, error: 'Remaining cannot exceed total.' });

        const amount        = calcTieredAmount(total_exams);
        const plan_name     = planName(total_exams);
        const price_per_exam = pricePerExam(total_exams);

        db.query(
            `UPDATE payment_transactions SET amount=?, total_exams=?, remaining_exams=?, plan_name=?, price_per_exam=? WHERE id=?`,
            [amount, total_exams, remaining_exams, plan_name, price_per_exam, transactionId],
            (err, result) => {
                if (err) return res.status(500).json({ success: false, error: err.message });
                if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Transaction not found.' });
                res.json({ success: true });
            }
        );
    });

    // GET grouped students list
    router.get('/students', requireAdminLogin, (req, res) => {
        db.query(`
            SELECT phone_number,
                (SELECT student_name FROM exam_attempts ea2 WHERE ea2.phone_number = ea.phone_number ORDER BY ea2.id DESC LIMIT 1) AS student_name,
                COUNT(*) AS totalExams,
                AVG(score) AS averageScore,
                MAX(created_at) AS lastAttemptDate
            FROM exam_attempts ea
            GROUP BY phone_number
            ORDER BY lastAttemptDate DESC`,
            (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(results.map(r => ({
                    phoneNumber:     r.phone_number,
                    studentName:     r.student_name,
                    totalExams:      r.totalExams,
                    averageScore:    r.averageScore ? parseFloat(r.averageScore).toFixed(1) : '0.0',
                    lastAttemptDate: r.lastAttemptDate
                })));
            }
        );
    });

    // GET all attempts for a single student
    router.get('/student-attempts/:phone', requireAdminLogin, (req, res) => {
        db.query(
            `SELECT id, score, total_questions, created_at FROM exam_attempts WHERE phone_number = ? ORDER BY created_at DESC`,
            [req.params.phone],
            (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(results);
            }
        );
    });

    // GET performance stats + tricky questions
    router.get('/performance-stats', requireAdminLogin, (req, res) => {
        db.query(
            `SELECT COUNT(*) as totalAttempts, SUM(CASE WHEN score >= 12 THEN 1 ELSE 0 END) as passedCount, AVG(score) as averageScore FROM exam_attempts`,
            (err, overviewResults) => {
                if (err) return res.status(500).json({ error: err.message });

                const stats        = overviewResults[0] || {};
                const totalAttempts = Number(stats.totalAttempts || 0);
                const passed        = Number(stats.passedCount   || 0);
                const passRate      = totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0;
                const avgScore      = stats.averageScore != null ? parseFloat(stats.averageScore).toFixed(1) : '0.0';

                db.query(`SELECT student_answers, exam_questions_snapshot, question_ids_ordered FROM exam_attempts`, (detailErr, detailRows) => {
                    if (detailErr) return res.json({ totalAttempts, total: totalAttempts, passed, passRate, avgScore, trickyQuestions: [] });

                    const failMap = new Map();
                    const rowsNeedingFetch = [];

                    detailRows.forEach(row => {
                        let answers = {}, questions = [];
                        try { answers   = typeof row.student_answers         === 'string' ? JSON.parse(row.student_answers)         : (row.student_answers         || {}); } catch (e) { answers   = {}; }
                        try { questions = typeof row.exam_questions_snapshot === 'string' ? JSON.parse(row.exam_questions_snapshot) : (row.exam_questions_snapshot || []); } catch (e) { questions = []; }

                        if ((!Array.isArray(questions) || questions.length === 0) && row.question_ids_ordered) {
                            const ids = row.question_ids_ordered.split(',').map(id => parseInt(id.trim(), 10)).filter(Boolean);
                            if (ids.length > 0) { rowsNeedingFetch.push({ ids, answers }); return; }
                        }

                        questions.forEach(q => {
                            if (!q || !q.id) return;
                            const given = answers.hasOwnProperty(`question_${q.id}`) ? answers[`question_${q.id}`] : null;
                            if (given !== null && String(given) !== String(q.correct_option)) {
                                const item = failMap.get(q.id) || { question: q.question || `Question ${q.id}`, failCount: 0 };
                                item.failCount++;
                                failMap.set(q.id, item);
                            }
                        });
                    });

                    const finish = () => {
                        const trickyQuestions = Array.from(failMap.values()).sort((a, b) => b.failCount - a.failCount).slice(0, 5);
                        res.json({ totalAttempts, total: totalAttempts, passed, passRate, avgScore, trickyQuestions });
                    };

                    if (rowsNeedingFetch.length === 0) return finish();

                    const allIds = [...new Set(rowsNeedingFetch.flatMap(r => r.ids))];
                    if (allIds.length === 0) return finish();

                    db.query(
                        `SELECT id, question, correct_option FROM exams WHERE id IN (${allIds.map(() => '?').join(',')})`,
                        allIds,
                        (examErr, examRows) => {
                            if (!examErr) {
                                const examMap = {};
                                examRows.forEach(q => { examMap[q.id] = q; });
                                rowsNeedingFetch.forEach(row => {
                                    row.ids.forEach(id => {
                                        const q = examMap[id];
                                        if (!q) return;
                                        const given = row.answers.hasOwnProperty(`question_${q.id}`) ? row.answers[`question_${q.id}`] : null;
                                        if (given !== null && String(given) !== String(q.correct_option)) {
                                            const item = failMap.get(q.id) || { question: q.question || `Question ${q.id}`, failCount: 0 };
                                            item.failCount++;
                                            failMap.set(q.id, item);
                                        }
                                    });
                                });
                            }
                            finish();
                        }
                    );
                });
            }
        );
    });

    // GET IP address list per day (last 30 days)
    router.get('/visitor-ip-daily', requireAdminLogin, (req, res) => {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        db.query(
            `SELECT ip_address, visited_at, visit_count
             FROM site_visitors
             WHERE visit_date = ?
             ORDER BY visited_at DESC`,
            [date],
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows);
            }
        );
    });

    // GET available visit dates (last 30 days)
    router.get('/visitor-dates', requireAdminLogin, (req, res) => {
        db.query(
            `SELECT DISTINCT DATE_FORMAT(visit_date, '%Y-%m-%d') AS day
             FROM site_visitors
             WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
             ORDER BY day DESC`,
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows.map(r => r.day));
            }
        );
    });

    // GET chart data — daily aggregates for last 30 days
    router.get('/visitor-chart', requireAdminLogin, (req, res) => {
        db.query(`
            SELECT DATE_FORMAT(visit_date, '%Y-%m-%d') AS day,
                   COUNT(DISTINCT ip_address) AS unique_visitors,
                   SUM(visit_count) AS total_visits
            FROM site_visitors
            WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            GROUP BY day ORDER BY day ASC`,
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows);
            }
        );
    });

    // GET daily visitor breakdown for last 30 days with IP list
    router.get('/visitor-daily', requireAdminLogin, (req, res) => {
        db.query(`
            SELECT DATE_FORMAT(visit_date, '%Y-%m-%d') AS day,
                   ip_address,
                   visited_at,
                   visit_count
            FROM site_visitors
            WHERE visit_date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            ORDER BY visit_date DESC, visited_at ASC`,
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                // group by day
                const map = {};
                rows.forEach(r => {
                    if (!map[r.day]) map[r.day] = { day: r.day, ips: [] };
                    map[r.day].ips.push({
                        ip: r.ip_address,
                        time: r.visited_at,
                        count: r.visit_count
                    });
                });
                res.json(Object.values(map));
            }
        );
    });

    // GET visitor count (day, week, month, year, total)
    router.get('/visitor-count', requireAdminLogin, (req, res) => {
        db.query(`
            SELECT
                visit_date,
                ip_address
            FROM site_visitors`,
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const now   = new Date();
                const today = now.toISOString().slice(0, 10);
                const d = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString().slice(0,10); };
                const week  = d(6);
                const month = d(29);
                const year  = String(now.getFullYear());

                const sets = { today: new Set(), week: new Set(), month: new Set(), year: new Set(), total: new Set() };
                rows.forEach(r => {
                    const day = r.visit_date instanceof Date
                        ? r.visit_date.toISOString().slice(0,10)
                        : String(r.visit_date).slice(0,10);
                    const ip = r.ip_address;
                    sets.total.add(ip);
                    if (day.startsWith(year))          sets.year.add(ip);
                    if (day >= month)                  sets.month.add(ip);
                    if (day >= week)                   sets.week.add(ip);
                    if (day === today)                 sets.today.add(ip);
                });
                res.json({
                    today: sets.today.size,
                    week:  sets.week.size,
                    month: sets.month.size,
                    year:  sets.year.size,
                    total: sets.total.size
                });
            }
        );
    });

    // GET system stats
    router.get('/system-stats', requireAdminLogin, (req, res) => {
        db.query(`
            SELECT
                (SELECT COUNT(*) FROM exams) AS totalQuestions,
                (SELECT COUNT(*) FROM exam_attempts) AS totalAttempts,
                (SELECT COUNT(DISTINCT phone_number) FROM exam_attempts) AS totalStudents,
                (SELECT COUNT(*) FROM driving_schools WHERE is_verified = 1) AS totalSchools,
                (SELECT COUNT(*) FROM learning_resources) AS totalResources,
                (SELECT COUNT(*) FROM payment_transactions WHERE status = 'SUCCESS') AS totalPayments,
                (SELECT COALESCE(SUM(amount),0) FROM payment_transactions WHERE status = 'SUCCESS') AS totalRevenue,
                (SELECT COUNT(*) FROM exam_attempts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS attemptsThisWeek,
                (SELECT COUNT(*) FROM exam_attempts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)) AS attemptsToday,
                (SELECT COALESCE(AVG(score),0) FROM exam_attempts) AS avgScore,
                (SELECT COUNT(*) FROM exam_attempts WHERE score >= 12) AS passedCount`,
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const r = rows[0];
                res.json({
                    totalQuestions:   r.totalQuestions   || 0,
                    totalAttempts:    r.totalAttempts    || 0,
                    totalStudents:    r.totalStudents    || 0,
                    totalSchools:     r.totalSchools     || 0,
                    totalResources:   r.totalResources   || 0,
                    totalPayments:    r.totalPayments    || 0,
                    totalRevenue:     r.totalRevenue     || 0,
                    attemptsThisWeek: r.attemptsThisWeek || 0,
                    attemptsToday:    r.attemptsToday    || 0,
                    avgScore:         parseFloat(r.avgScore || 0).toFixed(1),
                    passRate:         r.totalAttempts > 0 ? Math.round((r.passedCount / r.totalAttempts) * 100) : 0
                });
            }
        );
    });

    // GET official Paypack merchant transactions (confirmed/successful)
    router.get('/paypack-transactions', requireAdminLogin, async (req, res) => {
        try {
            const token = await getAdminToken();
            const offset = parseInt(req.query.offset) || 0;
            const limit  = parseInt(req.query.limit)  || 100;
            const { data } = await axios.get(
                `${PAYPACK_BASE}/transactions/list?offset=${offset}&limit=${limit}`,
                { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }, timeout: 15000 }
            );
            const list = Array.isArray(data?.transactions) ? data.transactions
                : Array.isArray(data) ? data : [];
            res.json({ transactions: list, total: data?.total || list.length });
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Paypack API error';
            res.status(502).json({ error: msg });
        }
    });

    // GET backup status — reads files from /var/backups/ikizame/Database/
    router.get('/backup-status', requireAdminLogin, (req, res) => {
        const fs = require('fs');
        const path = require('path');
        const backupDir = '/var/backups/ikizame/Database';
        try {
            const files = fs.readdirSync(backupDir)
                .filter(f => f.endsWith('.sql'))
                .map(f => {
                    const stat = fs.statSync(path.join(backupDir, f));
                    return { name: f, size: stat.size, date: stat.mtime };
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            res.json({ backups: files, total: files.length });
        } catch (e) {
            res.json({ backups: [], total: 0, error: e.message });
        }
    });

    return router;
};

// ── Pricing helpers (used by payment-transaction update) ──────────────────
function calcTieredAmount(qty) {
    qty = Number(qty) || 0;
    if (qty <= 0)  return 0;
    if (qty <= 9)  return qty * 100;
    if (qty <= 14) return 900  + (qty - 9)  * 80;
    if (qty <= 20) return 1300 + (qty - 14) * 70;
    return 1720 + (qty - 20) * 50;
}
function pricePerExam(qty) {
    qty = Number(qty) || 0;
    if (qty <= 0)  return 0;
    if (qty <= 9)  return 100;
    if (qty <= 14) return 80;
    if (qty <= 20) return 70;
    return 50;
}
function planName(qty) {
    qty = Number(qty) || 0;
    return qty > 0 ? `Personal Tiered Pass (${qty} Exams Package)` : 'Custom Payment';
}
