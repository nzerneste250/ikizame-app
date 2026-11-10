-- Add durable package metadata and lifecycle status for school PayPack orders.
-- Existing pending-payment rows and historical payment transactions are preserved.
-- Apply after 2026-10-payment-webhook-hardening.sql, which creates the pending-order table.

SET @pending_school_package_id_sql := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE pending_payment_requests ADD COLUMN package_id VARCHAR(32) NULL',
        'SELECT 1')
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'pending_payment_requests'
      AND column_name = 'package_id'
);
PREPARE pending_school_package_id_stmt FROM @pending_school_package_id_sql;
EXECUTE pending_school_package_id_stmt;
DEALLOCATE PREPARE pending_school_package_id_stmt;

SET @pending_payment_provider_sql := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE pending_payment_requests ADD COLUMN provider VARCHAR(32) NULL',
        'SELECT 1')
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'pending_payment_requests'
      AND column_name = 'provider'
);
PREPARE pending_payment_provider_stmt FROM @pending_payment_provider_sql;
EXECUTE pending_payment_provider_stmt;
DEALLOCATE PREPARE pending_payment_provider_stmt;

SET @pending_payment_status_sql := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE pending_payment_requests ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''PENDING''',
        'SELECT 1')
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'pending_payment_requests'
      AND column_name = 'status'
);
PREPARE pending_payment_status_stmt FROM @pending_payment_status_sql;
EXECUTE pending_payment_status_stmt;
DEALLOCATE PREPARE pending_payment_status_stmt;
