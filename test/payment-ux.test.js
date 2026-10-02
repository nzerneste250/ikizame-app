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
  assert.equal(fetchCalls.length, 0);
});

test('the payment jump focuses the existing price choices without preselecting a purchase', () => {
  assert.match(pricingPage, /onclick="focusPricingOptions\(\)"/);
  assert.match(pricingPage, /<section id="pricingOptions"[^>]*tabindex="-1"/);
  assert.match(pricingPage, /window\.focusPricingOptions = function\(\)/);
  assert.match(pricingPage, /options\.focus\(\{ preventScroll: true \}\)/);
});

test('the four established exam price tiers remain visible', () => {
  for (const tier of ['Ibizamini 1&#8211;9', 'Ibizamini 10&#8211;14', 'Ibizamini 15&#8211;20', 'Ibizamini 21+']) {
    assert.match(pricingPage, new RegExp(tier.replace(/[+]/g, '\\+')));
  }
});
