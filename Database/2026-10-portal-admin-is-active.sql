-- Add the admin activation flag without changing existing accounts or roles.
-- Compatible with MySQL 8.0: avoids unsupported ADD COLUMN IF NOT EXISTS.
SET @portal_admin_is_active_sql := (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE portal_admins ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
        'SELECT 1')
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'portal_admins'
      AND column_name = 'is_active'
);
PREPARE portal_admin_is_active_stmt FROM @portal_admin_is_active_sql;
EXECUTE portal_admin_is_active_stmt;
DEALLOCATE PREPARE portal_admin_is_active_stmt;
