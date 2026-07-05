const express = require('express');
const path    = require('path');
const multer  = require('multer');
const fs      = require('fs');
const { requireAdminLogin } = require('../middleware/auth');

const uploadDir = path.resolve(__dirname, '..', 'public', 'assets', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const resourceStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => cb(null, 'resource_' + Date.now() + '_' + file.originalname.replace(/\s+/g, '_'))
});
const resourceUpload = multer({ storage: resourceStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// isPublic = true  → mounted at /api/public/documents (student-facing, filtered)
// isPublic = false → mounted at /api/resources (admin-facing, full list)
module.exports = (db, isPublic = false) => {
    const router = express.Router();

    // GET list — filtered for students, full for admin
    router.get('/', (req, res) => {
        if (isPublic) {
            db.query(
                `SELECT id, title, description, file_name, file_type, allow_read, allow_download FROM learning_resources WHERE allow_read = 1 ORDER BY id DESC`,
                (err, results) => {
                    if (err) return res.status(500).json({ error: 'Gushaka imfashanyigisho byanze.' });
                    res.json(results.map(row => ({
                        id:               row.id,
                        title:            row.title,
                        description:      row.description,
                        file_path:        `assets/uploads/${row.file_name}`,
                        file_type:        row.file_type,
                        allow_download:   parseInt(row.allow_download, 10)
                    })));
                }
            );
        } else {
            db.query('SELECT * FROM learning_resources ORDER BY id DESC', (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(results);
            });
        }
    });

    // POST add resource (admin only)
    router.post('/add', requireAdminLogin, resourceUpload.single('resourceFile'), (req, res) => {
        const { title, description, canRead, canDownload } = req.body;
        if (!req.file || !title) return res.status(400).send('Title and file are required.');

        const fileName     = req.file.filename;
        const fileType     = path.extname(req.file.originalname).toLowerCase().replace('.', '');
        const allowRead    = canRead    === 'on' ? 1 : 0;
        const allowDownload = canDownload === 'on' ? 1 : 0;

        db.query(
            `INSERT INTO learning_resources (title, description, file_name, file_type, allow_read, allow_download) VALUES (?, ?, ?, ?, ?, ?)`,
            [title.trim(), description ? description.trim() : '', fileName, fileType, allowRead, allowDownload],
            (err) => {
                if (err) return res.status(500).send('Database error: ' + err.message);
                res.redirect('/upload-resource');
            }
        );
    });

    // POST edit resource (admin only)
    router.post('/edit', requireAdminLogin, resourceUpload.single('resourceFile'), (req, res) => {
        const { id, title, description, existingFileName, existingFileType, canRead, canDownload } = req.body;

        const finalFileName = req.file ? req.file.filename : existingFileName;
        const finalFileType = req.file ? path.extname(req.file.originalname).toLowerCase().replace('.', '') : existingFileType;
        const allowRead     = canRead    === 'on' ? 1 : 0;
        const allowDownload  = canDownload === 'on' ? 1 : 0;

        db.query(
            `UPDATE learning_resources SET title=?, description=?, file_name=?, file_type=?, allow_read=?, allow_download=? WHERE id=?`,
            [title.trim(), description ? description.trim() : '', finalFileName, finalFileType, allowRead, allowDownload, id],
            (err) => {
                if (err) return res.status(500).send('Update error: ' + err.message);
                res.redirect('/upload-resource');
            }
        );
    });

    // DELETE resource (admin only)
    router.delete('/delete/:id', requireAdminLogin, (req, res) => {
        db.query('DELETE FROM learning_resources WHERE id = ?', [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });

    // GET single resource by id (admin only)
    router.get('/:id', requireAdminLogin, (req, res) => {
        db.query('SELECT * FROM learning_resources WHERE id = ?', [req.params.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) res.json(results[0]);
            else res.status(404).send('Resource not found.');
        });
    });

    return router;
};
