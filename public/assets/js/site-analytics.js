(function () {
  'use strict';
  if (window.IkizameAnalytics) return;
  const tag = document.currentScript;
  const id = tag?.dataset.measurementId || '';
  const pagePath = tag?.dataset.pagePath || '';
  const pages = new Set(['/', '/ifashanyigisho', '/ibiciro', '/ubufasha', '/about', '/terms', '/exam']);
  if (!/^G-[A-Z0-9]{6,20}$/.test(id) || !pages.has(pagePath)) return;
  if (window.gtag || document.querySelector('script[src*="googletagmanager.com"], script[src*="google-analytics.com"]')) return;

  const consentKey = 'ikizame.analytics-consent.v1';
  const sentPurchases = new Set();
  let choice = null, configured = false, pageViewed = false;
  let banner;
  const context = {
    page_location: 'https://ikizame.rw' + pagePath,
    page_title: tag.dataset.pageTitle || 'IKIZAME',
    page_referrer: '',
    ...(tag.dataset.debug === 'true' ? { debug_mode: true } : {})
  };
  function read(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function write(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  const stored = read(consentKey);
  if (stored === 'granted' || stored === 'denied') choice = stored;

  // Basic consent mode: no Google requests or cookieless pings before opt-in.
  function consentState(granted) {
    return { analytics_storage: granted ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  }
  function start() {
    if (choice !== 'granted') return;
    if (!configured) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('consent', 'default', consentState(false));
      window.gtag('consent', 'update', consentState(true));
      window.gtag('js', new Date());
      window.gtag('config', id, { ...context, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
      const googleTag = document.createElement('script');
      googleTag.async = true;
      googleTag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
      if (tag.nonce) googleTag.nonce = tag.nonce;
      document.head.appendChild(googleTag);
      configured = true;
    }
    if (!pageViewed) {
      window.gtag('event', 'page_view', context);
      pageViewed = true;
    }
  }
  function event(name, params = {}) {
    if (choice !== 'granted') return false;
    try {
      start();
      window.gtag('event', name, { ...params, ...context });
      return true;
    } catch (_) {
      // Optional telemetry must never interrupt exams, checkout or navigation.
      return false;
    }
  }
  function revokeCookies() {
    const names = document.cookie.split(';').map(part => part.split('=')[0].trim()).filter(name => /^_ga(?:_|$)|^_gid$|^_gat/.test(name));
    names.forEach(name => {
      ['', location.hostname, '.' + location.hostname, '.ikizame.rw'].forEach(domain => {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax' + (domain ? '; domain=' + domain : '');
      });
    });
  }
  function setConsent(nextChoice) {
    if (!['granted', 'denied'].includes(nextChoice)) return;
    choice = nextChoice;
    write(consentKey, choice);
    window['ga-disable-' + id] = choice !== 'granted';
    if (configured) window.gtag('consent', 'update', consentState(choice === 'granted'));
    if (choice === 'granted') start(); else revokeCookies();
    if (banner) banner.hidden = true;
  }
  function count(value) { const number = Number(value); return Number.isInteger(number) && number > 0 && number <= 10000 ? number : null; }
  function checkout(service, quantity = 1) {
    if (!['exams', 'resources'].includes(service)) return false;
    return event('begin_checkout', { items: [{ item_id: service + '-access', item_name: service === 'exams' ? 'Exam access' : 'Resource access', quantity: 1 }], ...(service === 'exams' && count(quantity) ? { exam_count: count(quantity) } : {}) });
  }
  async function purchase(receipt) {
    if (choice !== 'granted' || !receipt || !/^ikizame_[a-f0-9]{64}$/.test(receipt.transaction_id)) return false;
    const transactionId = receipt.transaction_id;
    const key = 'ikizame.ga4.purchase.' + transactionId;
    function emitOnce() {
      if (choice !== 'granted' || sentPurchases.has(transactionId) || read(key) === 'sent') return false;
      // Rebuild the payload from an allowlist, ignoring all customer fields.
      const sent = event('purchase', { transaction_id: transactionId, items: [{ item_id: 'ikizame-access', item_name: 'IKIZAME access', quantity: 1 }] });
      if (sent) { sentPurchases.add(transactionId); write(key, 'sent'); }
      return sent;
    }
    // Serialize simultaneous confirmations across tabs; GA4 also deduplicates transaction_id.
    if (navigator.locks?.request) return navigator.locks.request(key, emitOnce);
    return emitOnce();
  }
  function showConsent() {
    if (!banner) return;
    banner.hidden = false;
    banner.querySelector('button').focus();
  }
  function consentUi() {
    banner = document.createElement('section');
    banner.className = 'ik-analytics-consent';
    banner.setAttribute('aria-label', 'Analytics cookie preferences');
    banner.innerHTML = '<div><strong>Imibare y’urubuga</strong><p>Twemere gukoresha Google Analytics kugira ngo tumenye uko urubuga rukoreshwa. Kwanga ntibibuza gukoresha serivisi.</p></div><div class="ik-consent-actions"><button type="button" data-choice="granted">Emera imibare</button><button type="button" data-choice="denied">Komeza utabyemeye</button></div>';
    banner.querySelectorAll('button').forEach(button => button.addEventListener('click', () => setConsent(button.dataset.choice)));
    banner.hidden = choice !== null;
    document.body.appendChild(banner);
    const settingsButton = document.createElement('button');
    settingsButton.type = 'button';
    settingsButton.className = 'ik-consent-settings';
    settingsButton.textContent = 'Analytics preferences';
    settingsButton.addEventListener('click', showConsent);
    (document.querySelector('footer') || document.body).appendChild(settingsButton);
  }
  window.IkizameAnalytics = Object.freeze({
    setConsent, showConsent, checkout, purchase,
    track: (name, params = {}) => event(name, params),
    examStarted: questionCount => pagePath === '/exam' && count(questionCount) ? event('exam_started', { question_count: count(questionCount) }) : false,
    examCompleted: questionCount => pagePath === '/exam' && count(questionCount) ? event('exam_completed', { question_count: count(questionCount) }) : false
  });
  window['ga-disable-' + id] = choice !== 'granted';
  window.addEventListener('storage', e => {
    if (e.key === consentKey && ['granted', 'denied'].includes(e.newValue)) setConsent(e.newValue);
  });
  consentUi();
  start();

  if (typeof document.addEventListener === 'function') document.addEventListener('click', function (clickEvent) {
    const link = clickEvent.target.closest?.('a');
    const packageButton = clickEvent.target.closest?.('.price-card .btn-pay-trigger');
    if (!link && !packageButton) return;
    const href = link ? (link.getAttribute('href') || '') : '';
    if (pagePath === '/' && href === '/ibiciro') event('home_pricing_clicked');
    if (pagePath === '/' && (href === '/exam' || href.includes('candidateRegistrationInteractiveForm'))) event('home_exam_cta_clicked');
    if (pagePath === '/ifashanyigisho' && href === '/ibiciro') event('resource_pricing_clicked');
    if (pagePath === '/ifashanyigisho' && href === '/exam') event('resource_exam_cta_clicked');
    if (pagePath === '/ibiciro' && (link?.closest('.price-card') || packageButton)) {
      const card = link?.closest('.price-card') || packageButton.closest('.price-card');
      const range = card?.querySelector('.pricing-card-range')?.textContent?.trim();
      event('pricing_package_selected', range ? { package_range: range } : {});
    }
  });
})();
