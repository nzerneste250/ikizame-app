const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const publicDir = path.join(repoRoot, 'public');
const contactPages = [
  'about-school.html', 'about.html', 'amanota.html', 'ibiciro.html',
  'ifashanyigisho.html', 'index.html', 'school-auth.html', 'terms-school.html',
  'terms.html', 'ubufasha.html'
];
const readPage = (name) => fs.readFileSync(path.join(publicDir, name), 'utf8');

test('PUBLIC_CONTACT_ICONS_AND_LINKS=PASS', () => {
  for (const pageName of contactPages) {
    const page = readPage(pageName);
    assert.match(page, /<h3>Twandikire<\/h3><ul class='contact-details'>/, `${pageName} has the polished contact list`);
    assert.match(page, /href='tel:\+250786663377'><i class='fa-solid fa-phone' aria-hidden='true'><\/i><span>\+250 786 663 377<\/span>/, `${pageName} keeps the phone link and number`);
    assert.match(page, /href='https:\/\/wa\.me\/250786663377'><i class='fa-brands fa-whatsapp' aria-hidden='true'><\/i><span>WhatsApp<\/span>/, `${pageName} keeps the WhatsApp link`);
    assert.match(page, /href='mailto:ikizame\.rw@gmail\.com'><i class='fa-solid fa-envelope' aria-hidden='true'><\/i><span>ikizame\.rw@gmail\.com<\/span>/, `${pageName} keeps the email link`);
    assert.match(page, /<i class='fa-solid fa-location-dot' aria-hidden='true'><\/i><span>Kigali &#8211; Kabuga<\/span>/, `${pageName} keeps the location`);
  }
});

test('PUBLIC_CONTACT_ICONS_SHARED_RESPONSIVE_STYLE=PASS', () => {
  const css = fs.readFileSync(path.join(publicDir, 'assets', 'css', 'public-site.css'), 'utf8');
  assert.ok(css.includes('flex: 0 0 20px'));
  assert.ok(css.includes('min-width: 20px'));
  assert.ok(css.includes('gap: 10px'));
  assert.ok(css.includes('.site-footer .contact-details .fa-whatsapp { color: #25d366; }'));
  assert.ok(css.includes('overflow-wrap: anywhere'));
  assert.ok(css.includes('transition: color .16s ease;'));
  assert.ok(css.includes('.site-footer .contact-details a:hover { color: #86efac; }'));
  assert.match(css, /\.site-footer :where\(a, strong\)\s*\{\s*overflow-wrap:\s*anywhere/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.site-footer \{\s*grid-template-columns: 1fr 1fr/);
});