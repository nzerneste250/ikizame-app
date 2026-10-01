const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { PUBLIC_PAGES, analyticsConfig, injectAnalytics, purchaseReceipt } = require('../helpers/siteAnalytics');
const { injectCanonicalTag, renderPublicPage } = require('../helpers/publicPageRenderer');
const { indexingHeaders } = require('../middleware/indexing');

// Test-only ID; tests never contact Google.
const enabled = { GA4_ENABLED: 'true', GA4_MEASUREMENT_ID: 'G-A1B2C3D4E5' };

test('GA4 is off without explicit enablement and a real-format, non-placeholder ID', () => {
  for (const env of [{}, { ...enabled, GA4_ENABLED: 'false' }, { ...enabled, GA4_MEASUREMENT_ID: '' }, { ...enabled, GA4_MEASUREMENT_ID: 'G-XXXXXXXXXX' }, { ...enabled, GA4_MEASUREMENT_ID: 'G-YOURIDHERE' }]) {
    assert.equal(analyticsConfig(env).enabled, false);
    assert.equal(injectAnalytics('<head></head>', 'index.html', {}, env), '<head></head>');
  }
  assert.equal(analyticsConfig(enabled).enabled, true);
});

test('public renderer injects only one external analytics bootstrap and excludes admin/private activity', () => {
  const html = '<html><head></head><body></body></html>';
  const result = injectAnalytics(html, 'index.html', { query: { phone: '0781234567' } }, enabled);
  assert.match(result, /data-page-path="\/"/);
  assert.doesNotMatch(result, /0781234567/);
  assert.equal(injectAnalytics(result, 'index.html', {}, enabled), result);
  for (const file of ['dashboard.html', 'school-auth.html', 'exam-score.html', 'exam-result.html', 'amanota.html']) {
    assert.equal(injectAnalytics(html, file, {}, enabled), html);
  }
  for (const session of [{ isAdminAuthenticated: true }, { isSchoolAuthenticated: true }]) {
    assert.equal(injectAnalytics(html, 'index.html', { session }, enabled), html);
  }
  const existing = '<head><script src="https://www.googletagmanager.com/gtag/js?id=existing"></script></head>';
  assert.equal(injectAnalytics(existing, 'index.html', {}, enabled), existing);
});

test('purchase receipts require persisted SUCCESS and contain only anonymous RWF purchase fields', () => {
  const row = { status: 'SUCCESS', amount: '1000.00', reference_id: 'private-payment-ref', phone_number: '0781234567', plan_name: 'Customer Name', email: 'private@example.com' };
  const receipt = purchaseReceipt(row);
  assert.equal(receipt.currency, 'RWF');
  assert.equal(receipt.value, 1000);
  assert.match(receipt.transaction_id, /^ikizame_[a-f0-9]{64}$/);
  assert.equal(purchaseReceipt(row).transaction_id, receipt.transaction_id);
  assert.notEqual(purchaseReceipt({ ...row, reference_id: 'other-reference' }).transaction_id, receipt.transaction_id);
  assert.doesNotMatch(JSON.stringify(receipt), /0781234567|Customer Name|private@example|private-payment-ref/);
  for (const overrides of [{ status: 'PENDING' }, { status: 'FAILED' }, { amount: NaN }, { amount: -1 }, { reference_id: '' }]) {
    assert.equal(purchaseReceipt({ ...row, ...overrides }), null);
  }
});

test('canonical insertion replaces existing tags and is idempotent', () => {
  const html = '<HTML><HEAD><link href="https://wrong.invalid/?phone=123" rel="canonical"><link rel="canonical" href="https://wrong.invalid/duplicate"></HEAD></HTML>';
  const canonical = injectCanonicalTag(html, 'https://ikizame.rw/');
  assert.equal((canonical.match(/rel="canonical"/g) || []).length, 1);
  assert.match(canonical, /href="https:\/\/ikizame.rw\/"/);
  assert.equal(injectCanonicalTag(canonical, 'https://ikizame.rw/'), canonical);
});

test('sitemap includes only canonical public pages, and indexing headers protect private pages and staging', t => {
  const original = process.env.NODE_ENV;
  t.after(() => { if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original; });
  process.env.NODE_ENV = 'production';
  const xml = fs.readFileSync('public/sitemap.xml', 'utf8');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  const expected = Object.values(PUBLIC_PAGES).filter(page => !page.private).map(page => 'https://ikizame.rw' + page.path);
  assert.deepEqual(urls.sort(), expected.sort());
  for (const path of ['/', '/ifashanyigisho', '/ibiciro', '/ubufasha', '/about', '/terms', '/index', '/assets/css/design-system.css']) {
    const headers = {};
    indexingHeaders({ path }, { setHeader: (key, value) => headers[key] = value }, () => {});
    assert.equal(headers['X-Robots-Tag'], undefined);
  }
  for (const path of ['/exam', '/exam-score', '/exam-result', '/amanota', '/dashboard', '/school-profile', '/api/exams', '/resource-download']) {
    const headers = {};
    indexingHeaders({ path }, { setHeader: (key, value) => headers[key] = value }, () => {});
    assert.equal(headers['X-Robots-Tag'], 'noindex, nofollow');
  }
  process.env.NODE_ENV = 'development';
  const headers = {};
  indexingHeaders({ path: '/' }, { setHeader: (key, value) => headers[key] = value }, () => {});
  assert.equal(headers['X-Robots-Tag'], 'noindex, nofollow');
  const robots = fs.readFileSync('public/robots.txt', 'utf8');
  assert.match(robots, /Sitemap: https:\/\/ikizame.rw\/sitemap.xml/);
  assert.doesNotMatch(robots, /Disallow: \/(?:ibiciro|ifashanyigisho|ubufasha|about|terms)/);
});

test('rendered public pages have one canonical, while exam/result pages keep their layout and gain noindex', () => {
  for (const file of [...Object.keys(PUBLIC_PAGES), 'exam-result.html', 'amanota.html', 'exam-score.html']) {
    let html;
    const headers = {};
    renderPublicPage(file, { req: {}, setHeader: (key, value) => headers[key] = value, send: value => html = value });
    const page = PUBLIC_PAGES[file];
    if (page && !page.private) {
      assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
      assert.match(html, new RegExp('href="https://ikizame\\.rw' + page.path + '"'));
      assert.doesNotMatch(html, /<meta name="robots" content="noindex/);
    } else {
      assert.equal(headers['X-Robots-Tag'], 'noindex, nofollow');
      assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
      assert.equal((html.match(/<footer\b/g) || []).length, (fs.readFileSync('public/' + file, 'utf8').match(/<footer\b/g) || []).length);
    }
  }
});
