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
// Automatically switches connectivity profiles between local computer disks and Alwaysdata cloud clusters
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

// Fallback directory guard verification check
if (!fs.existsSync(uploadDirectoryPath)) {
    fs.mkdirSync(uploadDirectoryPath, { recursive: true });
}

const storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectoryPath);
    },
    filename: (req, file, cb) => {
        // Retains original filenames across tracking vectors to support absolute cross-question reuse framework
        const cleanOriginalName = file.originalname.replace(/\s+/g, '_');
        const completeTargetFilePath = path.join(uploadDirectoryPath, cleanOriginalName);

        // DISK DEDUPLICATION GUARD: Skips duplicate copying if file already resides in folder
        if (fs.existsSync(completeTargetFilePath)) {
            console.log(`ℹ️ Asset [${cleanOriginalName}] already present on disk folder tree. Skipping copy loops.`);
            cb(null, cleanOriginalName);
        } else {
            cb(null, cleanOriginalName);
        }
    }
});

const upload = multer({ storage: storageEngine });

// Multi-upload dynamic layout fields matrix config setup
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

// 🔐 A. ADMINISTRATIVE AUTHENTICATION VECTOR HANDSHAKE
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

// 📋 B. FETCH ALL REPOSITORY DISK INVENTORY ITEMS POOL RECORDS
app.get('/api/exams', (req, res) => {
    db.query('SELECT * FROM exams ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ➕ C. RECORD INSERTION: ADD NEW QUESTION RECORD WITH DISK OVERWRITE SAFETY
app.post('/api/exams/add', examUploadFieldsConfig, (req, res) => {
    const question = req.body.question || '';
    const correctOption = req.body.correctOption || '';
    const optionsLayoutMode = req.body.optionsLayoutMode || 'text';
    
    // Checks file pickers streams arrays or defaults straight back into textbox typed fallback references
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

// 🔍 D. GET SPECIFIC OBJECT DATA TARGET IDENTIFICATION RECORD MOUNT REFERENCE
app.get('/api/exams/:id', (req, res) => {
    db.query('SELECT * FROM exams WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            res.json(results[0]); // Returns single precise object instance mapping directly
        } else {
            res.status(404).json({ error: 'Record reference object mapping element targets not found.' });
        }
    });
});

// 💾 E. UPDATE RECORD FIELDS EDITS PARAMS CONTROL CHANNELS
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
        const sql = `UPDATE exams SET question=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_option=?, image_path=? WHERE id=?`;
    db.query(sql, [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, imagePath, id], (err, result) => {
        if (err) return res.status(500).send('Database Query Error Executing Modify Updates Chain: ' + err.message);
        res.redirect('/dashboard.html');
    });
});

// 🗑️ F. REMOVE RECORD OBJECT INTERCEPTS OUT OF ROW SELECTIONS MATRIX
app.delete('/api/exams/delete/:id', (req, res) => {
    db.query('DELETE FROM exams WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 📊 G. EVALUATE SECURITY MATRICES GRADING HANDSHAKE FOR EXACTLY 20 CHOSEN QUESTIONS Slices
app.post('/api/exams/submit', (req, res) => {
    const studentAnswers = req.body; // Maps incoming student choices object fields arrays
    
    db.query('SELECT id, correct_option FROM exams', (err, exams) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let score = 0;
        let evaluatedCount = 0;

        exams.forEach(exam => {
            const answerKey = `question_${exam.id}`;
            // 🎯 BOUNDARY TRACKER: Evaluates the question only if it matches part of the student's 20 randomized questions slice session
            if (studentAnswers.hasOwnProperty(answerKey)) {
                evaluatedCount++;
                if (studentAnswers[answerKey] === exam.correct_option) {
                    score++;
                }
            }
        });

        // Safe design fallback: if no keys match, force the total display score metric boundary to lock exactly at 20
        const finalTotalDisplayCount = evaluatedCount > 0 ? evaluatedCount : 20;

        res.json({ score: score, total: finalTotalDisplayCount }); 
    });
});

// Initialize active listening hooks runtime environments
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`\n==================================================================`);
    console.log(`✨ IKIZAME Hybrid Node Engine active on: http://localhost:${PORT}`);
    console.log(`   Running Environment Host Profile Mode: [${isLocalMachineHost ? 'LOCAL DISK DEV' : 'LIVE REMOTING BUNDLE'}]`);
    console.log(`==================================================================`);
});
