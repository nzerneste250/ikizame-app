const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('portal admin deployment migration uses a conditional MySQL 8 compatible ALTER', () => {
  const sql = fs.readFileSync('Database/2026-10-portal-admin-is-active.sql', 'utf8');
  const executableSql = sql.replace(/^--.*$/gm, '');
  assert.doesNotMatch(executableSql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i);
  assert.match(sql, /information_schema\.columns/);
  assert.match(sql, /column_name = 'is_active'/);
  assert.match(sql, /DEFAULT 1/);
  assert.match(sql, /PREPARE portal_admin_is_active_stmt/);
});
