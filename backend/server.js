const fastify = require('fastify')({ logger: true });
const fastifyCors = require('@fastify/cors');
const fastifyHelmet = require('@fastify/helmet');
require('dotenv').config();

const startServer = async () => {
  try {
    // CORS configuration - FIXED
    await fastify.register(fastifyCors, {
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://sparkvibe.app',
        'https://www.sparkvibe.app',
        'https://api.sparkvibe.app', // This was missing!
        'https://sparkvibe-frontend.ondigitalocean.app',
        /^https:\/\/.*\.github\.dev$/,
        /^https:\/\/.*\.app\.github\.dev$/,
        /^https:\/\/.*\.ondigitalocean.app$/
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Added X-Requested-With
      credentials: true,
      // Add preflight handling
      preflightContinue: false,
      optionsSuccessStatus: 204
    });

    // Security headers - RELAXED for API
    await fastify.register(fastifyHelmet, {
      contentSecurityPolicy: false, // Disable CSP for API
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    });

    // Add preflight handler for all routes
    fastify.options('*', async (request, reply) => {
      return reply
        .header('Access-Control-Allow-Origin', request.headers.origin || '*')
        .header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        .header('Access-Control-Allow-Credentials', 'true')
        .status(204)
        .send();
    });

    // Root endpoint
    fastify.get('/', async (request, reply) => {
      return reply
        .header('Access-Control-Allow-Origin', request.headers.origin || '*')
        .send({
          message: 'SparkVibe API Server',
          version: '1.0.0',
          status: 'running',
          endpoints: [
            'GET /api/health',
            'GET /api/leaderboard',
            'POST /api/generate-capsule-simple',
            'POST /api/generate-vibe-card'
          ]
        });
    });

    // Health check
    fastify.get('/api/health', async (request, reply) => {
      return reply
        .header('Access-Control-Allow-Origin', request.headers.origin || '*')
        .send({
          status: 'OK',
          message: 'Health Check',
          timestamp: new Date().toISOString()
        });
    });

    // Leaderboard endpoint
    fastify.get('/api/leaderboard', async (request, reply) => {
      return reply
        .header('Access-Control-Allow-Origin', request.headers.origin || '*')
        .send([
          { username: 'SparkMaster', score: 250, rank: 1 },
          { username: 'VibeExplorer', score: 180, rank: 2 },
          { username: 'AdventureSeeker', score: 150, rank: 3 },
          { username: 'CreativeSpirit', score: 120, rank: 4 },
          { username: 'DreamWeaver', score: 95, rank: 5 }
        ]);
    });

    // Generate capsule
    fastify.post('/api/generate-capsule-simple', async (request, reply) => {
      const { mood, interests } = request.body || {};
      const capsules = [
        "Your creative energy is sparking new possibilities!",
        "Adventure calls to your courageous spirit today.",
        "Inspiration flows through every choice you make.",
        "Your unique vibe lights up the world around you.",
        "Today's journey brings unexpected discoveries.",
        "Your creativity unlocks doors to new experiences.",
        "Bold choices lead to extraordinary adventures.",
        "Your positive energy creates ripples of change."
      ];
      const randomCapsule = capsules[Math.floor(Math.random() * capsules.length)];
      
      return reply
        .header('Access-Control-Allow-Origin', request.headers.origin || '*')
        .send({
          success: true,
          capsule: randomCapsule,
          adventure: { title: "Daily Spark Adventure", prompt: randomCapsule },
          metadata: { mood: mood || 'neutral', interests: interests || [], generated_at: new Date().toISOString() }
        });
    });

    // Generate vibe card
    fastify.post('/api/generate-vibe-card', async (request, reply) => {
      const { capsuleData, userChoices, completionStats, user } = request.body || {};
      const adventureTitles = [
        "The Creative Spark Challenge",
        "Mindful Morning Adventure",
        "Curiosity Quest Completed",
        "Innovation Discovery Journey",
        "Personal Growth Expedition"
      ];
      const outcomes = [
        "You embraced creativity and discovered new possibilities!",
        "Your mindful approach led to deeper insights.",
        "Curiosity guided you to unexpected discoveries.",
        "Innovation thinking opened new pathways.",
        "Personal growth was your greatest reward."
      ];
      const badges = ["Creative Explorer", "Mindful Adventurer", "Curious Discoverer", "Innovation Pioneer", "Growth Champion"];
      const templates = ['cosmic', 'nature', 'retro', 'minimal'];
      const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];

      const basePoints = 25;
      const choiceBonus = Object.keys(userChoices || {}).length * 5;
      const completionBonus = completionStats?.vibePointsEarned || 0;
      const totalPoints = basePoints + choiceBonus + completionBonus;
      const streak = Math.floor(Math.random() * 30) + 1;

      const cardData = {
        content: {
          adventure: {
            title: capsuleData?.adventure?.title || adventureTitles[Math.floor(Math.random() * adventureTitles.length)],
            outcome: outcomes[Math.floor(Math.random() * outcomes.length)]
          },
          achievement: { points: totalPoints, streak, badge: badges[Math.floor(Math.random() * badges.length)] }
        },
        design: { template: selectedTemplate, animations: ['slideIn', 'pulse', 'sparkle'] },
        user: { name: user?.name || 'Explorer', totalPoints: (user?.totalPoints || 1000) + totalPoints, level: Math.floor(((user?.totalPoints || 1000) + totalPoints) / 500) + 1 },
        sharing: {
          captions: [
            `Just completed an amazing SparkVibe adventure and earned ${totalPoints} points!`,
            `${streak}-day streak going strong! Level up your mindset with SparkVibe.`
          ],
          hashtags: ['#SparkVibe', '#Adventure', '#Growth', '#Inspiration'],
          qrCode: 'https://github.com/reehan7086/SparkVibe'
        },
        metadata: { generatedAt: new Date().toISOString(), version: '1.0', sessionId: `session_${Date.now()}` }
      };

      await new Promise(resolve => setTimeout(resolve, 1000)); // simulate processing
      
      return reply
        .header('Access-Control-Allow-Origin', request.headers.origin || '*')
        .send({ 
          success: true, 
          card: cardData, 
          processingTime: '1.0s', 
          message: 'Vibe card generated successfully!' 
        });
    });

    // Start server
    await fastify.listen({ port: process.env.PORT || 5000, host: '0.0.0.0' });
    console.log(`SparkVibe API Server running on port ${process.env.PORT || 5000}`);

  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
};

startServer();