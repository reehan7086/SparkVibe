console.log('Node version:', process.version);
console.log('Starting server...');
const fastify = require('fastify')({ logger: true });

async function startServer() {
  try {
    await fastify.listen({ port: process.env.PORT || 8080, host: '0.0.0.0' });
    console.log('Server running');
  } catch (err) {
    console.error('Server error:', err);
    process.exit(1);
  }
}

startServer();