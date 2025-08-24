const fastify = require('fastify')({ logger: true });
const redis = require('redis');
const webpush = require('web-push');
require('dotenv').config();

// VAPID keys setup for push notifications
const vapidKeys = {
  publicKey: 'BJcKE2vz5Gku0jKW-5boZcJWAQ7thRjCr3Ema_8grFqlW3T2cI-s2WFWmcoDDPAd7arwbS1iAXTVF7CkSn5PkME',
  privateKey: 'u9_qijPu5lLmuho_1YrOLH3092YBT-avMWazj1DrksQ'
};

webpush.setVapidDetails(
  'mailto:buzzersbug@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Store subscriptions
let subscriptions = [];

// Middleware
fastify.register(require('@fastify/cors'));
fastify.register(require('@fastify/helmet'));

// Redis Connection
const redisClient = redis.createClient({
  host: 'localhost',
  port: 6379
});

redisClient.on('error', (err) => fastify.log.error('Redis Client Error', err));
redisClient.on('connect', () => fastify.log.info('✅ Redis connected successfully'));

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    fastify.log.error('Redis connection failed:', err);
  }
})();

// Helper Functions
const updateLeaderboard = async (username, points = 10) => {
  try {
    await redisClient.sendCommand(['ZINCRBY', 'leaderboard', points.toString(), username]);
    fastify.log.info(`✅ Updated leaderboard: ${username} +${points} points`);
  } catch (error) {
    fastify.log.error('Failed to update leaderboard:', error);
  }
};

// ========== ROUTES (NO AUTHENTICATION) ==========

// Root endpoint
fastify.get('/', async (request, reply) => {
  reply.send({ message: 'SparkVibe API is running!', status: 'OK' });
});

// Health check
fastify.get('/api/health', async (request, reply) => {
  reply.send({ 
    status: 'OK',
    redis: redisClient.isOpen ? 'connected' : 'disconnected',
    message: 'SparkVibe Backend Health Check'
  });
});

// Leaderboard endpoint
fastify.get('/api/leaderboard', async (request, reply) => {
  try {
    const leaderboard = await redisClient.sendCommand(['ZREVRANGE', 'leaderboard', '0', '9', 'WITHSCORES']);
    
    const formattedLeaderboard = [];
    for (let i = 0; i < leaderboard.length; i += 2) {
      formattedLeaderboard.push({
        username: leaderboard[i],
        score: parseInt(leaderboard[i + 1]),
        rank: Math.floor(i / 2) + 1
      });
    }
    
    reply.send(formattedLeaderboard);
  } catch (error) {
    fastify.log.error('Leaderboard error:', error);
    reply.status(500).send({ error: 'Failed to get leaderboard' });
  }
});

// Generate Capsule - NO AUTHENTICATION
fastify.post('/api/generate-capsule', async (request, reply) => {
  console.log('🎯 GENERATE-CAPSULE called with:', request.body);
  
  const { mood, interests } = request.body;
  
  try {
    const moodContent = {
      happy: {
        title: '✨ Sunshine Adventure',
        prompt: 'Your positive energy is contagious! Choose how to spread the joy today:',
        options: ['Send a cheerful message to a friend', 'Do a happy dance and share it'],
        moodBoost: 'Your happiness is lighting up the world! Keep shining! 🌟',
        habitNudge: 'Smile at 3 people today and watch the magic happen!'
      },
      chill: {
        title: '🌊 Zen Moment',
        prompt: 'Time to embrace the calm vibes. What sounds most relaxing?',
        options: ['Take 5 deep breaths and meditate', 'Listen to your favorite chill music'],
        moodBoost: 'Your chill energy brings peace to those around you 🧘‍♂️',
        habitNudge: 'Stretch for 2 minutes and feel the tension melt away'
      },
      curious: {
        title: '🔍 Discovery Quest',
        prompt: 'Your curiosity is your superpower! What sparks your interest?',
        options: ['Learn one fascinating fact today', 'Ask someone an interesting question'],
        moodBoost: 'Your curious mind makes the world more interesting! 🚀',
        habitNudge: 'Read about something completely new for 5 minutes'
      }
    };

    const selectedMood = moodContent[mood] || moodContent.happy;
    
    const capsule = {
      adventure: {
        title: selectedMood.title,
        prompt: selectedMood.prompt,
        options: selectedMood.options,
      },
      moodBoost: selectedMood.moodBoost,
      brainBite: {
        question: 'What percentage of your body is water?',
        answer: 'About 60%! Stay hydrated! 💧'
      },
      habitNudge: selectedMood.habitNudge,
    };

    console.log('✅ GENERATE-CAPSULE sending response');
    reply.send(capsule);
    
  } catch (err) {
    console.error('❌ GENERATE-CAPSULE error:', err);
    reply.code(500).send({ 
      error: 'Capsule generation failed',
      details: err.message 
    });
  }
});

// Update Points - NO AUTHENTICATION
fastify.post('/api/update-points', async (request, reply) => {
  console.log('🎯 UPDATE-POINTS called');
  
  try {
    const mockResponse = {
      vibePoints: Math.floor(Math.random() * 100) + 50,
      streak: Math.floor(Math.random() * 10) + 1
    };
    
    await updateLeaderboard('TestUser', 10);
    
    console.log('✅ UPDATE-POINTS sending response:', mockResponse);
    reply.send(mockResponse);
    
  } catch (err) {
    console.error('❌ UPDATE-POINTS error:', err);
    reply.code(400).send({ error: err.message });
  }
});

// Push notification endpoints
fastify.post('/api/subscribe', async (request, reply) => {
  const subscription = request.body;
  subscriptions.push(subscription);
  reply.send({ success: true });
});

fastify.post('/api/send-notification', async (request, reply) => {
  const { title, body } = request.body;
  
  const notificationPayload = JSON.stringify({
    title: title || 'SparkVibe Reminder ✨',
    body: body || 'Time to create your daily vibe card!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png'
  });

  const promises = subscriptions.map(subscription => 
    webpush.sendNotification(subscription, notificationPayload)
      .catch(err => fastify.log.error('Error sending notification:', err))
  );

  await Promise.all(promises);
  reply.send({ success: true, sent: subscriptions.length });
});

// Start server
fastify.listen({ port: process.env.PORT || 5000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`🚀 Server running at ${address}`);
  console.log('🎯 Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/leaderboard');
  console.log('  POST /api/generate-capsule');
  console.log('  POST /api/update-points');
});