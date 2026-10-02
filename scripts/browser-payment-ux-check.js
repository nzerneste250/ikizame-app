/*
 * Local, mock-only visual and interaction check for the public payment UI.
 * Run with NODE_PATH pointing at a temporary playwright-core installation.
 */
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const root = path.join(__dirname, '..');
const edgePath = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const docs = path.join(root, 'docs');

function serveStatic(req, res) {
  const rawPath = new URL(req.url, 'http://127.0.0.1').pathname;
  const relativePath = rawPath === '/' ? 'public/index.html' : path.join('public', decodeURIComponent(rawPath));
  const filename = path.resolve(root, relativePath);
  if (!filename.startsWith(path.resolve(root, 'public') + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(filename, (error, content) => {
    if (error) return res.writeHead(404).end();
    const ext = path.extname(filename);
    const type = ext === '.html' ? 'text/html' : ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type }).end(content);
  });
}

async function newPaymentPage(browser, status = 'PENDING', acceleratePolling = false) {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  if (acceleratePolling) {
    await page.addInitScript(() => {
      const nativeSetInterval = window.setInterval;
      window.setInterval = (callback, delay, ...args) => nativeSetInterval(callback, delay === 2000 ? 1 : delay, ...args);
    });
  }
  let pushes = 0;
  await page.route('**/api/payments/momo-push', route => {
    pushes += 1;
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, referenceId: 'mock-pending-reference' }) });
  });
  await page.route('**/api/payments/verify/mock-pending-reference', route => {
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status }) });
  });
  await page.goto(`${baseUrl}/ibiciro.html`, { waitUntil: 'domcontentloaded' });
  return { page, pushes: () => pushes };
}

let baseUrl;

async function main() {
  const server = http.createServer(serveStatic);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });

  try {
    for (const pathname of ['/', '/about.html', '/terms.html', '/ibiciro.html']) {
      for (const width of [320, 360, 390, 768, 1440]) {
        console.log(`Checking ${pathname} at ${width}px`);
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(100);
        const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
        assert.ok(dimensions.scrollWidth <= dimensions.viewportWidth, `${pathname} overflows at ${width}px: ${dimensions.scrollWidth}/${dimensions.viewportWidth}`);
        await page.close();
      }
    }

    for (const [width, height] of [[320, 568], [360, 640], [360, 800], [390, 844], [412, 915], [768, 1024], [1024, 768], [1366, 768], [1440, 900]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(`${baseUrl}/ibiciro.html`, { waitUntil: 'domcontentloaded' });
      await page.locator('.btn-pay-trigger').first().click();
      await page.evaluate(() => window.showPaymentStatus('Internet yacitse. Niba waramaze kwemeza ubwishyu kuri telefone, ntukongere kwishyura; tegereza gato.', 'pending'));
      const layout = await page.evaluate(() => {
        const rect = selector => {
          const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
          return { x, y, width, height };
        };
        const parentRect = selector => {
          const { x, y, width, height } = document.querySelector(selector).parentElement.getBoundingClientRect();
          return { x, y, width, height };
        };
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          quantityField: parentRect('#examQuantityVolumeSelector'),
          quantity: rect('#examQuantityVolumeSelector'),
          phone: rect('.phone-input-wrap'),
          summary: rect('.pay-summary-card'),
          button: rect('#momoSubmitPaymentBtn'),
        };
      });
      assert.ok(layout.documentWidth <= layout.viewportWidth, `checkout overflows at ${width}x${height}`);
      if (width <= 680) {
        for (const block of [layout.phone, layout.summary, layout.button]) {
          assert.ok(Math.abs(block.x - layout.quantity.x) < 1 && Math.abs(block.width - layout.quantity.width) < 1, `mobile controls do not align at ${width}x${height}`);
        }
        assert.ok(layout.phone.y < layout.summary.y && layout.summary.y < layout.button.y, `mobile payment order is incorrect at ${width}x${height}`);
      } else {
        assert.ok(layout.summary.x > layout.quantity.x, `desktop summary is not in the right column at ${width}x${height}`);
        assert.ok(Math.abs(layout.summary.y - layout.quantityField.y) < 2, `desktop top row is misaligned at ${width}x${height}`);
        assert.ok(Math.abs(layout.button.x - layout.summary.x) < 2, `desktop action is not in the right column at ${width}x${height}`);
        assert.ok(Math.abs(layout.button.y - layout.phone.y) < 28, `desktop payment button does not align with phone input at ${width}x${height}`);
      }
      if (width === 390) await page.screenshot({ path: path.join(docs, 'payment-modal-responsive-mobile.png'), fullPage: false });
      if (width === 1440) await page.screenshot({ path: path.join(docs, 'payment-modal-responsive-desktop.png'), fullPage: false });
      await page.close();
    }

    const jump = await newPaymentPage(browser);
    await jump.page.getByRole('button', { name: 'Ishyura ikizamini' }).click();
    await expectFocused(jump.page, '#pricingOptions');
    await jump.page.screenshot({ path: path.join(docs, 'payment-ux-mobile.png'), fullPage: false });
    await jump.page.setViewportSize({ width: 1440, height: 1000 });
    await jump.page.screenshot({ path: path.join(docs, 'payment-ux-desktop.png'), fullPage: false });
    await jump.page.close();

    const pending = await newPaymentPage(browser);
    await pending.page.locator('.btn-pay-trigger').first().click();
    await pending.page.locator('#momoPhoneNumberInput').fill('0788000000');
    await pending.page.evaluate(() => window.sanitizeMomoPhone());
    await pending.page.locator('#momoSubmitPaymentBtn').click();
    await pending.page.waitForTimeout(50);
    await pending.page.locator('.pay-modal-close').click();
    await pending.page.locator('.btn-pay-trigger').nth(1).click();
    await assertText(pending.page, '#paymentStatusMessage', 'ubusabe bwo kwishyura bukiri gutegerejwe');
    assert.equal(await pending.pushes(), 1, 'reopening a pending checkout must not make another push');
    assert.equal(await pending.page.locator('#momoSubmitPaymentBtn').isDisabled(), true);
    assert.equal(await pending.page.locator('#momoPhoneNumberInput').inputValue(), '0788000000');
    await pending.page.screenshot({ path: path.join(docs, 'payment-ux-pending.png'), fullPage: false });
    await pending.page.close();

    const invalid = await newPaymentPage(browser);
    await invalid.page.locator('.btn-pay-trigger').first().click();
    await invalid.page.evaluate(() => window.dispatchAdaptivePaymentQueryPacket());
    await assertText(invalid.page, '#paymentStatusMessage', 'Andika nimero ya telefone yuzuye');
    assert.equal(await invalid.pushes(), 0, 'invalid form must not make a push');
    await invalid.page.screenshot({ path: path.join(docs, 'payment-ux-error.png'), fullPage: false });
    await invalid.page.close();

    const success = await newPaymentPage(browser, 'SUCCESS');
    await success.page.locator('.btn-pay-trigger').first().click();
    await success.page.locator('#momoPhoneNumberInput').fill('0788000000');
    await success.page.evaluate(() => window.sanitizeMomoPhone());
    await success.page.locator('#momoSubmitPaymentBtn').click();
    await success.page.waitForTimeout(2200);
    assert.equal(await success.page.locator('#customBrandedSuccessAlertBoxModal').evaluate(el => getComputedStyle(el).display), 'flex');
    await success.page.screenshot({ path: path.join(docs, 'payment-ux-success.png'), fullPage: false });
    await success.page.close();

    const failure = await newPaymentPage(browser, 'FAILED');
    await failure.page.locator('.btn-pay-trigger').first().click();
    await failure.page.locator('#momoPhoneNumberInput').fill('0788000000');
    await failure.page.evaluate(() => window.sanitizeMomoPhone());
    await failure.page.locator('#momoSubmitPaymentBtn').click();
    await failure.page.waitForTimeout(2200);
    await assertText(failure.page, '#paymentStatusMessage', 'Kwishyura ntabwo kwemejwe');
    await failure.page.close();

    const timeout = await newPaymentPage(browser, 'PENDING', true);
    await timeout.page.locator('.btn-pay-trigger').first().click();
    await timeout.page.locator('#momoPhoneNumberInput').fill('0788000000');
    await timeout.page.evaluate(() => window.sanitizeMomoPhone());
    await timeout.page.locator('#momoSubmitPaymentBtn').click();
    await timeout.page.waitForTimeout(700);
    await assertText(timeout.page, '#paymentStatusMessage', 'Igihe urubuga rwategereje cyarangiye');
    assert.equal(await timeout.pushes(), 1, 'timeout recovery must not create a second push');
    await timeout.page.close();

    console.log('BROWSER_PAYMENT_UX_CHECK=PASS');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

async function assertText(page, selector, text) {
  await page.locator(selector).waitFor();
  assert.match(await page.locator(selector).textContent(), new RegExp(text, 'i'));
}

async function expectFocused(page, selector) {
  await page.waitForTimeout(50);
  assert.equal(await page.locator(selector).evaluate(element => document.activeElement === element), true);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
