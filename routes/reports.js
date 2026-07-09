const cron   = require('node-cron');
const PDFDoc = require('pdfkit');

const DAILY_REPORT_EMAIL = 'dotadostationarystore@gmail.com';

function getPeriodRange(type) {
    const now = new Date();
    let from, to = new Date(now);
    if (type === 'weekly') {
        from = new Date(now);
        from.setDate(now.getDate() - 7);
    } else if (type === 'monthly') {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else {
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

        doc.rect(0, 0, doc.page.width, 70).fill(brand);
        doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('IKIZAME', 40, 20);
        doc.fontSize(10).font('Helvetica').text('Payment Revenue Report', 40, 46);
        doc.fillColor('#ffffff').fontSize(10).text(`Period: ${period.toUpperCase()} | ${fmt(from)} to ${fmt(to)}`, 40, 58, { align: 'right' });

        doc.moveDown(3);

        doc.fillColor(brand).fontSize(12).font('Helvetica-Bold').text('Summary', 40, 90);
        doc.moveTo(40, 106).lineTo(555, 106).strokeColor(brand).lineWidth(1).stroke();

        const boxY = 115;
        const boxes = [
            { label: 'Total Revenue',      value: `${Number(summary.total_amount || 0).toLocaleString()} RWF` },
            { label: 'Total Transactions', value: summary.total_tx || 0 },
            { label: 'Total Exams Sold',   value: summary.total_exams || 0 },
        ];
        boxes.forEach((b, i) => {
            const x = 40 + i * 175;
            doc.rect(x, boxY, 160, 55).fillAndStroke('#f1f5f9', '#e2e8f0');
            doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(b.label, x + 8, boxY + 8);
            doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text(String(b.value), x + 8, boxY + 22);
        });

        doc.moveDown(5);

        const tableTop = boxY + 75;
        const colX     = [40, 140, 245, 430, 490];
        const colW     = [95, 100, 180,  55,  65];
        const headers  = ['Phone', 'Amount (RWF)', 'Plan / Package', 'Exams', 'Date'];

        doc.rect(40, tableTop, 515, 22).fill('#0b698b');
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
        headers.forEach((h, i) => doc.text(h, colX[i] + 4, tableTop + 6, { width: colW[i], ellipsis: true }));

        let y = tableTop + 22;
        rows.forEach((row, idx) => {
            if (y > 740) { doc.addPage(); y = 40; }
            const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
            doc.rect(40, y, 515, 20).fill(bg);
            doc.fillColor('#0f172a').fontSize(8).font('Helvetica');
            doc.text(row.phone_number || '',                           colX[0] + 4, y + 5, { width: colW[0], lineBreak: false });
            doc.text(`${Number(row.amount||0).toLocaleString()} RWF`,  colX[1] + 4, y + 5, { width: colW[1], lineBreak: false });
            doc.text(row.plan_name || '',                              colX[2] + 4, y + 5, { width: colW[2], lineBreak: false, ellipsis: true });
            doc.text(String(row.total_exams || 0),                    colX[3] + 4, y + 5, { width: colW[3], lineBreak: false });
            doc.text(row.paid_at ? String(row.paid_at).slice(0,10) : '', colX[4] + 4, y + 5, { width: colW[4], lineBreak: false });
            y += 20;
        });

        doc.moveTo(40, y + 10).lineTo(555, y + 10).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
           .text(`Generated: ${new Date().toISOString().slice(0,19).replace('T',' ')} | IKIZAME © ${new Date().getFullYear()} Dotado Stationery Store Ltd`, 40, y + 16, { align: 'center' });

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

    const periodLabel = type === 'weekly' ? 'Weekly' : type === 'monthly' ? 'Monthly' : 'Yearly';
    const subject = `📊 IKIZAME ${periodLabel} Payment Report — ${fmt(from)} to ${fmt(to)}`;

    await transport.sendMail({
        from: `"IKIZAME Reports" <${process.env.SMTP_USER}>`,
        to:   process.env.REPORT_EMAIL || process.env.ALERT_EMAIL || process.env.SMTP_USER,
        subject,
        html: `<div style="font-family:Inter,sans-serif;background:#f8fafc;padding:24px;border-radius:8px;max-width:500px;">
            <div style="background:#0b698b;padding:16px 20px;border-radius:6px;margin-bottom:16px;">
                <h2 style="color:#fff;margin:0;font-size:18px;">📊 IKIZAME — ${periodLabel} Payment Report</h2>
                <p style="color:#bae6fd;margin:4px 0 0;font-size:12px;">Period: ${fmt(from)} → ${fmt(to)}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                <tr><td style="padding:8px;background:#e0f2fe;font-weight:700;">Total Revenue</td><td style="padding:8px;font-size:18px;font-weight:800;color:#0b698b;">${Number(summary.total_amount||0).toLocaleString()} RWF</td></tr>
                <tr><td style="padding:8px;">Total Transactions</td><td style="padding:8px;font-weight:700;">${summary.total_tx}</td></tr>
                <tr><td style="padding:8px;">Total Exams Sold</td><td style="padding:8px;font-weight:700;">${summary.total_exams}</td></tr>
            </table>
            <p style="color:#64748b;font-size:12px;">See the attached PDF for full transaction details.</p>
        </div>`,
        attachments: [{
            filename: `ikizame-report-${type}-${fmt(from)}.pdf`,
            content:  pdfBuf,
            contentType: 'application/pdf'
        }]
    });
    console.log(`✅ ${type} report sent (${rows.length} transactions, ${Number(summary.total_amount||0).toLocaleString()} RWF)`);
}

async function sendDailyReport(db, transport) {
    const today    = new Date();
    const dateStr  = fmt(today);
    const dayStart = `${dateStr} 00:00:00`;
    const dayEnd   = `${dateStr} 23:59:59`;

    const [selfRevenue, schoolRevenue, visitors, exams] = await Promise.all([
        new Promise((res, rej) => db.query(
            `SELECT COUNT(*) AS tx, COALESCE(SUM(amount),0) AS revenue, COALESCE(SUM(total_exams),0) AS exams_sold
             FROM payment_transactions WHERE status='SUCCESS' AND school_id IS NULL AND created_at BETWEEN ? AND ?`,
            [dayStart, dayEnd], (e, r) => e ? rej(e) : res(r[0])
        )),
        new Promise((res, rej) => db.query(
            `SELECT COUNT(*) AS tx, COALESCE(SUM(amount),0) AS revenue, COALESCE(SUM(total_exams),0) AS exams_sold
             FROM payment_transactions WHERE status='SUCCESS' AND school_id IS NOT NULL AND created_at BETWEEN ? AND ?`,
            [dayStart, dayEnd], (e, r) => e ? rej(e) : res(r[0])
        )),
        new Promise((res, rej) => db.query(
            `SELECT COUNT(DISTINCT ip_address) AS unique_visitors, COALESCE(SUM(visit_count),0) AS total_visits
             FROM site_visitors WHERE visit_date = ?`,
            [dateStr], (e, r) => e ? rej(e) : res(r[0])
        )),
        new Promise((res, rej) => db.query(
            `SELECT COUNT(*) AS total, COALESCE(AVG(score),0) AS avg_score,
             SUM(CASE WHEN score >= 12 THEN 1 ELSE 0 END) AS passed
             FROM exam_attempts WHERE DATE(created_at) = ?`,
            [dateStr], (e, r) => e ? rej(e) : res(r[0])
        ))
    ]);

    const totalRevenue   = Number(selfRevenue.revenue) + Number(schoolRevenue.revenue);
    const totalExamsSold = Number(selfRevenue.exams_sold) + Number(schoolRevenue.exams_sold);
    const totalExamsDone = Number(exams.total) || 0;
    const avgScore       = parseFloat(exams.avg_score || 0).toFixed(1);
    const passRate       = totalExamsDone > 0 ? Math.round((Number(exams.passed) / totalExamsDone) * 100) : 0;
    const uniqueVisitors = Number(visitors.unique_visitors) || 0;
    const totalVisits    = Number(visitors.total_visits) || 0;

    const pdfBuf = await buildDailyPDF({
        dateStr, selfRevenue, schoolRevenue,
        totalRevenue, totalExamsSold,
        totalExamsDone, avgScore, passRate,
        uniqueVisitors, totalVisits
    });

    await transport.sendMail({
        from: `"IKIZAME Reports" <${process.env.SMTP_USER}>`,
        to:   DAILY_REPORT_EMAIL,
        subject: `📋 IKIZAME Daily Report — ${dateStr}`,
        html: `<div style="font-family:Inter,sans-serif;background:#f8fafc;padding:24px;max-width:560px;">
            <div style="background:#0b698b;padding:18px 22px;border-radius:8px;margin-bottom:18px;">
                <h2 style="color:#fff;margin:0;font-size:18px;">📋 IKIZAME Daily Report</h2>
                <p style="color:#bae6fd;margin:4px 0 0;font-size:12px;">${dateStr}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr style="background:#e0f2fe;"><td colspan="2" style="padding:8px 12px;font-weight:800;color:#0b698b;">💰 Revenue</td></tr>
                <tr><td style="padding:7px 12px;">Self Payments</td><td style="padding:7px 12px;font-weight:700;">${Number(selfRevenue.revenue).toLocaleString()} RWF (${selfRevenue.tx} tx)</td></tr>
                <tr style="background:#f8fafc;"><td style="padding:7px 12px;">School Payments</td><td style="padding:7px 12px;font-weight:700;">${Number(schoolRevenue.revenue).toLocaleString()} RWF (${schoolRevenue.tx} tx)</td></tr>
                <tr style="background:#dcfce7;"><td style="padding:7px 12px;font-weight:800;">Total Revenue</td><td style="padding:7px 12px;font-weight:800;color:#15803d;font-size:15px;">${totalRevenue.toLocaleString()} RWF</td></tr>
                <tr><td style="padding:7px 12px;">Exams Sold</td><td style="padding:7px 12px;font-weight:700;">${totalExamsSold}</td></tr>
                <tr style="background:#e0f2fe;"><td colspan="2" style="padding:8px 12px;font-weight:800;color:#0b698b;">📝 Exam Activity</td></tr>
                <tr><td style="padding:7px 12px;">Exams Taken Today</td><td style="padding:7px 12px;font-weight:700;">${totalExamsDone}</td></tr>
                <tr style="background:#f8fafc;"><td style="padding:7px 12px;">Average Score</td><td style="padding:7px 12px;font-weight:700;">${avgScore}/20</td></tr>
                <tr><td style="padding:7px 12px;">Pass Rate</td><td style="padding:7px 12px;font-weight:700;color:${passRate>=60?'#15803d':'#b91c1c'}">${passRate}%</td></tr>
                <tr style="background:#e0f2fe;"><td colspan="2" style="padding:8px 12px;font-weight:800;color:#0b698b;">👥 Visitors</td></tr>
                <tr><td style="padding:7px 12px;">Unique Visitors</td><td style="padding:7px 12px;font-weight:700;">${uniqueVisitors}</td></tr>
                <tr style="background:#f8fafc;"><td style="padding:7px 12px;">Total Page Visits</td><td style="padding:7px 12px;font-weight:700;">${totalVisits}</td></tr>
            </table>
            <p style="color:#94a3b8;font-size:11px;margin-top:16px;">Full PDF report attached.</p>
        </div>`,
        attachments: [{
            filename: `ikizame-daily-${dateStr}.pdf`,
            content:  pdfBuf,
            contentType: 'application/pdf'
        }]
    });
    console.log(`✅ Daily report sent for ${dateStr} → ${DAILY_REPORT_EMAIL}`);
}

function buildDailyPDF(d) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDoc({ margin: 40, size: 'A4' });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end',  () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const brand = '#0b698b';
        const W = doc.page.width;

        doc.rect(0, 0, W, 72).fill(brand);
        doc.fillColor('#fff').fontSize(24).font('Helvetica-Bold').text('IKIZAME', 40, 18);
        doc.fontSize(11).font('Helvetica').text('Daily Operations Report', 40, 46);
        doc.fontSize(10).text(`Date: ${d.dateStr}`, 40, 58, { align: 'right' });

        let y = 90;

        function sectionTitle(title, yPos) {
            doc.rect(40, yPos, W - 80, 22).fill('#e0f2fe');
            doc.fillColor(brand).fontSize(11).font('Helvetica-Bold').text(title, 48, yPos + 5);
            return yPos + 30;
        }

        function row(label, value, yPos, shade) {
            if (shade) doc.rect(40, yPos, W - 80, 20).fill('#f8fafc');
            doc.fillColor('#0f172a').fontSize(10).font('Helvetica').text(label, 48, yPos + 4);
            doc.font('Helvetica-Bold').text(String(value), 300, yPos + 4, { width: 215, align: 'right' });
            return yPos + 20;
        }

        y = sectionTitle('Revenue', y);
        y = row('Self Payments', `${Number(d.selfRevenue.revenue).toLocaleString()} RWF  (${d.selfRevenue.tx} transactions)`, y, false);
        y = row('School Payments', `${Number(d.schoolRevenue.revenue).toLocaleString()} RWF  (${d.schoolRevenue.tx} transactions)`, y, true);
        y = row('Total Revenue', `${d.totalRevenue.toLocaleString()} RWF`, y, false);
        y = row('Exams Sold', String(d.totalExamsSold), y, true);
        y += 14;

        y = sectionTitle('Exam Activity', y);
        y = row('Exams Taken Today', String(d.totalExamsDone), y, false);
        y = row('Average Score', `${d.avgScore} / 20`, y, true);
        y = row('Pass Rate (>=12/20)', `${d.passRate}%`, y, false);
        y += 14;

        y = sectionTitle('Website Visitors', y);
        y = row('Unique Visitors', String(d.uniqueVisitors), y, false);
        y = row('Total Page Visits', String(d.totalVisits), y, true);
        y += 20;

        doc.moveTo(40, y).lineTo(W - 40, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
           .text(`Generated: ${new Date().toISOString().slice(0,19).replace('T',' ')} | IKIZAME © ${new Date().getFullYear()} Dotado Stationery Store Ltd`, 40, y + 8, { align: 'center' });

        doc.end();
    });
}

module.exports = function startReportScheduler(db, transport) {
    cron.schedule('0 7 * * *', () => sendDailyReport(db, transport).catch(e => console.error('❌ Daily report failed:', e.message)));
    cron.schedule('0 7 * * 1', () => sendReport(db, transport, 'weekly').catch(e => console.error('❌ Weekly report failed:', e.message)));
    cron.schedule('0 7 1 * *', () => sendReport(db, transport, 'monthly').catch(e => console.error('❌ Monthly report failed:', e.message)));
    cron.schedule('0 7 1 1 *', () => sendReport(db, transport, 'yearly').catch(e => console.error('❌ Yearly report failed:', e.message)));
    console.log('✅ Report scheduler started (daily 7AM, weekly Mon, monthly 1st, yearly Jan 1st)');
};

module.exports.sendReport      = sendReport;
module.exports.sendDailyReport = sendDailyReport;
