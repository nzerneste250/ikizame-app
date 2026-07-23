const test = require('node:test');
const assert = require('node:assert/strict');
const { injectFooterLinks } = require('../helpers/publicPageRenderer');

test('injects About and Terms links into the homepage when they are missing', () => {
  const html = '<html><body><footer class="footer"></footer></body></html>';
  const result = injectFooterLinks(html, 'index.html');

  assert.match(result, /href="\/about"/);
  assert.match(result, /href="\/terms"/);
});
