-- Run before executing scripts/reconcile-paypack-payment.js with --execute.
-- This records approved recovery actions without retaining credentials or PII.
CREATE TABLE IF NOT EXISTS payment_reconciliation_audit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_reference VARCHAR(128) NOT NULL,
    provider_event_id VARCHAR(128) NOT NULL,
    operator_name VARCHAR(128) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    verification_source VARCHAR(64) NOT NULL,
    reconciled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_payment_reconciliation_reference (payment_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
