const PAYPACK_TEST_MODE_VALUE = process.env.PAYPACK_TEST_MODE;
const TEST_MODE = PAYPACK_TEST_MODE_VALUE === 'true';

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
  return normalizePhone(phoneString);
}

module.exports = {
  normalizePhone,
  normalizeAndValidatePaymentPhone,
  TEST_MODE,
};
