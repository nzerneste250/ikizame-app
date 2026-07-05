const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { requireAdminLogin } = require('../middleware/auth');

const uploadDirectoryPath = path.resolve(__dirname, '..', 'public', 'assets', 'uploads');

if (!fs.existsSync(uploadDirectoryPath)) {
    fs.mkdirSync(uploadDirectoryPath, { recursive: true });
}

const storageEngine = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDirectoryPath),
    filename: (req, file, cb) => {
        const cleanOriginalName = file.originalname.replace(/\s+/g, '_');
        const completeTargetFilePath = path.join(uploadDirectoryPath, cleanOriginalName);
        if (fs.existsSync(completeTargetFilePath)) {
            console.log(`ℹ️ Asset [${cleanOriginalName}] already present. Skipping copy.`);
        }
        cb(null, cleanOriginalName);
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

module.exports = (db) => {

    // GET all exams (shuffled for students, full list for admin)
    router.get('/', (req, res) => {
        db.query('SELECT * FROM exams ORDER BY id DESC', (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!results || results.length === 0) return res.json([]);

            if (req.session && req.session.isAdminAuthenticated) return res.json(results);

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

    // GET single exam question
    router.get('/:id', (req, res) => {
        db.query('SELECT * FROM exams WHERE id = ?', [req.params.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) res.json(results);
            else res.status(404).json({ error: 'Question not found.' });
        });
    });

    // POST add new question
    router.post('/add', examUploadFieldsConfig, (req, res) => {
        const question = req.body.question || '';
        const correctOption = req.body.correctOption || '';
        const optionsLayoutMode = req.body.optionsLayoutMode || 'text';

        const mainQuestionImage = req.files && req.files['imageFile'] && req.files['imageFile'][0]
            ? req.files['imageFile'][0].filename
            : (req.body.imageFileTextFallback ? req.body.imageFileTextFallback.trim() : null);

        let finalOptionA = '', finalOptionB = '', finalOptionC = '', finalOptionD = '';

        if (optionsLayoutMode === 'image') {
            finalOptionA = req.files?.['optiona_File']?.[0]?.filename || req.body.optionATextFallback?.trim() || '';
            finalOptionB = req.files?.['optionb_File']?.[0]?.filename || req.body.optionBTextFallback?.trim() || '';
            finalOptionC = req.files?.['optionc_File']?.[0]?.filename || req.body.optionCTextFallback?.trim() || '';
            finalOptionD = req.files?.['optiond_File']?.[0]?.filename || req.body.optionDTextFallback?.trim() || '';
        } else {
            finalOptionA = req.body.optionA?.trim() || '';
            finalOptionB = req.body.optionB?.trim() || '';
            finalOptionC = req.body.optionC?.trim() || '';
            finalOptionD = req.body.optionD?.trim() || '';
        }

        if (!finalOptionA || !finalOptionB || !finalOptionC || !finalOptionD) {
            return res.status(400).send('All four options are required.');
        }

        db.query(
            `INSERT INTO exams (question, option_a, option_b, option_c, option_d, correct_option, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, mainQuestionImage],
            (err) => {
                if (err) return res.status(500).send('Database insertion error: ' + err.message);
                res.redirect('/dashboard');
            }
        );
    });

    // POST edit question
    router.post('/edit', examUploadFieldsConfig, (req, res) => {
        const { id, question, correctOption, optionsLayoutMode, existingImagePath, existingOptA, existingOptB, existingOptC, existingOptD, imageFileTextFallback, optionATextFallback, optionBTextFallback, optionCTextFallback, optionDTextFallback } = req.body;

        const imagePath = req.files?.['imageFile']?.[0]?.filename || imageFileTextFallback?.trim() || existingImagePath;

        let finalOptionA = '', finalOptionB = '', finalOptionC = '', finalOptionD = '';

        if (optionsLayoutMode === 'image') {
            finalOptionA = req.files?.['optiona_File']?.[0]?.filename || optionATextFallback?.trim() || existingOptA;
            finalOptionB = req.files?.['optionb_File']?.[0]?.filename || optionBTextFallback?.trim() || existingOptB;
            finalOptionC = req.files?.['optionc_File']?.[0]?.filename || optionCTextFallback?.trim() || existingOptC;
            finalOptionD = req.files?.['optiond_File']?.[0]?.filename || optionDTextFallback?.trim() || existingOptD;
        } else {
            finalOptionA = req.body.optionA?.trim() || '';
            finalOptionB = req.body.optionB?.trim() || '';
            finalOptionC = req.body.optionC?.trim() || '';
            finalOptionD = req.body.optionD?.trim() || '';
        }

        db.query(
            `UPDATE exams SET question=?, option_a=?, option_b=?, option_c=?, option_d=?, correct_option=?, image_path=? WHERE id=?`,
            [question, finalOptionA, finalOptionB, finalOptionC, finalOptionD, correctOption, imagePath, id],
            (err) => {
                if (err) return res.status(500).send('Update error: ' + err.message);
                res.redirect('/dashboard');
            }
        );
    });

    // DELETE question
    router.delete('/delete/:id', (req, res) => {
        db.query('DELETE FROM exams WHERE id = ?', [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });

    // POST submit exam
    router.post('/submit', (req, res) => {
        const studentAnswers = req.body || {};
        const sessionName = req.session.examStudentName || 'Unknown Student';
        const sessionPhone = req.session.examPhoneNumber || '0780000000';
        const lockedIdsList = (req.session.lockedExamQuestionIds || []).map(id => parseInt(id, 10));

        db.query('SELECT id, correct_option, question, option_a, option_b, option_c, option_d, image_path FROM exams', (err, exams) => {
            if (err) return res.status(500).json({ error: err.message });

            const examMap = {};
            exams.forEach(e => { examMap[e.id] = e; });

            let score = 0, correctCount = 0, wrongCount = 0, skippedCount = 0;

            const orderedSnapshot = lockedIdsList.filter(id => examMap[id]).map(id => examMap[id]);

            orderedSnapshot.forEach(exam => {
                const answerKey = `question_${exam.id}`;
                if (studentAnswers.hasOwnProperty(answerKey)) {
                    if (studentAnswers[answerKey] === exam.correct_option) { score++; correctCount++; }
                    else wrongCount++;
                } else {
                    skippedCount++;
                }
            });

            const finalTotal = orderedSnapshot.length || 20;
            const questionIdsOrdered = lockedIdsList.join(',');

            db.query(
                `INSERT INTO exam_attempts (student_name, phone_number, score, total_questions, student_answers, exam_questions_snapshot, question_ids_ordered, skipped_count, correct_count, wrong_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [sessionName, sessionPhone, score, finalTotal, JSON.stringify(studentAnswers), JSON.stringify(orderedSnapshot), questionIdsOrdered, skippedCount, correctCount, wrongCount],
                (insertErr) => {
                    if (insertErr) console.error('Submit insert error:', insertErr.message);

                    if (req.session.activePaymentRecordId) {
                        db.query(
                            `UPDATE payment_transactions SET remaining_exams = remaining_exams - 1 WHERE id = ? AND remaining_exams < 9000`,
                            [req.session.activePaymentRecordId],
                            (deductErr) => { if (deductErr) console.error('Token deduct error:', deductErr.message); }
                        );
                    }

                    req.session.hasCompletedActiveExamToken = true;
                    req.session.lockedExamQuestionIds = [];
                    res.json({ score, total: finalTotal });
                }
            );
        });
    });

    return router;
};
