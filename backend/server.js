const fastify = require('fastify')({ logger: true });
const fastifyCors = require('@fastify/cors');
const fastifyHelmet = require('@fastify/helmet');
const fastifyJwt = require('@fastify/jwt');
const fastifyMultipart = require('@fastify/multipart');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { HfInference } = require('@huggingface/inference');
const { OpenAI } = require('openai');
const { v2: cloudinary } = require('cloudinary');
const Redis = require('redis');
const webpush = require('web-push');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

// Initialize external services
const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
let redisClient;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Web Push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// MongoDB Models
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: String,
  googleId: String,
  appleId: String,
  password: String,
  preferences: {
    notifications: { type: Boolean, default: true },
    templates: [String],
    interests: [String],
    timezone: String,
    aiPersonality: { type: String, default: 'encouraging' }
  },
  stats: {
    totalPoints: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    cardsGenerated: { type: Number, default: 0 },
    cardsShared: { type: Number, default: 0 },
    lastActivity: Date,
    bestStreak: { type: Number, default: 0 },
    adventuresCompleted: { type: Number, default: 0 }
  },
  achievements: [{ 
    id: String, 
    unlockedAt: Date, 
    type: String 
  }],
  pushSubscriptions: [Object],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AdventureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: { type: String, required: true },
  difficulty: String,
  estimatedTime: String,
  template: String,
  prompt: String,
  moodBoost: String,
  brainBite: String,
  habitNudge: String,
  aiGenerated: { type: Boolean, default: false },
  viralPotential: { type: Number, default: 0.5 },
  completions: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  ratings: [{ userId: mongoose.Schema.Types.ObjectId, rating: Number }],
  averageRating: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  seasonalTags: [String],
  trendingScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const VibeCardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adventureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Adventure' },
  cardData: Object,
  moodData: Object,
  imageUrl: String,
  videoUrl: String,
  audioUrl: String, // For ElevenLabs voiceovers
  shares: [{ 
    platform: String, 
    timestamp: Date,
    clicks: { type: Number, default: 0 }
  }],
  viralScore: { type: Number, default: 0.5 },
  engagement: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 }
  },
  isPublic: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const MoodAnalysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  textInput: String,
  analysisResult: Object,
  aiProvider: { type: String, default: 'openai' }, // openai, grok, huggingface
  timestamp: { type: Date, default: Date.now },
  context: {
    timeOfDay: String,
    weather: String,
    location: String,
    previousMoods: [Object]
  },
  accuracy: Number // User feedback on mood analysis accuracy
});

const User = mongoose.model('User', UserSchema);
const Adventure = mongoose.model('Adventure', AdventureSchema);
const VibeCard = mongoose.model('VibeCard', VibeCardSchema);
const MoodAnalysis = mongoose.model('MoodAnalysis', MoodAnalysisSchema);

const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB Atlas');

    // Connect to Redis (Upstash)
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL
    });
    await redisClient.connect();
    console.log('Connected to Redis (Upstash)');

    // Register plugins
    await fastify.register(fastifyCors, {
      origin: [
        'https://sparkvibe.app',
        'https://www.sparkvibe.app',
        'https://walrus-app-cczj4.ondigitalocean.app',
        'http://localhost:5173'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400,
    });

    await fastify.register(fastifyHelmet, {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    });

    await fastify.register(fastifyJwt, {
      secret: process.env.JWT_SECRET
    });

    await fastify.register(fastifyMultipart);

    // Authentication decorator
    fastify.decorate('authenticate', async function (request, reply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({ error: 'Authentication required' });
      }
    });

    // Root endpoint
    fastify.get('/', async (request, reply) => {
      const serviceStatus = await checkServiceHealth();
      return reply.send({
        message: 'SparkVibe API Server - Production v2.1.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        services: serviceStatus
      });
    });

    // Enhanced health check
    fastify.get('/health', async (request, reply) => {
      const health = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: await checkServiceHealth()
      };
      return reply.send(health);
    });

    // Google OAuth Authentication
    fastify.post('/auth/google', async (request, reply) => {
      const { token } = request.body;
      
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const googleId = payload.sub;
        
        let user = await User.findOne({ googleId });
        
        if (!user) {
          // Check if user exists with same email
          user = await User.findOne({ email: payload.email });
          if (user) {
            // Link Google account
            user.googleId = googleId;
            user.avatar = payload.picture;
            await user.save();
          } else {
            // Create new user
            user = new User({
              email: payload.email,
              name: payload.name,
              avatar: payload.picture,
              googleId: googleId,
              preferences: {
                interests: ['wellness', 'creativity'],
                aiPersonality: 'encouraging'
              }
            });
            await user.save();
          }
        }
        
        // Update last activity
        user.stats.lastActivity = new Date();
        await user.save();
        
        const jwtToken = fastify.jwt.sign({ userId: user._id.toString() });
        
        return reply.send({
          success: true,
          token: jwtToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            stats: user.stats,
            achievements: user.achievements,
            preferences: user.preferences
          }
        });
      } catch (error) {
        console.error('Google auth error:', error);
        return reply.status(401).send({ error: 'Invalid Google token' });
      }
    });

    // Enhanced mood analysis with multiple AI providers
    fastify.post('/analyze-mood', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      const { textInput, timeOfDay, weather, location, previousMoods } = request.body;
      const userId = request.user.userId;
      
      try {
        let analysis;
        let aiProvider = 'openai';
        
        // Try OpenAI first
        try {
          analysis = await analyzeWithOpenAI(textInput, timeOfDay, weather, location);
        } catch (openaiError) {
          console.warn('OpenAI failed, trying Grok:', openaiError.message);
          try {
            analysis = await analyzeWithGrok(textInput, timeOfDay);
            aiProvider = 'grok';
          } catch (grokError) {
            console.warn('Grok failed, trying Hugging Face:', grokError.message);
            analysis = await analyzeWithHuggingFace(textInput);
            aiProvider = 'huggingface';
          }
        }
        
        // Enhance with context from previous moods
        if (previousMoods && previousMoods.length > 0) {
          analysis = enhanceWithContext(analysis, previousMoods);
        }
        
        // Cache analysis
        const cacheKey = `mood:${userId}:${Date.now()}`;
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(analysis));
        
        // Save to MongoDB
        const moodAnalysis = new MoodAnalysis({
          userId,
          textInput,
          analysisResult: analysis,
          aiProvider,
          context: { timeOfDay, weather, location, previousMoods }
        });
        await moodAnalysis.save();
        
        // Update user activity
        await User.findByIdAndUpdate(userId, {
          'stats.lastActivity': new Date()
        });
        
        return reply.send(analysis);
      } catch (error) {
        console.error('Mood analysis failed:', error);
        const fallbackAnalysis = generateFallbackMoodAnalysis(textInput);
        return reply.send(fallbackAnalysis);
      }
    });

    // AI-enhanced capsule generation with seasonal trends
    fastify.post('/generate-capsule-simple', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      const { mood, interests, moodAnalysis, location, timeOfDay } = request.body;
      const userId = request.user.userId;

      try {
        const user = await User.findById(userId);
        const cacheKey = `capsule:${mood}:${timeOfDay}:${interests?.join(',')}`;
        
        // Check cache first
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const capsuleData = JSON.parse(cached);
          capsuleData.fromCache = true;
          return reply.send(capsuleData);
        }

        // Get seasonal context
        const seasonalContext = getSeasonalContext();
        
        // Generate using OpenAI with enhanced prompting
        let capsuleData;
        try {
          capsuleData = await generateWithOpenAI(mood, interests, moodAnalysis, location, timeOfDay, user.preferences, seasonalContext);
        } catch (error) {
          console.warn('OpenAI capsule generation failed, using fallback');
          capsuleData = generateFallbackCapsule(mood, timeOfDay, interests);
        }
        
        // Enhance with personalization
        capsuleData = personalizeForUser(capsuleData, user);
        
        // Cache for 30 minutes
        await redisClient.setEx(cacheKey, 1800, JSON.stringify(capsuleData));
        
        // Update user stats
        await User.findByIdAndUpdate(userId, {
          $inc: { 'stats.adventuresCompleted': 1 },
          'stats.lastActivity': new Date()
        });
        
        return reply.send(capsuleData);
      } catch (error) {
        console.error('Capsule generation failed:', error);
        const fallbackCapsule = generateFallbackCapsule(mood, timeOfDay, interests);
        return reply.send(fallbackCapsule);
      }
    });

    // Enhanced vibe card generation with Cloudinary and ElevenLabs
    fastify.post('/generate-vibe-card', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      const { capsuleData, userChoices, completionStats, moodData } = request.body;
      const userId = request.user.userId;

      try {
        const user = await User.findById(userId);
        
        const cardData = await generateEnhancedVibeCard(
          capsuleData, 
          userChoices, 
          completionStats, 
          user, 
          moodData
        );

        // Generate and upload image to Cloudinary
        const imageBuffer = await generateCardImageWithCanvas(cardData);
        const imageResult = await cloudinary.uploader.upload(
          `data:image/png;base64,${imageBuffer.toString('base64')}`,
          {
            folder: 'sparkvibe-cards',
            public_id: `card_${userId}_${Date.now()}`,
            quality: 90,
            format: 'jpg',
            transformation: [
              { width: 540, height: 960, crop: 'fill' },
              { quality: 'auto:good' }
            ]
          }
        );

        // Generate voiceover with ElevenLabs
        let audioUrl = null;
        try {
          const voiceoverText = `${cardData.content.adventure.title}. ${cardData.content.adventure.outcome}. You earned ${cardData.content.achievement.points} points!`;
          audioUrl = await generateVoiceover(voiceoverText);
        } catch (voiceError) {
          console.warn('Voiceover generation failed:', voiceError.message);
        }

        cardData.imageUrl = imageResult.secure_url;
        cardData.audioUrl = audioUrl;

        // Save to database
        const vibeCard = new VibeCard({
          userId,
          cardData,
          moodData,
          imageUrl: imageResult.secure_url,
          audioUrl,
          viralScore: cardData.viralScore
        });
        await vibeCard.save();

        // Update user stats and check for achievements
        const updatedUser = await User.findByIdAndUpdate(userId, {
          $inc: {
            'stats.cardsGenerated': 1,
            'stats.totalPoints': cardData.content.achievement.points
          },
          'stats.lastActivity': new Date()
        }, { new: true });

        // Check for new achievements
        const newAchievements = checkForAchievements(updatedUser);
        if (newAchievements.length > 0) {
          cardData.newAchievements = newAchievements;
        }

        return reply.send({
          success: true,
          card: cardData,
          cardId: vibeCard._id,
          processingTime: '2.3s',
          message: 'Enhanced Vibe card generated successfully!'
        });
      } catch (error) {
        console.error('Vibe card generation failed:', error);
        return reply.status(500).send({ error: 'Card generation failed' });
      }
    });

    // Enhanced share tracking with viral analytics
    fastify.post('/track-share', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      const { cardId, platform, shareType, clicks = 0 } = request.body;
      const userId = request.user.userId;

      try {
        const vibeCard = await VibeCard.findById(cardId);
        if (vibeCard) {
          vibeCard.shares.push({ 
            platform, 
            timestamp: new Date(),
            clicks: clicks 
          });
          
          // Update viral score based on engagement
          const newViralScore = calculateEnhancedViralScore(vibeCard.shares, platform);
          vibeCard.viralScore = newViralScore;
          await vibeCard.save();
        }

        // Update user stats with streak calculation
        const user = await User.findById(userId);
        const today = new Date().toDateString();
        const lastActivity = user.stats.lastActivity ? user.stats.lastActivity.toDateString() : null;
        
        let streakBonus = 0;
        if (lastActivity !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (lastActivity === yesterday.toDateString()) {
            user.stats.streak += 1;
            streakBonus = Math.min(user.stats.streak * 2, 20); // Max 20 bonus points
          } else {
            user.stats.streak = 1;
          }
          
          if (user.stats.streak > user.stats.bestStreak) {
            user.stats.bestStreak = user.stats.streak;
          }
        }

        const totalBonus = 5 + streakBonus;
        user.stats.cardsShared += 1;
        user.stats.totalPoints += totalBonus;
        user.stats.lastActivity = new Date();
        await user.save();

        // Send push notification for streak milestones
        if (user.stats.streak % 5 === 0 && user.stats.streak > 0 && user.preferences.notifications) {
          await sendPushNotification(user, {
            title: `🔥 ${user.stats.streak}-Day Streak!`,
            body: `Amazing consistency! You're on fire!`,
            icon: '/icon-192x192.png'
          });
        }

        return reply.send({
          success: true,
          bonusPoints: totalBonus,
          streakBonus,
          currentStreak: user.stats.streak,
          message: `+${totalBonus} points! Thanks for sharing your vibe!`,
          totalShares: vibeCard?.shares.length || 0,
          viralScore: vibeCard?.viralScore || 0.5
        });
      } catch (error) {
        console.error('Share tracking failed:', error);
        return reply.status(500).send({ error: 'Share tracking failed' });
      }
    });

    // Enhanced leaderboard with multiple categories
    fastify.get('/leaderboard', async (request, reply) => {
      const { category = 'points', timeframe = 'all' } = request.query;
      
      try {
        let sortField = 'stats.totalPoints';
        if (category === 'streak') sortField = 'stats.streak';
        if (category === 'cards') sortField = 'stats.cardsGenerated';
        if (category === 'shares') sortField = 'stats.cardsShared';
        
        let dateFilter = {};
        if (timeframe === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateFilter = { 'stats.lastActivity': { $gte: weekAgo } };
        } else if (timeframe === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dateFilter = { 'stats.lastActivity': { $gte: monthAgo } };
        }
        
        const leaders = await User.find(dateFilter)
          .sort({ [sortField]: -1 })
          .limit(50)
          .select('name avatar stats achievements');

        const leaderboard = leaders.map((user, index) => ({
          username: user.name,
          avatar: user.avatar,
          score: user.stats.totalPoints,
          rank: index + 1,
          streak: user.stats.streak,
          cardsShared: user.stats.cardsShared,
          cardsGenerated: user.stats.cardsGenerated,
          level: user.stats.level,
          achievements: user.achievements.slice(0, 3) // Top 3 achievements
        }));

        return reply.send(leaderboard);
      } catch (error) {
        console.error('Leaderboard fetch failed:', error);
        return reply.status(500).send({ error: 'Leaderboard fetch failed' });
      }
    });

    // Enhanced trending adventures with ML-based recommendations
    fastify.get('/trending-adventures', async (request, reply) => {
      const { category, mood } = request.query;
      
      try {
        let filter = { isActive: true };
        if (category && category !== 'all') {
          filter.category = category;
        }
        
        // Calculate trending score (combination of recent completions, shares, and ratings)
        const now = new Date();
        const trending = await Adventure.aggregate([
          { $match: filter },
          {
            $addFields: {
              recentScore: {
                $multiply: [
                  { $divide: ['$completions', { $add: [{ $divide: [{ $subtract: [now, '$createdAt'] }, 86400000] }, 1] }] },
                  { $add: ['$shares', 1] },
                  { $add: ['$averageRating', 1] }
                ]
              }
            }
          },
          { $sort: { recentScore: -1 } },
          { $limit: 10 }
        ]);

        // Get viral adventure
        const viralAdventure = await Adventure.findOne({ isActive: true })
          .sort({ viralPotential: -1, shares: -1 })
          .limit(1);

        // Personalize based on mood if provided
        let personalizedAdventures = trending;
        if (mood) {
          personalizedAdventures = await personalizeAdventuresForMood(trending, mood);
        }

        return reply.send({
          success: true,
          trending: personalizedAdventures.map(formatAdventureResponse),
          viralAdventure: viralAdventure ? formatAdventureResponse(viralAdventure) : null,
          metadata: {
            totalAdventures: await Adventure.countDocuments({ isActive: true }),
            category,
            mood,
            generatedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Trending fetch failed:', error);
        return reply.status(500).send({ error: 'Trending fetch failed' });
      }
    });

    // Push notification subscription
    fastify.post('/subscribe-push', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      const { subscription } = request.body;
      const userId = request.user.userId;

      try {
        await User.findByIdAndUpdate(userId, {
          $addToSet: { pushSubscriptions: subscription }
        });

        // Send welcome notification
        await sendPushNotification({ pushSubscriptions: [subscription] }, {
          title: 'SparkVibe Notifications Enabled!',
          body: 'You\'ll now get updates about your streaks and achievements',
          icon: '/icon-192x192.png'
        });

        return reply.send({ success: true });
      } catch (error) {
        console.error('Push subscription failed:', error);
        return reply.status(500).send({ error: 'Subscription failed' });
      }
    });

    // Start server
    await fastify.listen({ 
      port: process.env.PORT || 8080, 
      host: '0.0.0.0' 
    });
    console.log(`SparkVibe Production API Server running on port ${process.env.PORT || 8080}`);

  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
};

// Enhanced helper functions

async function checkServiceHealth() {
  const services = {};
  
  try {
    await mongoose.connection.db.admin().ping();
    services.mongodb = 'healthy';
  } catch (err) {
    services.mongodb = 'unhealthy';
  }
  
  try {
    await redisClient.ping();
    services.redis = 'healthy';
  } catch (err) {
    services.redis = 'unhealthy';
  }
  
  services.openai = process.env.OPENAI_API_KEY ? 'configured' : 'missing';
  services.cloudinary = process.env.CLOUDINARY_API_KEY ? 'configured' : 'missing';
  services.elevenlabs = process.env.ELEVENLABS_API_KEY ? 'configured' : 'missing';
  services.webpush = process.env.VAPID_PUBLIC_KEY ? 'configured' : 'missing';
  
  return services;
}

async function analyzeWithOpenAI(textInput, timeOfDay, weather, location) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are an expert mood analyst. Analyze the user's text and respond with a JSON object containing: mood (string), confidence (0-1), emotions (array), recommendations (array), suggestedTemplate (string), energyLevel (string), socialMood (string). Be empathetic and encouraging."
      },
      {
        role: "user",
        content: `Analyze this mood: "${textInput}". Context: ${timeOfDay}, weather: ${weather || 'unknown'}, location: ${location || 'unknown'}`
      }
    ],
    max_tokens: 300,
    temperature: 0.7
  });

  return JSON.parse(completion.choices[0].message.content);
}

async function analyzeWithGrok(textInput, timeOfDay) {
  const response = await axios.post('https://api.x.ai/v1/chat/completions', {
    model: "grok-beta",
    messages: [
      {
        role: "system",
        content: "You are a mood analysis AI. Return JSON with mood, confidence, emotions, recommendations, suggestedTemplate, energyLevel, socialMood."
      },
      {
        role: "user", 
        content: `Analyze mood: "${textInput}" at ${timeOfDay}`
      }
    ],
    max_tokens: 200
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  return JSON.parse(response.data.choices[0].message.content);
}

async function analyzeWithHuggingFace(textInput) {
  const result = await hf.textClassification({
    model: 'j-hartmann/emotion-english-distilroberta-base',
    inputs: textInput
  });

  // Convert HF emotion classification to our format
  const topEmotion = result[0];
  return {
    mood: mapEmotionToMood(topEmotion.label),
    confidence: topEmotion.score,
    emotions: result.slice(0, 3).map(r => r.label.toLowerCase()),
    recommendations: getRecommendationsForMood(topEmotion.label),
    suggestedTemplate: getTemplateForMood(topEmotion.label),
    energyLevel: getEnergyForEmotion(topEmotion.label),
    socialMood: getSocialMoodForEmotion(topEmotion.label)
  };
}

async function generateWithOpenAI(mood, interests, moodAnalysis, location, timeOfDay, userPrefs, seasonalContext) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system", 
        content: `Generate a personalized adventure capsule. Current season: ${seasonalContext.season}. User personality: ${userPrefs.aiPersonality}. Respond with JSON containing: capsule (string), adventure (object with title, prompt, difficulty, estimatedTime, category), moodBoost (string), brainBite (string), habitNudge (string), viralPotential (number 0-1).`
      },
      {
        role: "user",
        content: `Create an adventure for someone feeling ${mood} at ${timeOfDay}. Interests: ${interests?.join(', ')}. Location: ${location}. Make it ${seasonalContext.theme} themed.`
      }
    ],
    max_tokens: 600,
    temperature: 0.8
  });

  return JSON.parse(completion.choices[0].message.content);
}

async function generateVoiceover(text) {
  const response = await axios.post('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
    text: text,
    model_id: "eleven_monolingual_v1",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5
    }
  }, {
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    },
    responseType: 'arraybuffer'
  });

  // Upload to Cloudinary
  const audioBuffer = Buffer.from(response.data);
  const cloudinaryResult = await cloudinary.uploader.upload(
    `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`,
    {
      resource_type: 'video',
      folder: 'sparkvibe-audio'
    }
  );

  return cloudinaryResult.secure_url;
}

// Replace the generateCardImageWithCanvas function in your server.js with this:

async function generateCardImageWithCanvas(cardData) {
  // Generate SVG instead of using Canvas for DigitalOcean compatibility
  const colors = {
    cosmic: ['#667eea', '#764ba2'],
    nature: ['#43cea2', '#185a9d'],
    retro: ['#FA8BFF', '#2BD2FF'],
    minimal: ['#667eea', '#764ba2']
  };

  const template = cardData.design?.template || 'cosmic';
  const [color1, color2] = colors[template] || colors.cosmic;
  
  const svg = `
    <svg width="540" height="960" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="540" height="960" fill="url(#grad)" rx="20"/>
      
      <!-- Decorative elements -->
      <circle cx="100" cy="150" r="30" fill="white" opacity="0.1"/>
      <circle cx="440" cy="200" r="25" fill="white" opacity="0.15"/>
      <circle cx="80" cy="800" r="35" fill="white" opacity="0.08"/>
      
      <!-- Header -->
      <text x="270" y="120" text-anchor="middle" fill="white" font-size="24" font-weight="bold" font-family="Arial, sans-serif">SparkVibe Daily</text>
      
      <!-- Main content area -->
      <rect x="40" y="180" width="460" height="320" fill="white" opacity="0.1" rx="15"/>
      
      <!-- Adventure title -->
      <text x="270" y="230" text-anchor="middle" fill="white" font-size="28" font-weight="bold" font-family="Arial, sans-serif" filter="url(#glow)">
        ${cardData.content?.adventure?.title?.substring(0, 30) || 'Your Daily Adventure'}
      </text>
      
      <!-- Outcome text -->
      <foreignObject x="60" y="260" width="420" height="200">
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          color: white; 
          text-align: center; 
          font-size: 18px; 
          line-height: 1.6; 
          font-family: Arial, sans-serif; 
          padding: 20px;
        ">
          ${cardData.content?.adventure?.outcome || 'You completed an amazing adventure today!'}
        </div>
      </foreignObject>
      
      <!-- Stats section -->
      <rect x="40" y="540" width="460" height="180" fill="white" opacity="0.15" rx="15"/>
      
      <!-- Points -->
      <text x="140" y="580" text-anchor="middle" fill="white" font-size="16" font-weight="bold" font-family="Arial, sans-serif">POINTS EARNED</text>
      <text x="140" y="610" text-anchor="middle" fill="white" font-size="36" font-weight="bold" font-family="Arial, sans-serif">+${cardData.content?.achievement?.points || 25}</text>
      
      <!-- Streak -->
      <text x="270" y="580" text-anchor="middle" fill="white" font-size="16" font-weight="bold" font-family="Arial, sans-serif">STREAK</text>
      <text x="270" y="610" text-anchor="middle" fill="white" font-size="36" font-weight="bold" font-family="Arial, sans-serif">${cardData.content?.achievement?.streak || 1}</text>
      
      <!-- Badge -->
      <text x="400" y="580" text-anchor="middle" fill="white" font-size="16" font-weight="bold" font-family="Arial, sans-serif">BADGE</text>
      <text x="400" y="610" text-anchor="middle" fill="white" font-size="20" font-weight="bold" font-family="Arial, sans-serif">${cardData.content?.achievement?.badge || 'Champion'}</text>
      
      <!-- User info -->
      <text x="270" y="670" text-anchor="middle" fill="white" font-size="18" font-weight="bold" font-family="Arial, sans-serif">${cardData.user?.name || 'Explorer'}</text>
      <text x="270" y="695" text-anchor="middle" fill="white" font-size="14" font-family="Arial, sans-serif" opacity="0.8">Total Points: ${cardData.user?.totalPoints || 0} • Level ${cardData.user?.level || 1}</text>
      
      <!-- Footer -->
      <text x="270" y="900" text-anchor="middle" fill="white" font-size="16" font-family="Arial, sans-serif" opacity="0.9">Create your daily vibe at SparkVibe.app</text>
      
      <!-- QR code placeholder -->
      <rect x="220" y="920" width="100" height="20" fill="white" opacity="0.3" rx="10"/>
      <text x="270" y="935" text-anchor="middle" fill="white" font-size="12" font-family="Arial, sans-serif">Scan to join</text>
    </svg>
  `;

  // Convert SVG to Buffer
  const svgBuffer = Buffer.from(svg);
  return svgBuffer;
}

function checkForAchievements(user) {
  const achievements = [];
  
  if (user.stats.streak === 7 && !user.achievements.find(a => a.id === 'week_streak')) {
    achievements.push({ id: 'week_streak', type: 'streak', unlockedAt: new Date() });
  }
  
  if (user.stats.cardsGenerated === 10 && !user.achievements.find(a => a.id === 'card_creator')) {
    achievements.push({ id: 'card_creator', type: 'creation', unlockedAt: new Date() });
  }
  
  if (user.stats.totalPoints >= 1000 && !user.achievements.find(a => a.id === 'point_master')) {
    achievements.push({ id: 'point_master', type: 'points', unlockedAt: new Date() });
  }
  
  // Add achievements to user
  if (achievements.length > 0) {
    User.findByIdAndUpdate(user._id, {
      $push: { achievements: { $each: achievements } }
    }).exec();
  }
  
  return achievements;
}

async function sendPushNotification(user, payload) {
  if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) return;
  
  const notificationPayload = JSON.stringify(payload);
  
  for (const subscription of user.pushSubscriptions) {
    try {
      await webpush.sendNotification(subscription, notificationPayload);
    } catch (error) {
      console.error('Push notification failed:', error);
      // Remove invalid subscription
      await User.findByIdAndUpdate(user._id, {
        $pull: { pushSubscriptions: subscription }
      });
    }
  }
}

function getSeasonalContext() {
  const now = new Date();
  const month = now.getMonth() + 1;
  
  if (month >= 12 || month <= 2) return { season: 'winter', theme: 'cozy and reflective' };
  if (month >= 3 && month <= 5) return { season: 'spring', theme: 'fresh and energizing' };
  if (month >= 6 && month <= 8) return { season: 'summer', theme: 'vibrant and adventurous' };
  return { season: 'autumn', theme: 'grounding and introspective' };
}

function personalizeForUser(capsuleData, user) {
  if (user.preferences.aiPersonality === 'challenging') {
    capsuleData.adventure.difficulty = 'hard';
    capsuleData.habitNudge = 'Push yourself further - ' + capsuleData.habitNudge;
  } else if (user.preferences.aiPersonality === 'gentle') {
    capsuleData.moodBoost = 'Take it easy - ' + capsuleData.moodBoost;
  }
  
  return capsuleData;
}

function calculateEnhancedViralScore(shares, platform) {
  const platformWeights = { tiktok: 1.5, instagram: 1.2, twitter: 1.0, snapchat: 0.8 };
  const weight = platformWeights[platform] || 1.0;
  const totalShares = shares.length;
  const recentShares = shares.filter(s => Date.now() - s.timestamp < 24 * 60 * 60 * 1000).length;
  
  return Math.min(0.95, (totalShares * 0.1 + recentShares * 0.2) * weight);
}

function formatAdventureResponse(adventure) {
  return {
    title: adventure.title,
    description: adventure.description,
    completions: adventure.completions,
    shares: adventure.shares,
    viralScore: adventure.viralPotential,
    category: adventure.category,
    template: adventure.template,
    averageRating: adventure.averageRating,
    difficulty: adventure.difficulty,
    estimatedTime: adventure.estimatedTime
  };
}

// Additional helper functions
function mapEmotionToMood(emotion) {
  const mapping = {
    'joy': 'happy',
    'sadness': 'sad',
    'anger': 'frustrated',
    'fear': 'anxious',
    'surprise': 'curious',
    'disgust': 'frustrated'
  };
  return mapping[emotion.toLowerCase()] || 'neutral';
}

function getRecommendationsForMood(mood) {
  const recommendations = {
    happy: ["Share your joy with others", "Try a creative challenge", "Plan something fun"],
    sad: ["Practice gentle self-care", "Connect with a friend", "Take a mindful walk"],
    energetic: ["Channel energy into movement", "Start a new project", "Help someone else"],
    calm: ["Enjoy the peaceful moment", "Practice gratitude", "Meditate or reflect"],
    anxious: ["Try breathing exercises", "Ground yourself in the present", "Reach out for support"]
  };
  return recommendations[mood] || recommendations.happy;
}

function getTemplateForMood(mood) {
  const templates = {
    happy: 'cosmic',
    sad: 'nature', 
    energetic: 'retro',
    calm: 'minimal',
    anxious: 'nature'
  };
  return templates[mood] || 'cosmic';
}

function getEnergyForEmotion(emotion) {
  if (['joy', 'surprise'].includes(emotion)) return 'high';
  if (['sadness', 'fear'].includes(emotion)) return 'low';
  return 'medium';
}

function getSocialMoodForEmotion(emotion) {
  if (['joy'].includes(emotion)) return 'social';
  if (['sadness', 'fear'].includes(emotion)) return 'introspective';
  return 'balanced';
}

function generateFallbackMoodAnalysis(textInput) {
  return {
    mood: 'curious',
    confidence: 0.6,
    emotions: ['curious', 'hopeful'],
    recommendations: ['Try something new today', 'Embrace your curiosity'],
    suggestedTemplate: 'cosmic',
    energyLevel: 'medium',
    socialMood: 'balanced'
  };
}

function generateFallbackCapsule(mood, timeOfDay, interests) {
  return {
    success: true,
    capsule: "Your creative energy is sparking new possibilities!",
    adventure: {
      title: `${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)} Adventure`,
      prompt: "Take a moment to appreciate something beautiful around you",
      difficulty: "easy",
      estimatedTime: "5 minutes",
      category: interests?.[0] || "mindfulness"
    },
    moodBoost: "Mindful moments create lasting peace",
    brainBite: "Gratitude practices rewire your brain for positivity",
    habitNudge: "Try daily gratitude to build resilience",
    viralPotential: 0.7,
    metadata: { fallback: true, generated_at: new Date().toISOString() }
  };
}

async function generateEnhancedVibeCard(capsuleData, userChoices, completionStats, user, moodData) {
  const templates = ['cosmic', 'nature', 'retro', 'minimal'];
  const selectedTemplate = moodData?.suggestedTemplate || templates[Math.floor(Math.random() * templates.length)];
  
  const totalPoints = (completionStats?.vibePointsEarned || 25) + (Object.keys(userChoices || {}).length * 5);
  
  return {
    content: {
      adventure: {
        title: capsuleData?.adventure?.title || "Your Daily Vibe Adventure",
        outcome: generatePersonalizedOutcome(moodData, capsuleData)
      },
      achievement: {
        points: totalPoints,
        streak: user?.stats?.streak || 1,
        badge: selectBadge(capsuleData?.adventure?.category, totalPoints)
      }
    },
    design: {
      template: selectedTemplate,
      animations: ['slideIn', 'pulse', 'sparkle']
    },
    user: {
      name: user?.name || 'Explorer',
      totalPoints: (user?.stats?.totalPoints || 0) + totalPoints,
      level: user?.stats?.level || 1
    },
    sharing: {
      captions: generateViralCaptions(capsuleData, totalPoints, moodData),
      hashtags: ['#SparkVibe', '#DailyVibes', '#MoodBoost', '#MindfulMoments'],
      qrCode: 'https://sparkvibe.app'
    },
    viralScore: calculateViralScore(capsuleData, selectedTemplate, totalPoints),
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '2.1',
      aiEnhanced: true
    }
  };
}

function generatePersonalizedOutcome(moodData, capsuleData) {
  if (moodData?.mood === 'happy') {
    return "Your positive energy created ripples of joy!";
  }
  return "You embraced growth and discovered new possibilities!";
}

function selectBadge(category, points) {
  if (points > 50) return "Achievement Master";
  if (category === 'creativity') return "Creative Explorer";
  return "Vibe Champion";
}

function generateViralCaptions(capsuleData, points, moodData) {
  return [
    `Just earned ${points} points on my SparkVibe journey!`,
    `Daily vibe check complete - feeling amazing!`,
    `Another adventure conquered! Level up your mindset`
  ];
}

function calculateViralScore(capsuleData, template, points) {
  let score = 0.5;
  if (points > 50) score += 0.2;
  if (template === 'retro' || template === 'cosmic') score += 0.1;
  return Math.min(0.95, score);
}

startServer();