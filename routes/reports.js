const cron   = require('node-cron');
const PDFDoc = require('pdfkit');

function getPeriodRange(type) {
    const now = new Date();
    let from, to = new Date(now);
    if (type === 'weekly') {
        from = new Date(now);
        from.setDate(now.getDate() - 7);
    } else if (type === 'monthly') {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else { // yearly
        from = new Date(now.getFullYear() - 1, 0, 1);
        to   = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    }
    return { from, to };
}

function fmt(date) {
    return date.toISOString().slice(0, 10);
}

function buildPDF(rows, summary, period, from, to) {
    return new Promise((resolve, reject) => {
        const doc    = new PDFDoc({ margin: 40, size: 'A4' });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end',  () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const brand = '#0b698b';

        // Header
        doc.rect(0, 0, doc.page.width, 70).fill(brand);
        doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
           .text('IKIZAME', 40, 20);
        doc.fontSize(10).font('Helvetica')
           .text('Raporo y\'Amafaranga Yinjiye', 40, 46);
        doc.fillColor('#ffffff').fontSize(10)
           .text(`Igihe: ${period.toUpperCase()} | ${fmt(from)} → ${fmt(to)}`, 40, 58, { align: 'right' });

        doc.moveDown(3);

        // Summary boxes
        doc.fillColor(brand).fontSize(12).font('Helvetica-Bold').text('Incamake / Summary', 40, 90);
        doc.moveTo(40, 106).lineTo(555, 106).strokeColor(brand).lineWidth(1).stroke();

        const boxY = 115;
        const boxes = [
            { label: 'Amafaranga Yose', value: `${Number(summary.total_amount || 0).toLocaleString()} RWF` },
            { label: 'Ibikorwa Byose',  value: summary.total_tx || 0 },
            { label: 'Ibizamini Byaguriwe', value: summary.total_exams || 0 },
        ];
        boxes.forEach((b, i) => {
            const x = 40 + i * 175;
            doc.rect(x, boxY, 160, 55).fillAndStroke('#f1f5f9', '#e2e8f0');
            doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(b.label, x + 8, boxY + 8);
            doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text(String(b.value), x + 8, boxY + 22);
        });

        doc.moveDown(5);

        // Table header
        const tableTop = boxY + 75;
        const cols = [40, 130, 260, 370, 460];
        const headers = ['Telephone', 'Amafaranga', 'Serivisi', 'Ibizamini', 'Itariki'];

        doc.rect(40, tableTop, 515, 20).fill('#0b698b');
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
        headers.forEach((h, i) => doc.text(h, cols[i] + 4, tableTop + 5, { width: 90 }));

        let y = tableTop + 20;
        rows.forEach((row, idx) => {
            if (y > 750) { doc.addPage(); y = 40; }
            const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
            doc.rect(40, y, 515, 18).fill(bg);
            doc.fillColor('#0f172a').fontSize(8).font('Helvetica');
            doc.text(row.phone_number || '', cols[0] + 4, y + 4, { width: 85 });
            doc.text(`${Number(row.amount || 0).toLocaleString()} RWF`, cols[1] + 4, y + 4, { width: 125 });
            doc.text((row.plan_name || '').substring(0, 28), cols[2] + 4, y + 4, { width: 105 });
            doc.text(String(row.total_exams || 0), cols[3] + 4, y + 4, { width: 85 });
            doc.text(row.paid_at ? String(row.paid_at).slice(0, 10) : '', cols[4] + 4, y + 4, { width: 90 });
            y += 18;
        });

        // Footer
        doc.moveTo(40, y + 10).lineTo(555, y + 10).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
           .text(`Raporo yakozwe: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} | IKIZAME © ${new Date().getFullYear()} Dotado Stationery Store Ltd`, 40, y + 16, { align: 'center' });

        doc.end();
    });
}

function queryReport(db, from, to) {
    return new Promise((resolve, reject) => {
        db.query(
            `SELECT phone_number, amount, plan_name, total_exams, created_at AS paid_at
             FROM payment_transactions
             WHERE status = 'SUCCESS' AND created_at BETWEEN ? AND ?
             ORDER BY created_at DESC`,
            [from, to],
            (err, rows) => {
                if (err) return reject(err);
                db.query(
                    `SELECT COUNT(*) AS total_tx, COALESCE(SUM(amount),0) AS total_amount, COALESCE(SUM(total_exams),0) AS total_exams
                     FROM payment_transactions WHERE status = 'SUCCESS' AND created_at BETWEEN ? AND ?`,
                    [from, to],
                    (err2, sum) => {
                        if (err2) return reject(err2);
                        resolve({ rows, summary: sum[0] });
                    }
                );
            }
        );
    });
}

async function sendReport(db, transport, type) {
    const { from, to } = getPeriodRange(type);
    const { rows, summary } = await queryReport(db, from, to);
    const pdfBuf = await buildPDF(rows, summary, type, from, to);

    const periodLabel = type === 'weekly' ? 'Icyumweru' : type === 'monthly' ? 'Ukwezi' : 'Umwaka';
    const subject = `📊 IKIZAME Raporo y'${periodLabel} — ${fmt(from)} hasi ${fmt(to)}`;

    await transport.sendMail({
        from: `"IKIZAME Reports" <${process.env.SMTP_USER}>`,
        to:   process.env.REPORT_EMAIL || process.env.ALERT_EMAIL || process.env.SMTP_USER,
        subject,
        html: `<div style="font-family:Inter,sans-serif;background:#f8fafc;padding:24px;border-radius:8px;max-width:500px;">
            <div style="background:#0b698b;padding:16px 20px;border-radius:6px;margin-bottom:16px;">
                <h2 style="color:#fff;margin:0;font-size:18px;">📊 IKIZAME — Raporo y'Amafaranga</h2>
                <p style="color:#bae6fd;margin:4px 0 0;font-size:12px;">${periodLabel}: ${fmt(from)} → ${fmt(to)}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                <tr><td style="padding:8px;background:#e0f2fe;font-weight:700;border-radius:4px;">Amafaranga Yose</td><td style="padding:8px;font-size:18px;font-weight:800;color:#0b698b;">${Number(summary.total_amount||0).toLocaleString()} RWF</td></tr>
                <tr><td style="padding:8px;">Ibikorwa Byose</td><td style="padding:8px;font-weight:700;">${summary.total_tx}</td></tr>
                <tr><td style="padding:8px;">Ibizamini Byaguriwe</td><td style="padding:8px;font-weight:700;">${summary.total_exams}</td></tr>
            </table>
            <p style="color:#64748b;font-size:12px;">Reba PDF iyometseho kugira ngo ubone amakuru yose.</p>
        </div>`,
        attachments: [{
            filename: `ikizame-raporo-${type}-${fmt(from)}.pdf`,
            content:  pdfBuf,
            contentType: 'application/pdf'
        }]
    });
    console.log(`✅ ${type} report sent (${rows.length} transactions, ${Number(summary.total_amount||0).toLocaleString()} RWF)`);
}

module.exports = function startReportScheduler(db, transport) {
    // Weekly — every Monday at 07:00
    cron.schedule('0 7 * * 1', () => sendReport(db, transport, 'weekly').catch(e => console.error('❌ Weekly report failed:', e.message)));
    // Monthly — 1st of every month at 07:00
    cron.schedule('0 7 1 * *', () => sendReport(db, transport, 'monthly').catch(e => console.error('❌ Monthly report failed:', e.message)));
    // Yearly — Jan 1st at 07:00
    cron.schedule('0 7 1 1 *', () => sendReport(db, transport, 'yearly').catch(e => console.error('❌ Yearly report failed:', e.message)));
    console.log('✅ Report scheduler started (weekly Mon, monthly 1st, yearly Jan 1st)');
};

module.exports.sendReport = sendReport;
