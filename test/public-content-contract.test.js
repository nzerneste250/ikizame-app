const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { injectFooterLinks, renderPublicPage } = require('../helpers/publicPageRenderer');

const publicDir = path.join(__dirname, '..', 'public');
const readPage = (name) => fs.readFileSync(path.join(publicDir, name), 'utf8');

function getRenderedPage(pathname) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const fileName = req.url === '/' ? 'index.html' : 'ifashanyigisho.html';
      res.send = (body) => res.end(body);
      res.set = (name, value) => res.setHeader(name, value);
      res.setHeader = res.setHeader.bind(res);
      res.req = req;
      renderPublicPage(fileName, res);
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      http.get({ hostname: '127.0.0.1', port, path: pathname, headers: { 'Cache-Control': 'no-cache' } }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => body += chunk);
        response.on('end', () => server.close(() => resolve({ body, headers: response.headers, statusCode: response.statusCode })));
      }).on('error', (error) => server.close(() => reject(error)));
    });
  });
}

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

test('public loading states stay neutral and clear safely', () => {
  const home = readPage('index.html');
  const resources = readPage('ifashanyigisho.html');

  assert.doesNotMatch(home, /id="ikizameLoaderStatus"|Biratangira\.\.\./);
  assert.match(home, /data-stat="totalUsers"[^>]*aria-busy="true"><\/span>/);
  assert.match(home, /data-stat="passRate"[^>]*aria-busy="true"><\/span>/);
  assert.match(home, /data-stat="completedExams"[^>]*aria-busy="true"><\/span>/);
  assert.match(home, /element\.setAttribute\('aria-busy', 'false'\)/);
  assert.match(home, /statsContainer\) statsContainer\.hidden = !cards\.some/);
  assert.doesNotMatch(home, /Birimo kubarwa\.\.\./);

  for (const id of ['summaryRulesCount', 'summarySignsCount']) {
    assert.match(resources, new RegExp(`id="${id}"[^>]*aria-busy="true"><\\/span>`));
    assert.doesNotMatch(resources, new RegExp(`id="${id}"[^>]*><\\/span><small[^>]*>ibyiciro`));
  }
  assert.match(resources, /setResourceCountState\(rulesCount, 'Ntibishoboye kuboneka ubu'\)/);
  assert.match(resources, /setResourceCountState\(signsCount, 'Ntibishoboye kuboneka ubu'\)/);
  assert.match(resources, /Ntibishoboye kuboneka ubu/);
});

test('exam flow pages share the polished responsive design system without changing behavior', () => {
  const pages = ['exam.html', 'exam-score.html', 'exam-result.html'].map(readPage);
  const [exam, score, result] = pages;
  for (const page of pages) {
    assert.match(page, /#0F2747/i, 'shared navy palette');
    assert.match(page, /#1E6BFF/i, 'shared blue palette');
    assert.match(page, /#F5F8FC/i, 'shared soft background');
    assert.match(page, /border-radius:\s*(?:22px|20px)/i, 'rounded card system');
    assert.match(page, /:focus-visible/, 'visible keyboard focus');
    assert.match(page, /prefers-reduced-motion/, 'reduced-motion support');
    assert.doesNotMatch(page, /maximum-scale\s*=|user-scalable\s*=/i, 'mobile zoom remains available');
  }
  assert.match(exam, /\.prog-dot\.answered/);
  assert.match(exam, /\.prog-dot\.current:not\(\.answered\)/);
  assert.match(exam, /object-fit:\s*contain/);
  assert.match(exam, /grid-template-columns:\s*1fr/);
  assert.match(exam, /id="examCountdown"/);
  assert.match(exam, /id="prevBtn"/);
  assert.match(exam, /id="nextBtn"/);
  assert.match(score, /id="scoreFill"/);
  assert.match(score, /id="verdictText"/);
  assert.match(score, /window\.location\.href='\/exam-result'/);
  assert.match(result, /id="scoreValue"/);
  assert.match(result, /id="statCorrect"/);
  assert.match(result, /id="statWrong"/);
  assert.match(result, /id="statSkip"/);
  assert.match(result, /class="options-list\$\{isImgOpts \? ' img-grid' : ''\}"/);
  assert.match(result, /object-fit:\s*contain/);
  assert.match(result, /id="backToTopBtn"/);
});

test('raw public HTML keeps loading units out until numeric success', () => {
  const home = readPage('index.html');
  const resources = readPage('ifashanyigisho.html');

  assert.doesNotMatch(resources, /Birimo kubarwa/);
  assert.doesNotMatch(resources, /<small[^>]*>ibyiciro<\/small>/);
  assert.match(resources, /setResourceCountValue\(rulesCount, rulesTotal\)/);
  assert.match(resources, /unit\.textContent = 'ibyiciro'/);
  assert.match(resources, /Number\.isInteger\(value\)/);
  assert.doesNotMatch(home, /Biratangira\.\.\./);
  assert.doesNotMatch(home, /Birimo kubarwa\.\.\./);
});

test('RESOURCE_INITIAL_HTML_NO_LOADING_TEXT=PASS', () => {
  const resources = readPage('ifashanyigisho.html');
  assert.doesNotMatch(resources, /Birimo kubarwa/);
});

test('RESOURCE_INITIAL_HTML_NO_JOINED_UNIT=PASS', () => {
  const resources = readPage('ifashanyigisho.html');
  assert.doesNotMatch(resources, /Birimo kubarwa[^<]*<\/span>\s*<small[^>]*>ibyiciro/);
  assert.doesNotMatch(resources, /<small[^>]*>ibyiciro<\/small>/);
});

test('RESOURCE_UNIT_ONLY_AFTER_NUMERIC_SUCCESS=PASS', () => {
  const resources = readPage('ifashanyigisho.html');
  assert.match(resources, /!Number\.isInteger\(value\) \|\| value < 0/);
  assert.match(resources, /unit\.textContent = 'ibyiciro'/);
});

test('HOME_INITIAL_HTML_NO_BIRATANGIRA=PASS', () => {
  assert.doesNotMatch(readPage('index.html'), /Biratangira\.\.\./);
});

test('HOME_INITIAL_HTML_NO_RAW_STAT_LOADING=PASS', () => {
  assert.doesNotMatch(readPage('index.html'), /Birimo kubarwa\.\.\./);
});

test('rendered HTTP responses contain no public loading placeholders', async () => {
  const home = await getRenderedPage('/');
  const resources = await getRenderedPage('/ifashanyigisho');

  assert.equal(home.statusCode, 200);
  assert.equal(resources.statusCode, 200);
  assert.doesNotMatch(home.body, /Biratangira\.\.\./);
  assert.doesNotMatch(home.body, /Birimo kubarwa\.\.\./);
  assert.doesNotMatch(resources.body, /Birimo kubarwa/);
  assert.doesNotMatch(resources.body, /Birimo kubarwa[^<]*<\/span>\s*<small[^>]*>ibyiciro/);
  assert.equal(home.headers['cache-control'], 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  assert.equal(resources.headers['cache-control'], 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
});

test('RENDERER_OUTPUT_MATCHES_CURRENT_STATIC_SOURCE=PASS', async () => {
  const resources = await getRenderedPage('/ifashanyigisho');
  const source = readPage('ifashanyigisho.html');
  assert.equal(resources.body.includes('Birimo kubarwa'), source.includes('Birimo kubarwa'));
  assert.equal(resources.body.includes('<small hidden>ibyiciro</small>'), source.includes('<small hidden>ibyiciro</small>'));
  assert.match(resources.body, /id="summaryRulesCount"[^>]*aria-busy="true"><\/span>/);
});

test('public conversion and payment flows remain unchanged', () => {
  const home = readPage('index.html');
  const pricing = readPage('ibiciro.html');
  const exam = readPage('exam.html');
  assert.match(home, /id="candidateRegistrationInteractiveForm"/);
  assert.match(pricing, /checkoutIntentType: 'PERSONAL'/);
  assert.match(pricing, /fetch\('\/api\/payments\/momo-push'/);
  assert.match(exam, /\/api\/exams/);
});

test('renderer-injected footer links use Kinyarwanda labels', () => {
  const result = injectFooterLinks('<html><body><footer></footer></body></html>', 'index.html');
  assert.match(result, />Ibyerekeye IKIZAME<\/a>/);
  assert.match(result, />Amategeko n’amabwiriza<\/a>/);
  assert.doesNotMatch(result, />About<\/a>|>Terms &amp; Conditions<\/a>/);
});