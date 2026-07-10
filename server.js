require('dotenv').config({ path: '.env.local' });

const { createServer } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({
  dev,
});
const handle = app.getRequestHandler();
const SUPPORTED_LOCALES = new Set(['zh-CN', 'zh-TW', 'en']);

function toParsedUrl(req) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const query = {};

  for (const key of url.searchParams.keys()) {
    const values = url.searchParams.getAll(key);
    query[key] = values.length > 1 ? values : values[0] ?? '';
  }

  const firstSegment = url.pathname.split('/').filter(Boolean)[0];
  if (firstSegment && SUPPORTED_LOCALES.has(firstSegment) && query.locale == null) {
    query.locale = firstSegment;
  }

  return {
    hash: url.hash,
    href: `${url.pathname}${url.search}${url.hash}`,
    pathname: url.pathname,
    query,
    search: url.search,
  };
}

// Optional: external-service proxy routes may be added here when required.
// const ANALYTICS_TARGET = 'http://127.0.0.1:3001';
// Uncomment and configure if you use a self-hosted analytics service.

async function main() {
  await app.prepare();

  const httpServer = createServer(async (req, res) => {
    const parsedUrl = toParsedUrl(req);

    // Optional: Analytics proxy route
    // if (parsedUrl.pathname.startsWith('/analytics/')) {
    //   proxyToAnalytics(req, res, parsedUrl);
    //   return;
    // }

    handle(req, res, parsedUrl);
  });

  function gracefulShutdown(signal) {
    console.log(`Received ${signal}, shutting down...`);
    const forceExitTimer = setTimeout(() => process.exit(0), 3000);
    httpServer.close(() => {
      clearTimeout(forceExitTimer);
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

  const port = process.env.PORT || 3000;
  httpServer
    .listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
    })
    .on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });
}

main().catch(ex => {
    console.error(ex.stack);
    process.exit(1);
});
