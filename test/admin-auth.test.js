const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');

test('active admin credentials retain the existing dashboard authentication behavior', async t => {
  const hash = await bcrypt.hash('correct-password', 4);
  const db = { query(sql, values, callback) {
    if (sql.startsWith('SELECT * FROM portal_admins')) {
      return callback(null, [{ id: 1, username: 'admin', email: 'admin@example.test', password: hash, role: 'superadmin', is_active: 1 }]);
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }};
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use(session({ secret: 'test-session-secret', resave: false, saveUninitialized: false }));
  app.use('/api/admin', require('../routes/admin')(db, (req, res, next) => next()));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/auth`, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'email=admin%40example.test&password=correct-password'
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/dashboard');
});
