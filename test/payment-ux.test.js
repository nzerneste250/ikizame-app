const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pricingPage = fs.readFileSync(path.join(__dirname, '..', 'public', 'ibiciro.html'), 'utf8');

test('pricing checkout has an accessible persistent status region and inline phone feedback', () => {
  assert.match(pricingPage, /id="paymentStatusCard"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(pricingPage, /id="paymentStatusMessage"/);
  assert.match(pricingPage, /onclick="dismissPaymentStatus\(\)"/);
  assert.match(pricingPage, /id="momoPhoneHint"[^>]*aria-live="polite"/);
  assert.match(pricingPage, /field\.classList\.toggle\('has-error', v\.length > 0 && !isValid\)/);
});

test('a browser close or poll timeout does not cancel a pending payment request', () => {
  const closeFunction = pricingPage.match(/window\.closeTestPaymentModal = function\(\) \{([\s\S]*?)\n        \};/);
  assert.ok(closeFunction, 'checkout close function exists');
  assert.doesNotMatch(closeFunction[1], /\/api\/payments\/cancel/);
  assert.match(pricingPage, /ubwishyu bushobora kuba bugikomeje/);
  assert.match(pricingPage, /ntukongere kwishyura/);
  assert.doesNotMatch(pricingPage, /Kwamamaza/);
});

test('mocked pending checkout survives close and reopens without a second provider request', () => {
  const elements = new Map();
  const field = { classList: { toggle() {} } };
  const makeElement = (id, value = '') => ({
    id,
    value,
    textContent: '',
    className: '',
    style: {},
    disabled: false,
    focus() {},
    scrollIntoView() {},
    closest() { return field; }
  });
  for (const [id, value] of [
    ['momoPhoneNumberInput', '0788000000'], ['momoPhoneHint'], ['momoCarrierChip'],
    ['examQuantityVolumeSelector', '3'], ['ussdHintBox'], ['momoSubmitPaymentBtn'],
    ['momoBtnTextLabel'], ['momoBtnIcon'], ['sandboxPaymentModal'], ['paymentStatusCard'],
    ['paymentStatusMessage'], ['paymentStatusIcon'], ['liveAmountBreakdownDisplayStrip'],
    ['dynamicPricingHelperLabel'], ['pricePerExamLabel'], ['paySummaryQuantity']
  ]) elements.set(id, makeElement(id, value));

  const fetchCalls = [];
  const window = {
    __IKIZAME_CHECKOUT_TEST__: true,
    matchMedia: () => ({ matches: true })
  };
  const context = {
    window,
    document: { getElementById: id => elements.get(id) },
    fetch: (...args) => { fetchCalls.push(args); return Promise.resolve(); },
    clearInterval() {},
    setInterval() { return 1; },
    clearTimeout() {},
    setTimeout() { return 1; },
    requestAnimationFrame(callback) { callback(); }
  };
  const start = pricingPage.indexOf('        let activeReferenceId = null;');
  const end = pricingPage.indexOf('        window.handleCustomAlertBoxConfirmationRedirect', start);
  vm.runInNewContext(pricingPage.slice(start, end), context);

  window.__ikizameCheckoutTestHooks.setActiveReference('pending-reference');
  window.closeTestPaymentModal();
  window.launchAdaptiveCheckoutModal(1);

  assert.equal(window.__ikizameCheckoutTestHooks.getActiveReference(), 'pending-reference');
  assert.equal(elements.get('sandboxPaymentModal').style.display, 'flex');
  assert.equal(elements.get('momoPhoneNumberInput').value, '0788000000');
  assert.equal(elements.get('examQuantityVolumeSelector').value, '3');
  assert.equal(elements.get('momoSubmitPaymentBtn').disabled, true);
  assert.match(elements.get('paymentStatusMessage').textContent, /ubusabe bwo kwishyura bukiri gutegerejwe/);
  assert.equal(fetchCalls.filter(([url]) => String(url).includes('/api/payments/momo-push')).length, 0);
  assert.ok(fetchCalls.some(([url]) => String(url).includes('/api/payments/verify/pending-reference')));
});

test('the payment jump focuses the existing price choices without preselecting a purchase', () => {
  assert.match(pricingPage, /onclick="focusPricingOptions\(\)"/);
  assert.match(pricingPage, /<section id="pricingOptions"[^>]*tabindex="-1"/);
  assert.match(pricingPage, /window\.focusPricingOptions = function\(\)/);
  assert.match(pricingPage, /options\.focus\(\{ preventScroll: true \}\)/);
});

test('pending checkout reopens without creating a second payment and restarts polling with the same reference', () => {
  const elements = new Map();
  const track = { intervals: 0, fetches: [] };
  const makeElement = (id, value = '') => ({
    id,
    value,
    textContent: '',
    className: '',
    style: {},
    disabled: false,
    focus() {},
    scrollIntoView() {},
    closest() { return { classList: { toggle() {} } }; }
  });
  for (const [id, value] of [
    ['momoPhoneNumberInput', '0788000000'], ['momoPhoneHint'], ['momoCarrierChip'],
    ['examQuantityVolumeSelector', '3'], ['ussdHintBox'], ['momoSubmitPaymentBtn'],
    ['momoBtnTextLabel'], ['momoBtnIcon'], ['sandboxPaymentModal'], ['paymentStatusCard'],
    ['paymentStatusMessage'], ['paymentStatusIcon'], ['liveAmountBreakdownDisplayStrip'],
    ['dynamicPricingHelperLabel'], ['pricePerExamLabel'], ['paySummaryQuantity']
  ]) elements.set(id, makeElement(id, value));

  const window = { __IKIZAME_CHECKOUT_TEST__: true, matchMedia: () => ({ matches: true }) };
  const context = {
    window,
    document: { getElementById: id => elements.get(id) },
    fetch: (...args) => {
      track.fetches.push(args);
      return Promise.resolve({ json: () => Promise.resolve({ status: 'PENDING' }) });
    },
    clearInterval() { track.intervals = 0; },
    setInterval() { track.intervals += 1; return 1; },
    clearTimeout() {},
    setTimeout() { return 1; },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    requestAnimationFrame(callback) { callback(); }
  };
  const start = pricingPage.indexOf('        let activeReferenceId = null;');
  const end = pricingPage.indexOf('        window.handleCustomAlertBoxConfirmationRedirect', start);
  vm.runInNewContext(pricingPage.slice(start, end), context);

  window.__ikizameCheckoutTestHooks.setActiveReference('REF-123');
  const pendingBefore = window.__ikizameCheckoutTestHooks.getActiveReference();
  window.closeTestPaymentModal();
  window.launchAdaptiveCheckoutModal(1);
  const pendingAfter = window.__ikizameCheckoutTestHooks.getActiveReference();
  assert.equal(pendingBefore, 'REF-123');
  assert.equal(pendingAfter, 'REF-123');
  assert.equal(track.fetches.filter(([url]) => String(url).includes('/api/payments/momo-push')).length, 0);
  assert.ok(track.fetches.some(([url]) => String(url).includes('/api/payments/verify/REF-123')));
  assert.equal(track.intervals, 1);
  assert.match(elements.get('paymentStatusMessage').textContent, /ubusabe bwo kwishyura bukiri gutegerejwe/i);
  assert.equal(elements.get('momoSubmitPaymentBtn').disabled, true);
});

test('the three current exam price ranges remain visible without legacy tiers', () => {
  for (const tier of ['Ibizamini 1&#8211;15', 'Ibizamini 16&#8211;25', 'Ibizamini 26 kuzamura']) {
    assert.match(pricingPage, new RegExp(tier.replace(/[+]/g, '\\+')));
  }
  assert.doesNotMatch(pricingPage, /Ibizamini 1&#8211;9|Ibizamini 10&#8211;14|Ibizamini 15&#8211;20|Ibizamini 21\+|50 RWF/);
  assert.doesNotMatch(pricingPage, /max="50"|kugeza ku bizamini 50/);
});

test('the public FAQ states the correct 1–15 individual pricing range', () => {
  const helpPage = fs.readFileSync(path.join(__dirname, '..', 'public', 'ubufasha.html'), 'utf8');
  assert.match(helpPage, /ibizamini 1–15/);
  assert.doesNotMatch(helpPage, /ibizamini 1–9/);
  assert.match(pricingPage, /examQuantityVolume: Number\(qtyInput\.value\)/);
});

test('individual checkout totals apply 70 RWF to every quantity above 25 within the payment amount limit', () => {
  const elements = new Map();
  const makeElement = (id, value = '') => ({ id, value, textContent: '', style: {}, disabled: false });
  for (const [id, value] of [
    ['liveAmountBreakdownDisplayStrip'], ['dynamicPricingHelperLabel'], ['pricePerExamLabel'],
    ['paySummaryQuantity'], ['momoBtnTextLabel'], ['momoSubmitPaymentBtn'],
    ['examQuantityVolumeSelector', '1'], ['momoPhoneNumberInput', '0781234567']
  ]) elements.set(id, makeElement(id, value));
  const context = {
    window: {},
    document: { getElementById: id => elements.get(id) },
    activeReferenceId: null
  };
  const start = pricingPage.indexOf('        function pricePerExamForPurchaseQuantity(qty)');
  const end = pricingPage.indexOf('        function restoreAdaptivePayButtonLabel()', start);
  vm.runInNewContext(`let activeReferenceId = null;\n${pricingPage.slice(start, end)}`, context);

  for (const [quantity, unitPrice, total] of [
    [15, 100, 1500], [16, 80, 1280], [25, 80, 2000],
    [26, 70, 1820], [50, 70, 3500], [51, 70, 3570],
    [100, 70, 7000], [200, 70, 14000], [1428571, 70, 99999970]
  ]) {
    elements.get('examQuantityVolumeSelector').value = String(quantity);
    context.window.recalculateLiveDynamicBillingAmount();
    assert.equal(elements.get('pricePerExamLabel').textContent, `${unitPrice} RWF`);
    assert.equal(elements.get('liveAmountBreakdownDisplayStrip').textContent, `${total.toLocaleString()} RWF`);
    assert.equal(elements.get('momoSubmitPaymentBtn').disabled, false);
  }
  elements.get('examQuantityVolumeSelector').value = '1428572';
  context.window.recalculateLiveDynamicBillingAmount();
  assert.equal(elements.get('pricePerExamLabel').textContent, '—');
  assert.equal(elements.get('liveAmountBreakdownDisplayStrip').textContent, '—');
  assert.equal(elements.get('momoSubmitPaymentBtn').disabled, true);
});
