/**
 * IKIZAME Admin Session Guard
 * - 5-minute idle timeout with live countdown in sidebar
 * - Warning toast at 1 minute remaining
 * - Polls /api/admin/check-session every 60s to catch server-side expiry
 * - On browser/tab close: session cookie (no maxAge) is cleared automatically by browser
 * - Does NOT fire logout on page navigation (no beforeunload)
 */
(function () {
    const IDLE_MS   = 5 * 60 * 1000;
    const WARN_MS   = 60 * 1000;
    const POLL_MS   = 60 * 1000;
    const LOGIN_URL = '/admin-login';

    let idleTimer, warnTimer, cdInterval, pollInterval, rafId;
    let idleStart = Date.now();

    const modal   = document.getElementById('adminSessionModal');
    const toast   = document.getElementById('adminSessionToast');
    const toastSec = document.getElementById('adminToastSec');
    const cdEl    = document.getElementById('adminModalCd');
    const sbTimer = document.getElementById('sidebarTimerVal');

    function fmt(ms) {
        const s = Math.max(0, Math.ceil(ms / 1000));
        const m = Math.floor(s / 60);
        return m + ':' + String(s % 60).padStart(2, '0');
    }

    function doLogout() {
        clearAll();
        fetch('/api/admin/logout', { method: 'POST' })
            .finally(() => window.location.replace(LOGIN_URL));
    }
    window.adminDoLogout = doLogout;

    function clearAll() {
        clearTimeout(idleTimer);
        clearTimeout(warnTimer);
        clearInterval(cdInterval);
        clearInterval(pollInterval);
        cancelAnimationFrame(rafId);
    }

    function showExpired() {
        if (toast) toast.style.display = 'none';
        if (modal) modal.style.display = 'flex';
        let c = 5;
        if (cdEl) cdEl.textContent = c;
        cdInterval = setInterval(() => {
            c--;
            if (cdEl) cdEl.textContent = c;
            if (c <= 0) { clearInterval(cdInterval); doLogout(); }
        }, 1000);
    }

    function tick() {
        const remaining = IDLE_MS - (Date.now() - idleStart);
        if (sbTimer) sbTimer.textContent = fmt(remaining);
        if (remaining > 0) rafId = requestAnimationFrame(tick);
    }

    function resetIdle() {
        clearTimeout(idleTimer);
        clearTimeout(warnTimer);
        if (toast) toast.style.display = 'none';
        idleStart = Date.now();
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tick);

        warnTimer = setTimeout(() => {
            const remaining = IDLE_MS - (Date.now() - idleStart);
            let s = Math.ceil(remaining / 1000);
            if (toastSec) toastSec.textContent = s;
            if (toast) toast.style.display = 'flex';
            const iv = setInterval(() => {
                s--;
                if (toastSec) toastSec.textContent = s;
                if (s <= 0) clearInterval(iv);
            }, 1000);
            setTimeout(() => { if (toast) toast.style.display = 'none'; }, remaining);
        }, IDLE_MS - WARN_MS);

        idleTimer = setTimeout(showExpired, IDLE_MS);
    }

    // Poll server to catch server-side session expiry (e.g. server restart)
    function startPoll() {
        pollInterval = setInterval(() => {
            fetch('/api/admin/check-session')
                .then(r => { if (!r.ok) showExpired(); })
                .catch(() => {}); // ignore network errors silently
        }, POLL_MS);
    }

    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
        .forEach(e => document.addEventListener(e, resetIdle, { passive: true }));

    resetIdle();
    startPoll();
})();
