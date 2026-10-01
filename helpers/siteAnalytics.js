const crypto = require('crypto');

const PUBLIC_PAGES = {
  'index.html': { path: '/', title: 'IKIZAME | Ahabanza' },
  'ifashanyigisho.html': { path: '/ifashanyigisho', title: 'IKIZAME | Imfashanyigisho' },
  'ibiciro.html': { path: '/ibiciro', title: 'IKIZAME | Ibiciro' },
  'ubufasha.html': { path: '/ubufasha', title: 'IKIZAME | Ubufasha' },
  'about.html': { path: '/about', title: 'IKIZAME | About' },
  'terms.html': { path: '/terms', title: 'IKIZAME | Terms' },
  'exam.html': { path: '/exam', title: 'IKIZAME | Exam', private: true }
};

function analyticsConfig(env = process.env) {
  const measurementId = (env.GA4_MEASUREMENT_ID || '').trim();
  return {
    enabled: env.GA4_ENABLED === 'true' && /^G-[A-Z0-9]{6,20}$/.test(measurementId)
      && !/^G-(?:X+|0+|YOUR.*|EXAMPLE.*|PLACEHOLDER.*)$/.test(measurementId),
    measurementId,
    debug: env.GA4_DEBUG === 'true'
  };
}

function excludeAdmin(req) {
  return Boolean(req?.session?.isAdminAuthenticated || req?.session?.isSchoolAuthenticated);
}

function injectAnalytics(html, fileName, req, env = process.env) {
  const config = analyticsConfig(env);
  const page = PUBLIC_PAGES[fileName];
  if (!config.enabled || !page || excludeAdmin(req)) return html;
  // Do not install a second Google tag alongside any existing installation.
  if (/googletagmanager\.com|google-analytics\.com|\bgtag\s*\(|site-analytics\.js/i.test(html)) return html;
  const tag = `<link rel="stylesheet" href="/assets/css/analytics-consent.css">\n<script defer src="/assets/js/site-analytics.js" data-measurement-id="${config.measurementId}" data-page-path="${page.path}" data-page-title="${page.title}" data-debug="${config.debug}"></script>\n`;
  return html.replace(/<\/head>/i, tag + '</head>');
}

// Only persisted SUCCESS rows can produce a receipt. Never expose the plan
// label (school names), phone, raw payment reference or other customer fields.
function purchaseReceipt(row) {
  if (!row || row.status !== 'SUCCESS') return null;
  const value = Number(row.amount);
  if (!Number.isFinite(value) || value <= 0 || typeof row.reference_id !== 'string' || !row.reference_id) return null;
  return {
    transaction_id: 'ikizame_' + crypto.createHash('sha256').update('ikizame-payment:' + row.reference_id).digest('hex'),
    value,
    currency: 'RWF',
    items: [{ item_id: 'ikizame-access', item_name: 'IKIZAME access', price: value, quantity: 1 }]
  };
}

module.exports = { PUBLIC_PAGES, analyticsConfig, excludeAdmin, injectAnalytics, purchaseReceipt };
