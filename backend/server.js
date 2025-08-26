const fastify = require('fastify')({ logger: true });
const fastifyCors = require('@fastify/cors');
const fastifyHelmet = require('@fastify/helmet');
const path = require('path');
require('dotenv').config();

const startServer = async () => {
  try {
    // CORS Configuration
    await fastify.register(fastifyCors, {
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        /^https:\/\/.*\.github\.dev$/,
        /^https:\/\/.*\.app\.github\.dev$/,
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    await fastify.register(fastifyHelmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          manifestSrc: ["'self'", "https://*.github.dev", "https://*.app.github.dev"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: [
            "'self'",
            "https://*.github.dev",
            "https://*.app.github.dev",
          ],
        },
      },
    });

    // Root route
    fastify.get('/', async (request, reply) => {
      reply.send({ 
        message: 'SparkVibe API Server',
        version: '1.0.0',
        endpoints: ['/api/health', '/api/leaderboard', '/api/generate-capsule-simple', '/api/generate-vibe-card']
      });
    });

    // API Routes
    fastify.get('/api/health', async (request, reply) => {
      console.log('Health check requested from:', request.headers.origin);
      reply.send({ status: 'OK', message: 'Health Check' });
    });

    fastify.get('/api/leaderboard', async (request, reply) => {
      console.log('Leaderboard requested from:', request.headers.origin);
      reply.send([
        { username: 'SparkMaster', score: 250, rank: 1 },
        { username: 'VibeExplorer', score: 180, rank: 2 },
        { username: 'AdventureSeeker', score: 150, rank: 3 },
        { username: 'CreativeSpirit', score: 120, rank: 4 },
        { username: 'DreamWeaver', score: 95, rank: 5 }
      ]);
    });

    fastify.post('/api/generate-capsule-simple', async (request, reply) => {
      console.log('Capsule generation requested from:', request.headers.origin);
      console.log('Request body:', request.body);
      
      const { mood, interests, userChoices, completionStats } = request.body;
      
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
      
      reply.send({ 
        success: true, 
        capsule: randomCapsule,
        adventure: {
          title: "Daily Spark Adventure",
          prompt: randomCapsule
        },
        metadata: {
          mood: mood || 'neutral',
          interests: interests || [],
          generated_at: new Date().toISOString()
        }
      });
    });

    fastify.post('/api/generate-vibe-card', async (request, reply) => {
      console.log('Vibe card generation requested from:', request.headers.origin);
      console.log('Request body:', request.body);
      
      const { capsuleData, userChoices, completionStats, user } = request.body;
      
      const adventureTitles = [
        "The Creative Spark Challenge",
        "Mindful Morning Adventure",
        "Curiosity Quest Completed",
        "Innovation Discovery Journey",
        "Personal Growth Expedition",
        "Wisdom Seeking Adventure",
        "Courage Building Challenge",
        "Inspiration Hunt Success"
      ];
      
      const outcomes = [
        "You embraced creativity and discovered new possibilities!",
        "Your mindful approach led to deeper insights.",
        "Curiosity guided you to unexpected discoveries.",
        "Innovation thinking opened new pathways.",
        "Personal growth was your greatest reward.",
        "Wisdom found you in the most surprising places.",
        "Courage became your superpower today.",
        "Inspiration flows through every choice you make."
      ];
      
      const badges = [
        "Creative Explorer",
        "Mindful Adventurer", 
        "Curious Discoverer",
        "Innovation Pioneer",
        "Growth Champion",
        "Wisdom Seeker",
        "Courage Builder",
        "Inspiration Catalyst"
      ];
      
      const templates = ['cosmic', 'nature', 'retro', 'minimal'];
      const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
      
      const basePoints = 25;
      const choiceBonus = Object.keys(userChoices || {}).length * 5;
      const completionBonus = completionStats?.vibePointsEarned || 0;
      const totalPoints = basePoints + choiceBonus + completionBonus;
      
      const streak = Math.floor(Math.random() * 30) + 1;
      
      const captions = [
        `Just completed an amazing SparkVibe adventure and earned ${totalPoints} points!`,
        `${streak}-day streak going strong! Level up your mindset with SparkVibe.`,
        `Daily dose of inspiration unlocked! Join me on SparkVibe.`,
        `Adventure completed: ${adventureTitles[Math.floor(Math.random() * adventureTitles.length)]}`
      ];
      
      const hashtags = [
        '#SparkVibe',
        '#Adventure',
        '#Growth', 
        '#Inspiration',
        '#Mindset',
        '#DailyChallenge',
        '#PersonalDevelopment',
        '#CreativeLife'
      ];
      
      const cardData = {
        content: {
          adventure: {
            title: capsuleData?.adventure?.title || adventureTitles[Math.floor(Math.random() * adventureTitles.length)],
            outcome: outcomes[Math.floor(Math.random() * outcomes.length)]
          },
          achievement: {
            points: totalPoints,
            streak: streak,
            badge: badges[Math.floor(Math.random() * badges.length)]
          }
        },
        design: {
          template: selectedTemplate,
          customColors: null,
          animations: ['slideIn', 'pulse', 'sparkle']
        },
        user: {
          name: user?.name || 'Explorer',
          totalPoints: (user?.totalPoints || 1000) + totalPoints,
          level: Math.floor(((user?.totalPoints || 1000) + totalPoints) / 500) + 1
        },
        sharing: {
          captions: captions,
          hashtags: hashtags,
          qrCode: 'https://github.com/reehan7086/SparkVibe',
          platforms: ['twitter', 'facebook', 'instagram', 'tiktok', 'snapchat']
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0',
          userChoicesCount: Object.keys(userChoices || {}).length,
          sessionId: `session_${Date.now()}`
        }
      };
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      reply.send({
        success: true,
        card: cardData,
        processingTime: '1.5s',
        message: 'Vibe card generated successfully!'
      });
    });

    // 404 handler - must come after all route definitions
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        reply.status(404).send({ error: 'API endpoint not found' });
      } else {
        reply.status(404).send({ error: 'Frontend not available, API only' });
      }
    });

    await fastify.listen({
      port: process.env.PORT || 8080,
      host: '0.0.0.0',
    });

    console.log(`SparkVibe Server listening on 0.0.0.0:${process.env.PORT || 8080}`);
    
  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
};

startServer();