const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const REPOSITORY = process.env.GITHUB_REPOSITORY || 'nzerneste250/ikizame-app';
const PRODUCTION_STATE_FILE = path.join(__dirname, '..', 'docs', 'production-state.json');
const KNOWN_HISTORICAL_FAILURE = {
    sha: 'e77ac0668118b76a5a47d8969d36565c02d6765e',
    title: 'Add daily road sign challenge',
    cause: 'public accessibility/localization regression checks',
    failedAt: '2026-10-08',
    resolution: 'cf01accc1ce09b85e2834cee9bed2fa6ffde50b5'
};
const PENDING_STATUSES = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);

function runGit(args, cwd = process.cwd()) {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function getLatestMain(cwd = process.cwd()) {
    let sha;
    try { sha = runGit(['rev-parse', 'refs/remotes/origin/main'], cwd); } catch { sha = runGit(['rev-parse', 'main'], cwd); }
    return {
        sha,
        title: runGit(['log', '-1', '--format=%s', sha], cwd),
        date: runGit(['log', '-1', '--format=%cI', sha], cwd)
    };
}

function requestJson(url, { token, request = https.get } = {}) {
    return new Promise((resolve, reject) => {
        const req = request(url, {
            headers: {
                Accept: 'application/vnd.github+json',
                'User-Agent': 'ikizame-weekly-status',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        }, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => {
                if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`GitHub API returned HTTP ${res.statusCode}`));
                try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
            });
        });
        req.setTimeout?.(5000, () => req.destroy(new Error('GitHub API request timed out')));
        req.on('error', reject);
    });
}

function classifyWorkflowRun(run) {
    const status = String(run.status || '').toLowerCase();
    if (PENDING_STATUSES.has(status)) return { status: 'PENDING', evidence: `${run.name || 'GitHub Actions'} is ${status}.`, run };
    if (status !== 'completed') return { status: 'UNKNOWN', evidence: `Unrecognized GitHub Actions state: ${status || 'missing status'}.`, run };
    const conclusion = String(run.conclusion || '').toLowerCase();
    return {
        status: conclusion === 'success' ? 'SUCCESS' : 'FAILURE',
        evidence: `${run.name || 'GitHub Actions'} conclusion = ${conclusion.toUpperCase() || 'UNKNOWN'}.`,
        run
    };
}

async function getCiStatus(sha, options = {}) {
    const url = `https://api.github.com/repos/${options.repository || REPOSITORY}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=20`;
    try {
        const payload = await requestJson(url, { token: options.token || process.env.GITHUB_TOKEN, request: options.request });
        const runs = (payload.workflow_runs || []).filter(run => run.head_sha === sha);
        if (!runs.length) return { status: 'UNKNOWN', evidence: 'No workflow run was returned for the exact latest-main SHA.' };
        const run = runs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
        return classifyWorkflowRun(run);
    } catch (error) {
        return { status: 'UNKNOWN', evidence: `Exact-SHA GitHub verification unavailable: ${error.message}` };
    }
}

function readProductionState(file = PRODUCTION_STATE_FILE) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function getProductionEvidence(options = {}) {
    if (options.production) return options.production;
    const state = readProductionState(options.productionStateFile);
    const sha = state && typeof state.verifiedProductionSha === 'string' && /^[0-9a-f]{40}$/i.test(state.verifiedProductionSha)
        ? state.verifiedProductionSha : null;
    return {
        sha,
        source: sha ? (state.source || 'Direct production verification record.') : 'No trustworthy verified production SHA is available.',
        verifiedAt: state && state.verifiedAt,
        verification: state && state.verification
    };
}

function paymentStatus(options = {}) {
    return options.paymentEvidence || process.env.IKIZAME_PAYMENT_EVIDENCE ||
        'PayPack initiation observed only; provider-confirmed payment, entitlement/exam-credit allocation, duplicate protection, and complete end-to-end production verification are not established by initiation logs alone.';
}

function getReportingPeriod(reportDate) {
    const end = new Date(reportDate);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 7);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function historicalFailuresForPeriod(period, failures = [KNOWN_HISTORICAL_FAILURE]) {
    return failures.filter(failure => failure.operationallyRelevant || (failure.failedAt >= period.start && failure.failedAt <= period.end));
}

function renderReport({ latestMain, ci, production, payment, reportDate = new Date(), historicalFailures }) {
    const period = getReportingPeriod(reportDate);
    const aligned = production.sha ? (latestMain.sha === production.sha ? 'YES' : 'NO') : 'UNKNOWN';
    const overall = aligned === 'YES' && ci.status === 'SUCCESS'
        ? 'Active development; latest main, CI and production deployment are aligned and healthy.'
        : ci.status === 'SUCCESS'
            ? 'Active development; latest GitHub main and CI are healthy. Production should be checked against the latest main commit before confirming full deployment parity.'
            : `Active development; latest main is present, but exact-main CI is ${ci.status}. Production and CI evidence require follow-up before declaring the project healthy.`;
    const historical = historicalFailuresForPeriod(period, historicalFailures).map(failure =>
        `- ${failure.sha.slice(0, 7)} — ${failure.title} — failed CI due to ${failure.cause}; resolved by ${failure.resolution.slice(0, 7)}. It is historical and does not represent current main branch health.`
    );
    const historicalText = historical.length ? historical.join('\n') : '- No matching historical CI failures recorded for this reporting period.';
    const productionLine = production.sha || 'UNKNOWN';
    const alignmentLine = aligned === 'YES'
        ? `GitHub main and production are both verified at ${latestMain.sha}.`
        : aligned === 'NO'
            ? `GitHub main is at ${latestMain.sha.slice(0, 7)}, while the latest directly verified production deployment evidence is ${production.sha.slice(0, 7)}.`
            : 'Production alignment is UNKNOWN because no trustworthy verified production SHA is available.';
    return `IKIZAME.RW — Weekly Project Status

Date: ${reportDate.toISOString().slice(0, 10)}
Reporting period: ${period.start} to ${period.end}
Overall status: ${overall}

1. Product development
- Terms page localized into Kinyarwanda.
- Mobile zoom accessibility restored.
- Open Graph/Twitter metadata added.
- Public accessibility/localization regressions fixed.
- The free Daily Road-Sign Challenge was removed and is not an active feature.
- Five Kinyarwanda road-sign learning categories remain available.
- The paid interactive exam conversion CTA remains available at /exam and /ibiciro.
- IKIZAME's interactive exam experience is a paid product.

2. Deployment, hosting and security
- Latest verified production SHA: ${productionLine}
- Evidence: ${production.source}
- Main/production aligned: ${aligned}
- ${alignmentLine}
- Do not infer production parity from GitHub alone.

3. Payment integration
- ${payment}

4. CI / GitHub status
- Latest main SHA: ${latestMain.sha}
- Latest main commit title: ${latestMain.title}
- Latest main commit date: ${latestMain.date}
- Latest CI conclusion: ${ci.status}
- CI evidence: ${ci.evidence}
- Recent CI history (historical only):
${historicalText}

5. Key blockers and risks
- ${aligned === 'YES' ? 'No main/production SHA drift is known from the supplied evidence.' : aligned === 'NO' ? 'Production is not verified at the latest main SHA; deployment parity remains an unresolved risk.' : 'Production alignment is unknown and must not be guessed.'}
- GitHub notification emails are not authoritative without exact-SHA repository verification.
- Payment evidence must distinguish initiation, provider confirmation, credit allocation, duplicate protection, and complete end-to-end verification.

6. Three priority next actions
1. Verify or deploy production at ${latestMain.sha} only after authorization.
2. Re-check the exact latest-main GitHub Actions run and record its conclusion.
3. Capture provider-confirmed PayPack success through credit allocation and duplicate/replay handling.

7. Connected-source coverage
- Git: commits, branch state, titles, and dates checked during report generation.
- GitHub Actions: exact latest-main SHA workflow run checked; status is UNKNOWN when unavailable.
- Production verification record: verified deployment SHA and health checks from docs/production-state.json.
- Gmail: Not checked by this script; no email notification is treated as current repository state.
- Google Drive: Not checked by this script.
`;
}

async function buildReport(options = {}) {
    const latestMain = options.latestMain || getLatestMain(options.cwd);
    const ci = options.ci || await getCiStatus(latestMain.sha, options);
    const production = getProductionEvidence(options);
    return renderReport({ latestMain, ci, production, payment: paymentStatus(options), reportDate: options.reportDate || new Date(), historicalFailures: options.historicalFailures });
}

if (require.main === module) {
    buildReport().then(report => process.stdout.write(report)).catch(error => {
        console.error(`Unable to build weekly project status: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = { buildReport, classifyWorkflowRun, getCiStatus, getLatestMain, getProductionEvidence, getReportingPeriod, renderReport };