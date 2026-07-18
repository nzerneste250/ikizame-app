function normalizeQuestionImageAssetPath(rawValue) {
    if (!rawValue) return '';

    const value = String(rawValue).trim();
    if (!value) return '';

    if (/^(https?:)?\/\//i.test(value)) return value;
    if (value.startsWith('data:')) return value;

    const normalized = value.replace(/^\/+/, '').replace(/^assets\//i, '');
    if (normalized.startsWith('uploads/')) {
        return `assets/${normalized}`;
    }
    if (normalized.startsWith('assets/uploads/')) {
        return `assets/${normalized.replace(/^assets\//i, '')}`;
    }
    return `assets/uploads/${normalized}`;
}

module.exports = {
    normalizeQuestionImageAssetPath
};
