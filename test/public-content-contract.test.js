const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { injectFooterLinks } = require('../helpers/publicPageRenderer');

const publicDir = path.join(__dirname, '..', 'public');
const readPage = (name) => fs.readFileSync(path.join(publicDir, name), 'utf8');

test('public content remains localized and avoids legacy English terms labels', () => {
  const terms = readPage('terms.html');
  assert.match(terms, /<html lang="rw">/);
  for (const phrase of [
    'Inyandiko y’amategeko',
    'Iheruka kuvugururwa',
    'Ibirimo',
    '1. Ibyerekeye sosiyete',
    '2. Serivisi n’ibicuruzwa',
    '3. Amakuru yerekeye kwishyura',
    '4. Politiki yo gusubiza amafaranga',
    '5. Ibihe amafaranga adasubizwa',
    '6. Politiki yo guhagarika serivisi',
    '7. Ubufasha ku bakiriya',
    '8. Ivugururwa ry’amabwiriza',
    'Subira Ahabanza',
    'Ibyerekeye IKIZAME',
    'Vugana n’Ubufasha'
  ]) assert.ok(terms.includes(phrase), 'Terms copy includes: ' + phrase);
  assert.doesNotMatch(terms, /Legal Document|Terms & Conditions|Last updated|Table of Contents|Company Overview|Products & Services|Payment Information|Refund Policy|Non-Refundable Situations|Cancellation Policy|Customer Support|Policy Updates|Back to Home/);
  assert.doesNotMatch(terms, /> amafaranga/);
});

test('public pages allow mobile zoom', () => {
  const publicPages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));
  for (const page of publicPages) {
    const html = readPage(page);
    assert.doesNotMatch(html, /maximum-scale\s*=|user-scalable\s*=/i, `${page} must not block zoom`);
  }
});

test('requested public pages expose complete social preview metadata', () => {
  const pages = ['index.html', 'ifashanyigisho.html', 'ibiciro.html', 'about.html', 'terms.html'];
  for (const page of pages) {
    const html = readPage(page);
    for (const property of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image']) {
      assert.match(html, new RegExp(`property="${property}"[^>]+content="[^"]+"`), `${page} has ${property}`);
    }
    for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      assert.match(html, new RegExp(`name="${name}"[^>]+content="[^"]+"`), `${page} has ${name}`);
    }
    assert.match(html, /content="https:\/\/ikizame\.rw\/assets\/uploads\/logo\.png"/);
  }
});

test('daily road-sign challenge renders five real, localized questions', () => {
  const page = readPage('ifashanyigisho.html');
  const uploads = fs.readdirSync(path.join(publicDir, 'assets', 'uploads'));
  assert.match(page, /id="daily-road-sign-challenge"/);
  assert.match(page, /Ikibazo cy’Umunsi ku Byapa/);
  assert.match(page, /id="dailyChallengeImage"[^>]+alt=/);
  assert.match(page, /id="dailyChallengeAnswers"[^>]+role="group"/);
  assert.match(page, /id="dailyChallengeFeedback"[^>]+aria-live="polite"/);
  assert.match(page, /id="dailyChallengeScore"/);
  assert.match(page, /id="dailyChallengeShare"[^>]*>.*Sangiza abandi/s);
  const assets = [...page.matchAll(/asset: '([^']+)'/g)].map((match) => match[1]);
  assert.equal(assets.length, 8);
  assert.ok(assets.every((asset) => uploads.includes(asset)), 'challenge assets exist in public uploads');
  assert.match(page, /dailyChallengeSet\(date\)/);
  assert.match(page, /dailyChallengeHash\(value\)/);
  assert.match(page, /slice\(0, 5\)/);
  assert.match(page, /Amanota yawe: ' \+ score \+ '\/5'/);
  assert.match(page, /navigator\.share\(\{ title: 'Ikibazo cy’Umunsi ku Byapa \| IKIZAME'/);
  assert.match(page, /navigator\.clipboard\.writeText\(text \+ ' ' \+ url\)/);
  assert.doesNotMatch(page.slice(page.indexOf('const DAILY_SIGN_QUESTIONS'), page.indexOf('function dailyChallengeDate')), /fetch\(|XMLHttpRequest|name="(?:name|phone|email|national_id)"/i);
});

test('daily road-sign challenge is responsive and reduced-motion friendly', () => {
  const page = readPage('ifashanyigisho.html');
  const css = fs.readFileSync(path.join(publicDir, 'assets', 'css', 'ifashanyigisho-theme.css'), 'utf8');
  assert.match(css, /\.daily-challenge-card\s*\{[^}]*grid-template-columns/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.daily-challenge-card\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width: 360px\)[\s\S]*\.daily-challenge-image\s*\{[^}]*height:\s*120px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(page, /overflow-x:\s*hidden/);
});

test('public initial states are neutral and accessible', () => {
  const scores = readPage('amanota.html');
  const studyGuide = readPage('ifashanyigisho.html');
  const schoolAuth = readPage('school-auth.html');

  assert.match(scores, /id="statTotal">—<\/div>/);
  assert.match(scores, /id="statAvg">—\/20<\/div>/);
  assert.match(studyGuide, /id="summaryRulesCount"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(studyGuide, /id="summarySignsCount"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.doesNotMatch(schoolAuth, /<button[^>]*class="pw-eye"(?![^>]*aria-label=)/);
});

test('renderer-injected footer links use Kinyarwanda labels', () => {
  const result = injectFooterLinks('<html><body><footer></footer></body></html>', 'index.html');
  assert.match(result, />Ibyerekeye IKIZAME<\/a>/);
  assert.match(result, />Amategeko n’amabwiriza<\/a>/);
  assert.doesNotMatch(result, />About<\/a>|>Terms &amp; Conditions<\/a>/);
});