const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyWorkflowRun, getCiStatus, getReportingPeriod, renderReport } = require('../scripts/weekly-project-status');

const latestMain = { sha: '2df15cd94a6e6159fc5068dcccf87fa02c4d2595', title: 'Remove free daily road sign challenge', date: '2026-10-08T07:00:00Z' };
const productionSha = 'cf01accc1ce09b85e2834cee9bed2fa6ffde50b5';

function report(overrides = {}) {
    return renderReport({ latestMain, ci: { status: 'SUCCESS', evidence: 'GitHub Actions conclusion = SUCCESS.' }, production: { sha: productionSha, source: 'direct deployment logs' }, payment: 'PayPack initiation observed only; provider-confirmed payment, entitlement/exam-credit allocation, duplicate protection, and complete end-to-end production verification are not established by initiation logs alone.', reportDate: new Date('2026-10-09T00:00:00Z'), ...overrides });
}

test('WEEKLY_STATUS_LATEST_MAIN_DYNAMIC=PASS', () => {
    const dynamicMain = { sha: 'a'.repeat(40), title: 'A newer commit', date: '2026-11-01T12:00:00Z' };
    const output = report({ latestMain: dynamicMain });
    assert.match(output, /Latest main SHA: a{40}/);
    assert.match(output, /Latest main commit title: A newer commit/);
    assert.doesNotMatch(output, /2df15cd94a6e6159fc5068dcccf87fa02c4d2595/);
});

test('WEEKLY_STATUS_CI_BOUND_TO_MAIN_SHA=PASS', async () => {
    let requestedUrl;
    const request = (url, _options, callback) => {
        requestedUrl = url;
        const response = { statusCode: 200, setEncoding() {}, on(event, handler) { if (event === 'data') handler(JSON.stringify({ workflow_runs: [{ head_sha: latestMain.sha, status: 'completed', conclusion: 'success', name: 'Test', created_at: '2026-10-09T00:00:00Z' }] })); if (event === 'end') handler(); } };
        callback(response);
        return { on() {}, setTimeout() {} };
    };
    const result = await getCiStatus(latestMain.sha, { request });
    assert.equal(result.status, 'SUCCESS');
    assert.match(requestedUrl, /head_sha=2df15cd94a6e6159fc5068dcccf87fa02c4d2595/);
});

test('WEEKLY_STATUS_OLD_FAILURE_NOT_CURRENT=PASS', () => {
    const output = report({ ci: { status: 'SUCCESS', evidence: 'exact latest-SHA success' } });
    assert.match(output, /Latest CI conclusion: SUCCESS/);
    assert.match(output, /e77ac06.*historical and does not represent current main branch health/);
    assert.doesNotMatch(output, /Overall status:.*CI is FAILURE/);
});

test('WEEKLY_STATUS_PRODUCTION_SEPARATE_FROM_MAIN=PASS', () => {
    const output = report();
    assert.match(output, /Latest verified production SHA: cf01accc1ce09b85e2834cee9bed2fa6ffde50b5/);
    assert.match(output, /Main\/production aligned: NO/);
});

test('WEEKLY_STATUS_ALIGNMENT_YES_NO_UNKNOWN=PASS', () => {
    assert.match(report({ production: { sha: latestMain.sha, source: 'verified deployment logs' } }), /Main\/production aligned: YES/);
    assert.match(report({ production: { sha: productionSha, source: 'verified deployment logs' } }), /Main\/production aligned: NO/);
    assert.match(report({ production: { sha: null, source: 'No trustworthy verified production SHA is available.' } }), /Main\/production aligned: UNKNOWN/);
});

test('WEEKLY_STATUS_REMOVED_CHALLENGE_NOT_ACTIVE=PASS', () => {
    const output = report();
    assert.match(output, /Daily Road-Sign Challenge was removed and is not an active feature/);
    assert.match(output, /Five Kinyarwanda road-sign learning categories remain available/);
    assert.match(output, /paid interactive exam conversion CTA/);
});

test('WEEKLY_STATUS_PAYMENT_STATES_SEPARATE=PASS', () => {
    const output = report();
    assert.match(output, /PayPack initiation observed only/);
    assert.match(output, /provider-confirmed payment/);
    assert.match(output, /entitlement\/exam-credit allocation/);
    assert.match(output, /duplicate protection/);
    assert.match(output, /complete end-to-end production verification/);
    assert.doesNotMatch(output, /payment completed successfully/);
});

test('WEEKLY_STATUS_NO_SECRET_DATA=PASS', () => {
    assert.doesNotMatch(report(), /password|token|client_secret|webhook_secret|customer|078\d{7}/i);
});

test('WEEKLY_STATUS_DYNAMIC_REPORT_DATE=PASS', () => {
    const output = report({ reportDate: new Date('2027-01-15T00:00:00Z') });
    assert.match(output, /Date: 2027-01-15/);
    assert.match(output, /Reporting period: 2027-01-08 to 2027-01-15/);
});

test('WEEKLY_STATUS_CONNECTED_SOURCE_LANGUAGE_ACCURATE=PASS', () => {
    const output = report();
    assert.match(output, /GitHub Actions: exact latest-main SHA workflow run checked/);
    assert.match(output, /Production verification record: verified deployment SHA and health checks/);
    assert.match(output, /Gmail: Not checked by this script/);
    assert.match(output, /Google Drive: Not checked by this script/);
    assert.doesNotMatch(output, /No files\/messages found/);
});

test('workflow states classify correctly and historical failures are period-scoped', () => {
    assert.equal(classifyWorkflowRun({ status: 'queued' }).status, 'PENDING');
    assert.equal(classifyWorkflowRun({ status: 'waiting' }).status, 'PENDING');
    assert.equal(classifyWorkflowRun({ status: 'completed', conclusion: 'failure' }).status, 'FAILURE');
    assert.equal(classifyWorkflowRun({ status: 'completed', conclusion: 'success' }).status, 'SUCCESS');
    assert.equal(classifyWorkflowRun({ status: 'mystery' }).status, 'UNKNOWN');
    assert.deepEqual(getReportingPeriod(new Date('2026-10-09T00:00:00Z')), { start: '2026-10-02', end: '2026-10-09' });
    assert.match(report({ reportDate: new Date('2026-12-01T00:00:00Z') }), /No matching historical CI failures recorded for this reporting period/);
});