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
// ⚙️ SYSTEM PERFORMANCE SECURE EXTENSIONLESS NAVIGATION LINK AGENT
// ==========================================================================
app.get('/system-performance', (req, res) => {
    // Restrict access so only authenticated administrators can open the file
    if (req.session && req.session.isAdminAuthenticated) {
        return res.sendFile(path.join(__dirname, 'public', 'system-performance.html'));
    }
    // Unauthorized visitors get sent straight back to the login terminal
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
// 🎯 CRITICAL PATH RECALIBRATION: Locks absolute local path on windows machine to avoid image drop errors
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
    { name: 'optiona_File', maxCount: 1 }, // Changed from optionA_File to optiona_File
    { name: 'optionb_File', maxCount: 1 }, // Changed from optionB_File to optionb_File
    { name: 'optionc_File', maxCount: 1 }, // Changed from optionC_File to optionc_File
    { name: 'optiond_File', maxCount: 1 }  // Changed from optionD_File to optiond_File
]);
function requireAdminLogin(req, res, next) {
    if (req.session && req.session.isAdminAuthenticated) {
        return next();
    }
    res.status(401).send('Unauthorized entry setup. Please access portals with valid admin login actions loops.');
}

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
// 🎲 UNRESTRICTED ENDPOINT REFACTORING MATRIX
//    - Handles clean multi-role response routing parameters
//    - Returns ALL rows (70+) unconditionally if hit by an authenticated admin dashboard panel
//    - Returns isolated 20 shuffled slice items if hit by an active candidate student session
// ==========================================================================
app.get('/api/exams', (req, res) => {
    db.query('SELECT * FROM exams ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!results || results.length === 0) return res.json([]);

        // 🚀 UNCONDITIONAL RETRIEVAL CONTROL: If it is an admin session, bypass shuffle filter and return all rows
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

        const pool = [...results];
        const hrtime = process.hrtime(); 
        const entropySalt = Date.now() * 1000000 + hrtime[1]; 

        for (let i = pool.length - 1; i > 0; i--) {
            const entropy = (entropySalt + i * 2654435761) >>> 0; 
            const j = entropy % (i + 1);
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
    
    // 🎯 FIX 1: Extracted outside the conditional blocks so it captures the main description image in BOTH text and image modes!
    const mainQuestionImage = req.files && req.files['imageFile'] && req.files['imageFile'][0]
        ? req.files['imageFile'][0].filename 
        : (req.body.imageFileTextFallback ? req.body.imageFileTextFallback.trim() : null);

    let finalOptionA = '';
    let finalOptionB = '';
    let finalOptionC = '';
    let finalOptionD = '';

    if (optionsLayoutMode === 'image') {
        // 🎯 FIX 2: Standardized file keys to match lowercase naming parameters from your dynamic frontend input wrappers!
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

    // Fallback protection check to prevent column constraint crashes
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
            // 🎯 FIXED DATA FORMAT: Return the array container directly. 
            // This allows the frontend's Array.isArray() check to parse it seamlessly.
            res.json(results);
        } else {
            res.status(404).json({ error: 'Record reference object mapping element targets not found.' });
        }
    });
});
app.post('/api/exams/edit', examUploadFieldsConfig, (req, res) => {
    const { id, question, correctOption, optionsLayoutMode, existingImagePath, existingOptA, existingOptB, existingOptC, existingOptD, imageFileTextFallback, optionATextFallback, optionBTextFallback, optionCTextFallback, optionDTextFallback } = req.body;
    
    const imagePath = req.files && req.files['imageFile']
        ? req.files['imageFile'].filename
        : (imageFileTextFallback ? imageFileTextFallback.trim() : existingImagePath);

    let finalOptionA = '';
    let finalOptionB = '';
    let finalOptionC = '';
    let finalOptionD = '';

    if (optionsLayoutMode === 'image') {
        finalOptionA = req.files && req.files['optionA_File'] ? req.files['optionA_File'].filename : (optionATextFallback ? optionATextFallback.trim() : existingOptA);
        finalOptionB = req.files && req.files['optionB_File'] ? req.files['optionB_File'].filename : (optionBTextFallback ? optionBTextFallback.trim() : existingOptB);
        finalOptionC = req.files && req.files['optionC_File'] ? req.files['optionC_File'].filename : (optionCTextFallback ? optionCTextFallback.trim() : existingOptC);
        finalOptionD = req.files && req.files['optionD_File'] ? req.files['optionD_File'].filename : (optionDTextFallback ? optionDTextFallback.trim() : existingOptD);
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
    db.query('SELECT id, correct_option FROM exams', (err, exams) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let score = 0;
        let evaluatedCount = 0;

        exams.forEach(exam => {
            const answerKey = `question_${exam.id}`;
            if (studentAnswers.hasOwnProperty(answerKey)) {
                evaluatedCount++;
                if (studentAnswers[answerKey] === exam.correct_option) {
                    score++;
                }
            }
        });

        const finalTotalDisplayCount = evaluatedCount > 0 ? evaluatedCount : 20;

        req.session.hasCompletedActiveExamToken = true;
        req.session.lockedExamQuestionIds = [];

        res.json({ score: score, total: finalTotalDisplayCount });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n==================================================================`);
    console.log(`✨ IKIZAME Hybrid Node Engine active on: http://localhost:${PORT}`);
    console.log(`   Running Environment Host Profile Mode: [${isLocalMachineHost ? 'LOCAL DISK DEV' : 'LIVE REMOTING BUNDLE'}]`);
    console.log(`==================================================================`);
});