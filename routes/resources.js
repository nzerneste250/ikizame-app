const express    = require('express');
const path       = require('path');
const multer     = require('multer');
const fs         = require('fs');
const crypto     = require('crypto');
const { execSync } = require('child_process');
const { requireAdminLogin } = require('../middleware/auth');

const publicUploadDir    = path.resolve(__dirname, '..', 'public', 'assets', 'uploads');
const protectedUploadDir = path.resolve(__dirname, '..', 'protected', 'uploads');
if (!fs.existsSync(publicUploadDir))    fs.mkdirSync(publicUploadDir,    { recursive: true });
if (!fs.existsSync(protectedUploadDir)) fs.mkdirSync(protectedUploadDir, { recursive: true });

function compressUploadedFile(filePath) {
    const ext    = path.extname(filePath).toLowerCase();
    const sizeMB = fs.statSync(filePath).size / (1024 * 1024);
    try {
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            const quality = sizeMB > 2 ? 72 : 82;
            const resize  = sizeMB > 5 ? '1200x1200>' : '800x800>';
            execSync(`convert "${filePath}" -resize '${resize}' -quality ${quality} -strip "${filePath}"`, { timeout: 30000 });
        } else if (ext === '.pdf') {
            const tmp     = filePath + '_tmp.pdf';
            const setting = sizeMB > 5 ? '/screen' : '/ebook';
            execSync(`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${setting} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tmp}" "${filePath}"`, { timeout: 120000 });
            if (fs.existsSync(tmp)) {
                if (fs.statSync(tmp).size < fs.statSync(filePath).size) fs.renameSync(tmp, filePath);
                else fs.unlinkSync(tmp);
            }
        }
    } catch(e) {
        console.warn(`⚠️ Compression skipped for ${path.basename(filePath)}:`, e.message);
    }
}

const resourceStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, publicUploadDir),
    filename:    (req, file, cb) => cb(null, 'resource_' + Date.now() + '_' + file.originalname.replace(/\s+/g, '_'))
});
const resourceUpload = multer({ storage: resourceStorage, limits: { fileSize: 20 * 1024 * 1024 } });

function getClientIp(req) {
    return (req.ip || req.connection.remoteAddress || '')
        .replace(/^::ffff:/i, '').replace(/^::1$/, '127.0.0.1').trim();
}

// isPublic = true  → /api/public/documents (student-facing)
// isPublic = false → /api/resources        (admin-facing)
module.exports = (db, isPublic = false) => {
    const router = express.Router();

    function isSchemaError(err) {
        return !!(err && /Unknown column|doesn't exist|unknown column/i.test(err.message));
    }

    // ── GET list ──────────────────────────────────────────────────────────
    router.get('/', (req, res) => {
        if (isPublic) {
            db.query(
                `SELECT id, title, description, file_name, file_type, allow_read, allow_download, is_paid, price
                 FROM learning_resources WHERE allow_read = 1 ORDER BY id DESC`,
                (err, results) => {
                    if (err) {
                        // Fallback: is_paid/price columns may not exist yet
                        console.error('Resources list error:', err.message);
                        db.query(
                            `SELECT id, title, description, file_name, file_type, allow_read, allow_download
                             FROM learning_resources WHERE allow_read = 1 ORDER BY id DESC`,
                            (fallbackErr, fallbackResults) => {
                                if (fallbackErr) return res.status(500).json({ error: 'Gushaka imfashanyigisho byanze.' });
                                res.json((fallbackResults || []).map(row => ({
                                    id: row.id, title: row.title, description: row.description,
                                    file_name: row.file_name,
                                    file_path: `assets/uploads/${row.file_name}`,
                                    file_type: row.file_type,
                                    allow_download: parseInt(row.allow_download, 10),
                                    is_paid: 0, price: 0
                                })));
                            }
                        );
                        return;
                    }
                    res.json((results || []).map(row => ({
                        id:             row.id,
                        title:          row.title,
                        description:    row.description,
                        file_name:      row.file_name,
                        file_path:      parseInt(row.is_paid, 10) === 1 ? null : `assets/uploads/${row.file_name}`,
                        file_type:      row.file_type,
                        allow_download: parseInt(row.allow_download, 10),
                        is_paid:        parseInt(row.is_paid, 10),
                        price:          parseFloat(row.price || 0)
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

    // ── POST add resource (admin only) ────────────────────────────────────
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

        if (paidFlag) {
            try {
                fs.renameSync(req.file.path, path.join(protectedUploadDir, fileName));
            } catch (moveErr) {
                return res.status(500).send('File storage error: ' + moveErr.message);
            }
        }

        db.query(
            `INSERT INTO learning_resources (title, description, file_name, file_type, file_size, allow_read, allow_download, is_paid, price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    // ── POST edit resource (admin only) ───────────────────────────────────
    router.post('/edit', requireAdminLogin, resourceUpload.single('resourceFile'), (req, res) => {
        const { id, title, description, existingFileName, existingFileType, canRead, canDownload, isPaid, price,
                imageFileTextFallback, optionATextFallback, optionBTextFallback, optionCTextFallback, optionDTextFallback } = req.body;

        const allowRead     = canRead     === 'on' ? 1 : 0;
        const allowDownload = canDownload === 'on' ? 1 : 0;
        const paidFlag      = isPaid === 'on' ? 1 : 0;
        const finalPrice    = paidFlag ? (parseFloat(price) || 0) : 0;

        const finalFileName = req.file ? req.file.filename : existingFileName;
        const finalFileType = req.file ? path.extname(req.file.originalname).toLowerCase().replace('.', '') : existingFileType;
        const finalFileSize = req.file ? req.file.size : null;

        if (req.file) {
            compressUploadedFile(req.file.path);
            if (paidFlag) {
                try {
                    fs.renameSync(req.file.path, path.join(protectedUploadDir, req.file.filename));
                } catch (moveErr) {
                    return res.status(500).send('File storage error: ' + moveErr.message);
                }
            }
        }

        const sql = finalFileSize !== null
            ? `UPDATE learning_resources SET title=?, description=?, file_name=?, file_type=?, file_size=?, allow_read=?, allow_download=?, is_paid=?, price=? WHERE id=?`
            : `UPDATE learning_resources SET title=?, description=?, file_name=?, file_type=?, allow_read=?, allow_download=?, is_paid=?, price=? WHERE id=?`;
        const params = finalFileSize !== null
            ? [title.trim(), description ? description.trim() : '', finalFileName, finalFileType, finalFileSize, allowRead, allowDownload, paidFlag, finalPrice, id]
            : [title.trim(), description ? description.trim() : '', finalFileName, finalFileType, allowRead, allowDownload, paidFlag, finalPrice, id];

        db.query(sql, params, (err) => {
            if (err) return res.status(500).send('Update error: ' + err.message);
            res.redirect('/upload-resource');
        });
    });

    // ── DELETE resource (admin only) ──────────────────────────────────────
    router.delete('/delete/:id', requireAdminLogin, (req, res) => {
        db.query('DELETE FROM learning_resources WHERE id = ?', [req.params.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });

    // ── GET single resource (admin only) ──────────────────────────────────
    router.get('/:id(\\d+)', requireAdminLogin, (req, res) => {
        db.query('SELECT * FROM learning_resources WHERE id = ?', [req.params.id], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) res.json(results[0]);
            else res.status(404).send('Resource not found.');
        });
    });

    // ── POST /api/public/documents/request-download ───────────────────────
    // Called by frontend after payment verified. Creates a 60-second download token.
    router.post('/request-download', (req, res) => {
        const { paymentReference, resourceId, fingerprint } = req.body;
        if (!paymentReference || !resourceId) {
            return res.status(400).json({ ok: false, error: 'Missing required fields.' });
        }

        const ip        = getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';

        // Verify payment is SUCCESS and is for this resource
        db.query(
            `SELECT id, resource_id, resource_title, amount FROM payment_transactions
             WHERE reference_id = ? AND status = 'SUCCESS' AND service_type = 'RESOURCES' LIMIT 1`,
            [paymentReference],
            (err, rows) => {
                if (err) return res.status(500).json({ ok: false, error: 'DB error.' });
                if (!rows || rows.length === 0)
                    return res.status(403).json({ ok: false, error: 'Payment not verified.' });

                const tx = rows[0];
                if (String(tx.resource_id) !== String(resourceId))
                    return res.status(403).json({ ok: false, error: 'Resource mismatch.' });

                // Check if a valid (non-expired, non-used) token already exists for this payment
                db.query(
                    `SELECT download_token, token_expires_at FROM resource_purchase_sessions
                     WHERE payment_reference = ? AND payment_status = 'PAID'
                       AND token_used = 0 AND token_expires_at > NOW() LIMIT 1`,
                    [paymentReference],
                    (checkErr, existing) => {
                        if (checkErr) return res.status(500).json({ ok: false, error: 'DB error.' });

                        if (existing && existing.length > 0) {
                            // Reuse still-valid token
                            return res.json({ ok: true, token: existing[0].download_token });
                        }

                        // Generate new cryptographically secure token
                        const token     = crypto.randomBytes(48).toString('hex');
                        const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds

                        db.query(
                            `INSERT INTO resource_purchase_sessions
                               (purchase_session_id, resource_id, amount, payment_reference, payment_status,
                                browser_fingerprint, ip_address, user_agent, resource_title,
                                download_token, token_expires_at, token_used, paid_at)
                             VALUES (UUID(), ?, ?, ?, 'PAID', ?, ?, ?, ?, ?, ?, 0, NOW())`,
                            [resourceId, tx.amount, paymentReference, fingerprint || null,
                             ip, userAgent, tx.resource_title || '', token, expiresAt],
                            (insertErr) => {
                                if (insertErr) {
                                    console.error('Token insert error:', insertErr.message);
                                    return res.status(500).json({ ok: false, error: 'Could not create download token.' });
                                }
                                console.log(`✅ Download token created for resource ${resourceId} ref ${paymentReference}`);
                                res.json({ ok: true, token });
                            }
                        );
                    }
                );
            }
        );
    });

    // ── GET /api/public/documents/download/:token ─────────────────────────
    // Streams the protected file. Validates token, IP, fingerprint, expiry, used status.
    router.get('/download/:token', (req, res) => {
        const { token } = req.params;
        const fingerprint = req.query.fp || '';
        const ip          = getClientIp(req);

        if (!token || token.length < 64) return res.status(400).send('Invalid token.');

        db.query(
            `SELECT s.id, s.resource_id, s.token_expires_at, s.token_used,
                    s.ip_address, s.browser_fingerprint, s.payment_reference,
                    r.file_name, r.is_paid, r.title
             FROM resource_purchase_sessions s
             JOIN learning_resources r ON r.id = s.resource_id
             WHERE s.download_token = ? AND s.payment_status = 'PAID' LIMIT 1`,
            [token],
            (err, rows) => {
                if (err) {
                    console.error('Download token lookup error:', err.message);
                    return res.status(500).send('Server error.');
                }

                if (!rows || rows.length === 0) {
                    console.warn(`⚠️ Download attempt with unknown token: ${token.substring(0, 16)}...`);
                    return res.status(403).send('Invalid or expired download link.');
                }

                const session = rows[0];

                // Token already used
                if (session.token_used) {
                    console.warn(`⚠️ Replay attempt on used token for resource ${session.resource_id}`);
                    return res.status(403).send('This download link has already been used.');
                }

                // Token expired
                if (new Date() > new Date(session.token_expires_at)) {
                    console.warn(`⚠️ Expired token attempt for resource ${session.resource_id}`);
                    return res.status(403).send('Download session expired. Please make a new purchase.');
                }

                // Fingerprint check (soft — warn but allow if fingerprint missing)
                if (session.browser_fingerprint && fingerprint &&
                    session.browser_fingerprint !== fingerprint) {
                    console.warn(`⚠️ Fingerprint mismatch for token resource ${session.resource_id}`);
                    return res.status(403).send('Device mismatch. Download not permitted.');
                }

                // IP check (soft — only block if both are known and clearly different non-local IPs)
                const storedIp = session.ip_address || '';
                if (storedIp && ip && storedIp !== ip &&
                    storedIp !== '127.0.0.1' && ip !== '127.0.0.1') {
                    console.warn(`⚠️ IP mismatch: stored=${storedIp} request=${ip} resource=${session.resource_id}`);
                    // Log but don't hard-block (mobile IPs can change on redirect)
                }

                // Mark token as used BEFORE streaming (prevents race-condition replay)
                db.query(
                    `UPDATE resource_purchase_sessions SET token_used = 1, token_used_at = NOW() WHERE id = ?`,
                    [session.id],
                    (updateErr) => {
                        if (updateErr) {
                            console.error('Token mark-used error:', updateErr.message);
                            return res.status(500).send('Server error.');
                        }

                        // Look in protected first, fall back to public uploads (migration safety)
                        const protectedPath = path.join(protectedUploadDir, session.file_name);
                        const publicPath    = path.join(publicUploadDir,    session.file_name);
                        const filePath      = fs.existsSync(protectedPath) ? protectedPath : publicPath;

                        if (!fs.existsSync(filePath)) {
                            console.error(`❌ File missing in both locations: ${session.file_name}`);
                            return res.status(404).send('File not found on server.');
                        }

                        const stat     = fs.statSync(filePath);
                        const ext      = path.extname(session.file_name).toLowerCase();
                        const mimeMap  = { '.pdf': 'application/pdf', '.doc': 'application/msword',
                                           '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                           '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
                        const mimeType = mimeMap[ext] || 'application/octet-stream';
                        // Use resource title as download filename, clean for Content-Disposition
                        const cleanTitle = (session.title || 'document').replace(/[^a-zA-Z0-9\s._-]/g, '').trim().replace(/\s+/g, '_') || 'document';
                        const dlFilename = cleanTitle + ext;

                        console.log(`✅ Download served: ${session.file_name} resource=${session.resource_id} ip=${ip}`);

                        res.setHeader('Content-Type', mimeType);
                        res.setHeader('Content-Disposition', `attachment; filename="${dlFilename}"`);
                        res.setHeader('Content-Length', stat.size);
                        res.setHeader('Cache-Control', 'no-store');
                        res.setHeader('X-Content-Type-Options', 'nosniff');

                        const stream = fs.createReadStream(filePath);
                        stream.on('error', (streamErr) => {
                            console.error('Stream error:', streamErr.message);
                            if (!res.headersSent) res.status(500).send('File stream error.');
                        });
                        stream.pipe(res);
                    }
                );
            }
        );
    });

    return router;
};
