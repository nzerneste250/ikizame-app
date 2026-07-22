(function () {
    if (window.__ikizameEnterToActionBound) return;
    window.__ikizameEnterToActionBound = true;

    function findPrimaryAction(root) {
        if (!root) return null;

        const buttons = Array.from(root.querySelectorAll('button, input[type="submit"], a[role="button"]'));
        const actionLike = buttons.find((el) => {
            if (el.disabled) return false;
            const classes = (el.className || '').toString();
            const id = (el.id || '').toLowerCase();
            const type = (el.type || '').toLowerCase();
            if (type === 'submit') return true;
            if (el.tagName === 'INPUT' && type === 'submit') return true;
            if (/btn-submit|btn-auth-submit|btn-primary|btn-save|btn-pay-trigger|btn-submit-payment|submit|primary/i.test(classes)) return true;
            if (['loginbtn','sendotpbtn','resetbtn','resourceSubmitButton','submitbtn','momosubmitpaymentbtn','submitlookupbtn'].includes(id)) return true;
            return false;
        });

        if (actionLike) return actionLike;

        if (root.tagName === 'FORM') {
            return root.querySelector('button:not([type="button"]):not([disabled])');
        }

        return null;
    }

    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;

        const target = event.target;
        if (!target || !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        if (target.readOnly || target.disabled || target.closest('[contenteditable="true"]')) return;

        const form = target.closest('form');
        const container = form || target.closest('.modal, .panel, .card, .auth-step, .form-card, .form-fields, .dialog');
        const action = findPrimaryAction(container || document.body);

        if (action && action !== target) {
            event.preventDefault();
            action.click();
        }
    });
})();
