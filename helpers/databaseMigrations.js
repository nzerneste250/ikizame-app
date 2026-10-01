function ensurePortalAdminIsActiveColumn(connection, done) {
    connection.query(
        `SELECT COUNT(*) AS count
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'portal_admins'
           AND column_name = 'is_active'`,
        (lookupError, rows) => {
            if (lookupError) return done(lookupError);
            if (Number(rows?.[0]?.count || 0) > 0) return done(null, false);
            connection.query(
                'ALTER TABLE portal_admins ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1',
                alterError => done(alterError || null, !alterError)
            );
        }
    );
}

module.exports = { ensurePortalAdminIsActiveColumn };
