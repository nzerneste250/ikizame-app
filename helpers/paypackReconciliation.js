const { normalizeAndValidatePaymentPhone } = require('./paymentPhone');

function isSuccessfulPaypackStatus(status) {
    const normalized = String(status || '').toLowerCase();
    return normalized === 'successful' || normalized === 'success';
}

function matchesExpectedPayment(transaction, pending, reference, merchant) {
    try {
        return Boolean(transaction) && transaction.ref === reference && transaction.kind === 'CASHIN' &&
            String(transaction.merchant || '') === merchant &&
            Number(transaction.amount) === Number(pending.amount) && Number(transaction.amount) > 0 &&
            normalizeAndValidatePaymentPhone(transaction.client) === normalizeAndValidatePaymentPhone(pending.phone);
    } catch (_) {
        return false;
    }
}

function findProcessedEvent(eventsResponse, reference, eventId) {
    const events = Array.isArray(eventsResponse?.transactions) ? eventsResponse.transactions : [];
    return events.find(event => event.event_id === eventId && event.event_kind === 'transaction:processed' && event.data?.ref === reference) || null;
}

function verifyReconciliationEvidence({ transaction, eventsResponse, pending, reference, eventId, merchant }) {
    const event = findProcessedEvent(eventsResponse, reference, eventId);
    if (!matchesExpectedPayment(transaction, pending, reference, merchant)) return { ok: false, reason: 'transaction_mismatch' };
    if (!event || !isSuccessfulPaypackStatus(event.data.status)) return { ok: false, reason: 'processed_event_not_successful' };
    if (!matchesExpectedPayment(event.data, pending, reference, merchant)) return { ok: false, reason: 'event_mismatch' };
    const processedAt = Date.parse(event.data.processed_at);
    const expiresAt = new Date(pending.expiresAt).getTime();
    if (!Number.isFinite(processedAt) || !Number.isFinite(expiresAt) || processedAt > expiresAt) {
        return { ok: false, reason: 'event_outside_pending_order_window' };
    }
    return { ok: true, source: 'PAYPACK_EVENTS_API', event };
}

module.exports = { isSuccessfulPaypackStatus, matchesExpectedPayment, verifyReconciliationEvidence };
