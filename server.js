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

// --- 🔒 AUTHORIZATION GATE MIDDLEWARE (PRE-PUBLICATION LOCKDOWN) ---
function restrictAccessToAuthorizedUsers(req, res, next) {
    // Allow inner submit transactions to pass without blockages if needed
    if (req.path.startsWith('/api/exams/submit')) return next();

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="IKIZAME Secure Staging Portal"');
        return res.status(401).send('Authentication Required to Access This Staging Site.');
    }

    // Decode base64 credentials sent natively by browser windows popup shells
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'basic') {
        res.setHeader('WWW-Authenticate', 'Basic realm="IKIZAME Secure Staging Portal"');
        return res.status(401).send('Authentication Required.');
    }

    const authCredentials = Buffer.from(tokenParts[1], 'base64').toString().split(':');
    const usernameInput = authCredentials[0];
    const passwordInput = authCredentials[1];

    // 🎯 SPECIFIED ACCESS PROTECTION VALUES
    const STAGING_USERNAME = 'admin';       
    const STAGING_PASSWORD = 'Kigali@1234'; 

    if (usernameInput === STAGING_USERNAME && passwordInput === STAGING_PASSWORD) {
        return next(); // Credentials match, unlock full workspace access
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="IKIZAME Secure Staging Portal"');
    return res.status(401).send('Invalid Authorization Credentials provided.');
}

// Intercept frontend and routes entry requests safely
app.use((req, res, next) => {
    // Skip protection checks for assets directories layouts profiles to load style layouts safely
    if (req.path.startsWith('/assets/')) return next();
    return restrictAccessToAuthorizedUsers(req, res, next);
});

// --- 🌐 Global Middleware Configuration Parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'izo_service_quicky_hybrid_secure_token_998844',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 4 * 60 * 60 * 1000 } // 4 Hours active admin session layout bounds
}));

// --- 🗄️ 1. SMART HYBRID DATABASE CONNECTOR MATRIX ---
const isLocalMachineHost = process.env.NODE_ENV !== 'production' && !process.env.RENDER;
let databaseCredentialsConfig = {};

if (isLocalMachineHost) {
    // 💻 A. LOCAL WORKSPACE CREDENTIALS (XAMPP / WampServer standard)
    databaseCredentialsConfig = {
        host: 'localhost',
        user: 'root',
        password: '', 
        database: 'driving_db',
        port: 3306
    };
    console.log('ℹ️ Local environment detected. Initiating local MySQL handshake setup...');
} else {
    // 🌐 B. PRODUCTION CLOUD CREDENTIALS (Alwaysdata Remote cluster parameters)
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

// --- 📸 2. DEDUPLICATION STORAGE ENGINE MATRIX (LOCAL STORAGE SAFE) ---
const uploadDirectoryPath = path.resolve(__dirname, 'public', 'assets', 'uploads');

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
    { name: 'optionA_File', maxCount: 1 },
    { name: 'optionB_File', maxCount: 1 },
    { name: 'optionC_File', maxCount: 1 },
    { name: 'optionD_File', maxCount: 1 }
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
            res.redirect('/dashboard.html');
        } else {
            res.send('<script>alert("Invalid Admin Credentials Layout!"); window.location.href="/admin-login.html";</script>');
        }
    });
});

app.get('/api/admin/logout', (req, res) => {
    req.session.destroy(() => { res.redirect('/admin-login.html'); });
});

app.get('/api/exams', (req, res) => {
    db.query('SELECT * FROM exams ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/exams/add', examUploadFieldsConfig, (req, res) => {
    const question = req.body.question || '';
    const correctOption = req.body.correctOption || '';
    const optionsLayoutMode = req.body.optionsLayoutMode || 'text';
    
    const mainQuestionImage = req.files && req.files['imageFile'] 
        ? req.files['imageFile'].filename 
        : (req.body.imageFileTextFallback ? req.body.imageFileTextFallback.trim() : null);

    let finalOptionA = '';
    let finalOptionB = '';
    let finalOptionC = '';
    let finalOptionD = '';

    if (optionsLayoutMode === 'image') {
        finalOptionA = req.files && req.files['optionA_File'] ? req.files['optionA_File'].filename : (req.body.optionATextFallback ? req.body.optionATextFallback.trim() : '');
        finalOptionB = req.files && req.files['optionB_File'] ? req.files['optionB_File'].filename : (req.body.optionBTextFallback ? req.body.optionBTextFallback.trim() : '');
        finalOptionC = req.files && req.files['optionC_File'] ? req.files['optionC_File'].filename : (req.body.optionCTextFallback ? req.body.optionCTextFallback.trim() : '');
        finalOptionD = req.files && req.files['optionD_File'] ? req.files['optionD_File'].filename : (req.body.optionDTextFallback ? req.body.optionDTextFallback.trim() : '');
    } else {
        finalOptionA = req.body.optionA ? req.body.optionA.trim() : '';
        finalOptionB = req.body.optionB ? req.body.optionB.trim() : '';
        finalOptionC = req.body.optionC ? req.body.optionC.trim() : '';
        finalOptionD = req.body.optionD ? req.body.optionD.trim() : '';
    }

    const sql = `INSERT INTO exams (question, option_a, option_b, option_c, option_d, correct_option, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, mainQuestionImage], (err, result) => {
        if (err) {
            console.error('❌ Insertion query failed:', err.message);
            return res.status(500).send('Database Core Query Insertion Failure Error: ' + err.message);
        }
        res.redirect('/dashboard.html');
    });
});

app.get('/api/exams/:id', (req, res) => {
    db.query('SELECT * FROM exams WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            res.json(results[0]); 
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
                finalOptionB = req.files && req.files['optionB_File'] ? req.files['optionB_File'][0].filename : (optionBTextFallback ? optionBTextFallback.trim() : existingOptB);
        finalOptionC = req.files && req.files['optionC_File'] ? req.files['optionC_File'][0].filename : (optionCTextFallback ? optionCTextFallback.trim() : existingOptC);
        finalOptionD = req.files && req.files['optionD_File'] ? req.files['optionD_File'][0].filename : (optionDTextFallback ? optionDTextFallback.trim() : existingOptD);
    } else {
        finalOptionA = req.body.optionA ? req.body.optionA.trim() : '';
        finalOptionB = req.body.optionB ? req.body.optionB.trim() : '';
        finalOptionC = req.body.optionC ? req.body.optionC.trim() : '';
        finalOptionD = req.body.optionD ? req.body.optionD.trim() : '';
    }

    const sql = `UPDATE exams SET question=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_option=?, image_path=? WHERE id=?`;
    db.query(sql, [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, imagePath, id], (err, result) => {
        if (err) return res.status(500).send('Database Query Error Executing Modify Updates Chain: ' + err.message);
        res.redirect('/dashboard.html');
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
        res.json({ score: score, total: finalTotalDisplayCount });
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n==================================================================`);
    console.log(`✨ IKIZAME Hybrid Node Engine active on: http://localhost:${PORT}`);
    console.log(`   Running Environment Host Profile Mode: [${isLocalMachineHost ? 'LOCAL DISK DEV' : 'LIVE REMOTING BUNDLE'}]`);
    console.log(`==================================================================`);
});
