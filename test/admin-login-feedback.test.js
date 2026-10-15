const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin-login.html'), 'utf8');

test('ADMIN_LOGIN_ERROR_INSIDE_CARD=PASS', () => {
  assert.match(page, /<div class="card">[\s\S]*<div class="panel active" id="panelLogin">[\s\S]*<h2 class="login-card-header"[\s\S]*<div class="alert error" id="alertBox"/);
});

test('ADMIN_LOGIN_ERROR_NO_OVERLAP=PASS', () => {
  assert.match(page, /\.alert\s*\{[\s\S]*margin:\s*16px 0 18px/);
  assert.doesNotMatch(page, /#alertBox[^}]*position\s*:\s*absolute/i);
});

test('ADMIN_LOGIN_ERROR_VISIBLE=PASS', () => {
  assert.match(page, /if \(params\.get\('error'\)\) showAlert\('Invalid email or password\. Please try again\.'\)/);
  assert.match(page, /\.alert\.show\s*\{\s*display:\s*flex/);
});

test('ADMIN_LOGIN_ERROR_ACCESSIBLE=PASS', () => {
  assert.match(page, /id="alertBox" role="alert" aria-live="assertive"/);
});

test('ADMIN_LOGIN_ERROR_GENERIC=PASS', () => {
  assert.match(page, /Invalid email or password\. Please try again\./);
  assert.doesNotMatch(page, /email exists|password alone|account exists/i);
});

test('ADMIN_LOGIN_INACTIVE_NOTICE_PRESERVED=PASS', () => {
  assert.match(page, /id="inactiveNotice" role="status" aria-live="polite"/);
  assert.match(page, /Session expired/);
  assert.match(page, /Your admin session ended after 2 minutes of inactivity/);
});

test('ADMIN_LOGIN_NORMAL_VISIT_NO_ALERT=PASS', () => {
  assert.match(page, /<div class="alert error" id="alertBox"[^>]*>/);
  assert.match(page, /<div class="alert success" id="successBox"[^>]*>/);
  assert.match(page, /\.alert\s*\{[\s\S]*display:\s*none/);
});

test('ADMIN_LOGIN_FORGOT_PASSWORD_PRESERVED=PASS', () => {
  assert.match(page, /Forgot password\?/);
  assert.match(page, /function showPanel\(id\)/);
  assert.match(page, /id === 'panelLogin'/);
});

test('ADMIN_LOGIN_AUTH_LOGIC_UNCHANGED=PASS', () => {
  assert.match(page, /action="\/api\/admin\/auth" method="POST"/);
  assert.match(page, /name="email" id="emailInput"/);
  assert.match(page, /name="password" id="passInput"/);
});