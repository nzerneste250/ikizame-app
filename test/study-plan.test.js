const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pageHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'ifashanyigisho.html'), 'utf8');

test('study plan section is present with privacy-safe inputs only', () => {
  assert.match(pageHtml, /Tegura gahunda yo kwiga/);
  assert.match(pageHtml, /Hitamo itariki y’ikizamini cyawe, ubone gahunda yoroheje yo kwiga buri munsi\./);
  assert.match(pageHtml, /id="studyPlanExamDate"/);
  assert.match(pageHtml, /name="studyPlanMinutes"/);
  assert.match(pageHtml, /Generate Study Plan/i);
  assert.doesNotMatch(pageHtml, /name=\"name\"|name=\"phone\"|name=\"email\"|name=\"national_id\"/i);
  assert.doesNotMatch(pageHtml, /id=\"studyPlanName\"|id=\"studyPlanPhone\"|id=\"studyPlanEmail\"/i);
});

test('study plan generation creates a local deterministic schedule and ICS export', () => {
  const scriptStart = pageHtml.indexOf('function buildStudyPlan');
  const scriptEnd = pageHtml.indexOf('document.addEventListener(\'DOMContentLoaded\'', scriptStart);
  assert.notEqual(scriptStart, -1, 'study plan generation script exists');
  assert.notEqual(scriptEnd, -1, 'DOMContentLoaded hook exists');

  const script = pageHtml.slice(scriptStart, scriptEnd);
  assert.match(script, /function buildStudyPlan|const buildStudyPlan|window\.generateStudyPlan/);
  assert.match(script, /BEGIN:VCALENDAR|downloadStudyPlanIcs|Blob\(|createObjectURL/);
  assert.match(script, /selectedExamDate|dailyMinutes|daysRemaining/);
  assert.match(pageHtml, /@media\s*\(max-width:\s*768px\)|@media\s*\(max-width:\s*430px\)|@media\s*\(max-width:\s*360px\)/);
  assert.match(pageHtml, /overflow-x:\s*hidden/);
});
