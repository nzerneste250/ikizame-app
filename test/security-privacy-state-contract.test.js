const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('PUBLIC_HTML_NO_OWNER_EMAIL=PASS', () => {
  const page = read('public/index.html');
  assert.doesNotMatch(page, /dotadostationarystore@|otp_email|_ownerOtpTargetEmail/i);
  assert.match(page, /Kode yo kwemeza yoherejwe/);
});

test('PUBLIC_HTML_NO_PRIVATE_OTP_DESTINATION=PASS', () => {
  const adminRoutes = read('routes/admin.js');
  assert.match(adminRoutes, /SELECT id, phone_number FROM exam_access_contacts/);
  assert.doesNotMatch(adminRoutes.match(/router\.get\('\/settings\/exam-access\/public'[\s\S]*?\n\s*\}\);/)?.[0] || '', /email|otp_email/);
});

test('OWNER_OTP_FLOW_PRESERVED=PASS', () => {
  const server = read('server.js');
  assert.match(server, /app\.post\('\/api\/owner-otp\/send'/);
  assert.match(server, /registerOtpCode\(ownerOtpState/);
  assert.match(server, /emailTransport\.sendMail/);
  assert.match(server, /app\.post\('\/api\/owner-otp\/verify'/);
  assert.match(server, /verifyOtpCode\(ownerOtpState/);
  assert.match(server, /req\.session\.isOwnerBypass = true/);
});

test('OWNER_OTP_LOG_NO_FULL_EMAIL=PASS', () => {
  const server = read('server.js');
  assert.match(server, /Owner bypass OTP sent successfully/);
  assert.doesNotMatch(server, /Owner bypass OTP sent to \$\{toEmail\}/);
});

test('PRODUCTION_STATE_MATCHES_VERIFIED_DEPLOYMENT=PASS', () => {
  const state = JSON.parse(read('docs/production-state.json'));
  assert.equal(state.verifiedProductionSha, 'b9b40086414700b7c23d8bdeba580ab5cdf9d45e');
});

test('AMANOTA_NEUTRAL_INITIAL_STATE=PASS', () => {
  const page = read('public/amanota.html');
  assert.match(page, /id="statTotal">Nta manota<\/div>/);
  assert.match(page, /id="statAvg">Nta manota<\/div>/);
  assert.match(page, /id="statPassMark">Nta manota<\/div>/);
  assert.doesNotMatch(page, /id="studentAvatarInitial">\?</);
  assert.doesNotMatch(page, /id="stat(?:Total|Passed|Failed|Avg|Best|PassMark)">(?:0|0%|\?)/);
});

test('AMANOTA_NO_FAKE_RESULT_VALUES=PASS', () => {
  const page = read('public/amanota.html');
  assert.ok(page.includes('<div class="amanota-card-box" id="amanotaResultsListView" style="display:none;">'));
  assert.match(page, /getElementById\('statTotal'\)\.textContent = total/);
  assert.match(page, /getElementById\('statAvg'\)\.textContent = avgScore \+ '\/20'/);
});

test('RESOURCE_COUNT_LOADING_CLEAN=PASS', () => {
  const page = read('public/ifashanyigisho.html');
  assert.match(page, /id="summaryRulesCount"[^>]*>Birimo kubarwa\.\.\.<\/span><small hidden>ibyiciro<\/small>/);
  assert.match(page, /id="summarySignsCount"[^>]*>Birimo kubarwa\.\.\.<\/span><small hidden>ibyiciro<\/small>/);
  assert.match(page, /querySelector\('#summaryRulesCount \+ small'\)\.hidden = false/);
});

test('RESOURCE_COUNT_ACCESSIBILITY_PRESERVED=PASS', () => {
  const page = read('public/ifashanyigisho.html');
  for (const id of ['summaryRulesCount', 'summarySignsCount']) {
    assert.match(page, new RegExp(`id="${id}"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"`));
  }
});

test('EXAM_ENTRY_CONVERSION_ROUTE_PRESERVED=PASS', () => {
  const server = read('server.js');
  const page = read('public/index.html');
  assert.match(server, /app\.get\('\/exam'[\s\S]*?res\.redirect\('\/'\)/);
  assert.match(page, /id="candidateRegistrationInteractiveForm"/);
  assert.match(page, /window\.location\.hash === '#candidateRegistrationInteractiveForm'/);
});