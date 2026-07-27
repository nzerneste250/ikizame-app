const db = require('/var/www/ikizame/db');
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: process.env.SMTP_USER || 'dotadostationerystoreikizame@gmail.com', pass: process.env.SMTP_PASS || 'lsft rqmc umjt zoqd' },
  tls: { rejectUnauthorized: false }
});
const reportModule = require('/var/www/ikizame/routes/reports');
reportModule.sendDailyReport(db, transport)
  .then(() => console.log('daily report sent'))
  .catch(err => { console.error(err); process.exit(1); });