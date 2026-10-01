const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('payment migration is idempotent without unsupported MySQL ADD COLUMN IF NOT EXISTS syntax', () => {
  const sql = fs.readFileSync('Database/2026-10-payment-webhook-hardening.sql', 'utf8');
  const executableSql = sql.replace(/^--.*$/gm, '');
  assert.doesNotMatch(executableSql, /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i);
  for (const column of ['service_type', 'resource_id', 'resource_title', 'reference_id']) {
    assert.match(sql, new RegExp(`column_name = '${column}'`));
  }
  assert.match(sql, /PREPARE payment_service_type_stmt/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS pending_payment_requests/);
});
