const RWANDA_PHONE_PATTERN = /^07[8923]\d{7}$/;
const RWANDA_PHONE_ERROR = 'Nomero igomba gutangira na 078, 079, 072, cyangwa 073 kandi ikagira imibare 10.';

function normalizeRwandaPhone(phoneString) {
  if (phoneString === null || phoneString === undefined) {
    throw new Error('Phone number is required.');
  }

  const raw = String(phoneString).trim();
  if (!raw) throw new Error('Phone number is required.');
  if (!/^[+\d\s()-]+$/.test(raw)) throw new Error(RWANDA_PHONE_ERROR);

  let normalized = raw.replace(/\D/g, '');
  if (normalized.startsWith('00')) normalized = normalized.slice(2);
  if (normalized.startsWith('250')) normalized = '0' + normalized.slice(3);
  if (normalized.length === 9) normalized = '0' + normalized;

  if (!RWANDA_PHONE_PATTERN.test(normalized)) {
    throw new Error(RWANDA_PHONE_ERROR);
  }

  return normalized;
}

module.exports = { normalizeRwandaPhone, RWANDA_PHONE_PATTERN, RWANDA_PHONE_ERROR };
