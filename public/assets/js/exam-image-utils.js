function normalizeQuestionImageAssetPath(rawValue) {
    if (rawValue === null || rawValue === undefined) return '';
    const value = String(rawValue).trim();
    if (!value) return '';
    if (/^(https?:)?\/\//i.test(value)) return value;
    if (value.startsWith('data:')) return value;

    const cleaned = value.replace(/^\/+/, '').replace(/^assets\//i, '');
    if (cleaned.startsWith('uploads/')) return `assets/${cleaned}`;
    if (cleaned.startsWith('assets/uploads/')) return `assets/${cleaned.replace(/^assets\//i, '')}`;
    return `assets/uploads/${cleaned}`;
}
