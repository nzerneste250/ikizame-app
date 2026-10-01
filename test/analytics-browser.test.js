const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const { purchaseReceipt } = require('../helpers/siteAnalytics');
const source = fs.readFileSync('public/assets/js/site-analytics.js', 'utf8');

function browser({ path = '/', storage = new Map(), blocked = false, existingTag = false } = {}) {
  const scripts = [], listeners = {};
  function element(name) {
    return { name, dataset: {}, hidden: false, children: [], setAttribute() {}, focus() {},
      appendChild(child) { this.children.push(child); if (name === 'head' && child.name === 'script') scripts.push(child); },
      addEventListener(type, callback) { this[type] = callback; },
      querySelectorAll() { return [{ dataset: { choice: 'granted' }, addEventListener() {}, focus() {} }, { dataset: { choice: 'denied' }, addEventListener() {}, focus() {} }]; },
      querySelector() { return { focus() {} }; }
    };
  }
  const document = { currentScript: { dataset: { measurementId: 'G-A1B2C3D4E5', pagePath: path, pageTitle: 'IKIZAME' } },
    head: element('head'), body: element('body'), cookie: '', createElement: element,
    querySelector(selector) { return selector === 'footer' ? element('footer') : existingTag ? {} : null; }
  };
  const window = { addEventListener(type, callback) { listeners[type] = callback; } };
  const context = vm.createContext({ window, document, location: { hostname: 'ikizame.rw', search: '?phone=0781234567&ref=secret', hash: '#access-code' }, navigator: {},
    localStorage: { getItem(key) { if (blocked) throw new Error('blocked'); return storage.get(key) || null; }, setItem(key, value) { if (blocked) throw new Error('blocked'); storage.set(key, value); } }
  });
  vm.runInContext(source, context);
  return { window, document, scripts, listeners, storage, run: () => vm.runInContext(source, context), events: () => Array.from(window.dataLayer || []).filter(args => args[0] === 'event').map(args => JSON.parse(JSON.stringify(Array.from(args)))) };
}

test('analytics sends nothing before opt-in or after rejection and injects no duplicate tag/page view', () => {
  const app = browser();
  assert.equal(app.scripts.length, 0);
  assert.equal(app.window.IkizameAnalytics.checkout('exams', 2), false);
  app.window.IkizameAnalytics.setConsent('denied');
  assert.equal(app.scripts.length, 0);
  assert.equal(app.events().length, 0);
  app.window.IkizameAnalytics.setConsent('granted');
  assert.equal(app.scripts.length, 1);
  assert.equal(app.events().filter(event => event[1] === 'page_view').length, 1);
  app.run();
  app.window.IkizameAnalytics.setConsent('granted');
  assert.equal(app.scripts.length, 1);
  assert.equal(app.events().filter(event => event[1] === 'page_view').length, 1);
  app.window.IkizameAnalytics.setConsent('denied');
  assert.equal(app.window.IkizameAnalytics.checkout('exams', 2), false);
  assert.equal(app.events().length, 1);
});

test('events discard query strings, referrers, score, identity and arbitrary service strings', async () => {
  const app = browser({ path: '/exam' });
  app.window.IkizameAnalytics.setConsent('granted');
  app.window.IkizameAnalytics.examStarted(20);
  app.window.IkizameAnalytics.examCompleted(20);
  assert.equal(app.window.IkizameAnalytics.examStarted('0781234567'), false);
  assert.equal(app.window.IkizameAnalytics.checkout('Name private@example.com'), false);
  app.window.IkizameAnalytics.checkout('exams', 2);
  const receipt = purchaseReceipt({ status: 'SUCCESS', amount: 200, reference_id: 'secret' });
  await app.window.IkizameAnalytics.purchase({ ...receipt, phone: '0781234567', name: 'Private Name', email: 'private@example.com', password: 'password-secret', items: [{ item_name: 'Private Name' }] });
  assert.deepEqual(app.events().map(event => event[1]), ['page_view', 'exam_started', 'exam_completed', 'begin_checkout', 'purchase']);
  assert.doesNotMatch(JSON.stringify(app.events()), /0781234567|private@example|Private Name|password-secret|access-code|\?phone|score/);
  const checkout = app.events().find(event => event[1] === 'begin_checkout')[2];
  const purchase = app.events().find(event => event[1] === 'purchase')[2];
  assert.equal(checkout.currency, undefined);
  assert.equal(purchase.currency, undefined);
  assert.equal(purchase.value, undefined);
  assert.equal(purchase.items[0].price, undefined);
  assert.equal(purchase.items[0].quantity, 1);
});

test('purchase events are deduplicated through polling, concurrent calls and page reloads', async () => {
  const app = browser();
  const receipt = purchaseReceipt({ status: 'SUCCESS', amount: 100, reference_id: 'payment-1' });
  assert.equal(await app.window.IkizameAnalytics.purchase(receipt), false);
  app.window.IkizameAnalytics.setConsent('granted');
  await Promise.all(Array.from({ length: 10 }, () => app.window.IkizameAnalytics.purchase(receipt)));
  assert.equal(app.events().filter(event => event[1] === 'purchase').length, 1);
  const reloaded = browser({ storage: app.storage });
  assert.equal(await reloaded.window.IkizameAnalytics.purchase(receipt), false);
  assert.equal(reloaded.events().filter(event => event[1] === 'purchase').length, 0);
  for (const invalid of [null, { ...receipt, transaction_id: 'phone-0781234567' }, { ...receipt, transaction_id: 'ikizame_' + 'g'.repeat(64) }]) {
    assert.equal(await app.window.IkizameAnalytics.purchase(invalid), false);
  }
});

test('storage failures and admin paths do not break flows or cause tracking without consent', async () => {
  const app = browser({ blocked: true });
  assert.equal(app.scripts.length, 0);
  app.window.IkizameAnalytics.setConsent('granted');
  const receipt = purchaseReceipt({ status: 'SUCCESS', amount: 100, reference_id: 'payment-2' });
  await app.window.IkizameAnalytics.purchase(receipt);
  await app.window.IkizameAnalytics.purchase(receipt);
  assert.equal(app.events().filter(event => event[1] === 'purchase').length, 1);
  for (const path of ['/dashboard', '/admin-login', '/school-dashboard', '/exam-result']) {
    const admin = browser({ path });
    assert.equal(admin.window.IkizameAnalytics, undefined);
    assert.equal(admin.scripts.length, 0);
  }
  assert.equal(browser({ existingTag: true }).window.IkizameAnalytics, undefined);
});
