require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
    host:     process.env.PROD_DB_HOST || 'localhost',
    user:     process.env.PROD_DB_USER,
    password: process.env.PROD_DB_PASSWORD,
    database: process.env.PROD_DB_NAME,
    port:     parseInt(process.env.PROD_DB_PORT || '3306')
});

db.connect(err => {
    if (err) { console.error('❌ Connect error:', err.message); process.exit(1); }
    console.log('✅ Connected to:', process.env.PROD_DB_NAME);

    db.query("SHOW TABLES LIKE 'portal_admins'", (e, r) => {
        if (!r || !r.length) { console.log('❌ TABLE portal_admins DOES NOT EXIST'); db.end(); return; }
        console.log('✅ Table portal_admins exists');

        db.query("DESCRIBE portal_admins", (e2, cols) => {
            console.log('📋 Columns:', cols.map(c => `${c.Field}(${c.Type})`).join(', '));

            db.query("SELECT COUNT(*) AS total FROM portal_admins", (e3, cnt) => {
                console.log('👥 Total rows:', cnt[0].total);

                db.query("SELECT id, email, username, role, is_active FROM portal_admins LIMIT 10", (e4, rows) => {
                    if (e4) console.error('❌ Query error:', e4.message);
                    else console.log('📄 Users:', JSON.stringify(rows, null, 2));
                    db.end();
                });
            });
        });
    });
});
