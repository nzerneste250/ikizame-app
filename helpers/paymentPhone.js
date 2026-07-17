const TEST_MODE = process.env.PAYPACK_TEST_MODE === 'true' || process.env.NODE_ENV !== 'production';
const ALLOWED_TEST_NUMBERS = new Set(['0786663377', '0789245524']);

function normalizePhone(phoneString) {
  if (typeof phoneString !== 'string') {
    throw new Error('Phone number is required.');
  }

  const cleaned = phoneString.toString().replace(/[\s\-+]+/g, '').trim();
  if (!cleaned) {
    throw new Error('Phone number is required.');
  }

  let normalized = cleaned;
  if (normalized.startsWith('250')) normalized = '0' + normalized.substring(3);
  if (normalized.length < 10) {
    throw new Error('Nomero yishuriwe ntabwo ari iy\'i Rwanda.');
  }

  return normalized;
}

function normalizeAndValidatePaymentPhone(phoneString) {
  const normalized = normalizePhone(phoneString);

  if (!TEST_MODE) {
    return normalized;
  }

  if (!ALLOWED_TEST_NUMBERS.has(normalized)) {
    throw new Error('This payment flow is in test mode. Only Paypack test numbers are allowed: 0786663377 or 0789245524.');
  }

  return normalized;
}

module.exports = {
  normalizePhone,
  normalizeAndValidatePaymentPhone,
  TEST_MODE,
  ALLOWED_TEST_NUMBERS,
};
