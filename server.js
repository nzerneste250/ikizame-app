// ==========================================================================
// 🚀 IKIZAME HYBRID COUPLER PLATFORM SERVER ENGINE (LOCAL & PRODUCTION SYNC)
// ==========================================================================
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();

// --- 🔒 MIDDLEWARE 1: AUTHORIZATION GATE (PRE-PUBLICATION LOCKDOWN) ---
function restrictAccessToAuthorizedUsers(req, res, next) {
    if (req.path.startsWith('/api/exams/submit')) return next();

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="IKIZAME Secure Staging Portal"');
        return res.status(401).send('Authentication Required to Access This Staging Site.');
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'basic') {
        res.setHeader('WWW-Authenticate', 'Basic realm="IKIZAME Secure Staging Portal"');
        return res.status(401).send('Authentication Required.');
    }

    const authCredentials = Buffer.from(tokenParts[1], 'base64').toString().split(':');
    const usernameInput = authCredentials[0];
    const passwordInput = authCredentials[1];

    const STAGING_USERNAME = 'admin';       
    const STAGING_PASSWORD = 'Kigali@1234'; 

    if (usernameInput === STAGING_USERNAME && passwordInput === STAGING_PASSWORD) {
        return next(); 
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="IKIZAME Secure Staging Portal"');
    return res.status(401).send('Invalid Authorization Credentials provided.');
}

app.use((req, res, next) => {
    if (req.path.startsWith('/assets/')) return next();
    return restrictAccessToAuthorizedUsers(req, res, next);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'izo_service_quicky_hybrid_secure_token_998844',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 4 * 60 * 60 * 1000 } 
}));

// ==========================================================================
// 🛡️ FRONT-LOADED CLEAN NAVIGATION URLS (RESOLVES CANNOT GET INVERSIONS)
// ==========================================================================
app.get('/',           (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/index',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin-login',(req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));
app.get('/ifashanyigisho', (req, res) => res.sendFile(path.join(__dirname, 'public', 'ifashanyigisho.html')));
app.get('/ibiciro',    (req, res) => res.sendFile(path.join(__dirname, 'public', 'ibiciro.html')));

app.get('/school-auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'school-auth.html'));
});
// ==========================================================================
// 🔍 AUTOMATED UBUFASHA PAGE ROUTING CONTROLLER
// ==========================================================================
app.get('/ubufasha', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ubufasha.html'));
});

app.get('/school-dashboard', (req, res) => {
    if (req.session && req.session.isSchoolAuthenticated) {
        return res.sendFile(path.join(__dirname, 'public', 'school-dashboard.html'));
    }
    res.redirect('/school-auth');
});

app.get('/exam', (req, res) => {
    if (req.session && req.session.examStudentName) {
        return res.sendFile(path.join(__dirname, 'public', 'exam.html'));
    }
    res.redirect('/');
});

app.get('/dashboard', (req, res) => {
    if (req.session && req.session.isAdminAuthenticated) {
        return res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    }
    res.redirect('/admin-login');
});

app.get('/add-exam', (req, res) => {
    if (req.session && req.session.isAdminAuthenticated) {
        return res.sendFile(path.join(__dirname, 'public', 'add-exam.html'));
    }
    res.redirect('/admin-login');
});

app.get('/edit-exam', (req, res) => {
    if (req.session && req.session.isAdminAuthenticated) {
        return res.sendFile(path.join(__dirname, 'public', 'edit-exam.html'));
    }
    res.redirect('/admin-login');
});

app.get('/system-performance', (req, res) => {
    if (req.session && req.session.isAdminAuthenticated) {
        return res.sendFile(path.join(__dirname, 'public', 'system-performance.html'));
    }
    res.redirect('/admin-login');
});

app.get('/exam-score', (req, res) => {
    if (req.session && req.session.hasCompletedActiveExamToken === true) {
        return res.sendFile(path.join(__dirname, 'public', 'exam-score.html'));
    }
    res.redirect('/');
});

app.get('/exam-result', (req, res) => {
    if (req.session && req.session.hasCompletedActiveExamToken === true) {
        return res.sendFile(path.join(__dirname, 'public', 'exam-result.html'));
    }
    res.redirect('/');
});
app.get('/upload-resource', (req, res) => {
    if (req.session && req.session.isAdminAuthenticated) {
        return res.sendFile(path.join(__dirname, 'public', 'upload-resource.html'));
    }
    res.redirect('/admin-login');
});

app.get('*.html', (req, res) => {
    res.status(403).send('Direct file access is not permitted. Please use the application navigation.');
});

app.use(express.static(path.join(__dirname, 'public'), {
    extensions: false,   
    index: false         
}));

// --- 🗄️ 2. SMART HYBRID DATABASE CONNECTOR MATRIX ---
const isLocalMachineHost = process.env.NODE_ENV !== 'production' && !process.env.RENDER;
let databaseCredentialsConfig = {};

if (isLocalMachineHost) {
    databaseCredentialsConfig = {
        host: 'localhost',
        user: 'root',
        password: '', 
        database: 'driving_db',
        port: 3306
    };
    console.log('ℹ️ Local environment detected. Initiating local MySQL handshake setup...');
} else {
    databaseCredentialsConfig = {
        host: 'mysql-ikizame.alwaysdata.net',
        user: 'ikizame',
        password: 'Kigali@1234', 
        database: 'ikizame_driving_db',
        port: 3306
    };
    console.log('ℹ️ Production host detected. Initiating Alwaysdata remote cloud connection cluster...');
}

const db = mysql.createConnection(databaseCredentialsConfig);

db.connect((err) => {
    if (err) {
        console.error('❌ Database Connection Cluster Failure:', err.message);
        return;
    }
    console.log(`🚀 Successfully linked to active database target: [${databaseCredentialsConfig.host}]!`);
});

// --- 📸 3. DEDUPLICATION STORAGE ENGINE MATRIX (LOCAL STORAGE PATH PROTECTION) ---
const uploadDirectoryPath = isLocalMachineHost 
    ? 'F:\\IKIZAME-NodeApp\\public\\assets\\uploads'
    : path.resolve(__dirname, 'public', 'assets', 'uploads');

if (!fs.existsSync(uploadDirectoryPath)) {
    fs.mkdirSync(uploadDirectoryPath, { recursive: true });
}

const storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectoryPath);
    },
    filename: (req, file, cb) => {
        const cleanOriginalName = file.originalname.replace(/\s+/g, '_');
        const completeTargetFilePath = path.join(uploadDirectoryPath, cleanOriginalName);

        if (fs.existsSync(completeTargetFilePath)) {
            console.log(`ℹ️ Asset [${cleanOriginalName}] already present on disk folder tree. Skipping copy loops.`);
            cb(null, cleanOriginalName);
        } else {
            cb(null, cleanOriginalName);
        }
    }
});

const upload = multer({ storage: storageEngine });
const examUploadFieldsConfig = upload.fields([
    { name: 'imageFile', maxCount: 1 },
    { name: 'optiona_File', maxCount: 1 }, 
    { name: 'optionb_File', maxCount: 1 }, 
    { name: 'optionc_File', maxCount: 1 }, 
    { name: 'optiond_File', maxCount: 1 }  
]);

function requireAdminLogin(req, res, next) {
    if (req.session && req.session.isAdminAuthenticated) {
        return next();
    }
    res.status(401).send('Unauthorized entry setup. Please access portals with valid admin login actions loops.');
}

// ==========================================================================
// 📄 LEARNING RESOURCES (IFASHANYIGISHO) DOCUMENT CARRIER ENGINE
// ==========================================================================
const resourceStorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectoryPath); 
    },
    filename: (req, file, cb) => {
        const cleanName = 'resource_' + Date.now() + '_' + file.originalname.replace(/\s+/g, '_');
        cb(null, cleanName);
    }
});
const resourceUpload = multer({ 
    storage: resourceStorageEngine,
    limits: { fileSize: 20 * 1024 * 1024 } 
});

// ==========================================================================
// 📬 FIREWALL-UNBLOCKABLE LIVE SMTP TRANSMISSION CARRIER (PORT 587 TLS)
// ==========================================================================
// 🎯 FIXED: host was '://gmail.com' (invalid, not a real hostname) — this is
// exactly why nodemailer failed and the app showed
// "Kugenzura Mail byanze: Configura neza SMTP parameters."
// The correct Gmail SMTP hostname is smtp.gmail.com.
//
// NOTE: Gmail also requires an "App Password" (not your normal Gmail login
// password) when 2-Step Verification is enabled on the account. The value
// below already looks like an App Password format (16 chars, spaced in 4s),
// so it should work as-is once the hostname is corrected — but if you still
// see auth errors in the console, generate a fresh App Password at
// https://myaccount.google.com/apppasswords and paste it into `pass` below.
const emailTransmissionTransportGateway = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,                  
    secure: false,              
    auth: {
        user: 'nzerneste250@gmail.com', 
        pass: 'gigm iznl zcgb bewa'     
    },
    tls: {
        rejectUnauthorized: false 
    }
});

emailTransmissionTransportGateway.verify((error) => {
    if (error) console.error('⚠️ SMTP Email Transport Gateway Configuration Failure:', error.message);
    else console.log('✓ SMTP Email Transport Gateway linked successfully via Port 587 TLS. Carrier ready!');
});
// ==========================================================================
// 📄 LEARNING RESOURCES (IFASHANYIGISHO) DYNAMIC CONTROLLER PIPELINE BUNDLE
// ==========================================================================

// A. API: Admin Submit New Learning Document (Aligned with allow_read/allow_download)
app.post('/api/resources/add', requireAdminLogin, resourceUpload.single('resourceFile'), (req, res) => {
    const { title, description, canRead, canDownload } = req.body;
    if (!req.file || !title) {
        return res.status(400).send('Database Constraint Failure: Title and file upload are required parameters.');
    }
    
    const fileName = req.file.filename;
    const fileType = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    
    const allowRead = canRead === 'on' ? 1 : 0;
    const allowDownload = canDownload === 'on' ? 1 : 0;

    const sql = `INSERT INTO learning_resources (title, description, file_name, file_type, allow_read, allow_download) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(sql, [title.trim(), description ? description.trim() : '', fileName, fileType, allowRead, allowDownload], (err) => {
        if (err) return res.status(500).send('Database Query Failure: ' + err.message);
        res.redirect('/upload-resource');
    });
});

// B. API: Fetch All Available Resources (Public Access for Students & Admins)
app.get('/api/resources', (req, res) => {
    db.query('SELECT * FROM learning_resources ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// C. API: Admin Delete Specific Learning Document
app.delete('/api/resources/delete/:id', requireAdminLogin, (req, res) => {
    db.query('DELETE FROM learning_resources WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// D. NEW API: Fetch Single Resource Metadata Details for Edit Pre-population
app.get('/api/resources/:id', requireAdminLogin, (req, res) => {
    db.query('SELECT * FROM learning_resources WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) res.json(results[0]);
        else res.status(404).send('Resource metadata log entry point not found.');
    });
});

// E. API: Admin Modify Existing Learning Document Fields
app.post('/api/resources/edit', requireAdminLogin, resourceUpload.single('resourceFile'), (req, res) => {
    const { id, title, description, existingFileName, existingFileType, canRead, canDownload } = req.body;
    
    let finalFileName = existingFileName;
    let finalFileType = existingFileType;

    if (req.file) {
        finalFileName = req.file.filename;
        finalFileType = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    }

    const allowRead = canRead === 'on' ? 1 : 0;
    const allowDownload = canDownload === 'on' ? 1 : 0;

    const sql = `UPDATE learning_resources SET title=?, description=?, file_name=?, file_type=?, allow_read=?, allow_download=? WHERE id=?`;
    db.query(sql, [title.trim(), description ? description.trim() : '', finalFileName, finalFileType, allowRead, allowDownload, id], (err) => {
        if (err) return res.status(500).send('Database Modification Query Error: ' + err.message);
        res.redirect('/upload-resource');
    });
});

// ==========================================================================
// 🛣️ CONTROLLER ROUTING ENDPOINTS CHANNEL ARCHITECTURE
// ==========================================================================

app.post('/api/admin/auth', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM portal_admins WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) return res.status(500).send('Database Auth Error: ' + err.message);
        if (results && results.length > 0) {
            req.session.isAdminAuthenticated = true;
            res.redirect('/dashboard');
        } else {
            res.send('<script>alert("Invalid Admin Credentials Layout!"); window.location.href="/admin-login";</script>');
        }
    });
});

app.get('/api/admin/logout', (req, res) => {
    req.session.destroy(() => { res.redirect('/admin-login'); });
});

// 🎯 DYNAMIC TELECOM RECONCILIATION COUPLER
function normalizeRwandanPhoneNumber(phoneString) {
    let cleaned = phoneString.toString().replace(/[\s\-\+]+/g, '').trim();
    if (cleaned.startsWith('250')) {
        cleaned = '0' + cleaned.substring(3);
    }
    return cleaned;
}

// 🎯 RECALIBRATED STUDENT GATEWAY: Validates payment balance rows before unlocking exam
app.post('/api/register', (req, res) => {
    const { studentName, phoneNumber } = req.body;
    if (!studentName || !phoneNumber) {
        return res.status(400).json({ error: 'Amazina na telefone birakenewe.' });
    }

    const standardizedPhone = normalizeRwandanPhoneNumber(phoneNumber);

    const checkAccessSql = `SELECT id, remaining_exams FROM payment_transactions WHERE phone_number = ? AND status = 'SUCCESS' AND remaining_exams > 0 ORDER BY id DESC LIMIT 1`;
    db.query(checkAccessSql, [standardizedPhone], (accessErr, results) => {
        if (accessErr) return res.status(500).json({ error: 'Database tracking layer fault: ' + accessErr.message });

        if (!results || results.length === 0) {
            return res.status(403).json({ 
                ok: false, 
                error: "Nta madorandore afite inshuro usigaje kuri iyi nomero. Gura ibizamini bishya ku gice cy'Ibiciro (Ibiciro Menu)!" 
            });
        }

        const activeTxRecord = results[0];

        req.session.examStudentName = studentName.trim();
        req.session.examPhoneNumber = standardizedPhone;
        req.session.activePaymentRecordId = activeTxRecord.id;
        req.session.lockedExamQuestionIds = [];
        req.session.hasCompletedActiveExamToken = false;

        res.json({ ok: true, remaining: activeTxRecord.remaining_exams });
    });
});

// ==========================================================================
// 🎲 RESOLVED SHUFFLED QUESTION ENGINE ROUTE
// ==========================================================================
app.get('/api/exams', (req, res) => {
    db.query('SELECT * FROM exams ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results || results.length === 0) return res.json([]);

        if (req.session && req.session.isAdminAuthenticated) {
            return res.json(results);
        }

        if (req.session.lockedExamQuestionIds && req.session.lockedExamQuestionIds.length > 0) {
            const lockedQuestions = req.session.lockedExamQuestionIds
                .map(id => results.find(q => q.id === id))
                .filter(Boolean); 
            return res.json(lockedQuestions);
        }

        const pool = [...results];
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        const examSize = Math.min(20, pool.length);
        const selectedQuestions = pool.slice(0, examSize);
        req.session.lockedExamQuestionIds = selectedQuestions.map(q => q.id);
        res.json(selectedQuestions);
    });
});

// ==========================================================================
// 📝 ADD QUESTION ENDPOINT (FIXED MULTIPART FIELD INDEX CASE BINDINGS)
// ==========================================================================
app.post('/api/exams/add', examUploadFieldsConfig, (req, res) => {
    const question = req.body.question || '';
    const correctOption = req.body.correctOption || '';
    const optionsLayoutMode = req.body.optionsLayoutMode || 'text';
    
    const mainQuestionImage = req.files && req.files['imageFile'] && req.files['imageFile'][0]
        ? req.files['imageFile'][0].filename 
        : (req.body.imageFileTextFallback ? req.body.imageFileTextFallback.trim() : null);

    let finalOptionA = '';
    let finalOptionB = '';
    let finalOptionC = '';
    let finalOptionD = '';

    if (optionsLayoutMode === 'image') {
        finalOptionA = req.files && req.files['optiona_File'] && req.files['optiona_File'][0] ? req.files['optiona_File'][0].filename : (req.body.optionATextFallback ? req.body.optionATextFallback.trim() : '');
        finalOptionB = req.files && req.files['optionb_File'] && req.files['optionb_File'][0] ? req.files['optionb_File'][0].filename : (req.body.optionBTextFallback ? req.body.optionBTextFallback.trim() : '');
        finalOptionC = req.files && req.files['optionc_File'] && req.files['optionc_File'][0] ? req.files['optionc_File'][0].filename : (req.body.optionCTextFallback ? req.body.optionCTextFallback.trim() : '');
        finalOptionD = req.files && req.files['optiond_File'] && req.files['optiond_File'][0] ? req.files['optiond_File'][0].filename : (req.body.optionDTextFallback ? req.body.optionDTextFallback.trim() : '');
    } else {
        finalOptionA = req.body.optionA ? req.body.optionA.trim() : '';
        finalOptionB = req.body.optionB ? req.body.optionB.trim() : '';
        finalOptionC = req.body.optionC ? req.body.optionC.trim() : '';
        finalOptionD = req.body.optionD ? req.body.optionD.trim() : '';
    }

    if (!finalOptionA || !finalOptionB || !finalOptionC || !finalOptionD) {
        return res.status(400).send('Database Constraint Error: All four option variations must possess values or image targets.');
    }

    const sql = `INSERT INTO exams (question, option_a, option_b, option_c, option_d, correct_option, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, mainQuestionImage], (err) => {
        if (err) {
            console.error('❌ Insertion query failed:', err.message);
            return res.status(500).send('Database Core Query Insertion Failure Error: ' + err.message);
        }
        res.redirect('/dashboard');
    });
});

// ==========================================================================
// 🔍 RECALIBRATED SPECIFIC QUESTION FETCH ENDPOINT
// ==========================================================================
app.get('/api/exams/:id', (req, res) => {
    db.query('SELECT * FROM exams WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length > 0) {
            res.json(results);
        } else {
            res.status(404).json({ error: 'Record reference object mapping element targets not found.' });
        }
    });
});
// ==========================================================================
// 📄 LEARNING RESOURCES DATABASE CONTROLLER GATEWAY
// ==========================================================================
app.get('/api/public/documents', (req, res) => {
    // Force query to screen records that are specifically authorized for reading
    const resourceSqlQuery = `
        SELECT id, title, description, file_name, file_type, allow_read, allow_download 
        FROM learning_resources 
        WHERE allow_read = 1 
        ORDER BY id DESC
    `;

    db.query(resourceSqlQuery, (err, results) => {
        if (err) {
            console.error("[Database Error] Failed to fetch learning rows:", err);
            return res.status(500).json({ error: "Gushaka imfashanyigisho byanze." });
        }
        
        // Map backend rows cleanly into a predictable API payload format
        const structuredResources = results.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            // Maps straight to your static server path matching public assets uploads directory
            file_path: `assets/uploads/${row.file_name}`,
            file_type: row.file_type,
            allow_download: parseInt(row.allow_download, 10) // Forces numerical evaluation
        }));

        res.json(structuredResources);
    });
});
app.post('/api/exams/edit', examUploadFieldsConfig, (req, res) => {
    const { id, question, correctOption, optionsLayoutMode, existingImagePath, existingOptA, existingOptB, existingOptC, existingOptD, imageFileTextFallback, optionATextFallback, optionBTextFallback, optionCTextFallback, optionDTextFallback } = req.body;
    
    const imagePath = req.files && req.files['imageFile'] && req.files['imageFile'][0]
        ? req.files['imageFile'][0].filename
        : (imageFileTextFallback ? imageFileTextFallback.trim() : existingImagePath);

    let finalOptionA = '';
    let finalOptionB = '';
    let finalOptionC = '';
    let finalOptionD = '';

    if (optionsLayoutMode === 'image') {
        finalOptionA = req.files && req.files['optiona_File'] && req.files['optiona_File'][0] ? req.files['optiona_File'][0].filename : (optionATextFallback ? optionATextFallback.trim() : existingOptA);
        finalOptionB = req.files && req.files['optionb_File'] && req.files['optionb_File'][0] ? req.files['optionb_File'][0].filename : (optionBTextFallback ? optionBTextFallback.trim() : existingOptB);
        finalOptionC = req.files && req.files['optionc_File'] && req.files['optionc_File'][0] ? req.files['optionc_File'][0].filename : (optionCTextFallback ? optionCTextFallback.trim() : existingOptC);
        finalOptionD = req.files && req.files['optiond_File'] && req.files['optiond_File'][0] ? req.files['optiond_File'][0].filename : (optionDTextFallback ? optionDTextFallback.trim() : existingOptD);
    } else {
        finalOptionA = req.body.optionA ? req.body.optionA.trim() : '';
        finalOptionB = req.body.optionB ? req.body.optionB.trim() : '';
        finalOptionC = req.body.optionC ? req.body.optionC.trim() : '';
        finalOptionD = req.body.optionD ? req.body.optionD.trim() : '';
    }

    const updateSql = `UPDATE exams SET question=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_option=?, image_path=? WHERE id=?`;
    db.query(updateSql, [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, imagePath, id], (err) => {
        if (err) return res.status(500).send('Database Query Error Executing Modify Updates Chain: ' + err.message);
        res.redirect('/dashboard');
    });
});

app.delete('/api/exams/delete/:id', (req, res) => {
    db.query('DELETE FROM exams WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/exams/submit', (req, res) => {
    const studentAnswers = req.body;
    const sessionName = req.session.examStudentName || 'Unknown Student';
    const sessionPhone = req.session.examPhoneNumber || '0780000000';
    
    db.query('SELECT id, correct_option, question, option_a, option_b, option_c, option_d, image_path FROM exams', (err, exams) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let score = 0;
        let evaluatedCount = 0;
        let originalQuestionsSnapshot = [];

        exams.forEach(exam => {
            const answerKey = `question_${exam.id}`;
            if (studentAnswers.hasOwnProperty(answerKey)) {
                evaluatedCount++;
                if (studentAnswers[answerKey] === exam.correct_option) {
                    score++;
                }
            }
            originalQuestionsSnapshot.push(exam);
        });

        const finalTotalDisplayCount = evaluatedCount > 0 ? evaluatedCount : 20;

        const insertSql = `INSERT INTO exam_attempts (student_name, phone_number, score, total_questions, student_answers, exam_questions_snapshot) VALUES (?, ?, ?, ?, ?, ?)`;
        const payloadAnswersJson = JSON.stringify(studentAnswers);
        const payloadSnapshotJson = JSON.stringify(originalQuestionsSnapshot);

        db.query(insertSql, [sessionName, sessionPhone, score, finalTotalDisplayCount, payloadAnswersJson, payloadSnapshotJson], (insertErr) => {
            if (insertErr) console.error('⚠️ Failed to save metrics snapshot trace logs:', insertErr.message);
            
            // 🎯 AUTOMATED TOKEN DECREMENT ENGINE
            if (req.session.activePaymentRecordId) {
                const activeTxId = req.session.activePaymentRecordId;
                const deductTokenSql = `UPDATE payment_transactions SET remaining_exams = remaining_exams - 1 WHERE id = ? AND remaining_exams < 9000`;
                
                db.query(deductTokenSql, [activeTxId], (deductErr) => {
                    if (deductErr) console.error("❌ Token deduction balance entry fault:", deductErr.message);
                    else console.log(`✓ Balance decremented cleanly for payment log row ID: ${activeTxId}`);
                });
            }

            req.session.hasCompletedActiveExamToken = true;
            req.session.lockedExamQuestionIds = [];
            res.json({ score: score, total: finalTotalDisplayCount });
        });
    });
});

app.post('/api/clear-session', (req, res) => {
    req.session.hasCompletedActiveExamToken = false;
    req.session.examStudentName  = null;
    req.session.examPhoneNumber  = null;
    req.session.lockedExamQuestionIds = [];
    req.session.activePaymentRecordId = null;
    res.json({ ok: true });
});

// ==========================================================================
// 💳 LOOPHOLE-FREE CUMULATIVE PRICING MATRIX & DRIVING SCHOOL ONBOARDING
// ==========================================================================

app.post('/api/payments/momo-push', (req, res) => {
    const { phoneNumber, checkoutIntentType, examQuantityVolume } = req.body;

    if (!phoneNumber || !checkoutIntentType) {
        return res.status(400).json({ success: false, error: 'Missing mandatory payment verification bounds.' });
    }

    let validationCheckString = phoneNumber.toString().replace(/[\s\-\+]+/g, '').trim();
    if (validationCheckString.startsWith('250')) {
        validationCheckString = '0' + validationCheckString.substring(3);
    }

    let carrierNetworkProvider = 'UNKNOWN';
    if (/^078|^079/.test(validationCheckString)) {
        carrierNetworkProvider = 'MTN_MOMO';
    } else if (/^072|^073/.test(validationCheckString)) {
        carrierNetworkProvider = 'AIRTEL_MONEY';
    }

    if (carrierNetworkProvider === 'UNKNOWN' || validationCheckString.length < 10) {
        return res.status(400).json({ success: false, error: 'Nomero yishuriwe ntabwo ari iy\'i Rwanda. Injiza MTN cyangwa Airtel.' });
    }

    let finalCalculatedBillingAmount = 0;
    let synchronizedBrandedPlanLabel = '';
    let startingExamsCountAllocation = 0;

    if (checkoutIntentType === 'SCHOOL') {
        finalCalculatedBillingAmount = 10000;
        synchronizedBrandedPlanLabel = 'School Driving Center Monthly Pass';
        startingExamsCountAllocation = 9999; 
    } else {
        const qty = parseInt(examQuantityVolume, 10) || 1;
        startingExamsCountAllocation = qty;

        if (qty <= 9) {
            finalCalculatedBillingAmount = qty * 100;
        } else if (qty <= 14) {
            finalCalculatedBillingAmount = (9 * 100) + ((qty - 9) * 80);
        } else if (qty <= 20) {
            finalCalculatedBillingAmount = (9 * 100) + (5 * 80) + ((qty - 14) * 70);
        } else {
            finalCalculatedBillingAmount = (9 * 100) + (5 * 80) + (6 * 70) + ((qty - 20) * 50);
        }

        synchronizedBrandedPlanLabel = `Personal Tiered Pass (${qty} Exams Package)`;
    }

    const uniqueTxRef = 'RWP_REF_' + Date.now();

    const insertTxSql = `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, status, remaining_exams) VALUES (?, ?, ?, ?, 'PENDING', ?)`;
    
    db.query(insertTxSql, [validationCheckString, finalCalculatedBillingAmount, synchronizedBrandedPlanLabel, uniqueTxRef, startingExamsCountAllocation], (insertErr) => {
        if (insertErr) return res.status(500).json({ success: false, error: 'Database Write Error: ' + insertErr.message });

        setTimeout(() => {
            const updateTxSql = `UPDATE payment_transactions SET status = 'SUCCESS' WHERE reference_id = ?`;
            db.query(updateTxSql, [uniqueTxRef], (updateErr) => {
                if (!updateErr) {
                    req.session.hasPaidPremiumAccess = true;
                    req.session.paidPlanType = synchronizedBrandedPlanLabel;
                    req.session.examPhoneNumber = validationCheckString;
                }
            });
        }, 4000);

        res.json({ success: true, referenceId: uniqueTxRef, provider: carrierNetworkProvider, allocatedPlan: synchronizedBrandedPlanLabel });
    });
});

app.get('/api/payments/verify/:refId', (req, res) => {
    const checkSql = `SELECT status, plan_name FROM payment_transactions WHERE reference_id = ?`;
    db.query(checkSql, [req.params.refId], (err, results) => {
        if (err || !results || results.length === 0) {
            return res.json({ status: 'PENDING' });
        }
        res.json({ status: results[0].status, plan: results[0].plan_name });
    });
});
// ==========================================================================
// 🏫 CORPORATE DRIVING SCHOOL ONBOARDING WORKFLOW (SMTP LIVE ROUTING)
// ==========================================================================

app.post('/api/school/register', (req, res) => {
    const { schoolName, email, phoneNumber } = req.body;

    if (!schoolName || !email || !phoneNumber) {
        return res.status(400).json({ success: false, error: 'Uzuza bisabwa byose: Izina, Email, na Telephone.' });
    }

    let cleanPhone = phoneNumber.toString().replace(/[\s\-\+]+/g, '').trim();
    if (cleanPhone.startsWith('250')) cleanPhone = '0' + cleanPhone.substring(3);

    const generatedOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const targetedRecipientEmail = email.trim().toLowerCase();

    const professionalHtmlEmailTemplate = `
        <div style="font-family:'Inter',sans-serif; max-width:550px; margin:0 auto; background:#f8fafc; padding:30px; border-radius:12px; border:1px solid #e2e8f0; color:#0f172a;">
            <div style="text-align:center; margin-bottom:24px;">
                <h2 style="color:#0b698b; text-transform:uppercase; letter-spacing:1px; margin:0; font-size:22px;">IKIZAME DRIVING SCHOOL</h2>
                <p style="font-size:12px; color:#64748b; margin-top:4px;">Sisitemu Igezweho y'Ibizamini n'Imfashanyigisho</p>
            </div>
            <div style="background:#ffffff; border-radius:8px; padding:24px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); border:1px solid #e2e8f0;">
                <p style="font-size:15px; font-weight:700; margin-bottom:12px; color:#1e293b;">Muraho ${schoolName.trim()},</p>
                <p style="font-size:14px; line-height:1.6; color:#475569; margin-bottom:20px;">Mwakiriye iyi email kuko muriko mufungura Konti y'Ishuri ryanyu rya Shofere kuri IKIZAME Portal. Kokesha kode y'umutekano ikurikira ngo wemeze email yawe:</p>
                
                <div style="background:#f1f5f9; padding:16px; border-radius:8px; text-align:center; font-size:28px; font-weight:800; letter-spacing:6px; color:#0b698b; border:1px dashed #cbd5e1; margin-bottom:20px;">
                    ${generatedOtpCode}
                </div>
                
                <p style="font-size:12px; color:#ef4444; font-weight:600; line-height:1.4; margin-bottom:0;">⚠️ Nyamuneka ntiwitegereze guha iyi kode undi muntu uwo ari we wese ku bw'umutekano wa Konti y'ishuri ryawe.</p>
            </div>
            <div style="text-align:center; margin-top:24px; font-size:11px; color:#94a3b8;">
                &copy; 2026 IKIZAME Platform &bull; Developed by Dotado Stationery Store Ltd
            </div>
        </div>
    `;

    const emailTransmissionPacketOptions = {
        from: '"IKIZAME Support Engine" <nzerneste250@gmail.com>',
        to: targetedRecipientEmail,
        subject: `${generatedOtpCode} ni kode yawe y'umutekano — IKIZAME Portal`,
        html: professionalHtmlEmailTemplate
    };

    const checkEmailSql = `SELECT id FROM driving_schools WHERE email = ?`;
    db.query(checkEmailSql, [targetedRecipientEmail], (err, emailResults) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        const saveQueryText = emailResults && emailResults.length > 0
            ? `UPDATE driving_schools SET school_name = ?, phone_number = ?, otp_code = ? WHERE email = ?`
            : `INSERT INTO driving_schools (school_name, email, phone_number, otp_code, is_verified) VALUES (?, ?, ?, ?, 0)`;

        const saveQueryParams = emailResults && emailResults.length > 0
            ? [schoolName.trim(), cleanPhone, generatedOtpCode, targetedRecipientEmail]
            : [schoolName.trim(), targetedRecipientEmail, cleanPhone, generatedOtpCode];

        db.query(saveQueryText, saveQueryParams, (dbErr) => {
            if (dbErr) return res.status(500).json({ success: false, error: dbErr.message });

            emailTransmissionTransportGateway.sendMail(emailTransmissionPacketOptions, (mailSendError) => {
                if (mailSendError) {
                    // Log the FULL error so the real cause (wrong host, bad app password,
                    // network block, etc.) is visible in the server console/terminal.
                    console.error('❌ SMTP Dispatch Core Block Fault — full details:', mailSendError);
                    return res.status(500).json({ success: false, error: 'Kugenzura Mail byanze: Configura neza SMTP parameters. (Reba terminal kugira ngo umenye impamvu nyayo.)' });
                }
                
                console.log(`✓ Real-time verification mail safely transmitted live straight to recipient inbox: [${targetedRecipientEmail}]`);
                res.json({ success: true, message: 'Konti yafunguwe. Reba kode ya OTP muri Email yawe hanyuma uyinjize hano.', email: targetedRecipientEmail });
            });
        });
    });
});

app.post('/api/school/verify-otp', (req, res) => {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
        return res.status(400).json({ success: false, error: 'Injiza email hamwe na OTP yoherejwe.' });
    }

    const verifyOtpSql = `SELECT id FROM driving_schools WHERE email = ? AND otp_code = ?`;
    db.query(verifyOtpSql, [email.trim().toLowerCase(), otpCode.trim()], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (!results || results.length === 0) {
            return res.status(400).json({ success: false, error: 'OTP code wanditse ntabwo ari yo. Subira ugerageze!' });
        }

        res.json({ success: true, message: 'OTP yemejwe neza. Shira umutekano (Password) ku konti yawe sasa.' });
    });
});

app.post('/api/school/set-password', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password || password.trim().length < 6) {
        return res.status(400).json({ success: false, error: 'Password igomba kuba ifite inyandiko 6 cyangwa zirenga.' });
    }

    const setPassSql = `UPDATE driving_schools SET password_hash = ?, is_verified = 1, otp_code = NULL WHERE email = ?`;
    db.query(setPassSql, [password.trim(), email.trim().toLowerCase()], (err) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: 'Password yaguzwe neza! Sasa ushobora kwinjira (Login) muri Konti y\'Ishuri.' });
    });
});

app.post('/api/school/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Andika Email na Password byawe.' });
    }

    const loginSql = `SELECT id, school_name, email, is_verified FROM driving_schools WHERE email = ? AND password_hash = ?`;
    db.query(loginSql, [email.trim().toLowerCase(), password.trim()], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        if (!results || results.length === 0) {
            return res.status(401).json({ success: false, error: 'Email cyangwa Password wanditse ntabwo ari byo.' });
        }

        const school = results[0];
        if (school.is_verified !== 1) {
            return res.status(403).json({ success: false, error: 'Konti yawe ntabwo iratungana neza. Subira inyuma uyivugurure.' });
        }

        req.session.isSchoolAuthenticated = true;
        req.session.schoolAccountId = school.id;
        req.session.schoolAccountName = school.school_name;
        req.session.schoolAccountEmail = school.email;

        res.json({ success: true, message: 'Kwinjira byakunze! Urimo guhindurirwa icyerekezo...', redirect: '/school-dashboard' });
    });
});

app.get('/api/school/wallet-metrics', (req, res) => {
    if (!req.session || !req.session.isSchoolAuthenticated) {
        return res.status(401).json({ success: false, error: 'Session expired. Kwinjira bushasha.' });
    }

    const schoolId = req.session.schoolAccountId;

    const walletSql = `SELECT SUM(remaining_exams) as total_exams_pool FROM payment_transactions WHERE school_id = ? AND status = 'SUCCESS' AND remaining_exams > 0`;
    db.query(walletSql, [schoolId], (err, results) => {
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

app.post('/api/school/renew-license', (req, res) => {
    if (!req.session || !req.session.isSchoolAuthenticated) {
        return res.status(401).json({ success: false, error: 'Session timeout error.' });
    }

    const { phoneNumber } = req.body;
    const schoolId = req.session.schoolAccountId;

    if (!phoneNumber || phoneNumber.trim().length < 10) {
        return res.status(400).json({ success: false, error: 'Injiza nomero ya telephone yuzuye.' });
    }

    let cleanPhone = phoneNumber.toString().replace(/[\s\-\+]+/g, '').trim();
    if (cleanPhone.startsWith('250')) cleanPhone = '0' + cleanPhone.substring(3);

    const flatSchoolRateAmount = 10000;
    const uniqueTxRef = 'SCH_REF_' + Date.now();
    const institutionalPlanLabel = `School Driving Pass (Licensed Owner: ${req.session.schoolAccountName})`;
    
    const startingExamsCountAllocation = 9999; 

    const insertSchoolPaymentSql = `INSERT INTO payment_transactions (phone_number, amount, plan_name, reference_id, status, remaining_exams, school_id) VALUES (?, ?, ?, ?, 'PENDING', ?, ?)`;
    
    db.query(insertSchoolPaymentSql, [cleanPhone, flatSchoolRateAmount, institutionalPlanLabel, uniqueTxRef, startingExamsCountAllocation, schoolId], (insertErr) => {
        if (insertErr) return res.status(500).json({ success: false, error: 'Database process error: ' + insertErr.message });

        setTimeout(() => {
                        const updateStatusSql = `UPDATE payment_transactions SET status = 'SUCCESS' WHERE reference_id = ?`;
            db.query(updateStatusSql, [uniqueTxRef], (upErr) => {
                if (!upErr) {
                    req.session.hasPaidPremiumAccess = true;
                    req.session.paidPlanType = institutionalPlanLabel;
                    req.session.examPhoneNumber = cleanPhone;
                }
            });
        }, 4000);

        res.json({ success: true, referenceId: uniqueTxRef, message: 'Processing your payment...' });
    });
});

app.get('/api/school/logout', (req, res) => {
    req.session.isSchoolAuthenticated = false;
    req.session.schoolAccountId = null;
    req.session.schoolAccountName = null;
    res.redirect('/school-auth');
});

// ==========================================================================
// ⚡ ANTI-SLEEP COUPLER ENGINE: Keeps Free Tiers Awake 24/7
// ==========================================================================
const RENDER_EXTERNAL_APP_URL = 'https://onrender.com';
setInterval(() => {
    if (!isLocalMachineHost) {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        fetch(RENDER_EXTERNAL_APP_URL)
            .then(() => console.log('⚡ Self-Handshake KeepAlive Ping Transmitted Successfully.'))
            .catch((err) => console.log('⚠️ KeepAlive Ping Blocked/Offline: ', err.message));
    }
}, 14 * 60 * 1000);

// 🔍 AMANOTA ENGINE: Fetch attempts matching a phone number
app.get('/api/amanota/lookup/:phone', (req, res) => {
    let searchPhone = req.params.phone.trim();
    if (!searchPhone.startsWith('+250') && searchPhone.startsWith('7')) searchPhone = '+250' + searchPhone;

    const sql = `SELECT id, student_name, score, total_questions, created_at FROM exam_attempts WHERE phone_number = ? ORDER BY id DESC`;
    db.query(sql, [searchPhone], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================================================
// 🔍 FIXED AMANOTA ENGINE: Reconstruct a specific historical exam review session
// ==========================================================================
app.get('/api/amanota/review/:id', (req, res) => {
    const sql = `SELECT student_name, phone_number, score, total_questions, student_answers, exam_questions_snapshot FROM exam_attempts WHERE id = ?`;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results || results.length === 0) return res.status(404).json({ error: 'Exam review logs snapshot data not found.' });
        
        const attempt = results[0];
        req.session.hasCompletedActiveExamToken = true;
        
        const historicalQuestionsPool = JSON.parse(attempt.exam_questions_snapshot);
        const historicalAnswersMap = JSON.parse(attempt.student_answers);

        const filteredAttemptQuestions = historicalQuestionsPool.filter(q => {
            return historicalAnswersMap.hasOwnProperty(`question_${q.id}`);
        });

        res.json({
            studentName: attempt.student_name,
            phoneNumber: attempt.phone_number,
            score: attempt.score,
            total: attempt.total_questions,
            answers: historicalAnswersMap,
            questions: filteredAttemptQuestions.length > 0 ? filteredAttemptQuestions : historicalQuestionsPool.slice(0, 20)
        });
    });
});

// ==========================================================================
// 👥 GROUPED STUDENT PERFORMANCE LIST: one row per student (by phone number)
// ==========================================================================
app.get('/api/admin/students', requireAdminLogin, (req, res) => {
    const sql = `
        SELECT
            phone_number,
            (SELECT student_name FROM exam_attempts ea2
                WHERE ea2.phone_number = ea.phone_number
                ORDER BY ea2.id DESC LIMIT 1) AS student_name,
            COUNT(*) AS totalExams,
            AVG(score) AS averageScore,
            MAX(created_at) AS lastAttemptDate
        FROM exam_attempts ea
        GROUP BY phone_number
        ORDER BY lastAttemptDate DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const formatted = results.map(r => ({
            phoneNumber: r.phone_number,
            studentName: r.student_name,
            totalExams: r.totalExams,
            averageScore: r.averageScore ? parseFloat(r.averageScore).toFixed(1) : '0.0',
            lastAttemptDate: r.lastAttemptDate
        }));
        res.json(formatted);
    });
});

// ==========================================================================
// 📋 PER-STUDENT ATTEMPT HISTORY: all exams a single student has taken
// ==========================================================================
app.get('/api/admin/student-attempts/:phone', requireAdminLogin, (req, res) => {
    const phone = req.params.phone;
    const sql = `
        SELECT id, score, total_questions, created_at
        FROM exam_attempts
        WHERE phone_number = ?
        ORDER BY created_at DESC
    `;
    db.query(sql, [phone], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================================================
// 📊 STUDENT PERFORMANCE METRICS ENGINE API (100% FREE ANALYTICS)
// ==========================================================================
app.get('/api/admin/performance-stats', requireAdminLogin, (req, res) => {
    const overviewSql = `
        SELECT 
            COUNT(*) as totalAttempts,
            SUM(CASE WHEN score >= 12 THEN 1 ELSE 0 END) as passedCount,
            AVG(score) as averageScore
        FROM exam_attempts
    `;

    db.query(overviewSql, (err, overviewResults) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const stats = overviewResults[0] || { totalAttempts: 0, passedCount: 0, averageScore: 0 };
        const total = stats.totalAttempts || 0;
        const passed = stats.passedCount || 0;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
        const avgScore = stats.averageScore ? parseFloat(stats.averageScore).toFixed(1) : '0.0';

        res.json({ total, passed, passRate, avgScore });
    });
});

// ==========================================================================
// 🚀 SERVER INIT GATEWAY 
// ==========================================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 IKIZAME Core Server deployed smoothly on port ${PORT}`);
});