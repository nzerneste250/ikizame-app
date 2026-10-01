const { PUBLIC_PAGES } = require('../helpers/siteAnalytics');

const indexablePaths = new Set(Object.values(PUBLIC_PAGES).filter(page => !page.private).map(page => page.path));
indexablePaths.add('/index');

function indexingHeaders(req, res, next) {
  const pathname = req.path;
  if (!pathname.startsWith('/assets/') && !['/robots.txt', '/sitemap.xml'].includes(pathname)) {
    if (process.env.NODE_ENV !== 'production' || !indexablePaths.has(pathname)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
  }
  next();
}

module.exports = { indexingHeaders, indexablePaths };
