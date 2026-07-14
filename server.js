const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
require('dotenv').config({
  path: [`.env.${environment}.local`, '.env.local', `.env.${environment}`, '.env'],
});

const { createServer } = require('http');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({
  dev,
});
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const httpServer = createServer(async (req, res) => {
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

main().catch((error) => {
  console.error(error.stack);
  process.exit(1);
});
