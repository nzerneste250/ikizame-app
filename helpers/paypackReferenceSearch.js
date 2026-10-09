function normalizePaypackReferenceSearch(value) {
    return String(value ?? '')
        .trim()
        .replace(/^ref\s*:\s*/i, '')
        .trim();
}

function getPaypackReference(row) {
    return String(row?.ref ?? row?.reference ?? '').trim();
}

function matchesPaypackReference(row, rawSearch) {
    const search = normalizePaypackReferenceSearch(rawSearch);
    const reference = getPaypackReference(row);
    if (!search || !reference) return false;

    const referenceLower = reference.toLowerCase();
    const searchLower = search.toLowerCase();
    if (referenceLower === searchLower) return true;

    if (searchLower.includes('...')) {
        const [prefix, suffix] = searchLower.split('...');
        return Boolean(prefix && suffix) && referenceLower.startsWith(prefix) && referenceLower.endsWith(suffix);
    }

    return referenceLower.includes(searchLower);
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