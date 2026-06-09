// ==========================================================================
// 🚀 IKIZAME WEB PORTAL CORE BACKEND SERVICE ENGINE
// ==========================================================================
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer');
const session = require('express-session');

const app = express();

// --- 🌐 Global Middleware Configuration Parsers ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- 🔒 Secure Session State Management Cookies Barrier ---
app.use(session({
    secret: 'izo_service_quicky_secure_production_token_9981',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000 } // Session expires in 2 hours
}));

// --- 🗄️ 1. Dynamic MySQL Database Connection Config (Local & Cloud Hybrid) ---
const dbConnectionConfig = process.env.DATABASE_URL || {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'driving_db'
};

const db = mysql.createConnection(dbConnectionConfig);

db.connect((err) => {
    if (err) {
        console.error('❌ Error linking to MySQL Database Setup Pipeline:', err.message);
        return;
    }
    console.log('🚀 Successfully connected to the active MySQL database!');
});

// --- 📸 2. Advanced Absolute Disk Storage Multer Engine Core Configuration ---
const storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        // 🎯 FIXED: Uses path.resolve to force absolute path context execution regardless of ephemeral cloud states
        cb(null, path.resolve(__dirname, 'public', 'assets', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storageEngine,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB File size safety limitation limit guard
});

// --- Dynamic File Fields Matrix Multi-Upload Concurrency Setup ---
const examUploadFieldsConfig = upload.fields([
    { name: 'imageFile', maxCount: 1 },    // Main descriptive question road sign image
    { name: 'optionA_File', maxCount: 1 }, // Dynamic target uploader option image box A
    { name: 'optionB_File', maxCount: 1 }, // Dynamic target uploader option image box B
    { name: 'optionC_File', maxCount: 1 }, // Dynamic target uploader option image box C
    { name: 'optionD_File', maxCount: 1 }  // Dynamic target uploader option image box D
]);

// --- 🔒 3. Administrative Middleware Session Wall Safeguards ---
function requireAdminLogin(req, res, next) {
    if (req.session && req.session.isAdminAuthenticated) {
        return next();
    }
    res.status(401).send('Unauthorized Entry Attempt: Please log in at /admin-login.html first!');
}

// ==========================================================================
// 🛣️ ADMINISTRATIVE SERVICE APP ROUTING PATHS ENDPOINTS
// ==========================================================================

// ➕ A. PORTAL ADMIN LOGIN AUTHENTICATION VERIFIER ROUTE (English Response Update)
app.post('/api/admin/auth', (req, res) => {
    const { username, password } = req.body;
    
    db.query('SELECT * FROM portal_admins WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) return res.status(500).send('Database Connection Error: ' + err.message);
        
        if (results && results.length > 0) {
            req.session.isAdminAuthenticated = true;
            req.session.adminUser = results[0].username;
            res.redirect('/dashboard.html');
        } else {
            res.send('<script>alert("Invalid administrator username or password! Please check your credentials and try again."); window.location.href="/admin-login.html";</script>');
        }
    });
});

// ➕ B. LOGOUT SESSION TERMINATION GATEWAY
app.get('/api/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin-login.html');
    });
});

// ➕ C. GET COMPLETE INVENTORY EXAMS DATA ARRAY LIST
app.get('/api/exams', (req, res) => {
    db.query('SELECT * FROM exams ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ➕ D. ADD NEW QUESTION WITH HYBRID TEXT OR MULTI-IMAGE OPTIONS
app.post('/api/exams/add', requireAdminLogin, examUploadFieldsConfig, (req, res) => {
    const question = req.body.question || '';
    const correctOption = req.body.correctOption || '';
    const optionsLayoutMode = req.body.optionsLayoutMode || 'text';
    
    // Process main question sign preview path safely via absolute validation arrays array index checks
    const mainQuestionImage = req.files && req.files['imageFile'] && req.files['imageFile'][0] 
        ? req.files['imageFile'][0].filename 
        : null;

    let finalOptionA = '';
    let finalOptionB = '';
    let finalOptionC = '';
    let finalOptionD = '';

    // 🎯 FIX: Points explicitly to array index offset zero [0].filename to extract the real string out of the Multer files bucket array wrapper [2]
    if (optionsLayoutMode === 'image') {
        finalOptionA = req.files && req.files['optionA_File'] && req.files['optionA_File'][0] ? req.files['optionA_File'][0].filename : '';
        finalOptionB = req.files && req.files['optionB_File'] && req.files['optionB_File'][0] ? req.files['optionB_File'][0].filename : '';
        finalOptionC = req.files && req.files['optionC_File'] && req.files['optionC_File'][0] ? req.files['optionC_File'][0].filename : '';
        finalOptionD = req.files && req.files['optionD_File'] && req.files['optionD_File'][0] ? req.files['optionD_File'][0].filename : '';
    } else {
        finalOptionA = req.body.optionA || '';
        finalOptionB = req.body.optionB || '';
        finalOptionC = req.body.optionC || '';
        finalOptionD = req.body.optionD || '';
    }

    // Secondary bulletproof integrity fallback layer locks out crash-inducing null errors
    if (!finalOptionA) finalOptionA = '';
    if (!finalOptionB) finalOptionB = '';
    if (!finalOptionC) finalOptionC = '';
    if (!finalOptionD) finalOptionD = '';

    const sql = `INSERT INTO exams (question, option_a, option_b, option_c, option_d, correct_option, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, mainQuestionImage], (err, result) => {
        if (err) {
            console.error('❌ Database insertion error:', err.message);
            return res.status(500).send('Database Error Inserting Question Record: ' + err.message);
        }
        res.redirect('/dashboard.html');
    });
});

// ➕ E. GET SINGLE EXAM RECORD OBJECT FOR COMPILING MANIFEST DATA VIEWS
app.get('/api/exams/:id', (req, res) => {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid ID specification configuration' });

    db.query('SELECT * FROM exams WHERE id = ?', [targetId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results && results.length > 0) {
            res.json(results[0]); 
        } else {
            res.status(404).json({ error: 'Question parameter record object entity not found' });
        }
    });
});
// ➕ F. SUBMIT RUNTIME UPDATE EDITS OVER EXISTING EXAM RECORDS (Hybrid Engine Update)
app.post('/api/exams/edit', requireAdminLogin, examUploadFieldsConfig, (req, res) => {
    // 🎯 Extract body variables safely with strict fallback guards
    const id = req.body.id;
    const question = req.body.question || '';
    const correctOption = req.body.correctOption || '';
    const optionsLayoutMode = req.body.optionsLayoutMode || 'text';
    const existingImagePath = req.body.existingImagePath || '';
    
    const existingOptA = req.body.existingOptA || '';
    const existingOptB = req.body.existingOptB || '';
    const existingOptC = req.body.existingOptC || '';
    const existingOptD = req.body.existingOptD || '';

    // Process main road sign picture upload parameters safely
    const imagePath = req.files && req.files['imageFile'] && req.files['imageFile'][0] 
        ? req.files['imageFile'][0].filename 
        : existingImagePath;

    let finalOptionA = '';
    let finalOptionB = '';
    let finalOptionC = '';
    let finalOptionD = '';

    // 🎯 NESTED EXTRACTION CHECK: Reads new files if selected, drops back to previous image links, or maps text boxes
    if (optionsLayoutMode === 'image') {
        finalOptionA = req.files && req.files['optionA_File'] && req.files['optionA_File'][0] ? req.files['optionA_File'][0].filename : existingOptA;
        finalOptionB = req.files && req.files['optionB_File'] && req.files['optionB_File'][0] ? req.files['optionB_File'][0].filename : existingOptB;
        finalOptionC = req.files && req.files['optionC_File'] && req.files['optionC_File'][0] ? req.files['optionC_File'][0].filename : existingOptC;
        finalOptionD = req.files && req.files['optionD_File'] && req.files['optionD_File'][0] ? req.files['optionD_File'][0].filename : existingOptD;
    } else {
        // Standard text box values mapping straight out of text mode layout fields
        finalOptionA = req.body.optionA || '';
        finalOptionB = req.body.optionB || '';
        finalOptionC = req.body.optionC || '';
        finalOptionD = req.body.optionD || '';
    }

    // Secondary structural integrity locks to guarantee no NULL database column errors
    if (!finalOptionA) finalOptionA = '';
    if (!finalOptionB) finalOptionB = '';
    if (!finalOptionC) finalOptionC = '';
    if (!finalOptionD) finalOptionD = '';

    const sql = `UPDATE exams SET question=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_option=?, image_path=? WHERE id=?`;
    db.query(sql, [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, imagePath, id], (err, result) => {
        if (err) {
            console.error('❌ Database update error:', err.message);
            return res.status(500).send('Database Error Updating Records Matrix: ' + err.message);
        }
        res.redirect('/dashboard.html');
    });
});

// ➕ G. ASYNCHRONOUS DELETION DEPLOYMENT INTERCEPT HANDLER PATHWAY
app.delete('/api/exams/delete/:id', requireAdminLogin, (req, res) => {
    db.query('DELETE FROM exams WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================================================
// 📝 STUDENT EXAMINATION GRADING EVALUATION CONTROLLER INTERCEPT ENGINES
// ==========================================================================
app.post('/api/exams/submit', (req, res) => {
    const studentAnswers = req.body; 
    
    db.query('SELECT id, correct_option FROM exams', (err, exams) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let totalQuestions = exams.length;
        let score = 0;

        exams.forEach(exam => {
            const answerKey = `question_${exam.id}`;
            if (studentAnswers[answerKey] && studentAnswers[answerKey] === exam.correct_option) {
                score++;
            }
        });

        res.json({ score: score, total: totalQuestions }); 
    });
});

// --- 🚀 4. Spin up the Secure Server Environment Run ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`\n==================================================================`);
    console.log(`✨ IKIZAME App is live and running on: http://localhost:${PORT}`);
    console.log(`==================================================================`);
});
