const express = require('express');
const router = express.Router();

module.exports = (db) => {

    // GET remaining exams balance for a phone number
    router.get('/remaining/:phoneNumber', (req, res) => {
        const raw = req.params.phoneNumber.trim();
        const last9 = raw.slice(-9);
        if (last9.length !== 9) return res.status(400).json({ remaining: 0 });

        db.query(
            `SELECT COALESCE(SUM(remaining_exams), 0) AS remaining FROM payment_transactions WHERE RIGHT(phone_number, 9) = ? AND status = 'SUCCESS' AND remaining_exams > 0`,
            [last9],
            (err, rows) => {
                if (err) return res.status(500).json({ remaining: 0 });
                res.json({ remaining: parseInt(rows[0].remaining, 10) || 0 });
            }
        );
    });

    // GET lookup exam attempts by phone number
    router.get('/lookup/:phoneNumber', (req, res) => {
        const rawUserInputParam = req.params.phoneNumber.trim();
        const cleanLast9Digits = rawUserInputParam.slice(-9);

        if (cleanLast9Digits.length !== 9) {
            return res.status(400).json({ error: 'Nomero ya telephone ntabwo yuzuye.' });
        }

        db.query(
            `SELECT id, student_name, phone_number, score, total_questions, created_at FROM exam_attempts WHERE RIGHT(phone_number, 9) = ? ORDER BY id DESC`,
            [cleanLast9Digits],
            (err, results) => {
                if (err) {
                    console.error('[Database Error] Lookup query failed:', err);
                    return res.status(500).json({ error: 'Gushaka amanota byanze.' });
                }
                res.json(results);
            }
        );
    });

    // GET full exam review by attempt ID
    router.get('/review/:attemptId', (req, res) => {
        const attemptId = req.params.attemptId;

        db.query(
            `SELECT id, student_name, phone_number, score, total_questions, student_answers, exam_questions_snapshot, question_ids_ordered, skipped_count, correct_count, wrong_count, DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS created_at FROM exam_attempts WHERE id = ?`,
            [attemptId],
            (err, results) => {
                if (err) return res.status(500).json({ error: 'Gushaka ibyavuye mu kizamini byanze.' });
                if (!results || results.length === 0) return res.status(404).json({ error: 'Nta kizamini twabonye.' });

                const row = results[0];
                let parsedAnswers = {};
                let parsedQuestions = [];

                try { parsedAnswers = typeof row.student_answers === 'string' ? JSON.parse(row.student_answers) : (row.student_answers || {}); } catch (e) { console.error(e); }
                try { parsedQuestions = typeof row.exam_questions_snapshot === 'string' ? JSON.parse(row.exam_questions_snapshot) : (row.exam_questions_snapshot || []); } catch (e) { console.error(e); }

                if (row.question_ids_ordered && row.question_ids_ordered.trim()) {
                    const orderedIds = row.question_ids_ordered.split(',').map(id => parseInt(id.trim(), 10)).filter(Boolean);

                    if (orderedIds.length > 0) {
                        const placeholders = orderedIds.map(() => '?').join(',');
                        db.query(
                            `SELECT id, question, option_a, option_b, option_c, option_d, correct_option, image_path FROM exams WHERE id IN (${placeholders})`,
                            orderedIds,
                            (examErr, examRows) => {
                                if (examErr) return res.status(500).json({ error: 'Gushaka ibibazo byanze.' });

                                const examMap = {};
                                examRows.forEach(e => { examMap[e.id] = e; });

                                const fullOrderedQuestions = orderedIds.filter(id => examMap[id]).map(id => examMap[id]);

                                res.json({
                                    success: true,
                                    score: row.score,
                                    total: row.total_questions || 20,
                                    studentName: row.student_name,
                                    phoneNumber: row.phone_number,
                                    created_at: row.created_at,
                                    createdAt: row.created_at,
                                    answers: parsedAnswers,
                                    questions: fullOrderedQuestions,
                                    skippedCount: row.skipped_count || 0,
                                    correctCount: row.correct_count || 0,
                                    wrongCount: row.wrong_count || 0
                                });
                            }
                        );
                        return;
                    }
                }

                res.json({
                    success: true,
                    score: row.score,
                    total: row.total_questions || 20,
                    studentName: row.student_name,
                    phoneNumber: row.phone_number,
                    created_at: row.created_at,
                    createdAt: row.created_at,
                    answers: parsedAnswers,
                    questions: parsedQuestions,
                    skippedCount: row.skipped_count || 0,
                    correctCount: row.correct_count || 0,
                    wrongCount: row.wrong_count || 0
                });
            }
        );
    });

    return router;
};
