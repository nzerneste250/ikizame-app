const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pageHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'ifashanyigisho.html'), 'utf8');
const themeCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'ifashanyigisho-theme.css'), 'utf8');

test('ROAD_SIGN_EXPLAINER_RENDER=PASS', () => {
  assert.match(pageHtml, /id="road-signs"/);
  assert.match(pageHtml, /Menya Ibyapa by’Umuhanda/);
  assert.match(pageHtml, /Warning Signs[\s\S]*Regulatory Signs[\s\S]*Mandatory Signs[\s\S]*Information Signs/);
  assert.match(pageHtml, /Gerageza imyitozo y’ibyapa/);
});

test('ROAD_SIGN_EXPLAINER_RESPONSIVE=PASS', () => {
  assert.match(themeCss, /\.road-sign-categories\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(themeCss, /@media\s*\(max-width:\s*600px\)[\s\S]*\.road-sign-categories\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(themeCss, /\.road-sign-practice\s*\{[^}]*width:\s*100%/);
  assert.match(pageHtml, /overflow-x:\s*hidden/);
});

test('ROAD_SIGN_SHARE_LINK=PASS', () => {
  assert.match(pageHtml, /id="roadSignShare"/);
  assert.match(pageHtml, /navigator\.share\(/);
  assert.match(pageHtml, /navigator\.clipboard\.writeText\(currentUrl\)/);
  assert.match(pageHtml, /'Link copied'/);
});

test('ROAD_SIGN_UTM_PRESERVED=PASS', () => {
  assert.match(pageHtml, /const campaignKeys = \['utm_source', 'utm_medium', 'utm_campaign'/);
  assert.match(pageHtml, /sourceParams\.get\(key\)/);
  assert.match(pageHtml, /destination\.searchParams\.set\(key, value\)/);
  assert.match(pageHtml, /getElementById\('roadSignPractice'\)/);
  assert.match(pageHtml, /new URL\(window\.location\.pathname, window\.location\.origin\)/);
  assert.match(pageHtml, /shareUrl\.hash = 'road-signs'/);
});

test('ROAD_SIGN_NO_PERSONAL_DATA=PASS', () => {
  const campaignScriptStart = pageHtml.indexOf('const campaignKeys =');
  const campaignScriptEnd = pageHtml.indexOf('\n})();', campaignScriptStart);
  const campaignScript = pageHtml.slice(campaignScriptStart, campaignScriptEnd);
  assert.doesNotMatch(campaignScript, /fetch\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(campaignScript, /name="(?:name|phone|email|national_id)"/i);
});