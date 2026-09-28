const { createServer } = require('./server');
const config = require('./config');

const server = createServer();

const port = config.port || 3000;

server.listen(port, () => {
  const actual = server.address() && server.address().port;
  console.log(`MIQAI Server V1 listening on port ${actual}`);
});

function shutdown(signal) {
  console.log(`Shutting down (signal=${signal})`);
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forcing shutdown');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
