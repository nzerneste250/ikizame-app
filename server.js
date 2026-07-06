// ==========================================================================
// IKIZAME SERVER
// ==========================================================================
require('dotenv').config();
const express     = require('express');
const mysql       = require('mysql2');
const path        = require('path');
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

// ── SECURITY & PERFORMANCE ────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json());
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

if (!isProduction) {
    app.use((req, res, next) => {
        if (req.path.startsWith('/assets/')) return next();
        if (req.path.startsWith('/school-') || req.path.startsWith('/api/school/')) return next();
        return restrictAccessToAuthorizedUsers(req, res, next);
    });
}

// ── DATABASE POOL ─────────────────────────────────────────────────────────
console.log(`ℹ️  ${isProduction ? 'Production' : 'Local'} environment — connecting to [${dbConfig.host}]...`);

const db = mysql.createPool(dbConfig);

db.getConnection((err, conn) => {
    if (err) { console.error('❌ Database pool connection failure:', err.code, err.message); return; }
    console.log(`✅ Database pool ready on [${dbConfig.host}]`);
    conn.release();
});

// ── SESSION STORE ────────────────────────────────────────────────
const MySQLStore = require('express-mysql-session')(session);
const sessionStore = new MySQLStore({
    expiration:          4 * 60 * 60 * 1000,
    createDatabaseTable: false,
    connectionLimit:     2,
    endConnectionOnClose: true
}, db.promise());

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

// ── VISITOR TRACKING (unique per IP per day) ────────────────────────────
const TRACKED_PAGES = ['/', '/index', '/ifashanyigisho', '/ibiciro', '/ubufasha', '/amanota', '/exam-result', '/school-auth'];
app.use((req, res, next) => {
    if (TRACKED_PAGES.includes(req.path)) {
        const ip = (req.ip || req.connection.remoteAddress || 'unknown')
            .replace(/^::ffff:/i, '')
            .replace(/^::1$/, '127.0.0.1')
            .trim();
        db.query(
            `INSERT INTO site_visitors (ip_address, visited_at, visit_count)
             VALUES (?, NOW(), 1)
             ON DUPLICATE KEY UPDATE visit_count = visit_count + 1`,
            [ip],
            () => {}
        );
    }
    next();
});

// ── PAGE ROUTES ───────────────────────────────────────────────────────────
app.get('/',               (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/index',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin-login',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));
app.get('/ifashanyigisho', (req, res) => res.sendFile(path.join(__dirname, 'public', 'ifashanyigisho.html')));
app.get('/ibiciro',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'ibiciro.html')));
app.get('/ubufasha',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'ubufasha.html')));
app.get('/amanota',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'amanota.html')));
app.get('/exam-result',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'exam-result.html')));
app.get('/school-auth',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'school-auth.html')));

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
    maxAge: '7d',
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

    db.query(`SELECT COUNT(*) AS cnt FROM exam_attempts WHERE RIGHT(phone_number, 9) = RIGHT(?, 9)`, [phone], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows[0].cnt === 0) return res.json({ status: 'first_time', remaining: 1 });

        db.query(
            `SELECT COALESCE(SUM(remaining_exams), 0) AS remaining FROM payment_transactions WHERE RIGHT(phone_number, 9) = ? AND status = 'SUCCESS'`,
            [phone.slice(-9)],
            (balErr, balRows) => {
                if (balErr) return res.status(500).json({ error: balErr.message });
                const remaining = parseInt(balRows[0].remaining, 10) || 0;
                return res.json({ status: remaining > 0 ? 'has_unfinished' : 'all_finished', remaining });
            }
        );
    });
});

app.post('/api/register', (req, res) => {
    const { studentName, phoneNumber } = req.body;
    if (!studentName || !phoneNumber) return res.status(400).json({ error: 'Amazina na telefone birakenewe.' });

    const phone = normalizePhone(phoneNumber);

    db.query(`SELECT COUNT(*) AS cnt FROM exam_attempts WHERE RIGHT(phone_number, 9) = RIGHT(?, 9)`, [phone], (histErr, histRows) => {
        if (histErr) return res.status(500).json({ error: histErr.message });

        if (histRows[0].cnt === 0) {
            req.session.examStudentName        = studentName.trim();
            req.session.examPhoneNumber        = phone;
            req.session.activePaymentRecordId  = null;
            req.session.lockedExamQuestionIds  = [];
            req.session.hasCompletedActiveExamToken = false;
            return res.json({ ok: true, remaining: 1 });
        }

        db.query(
            `SELECT id, remaining_exams FROM payment_transactions WHERE phone_number = ? AND status = 'SUCCESS' AND remaining_exams > 0 ORDER BY id DESC LIMIT 1`,
            [phone],
            (accessErr, results) => {
                if (accessErr) return res.status(500).json({ error: accessErr.message });
                if (!results || results.length === 0) {
                    return res.status(403).json({ ok: false, error: "Nta madorandore afite inshuro usigaje kuri iyi nomero. Gura ibizamini bishya ku gice cy'Ibiciro!" });
                }
                req.session.examStudentName        = studentName.trim();
                req.session.examPhoneNumber        = phone;
                req.session.activePaymentRecordId  = results[0].id;
                req.session.lockedExamQuestionIds  = [];
                req.session.hasCompletedActiveExamToken = false;
                res.json({ ok: true, remaining: results[0].remaining_exams });
            }
        );
    });
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

// ── SERVER START ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 IKIZAME Server running on port ${PORT}`));
