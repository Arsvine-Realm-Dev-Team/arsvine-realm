require('dotenv').config({ path: '.env.local' });

const { createServer } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({
  dev,
});
const handle = app.getRequestHandler();
// Optional: external-service proxy routes may be added here when required.
// const ANALYTICS_TARGET = 'http://127.0.0.1:3001';
// Uncomment and configure if you use a self-hosted analytics service.

async function main() {
  await app.prepare();

  const httpServer = createServer(async (req, res) => {
    // Optional: Analytics proxy route
    // if ((req.url || '').startsWith('/analytics/')) {
    //   proxyToAnalytics(req, res);
    //   return;
    // }

    handle(req, res);
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
