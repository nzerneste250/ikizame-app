// ==========================================================================
// 🚀 IKIZAME HYBRID COUPLER PLATFORM SERVER ENGINE (LOCAL & PRODUCTION SYNC)
// ==========================================================================
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');

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
// 🛡️ CLEAN URL ROUTING + HARDENED ACCESS CONTROL GATES
// ==========================================================================
app.get('/',           (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/index',      (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin-login',(req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));

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
// ==========================================================================
// 🛡️ SECURE GATE FOR EDIT QUESTION PORTAL
// ==========================================================================
app.get('/edit-exam', (req, res) => {
    // Verifies the user has a valid active admin session
    if (req.session && req.session.isAdminAuthenticated) {
        return res.sendFile(path.join(__dirname, 'public', 'edit-exam.html'));
    }
    // Sends unauthorized visitors straight back to login terminal
    res.redirect('/admin-login');
});

// ==========================================================================
// ⚙️ SYSTEM PERFORMANCE SECURE EXTENSIONLESS NAVIGATION LINK AGENT
// ==========================================================================
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
        cb(null, uploadDirectoryPath); // Saves securely into public/assets/uploads folder
    },
    filename: (req, file, cb) => {
        const cleanName = 'resource_' + Date.now() + '_' + file.originalname.replace(/\s+/g, '_');
        cb(null, cleanName);
    }
});
const resourceUpload = multer({ 
    storage: resourceStorageEngine,
    limits: { fileSize: 20 * 1024 * 1024 } // 20 Megabytes fallback limit protection
});
// ==========================================================================
// 📄 LEARNING RESOURCES (IFASHANYIGISHO) DYNAMIC CONTROLLER PIPELINE BUNDLE
// ==========================================================================

// A. Secure Extensionless Navigation Gate for Upload Resource View
app.get('/upload-resource', (req, res) => {
    if (req.session && req.session.isAdminAuthenticated) {
        return res.sendFile(path.join(__dirname, 'public', 'upload-resource.html'));
    }
    res.redirect('/admin-login');
});

// B. Secure Extensionless Navigation Gate for Student Material Library View
app.get('/ifashanyigisho', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ifashanyigisho.html'));
});
// C. API: Admin Submit New Learning Document (Aligned with allow_read/allow_download)
app.post('/api/resources/add', requireAdminLogin, resourceUpload.single('resourceFile'), (req, res) => {
    const { title, description, canRead, canDownload } = req.body;
    if (!req.file || !title) {
        return res.status(400).send('Database Constraint Failure: Title and file upload are required parameters.');
    }
    
    const fileName = req.file.filename;
    const fileType = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    
    // Checkbox value evaluation fallbacks
    const allowRead = canRead === 'on' ? 1 : 0;
    const allowDownload = canDownload === 'on' ? 1 : 0;

    // 🎯 FIXED: Columns mapped exactly to your database: allow_read & allow_download
    const sql = `INSERT INTO learning_resources (title, description, file_name, file_type, allow_read, allow_download) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(sql, [title.trim(), description ? description.trim() : '', fileName, fileType, allowRead, allowDownload], (err) => {
        if (err) return res.status(500).send('Database Query Failure: ' + err.message);
        res.redirect('/upload-resource');
    });
});
// D. API: Fetch All Available Resources (Public Access for Students & Admins)
app.get('/api/resources', (req, res) => {
    db.query('SELECT * FROM learning_resources ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// E. API: Admin Delete Specific Learning Document
app.delete('/api/resources/delete/:id', requireAdminLogin, (req, res) => {
    db.query('DELETE FROM learning_resources WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// F. NEW API: Fetch Single Resource Metadata Details for Edit Pre-population
app.get('/api/resources/:id', requireAdminLogin, (req, res) => {
    db.query('SELECT * FROM learning_resources WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) res.json(results[0]);
        else res.status(404).send('Resource metadata log entry point not found.');
    });
});
// G. API: Admin Modify Existing Learning Document Fields
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

    // 🎯 FIXED: Columns mapped exactly to your database: allow_read & allow_download
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

app.post('/api/register', (req, res) => {
    const { studentName, phoneNumber } = req.body;
    if (!studentName || !phoneNumber) {
        return res.status(400).json({ error: 'Amazina na telefone birakenewe.' });
    }
    req.session.examStudentName  = studentName.trim();
    req.session.examPhoneNumber  = phoneNumber.trim();
    req.session.lockedExamQuestionIds = [];
    req.session.hasCompletedActiveExamToken = false;
    res.json({ ok: true });
});

// ==========================================================================
// 🎲 RESOLVED SHUFFLED QUESTION ENGINE ROUTE
// ==========================================================================
app.get('/api/exams', (req, res) => {
    db.query('SELECT * FROM exams ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results || results.length === 0) return res.json([]);

        // 🚀 UNCONDITIONAL RETRIEVAL CONTROL: If admin session, bypass shuffle filter and return all rows
        if (req.session && req.session.isAdminAuthenticated) {
            return res.json(results);
        }

        // --- Student Session Mode Loop (Locks exact isolated 20 shuffled slice) ---
        if (req.session.lockedExamQuestionIds && req.session.lockedExamQuestionIds.length > 0) {
            const lockedQuestions = req.session.lockedExamQuestionIds
                .map(id => results.find(q => q.id === id))
                .filter(Boolean); 
            return res.json(lockedQuestions);
        }

        // 🎯 FIXED HIGH-ENTROPY PERMUTATION MOTOR: Avoids undefined hrtime calculation errors
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
    db.query(sql, [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, mainQuestionImage], (err, result) => {
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
    db.query(updateSql, [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, imagePath, id], (err, result) => {
        if (err) return res.status(500).send('Database Query Error Executing Modify Updates Chain: ' + err.message);
        res.redirect('/dashboard');
    });
});

app.delete('/api/exams/delete/:id', (req, res) => {
    db.query('DELETE FROM exams WHERE id = ?', [req.params.id], (err, result) => {
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
    res.json({ ok: true });
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
        if (results.length === 0) return res.status(404).json({ error: 'Exam review logs snapshot data not found.' });
        
        const attempt = results[0];
        
        // Authorize session to bypass secure page gates
        req.session.hasCompletedActiveExamToken = true;
        
        const historicalQuestionsPool = JSON.parse(attempt.exam_questions_snapshot);
        const historicalAnswersMap = JSON.parse(attempt.student_answers);

        // 🎯 FIX: Extract ONLY the 20 questions that the user actually answered during this attempt!
        const filteredAttemptQuestions = historicalQuestionsPool.filter(q => {
            return historicalAnswersMap.hasOwnProperty(`question_${q.id}`);
        });

        res.json({
            studentName: attempt.student_name,
            phoneNumber: attempt.phone_number,
            score: attempt.score,
            total: attempt.total_questions,
            answers: historicalAnswersMap,
            // If the filtered array is empty fallback safely to the raw pool
            questions: filteredAttemptQuestions.length > 0 ? filteredAttemptQuestions : historicalQuestionsPool.slice(0, 20)
        });
    });
});
// ==========================================================================
// 📊 STUDENT PERFORMANCE METRICS ENGINE API (100% FREE ANALYTICS)
// ==========================================================================
app.get('/api/admin/performance-stats', requireAdminLogin, (req, res) => {
    // Query 1: Fetch overview metrics logs
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

        // Query 2: Fetch Top 10 Leaderboard records
        const leaderboardSql = `
            SELECT student_name, phone_number, score, total_questions, created_at 
            FROM exam_attempts 
            ORDER BY score DESC, id DESC 
            LIMIT 10
        `;

        db.query(leaderboardSql, (err, leaderboardResults) => {
            if (err) return res.status(500).json({ error: err.message });

            // Query 3: Fetch all raw data dumps to parse the trickiest questions
            db.query('SELECT id, student_answers, exam_questions_snapshot FROM exam_attempts', (err, rawAttempts) => {
                if (err) return res.status(500).json({ error: err.message });

                const failureCounterMap = {};
                const questionTextMap = {};

                rawAttempts.forEach(attempt => {
                    try {
                        const answers = JSON.parse(attempt.student_answers);
                        const questionsSnapshot = JSON.parse(attempt.exam_questions_snapshot);

                        questionsSnapshot.forEach(q => {
                            questionTextMap[q.id] = q.question;
                            const answerKey = `question_${q.id}`;
                            const studentChoice = answers[q.id] || answers[answerKey] || null;
                            
                            // If user choice exists but doesn't match the correct option, increment failure counter
                            if (studentChoice && studentChoice !== q.correct_option) {
                                failureCounterMap[q.id] = (failureCounterMap[q.id] || 0) + 1;
                            }
                        });
                    } catch (e) { /* Skip corrupted JSON strings rows safely */ }
                });

                // Sort questions from highest failure count to lowest
                const trickyQuestionsArray = Object.keys(failureCounterMap).map(qId => {
                    return {
                        id: qId,
                        question: questionTextMap[qId] || 'Unknown Question Statement',
                        failCount: failureCounterMap[qId]
                    };
                }).sort((a, b) => b.failCount - a.failCount).slice(0, 5); // Isolate Top 5 hardest entries

                // Send the compiled metrics payload back to the admin controller
                res.json({
                    totalAttempts: total,
                    passRate: passRate,
                    averageScore: avgScore,
                    leaderboard: leaderboardResults,
                    trickyQuestions: trickyQuestionsArray
                });
            });
        });
    });
});
// ==========================================================================
// ⏱️ AUTOMATED DATA PRUNER ENGINE: Cleans attempts older than 3 weeks (21 days)
// ==========================================================================
function executeDatabaseGarbageCollection() {
    const pruneQuerySql = `DELETE FROM exam_attempts WHERE created_at < NOW() - INTERVAL 3 WEEK`;
    db.query(pruneQuerySql, (err, result) => {
        if (err) {
            console.error('❌ Data pruner garbage collection cycle failed:', err.message);
        } else if (result.affectedRows > 0) {
            console.log(`🧹 Data Pruner Active: Cleared ${result.affectedRows} expired exam records from storage.`);
        }
    });
}

executeDatabaseGarbageCollection();
setInterval(executeDatabaseGarbageCollection, 6 * 60 * 60 * 1000);

// 🚨 LEAVE PORT LISTENER CODE AT THE ABSOLUTE BOTTOM OF THE FILE
const PORT = process.env.PORT || 8080; 
app.listen(PORT, () => {
    console.log(`\n==================================================================`);
    console.log(`✨ IKIZAME Hybrid Node Engine active on: http://localhost:${PORT}`);
    console.log(`   Running Environment Host Profile Mode: [${isLocalMachineHost ? 'LOCAL DISK DEV' : 'LIVE REMOTING BUNDLE'}]`);
    console.log(`==================================================================`);
});

