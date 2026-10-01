const test = require('node:test');
const assert = require('node:assert/strict');
const { ensurePortalAdminIsActiveColumn } = require('../helpers/databaseMigrations');

function run(connection) {
  return new Promise((resolve, reject) => {
    ensurePortalAdminIsActiveColumn(connection, (error, added) => error ? reject(error) : resolve(added));
  });
}

test('portal admin migration leaves existing admin data untouched when is_active exists', async () => {
  const calls = [];
  const connection = { query(sql, values, callback) {
    if (typeof values === 'function') callback = values;
    calls.push(sql);
    callback(null, [{ count: 1 }]);
  }};
  assert.equal(await run(connection), false);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /information_schema\.columns/);
});

test('portal admin migration adds is_active once with a safe active default', async () => {
  const calls = [];
  const connection = { query(sql, values, callback) {
    if (typeof values === 'function') callback = values;
    calls.push(sql);
    if (calls.length === 1) return callback(null, [{ count: 0 }]);
    callback(null, {});
  }};
  assert.equal(await run(connection), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1], 'ALTER TABLE portal_admins ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1');
});

test('portal admin migration is idempotent across repeated executions', async () => {
  let exists = false;
  let alterCount = 0;
  const connection = { query(sql, values, callback) {
    if (typeof values === 'function') callback = values;
    if (/information_schema/.test(sql)) return callback(null, [{ count: exists ? 1 : 0 }]);
    alterCount += 1;
    exists = true;
    callback(null, {});
  }};
  assert.equal(await run(connection), true);
  assert.equal(await run(connection), false);
  assert.equal(alterCount, 1);
});

test('portal admin migration reports database failures', async () => {
  const expected = new Error('alter denied');
  const connection = { query(sql, values, callback) {
    if (typeof values === 'function') callback = values;
    if (/information_schema/.test(sql)) return callback(null, [{ count: 0 }]);
    callback(expected);
  }};
  await assert.rejects(run(connection), expected);
});
