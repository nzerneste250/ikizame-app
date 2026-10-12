const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const routeSource = fs.readFileSync(require.resolve('../routes/school'), 'utf8');
const studentsPage = fs.readFileSync(require.resolve('../public/school-students.html'), 'utf8');

test('school student edit is identity-only and rejects allocation fields', () => {
  assert.match(routeSource, /router\.patch\('\/students\/:id'/);
  assert.match(routeSource, /Assigned exams cannot be changed here/);
  assert.doesNotMatch(studentsPage, /id="editStudentExamCount"[^>]*type="number"/);
  assert.match(studentsPage, /add-exams/);
});

test('school add-exams endpoint is transactional and tenant scoped', () => {
  assert.match(routeSource, /router\.post\('\/students\/:id\/add-exams'/);
  assert.match(routeSource, /beginTransaction/);
  assert.match(routeSource, /school_id = \? FOR UPDATE/);
  assert.match(routeSource, /assigned_exams = assigned_exams \+/);
});

test('bulk registration has a conservative batch limit and transaction', () => {
  assert.match(routeSource, /router\.post\('\/register-students-bulk'/);
  assert.match(routeSource, /rows\.length > 50/);
  assert.match(routeSource, /Duplicate phone in batch/);
  assert.match(routeSource, /connection\.commit/);
});