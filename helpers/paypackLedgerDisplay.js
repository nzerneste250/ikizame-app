function getPaypackStatus(row) {
    return String(row?.status ?? '').trim();
}

function getPaypackPhone(row) {
    return String(row?.client ?? '').trim();
}

function getPaypackTimestamp(row) {
    return String(row?.timestamp ?? '').trim();
}

function formatPaypackTimestamp(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return 'Not provided';
    const date = new Date(raw);
    if (!Number.isFinite(date.getTime())) return 'Not provided';
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).format(date);
}

module.exports = {
    getPaypackStatus,
    getPaypackPhone,
    getPaypackTimestamp,
    formatPaypackTimestamp
};