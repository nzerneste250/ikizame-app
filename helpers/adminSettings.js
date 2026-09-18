const PROTECTED_REPORT_EMAIL = 'ikizame.rw@gmail.com';
const LEGACY_REPORT_EMAIL = 'dotadostationarystore@gmail.com';

const LEGACY_REPORT_EMAILS = ['dotadostationerystore@gmail.com', 'dotadostationarystore@gmail.com'];

function normalizePhoneNumber(value) {
  if (value === null || value === undefined) return '';
  let cleaned = String(value).trim();
  cleaned = cleaned.replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.startsWith('250')) cleaned = '0' + cleaned.slice(3);

  cleaned = cleaned.replace(/\D/g, '');

  if (cleaned.length === 9) return '0' + cleaned;
  if (cleaned.length === 10 && cleaned.startsWith('0')) return cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('250')) return '0' + cleaned.slice(3);

  return cleaned;
}

function normalizeEmailList(raw) {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : String(raw).split(/[\n,;]+/);
  const unique = [];
  const seen = new Set();

  for (const item of items) {
    const email = String(item).trim().toLowerCase();
    if (!email || !email.includes('@') || seen.has(email)) continue;
    seen.add(email);
    unique.push(email);
  }

  return unique;
}

function getConfiguredReportEmails(rows, fallback = []) {
  const configured = (rows || []).flatMap((row) => normalizeEmailList(row.email || row.email_address || row.value || row.recipients || row.addresses));
  const fallbackList = normalizeEmailList(fallback);
  const merged = [PROTECTED_REPORT_EMAIL, ...configured, ...fallbackList];
  const filtered = merged.filter((email) => !LEGACY_REPORT_EMAILS.includes(email));
  return [...new Set(filtered)];
}

module.exports = {
  PROTECTED_REPORT_EMAIL,
  LEGACY_REPORT_EMAIL,
  LEGACY_REPORT_EMAILS,
  normalizePhoneNumber,
  normalizeEmailList,
  getConfiguredReportEmails
};
