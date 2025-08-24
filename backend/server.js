const fastify = require('fastify')({ logger: true });
const mongoose = require('mongoose');
const redis = require('redis');
const webpush = require('web-push');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { HfInference } = require('@huggingface/inference');
const { OpenAI } = require('openai');
const ffmpeg = require('fluent-ffmpeg');
const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const path = require('path');
require('dotenv').config();

// VAPID keys setup for push notifications
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
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

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => fastify.log.info('MongoDB connected'))
  .catch(err => fastify.log.error('MongoDB error:', err));

// Redis Connection
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.on('error', (err) => fastify.log.error('Redis Client Error', err));
redisClient.on('connect', () => fastify.log.info('✅ Redis connected successfully'));
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    fastify.log.error('Redis connection failed:', err);
  }
})();

// Cloudinary Setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  name: String,
  vibePoints: { type: Number, default: 0, index: true },
  streak: { type: Number, default: 0 },
  interests: [String],
});
const User = mongoose.model('User', UserSchema);

// Helper Functions
const updateLeaderboard = async (username, points = 10) => {
  try {
    await redisClient.sendCommand(['ZINCRBY', 'leaderboard', points.toString(), username]);
    fastify.log.info(`✅ Updated leaderboard: ${username} +${points} points`);
  } catch (error) {
    fastify.log.error('Failed to update leaderboard:', error);
  }
};

// Routes
// Root endpoint
fastify.get('/', async (request, reply) => {
  reply.send({ message: 'SparkVibe API is running!', status: 'OK' });
});

// Health check
fastify.get('/api/health', async (request, reply) => {
  reply.send({ 
    status: 'OK',
    redis: redisClient.isOpen ? 'connected' : 'disconnected',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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

// Register
fastify.post('/api/register', async (request, reply) => {
  const { email, password, name } = request.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();
    reply.code(201).send({ message: 'User registered' });
  } catch (err) {
    reply.code(400).send({ error: err.message });
  }
});

// Login
fastify.post('/api/login', async (request, reply) => {
  const { email, password } = request.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    reply.send({ token, user: { id: user._id, name: user.name, vibePoints: user.vibePoints, streak: user.streak } });
  } catch (err) {
    reply.code(400).send({ error: err.message });
  }
});

// Add this to your server.js temporarily for testing
fastify.get('/api/test', async (request, reply) => {
  try {
    reply.send({ 
      status: 'Backend is working!',
      env_check: {
        mongo: !!process.env.MONGO_URI,
        redis: !!process.env.REDIS_URL,
        hf_token: !!process.env.HF_TOKEN,
        openai_key: !!process.env.OPENAI_API_KEY
      }
    });
  } catch (err) {
    reply.code(500).send({ error: err.message });
  }
});

// Generate Capsule (Protected) - SIMPLIFIED VERSION
fastify.post('/api/generate-capsule', {
  preHandler: async (request, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) return reply.code(401).send({ error: 'No token' });
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  },
}, async (request, reply) => {
  const { mood, interests } = request.body;
  try {
    console.log('🎯 GENERATE-CAPSULE called with:', { mood, interests });

    // Cache check
    const cacheKey = `capsule:${mood}:${interests.join(',')}`;
    const cachedCapsule = await redisClient.get(cacheKey);
    if (cachedCapsule) {
      console.log('✅ Returning cached capsule');
      return reply.send(JSON.parse(cachedCapsule));
    }

    // Simple mood mapping
    const moodScore = ['happy', 'excited', 'energetic'].includes(mood.toLowerCase()) ? 'positive' : 'neutral';
    console.log('✅ Mood analyzed:', moodScore);

    // Hugging Face inference using env token
    const hf = new HfInference(process.env.HF_TOKEN);

    // OpenAI for capsule content
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `Generate a 5-min interactive capsule for someone feeling ${mood} with interests in ${interests.join(', ')}. Include:
    
1. Micro-adventure: title, engaging prompt, 2 meaningful choices with outcomes
2. Mood boost: personalized uplifting message for ${moodScore} mood
3. Brain bite: interesting quiz question with 4 multiple choice options and correct answer
4. Habit nudge: small positive action relevant to their interests
    
Format as valid JSON with this exact structure:
{
  "adventure": {
    "title": "Adventure Title",
    "prompt": "Story setup...",
    "options": [
      {"text": "Choice 1", "outcome": "Result 1"},
      {"text": "Choice 2", "outcome": "Result 2"}
    ]
  },
  "moodBoost": "Encouraging message",
  "brainBite": {
    "question": "Quiz question?",
    "options": ["A", "B", "C", "D"],
    "answer": "Correct answer with explanation"
  },
  "habitNudge": {
    "task": "Simple positive action",
    "benefit": "Why it helps"
  }
}`;

    console.log('✅ Calling OpenAI...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8
    });

    console.log('✅ OpenAI response received');

    let capsule;
    try {
      capsule = JSON.parse(response.choices[0].message.content);
    } catch {
      console.log('⚠️ JSON parse failed, using fallback');
      capsule = {
        adventure: {
          title: `${mood.charAt(0).toUpperCase() + mood.slice(1)} Adventure`,
          prompt: 'You discover a mysterious glowing door in your neighborhood. What do you do?',
          options: [
            { text: 'Open the door immediately', outcome: 'You find a beautiful secret garden!' },
            { text: 'Look around first', outcome: 'You notice friendly voices coming from inside.' }
          ]
        },
        moodBoost: `Your ${mood} energy is wonderful! Keep that momentum going! ✨`,
        brainBite: { 
          question: 'Which is the largest ocean on Earth?', 
          options: ['Atlantic', 'Pacific', 'Indian', 'Arctic'],
          answer: 'Pacific (covers about 1/3 of Earth\'s surface!)' 
        },
        habitNudge: {
          task: 'Take 3 deep breaths and smile',
          benefit: 'Instant mood boost and stress relief!'
        }
      };
    }

    // Add unique ID for tracking
    capsule.id = `capsule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Cache for 1 hour
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(capsule));

    console.log('✅ GENERATE-CAPSULE sending response');
    reply.send(capsule);

  } catch (err) {
    console.error('❌ GENERATE-CAPSULE error:', err);
    reply.code(500).send({ 
      error: 'Capsule generation failed', 
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});


// Simple capsule generation without authentication or database
fastify.post('/api/generate-capsule-simple', async (request, reply) => {
  const { mood, interests } = request.body;
  
  console.log('🎯 Simple capsule generation:', { mood, interests });
  
  const capsule = {
    id: `capsule_${Date.now()}`,
    adventure: {
      title: `${mood.charAt(0).toUpperCase() + mood.slice(1)} Adventure`,
      prompt: 'You find a mysterious door that wasn\'t there yesterday. What do you do?',
      options: [
        { text: 'Open it immediately', outcome: 'You discover a room full of floating books that tell your future!' },
        { text: 'Knock first', outcome: 'A friendly voice invites you into a cozy library with magical tea.' }
      ]
    },
    moodBoost: `Your ${mood} energy is absolutely amazing! You're radiating positivity! ✨🌟`,
    brainBite: { 
      question: 'Which gas makes up about 78% of Earth\'s atmosphere?', 
      options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
      answer: 'Nitrogen (about 78%, while oxygen is about 21%)' 
    },
    habitNudge: {
      task: 'Stand up and do 3 shoulder rolls',
      benefit: 'Relieves tension and improves posture!'
    }
  };
  
  console.log('✅ Sending simple capsule response');
  reply.send(capsule);
});

// Update Points
fastify.post('/api/update-points', async (request, reply) => {
  console.log('🎯 UPDATE-POINTS called');
  const { username } = request.body;
  try {
    let user = null;
    const token = request.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const { userId } = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(userId);
        user.vibePoints += 10;
        user.streak += 1;
        await user.save();
        await redisClient.setEx(`user:${userId}`, 3600, JSON.stringify(user));
      } catch (err) {
        fastify.log.warn('Invalid token, proceeding without auth');
      }
    }

    await updateLeaderboard(username || 'TestUser', 10);
    const response = user
      ? { vibePoints: user.vibePoints, streak: user.streak }
      : { vibePoints: Math.floor(Math.random() * 100) + 50, streak: Math.floor(Math.random() * 10) + 1 };

    console.log('✅ UPDATE-POINTS sending response:', response);
    reply.send(response);
  } catch (err) {
    console.error('❌ UPDATE-POINTS error:', err);
    reply.code(400).send({ error: err.message });
  }
});

// Simple Vibe Card generation without authentication
fastify.post('/api/generate-vibe-card-simple', async (request, reply) => {
  const { capsuleData, userChoices, completionStats } = request.body;
  
  console.log('🎯 Generating Vibe Card:', { capsuleData: capsuleData?.adventure?.title });
  
  // Template selection logic
  const templates = {
    cosmic: {
      name: 'Cosmic Adventure',
      colors: ['#1a1a2e', '#16213e', '#0f3460', '#533483'],
      background: 'cosmic-space',
      animations: ['sparkle', 'float', 'glow'],
      particles: '⭐✨🌟💫'
    },
    nature: {
      name: 'Natural Vibes', 
      colors: ['#2d5016', '#3e6b1f', '#4f8228', '#60a531'],
      background: 'forest-scene',
      animations: ['leaf-fall', 'wave', 'grow'],
      particles: '🍃🌿🌱🌳'
    },
    retro: {
      name: 'Retro Wave',
      colors: ['#ff006e', '#fb5607', '#ffbe0b', '#8338ec'],
      background: 'neon-grid', 
      animations: ['neon-pulse', 'scan-line', 'glitch'],
      particles: '⚡🔥💥✨'
    },
    minimal: {
      name: 'Clean & Modern',
      colors: ['#f8f9fa', '#e9ecef', '#dee2e6', '#495057'],
      background: 'gradient-clean',
      animations: ['fade', 'slide', 'bounce'], 
      particles: '●○◆◇'
    }
  };

  // Select template based on adventure or random
  const templateNames = Object.keys(templates);
  const selectedTemplate = templateNames[Math.floor(Math.random() * templateNames.length)];
  const template = templates[selectedTemplate];

  const vibeCard = {
    id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user: {
      name: 'SparkVibe Explorer',
      streak: Math.floor(Math.random() * 30) + 1,
      totalPoints: Math.floor(Math.random() * 1000) + 100
    },
    content: {
      adventure: {
        title: capsuleData?.adventure?.title || 'Amazing Adventure',
        choice: userChoices?.adventure || 'Made a bold choice',
        outcome: userChoices?.adventureOutcome || 'Discovered something incredible!'
      },
      moodBoost: capsuleData?.moodBoost || 'You\'re amazing and full of potential! ✨',
      achievement: {
        points: completionStats?.vibePointsEarned || 15,
        streak: Math.floor(Math.random() * 30) + 1,
        badge: completionStats?.vibePointsEarned >= 20 ? '🏆 High Achiever' : 
               Math.random() > 0.5 ? '🔥 Adventure Seeker' : '✨ Vibe Explorer'
      },
      brainBite: {
        correct: userChoices?.brainBiteCorrect !== false,
        message: userChoices?.brainBiteCorrect !== false ? '🧠 Brain bite mastered!' : '💡 Learning never stops!'
      }
    },
    design: {
      template: selectedTemplate,
      colors: template.colors,
      background: template.background,
      animations: template.animations,
      particles: template.particles,
      music: selectedTemplate === 'cosmic' ? 'synthwave' : 
             selectedTemplate === 'retro' ? '80s-synth' : 
             selectedTemplate === 'nature' ? 'ambient' : 'upbeat'
    },
    sharing: {
      hashtags: ['#SparkVibe', '#DailyVibes', '#AIAdventure', '#MindsetGrowth', '#VibeCheck'],
      captions: [
        `Just conquered ${capsuleData?.adventure?.title || 'an amazing adventure'} in SparkVibe! 🚀`,
        `${completionStats?.vibePointsEarned || 15} vibe points earned! Streak continues! 🔥`,
        'Daily dose of adventure and growth ✨ #SparkVibe #DailyVibes',
        'Leveling up my mindset one capsule at a time 🧠💫'
      ],
      platforms: ['tiktok', 'instagram', 'twitter', 'snapchat'],
      qrCode: 'https://sparkvibe.app/join?ref=vibecard'
    },
    metadata: {
      createdAt: new Date(),
      duration: 15, // 15-second video
      format: 'mp4',
      dimensions: { width: 1080, height: 1920 }, // 9:16 for mobile
      fps: 30
    }
  };

  console.log('✅ Vibe Card generated successfully');
  reply.send({
    success: true,
    card: vibeCard,
    message: 'Vibe Card generated successfully! Ready to share your adventure! 🎉'
  });
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
fastify.listen({ port: process.env.PORT || 8080, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`🚀 Server running at ${address}`);
  console.log('🎯 Available endpoints:');
  console.log('  GET  /');
  console.log('  GET  /api/health');
  console.log('  GET  /api/leaderboard');
  console.log('  POST /api/register');
  console.log('  POST /api/login');
  console.log('  POST /api/generate-capsule');
  console.log('  POST /api/update-points');
  console.log('  POST /api/generate-vibe-card');
  console.log('  POST /api/subscribe');
  console.log('  POST /api/send-notification');
});

// Serve built frontend files
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../frontend/.next/static'),
  prefix: '/_next/static/'
});

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../frontend/out'),
  prefix: '/'
});

// Handle Next.js pages
fastify.get('*', async (request, reply) => {
  // Skip API routes
  if (request.url.startsWith('/api/')) {
    return reply.code(404).send({ error: 'API route not found' });
  }
  
  return reply.sendFile('index.html');
});
