-- Run once on production before deploying the hardened payment callback.
-- These additive changes are compatible with the currently deployed code:
-- old application versions ignore the new columns and table.

ALTER TABLE payment_transactions
    ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) NOT NULL DEFAULT 'EXAMS',
    ADD COLUMN IF NOT EXISTS resource_id INT NULL,
    ADD COLUMN IF NOT EXISTS resource_title VARCHAR(255) NULL;

-- Add the constraint only when no unique index on the reference already exists.
-- If this ALTER reports duplicate values, reconcile them; do not deploy with
-- duplicate successful references.
SET @payment_reference_unique_sql := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE payment_transactions ADD UNIQUE INDEX uq_payment_transactions_reference_id (reference_id)',
        'SELECT 1')
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'payment_transactions'
      AND column_name = 'reference_id'
      AND non_unique = 0
);
PREPARE payment_reference_unique_stmt FROM @payment_reference_unique_sql;
EXECUTE payment_reference_unique_stmt;
DEALLOCATE PREPARE payment_reference_unique_stmt;

CREATE TABLE IF NOT EXISTS pending_payment_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_reference VARCHAR(128) NOT NULL UNIQUE,
    phone_number VARCHAR(32) NULL,
    amount DECIMAL(10,2) NOT NULL,
    plan_name VARCHAR(255) NULL,
    exam_count INT NULL,
    price_per_exam DECIMAL(10,2) NULL,
    school_id INT NULL,
    service_type VARCHAR(50) NOT NULL DEFAULT 'EXAMS',
    resource_id INT NULL,
    resource_title VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pending_payment_reference (payment_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
