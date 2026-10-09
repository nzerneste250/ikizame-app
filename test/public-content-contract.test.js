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

test('daily road-sign challenge is removed and paid exam CTA remains', () => {
  const page = readPage('ifashanyigisho.html');
  const css = fs.readFileSync(path.join(publicDir, 'assets', 'css', 'ifashanyigisho-theme.css'), 'utf8');
  assert.doesNotMatch(page, /Ikibazo cy’Umunsi ku Byapa|daily-road-sign-challenge|dailyChallenge|DAILY_SIGN/);
  assert.doesNotMatch(css, /daily-sign-challenge|daily-challenge/);
  assert.match(page, /<h2 id="paidExamCtaTitle">Witeguye kugerageza ibyo wize\?<\/h2>/);
  assert.match(page, /href="\/exam"[^>]*>Tangira Ikizamini/);
  assert.match(page, /href="\/ibiciro"[^>]*>Reba Ibiciro<\/a>/);
});

test('road-sign learning content remains preserved', () => {
  const page = readPage('ifashanyigisho.html');
  assert.match(page, /id="road-signs"/);
  assert.match(page, /IBYAPA BIBURIRA/);
  assert.match(page, /IBYAPA BITEGEKA/);
  assert.match(page, /IBYAPA BY’UBURENGANZIRA CYANGWA GUTAMBUKA MBERE/);
  assert.match(page, /IBYAPA BIBUZA/);
  assert.match(page, /IBYAPA NDANGA CYANGWA BIYOBORA/);
  assert.match(page, /id="roadSignShare"/);
  assert.match(page, /\/assets\/uploads\/12\.jpg/);
});

test('public initial states are neutral and accessible', () => {
  const scores = readPage('amanota.html');
  const studyGuide = readPage('ifashanyigisho.html');
  const schoolAuth = readPage('school-auth.html');

  assert.match(scores, /id="statTotal">Nta manota<\/div>/);
  assert.match(scores, /id="statAvg">Nta manota<\/div>/);
  assert.match(studyGuide, /id="summaryRulesCount"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(studyGuide, /id="summarySignsCount"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.doesNotMatch(studyGuide, /Gerageza imyitozo y’ibyapa/);
  assert.doesNotMatch(schoolAuth, /<button[^>]*class="pw-eye"(?![^>]*aria-label=)/);
});

test('renderer-injected footer links use Kinyarwanda labels', () => {
  const result = injectFooterLinks('<html><body><footer></footer></body></html>', 'index.html');
  assert.match(result, />Ibyerekeye IKIZAME<\/a>/);
  assert.match(result, />Amategeko n’amabwiriza<\/a>/);
  assert.doesNotMatch(result, />About<\/a>|>Terms &amp; Conditions<\/a>/);
});