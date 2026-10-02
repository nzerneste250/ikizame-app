const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
