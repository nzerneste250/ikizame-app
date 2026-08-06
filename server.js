// ==========================================================================
// IKIZAME SERVER
// ==========================================================================
require('dotenv').config();

// Force live PayPack processing unless explicitly overridden in code paths.
if (process.env.PAYPACK_TEST_MODE === 'true') {
    console.warn('⚠️ PAYPACK_TEST_MODE=true detected; forcing live PayPack mode for payments.');
}
process.env.PAYPACK_TEST_MODE = 'false';

const express     = require('express');
const mysql       = require('mysql2');
const path        = require('path');
const fs          = require('fs');
const session     = require('express-session');
const nodemailer  = require('nodemailer');
const rateLimit   = require('express-rate-limit');
const compression = require('compression');
const helmet      = require('helmet');

const isProduction = process.env.NODE_ENV === 'production';

// ── DATABASE CONFIG ───────────────────────────────────────────────────────
const dbConfig = isProduction ? {
    host:               process.env.PROD_DB_HOST     || 'localhost',
    user:               process.env.PROD_DB_USER,
    password:           process.env.PROD_DB_PASSWORD,
    database:           process.env.PROD_DB_NAME,
    port:               parseInt(process.env.PROD_DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit:    5,
    queueLimit:         0,
    connectTimeout:     20000
} : {
    host:               process.env.LOCAL_DB_HOST     || 'localhost',
    user:               process.env.LOCAL_DB_USER     || 'root',
    password:           process.env.LOCAL_DB_PASSWORD || '',
    database:           process.env.LOCAL_DB_NAME     || 'driving_db',
    port:               parseInt(process.env.LOCAL_DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
};

const app = express();

// ── TRUST PROXY (required on Render) ─────────────────────────────────────
app.set('trust proxy', 1);
// ── FORCE NON-WWW CANONICAL DOMAIN ────────────────────────────────────────
app.use((req, res, next) => {
  const host = req.headers.host || '';
  if (host.toLowerCase().startsWith('www.')) {
    return res.redirect(301, `https://ikizame.rw${req.originalUrl}`);
  }
  next();
});
// ── SECURITY & PERFORMANCE ────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true }));

// ── RATE LIMITERS ─────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { success: false, error: "Gerageza nyuma y'iminota 15." },
    standardHeaders: true,
    legacyHeaders: false
});
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: "Ugerageje kenshi. Gerageza nyuma y'iminota 15." },
    standardHeaders: true,
    legacyHeaders: false
});

// ── STAGING ACCESS GATE (disabled in production) ──────────────────────────
const { restrictAccessToAuthorizedUsers, getAdminSessionState, redirectToAdminLogin } = require('./middleware/auth');
const { renderPublicPage } = require('./helpers/publicPageRenderer');

if (!isProduction) {
    app.use((req, res, next) => {
        if (req.path.startsWith('/assets/')) return next();
        if (req.path.startsWith('/school-') || req.path.startsWith('/api/school/')) return next();
        if (req.path === '/about' || req.path === '/terms') return next();
        return restrictAccessToAuthorizedUsers(req, res, next);
    });
}

// ── DATABASE POOL ─────────────────────────────────────────────────────────
console.log(`ℹ️  ${isProduction ? 'Production' : 'Local'} environment — connecting to [${dbConfig.host}]...`);

const db = mysql.createPool(dbConfig);

db.getConnection((err, conn) => {
    if (err) {
        console.error('❌ Database pool connection failure:', err.code, err.message);
        sendErrorAlert('Database Connection Failed', `Code: ${err.code}\n${err.message}`);
        return;
    }
    console.log(`✅ Database pool ready on [${dbConfig.host}]`);
    conn.query(`ALTER TABLE portal_admins ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1`, (e) => {
        if (e) console.warn('⚠️  is_active migration skipped:', e.message);
        else   console.log('✅ portal_admins.is_active column ready');
    });
    conn.release();
});

// ── SESSION STORE ────────────────────────────────────────────────
let sessionStore;
try {
    const MySQLStore = require('express-mysql-session')(session);
    sessionStore = new MySQLStore({
        expiration:          4 * 60 * 60 * 1000,
        createDatabaseTable: false,
        connectionLimit:     2,
        endConnectionOnClose: true
    }, db.promise());
    console.log('✅ MySQL session store initialized');
} catch (storeErr) {
    console.warn('⚠️ Falling back to in-memory session store:', storeErr.message);
    sessionStore = new session.MemoryStore();
}

app.use(session({
    secret:            process.env.SESSION_SECRET || 'fallback_dev_secret_change_me',
    resave:            false,
    saveUninitialized: false,
    store:             sessionStore,
    cookie: {
        maxAge:   4 * 60 * 60 * 1000,
        httpOnly: true,
        secure:   isProduction,
        sameSite: 'lax'
    }
}));

// ── SMTP EMAIL TRANSPORT ──────────────────────────────────────────────────
const emailTransport = nodemailer.createTransport({
    host:       'smtp.gmail.com',
    port:       587,
    secure:     false,
    auth:       { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls:        { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout:   10000,
    socketTimeout:     20000
});

emailTransport.verify((err) => {
    if (err) console.error('⚠️  SMTP configuration failure:', err.message);
    else     console.log('✅ SMTP transport ready on port 587 TLS');
});

// ── VISITOR TRACKING (unique per IP per day, visit_count increments on refresh) ──
const PUBLIC_PAGES = ['/', '/index', '/ifashanyigisho', '/ibiciro', '/ubufasha', '/amanota', '/exam-result', '/school-auth', '/exam', '/exam-score'];
const EXCLUDED_IPS = ['127.0.0.1', '197.157.145.186'];
app.use((req, res, next) => {
    if (req.method === 'GET' && PUBLIC_PAGES.includes(req.path)) {
        const ip = (req.ip || req.connection.remoteAddress || 'unknown')
            .replace(/^::ffff:/i, '').replace(/^::1$/, '127.0.0.1').trim();
        if (!EXCLUDED_IPS.includes(ip)) {
            db.query(
                `INSERT INTO site_visitors (ip_address, visit_date, visited_at, visit_count)
                 VALUES (?, CURDATE(), NOW(), 1)
                 ON DUPLICATE KEY UPDATE visit_count = visit_count + 1`,
                [ip], () => {}
            );
        }
    }
    next();
});

// ── SEO ROUTES ───────────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sitemap.xml')));
app.get('/robots.txt',  (req, res) => res.sendFile(path.join(__dirname, 'public', 'robots.txt')));

function sendSchoolAwarePage(req, res, fileName) {
    const filePath = path.join(__dirname, 'public', fileName);
    fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) {
            console.error(`❌ Failed to load ${fileName}:`, err.message);
            return res.status(404).send('Page not found');
        }

        const schoolHeaderMarkup = `
            <header>
                <a href="/school-dashboard" class="navbar-brand-wrap">
                    <img src="assets/uploads/logo.png" alt="IKIZAME Logo">
                    <div class="navbar-brand">IKIZAME</div>
                </a>
                <nav>
                    <ul class="navbar-links">
                        <li><a href="/school-dashboard">Dashboard</a></li>
                        <li><a href="/school-profile"><i class="fa-solid fa-user-circle"></i> Profile</a></li>
                        <li><a href="#" class="logout-btn" onclick="handleSchoolLogout(event)"><i class="fa-solid fa-right-from-bracket"></i> Logout</a></li>
                    </ul>
                </nav>
                <div class="lang-badge">
                    <svg class="rw-flag-svg" viewBox="0 0 4 3"><rect width="4" height="1.1" y="0" fill="#1EB5E5"/><rect width="4" height="0.9" y="1.1" fill="#FAD201"/><rect width="4" height="0.9" y="2" fill="#20603D"/><circle cx="3.1" cy="0.55" r="0.28" fill="#FAD201"/></svg>
                    <span>Kinyarwanda</span>
                </div>
            </header>`;

        const withSchoolHeader = html.replace(/<header[^>]*>[\s\S]*?<\/header>/i, schoolHeaderMarkup);
        const withSchoolScript = withSchoolHeader.replace(
            '</body>',
            `<script>
                async function handleSchoolLogout(event) {
                    event.preventDefault();
                    try {
                        const res = await fetch('/api/school/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
                        if (res.ok) {
                            window.location.replace('/school-auth');
                            return;
                        }
                    } catch (err) {}
                    window.location.replace('/school-auth');
                }
            </script></body>`
        );

        res.send(withSchoolScript);
    });
}

// ── PAGE ROUTES ───────────────────────────────────────────────────────────
app.get('/',               (req, res) => renderPublicPage('index.html', res));
app.get('/index',          (req, res) => renderPublicPage('index.html', res));
app.get('/admin-login',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));
app.get('/ifashanyigisho', (req, res) => res.sendFile(path.join(__dirname, 'public', 'ifashanyigisho.html')));
app.get('/ibiciro',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'ibiciro.html')));
app.get('/ubufasha',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'ubufasha.html')));
app.get('/amanota',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'amanota.html')));
app.get('/exam-result',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'exam-result.html')));
app.get('/resource-download', (req, res) => res.sendFile(path.join(__dirname, 'public', 'resource-download.html')));
app.get('/school-auth',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'school-auth.html')));
app.get('/about', (req, res) => renderPublicPage('about.html', res));
app.get('/terms', (req, res) => renderPublicPage('terms.html', res));

// School-specific static copies of About/Terms used inside the school portal
app.get('/about-school', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'about-school.html'));
});
app.get('/terms-school', (req, res) => {
    return res.sendFile(path.join(__dirname, 'public', 'terms-school.html'));
});

app.get('/school-dashboard', (req, res) => {
    if (req.session && req.session.isSchoolAuthenticated)
        return res.sendFile(path.join(__dirname, 'public', 'school-dashboard.html'));
    res.redirect('/school-auth');
});

app.get('/school-profile', (req, res) => {
    if (req.session && req.session.isSchoolAuthenticated)
        return res.sendFile(path.join(__dirname, 'public', 'school-profile.html'));
    res.redirect('/school-auth');
});

app.get('/school-students', (req, res) => {
    if (req.session && req.session.isSchoolAuthenticated)
        return res.sendFile(path.join(__dirname, 'public', 'school-students.html'));
    res.redirect('/school-auth');
});

app.get('/school-performance', (req, res) => {
    if (req.session && req.session.isSchoolAuthenticated)
        return res.sendFile(path.join(__dirname, 'public', 'school-performance.html'));
    res.redirect('/school-auth');
});

app.get('/exam', (req, res) => {
    if (req.session && req.session.examStudentName)
        return res.sendFile(path.join(__dirname, 'public', 'exam.html'));
    res.redirect('/');
});

app.get('/exam-score', (req, res) => {
    if (req.session && req.session.hasCompletedActiveExamToken === true)
        return res.sendFile(path.join(__dirname, 'public', 'exam-score.html'));
    res.redirect('/');
});

app.get('/dashboard', (req, res) => {
    if (getAdminSessionState(req)) return res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    redirectToAdminLogin(req, res);
});

app.get('/viewer-dashboard', (req, res) => {
    if (getAdminSessionState(req)) return res.sendFile(path.join(__dirname, 'public', 'viewer-dashboard.html'));
    redirectToAdminLogin(req, res);
});

app.get('/admin-users', (req, res) => {
    if (getAdminSessionState(req) && req.session.adminRole === 'superadmin')
        return res.sendFile(path.join(__dirname, 'public', 'admin-users.html'));
    redirectToAdminLogin(req, res);
});

app.get('/change-password', (req, res) => {
    if (getAdminSessionState(req))
        return res.sendFile(path.join(__dirname, 'public', 'change-password.html'));
    redirectToAdminLogin(req, res);
});

app.get('/add-exam', (req, res) => {
    if (getAdminSessionState(req)) return res.sendFile(path.join(__dirname, 'public', 'add-exam.html'));
    redirectToAdminLogin(req, res);
});

app.get('/edit-exam', (req, res) => {
    if (getAdminSessionState(req)) return res.sendFile(path.join(__dirname, 'public', 'edit-exam.html'));
    redirectToAdminLogin(req, res);
});

app.get('/system-performance', (req, res) => {
    if (getAdminSessionState(req)) return res.sendFile(path.join(__dirname, 'public', 'system-performance.html'));
    redirectToAdminLogin(req, res);
});

app.get('/visitors', (req, res) => {
    if (getAdminSessionState(req)) return res.sendFile(path.join(__dirname, 'public', 'visitors.html'));
    redirectToAdminLogin(req, res);
});

app.get(['/admin-payments', '/admin-payments/'], (req, res) => {
    if (getAdminSessionState(req)) return res.sendFile(path.join(__dirname, 'public', 'admin-payments.html'));
    redirectToAdminLogin(req, res);
});

app.get('/upload-resource', (req, res) => {
    if (getAdminSessionState(req)) return res.sendFile(path.join(__dirname, 'public', 'upload-resource.html'));
    redirectToAdminLogin(req, res);
});

// Block direct .html file access
app.get('*.html', (req, res) => res.status(403).send('Direct file access is not permitted.'));

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: false,
    index: false,
    maxAge: '1h',
    etag: true,
    lastModified: true
}));

// ── STUDENT API ROUTES ────────────────────────────────────────────────────
function normalizePhone(phoneString) {
    let cleaned = phoneString.toString().replace(/[\s\-\+]+/g, '').trim();
    if (cleaned.startsWith('250')) cleaned = '0' + cleaned.substring(3);
    return cleaned;
}

app.post('/api/check-phone', (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Telefone irakenewe.' });

    const phone = normalizePhone(phoneNumber);
    const last9 = phone.slice(-9);

    db.query(
        `SELECT
            COALESCE((SELECT SUM(remaining_exams) FROM payment_transactions WHERE RIGHT(phone_number, 9) = ? AND status = 'SUCCESS' AND remaining_exams > 0), 0) AS purchase_remaining,
            COALESCE((SELECT SUM(assigned_exams) FROM school_students WHERE RIGHT(phone_number, 9) = ? AND status = 'ACTIVE' AND assigned_exams > 0), 0) AS assigned_remaining,
            (SELECT COUNT(*) FROM driving_schools WHERE RIGHT(phone_number, 9) = ?) AS school_count,
            (SELECT COUNT(*) FROM school_students WHERE RIGHT(phone_number, 9) = ? AND status = 'ACTIVE' AND assigned_exams > 0) AS student_count,
            (SELECT COUNT(*) FROM school_students WHERE RIGHT(phone_number, 9) = ? AND status = 'BLOCKED') AS blocked_count
         `,
        [last9, last9, last9, last9, last9],
        (balErr, balRows) => {
            if (balErr) return res.status(500).json({ error: balErr.message });
            const data = balRows[0] || {};
            const purchaseRemaining = parseInt(data.purchase_remaining, 10) || 0;
            const assignedRemaining = parseInt(data.assigned_remaining, 10) || 0;
            const isSchoolPhone = (parseInt(data.school_count, 10) || 0) > 0;
            const hasSchoolStudent = (parseInt(data.student_count, 10) || 0) > 0;
            const hasBlockedStudent = (parseInt(data.blocked_count, 10) || 0) > 0;

            if (isSchoolPhone && !hasSchoolStudent) {
                return res.json({ status: 'school_number', error: "Numero ya telephone ni iya ishuri kandi ntishobora gukoreshwa mu kizamini niba itanditsewe nk'umunyeshuri." });
            }

            // If the phone belongs to a blocked student and they have no purchased exams, instruct to buy
            if (hasBlockedStudent && purchaseRemaining === 0 && assignedRemaining === 0) {
                return res.json({ status: 'blocked_no_purchase', error: "Konti y'umunyeshuri yafunzwe. Niba ushaka gukora ikizamini, gura ibizamini ku gice cy'Ibiciro cyangwa vugana n'ishuri." });
            }

            const totalRemaining = purchaseRemaining + assignedRemaining;
            if (totalRemaining > 0) {
                return res.json({ status: 'has_unfinished', remaining: totalRemaining, purchaseRemaining, assignedRemaining });
            }

            return res.json({ status: 'all_finished', remaining: 0 });
        }
    );
});

app.post('/api/register', (req, res) => {
    const { studentName, phoneNumber } = req.body;
    if (!studentName || !phoneNumber) return res.status(400).json({ error: 'Amazina na telefone birakenewe.' });

    const phone = normalizePhone(phoneNumber);

    const last9 = phone.slice(-9);

    // First try to find a purchase with remaining exams for this phone
    db.query(
        `SELECT id, remaining_exams FROM payment_transactions WHERE RIGHT(phone_number, 9) = ? AND status = 'SUCCESS' AND remaining_exams > 0 ORDER BY id DESC LIMIT 1`,
        [last9],
        (payErr, payRows) => {
            if (payErr) return res.status(500).json({ error: payErr.message });

            if (payRows && payRows.length > 0) {
                req.session.examStudentName = studentName.trim();
                req.session.examPhoneNumber = phone;
                req.session.activePaymentRecordId = payRows[0].id;
                req.session.assignedStudentId = null;
                req.session.lockedExamQuestionIds = [];
                req.session.hasCompletedActiveExamToken = false;
                return res.json({ ok: true, remaining: payRows[0].remaining_exams });
            }

            // No direct purchase found; check if this phone is a registered active school student with assigned exams
            db.query(
                `SELECT id, student_name, assigned_exams FROM school_students WHERE RIGHT(phone_number, 9) = ? AND status = 'ACTIVE' AND assigned_exams > 0 ORDER BY id DESC LIMIT 1`,
                [last9],
                (stuErr, stuRows) => {
                    if (stuErr) return res.status(500).json({ error: stuErr.message });
                    if (stuRows && stuRows.length > 0) {
                        req.session.examStudentName = studentName.trim();
                        req.session.examPhoneNumber = phone;
                        req.session.activePaymentRecordId = null;
                        req.session.assignedStudentId = stuRows[0].id;
                        req.session.lockedExamQuestionIds = [];
                        req.session.hasCompletedActiveExamToken = false;
                        return res.json({ ok: true, remaining: stuRows[0].assigned_exams });
                    }

                    return res.status(403).json({ ok: false, error: "Nta madorandore afite inshuro usigaje kuri iyi nomero. Gura ibizamini bishya ku gice cy'Ibiciro!" });
                }
            );
        }
    );
});

// ── OWNER BYPASS OTP ─────────────────────────────────────────────────────
const OWNER_PHONE = '0786663377';
const OWNER_EMAIL = 'dotadostationarystore@gmail.com';
const ownerOtpStore = new Map(); // phone -> { otp, expires }

app.post('/api/owner-otp/send', (req, res) => {
    const { phoneNumber } = req.body;
    const phone = normalizePhone(phoneNumber || '');
    if (phone.slice(-9) !== OWNER_PHONE.slice(-9))
        return res.status(403).json({ ok: false, error: 'Not authorized.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    ownerOtpStore.set(phone.slice(-9), { otp, expires: Date.now() + 5 * 60 * 1000 });

    emailTransport.sendMail({
        from: `"IKIZAME" <${process.env.SMTP_USER}>`,
        to: OWNER_EMAIL,
        subject: '🔐 IKIZAME Exam Access OTP',
        html: `<div style="font-family:Inter,sans-serif;padding:24px;background:#f8fafc;">
            <h2 style="color:#0b698b;">Exam Access OTP</h2>
            <p>Your one-time code to access the exam:</p>
            <div style="font-size:2.5rem;font-weight:800;letter-spacing:8px;color:#0f172a;padding:16px;background:#fff;border-radius:8px;text-align:center;border:2px solid #0b698b;">${otp}</div>
            <p style="color:#64748b;font-size:12px;margin-top:12px;">Expires in 5 minutes. Do not share this code.</p>
        </div>`
    }, (err) => {
        if (err) { console.error('OTP email failed:', err.message); return res.status(500).json({ ok: false, error: 'Failed to send OTP.' }); }
        console.log(`✅ Owner OTP sent to ${OWNER_EMAIL}`);
        res.json({ ok: true });
    });
});

app.post('/api/owner-otp/verify', (req, res) => {
    const { phoneNumber, otp, studentName } = req.body;
    const phone = normalizePhone(phoneNumber || '');
    const last9 = phone.slice(-9);
    if (last9 !== OWNER_PHONE.slice(-9))
        return res.status(403).json({ ok: false, error: 'Not authorized.' });

    const record = ownerOtpStore.get(last9);
    if (!record) return res.status(400).json({ ok: false, error: 'Nta OTP yoherejwe. Ongera ugerageze.' });
    if (Date.now() > record.expires) {
        ownerOtpStore.delete(last9);
        return res.status(400).json({ ok: false, error: 'OTP yarangiye. Saba indi.' });
    }
    if (record.otp !== String(otp).trim())
        return res.status(400).json({ ok: false, error: 'OTP ntabwo ari yo. Ongera ugerageze.' });

    ownerOtpStore.delete(last9);
    req.session.examStudentName = (studentName || 'Owner').trim();
    req.session.examPhoneNumber = phone;
    req.session.activePaymentRecordId = null;
    req.session.assignedStudentId = null;
    req.session.lockedExamQuestionIds = [];
    req.session.hasCompletedActiveExamToken = false;
    req.session.isOwnerBypass = true;
    res.json({ ok: true });
});

app.post('/api/clear-session', (req, res) => {
    req.session.hasCompletedActiveExamToken = false;
    req.session.examStudentName             = null;
    req.session.examPhoneNumber             = null;
    req.session.lockedExamQuestionIds       = [];
    req.session.activePaymentRecordId       = null;
    res.json({ ok: true });
});

// ── API ROUTE MODULES ─────────────────────────────────────────────────────
app.use('/api/exams',            require('./routes/exams')(db));
app.use('/api/payments',         require('./routes/payments')(db));
app.use('/api/amanota',          require('./routes/amanota')(db));
app.use('/api/resources',        require('./routes/resources')(db));
app.use('/api/public/documents', require('./routes/resources')(db, true));

// Admin routes — rate limiter applied on the router before mounting
const adminRouter = require('./routes/admin')(db, loginLimiter);
app.use('/api/admin', adminRouter);

// School routes — rate limiters applied on the router before mounting
const schoolRouter = require('./routes/school')(db, emailTransport, loginLimiter, otpLimiter);
app.use('/api/school', schoolRouter);

// ── KEEPALIVE PING (prevents Render free tier from sleeping) ─────────────
if (isProduction) {
    const https = require('https');
    setInterval(() => {
        const url = process.env.RENDER_EXTERNAL_URL;
        if (!url) return;
        https.get(url, (res) => {
            console.log(`⚡ KeepAlive ping: ${res.statusCode}`);
        }).on('error', (err) => {
            console.log('⚠️  KeepAlive ping failed:', err.message);
        });
    }, 14 * 60 * 1000);
}

// ── ERROR ALERT EMAIL ────────────────────────────────────────────────────
const ALERT_EMAIL = process.env.ALERT_EMAIL || process.env.REPORT_EMAIL || process.env.SMTP_USER;
function sendErrorAlert(subject, body) {
    const recipient = process.env.ERROR_EMAIL || process.env.ALERT_EMAIL || process.env.REPORT_EMAIL || process.env.SMTP_USER;
    if (!recipient) return;
    emailTransport.sendMail({
        from: `"IKIZAME Alerts" <${process.env.SMTP_USER}>`,
        to: recipient,
        subject: `🚨 IKIZAME: ${subject}`,
        html: `<div style="font-family:monospace;background:#0f172a;color:#f8fafc;padding:24px;border-radius:8px;">
            <h2 style="color:#ef4444;margin:0 0 12px;">🚨 ${subject}</h2>
            <pre style="background:#1e293b;padding:16px;border-radius:6px;overflow:auto;font-size:13px;color:#e2e8f0;white-space:pre-wrap;">${body}</pre>
            <p style="color:#64748b;font-size:11px;margin-top:16px;">Time: ${new Date().toISOString()} | Server: ikizame.rw</p>
        </div>`
    }, (err) => { if (err) console.error('⚠️  Alert email failed:', err.message); });
}

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    sendErrorAlert('Uncaught Exception', `${err.message}\n\n${err.stack}`);
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
    sendErrorAlert('Unhandled Promise Rejection', String(reason?.stack || reason));
});

// Export for use in routes
module.exports.sendErrorAlert = sendErrorAlert;
app.set('emailTransport', emailTransport);

// ── PAYMENT REPORT SCHEDULER ─────────────────────────────────────────────
const reports = require('./routes/reports');
const { sendReport } = reports;
reports(db, emailTransport);

// Test endpoint — admin session OR secret key
app.get('/api/admin/test-report/:type', (req, res) => {
    const isAdmin = getAdminSessionState(req);
    const keyOk   = req.query.key === (process.env.REPORT_TEST_KEY || 'ikizame-report-test');
    if (!isAdmin && !keyOk) return res.status(401).json({ error: 'Unauthorized' });
    const type = ['weekly','monthly','yearly','daily','password-reminder'].includes(req.params.type) ? req.params.type : 'daily';
    const reports = require('./routes/reports');
    const runner = type === 'daily' ? reports.sendDailyReport(db, emailTransport)
        : type === 'password-reminder' ? reports.sendPasswordExpiryReminder(emailTransport)
        : reports.sendReport(db, emailTransport, type);
    runner
        .then(() => res.json({ ok: true, message: `${type} report sent` }))
        .catch(e => res.status(500).json({ ok: false, error: e.message }));
});

// ── REPORT SUBMISSION ENDPOINT ─────────────────────────────────────────────
app.post('/api/reports/submit', (req, res) => {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const title = payload.title || payload.subject || 'System report';
    const message = payload.message || payload.body || '';
    const reportType = payload.reportType || 'general';
    const senderName = payload.senderName || payload.name || 'Unknown';
    const senderEmail = payload.senderEmail || payload.email || '';
    const recipient = process.env.DAILY_REPORT_EMAIL || process.env.REPORT_EMAIL || process.env.ALERT_EMAIL || process.env.SMTP_USER || 'dotadostationarystore@gmail.com';

    const html = `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
            <div style="background:#0b698b;padding:16px 20px;border-radius:8px;color:#fff;">
                <h2 style="margin:0;font-size:18px;">📩 New IKIZAME Report</h2>
                <p style="margin:6px 0 0;font-size:12px;opacity:0.9;">Type: ${reportType}</p>
            </div>
            <div style="margin-top:16px;padding:16px;background:#fff;border-radius:8px;border:1px solid #e2e8f0;">
                <p style="margin:0 0 8px;font-weight:700;">${title}</p>
                <p style="margin:0 0 8px;color:#475569;white-space:pre-wrap;">${String(message).replace(/\n/g, '<br>')}</p>
                <p style="margin:8px 0 0;font-size:12px;color:#64748b;">From: ${senderName}${senderEmail ? ` &lt;${senderEmail}&gt;` : ''}</p>
            </div>
        </div>
    `;

    emailTransport.sendMail({
        from: `"IKIZAME Reports" <${process.env.SMTP_USER || 'dotadostationerystoreikizame@gmail.com'}>`,
        to: recipient,
        subject: `📩 IKIZAME Report — ${title}`,
        html
    }, (err) => {
        if (err) {
            console.error('❌ Report email failed:', err.message);
            return res.status(500).json({ success: false, error: 'Report email could not be sent.' });
        }
        res.json({ success: true, message: 'Report submitted successfully.' });
    });
});

// ── JSON PARSE RECOVERY FOR MALFORMED REQUESTS ───────────────────────────
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        const raw = req.rawBody ? req.rawBody.toString('utf8') : '';
        if (raw) {
            try {
                const safeRaw = raw.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
                req.body = JSON.parse(safeRaw);
                req._body = true;
                return next();
            } catch (parseErr) {
                req.body = {};
                req._body = true;
                return next();
            }
        }
    }
    next(err);
});

// ── GLOBAL EXPRESS ERROR HANDLER ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('❌ Express error:', err);
    sendErrorAlert(
        `Express Error: ${err.message}`,
        `Route: ${req.method} ${req.originalUrl}\nStatus: ${err.status || 500}\n\n${err.stack}`
    );
    res.status(err.status || 500).json({ error: 'Internal server error.' });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`🚀 IKIZAME Server running on port ${PORT}`));
