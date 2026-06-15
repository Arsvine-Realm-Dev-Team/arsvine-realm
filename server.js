require('dotenv').config({ path: '.env.local' });

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({
  dev,
});
const handle = app.getRequestHandler();

// Optional: Analytics proxy (e.g. Umami, Plausible)
// const ANALYTICS_TARGET = 'http://127.0.0.1:3001';
// Uncomment and configure if you use a self-hosted analytics service.

async function main() {
  await app.prepare();

  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);

    // Optional: Analytics proxy route
    // if (parsedUrl.pathname.startsWith('/analytics/')) {
    //   proxyToAnalytics(req, res, parsedUrl);
    //   return;
    // }

    handle(req, res, parsedUrl);
  });

  function gracefulShutdown(signal) {
    console.log(`Received ${signal}, shutting down...`);
    httpServer.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000);
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
