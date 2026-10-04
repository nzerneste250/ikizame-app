const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const navJs = fs.readFileSync(path.join(repoRoot, 'public', 'assets', 'js', 'public-navigation.js'), 'utf8');
const navCss = fs.readFileSync(path.join(repoRoot, 'public', 'assets', 'css', 'blue-navigation-responsive.css'), 'utf8');
const publicSiteCss = fs.readFileSync(path.join(repoRoot, 'public', 'assets', 'css', 'public-site.css'), 'utf8');

const navCssText = `${navCss}\n${publicSiteCss}`;

test('public navigation uses desktop brand sizing only on large screens and keeps mobile compact', () => {
  assert.match(navCssText, /@media\s*\(min-width:\s*1024px\)/i, 'Desktop brand sizing should exist for large screens.');
  assert.match(navCssText, /\.navbar-brand-wrap\s*img\s*\{[^}]*height:\s*60px/i, 'Desktop logo height should be increased.');
  assert.match(navCssText, /\.navbar-brand\s*\{[^}]*font-size:\s*30px/i, 'Desktop brand name should be increased.');
  assert.doesNotMatch(navCssText, /@media\s*\(max-width:[^)]*\)\s*\{[^}]*\.navbar-brand-wrap\s*img\s*\{[^}]*height:\s*(?:52|56|60|64|70)px/i, 'Mobile logo sizing should remain compact.');
});

test('public navigation avoids white hover and active backgrounds', () => {
  assert.doesNotMatch(navCssText, /\.navbar-links\s+a:not\(\.navbar-cta\)[\s\S]{0,200}background:\s*(?:white|#fff|#ffffff|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(?:1|0\.9|0\.8|0\.7|0\.6|0\.5|0\.4|0\.3|0\.2|0\.1)\))/i, 'No white backgrounds should be used on nav hover/active states.');
  assert.match(navCssText, /background:\s*rgba\(30,\s*96,\s*190,\s*0\.28\)|background:\s*rgba\(36,\s*109,\s*220,\s*0\.34\)|box-shadow:\s*inset\s*0\s*-\s*2px\s*0\s*rgba\(90,\s*160,\s*255,\s*0\.95\)/i, 'Navigation highlight should use a blue treatment instead of white backgrounds.');
});

test('public navigation sets route-aware active links and aria-current', () => {
  assert.match(navJs, /aria-current|currentTarget|pathname|new URL\(.*href|active.*link/i, 'The shared nav helper should set the current page state based on route.');
  assert.match(navJs, /setAttribute\(\s*['\"]aria-current['\"]\s*,\s*['\"]page['\"]\s*\)/i, 'The current link should expose aria-current=\"page\".');
});
