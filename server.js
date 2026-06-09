const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const session = require('express-session'); // 🔒 Secure session container tracking package

const app = express();
const PORT = process.env.PORT || 4000;
const dbConnectionConfig = process.env.DATABASE_URL || {
    host: 'localhost',
    user: 'root',       // Default XAMPP username
    password: '',       // Default XAMPP password is empty
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
// --- 🛠️ 2. Middleware Configurations ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 🔒 Configure Session Middleware to encrypt authorization cookies on the user's browser
app.use(session({
    secret: 'ikizame_secure_key_123',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 30 } // Active authentication expires automatically in 30 minutes
}));

// 🔒 SECURITY SERVICE WALL MIDDLEWARE: Blocks random users from viewing admin pages
const requireAdminLogin = (req, res, next) => {
    if (req.session && req.session.isAdminLoggedIn) {
        return next(); // Session valid: Allow admin to read the file
    }
    // Session missing: Automatically redirect traffic back to the login gateway
    res.redirect('/admin-login.html');
};

// Intercept specific admin page requests and run security evaluations before loading public files
app.get('/dashboard.html', requireAdminLogin);
app.get('/add-exam.html', requireAdminLogin);
app.get('/edit-exam.html', requireAdminLogin);

// Serve standard public client-side files (HTML, CSS, images) from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// --- 📷 3. Multer Configuration for Traffic Sign Graphic Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public', 'assets', 'uploads'));
    },
    filename: (req, file, cb) => {
        // Prefix runtime timestamp signature to prevent filename duplicates on disk
        cb(null, Date.now() + '_' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// ==========================================================================
// 🔐 ADMINISTRATIVE AUTHENTICATION CONTROL ROUTES
// ==========================================================================

// Process Admin Credentials Evaluation Form Submission
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    db.query('SELECT * FROM portal_admins WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) return res.status(500).send('Database Error Processing Request');
        
        if (results.length > 0) {
            req.session.isAdminLoggedIn = true; // Attach valid login status token to session cookie
            res.redirect('/dashboard.html'); // Deliver user safely onto secure workstation
        } else {
            // Deliver lightweight error page with redirect button back to input gateway
            res.send('<h3>Inyandiko Siyo! Username cyangwa Password ntabwo bikorana. <a href="/admin-login.html">Subira inyuma ugerageze kandi</a></h3>');
        }
    });
});

// Process Administrative Sign-Out System Lifecycle
app.get('/api/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/index.html'); // Destroy active browser cookies tokens and loop back to main index page
    });
});

// ==========================================================================
// 🛠️ ADMINISTRATIVE BACKEND EXAM API MANAGEMENT (Fully Secured via Middlewares)
// ==========================================================================

// ➕ A. GET ALL QUESTIONS (Shuffled randomly per network session request for students / ordered for dashboard sorting)
app.get('/api/exams', (req, res) => {
    // Detects header request parameters to serve random sets to student exams, but standard ordered arrays to the admin table
    const isStudentExam = req.headers.referer && req.headers.referer.includes('exam.html');
    
    const queryStr = isStudentExam 
        ? 'SELECT * FROM exams ORDER BY RAND() LIMIT 20' 
        : 'SELECT * FROM exams ORDER BY id ASC';

    db.query(queryStr, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
// ==========================================================================
// 🛠️ MULTI-FIELD MULTER CONFIGURATION FOR MULTI-IMAGE OPTIONS
// ==========================================================================
const examUploadFieldsConfig = upload.fields([
    { name: 'imageFile', maxCount: 1 },    // Main question sign symbol picture
    { name: 'optionA_File', maxCount: 1 }, // Optional upload choice image A
    { name: 'optionB_File', maxCount: 1 }, // Optional upload choice image B
    { name: 'optionC_File', maxCount: 1 }, // Optional upload choice image C
    { name: 'optionD_File', maxCount: 1 }  // Optional upload choice image D
]);

// ➕ B. ADD NEW QUESTION WITH HYBRID TEXT OR MULTI-IMAGE OPTIONS
app.post('/api/exams/add', requireAdminLogin, examUploadFieldsConfig, (req, res) => {
    const { question, correctOption, optionsLayoutMode } = req.body;
    
    // Process main question sign preview path safely
    const mainQuestionImage = req.files && req.files['imageFile'] ? req.files['imageFile'].filename : null;

    let finalOptionA = '';
    let finalOptionB = '';
    let finalOptionC = '';
    let finalOptionD = '';

    // 🎯 DYNAMIC SANITIZATION: Safely assigns filenames OR strings depending on layout choice mode
    if (optionsLayoutMode === 'image') {
        finalOptionA = req.files && req.files['optionA_File'] ? req.files['optionA_File'].filename : '';
        finalOptionB = req.files && req.files['optionB_File'] ? req.files['optionB_File'].filename : '';
        finalOptionC = req.files && req.files['optionC_File'] ? req.files['optionC_File'].filename : '';
        finalOptionD = req.files && req.files['optionD_File'] ? req.files['optionD_File'].filename : '';
    } else {
        finalOptionA = req.body.optionA || '';
        finalOptionB = req.body.optionB || '';
        finalOptionC = req.body.optionC || '';
        finalOptionD = req.body.optionD || '';
    }

    const sql = `INSERT INTO exams (question, option_a, option_b, option_c, option_d, correct_option, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, mainQuestionImage], (err, result) => {
        if (err) {
            console.error('❌ Database insertion error:', err.message);
            return res.status(500).send('Database Error: ' + err.message);
        }
        res.redirect('/dashboard.html');
    });
});

// ➕ C. GET SINGLE QUESTION BY UNIQUE ID KEY (Explicit Object Return Fix)
app.get('/api/exams/:id', (req, res) => {
    const targetId = parseInt(req.params.id, 10);

    if (isNaN(targetId)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    db.query('SELECT * FROM exams WHERE id = ?', [targetId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results && results.length > 0) {
            res.json(results[0]); 
        } else {
            res.status(404).json({ error: 'Question not found' });
        }
    });
});

// ➕ D. SUBMIT UPDATE CHANGES ON EXISTING DATABASE ITEMS RECORD
app.post('/api/exams/edit', requireAdminLogin, upload.single('imageFile'), (req, res) => {
    const { id, question, optionA, optionB, optionC, optionD, correctOption, existingImagePath } = req.body;
    const imagePath = req.file ? req.file.filename : existingImagePath;

    const sql = `UPDATE exams SET question=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_option=?, image_path=? WHERE id=?`;
    db.query(sql, [question, optionA, optionB, optionC, optionD, correctOption, imagePath, id], (err, result) => {
        if (err) return res.status(500).send('Database Error Updating Records: ' + err.message);
        res.redirect('/dashboard.html');
    });
});

// ➕ E. ASYNCHRONOUS EXAM RECORD REMOVAL API TARGET POINT
app.delete('/api/exams/delete/:id', requireAdminLogin, (req, res) => {
    db.query('DELETE FROM exams WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ==========================================================================
// 📝 OPEN PUBLIC STUDENT EXAM EVALUATION API TESTING ENGINE
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
app.listen(PORT, () => {
    console.log(`\n==================================================================`);
    console.log(`✨ IKIZAME App is live and running on: http://localhost:${PORT}`);
    console.log(`==================================================================`);
});
