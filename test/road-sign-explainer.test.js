const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pageHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'ifashanyigisho.html'), 'utf8');
const themeCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'ifashanyigisho-theme.css'), 'utf8');
const uploadsPath = path.join(__dirname, '..', 'public', 'assets', 'uploads');

const signAssetMappings = [
  ['12.jpg', 'Umuhanda umanuka cyane'],
  ['SA_road_sign_-_Road_narrows_on_the_right.svg.png', 'Ifungana ry’umuhanda'],
  ['6.jpg', 'Inkomane izengurukwa'],
  ['13.png', 'Amabuye ahanuka'],
  ['11.jpg', 'Icyapa cyo gutanga inzira'],
  ['P07_CZ.svg.png', 'Gutambuka mbere y’ibinyabiziga bihura'],
  ['Portugal_road_sign_B6.svg.png', 'Icyapa cy’uburenganzira bwo gutambuka mbere'],
  ['road-sign-of-50-speed-limit-on-white-background-free-vector.jpg', 'Umuvuduko ntarengwa wa km 50/h'],
  ['IE_road_sign_RUS-012_(1).svg', 'Birabujijwe gukatira iburyo'],
  ['Vorschriftszeichen_13a.svg', 'Birabujijwe guhagarika ikinyabiziga'],
  ['66.png', 'Birabujijwe kunyuranaho'],
  ['Bild_14_-_Verkehrsverbot_fÃ¼r_KraftrÃ¤der,_StVO_1937.svg', 'Ntihanyurwa n’amapikipiki'],
  ['Mauritius_Road_Signs_-_Mandatory_Sign_-_Left_turn_only.svg.png', 'Gukatira ibumoso bitegetswe'],
  ['Mauritius_Road_Signs_-_Mandatory_Sign_-_Right_turn_only.svg.png', 'Gukatira iburyo bitegetswe'],
  ['mandatory-straight-ahead.svg', 'Gukomeza imbere bitegetswe'],
  ['7.png', 'Inzira idakomeza'],
  ['Screenshot_2026-06-09_165909.png', 'Icyerekezo kimwe'],
  ['guidance-bus-stop.svg', 'Aho za otobisi zihagarara']
];

const categoryAssetMappings = [
  ['roadSignWarningTitle', ['12.jpg', 'SA_road_sign_-_Road_narrows_on_the_right.svg.png', '6.jpg', '13.png']],
  ['roadSignPriorityTitle', ['11.jpg', 'P07_CZ.svg.png', 'Portugal_road_sign_B6.svg.png']],
  ['roadSignProhibitionTitle', ['road-sign-of-50-speed-limit-on-white-background-free-vector.jpg', 'IE_road_sign_RUS-012_(1).svg', 'Vorschriftszeichen_13a.svg', '66.png', 'Bild_14_-_Verkehrsverbot_fÃ¼r_KraftrÃ¤der,_StVO_1937.svg']],
  ['roadSignMandatoryTitle', ['Mauritius_Road_Signs_-_Mandatory_Sign_-_Left_turn_only.svg.png', 'Mauritius_Road_Signs_-_Mandatory_Sign_-_Right_turn_only.svg.png', 'mandatory-straight-ahead.svg']],
  ['roadSignGuidanceTitle', ['7.png', 'Screenshot_2026-06-09_165909.png', 'guidance-bus-stop.svg']]
];

test('ROAD_SIGN_EXPLAINER_RENDER=PASS', () => {
  assert.match(pageHtml, /id="road-signs"/);
  assert.match(pageHtml, /Menya ibyapa byo ku muhanda/);
  assert.match(pageHtml, /IBYAPA BIBURIRA[\s\S]*IBYAPA BY’UBURENGANZIRA CYANGWA GUTAMBUKA MBERE[\s\S]*IBYAPA BIBUZA[\s\S]*IBYAPA BITEGEKA[\s\S]*IBYAPA NDANGA CYANGWA BIYOBORA/);
  assert.match(pageHtml, /Gerageza imyitozo y’ibyapa/);
});

test('ROAD_SIGN_FIVE_CATEGORIES=PASS', () => {
  const categories = pageHtml.match(/class="road-sign-category"/g) || [];
  assert.equal(categories.length, 5);
});

test('ROAD_SIGN_CATEGORY_EXAMPLE_COUNTS=PASS', () => {
  for (const [headingId, assets] of categoryAssetMappings) {
    const sectionStart = pageHtml.indexOf('<section class="road-sign-category" aria-labelledby="' + headingId + '">');
    const sectionEnd = pageHtml.indexOf('</section>', sectionStart);
    const section = pageHtml.slice(sectionStart, sectionEnd);
    const cards = section.match(/class="road-sign-example"/g) || [];
    assert.equal(cards.length, assets.length, 'example count matches verified assets: ' + headingId);
  }
});

test('ROAD_SIGN_MANDATORY_MIN_3=PASS', () => {
  const mandatory = categoryAssetMappings.find(([headingId]) => headingId === 'roadSignMandatoryTitle');
  assert.ok(mandatory[1].length >= 3);
});

test('ROAD_SIGN_GUIDANCE_MIN_3=PASS', () => {
  const guidance = categoryAssetMappings.find(([headingId]) => headingId === 'roadSignGuidanceTitle');
  assert.ok(guidance[1].length >= 3);
});

test('ROAD_SIGN_NO_ENGLISH_LABELS=PASS', () => {
  const sectionStart = pageHtml.indexOf('<section class="road-sign-explainer"');
  const sectionEnd = pageHtml.indexOf('</section>', pageHtml.indexOf('class="road-sign-learning-note"', sectionStart));
  const explainer = pageHtml.slice(sectionStart, sectionEnd);
  const visibleText = explainer.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  assert.doesNotMatch(visibleText, /Warning Signs|Regulatory Signs|Mandatory Signs|Information Signs|road sign|warning|regulatory|mandatory|information/i);
});

test('ROAD_SIGN_REAL_IMAGES_ONLY=PASS', () => {
  for (const [asset] of signAssetMappings) {
    assert.ok(fs.existsSync(path.join(uploadsPath, asset)), 'sign asset exists: ' + asset);
    assert.match(pageHtml, new RegExp('data-sign-asset="' + asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"'));
  }
});

test('ROAD_SIGN_IMAGE_LABEL_MATCH=PASS', () => {
  for (const [asset, label] of signAssetMappings) {
    const assetIndex = pageHtml.indexOf('data-sign-asset="' + asset + '"');
    const cardEnd = pageHtml.indexOf('</article>', assetIndex);
    const card = pageHtml.slice(assetIndex, cardEnd);
    assert.notEqual(assetIndex, -1, 'asset mapping exists: ' + asset);
    assert.match(card, new RegExp('<h4>' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</h4>'));
  }
});

test('ROAD_SIGN_ALT_TEXT=PASS', () => {
  const cards = [...pageHtml.matchAll(/<article class="road-sign-example"[\s\S]*?<\/article>/g)];
  assert.equal(cards.length, signAssetMappings.length);
  for (const card of cards) {
    assert.match(card[0], /<img[^>]+alt="Icyapa [^"]+"/);
  }
});

test('ROAD_SIGN_OFFICIAL_TERMINOLOGY=PASS', () => {
  for (const heading of ['IBYAPA BIBURIRA', 'IBYAPA BY’UBURENGANZIRA CYANGWA GUTAMBUKA MBERE', 'IBYAPA BIBUZA', 'IBYAPA BITEGEKA', 'IBYAPA NDANGA CYANGWA BIYOBORA']) {
    assert.ok(pageHtml.includes(heading), 'category terminology present: ' + heading);
  }
  assert.match(pageHtml, /Umuhanda umanuka cyane/);
  assert.match(pageHtml, /Ifungana ry’umuhanda/);
});

test('ROAD_SIGN_NO_FAKE_ICONS=PASS', () => {
  const categoryStart = pageHtml.indexOf('<div class="road-sign-categories">');
  const categoryEnd = pageHtml.indexOf('class="road-sign-learning-note"', categoryStart);
  const explainer = pageHtml.slice(categoryStart, categoryEnd);
  assert.doesNotMatch(explainer, /road-sign-category-icon|fa-(?:triangle-exclamation|ban|arrow-right|circle-info)/);
});

test('ROAD_SIGN_RESPONSIVE=PASS', () => {
  assert.match(themeCss, /\.road-sign-examples\s*\{[^}]*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(themeCss, /@media\s*\(max-width:\s*1024px\)[\s\S]*\.road-sign-examples\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(themeCss, /@media\s*\(max-width:\s*600px\)[\s\S]*\.road-sign-examples\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(themeCss, /\.road-sign-practice\s*\{[^}]*width:\s*100%/);
  assert.match(pageHtml, /overflow-x:\s*hidden/);
});

test('ROAD_SIGN_SHARE_LINK=PASS', () => {
  assert.match(pageHtml, /id="roadSignShare"/);
  assert.match(pageHtml, /navigator\.share\(/);
  assert.match(pageHtml, /navigator\.clipboard\.writeText\(currentUrl\)/);
  assert.match(pageHtml, /'Ihuza ryakoporowe\.'/);
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

test('ROAD_SIGN_CATEGORY_IMAGE_MAPPING=PASS', () => {
  for (const [headingId, assets] of categoryAssetMappings) {
    const sectionStart = pageHtml.indexOf('<section class="road-sign-category" aria-labelledby="' + headingId + '">');
    const sectionEnd = pageHtml.indexOf('</section>', sectionStart);
    const section = pageHtml.slice(sectionStart, sectionEnd);
    assert.notEqual(sectionStart, -1, 'category exists: ' + headingId);
    for (const asset of assets) {
      assert.ok(section.includes('data-sign-asset="' + asset + '"'), asset + ' belongs to ' + headingId);
    }
  }
});

test('SHARE_UI_KINYARWANDA=PASS', () => {
  assert.match(pageHtml, /Sangiza abandi\s*<\/button>/);
  assert.match(pageHtml, /Ihuza ryakoporowe\./);
  assert.doesNotMatch(pageHtml, /Link copied|Unable to copy link/);
});

test('NO_HORIZONTAL_OVERFLOW=PASS', () => {
  assert.match(pageHtml, /overflow-x:\s*hidden/);
  assert.match(themeCss, /\.road-sign-examples\s*\{[^}]*minmax\(0, 1fr\)/);
  assert.match(themeCss, /\.road-sign-example\s*\{[^}]*min-width:\s*0/);
  assert.match(themeCss, /object-fit:\s*contain/);
});