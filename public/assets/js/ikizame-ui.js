/**
 * IKIZAME UI — Shared toast, alert & confirm utilities
 * Replaces native alert() and confirm() with styled modals.
 */
(function () {
    /* ── Inject styles once ── */
    if (!document.getElementById('ikizame-ui-styles')) {
        const style = document.createElement('style');
        style.id = 'ikizame-ui-styles';
        style.textContent = `
/* ── TOAST ── */
#ik-toast-container{position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;}
.ik-toast{display:flex;align-items:flex-start;gap:12px;background:#fff;border-radius:16px;padding:14px 16px;min-width:300px;max-width:380px;box-shadow:0 12px 40px rgba(15,23,42,0.18),0 2px 8px rgba(15,23,42,0.08);border:1px solid #e2e8f0;pointer-events:all;animation:ikToastIn .35s cubic-bezier(.16,1,.3,1) forwards;font-family:'Inter','Plus Jakarta Sans',sans-serif;}
.ik-toast.removing{animation:ikToastOut .25s ease forwards;}
@keyframes ikToastIn{from{opacity:0;transform:translateX(50px) scale(.96)}to{opacity:1;transform:none}}
@keyframes ikToastOut{to{opacity:0;transform:translateX(50px)}}
.ik-toast-icon{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.05rem;flex-shrink:0;}
.ik-toast.success .ik-toast-icon{background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#16a34a;}
.ik-toast.error   .ik-toast-icon{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#dc2626;}
.ik-toast.warning .ik-toast-icon{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#d97706;}
.ik-toast.info    .ik-toast-icon{background:linear-gradient(135deg,#e0f2fe,#bae6fd);color:#0369a1;}
.ik-toast-body{flex:1;min-width:0;}
.ik-toast-title{font-size:.86rem;font-weight:800;color:#0f172a;margin-bottom:3px;}
.ik-toast-msg{font-size:.79rem;color:#475569;line-height:1.5;}
.ik-toast-close{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:17px;line-height:1;padding:0;flex-shrink:0;margin-top:1px;transition:color .15s;}
.ik-toast-close:hover{color:#475569;}
.ik-toast-progress{position:absolute;bottom:0;left:0;height:3px;border-radius:0 0 16px 16px;transition:width linear;}
.ik-toast{position:relative;overflow:hidden;}
.ik-toast.success .ik-toast-progress{background:linear-gradient(90deg,#16a34a,#4ade80);}
.ik-toast.error   .ik-toast-progress{background:linear-gradient(90deg,#dc2626,#f87171);}
.ik-toast.warning .ik-toast-progress{background:linear-gradient(90deg,#d97706,#fbbf24);}
.ik-toast.info    .ik-toast-progress{background:linear-gradient(90deg,#0369a1,#38bdf8);}

/* ── SHARED OVERLAY BACKDROP ── */
@keyframes ikFadeIn{from{opacity:0}to{opacity:1}}
@keyframes ikPopIn{from{opacity:0;transform:scale(.88) translateY(16px)}to{opacity:1;transform:none}}

/* ── CONFIRM MODAL ── */
#ik-confirm-overlay{position:fixed;inset:0;background:rgba(10,20,38,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99998;display:none;align-items:center;justify-content:center;padding:20px;font-family:'Inter','Plus Jakarta Sans',sans-serif;}
#ik-confirm-overlay.open{display:flex;animation:ikFadeIn .2s ease;}
.ik-confirm-card{background:#fff;border-radius:24px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.35),0 8px 24px rgba(0,0,0,.12);animation:ikPopIn .32s cubic-bezier(.16,1,.3,1) forwards;}
.ik-confirm-header{padding:28px 28px 0;display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;}
.ik-confirm-icon{width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.8rem;box-shadow:0 8px 24px rgba(0,0,0,.12);}
.ik-confirm-icon.danger{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#dc2626;}
.ik-confirm-icon.warning{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#d97706;}
.ik-confirm-icon.info{background:linear-gradient(135deg,#e0f2fe,#bae6fd);color:#0369a1;}
.ik-confirm-icon.success{background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#16a34a;}
.ik-confirm-title{font-size:1.12rem;font-weight:800;color:#0f172a;margin:0;letter-spacing:-.3px;}
.ik-confirm-msg{font-size:.88rem;color:#64748b;line-height:1.65;padding:10px 28px 0;text-align:center;}
.ik-confirm-footer{display:flex;gap:10px;padding:22px 28px 28px;}
.ik-confirm-btn{flex:1;border:none;padding:13px;border-radius:14px;font-size:.92rem;font-weight:700;cursor:pointer;font-family:inherit;transition:transform .15s,box-shadow .15s,filter .15s;letter-spacing:.1px;}
.ik-confirm-btn:hover{transform:translateY(-2px);}
.ik-confirm-btn:active{transform:translateY(0);}
.ik-confirm-cancel{background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;}
.ik-confirm-cancel:hover{background:#e2e8f0;border-color:#cbd5e1;}
.ik-confirm-ok.danger{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;box-shadow:0 8px 24px rgba(220,38,38,.3);}
.ik-confirm-ok.danger:hover{filter:brightness(1.08);box-shadow:0 12px 28px rgba(220,38,38,.4);}
.ik-confirm-ok.warning{background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;box-shadow:0 8px 24px rgba(217,119,6,.3);}
.ik-confirm-ok.warning:hover{filter:brightness(1.08);}
.ik-confirm-ok.info{background:linear-gradient(135deg,#0b698b,#0ea5e9);color:#fff;box-shadow:0 8px 24px rgba(11,105,139,.3);}
.ik-confirm-ok.info:hover{filter:brightness(1.08);}
.ik-confirm-ok.success{background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;box-shadow:0 8px 24px rgba(22,163,74,.3);}
.ik-confirm-ok.success:hover{filter:brightness(1.08);}

/* ── ALERT MODAL ── */
#ik-alert-overlay{position:fixed;inset:0;background:rgba(10,20,38,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99998;display:none;align-items:center;justify-content:center;padding:20px;font-family:'Inter','Plus Jakarta Sans',sans-serif;}
#ik-alert-overlay.open{display:flex;animation:ikFadeIn .2s ease;}
.ik-alert-card{background:#fff;border-radius:24px;width:100%;max-width:400px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.35),0 8px 24px rgba(0,0,0,.12);animation:ikPopIn .32s cubic-bezier(.16,1,.3,1) forwards;}
.ik-alert-header{padding:28px 28px 0;display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;}
.ik-alert-icon{width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.8rem;box-shadow:0 8px 24px rgba(0,0,0,.12);}
.ik-alert-icon.success{background:linear-gradient(135deg,#dcfce7,#bbf7d0);color:#16a34a;}
.ik-alert-icon.error{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#dc2626;}
.ik-alert-icon.warning{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#d97706;}
.ik-alert-icon.info{background:linear-gradient(135deg,#e0f2fe,#bae6fd);color:#0369a1;}
.ik-alert-title{font-size:1.12rem;font-weight:800;color:#0f172a;margin:0;letter-spacing:-.3px;}
.ik-alert-msg{font-size:.88rem;color:#64748b;line-height:1.65;padding:10px 28px 0;text-align:center;}
.ik-alert-footer{padding:22px 28px 28px;}
.ik-alert-ok{width:100%;border:none;padding:14px;border-radius:14px;font-size:.96rem;font-weight:800;cursor:pointer;font-family:inherit;background:linear-gradient(135deg,#0b698b,#0ea5e9);color:#fff;box-shadow:0 8px 24px rgba(11,105,139,.28);transition:transform .15s,filter .15s;letter-spacing:.1px;}
.ik-alert-ok:hover{transform:translateY(-2px);filter:brightness(1.08);}
.ik-alert-ok:active{transform:translateY(0);}
.ik-alert-ok.success{background:linear-gradient(135deg,#16a34a,#22c55e);box-shadow:0 8px 24px rgba(22,163,74,.28);}
.ik-alert-ok.error{background:linear-gradient(135deg,#dc2626,#ef4444);box-shadow:0 8px 24px rgba(220,38,38,.28);}
.ik-alert-ok.warning{background:linear-gradient(135deg,#d97706,#f59e0b);box-shadow:0 8px 24px rgba(217,119,6,.28);}
`;
        document.head.appendChild(style);
    }

    /* ── Toast container ── */
    function getToastContainer() {
        let c = document.getElementById('ik-toast-container');
        if (!c) { c = document.createElement('div'); c.id = 'ik-toast-container'; document.body.appendChild(c); }
        return c;
    }

    const ICONS = {
        success: '<i class="fa-solid fa-circle-check"></i>',
        error:   '<i class="fa-solid fa-circle-xmark"></i>',
        warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
        info:    '<i class="fa-solid fa-circle-info"></i>'
    };
    const TITLES = { success: 'Byakunze! ✓', error: 'Habaye Ikosa!', warning: 'Menya!', info: 'Amakuru' };

    /**
     * Show a toast notification.
     * @param {string} message
     * @param {'success'|'error'|'warning'|'info'} type
     * @param {number} duration ms (default 4000)
     */
    window.ikToast = function (message, type, duration) {
        type = type || 'info';
        duration = duration || 4000;
        const container = getToastContainer();
        const toast = document.createElement('div');
        toast.className = 'ik-toast ' + type;
        toast.innerHTML = `
            <div class="ik-toast-icon">${ICONS[type] || ICONS.info}</div>
            <div class="ik-toast-body">
                <div class="ik-toast-title">${TITLES[type] || 'Amakuru'}</div>
                <div class="ik-toast-msg">${message}</div>
            </div>
            <button class="ik-toast-close" aria-label="Funga">&times;</button>
            <div class="ik-toast-progress" style="width:100%;"></div>`;
        container.appendChild(toast);

        const progress = toast.querySelector('.ik-toast-progress');
        const start = performance.now();
        function tick(now) {
            const pct = Math.max(0, 100 - ((now - start) / duration) * 100);
            progress.style.width = pct + '%';
            if (pct > 0) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);

        function remove() {
            toast.classList.add('removing');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }
        toast.querySelector('.ik-toast-close').addEventListener('click', remove);
        setTimeout(remove, duration);
    };

    /* ── Alert modal ── */
    function ensureAlertOverlay() {
        let o = document.getElementById('ik-alert-overlay');
        if (!o) {
            o = document.createElement('div');
            o.id = 'ik-alert-overlay';
            o.innerHTML = `
                <div class="ik-alert-card">
                    <div class="ik-alert-header">
                        <div class="ik-alert-icon" id="ik-alert-icon-el"></div>
                        <h3 class="ik-alert-title" id="ik-alert-title-el"></h3>
                    </div>
                    <div class="ik-alert-msg" id="ik-alert-msg-el"></div>
                    <div class="ik-alert-footer">
                        <button class="ik-alert-ok" id="ik-alert-ok-btn">OK</button>
                    </div>
                </div>`;
            document.body.appendChild(o);
        }
        return o;
    }

    /**
     * Show a styled alert modal (replaces native alert).
     * @param {string} message
     * @param {'success'|'error'|'warning'|'info'} type
     * @param {string} [title]
     * @returns {Promise<void>}
     */
    window.ikAlert = function (message, type, title) {
        type = type || 'info';
        return new Promise(function (resolve) {
            const overlay = ensureAlertOverlay();
            const iconEl  = document.getElementById('ik-alert-icon-el');
            const titleEl = document.getElementById('ik-alert-title-el');
            const msgEl   = document.getElementById('ik-alert-msg-el');
            const btn     = document.getElementById('ik-alert-ok-btn');

            iconEl.className = 'ik-alert-icon ' + type;
            iconEl.innerHTML = ICONS[type] || ICONS.info;
            titleEl.textContent = title || TITLES[type] || 'Amakuru';
            msgEl.textContent = message;
            btn.className = 'ik-alert-ok' + (type !== 'info' ? ' ' + type : '');
            btn.textContent = type === 'success' ? 'Byakunze, Komeza!' : type === 'error' ? 'Nkurikiye, Funga' : type === 'warning' ? 'Nkurikiye' : 'OK';

            overlay.classList.add('open');
            function done() { overlay.classList.remove('open'); btn.removeEventListener('click', done); resolve(); }
            btn.addEventListener('click', done);
            setTimeout(() => btn.focus(), 50);
        });
    };

    /* ── Confirm modal ── */
    function ensureConfirmOverlay() {
        let o = document.getElementById('ik-confirm-overlay');
        if (!o) {
            o = document.createElement('div');
            o.id = 'ik-confirm-overlay';
            o.innerHTML = `
                <div class="ik-confirm-card">
                    <div class="ik-confirm-header">
                        <div class="ik-confirm-icon" id="ik-confirm-icon-el"></div>
                        <h3 class="ik-confirm-title" id="ik-confirm-title-el"></h3>
                    </div>
                    <div class="ik-confirm-msg" id="ik-confirm-msg-el"></div>
                    <div class="ik-confirm-footer">
                        <button class="ik-confirm-btn ik-confirm-cancel" id="ik-confirm-cancel-btn">Oya, Hagarika</button>
                        <button class="ik-confirm-btn ik-confirm-ok" id="ik-confirm-ok-btn">Yego, Emeza</button>
                    </div>
                </div>`;
            document.body.appendChild(o);
        }
        return o;
    }

    /**
     * Show a styled confirm modal (replaces native confirm).
     * @param {string} message
     * @param {'danger'|'warning'|'info'|'success'} type
     * @param {string} [title]
     * @param {string} [okLabel]
     * @param {string} [cancelLabel]
     * @returns {Promise<boolean>}
     */
    window.ikConfirm = function (message, type, title, okLabel, cancelLabel) {
        type = type || 'danger';
        return new Promise(function (resolve) {
            const overlay   = ensureConfirmOverlay();
            const iconEl    = document.getElementById('ik-confirm-icon-el');
            const titleEl   = document.getElementById('ik-confirm-title-el');
            const msgEl     = document.getElementById('ik-confirm-msg-el');
            const okBtn     = document.getElementById('ik-confirm-ok-btn');
            const cancelBtn = document.getElementById('ik-confirm-cancel-btn');

            iconEl.className = 'ik-confirm-icon ' + type;
            iconEl.innerHTML = type === 'danger'  ? '<i class="fa-solid fa-trash"></i>'
                             : type === 'warning' ? '<i class="fa-solid fa-triangle-exclamation"></i>'
                             : type === 'success' ? '<i class="fa-solid fa-circle-check"></i>'
                             : '<i class="fa-solid fa-circle-question"></i>';
            titleEl.textContent = title || (type === 'danger' ? 'Emeza Gusiba' : type === 'warning' ? 'Emeza Igikorwa' : type === 'success' ? 'Emeza' : 'Emeza');
            msgEl.textContent = message;
            okBtn.className = 'ik-confirm-btn ik-confirm-ok ' + type;
            okBtn.textContent = okLabel || 'Yego, Emeza';
            cancelBtn.textContent = cancelLabel || 'Oya, Hagarika';

            overlay.classList.add('open');

            function done(result) {
                overlay.classList.remove('open');
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(result);
            }
            function onOk()     { done(true);  }
            function onCancel() { done(false); }
            okBtn.addEventListener('click', onOk);
            cancelBtn.addEventListener('click', onCancel);
            setTimeout(() => cancelBtn.focus(), 50);
        });
    };
})();
