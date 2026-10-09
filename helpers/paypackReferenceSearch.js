function normalizePaypackReferenceSearch(value) {
    return String(value ?? '')
        .trim()
        .replace(/^ref\s*:\s*/i, '')
        .replace(/…/g, '...')
        .trim();
}

function getPaypackReference(row) {
    return String(
        row?.ref
        ?? row?.reference
        ?? row?.rwandapay_tx_id
        ?? row?.reference_id
        ?? ''
    ).trim();
}

function matchesPaypackReference(row, rawSearch) {
    const search = normalizePaypackReferenceSearch(rawSearch);
    const reference = getPaypackReference(row);
    if (!search || !reference) return false;

    const referenceLower = reference.toLowerCase();
    const searchLower = search.toLowerCase();
    if (searchLower.includes('...')) {
        const parts = searchLower.split('...');
        if (parts.length !== 2) return false;
        const [prefix, suffix] = parts;
        return Boolean(prefix && suffix) && referenceLower.startsWith(prefix) && referenceLower.endsWith(suffix);
    }

    return referenceLower === searchLower || referenceLower.includes(searchLower);
}

function filterPaypackTransactionsByReference(rows, rawSearch) {
    return (Array.isArray(rows) ? rows : []).filter(row => matchesPaypackReference(row, rawSearch));
}

module.exports = {
    normalizePaypackReferenceSearch,
    getPaypackReference,
    matchesPaypackReference,
    filterPaypackTransactionsByReference
};