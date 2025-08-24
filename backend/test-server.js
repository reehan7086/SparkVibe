// Create this as test-server.js in your backend folder
const fastify = require('fastify')({ logger: true });

// Enable CORS
fastify.register(require('@fastify/cors'));

// Test routes
fastify.get('/', async (request, reply) => {
  reply.send({ message: 'SparkVibe API is running!', status: 'OK' });
});

fastify.get('/test', async (request, reply) => {
  reply.send({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

fastify.get('/api/health', async (request, reply) => {
  reply.send({ 
    status: 'OK',
    message: 'SparkVibe Backend Health Check'
  });
});

fastify.get('/api/leaderboard', async (request, reply) => {
  // Return test data
  const testLeaderboard = [
    { username: 'Alice', score: 150, rank: 1 },
    { username: 'Bob', score: 120, rank: 2 },
    { username: 'Charlie', score: 90, rank: 3 }
  ];
  
  reply.send(testLeaderboard);
});

// Start server
fastify.listen({ port: 5000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`✅ Test server running at ${address}`);
  console.log(`Try these URLs:`);
  console.log(`- http://localhost:5000/`);
  console.log(`- http://localhost:5000/test`);
  console.log(`- http://localhost:5000/api/health`);
  console.log(`- http://localhost:5000/api/leaderboard`);
});