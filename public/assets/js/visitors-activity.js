/* Visitors presentation only: existing API data is filtered locally. */
let _summaryData = [], _sumPage = 1;
const SUM_PER_PAGE = 10;
let visitorReady = false, visitorFailed = false, visitorView = 'table', visitorToday = '';

function visitorEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function visitorDeltaClass(value) { return Number(value) > 0 ? 'delta-up' : Number(value) < 0 ? 'delta-down' : 'delta-neutral'; }
function visitorCount(value) { return Number(value).toLocaleString(); }
function visitorPreviousDate(day) {
    const date = new Date(day + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}
function visitorFinishLoading() {
    document.querySelectorAll('.visitor-loading').forEach(el => el.classList.remove('visitor-loading'));
    document.querySelector('.activity-panel').setAttribute('aria-busy', 'false');
}
function buildChart(rows) {
    // Called by the existing loader. Render the chart only when its view is opened.
    if (visitorReady && visitorView === 'chart') renderVisitorChart(visitorFilteredRecords());
}
function buildSummary(daily, today, chart) {
    visitorToday = today;
    const details = new Map((Array.isArray(daily) ? daily : []).map(r => {
        const ips = r.ips || [];
        const totalVisits = ips.reduce((a, ip) => a + (ip.count || 1), 0);
        const peak = ips.reduce((a, ip) => (ip.count || 1) > (a.count || 1) ? ip : a, ips[0] || {});
        return [r.day, {day:r.day, unique:ips.length, totalVisits, peakIp:peak.ip || '—'}];
    }));
    // The chart endpoint supplies the real daily unique-IP aggregates.
    const rows = Array.isArray(chart) && chart.length ? chart.map(r => ({
        day:r.day, unique:Number(r.unique_visitors) || 0,
        totalVisits:details.get(r.day)?.totalVisits ?? r.total_visits ?? null,
        peakIp:details.get(r.day)?.peakIp ?? null
    })) : Array.from(details.values());
    const counts = new Map(rows.map(r => [r.day, r.unique]));
    _summaryData = rows.map(r => ({...r, previous:counts.get(visitorPreviousDate(r.day)) ?? null}));
    visitorReady = true;
    visitorFailed = false;
    _sumPage = 1;
    visitorFinishLoading();
    renderSummary();
}
function visitorFilteredRecords() {
    const range = document.getElementById('visitorRange').value;
    const query = document.getElementById('sumSearch').value.trim().toLowerCase();
    let cutoff = '';
    if (range !== 'all') {
        const date = new Date(visitorToday + 'T00:00:00Z');
        date.setUTCDate(date.getUTCDate() - (Number(range) - 1));
        cutoff = date.toISOString().slice(0, 10);
    }
    const records = _summaryData.filter(r => {
        const weekday = new Date(r.day + 'T00:00:00').toLocaleDateString('en-GB', {weekday:'long'});
        return (!cutoff || r.day >= cutoff) && (!query || (r.day + ' ' + fd(r.day) + ' ' + weekday).toLowerCase().includes(query));
    });
    const order = document.getElementById('visitorSort').value;
    return records.sort((a, b) => {
        if (order === 'oldest') return a.day.localeCompare(b.day);
        if (order === 'highest') return b.unique - a.unique || b.day.localeCompare(a.day);
        if (order === 'lowest') return a.unique - b.unique || b.day.localeCompare(a.day);
        return b.day.localeCompare(a.day);
    });
}
function visitorEmptyMarkup() {
    const noData = !_summaryData.length;
    return '<div class="visitor-empty"><i class="fa-solid ' + (noData ? 'fa-chart-simple' : 'fa-magnifying-glass') + '" aria-hidden="true"></i><strong>' + (noData ? 'No visitor records found' : 'No visitor records match your filters.') + '</strong><p>' + (noData ? 'Visitor activity will appear when traffic is recorded.' : 'Try another date or select a wider date range.') + '</p>' + (noData ? '' : '<button type="button" onclick="clearVisitorFilters()">Clear Filters</button>') + '</div>';
}
function renderVisitorPeriod(records) {
    const values = records.map(r => r.unique);
    const total = values.reduce((sum, value) => sum + value, 0);
    const highest = records.length ? records.reduce((a, b) => b.unique > a.unique ? b : a) : null;
    const lowest = records.length ? records.reduce((a, b) => b.unique < a.unique ? b : a) : null;
    document.getElementById('periodTotal').textContent = records.length ? visitorCount(total) : '—';
    document.getElementById('periodAverage').textContent = records.length ? (total / records.length).toLocaleString(undefined, {maximumFractionDigits:1}) : '—';
    document.getElementById('periodHigh').textContent = highest ? visitorCount(highest.unique) : '—';
    document.getElementById('periodHighDate').textContent = highest ? fd(highest.day) : '—';
    document.getElementById('periodLow').textContent = lowest ? visitorCount(lowest.unique) : '—';
    document.getElementById('periodLowDate').textContent = lowest ? fd(lowest.day) : '—';
}
function visitorChange(record) {
    if (record.previous === null || record.previous === 0) return '<span class="change-pill delta-neutral" title="No nonzero previous-day count available">—</span>';
    const percentage = Math.round(((record.unique - record.previous) / record.previous) * 100);
    const direction = percentage > 0 ? '↑ ' : percentage < 0 ? '↓ ' : '';
    const label = percentage > 0 ? 'Increase' : percentage < 0 ? 'Decrease' : 'No change';
    return '<span class="change-pill ' + visitorDeltaClass(percentage) + '" aria-label="' + label + (percentage ? ' ' + Math.abs(percentage) + ' percent' : '') + '">' + direction + Math.abs(percentage) + '%</span>';
}
function renderSummary() {
    if (!visitorReady || visitorFailed) return;
    const records = visitorFilteredRecords();
    renderVisitorPeriod(records);
    const pages = Math.max(1, Math.ceil(records.length / SUM_PER_PAGE));
    _sumPage = Math.max(1, Math.min(_sumPage, pages));
    const start = (_sumPage - 1) * SUM_PER_PAGE;
    const slice = records.slice(start, start + SUM_PER_PAGE);
    document.getElementById('pageInfo').textContent = _sumPage + ' / ' + pages;
    document.getElementById('btnPrev').disabled = _sumPage <= 1;
    document.getElementById('btnNext').disabled = _sumPage >= pages;
    document.getElementById('sumBadge').textContent = records.length + ' day' + (records.length !== 1 ? 's' : '');
    document.getElementById('recordInfo').textContent = records.length ? 'Showing ' + (start + 1) + '–' + Math.min(start + SUM_PER_PAGE, records.length) + ' of ' + records.length + ' days' : '0 days';
    document.getElementById('clearVisitorSearch').hidden = !document.getElementById('sumSearch').value;
    const low = records.length ? Math.min(...records.map(r => r.unique)) : 0;
    const high = records.length ? Math.max(...records.map(r => r.unique)) : 0;
    document.getElementById('sumTb').innerHTML = !slice.length ? '<tr class="visitor-state-row"><td colspan="5">' + visitorEmptyMarkup() + '</td></tr>' : slice.map(r => {
        const traffic = r.unique === 0 ? 'Low' : high === low ? 'Medium' : r.unique >= low + (high - low) * 2 / 3 ? 'High' : r.unique < low + (high - low) / 3 ? 'Low' : 'Medium';
        const weekday = new Date(r.day + 'T00:00:00').toLocaleDateString('en-GB', {weekday:'long'});
        const detail = r.totalVisits !== null || r.peakIp ? '<details class="visitor-record-details"><summary>Visit details</summary><div>' + (r.totalVisits !== null ? '<span>Total Visits <strong>' + visitorEscape(r.totalVisits) + '</strong></span>' : '') + (r.peakIp ? '<span>Peak IP <code>' + visitorEscape(r.peakIp) + '</code></span>' : '') + '</div></details>' : '';
        return '<tr><td data-label="Date"><div class="visitor-date"><time datetime="' + visitorEscape(r.day) + '">' + fd(r.day) + '</time><small>' + weekday + '</small>' + detail + '</div></td>' +
            '<td data-label="Unique Visitors"><strong class="visitor-count">' + visitorCount(r.unique) + '</strong></td>' +
            '<td data-label="Previous Day"><span>' + (r.previous === null ? '—' : visitorCount(r.previous)) + '</span></td>' +
            '<td data-label="Change">' + visitorChange(r) + '</td>' +
            '<td data-label="Traffic Level"><span class="traffic-pill traffic-' + traffic.toLowerCase() + '">' + traffic + '</span></td></tr>';
    }).join('');
    if (visitorView === 'chart') renderVisitorChart(records);
}
function renderVisitorChart(records) {
    const el = document.getElementById('bars');
    if (!records.length) { el.classList.add('chart-is-empty'); el.innerHTML = visitorEmptyMarkup(); return; }
    el.classList.remove('chart-is-empty');
    const chronological = records.slice().sort((a, b) => a.day.localeCompare(b.day));
    const max = Math.max(...chronological.map(r => r.unique), 1);
    const labelStep = Math.max(1, Math.ceil(chronological.length / 6));
    el.style.setProperty('--visitor-bars', chronological.length);
    el.innerHTML = chronological.map((r, i) => {
        const height = Math.max(4, Math.round(r.unique / max * 190));
        const tooltip = fd(r.day) + ': ' + visitorCount(r.unique) + ' visitor' + (r.unique !== 1 ? 's' : '');
        return '<div class="bc"><div class="br" tabindex="0" role="img" aria-label="' + visitorEscape(tooltip) + '" title="' + visitorEscape(tooltip) + '" style="height:' + height + 'px"><span class="bt">' + visitorEscape(tooltip) + '</span></div><span class="bl">' + (i % labelStep === 0 || i === chronological.length - 1 ? fd(r.day).slice(0, 6) : '') + '</span></div>';
    }).join('');
    document.getElementById('chartPeriodLabel').textContent = fd(chronological[0].day) + ' – ' + fd(chronological[chronological.length - 1].day);
}
function changePage(direction) { _sumPage += direction; renderSummary(); }
function clearVisitorFilters() {
    document.getElementById('sumSearch').value = '';
    document.getElementById('visitorRange').value = '30';
    document.getElementById('visitorSort').value = 'newest';
    _sumPage = 1;
    renderSummary();
}
function setVisitorView(view) {
    visitorView = view;
    document.getElementById('visitorTableView').hidden = view !== 'table';
    document.getElementById('visitorChartView').hidden = view !== 'chart';
    document.getElementById('tableViewButton').setAttribute('aria-pressed', String(view === 'table'));
    document.getElementById('chartViewButton').setAttribute('aria-pressed', String(view === 'chart'));
    if (visitorReady && !visitorFailed) renderSummary();
    if (view === 'table') document.getElementById('bars').replaceChildren();
}
function showVisitorError() {
    visitorFailed = true;
    visitorFinishLoading();
    ['vT','vW','vM','vY','vA','todayVal','weekVal','monthVal','deltaToday','deltaWeek','deltaMonth','periodTotal','periodAverage','periodHigh','periodLow'].forEach(id => document.getElementById(id).textContent = '—');
    document.getElementById('sumBadge').textContent = 'Unavailable';
    document.getElementById('recordInfo').textContent = 'Unable to load records';
    const markup = '<div class="visitor-empty visitor-error"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><strong>Unable to load visitor analytics.</strong><p>Please try again.</p><button type="button" onclick="location.reload()">Try Again</button></div>';
    document.getElementById('sumTb').innerHTML = '<tr class="visitor-state-row"><td colspan="5">' + markup + '</td></tr>';
    document.getElementById('bars').classList.add('chart-is-empty');
    document.getElementById('bars').innerHTML = markup;
    document.getElementById('topIpsBody').innerHTML = '<tr><td colspan="3">Unable to load visitor sources.</td></tr>';
}
document.addEventListener('DOMContentLoaded', () => {
    const update = () => { _sumPage = 1; renderSummary(); };
    document.getElementById('sumSearch').addEventListener('input', update);
    document.getElementById('visitorRange').addEventListener('change', update);
    document.getElementById('visitorSort').addEventListener('change', update);
    document.getElementById('clearVisitorSearch').addEventListener('click', () => {
        document.getElementById('sumSearch').value = ''; update(); document.getElementById('sumSearch').focus();
    });
    document.getElementById('tableViewButton').addEventListener('click', () => setVisitorView('table'));
    document.getElementById('chartViewButton').addEventListener('click', () => setVisitorView('chart'));
});
