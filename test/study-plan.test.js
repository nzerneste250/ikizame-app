const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pageHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'ifashanyigisho.html'), 'utf8');
const themeCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'css', 'ifashanyigisho-theme.css'), 'utf8');

test('STUDY_PLAN_NO_IDENTITY_DATA=PASS', () => {
  assert.match(pageHtml, /Tegura gahunda yawe yo kwiga/);
  assert.match(pageHtml, /Hitamo itariki uteganya gukoreraho ikizamini n’igihe ushaka kwiga buri munsi\./);
  assert.match(pageHtml, /id="studyPlanExamDate"/);
  assert.match(pageHtml, /name="studyPlanMinutes"/);
  assert.match(pageHtml, /Kora gahunda yo kwiga/);
  assert.match(pageHtml, /Igihe cyo kwiga buri munsi/);
  assert.match(pageHtml, /Iminota 15[\s\S]*Iminota 20[\s\S]*Iminota 30[\s\S]*Iminota 45/);
  assert.doesNotMatch(pageHtml, /name=\"name\"|name=\"phone\"|name=\"email\"|name=\"national_id\"/i);
  assert.doesNotMatch(pageHtml, /id=\"studyPlanName\"|id=\"studyPlanPhone\"|id=\"studyPlanEmail\"/i);
});

test('STUDY_PLAN_GENERATION=PASS', () => {
  const scriptStart = pageHtml.indexOf('function buildStudyPlan');
  const scriptEnd = pageHtml.indexOf('document.addEventListener(\'DOMContentLoaded\'', scriptStart);
  assert.notEqual(scriptStart, -1, 'study plan generation script exists');
  assert.notEqual(scriptEnd, -1, 'DOMContentLoaded hook exists');

  const script = pageHtml.slice(scriptStart, scriptEnd);
  assert.match(script, /function buildStudyPlan|const buildStudyPlan|window\.generateStudyPlan/);
  assert.match(script, /selectedExamDate|dailyMinutes|daysRemaining/);
  assert.match(pageHtml, /@media\s*\(max-width:\s*768px\)|@media\s*\(max-width:\s*430px\)|@media\s*\(max-width:\s*360px\)/);
  assert.match(pageHtml, /overflow-x:\s*hidden/);
});

test('STUDY_PLAN_LOGIC_UNCHANGED=PASS', () => {
  const scriptStart = pageHtml.indexOf('function buildStudyPlan');
  const scriptEnd = pageHtml.indexOf('function formatStudyPlanDate', scriptStart);
  const script = pageHtml.slice(scriptStart, scriptEnd);
  assert.match(script, /daysRemaining > 14/);
  assert.match(script, /daysRemaining >= 7/);
  assert.match(script, /remaining <= 2/);
  assert.match(script, /\(dayIndex \+ 1\) % 5 === 0/);
  assert.match(script, /\(dayIndex \+ 1\) % 3 === 0/);
  assert.match(script, /\(dayIndex \+ 1\) % 2 === 0/);
  assert.match(script, /currentDate\.setDate\(today\.getDate\(\) \+ dayIndex \+ 1\)/);
  assert.match(script, /durationMinutes: Number\(minutes\)/);
});

test('STUDY_PLAN_ICS_REMOVED=PASS', () => {
  assert.doesNotMatch(pageHtml + themeCss, /BEGIN:VCALENDAR|VEVENT|formatIcsDate|downloadStudyPlanIcs|\.ics|text\/calendar|createObjectURL|revokeObjectURL/i);
  assert.doesNotMatch(pageHtml, /study-plan-download|Download \.ics/i);
});

test('STUDY_PLAN_PRINT_AVAILABLE=PASS', () => {
  assert.match(pageHtml, /Gahunda yawe yo kwiga/);
  assert.match(pageHtml, /Capisha \/ Bika gahunda/);
  assert.match(pageHtml, /window\.print\(\)/);
  assert.match(themeCss, /@media print/);
  assert.match(themeCss, /@page\s*\{\s*size:\s*A4/i);
  assert.match(themeCss, /body > \*\s*\{\s*display:\s*none/i);
});

test('IFASHANYIGISHO_KINYARWANDA_REVIEWED=PASS', () => {
  for (const phrase of ['Amategeko y’umuhanda', 'Ibyapa byo ku muhanda', 'Gutegura ikizamini', 'Icyapa cyo gutanga inzira', 'Umuvuduko ntarengwa']) {
    assert.ok(pageHtml.includes(phrase), 'Kinyarwanda page copy includes: ' + phrase);
  }
  assert.doesNotMatch(pageHtml, /Warning Signs|Regulatory Signs|Mandatory Signs|Information Signs|Generate Study Plan|Your Study Plan|Print \/ Save Plan|Link copied|Unable to copy link/);
});

test('IFASHANYIGISHO_JOINED_WORDS_FIXED=PASS', () => {
  assert.doesNotMatch(pageHtml, /witeguyegukora|Nta imfashanyigisho|Ongera Ugerageze/);
  assert.match(pageHtml, /Witeguye <small>gukora imyitozo\?<\/small>/);
});

test('STUDY_PLAN_KINYARWANDA=PASS', () => {
  for (const phrase of ['Tegura gahunda yawe yo kwiga', 'Igihe cyo kwiga buri munsi', 'Kora gahunda yo kwiga', 'Gahunda yawe yo kwiga', 'Itariki y’ikizamini']) {
    assert.ok(pageHtml.includes(phrase), 'Study Plan copy includes: ' + phrase);
  }
  for (const topic of ['Ibyapa byo ku muhanda', 'Amategeko y’umuhanda', 'Inkomane no gutambuka mbere', 'Umutekano wo mu muhanda', 'Imyitozo y’ikizamini', 'Gusubiramo aho ugikeneye kwiga']) {
    assert.ok(pageHtml.includes(topic), 'Study Plan topic is localized: ' + topic);
  }
  assert.match(pageHtml, /Capisha \/ Bika gahunda/);
});
