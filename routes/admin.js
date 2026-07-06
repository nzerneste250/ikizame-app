const express = require('express');
const bcrypt  = require('bcrypt');
const BCRYPT_ROUNDS = 10;
const { requireAdminLogin, getAdminSessionState } = require('../middleware/auth');

module.exports = (db, loginLimiter) => {
    const router = express.Router();

    // POST admin login (rate limited)
    router.post('/auth', loginLimiter, (req, res) => {
        const { username, password } = req.body;
        if (!username || !password)
            return res.send('<script>alert("Injiza username na password."); window.location.href="/admin-login";</script>');

        db.query('SELECT * FROM portal_admins WHERE username = ?', [username], (err, results) => {
            if (err) return res.status(500).send('Database Auth Error: ' + err.message);
            if (!results || results.length === 0)
                return res.send('<script>alert("Invalid Admin Credentials!"); window.location.href="/admin-login";</script>');

            const admin = results[0];
            const storedPassword = admin.password;
            const isHashed = storedPassword && storedPassword.startsWith('$2');

            const handleMatch = (match) => {
                if (!match)
                    return res.send('<script>alert("Invalid Admin Credentials!"); window.location.href="/admin-login";</script>');

                // Auto-upgrade plain-text password to bcrypt on first login
                if (!isHashed) {
                    bcrypt.hash(storedPassword, BCRYPT_ROUNDS, (hashErr, hash) => {
                        if (!hashErr) db.query('UPDATE portal_admins SET password = ? WHERE id = ?', [hash, admin.id], () => {});
                    });
                }

                req.session.isAdminAuthenticated = true;
                req.session.lastAdminActivity    = Date.now();
                res.redirect('/dashboard');
            };

            if (isHashed) bcrypt.compare(password, storedPassword, (cmpErr, match) => handleMatch(!cmpErr && match));
            else handleMatch(password === storedPassword);
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
        if (getAdminSessionState(req)) return res.json({ ok: true });
        res.status(401).json({ ok: false });
    });

    // GET all payment transactions
    router.get('/payment-transactions', requireAdminLogin, (req, res) => {
        db.query(
            `SELECT id, phone_number, amount, plan_name, reference_id, status, total_exams, remaining_exams, price_per_exam, created_at FROM payment_transactions ORDER BY created_at DESC`,
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

    // GET daily visitor breakdown for last 30 days
    router.get('/visitor-daily', requireAdminLogin, (req, res) => {
        db.query(`
            SELECT DATE_FORMAT(visited_at, '%Y-%m-%d') AS day,
                   COUNT(DISTINCT ip_address) AS unique_visitors,
                   SUM(visit_count) AS total_visits
            FROM site_visitors
            WHERE visited_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            GROUP BY day ORDER BY day ASC`,
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows);
            }
        );
    });

    // GET visitor count (day, week, month, year, total)
    router.get('/visitor-count', requireAdminLogin, (req, res) => {
        db.query(`
            SELECT
                (SELECT COUNT(DISTINCT ip_address) FROM site_visitors WHERE DATE(visited_at) = CURDATE()) AS today,
                (SELECT COUNT(DISTINCT ip_address) FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS week,
                (SELECT COUNT(DISTINCT ip_address) FROM site_visitors WHERE visited_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS month,
                (SELECT COUNT(DISTINCT ip_address) FROM site_visitors WHERE YEAR(visited_at) = YEAR(NOW())) AS year,
                (SELECT COUNT(DISTINCT ip_address) FROM site_visitors) AS total`,
            (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                const r = rows[0];
                res.json({
                    today: Number(r.today) || 0,
                    week:  Number(r.week)  || 0,
                    month: Number(r.month) || 0,
                    year:  Number(r.year)  || 0,
                    total: Number(r.total) || 0
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
