const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const axios = require('axios');
const vm = require('node:vm');
const {
  getIndividualExamPricing,
  getSchoolPackage,
  SCHOOL_PACKAGES
} = require('../helpers/pricing');

test('individual exam pricing covers the three published ranges and rejects invalid quantities', () => {
  for (const [quantity, unitPrice, amount] of [
    [1, 100, 100], [15, 100, 1500],
    [16, 80, 1280], [25, 80, 2000],
    [26, 70, 1820], [50, 70, 3500]
  ]) {
    assert.deepEqual(getIndividualExamPricing(quantity), { quantity, pricePerExam: unitPrice, amount });
  }
  for (const quantity of [
    undefined, '1', '', true, false, [], [1], {}, null, 1.5, 0, -1, 51
  ]) {
    assert.equal(getIndividualExamPricing(quantity), null, `expected ${JSON.stringify(quantity)} to be rejected`);
  }
});

test('school package pricing has exactly the three specified server-owned options', () => {
  assert.deepEqual(SCHOOL_PACKAGES, [
    { id: 'basic', name: 'Basic', price: 10000, examCredits: 100 },
    { id: 'standard', name: 'Standard', price: 20000, examCredits: 300 },
    { id: 'premium', name: 'Premium', price: 30000, examCredits: 600 }
  ]);
  for (const pkg of SCHOOL_PACKAGES) assert.deepEqual(getSchoolPackage(pkg.id), pkg);
  assert.equal(getSchoolPackage('unknown'), null);
});

test('school dashboard presents each server package and confirms the selected package before payment', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', 'public', 'school-dashboard.html'), 'utf8');
  const publicPricing = fs.readFileSync(path.join(__dirname, '..', 'public', 'ibiciro.html'), 'utf8');
  for (const pkg of SCHOOL_PACKAGES) {
    for (const attribute of [
      `value="${pkg.id}"`,
      `data-package-name="${pkg.name}"`,
      `data-price="${pkg.price}"`,
      `data-exam-credits="${pkg.examCredits}"`
    ]) assert.match(page, new RegExp(`${attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`));
    assert.ok(page.includes(`${pkg.price.toLocaleString()} RWF`));
    assert.ok(publicPricing.includes(`<h3 class="pricing-card-range">${pkg.name}</h3>`));
    assert.ok(publicPricing.includes(`<strong>${pkg.price.toLocaleString()}</strong><span>RWF</span>`));
    assert.ok(publicPricing.includes(`${pkg.examCredits} exam credits`));
  }
  assert.match(publicPricing, /\.pricing-card-grid \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(publicPricing, /@media \(max-width: 1000px\)[\s\S]*?\.pricing-card-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(publicPricing, /@media \(max-width: 700px\)[\s\S]*?\.pricing-card-grid \{ grid-template-columns: 1fr; gap: 12px; \}/);
  assert.match(publicPricing, /id="schoolPricingOptions"/);
  assert.doesNotMatch(publicPricing, /Ibizamini 1&#8211;9|Ibizamini 10&#8211;14|Ibizamini 15&#8211;20|Ibizamini 21\+|50 RWF/);
  assert.match(page, /selectedSchoolPackageSummary/);
  assert.match(page, /JSON\.stringify\(\{ phoneNumber: phone, packageId: packageChoice\.id \}\)/);
  assert.match(page, /packageChoice\.examCredits/);
});

test('personal payment initiation derives the tier amount and stored unit price on the server', async t => {
  t.mock.method(global, 'setTimeout', () => 0);
  t.mock.method(global, 'setInterval', () => 0);
  const createPaymentRouter = require('../routes/payments');
  t.mock.restoreAll();

  const calls = [];
  const providerCalls = [];
  const db = { query(sql, values, callback) {
    if (typeof values === 'function') callback = values;
    if (sql.trimStart().startsWith('CREATE TABLE')) return callback?.(null, {});
    if (sql.startsWith('INSERT INTO pending_payment_requests')) {
      calls.push({ sql, values });
      return callback(null, { affectedRows: 1 });
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }};
  let referenceNumber = 0;
  t.mock.method(axios, 'post', async (url, body) => {
    if (url.endsWith('/authorize')) return { data: { access: 'pricing-test-token', expires: Date.now() / 1000 + 3600 } };
    providerCalls.push(body);
    return { data: { ref: `personal-ref-${++referenceNumber}` } };
  });

  const app = express();
  app.use(express.json());
  app.use('/api/payments', createPaymentRouter(db));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  for (const [quantity, amount, unitPrice] of [
    [1, 100, 100], [15, 1500, 100],
    [16, 1280, 80], [25, 2000, 80],
    [26, 1820, 70], [50, 3500, 70]
  ]) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/momo-push`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '0781234567',
        checkoutIntentType: 'PERSONAL',
        examQuantityVolume: quantity,
        pricePerExam: 1
      })
    });
    assert.equal(response.status, 200);
    const pending = calls.at(-1);
    assert.equal(pending.values[2], amount);
    assert.equal(pending.values[4], quantity);
    assert.equal(pending.values[5], unitPrice);
    assert.deepEqual(providerCalls.at(-1), { amount, number: '0781234567' });
  }
  for (const examQuantityVolume of [
    undefined, '1', '', true, false, [], [1], {}, null, 1.5, 0, -1, 51
  ]) {
    const unsupported = await fetch(`http://127.0.0.1:${server.address().port}/api/payments/momo-push`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '0781234567', checkoutIntentType: 'PERSONAL', examQuantityVolume })
    });
    assert.equal(unsupported.status, 400, `expected ${JSON.stringify(examQuantityVolume)} to be rejected`);
  }
  assert.equal(providerCalls.length, 6);
});

test('authenticated school package purchase sends only server-derived package price and credit data to PayPack', async t => {
  const createSchoolRouter = require('../routes/school');
  const { schoolPendingMap } = require('../routes/school');
  const cashinCalls = [];
  const persistedOrders = new Map();
  let failNextPersistence = false;
  let referenceNumber = 0;
  t.mock.method(axios, 'post', async (url, body) => {
    if (url.endsWith('/authorize')) return { data: { access: 'school-pricing-token', expires: Date.now() / 1000 + 3600 } };
    cashinCalls.push(body);
    return { data: { ref: `school-package-ref-${++referenceNumber}` } };
  });

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = { isSchoolAuthenticated: true, schoolAccountId: 7, schoolAccountName: 'Test School' };
    next();
  });
  const noOpLimiter = (req, res, next) => next();
  const db = {
    query(sql, values, callback) {
      assert.match(sql, /INSERT INTO pending_payment_requests/);
      assert.match(sql, /'SCHOOL'.*'PAYPACK'.*'PENDING'/s);
      if (failNextPersistence) {
        failNextPersistence = false;
        return callback(new Error('database unavailable'));
      }
      persistedOrders.set(values[0], {
        reference: values[0],
        phone: values[1],
        amount: values[2],
        examCount: values[4],
        schoolId: values[6],
        packageId: values[8],
        provider: 'PAYPACK',
        status: 'PENDING'
      });
      callback(null, { affectedRows: 1 });
    }
  };
  app.use('/api/school', createSchoolRouter(db, null, noOpLimiter, noOpLimiter));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => {
    for (const reference of [...schoolPendingMap.keys()]) {
      if (reference.startsWith('school-package-ref-')) schoolPendingMap.delete(reference);
    }
    return new Promise(resolve => server.close(resolve));
  });

  const url = `http://127.0.0.1:${server.address().port}/api/school/renew-license`;
  const invalid = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '0781234567', packageId: 'legacy', price: 1, examCredits: 1 })
  });
  assert.equal(invalid.status, 400);

  const expectedPackages = [
    { id: 'basic', amount: 10000, credits: 100, unitPrice: 100 },
    { id: 'standard', amount: 20000, credits: 300, unitPrice: 20000 / 300 },
    { id: 'premium', amount: 30000, credits: 600, unitPrice: 50 }
  ];
  for (const [index, pkg] of expectedPackages.entries()) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: '0781234567',
        packageId: pkg.id,
        price: 1,
        examCredits: 1
      })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(cashinCalls[index], { amount: pkg.amount, number: '0781234567' });
    const pending = schoolPendingMap.get(`school-package-ref-${index + 1}`);
    assert.equal(pending.packageId, pkg.id);
    assert.equal(pending.amount, pkg.amount);
    assert.equal(pending.examCount, pkg.credits);
    assert.equal(pending.priceToStore, pkg.unitPrice);
    assert.deepEqual(persistedOrders.get(`school-package-ref-${index + 1}`), {
      reference: `school-package-ref-${index + 1}`,
      phone: '0781234567',
      amount: pkg.amount,
      examCount: pkg.credits,
      schoolId: 7,
      packageId: pkg.id,
      provider: 'PAYPACK',
      status: 'PENDING'
    });
  }
  assert.equal(cashinCalls.length, 3);

  failNextPersistence = true;
  const persistenceFailure = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '0781234567', packageId: 'premium' })
  });
  assert.equal(persistenceFailure.status, 202);
  const persistenceResult = await persistenceFailure.json();
  assert.deepEqual(persistenceResult, {
    success: false,
    paymentInitiated: true,
    reconciliationRequired: true,
    referenceId: 'school-package-ref-4',
    error: persistenceResult.error
  });
  assert.match(persistenceResult.error, /Ntukongere kohereza ubwishyu/);
  assert.match(persistenceResult.error, /school-package-ref-4/);
  assert.equal(schoolPendingMap.get('school-package-ref-4').packageId, 'premium');
  assert.equal(schoolPendingMap.get('school-package-ref-4').schoolId, 7);

  const dashboard = fs.readFileSync(path.join(__dirname, '..', 'public', 'school-dashboard.html'), 'utf8');
  assert.match(dashboard, /data\.paymentInitiated && data\.reconciliationRequired/);
  const uncertainPaymentHandler = dashboard.slice(
    dashboard.indexOf('if (data.paymentInitiated && data.reconciliationRequired)'),
    dashboard.indexOf("if (!data.success)", dashboard.indexOf('if (data.paymentInitiated && data.reconciliationRequired)'))
  );
  assert.match(uncertainPaymentHandler, /btn\.disabled = true/);
  assert.match(uncertainPaymentHandler, /setSchoolPackageSelectionDisabled\(true\)/);
  assert.doesNotMatch(uncertainPaymentHandler, /setSchoolPackageSelectionDisabled\(false\)|btn\.disabled = false/);
});

test('school purchase remains disabled and warns with the reference after polling timeout or network failure', async () => {
  const runScenario = async ({ networkError, maxAttempts }) => {
    const elements = new Map([
      ['renewMomoPhoneInput', { value: '0781234567', focus() {} }],
      ['renewSubmitBtn', { disabled: false, innerHTML: '' }],
      ['selectedSchoolPackageSummary', { textContent: '' }],
      ['selectedSchoolPaymentHint', { textContent: '' }],
      ['ussdSchoolHint', { style: { display: 'none' } }],
      ['ussdSchoolCode', { textContent: '' }]
    ]);
    const packageOptions = [{ disabled: false }];
    const alerts = [];
    let pollCallback;
    let pollCleared = false;
    let statusPolls = 0;
    const window = {};
    const context = {
      window,
      document: {
        getElementById: id => elements.get(id),
        querySelectorAll: () => packageOptions
      },
      fetch(url) {
        if (url === '/api/school/renew-license') {
          return Promise.resolve({ json: () => Promise.resolve({ success: true, referenceId: 'poll-reference-123' }) });
        }
        statusPolls++;
        if (networkError) return Promise.reject(new Error('network unavailable'));
        return Promise.resolve({ json: () => Promise.resolve({ status: 'PENDING' }) });
      },
      setInterval(callback) {
        pollCallback = callback;
        return 'school-poll';
      },
      clearInterval(id) {
        if (id === 'school-poll') pollCleared = true;
      },
      setTimeout: () => 'ussd-timeout',
      clearTimeout() {},
      ikAlert: (...args) => alerts.push(args),
      loadSchoolWalletMetricsData() {},
      console
    };
    const start = fs.readFileSync(path.join(__dirname, '..', 'public', 'school-dashboard.html'), 'utf8')
      .indexOf('        let selectedSchoolPackage = null;');
    const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'school-dashboard.html'), 'utf8');
    const end = source.indexOf('        function loadStudentsPerformance()', start);
    vm.runInNewContext(source.slice(start, end), context);
    window.selectSchoolPackage({
      value: 'premium',
      dataset: { packageName: 'Premium', price: '30000', examCredits: '600' }
    });
    window.triggerSchoolLicenseRenewalRequest();
    await new Promise(resolve => setImmediate(resolve));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      pollCallback();
      await new Promise(resolve => setImmediate(resolve));
    }

    assert.equal(statusPolls, maxAttempts);
    assert.equal(elements.get('renewSubmitBtn').disabled, true);
    assert.equal(packageOptions[0].disabled, true);
    assert.equal(pollCleared, true);
    assert.match(elements.get('renewSubmitBtn').innerHTML, /Ubwishyu burimo kugenzurwa/);
    assert.match(alerts.at(-1)[0], /Ntukongere gutangiza ubwishyu/);
    assert.match(alerts.at(-1)[0], /poll-reference-123/);
  };

  await runScenario({ networkError: false, maxAttempts: 24 });
  await runScenario({ networkError: true, maxAttempts: 1 });
});
