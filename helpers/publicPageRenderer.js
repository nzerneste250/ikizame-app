const path = require('path');
const { PUBLIC_PAGES, injectAnalytics } = require('./siteAnalytics');

function injectFooterLinks(html, fileName) {
  if (!html || !fileName) return html;

  if (!html.includes('/about') && !html.includes('/terms')) {
    const marker = '</footer>';
    if (html.includes(marker)) {
      return html.replace(marker, `
        <a href="/about" style="color:#38bdf8; text-decoration:none; font-weight:700;">Ibyerekeye IKIZAME</a>
        <a href="/terms" style="color:#38bdf8; text-decoration:none; font-weight:700;">Amategeko n’amabwiriza</a>
      </footer>`);
    }

    const fallback = `
      <footer class="footer" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:24px 16px;font-size:0.95rem;color:#64748b;">
        <a href="/about" style="color:#38bdf8; text-decoration:none; font-weight:700;">Ibyerekeye IKIZAME</a>
        <a href="/terms" style="color:#38bdf8; text-decoration:none; font-weight:700;">Amategeko n’amabwiriza</a>
      </footer>`;
    return html.includes('</body>') ? html.replace('</body>', `${fallback}</body>`) : `${html}${fallback}`;
  }

  return html;
}

function renderPublicPage(fileName, res) {
  const publicPath = path.join(__dirname, '..', 'public', fileName);
  const fs = require('fs');

  if (!fs.existsSync(publicPath)) {
    return res.status(404).send('Not found');
  }

  let html = fs.readFileSync(publicPath, 'utf8');
  const page = PUBLIC_PAGES[fileName];
  const isPrivate = !page || page.private;
  if (isPrivate) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    html = html.replace(/<\/head>/i, '<meta name="robots" content="noindex, nofollow">\n</head>');
  } else {
    html = injectCanonicalTag(html, `https://ikizame.rw${page.path}`);
  }
  html = injectAnalytics(html, fileName, res.req);
  // Keep the existing footer treatment; exam and other page layouts stay intact.
  const updatedHtml = ['index.html', 'about.html', 'terms.html'].includes(fileName) ? injectFooterLinks(html, fileName) : html;
  res.send(updatedHtml);
}

function injectCanonicalTag(html, canonicalUrl) {
  if (!html || !canonicalUrl) return html;
  const headClose = '</head>';
  const canonicalTag = `<link rel="canonical" href="${canonicalUrl}" />\n`;

  if (!html.toLowerCase().includes(headClose)) return html;
  html = html.replace(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>\s*/gi, '');
  return html.replace(/<\/head>/i, `${canonicalTag}${headClose}`);
}

module.exports = { injectFooterLinks, injectCanonicalTag, renderPublicPage };
