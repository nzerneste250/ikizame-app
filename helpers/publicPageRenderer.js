const path = require('path');

function injectFooterLinks(html, fileName) {
  if (!html || !fileName) return html;

  if (!html.includes('/about') && !html.includes('/terms')) {
    const marker = '</footer>';
    if (html.includes(marker)) {
      return html.replace(marker, `
        <a href="/about" style="color:#38bdf8; text-decoration:none; font-weight:700;">About</a>
        <a href="/terms" style="color:#38bdf8; text-decoration:none; font-weight:700;">Terms &amp; Conditions</a>
      </footer>`);
    }

    const fallback = `
      <footer class="footer" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:24px 16px;font-size:0.95rem;color:#64748b;">
        <a href="/about" style="color:#38bdf8; text-decoration:none; font-weight:700;">About</a>
        <a href="/terms" style="color:#38bdf8; text-decoration:none; font-weight:700;">Terms &amp; Conditions</a>
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
  html = injectCanonicalTag(html, `https://ikizame.rw${fileName === 'index.html' ? '/' : '/' + fileName.replace('.html', '')}`);
  const updatedHtml = injectFooterLinks(html, fileName);
  res.send(updatedHtml);
}

function injectCanonicalTag(html, canonicalUrl) {
  if (!html || !canonicalUrl) return html;
  const headClose = '</head>';
  const canonicalTag = `    <link rel="canonical" href="${canonicalUrl}" />\n`;

  if (html.includes(canonicalTag)) return html;
  if (!html.toLowerCase().includes(headClose)) return html;

  return html.replace(headClose, `${canonicalTag}${headClose}`);
}

module.exports = { injectFooterLinks, renderPublicPage };
