const { normalizeRwandaPhone } = require('./rwandaPhone');

function normalizePhone(phoneString) {
  return normalizeRwandaPhone(phoneString);
}

function normalizeAndValidatePaymentPhone(phoneString) {
  return normalizePhone(phoneString);
}

module.exports = {
  normalizePhone,
  normalizeAndValidatePaymentPhone,
};
