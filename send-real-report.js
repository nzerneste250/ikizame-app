const db = require('/var/www/ikizame/db');
const nodemailer = require('nodemailer');
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  throw new Error('Set SMTP_USER and SMTP_PASS in the runtime environment before sending reports.');
}
const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});
const reportModule = require('/var/www/ikizame/routes/reports');
reportModule.sendDailyReport(db, transport)
  .then(() => console.log('daily report sent'))
  .catch(err => { console.error(err); process.exit(1); });