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

test('school student actions expose a functional labeled Edit control and modal', () => {
  assert.match(studentsPage, /class="edit-student-button"/);
  assert.match(studentsPage, /<span>Edit<\/span>/);
  assert.match(studentsPage, /function startEditStudent\(student\)/);
  assert.match(studentsPage, /id="editStudentPanel" class="edit-panel" role="dialog"/);
  assert.match(studentsPage, /body\.classList\.add\('modal-open'\)/);
  assert.match(studentsPage, /body\.classList\.remove\('modal-open'\)/);
  assert.match(studentsPage, /id="editStudentExamCount" class="readonly-value"/);
});

test('school students provide responsive filters, mobile cards, and add-exams modal', () => {
  assert.match(studentsPage, /id="studentSearch"/);
  assert.match(studentsPage, /id="studentStatusFilter"/);
  assert.match(studentsPage, /id="studentsMobileList"/);
  assert.match(studentsPage, /id="addExamsPanel" class="edit-panel" role="dialog"/);
  assert.match(studentsPage, /function submitAddExams\(\)/);
});

test('school design system is shared and accessibility-oriented', () => {
  const css = fs.readFileSync(require.resolve('../public/assets/css/school-portal.css'), 'utf8');
  assert.match(css, /--school-navy:#0F2747/);
  assert.match(css, /--school-primary:#2563EB/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
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