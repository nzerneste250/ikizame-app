const ADMIN_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function getAdminSessionState(req) {
    if (!req.session || !req.session.isAdminAuthenticated) return false;
    if (!req.session.lastAdminActivity) return false;
    if (Date.now() - req.session.lastAdminActivity > ADMIN_IDLE_TIMEOUT_MS) return false;
    req.session.lastAdminActivity = Date.now();
    return true;
}

function destroyAdminSession(req, res, callback) {
    if (req.session) {
        req.session.destroy(() => {
            if (typeof callback === 'function') callback();
        });
    } else if (typeof callback === 'function') {
        callback();
    }
}

const SAFE_ADMIN_PATHS = new Set([
    '/dashboard', '/viewer-dashboard', '/admin-users', '/admin-payments',
    '/admin-paypack', '/change-password', '/add-exam', '/edit-exam',
    '/system-performance', '/visitors', '/upload-resource'
]);

function getSafeAdminPath(value) {
    const raw = String(value || '').trim();
    if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return '';
    const pathname = raw.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
    return SAFE_ADMIN_PATHS.has(pathname) ? pathname : '';
}

function redirectToAdminLogin(req, res) {
    const nextPath = getSafeAdminPath(req.path);
    const loginPath = nextPath ? `/admin-login?next=${encodeURIComponent(nextPath)}` : '/admin-login';
    res.set('Cache-Control', 'no-store, private');
    destroyAdminSession(req, () => res.redirect(loginPath));
}

function requireAdminLogin(req, res, next) {
    if (getAdminSessionState(req)) return next();
    destroyAdminSession(req, () => {
        res.status(401).send('Unauthorized. Please login.');
    });
}

function restrictAccessToAuthorizedUsers(req, res, next) {
    if (req.path.startsWith('/api/exams/submit')) return next();

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="IKIZAME Secure Staging Portal"');
        return res.status(401).send('Authentication Required to Access This Staging Site.');
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'basic') {
        res.setHeader('WWW-Authenticate', 'Basic realm="IKIZAME Secure Staging Portal"');
        return res.status(401).send('Authentication Required.');
    }

    const authCredentials = Buffer.from(tokenParts[1], 'base64').toString().split(':');
    const usernameInput = authCredentials[0];
    const passwordInput = authCredentials[1];

    const STAGING_USERNAME = process.env.STAGING_USERNAME || 'admin';
    const STAGING_PASSWORD = process.env.STAGING_PASSWORD || 'changeme';

    if (usernameInput === STAGING_USERNAME && passwordInput === STAGING_PASSWORD) return next();

    res.setHeader('WWW-Authenticate', 'Basic realm="IKIZAME Secure Staging Portal"');
    return res.status(401).send('Invalid Authorization Credentials provided.');
}

module.exports = {
    getAdminSessionState,
    destroyAdminSession,
    redirectToAdminLogin,
    requireAdminLogin,
    restrictAccessToAuthorizedUsers,
    getSafeAdminPath
};
