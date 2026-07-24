const express    = require('express');
const path       = require('path');
const multer     = require('multer');
const fs         = require('fs');
const { execSync } = require('child_process');
const { requireAdminLogin } = require('../middleware/auth');

function compressUploadedFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const sizeMB = fs.statSync(filePath).size / (1024 * 1024);
    try {
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            // Aggressive compression for large images
            const quality = sizeMB > 2 ? 72 : 82;
            const resize  = sizeMB > 5 ? '1200x1200>' : '800x800>';
            execSync(`convert "${filePath}" -resize '${resize}' -quality ${quality} -strip "${filePath}"`, { timeout: 30000 });
        } else if (ext === '.pdf') {
            const tmp = filePath + '_tmp.pdf';
            // Use /screen for >5MB, /ebook for smaller
            const setting = sizeMB > 5 ? '/screen' : '/ebook';
            execSync(`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${setting} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tmp}" "${filePath}"`, { timeout: 120000 });
            if (fs.existsSync(tmp)) {
                const tmpSize = fs.statSync(tmp).size;
                // Only replace if compressed version is actually smaller
                if (tmpSize < fs.statSync(filePath).size) {
                    fs.renameSync(tmp, filePath);
                } else {
                    fs.unlinkSync(tmp);
                }
            }
        }
        console.log(`✅ Compressed resource: ${path.basename(filePath)} (${sizeMB.toFixed(2)}MB)`);
    } catch(e) {
        console.warn(`⚠️ Compression skipped for ${path.basename(filePath)}:`, e.message);
    }
}

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

    function isSchemaError(err) {
        return !!(err && /Unknown column|doesn't exist|unknown column/i.test(err.message));
    }

    function ensureResourceColumns(next) {
        db.query(`SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'learning_resources' AND column_name = 'is_paid'`, (err, rows) => {
            if (err) return next(err);
            const hasPaid = Number(rows?.[0]?.count || 0) > 0;
            if (!hasPaid) {
                db.query(`ALTER TABLE learning_resources ADD COLUMN is_paid TINYINT(1) NOT NULL DEFAULT 0`, (alterErr) => {
                    if (alterErr) return next(alterErr);
                    db.query(`SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'learning_resources' AND column_name = 'price'`, (priceErr, priceRows) => {
                        if (priceErr) return next(priceErr);
                        const hasPrice = Number(priceRows?.[0]?.count || 0) > 0;
                        if (!hasPrice) {
                            db.query(`ALTER TABLE learning_resources ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00`, (priceAlterErr) => next(priceAlterErr || null));
                        } else {
                            next();
                        }
                    });
                });
            } else {
                db.query(`SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'learning_resources' AND column_name = 'price'`, (priceErr, priceRows) => {
                    if (priceErr) return next(priceErr);
                    const hasPrice = Number(priceRows?.[0]?.count || 0) > 0;
                    if (!hasPrice) {
                        db.query(`ALTER TABLE learning_resources ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00`, (priceAlterErr) => next(priceAlterErr || null));
                    } else {
                        next();
                    }
                });
            }
        });
    }

    // GET list — filtered for students, full for admin
    router.get('/', (req, res) => {
        ensureResourceColumns((err) => {
            if (err) return res.status(500).json({ error: 'Gushaka imfashanyigisho byanze.' });
            if (isPublic) {
                db.query(
                    `SELECT id, title, description, file_name, file_type, allow_read, allow_download, is_paid, price FROM learning_resources WHERE allow_read = 1 ORDER BY id DESC`,
                    (queryErr, results) => {
                        if (queryErr && isSchemaError(queryErr)) {
                            db.query(`SELECT id, title, description, file_name, file_type, allow_read, allow_download FROM learning_resources WHERE allow_read = 1 ORDER BY id DESC`, (fallbackErr, fallbackResults) => {
                                if (fallbackErr) return res.status(500).json({ error: 'Gushaka imfashanyigisho byanze.' });
                                res.json(fallbackResults.map(row => ({
                                    id:               row.id,
                                    title:            row.title,
                                    description:      row.description,
                                    file_path:        `assets/uploads/${row.file_name}`,
                                    file_type:        row.file_type,
                                    allow_download:   parseInt(row.allow_download, 10),
                                    is_paid:          0,
                                    price:            0
                                })));
                            });
                            return;
                        }
                        if (queryErr) return res.status(500).json({ error: 'Gushaka imfashanyigisho byanze.' });
                        res.json(results.map(row => ({
                            id:               row.id,
                            title:            row.title,
                            description:      row.description,
                            file_path:        `assets/uploads/${row.file_name}`,
                            file_type:        row.file_type,
                            allow_download:   parseInt(row.allow_download, 10),
                            is_paid:          parseInt(row.is_paid, 10),
                            price:            parseFloat(row.price || 0)
                        })));
                    }
                );
            } else {
                db.query('SELECT * FROM learning_resources ORDER BY id DESC', (queryErr, results) => {
                    if (queryErr) return res.status(500).json({ error: queryErr.message });
                    res.json(results);
                });
            }
        });
    });

    // POST add resource (admin only)
    router.post('/add', requireAdminLogin, resourceUpload.single('resourceFile'), (req, res) => {
        const { title, description, canRead, canDownload, isPaid, price } = req.body;
        if (!req.file || !title) return res.status(400).send('Title and file are required.');

        const fileName      = req.file.filename;
        const fileType      = path.extname(req.file.originalname).toLowerCase().replace('.', '');
        const fileSize      = req.file.size || 0;
        const allowRead     = canRead     === 'on' ? 1 : 0;
        const allowDownload = canDownload === 'on' ? 1 : 0;
        const paidFlag      = isPaid === 'on' ? 1 : 0;
        const finalPrice    = paidFlag ? (parseFloat(price) || 0) : 0;

        compressUploadedFile(req.file.path);

        ensureResourceColumns((schemaErr) => {
            if (schemaErr) return res.status(500).send('Database error: ' + schemaErr.message);
            db.query(
                `INSERT INTO learning_resources (title, description, file_name, file_type, file_size, allow_read, allow_download, is_paid, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title.trim(), description ? description.trim() : '', fileName, fileType, fileSize, allowRead, allowDownload, paidFlag, finalPrice],
                (err) => {
                    if (err && isSchemaError(err)) {
                        db.query(
                            `INSERT INTO learning_resources (title, description, file_name, file_type, file_size, allow_read, allow_download) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [title.trim(), description ? description.trim() : '', fileName, fileType, fileSize, allowRead, allowDownload],
                            (fallbackErr) => {
                                if (fallbackErr) return res.status(500).send('Database error: ' + fallbackErr.message);
                                res.redirect('/upload-resource');
                            }
                        );
                        return;
                    }
                    if (err) return res.status(500).send('Database error: ' + err.message);
                    res.redirect('/upload-resource');
                }
            );
        });
    });

    // POST edit resource (admin only)
    router.post('/edit', requireAdminLogin, resourceUpload.single('resourceFile'), (req, res) => {
        const { id, title, description, existingFileName, existingFileType, canRead, canDownload, isPaid, price } = req.body;

        const finalFileName = req.file ? req.file.filename : existingFileName;
        const finalFileType = req.file ? path.extname(req.file.originalname).toLowerCase().replace('.', '') : existingFileType;
        const finalFileSize = req.file ? req.file.size : null;

        if (req.file) compressUploadedFile(req.file.path);
        const allowRead     = canRead     === 'on' ? 1 : 0;
        const allowDownload = canDownload === 'on' ? 1 : 0;
        const paidFlag      = isPaid === 'on' ? 1 : 0;
        const finalPrice    = paidFlag ? (parseFloat(price) || 0) : 0;

        ensureResourceColumns((schemaErr) => {
            if (schemaErr) return res.status(500).send('Update error: ' + schemaErr.message);
            const sql = finalFileSize !== null
                ? `UPDATE learning_resources SET title=?, description=?, file_name=?, file_type=?, file_size=?, allow_read=?, allow_download=?, is_paid=?, price=? WHERE id=?`
                : `UPDATE learning_resources SET title=?, description=?, file_name=?, file_type=?, allow_read=?, allow_download=?, is_paid=?, price=? WHERE id=?`;
            const params = finalFileSize !== null
                ? [title.trim(), description ? description.trim() : '', finalFileName, finalFileType, finalFileSize, allowRead, allowDownload, paidFlag, finalPrice, id]
                : [title.trim(), description ? description.trim() : '', finalFileName, finalFileType, allowRead, allowDownload, paidFlag, finalPrice, id];

            db.query(sql, params, (err) => {
                    if (err && isSchemaError(err)) {
                        const fallbackSql = finalFileSize !== null
                            ? `UPDATE learning_resources SET title=?, description=?, file_name=?, file_type=?, file_size=?, allow_read=?, allow_download=? WHERE id=?`
                            : `UPDATE learning_resources SET title=?, description=?, file_name=?, file_type=?, allow_read=?, allow_download=? WHERE id=?`;
                        const fallbackParams = finalFileSize !== null
                            ? [title.trim(), description ? description.trim() : '', finalFileName, finalFileType, finalFileSize, allowRead, allowDownload, id]
                            : [title.trim(), description ? description.trim() : '', finalFileName, finalFileType, allowRead, allowDownload, id];
                        db.query(fallbackSql, fallbackParams, (fallbackErr) => {
                            if (fallbackErr) return res.status(500).send('Update error: ' + fallbackErr.message);
                            res.redirect('/upload-resource');
                        });
                        return;
                    }
                    if (err) return res.status(500).send('Update error: ' + err.message);
                    res.redirect('/upload-resource');
                }
            );
        });
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
