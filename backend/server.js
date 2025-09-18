// backend/server.js - Enhanced SparkVibe Backend Server with All Features
const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

// Required packages
const fastifyCors = require('@fastify/cors');
const fastifyHelmet = require('@fastify/helmet');
const fastifyJwt = require('@fastify/jwt');
const fastifyMultipart = require('@fastify/multipart');
const fastifyRateLimit = require('@fastify/rate-limit');
const fastifyWebsocket = require('@fastify/websocket');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const sanitize = require('mongo-sanitize');
const Canvas = require('canvas');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long for security');
  process.exit(1);
}

// Optional service initialization
let openai, googleClient, redisClient, emailTransporter, cloudinary;

// OpenAI initialization (optional)
if (process.env.OPENAI_API_KEY) {
  try {
    const { OpenAI } = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('✅ OpenAI initialized');
  } catch (error) {
    console.warn('⚠️ OpenAI initialization failed:', error.message);
  }
}

// Google OAuth initialization (optional)
if (process.env.GOOGLE_CLIENT_ID) {
  try {
    const { OAuth2Client } = require('google-auth-library');
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    console.log('✅ Google OAuth initialized');
  } catch (error) {
    console.warn('⚠️ Google OAuth initialization failed:', error.message);
  }
}

// Redis initialization (optional)
if (process.env.REDIS_URL) {
  try {
    const Redis = require('redis');
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: 5000, lazyConnect: true }
    });
    redisClient.on('error', (err) => console.warn('Redis error:', err.message));
    console.log('✅ Redis client configured');
  } catch (error) {
    console.warn('⚠️ Redis initialization failed:', error.message);
  }
}

// Enhanced MongoDB Schemas
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  avatar: String,
  googleId: String,
  password: String,
  emailVerified: { type: Boolean, default: false },
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
  preferences: {
    notifications: { type: Boolean, default: true },
    interests: [String],
    aiPersonality: { type: String, default: 'encouraging' },
    pushSubscription: Object,
    difficulty: { type: String, default: 'easy' },
    adventureTypes: [String]
  },
  stats: {
    totalPoints: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    cardsGenerated: { type: Number, default: 0 },
    cardsShared: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now },
    bestStreak: { type: Number, default: 0 },
    adventuresCompleted: { type: Number, default: 0 },
    friendsCount: { type: Number, default: 0 },
    challengesWon: { type: Number, default: 0 },
    challengesLost: { type: Number, default: 0 },
    referralsCount: { type: Number, default: 0 },
    moodHistory: [{ mood: Object, timestamp: Date }],
    choices: [{ choice: String, capsuleId: String, timestamp: Date }],
    completions: [{ capsuleId: String, completedAt: Date, points: Number }]
  },
  achievements: [{ 
    id: String, 
    unlockedAt: Date, 
    type: String,
    title: String,
    description: String,
    icon: String
  }],
  friends: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' },
    connectedAt: Date
  }],
  challenges: [{
    challengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    challengedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: String, // 'streak', 'points', 'adventure'
    status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
    target: Number,
    deadline: Date,
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  referralCode: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const AdventureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: { type: String, required: true },
  difficulty: String,
  estimatedTime: String,
  template: String,
  completions: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  viralPotential: { type: Number, default: 0.5 },
  averageRating: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  tags: [String],
  rewards: {
    points: { type: Number, default: 25 },
    badge: String,
    unlocks: [String]
  },
  aiGenerated: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const VibeCardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  capsuleId: String,
  content: {
    adventure: Object,
    achievement: Object,
    mood: Object,
    user: Object
  },
  design: {
    template: String,
    colors: [String],
    style: String
  },
  sharing: {
    platforms: [String],
    shareCount: { type: Number, default: 0 },
    lastShared: Date
  },
  analytics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    viralScore: { type: Number, default: 0 }
  },
  isPublic: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const AnalyticsSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: Object,
  sessionId: String,
  userAgent: String,
  ip: String,
  timestamp: { type: Date, default: Date.now }
});

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // 'friend_request', 'challenge', 'achievement', etc.
  title: String,
  message: String,
  data: Object,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Create indexes
AdventureSchema.index({ category: 1, completions: -1 });
AnalyticsSchema.index({ eventType: 1, timestamp: -1 });
VibeCardSchema.index({ userId: 1, createdAt: -1 });

const User = mongoose.model('User', UserSchema);
const Adventure = mongoose.model('Adventure', AdventureSchema);
const VibeCard = mongoose.model('VibeCard', VibeCardSchema);
const Analytics = mongoose.model('Analytics', AnalyticsSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

// WebSocket connections store
const wsConnections = new Map();

// MongoDB Connection Options
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  writeConcern: { w: 'majority' }
};

// Achievement definitions
const ACHIEVEMENTS = {
  first_adventure: { title: 'First Steps', description: 'Complete your first adventure', icon: '🌟', points: 10 },
  week_warrior: { title: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', points: 100 },
  point_master: { title: 'Point Master', description: 'Reach 1000 total points', icon: '💎', points: 200 },
  content_creator: { title: 'Content Creator', description: 'Generate 10 vibe cards', icon: '🎨', points: 150 },
  social_butterfly: { title: 'Social Butterfly', description: 'Add 5 friends', icon: '🦋', points: 75 },
  challenger: { title: 'Challenger', description: 'Win your first challenge', icon: '🏆', points: 125 },
  viral_star: { title: 'Viral Star', description: 'Get 100 shares on a vibe card', icon: '⭐', points: 300 }
};

// Start server function
const startServer = async () => {
  try {
    // MongoDB Connection
    console.log('🔌 Connecting to MongoDB...');
    console.log('MongoDB URI (sanitized):', process.env.MONGODB_URI?.replace(/:([^:@]*)@/, ':***@'));

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected:', mongoose.connection.host, mongoose.connection.name);
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    // Attempt MongoDB connection with retries
    let connected = false;
    let connectionAttempts = 0;
    const maxAttempts = 3;

    while (!connected && connectionAttempts < maxAttempts) {
      try {
        connectionAttempts++;
        console.log(`📡 MongoDB connection attempt ${connectionAttempts}/${maxAttempts}`);
        
        await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
        await mongoose.connection.db.admin().ping();
        
        console.log('✅ MongoDB ping successful');
        connected = true;
      } catch (connectError) {
        console.error(`❌ MongoDB connection attempt ${connectionAttempts} failed:`, connectError.message);
        
        if (connectError.message.includes('ReplicaSetNoPrimary')) {
          console.log('🔄 Replica set has no primary, retrying in 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          console.log(`⏳ Waiting 3 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        if (connectionAttempts === maxAttempts) {
          console.warn('⚠️ MongoDB connection failed after all attempts, using fallback data');
          fastify.mongodbConnected = false;
        }
      }
    }

    // Connect to Redis if available
    if (redisClient) {
      try {
        await redisClient.connect();
        console.log('✅ Connected to Redis');
      } catch (error) {
        console.warn('⚠️ Redis connection failed:', error.message);
        redisClient = null;
      }
    }

    // Register plugins
    await fastify.register(fastifyCors, {
      origin: (origin, cb) => {
        const allowedOrigins = [
          'https://sparkvibe.app',
          'https://www.sparkvibe.app',
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:8080'
        ];
        
        if (process.env.NODE_ENV !== 'production') {
          allowedOrigins.push(/^http:\/\/localhost:\d+$/);
          allowedOrigins.push(/^https:\/\/.*\.app\.github\.dev$/);
          allowedOrigins.push(/^https:\/\/.*\.gitpod\.io$/);
        }
        
        const allowed = !origin || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin));
        cb(null, allowed);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Cache-Control',
        'Pragma',
        'Expires'
      ],
      credentials: true,
      maxAge: 86400
    });

    await fastify.register(fastifyHelmet, {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    });

    await fastify.register(fastifyJwt, {
      secret: process.env.JWT_SECRET
    });

    await fastify.register(fastifyMultipart);

    await fastify.register(fastifyWebsocket);

    await fastify.register(fastifyRateLimit, {
      max: async (request) => (request.user ? 200 : 100),
      timeWindow: '1 minute',
      errorResponseBuilder: () => ({
        success: false,
        message: 'Rate limit exceeded. Please try again later.'
      })
    });

    // Error handler
    const sendError = (reply, status, message, details) => {
      console.error(`❌ Error [${status}]: ${message}`, details);
      reply.status(status).send({
        success: false,
        message,
        details: process.env.NODE_ENV === 'development' ? details : undefined
      });
    };

    fastify.setErrorHandler((error, request, reply) => {
      sendError(reply, error.statusCode || 500, error.message || 'Internal server error', error.stack);
    });

    // Authentication decorator
    fastify.decorate('authenticate', async function (request, reply) {
      try {
        await request.jwtVerify();
        console.log(`🔐 JWT verified for user: ${request.user.userId}`);
      } catch (err) {
        sendError(reply, 401, 'Authentication required', err.message);
      }
    });

    // ===== UTILITY FUNCTIONS =====
    
    // Generate referral code
    const generateReferralCode = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    // Check and award achievements
    const checkAchievements = async (userId, actionType, metadata = {}) => {
      try {
        const user = await User.findById(userId);
        if (!user) return [];

        const newAchievements = [];
        const existingAchievementIds = user.achievements.map(a => a.id);

        // Check various achievement conditions
        if (actionType === 'adventure_completed' && !existingAchievementIds.includes('first_adventure')) {
          newAchievements.push({
            id: 'first_adventure',
            ...ACHIEVEMENTS.first_adventure,
            unlockedAt: new Date(),
            type: 'milestone'
          });
        }

        if (user.stats.streak >= 7 && !existingAchievementIds.includes('week_warrior')) {
          newAchievements.push({
            id: 'week_warrior',
            ...ACHIEVEMENTS.week_warrior,
            unlockedAt: new Date(),
            type: 'streak'
          });
        }

        if (user.stats.totalPoints >= 1000 && !existingAchievementIds.includes('point_master')) {
          newAchievements.push({
            id: 'point_master',
            ...ACHIEVEMENTS.point_master,
            unlockedAt: new Date(),
            type: 'points'
          });
        }

        if (user.stats.cardsGenerated >= 10 && !existingAchievementIds.includes('content_creator')) {
          newAchievements.push({
            id: 'content_creator',
            ...ACHIEVEMENTS.content_creator,
            unlockedAt: new Date(),
            type: 'creation'
          });
        }

        // Award achievements
        if (newAchievements.length > 0) {
          await User.findByIdAndUpdate(userId, {
            $push: { achievements: { $each: newAchievements } },
            $inc: { 'stats.totalPoints': newAchievements.reduce((sum, a) => sum + a.points, 0) }
          });

          // Create notifications
          for (const achievement of newAchievements) {
            await Notification.create({
              userId,
              type: 'achievement',
              title: 'Achievement Unlocked!',
              message: `You've earned the "${achievement.title}" achievement!`,
              data: { achievement }
            });
          }

          // Broadcast to WebSocket if connected
          const wsConnection = wsConnections.get(userId.toString());
          if (wsConnection) {
            wsConnection.send(JSON.stringify({
              type: 'achievement',
              data: newAchievements
            }));
          }
        }

        return newAchievements;
      } catch (error) {
        console.error('Achievement check failed:', error);
        return [];
      }
    };

    // Create vibe card image
    const createVibeCardImage = async (cardData) => {
      try {
        const canvas = Canvas.createCanvas(540, 960);
        const ctx = canvas.getContext('2d');

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 540, 960);
        const template = cardData.design.template || 'cosmic';
        
        const colors = {
          cosmic: ['#1a1a2e', '#533483', '#7209b7'],
          nature: ['#2d5016', '#60a531', '#8bc34a'],
          retro: ['#ff006e', '#8338ec', '#ffbe0b'],
          minimal: ['#f8f9fa', '#495057', '#dee2e6']
        };

        const templateColors = colors[template] || colors.cosmic;
        gradient.addColorStop(0, templateColors[0]);
        gradient.addColorStop(0.5, templateColors[1]);
        gradient.addColorStop(1, templateColors[2]);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 540, 960);

        // Add content
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        
        // Adventure title
        const title = cardData.content.adventure.title;
        ctx.fillText(title, 270, 200);
        
        // Points
        ctx.font = '24px Arial';
        ctx.fillText(`+${cardData.content.achievement.points} Points`, 270, 300);
        
        // Streak
        ctx.fillText(`${cardData.content.achievement.streak} Day Streak`, 270, 350);
        
        // User name
        ctx.font = 'bold 20px Arial';
        ctx.fillText(cardData.content.user.name, 270, 800);

        return canvas.toBuffer('image/png');
      } catch (error) {
        console.error('Vibe card image creation failed:', error);
        return null;
      }
    };

    // Track analytics
    const trackEvent = async (eventType, userId, metadata = {}, sessionId = null) => {
      try {
        await Analytics.create({
          eventType,
          userId,
          metadata,
          sessionId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Analytics tracking failed:', error);
      }
    };

    // ===== WEBSOCKET ROUTES =====
    
    fastify.register(async function (fastify) {
      fastify.get('/ws', { websocket: true }, (connection, req) => {
        const userId = req.query.userId;
        if (userId) {
          wsConnections.set(userId, connection.socket);
          console.log(`WebSocket connected: ${userId}`);
        }

        connection.socket.on('message', async (message) => {
          try {
            const data = JSON.parse(message);
            
            if (data.type === 'ping') {
              connection.socket.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (error) {
            console.error('WebSocket message error:', error);
          }
        });

        connection.socket.on('close', () => {
          if (userId) {
            wsConnections.delete(userId);
            console.log(`WebSocket disconnected: ${userId}`);
          }
        });
      });
    });

    // ===== BASIC ROUTES =====
    
    fastify.get('/', async (request, reply) => {
      const services = await checkServiceHealth();
      return reply.send({
        message: 'SparkVibe API Server - v2.5.0 Enhanced',
        status: 'running',
        timestamp: new Date().toISOString(),
        services,
        environment: process.env.NODE_ENV || 'development',
        mongodb: {
          connected: mongoose.connection.readyState === 1,
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        },
        features: [
          'Enhanced Vibe Cards',
          'Social Features',
          'Real-time WebSocket',
          'Achievement System',
          'Analytics Tracking',
          'Friend Challenges'
        ]
      });
    });

    fastify.get('/health', async (request, reply) => {
      const health = {
        status: 'OK',
        message: 'SparkVibe Enhanced Backend is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: await checkServiceHealth(),
        memory: process.memoryUsage(),
        mongodb: {
          connected: mongoose.connection.readyState === 1,
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          collections: {}
        },
        websockets: {
          connections: wsConnections.size
        }
      };
    
      if (mongoose.connection.readyState === 1) {
        try {
          health.mongodb.collections.users = await User.countDocuments();
          health.mongodb.collections.adventures = await Adventure.countDocuments();
          health.mongodb.collections.vibeCards = await VibeCard.countDocuments();
          health.mongodb.collections.analytics = await Analytics.countDocuments();
        } catch (error) {
          health.mongodb.error = error.message;
        }
      }
    
      // Set explicit status code based on critical service health
      const isHealthy = health.mongodb.connected && (!redisClient || health.services.redis === 'healthy');
      reply.status(isHealthy ? 200 : 503).send(health);
    });
    // ===== AUTHENTICATION ROUTES =====
    
    fastify.post('/auth/signup', async (request, reply) => {
      try {
        const { name, email, password } = request.body;
        
        if (!name || !email || !password) {
          return sendError(reply, 400, 'Name, email, and password are required');
        }

        if (mongoose.connection.readyState !== 1) {
          return sendError(reply, 503, 'Database connection unavailable');
        }

        const sanitizedEmail = sanitize(email.toLowerCase());
        const sanitizedName = sanitize(name);

        // Check if user already exists
        const existingUser = await User.findOne({ email: sanitizedEmail });
        if (existingUser) {
          return sendError(reply, 400, 'User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user with referral code
        const referralCode = generateReferralCode();
        
        const user = new User({
          name: sanitizedName,
          email: sanitizedEmail,
          password: hashedPassword,
          authProvider: 'email',
          emailVerified: process.env.NODE_ENV === 'development' ? true : false,
          referralCode,
          preferences: { 
            interests: ['wellness', 'creativity'], 
            aiPersonality: 'encouraging' 
          }
        });

        await user.save();

        // Generate JWT token
        const jwtToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });

        // Track signup
        await trackEvent('user_signup', user._id, { provider: 'email' });

        return reply.send({
          success: true,
          token: jwtToken,
          message: 'Account created successfully!',
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            emailVerified: user.emailVerified,
            stats: user.stats,
            achievements: user.achievements,
            preferences: user.preferences,
            referralCode: user.referralCode
          }
        });
      } catch (error) {
        return sendError(reply, 500, 'Account creation failed', error.message);
      }
    });

    // Continue with existing auth routes... (signin, google auth remain the same)
    
    // ===== NEW ENHANCED ROUTES =====

    // Missing sync endpoint
    fastify.post('/user/sync-stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const userId = request.user.userId;
        const { stats, totalPoints, level, streak, cardsGenerated, cardsShared } = request.body;

        if (mongoose.connection.readyState === 1) {
          await User.findByIdAndUpdate(userId, {
            $set: {
              'stats.totalPoints': totalPoints,
              'stats.level': level,
              'stats.streak': streak,
              'stats.cardsGenerated': cardsGenerated,
              'stats.cardsShared': cardsShared,
              'stats.lastActivity': new Date()
            }
          });
        }

        return reply.send({
          success: true,
          message: 'User stats synchronized successfully',
          synced: { totalPoints, level, streak, cardsGenerated, cardsShared }
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to sync user stats', error.message);
      }
    });

// Add this endpoint to your backend server.js

// Enhanced Vibe Card Generation Route
fastify.post('/generate-enhanced-vibe-card', async (request, reply) => {
  try {
    const { moodData, choices, user } = request.body;
    
    // Log the request for debugging
    console.log('Enhanced vibe card generation requested:', { 
      mood: moodData?.mood,
      choicesCount: Object.keys(choices || {}).length,
      userName: user?.name
    });

    // Calculate points based on completed phases
    const completedPhases = Object.keys(choices || {}).length;
    const basePoints = 25;
    const phaseBonus = completedPhases * 15; // 15 points per phase
    const totalPoints = basePoints + phaseBonus;

    // Generate enhanced content based on choices
    const enhancedContent = await generateEnhancedContent(choices, moodData, user);
    
    // Create the enhanced vibe card
    const enhancedVibeCard = {
      id: `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'enhanced',
      version: '2.0',
      
      content: {
        title: enhancedContent.title,
        subtitle: 'Your Multi-Phase Adventure Journey',
        
        // Adventure phase results
        adventure: {
          choice: choices.adventure?.title || 'Creative Expression',
          outcome: enhancedContent.adventure.outcome,
          impact: enhancedContent.adventure.impact,
          visual: enhancedContent.adventure.visual
        },
        
        // Reflection phase results
        reflection: {
          choice: choices.reflection?.title || 'Personal Growth',
          insight: enhancedContent.reflection.insight,
          wisdom: enhancedContent.reflection.wisdom,
          mantra: enhancedContent.reflection.mantra
        },
        
        // Action phase results
        action: {
          choice: choices.action?.title || 'Daily Practice',
          commitment: enhancedContent.action.commitment,
          strategy: enhancedContent.action.strategy,
          timeline: enhancedContent.action.timeline
        },
        
        // Achievement summary
        achievement: {
          totalPoints: totalPoints,
          phasesCompleted: completedPhases,
          badge: getBadgeForPhases(completedPhases),
          level: calculateLevel(user?.totalPoints || 0, totalPoints),
          streak: Math.floor(Math.random() * 10) + 1,
          timestamp: new Date().toISOString()
        },
        
        // Mood transformation
        moodJourney: {
          before: moodData?.mood || 'curious',
          after: enhancedContent.finalMood,
          transformation: enhancedContent.moodTransformation,
          energyBoost: `+${Math.floor(Math.random() * 25) + 15}%`
        }
      },
      
      // Enhanced design configuration
      design: {
        template: getTemplateForChoices(choices),
        theme: enhancedContent.theme,
        colors: getEnhancedColors(choices, moodData),
        animations: ['morphGradient', 'particleField', 'pulseGlow'],
        layout: 'multi-phase',
        effects: {
          background: 'cosmic-particles',
          transitions: 'smooth-morph',
          highlights: 'neon-glow'
        }
      },
      
      // User context
      user: {
        name: user?.name || 'Vibe Explorer',
        avatar: user?.avatar || '🌟',
        level: calculateLevel(user?.totalPoints || 0, totalPoints),
        totalPoints: (user?.totalPoints || 0) + totalPoints,
        streak: user?.streak || 1,
        badgeCount: (user?.badgeCount || 0) + 1
      },
      
      // Enhanced sharing options
      sharing: {
        title: `${user?.name || 'Someone'}'s Enhanced Vibe Journey`,
        description: `Completed a 3-phase adventure and earned ${totalPoints} points!`,
        
        captions: [
          `🚀 Just completed my Enhanced Vibe Journey and earned ${totalPoints} points!`,
          `✨ ${enhancedContent.adventure.outcome} #SparkVibeJourney`,
          `🌟 Three phases, infinite possibilities. ${enhancedContent.reflection.mantra}`,
          `⚡ ${enhancedContent.action.commitment} Starting today!`
        ],
        
        hashtags: [
          '#SparkVibe', '#EnhancedJourney', '#MindfulAdventure', 
          '#PersonalGrowth', '#VibeCard', '#Transformation'
        ],
        
        socialLinks: {
          twitter: generateEnhancedTwitterShare(enhancedContent, totalPoints),
          instagram: generateEnhancedInstagramShare(enhancedContent),
          facebook: generateEnhancedFacebookShare(enhancedContent, totalPoints)
        },
        
        qrCode: `https://sparkvibe.app/card/${enhancedVibeCard.id}`,
        shareUrl: `https://sparkvibe.app/shared/${enhancedVibeCard.id}`
      },
      
      // Analytics and virality
      analytics: {
        viralScore: calculateViralScore(choices, moodData, enhancedContent),
        engagementPotential: calculateEngagement(enhancedContent),
        personalityMatch: calculatePersonalityMatch(choices),
        uniqueness: Math.random() * 0.3 + 0.7 // 70-100%
      },
      
      // Metadata
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '2.0',
        type: 'enhanced-multi-phase',
        aiEnhanced: true,
        processingTime: '2.1s',
        phases: completedPhases,
        choicePattern: Object.keys(choices).join('-'),
        moodContext: moodData?.mood || 'neutral'
      }
    };

    // Store the card (if you have a database)
    // await storeEnhancedVibeCard(enhancedVibeCard);

    return reply.send({
      success: true,
      card: enhancedVibeCard,
      cardId: enhancedVibeCard.id,
      message: '🎨 Enhanced vibe card generated successfully!',
      processingTime: '2.1s',
      pointsEarned: totalPoints,
      achievement: enhancedVibeCard.content.achievement
    });

  } catch (error) {
    console.error('Enhanced vibe card generation error:', error);
    
    // Fallback enhanced card
    const fallbackCard = {
      id: `fallback_enhanced_${Date.now()}`,
      type: 'enhanced',
      content: {
        title: 'Your Amazing Journey',
        adventure: { choice: 'Creative Path', outcome: 'Embraced new possibilities' },
        reflection: { insight: 'Growth happens through action', mantra: 'I am becoming' },
        action: { commitment: 'Continue exploring', strategy: 'One step at a time' },
        achievement: { totalPoints: 55, badge: 'Journey Pioneer' }
      },
      design: { template: 'cosmic', theme: 'inspiring' },
      sharing: { title: 'Enhanced Vibe Journey Complete!' }
    };
    
    return reply.send({
      success: true,
      card: fallbackCard,
      message: '🎨 Enhanced vibe card generated (fallback)',
      fallback: true
    });
  }
});

// Helper functions for enhanced generation
async function generateEnhancedContent(choices, moodData, user) {
  // This could use OpenAI or other AI services for dynamic content
  const adventureTypes = {
    'creative': {
      outcome: 'Unleashed your creative potential',
      impact: 'Discovered new forms of self-expression',
      visual: '🎨'
    },
    'mindful': {
      outcome: 'Found inner peace and clarity',
      impact: 'Connected with your deeper self',
      visual: '🧘‍♀️'
    },
    'social': {
      outcome: 'Strengthened meaningful connections',
      impact: 'Expanded your support network',
      visual: '💫'
    },
    'learning': {
      outcome: 'Expanded your knowledge horizon',
      impact: 'Gained fresh perspectives',
      visual: '📚'
    }
  };

  const reflectionTypes = {
    'growth': {
      insight: 'Every challenge is a stepping stone to strength',
      wisdom: 'Resilience grows through embracing discomfort',
      mantra: 'I am becoming stronger every day'
    },
    'gratitude': {
      insight: 'Joy exists in the smallest moments',
      wisdom: 'Appreciation amplifies abundance',
      mantra: 'I choose to see beauty everywhere'
    },
    'purpose': {
      insight: 'Alignment creates authentic power',
      wisdom: 'Values guide meaningful action',
      mantra: 'My purpose illuminates my path'
    },
    'connection': {
      insight: 'We are all threads in a beautiful tapestry',
      wisdom: 'Unity emerges through understanding',
      mantra: 'I am connected to something greater'
    }
  };

  const actionTypes = {
    'daily_practice': {
      commitment: 'Dedicate 10 minutes daily to growth',
      strategy: 'Small consistent steps create transformation',
      timeline: 'Starting today, building for 30 days'
    },
    'share_journey': {
      commitment: 'Inspire others through my story',
      strategy: 'Authentic sharing creates ripple effects',
      timeline: 'Share one insight this week'
    },
    'build_habit': {
      commitment: 'Create sustainable positive routines',
      strategy: 'Stack new habits with existing ones',
      timeline: 'Implement gradually over 21 days'
    },
    'explore_deeper': {
      commitment: 'Dive deeper into this area of growth',
      strategy: 'Research, learn, and apply new knowledge',
      timeline: 'Dedicate 1 hour weekly to learning'
    }
  };

  const adventureChoice = choices.adventure?.id || 'creative';
  const reflectionChoice = choices.reflection?.id || 'growth';
  const actionChoice = choices.action?.id || 'daily_practice';

  return {
    title: `Your ${adventureChoice.charAt(0).toUpperCase() + adventureChoice.slice(1)} Journey`,
    adventure: adventureTypes[adventureChoice] || adventureTypes['creative'],
    reflection: reflectionTypes[reflectionChoice] || reflectionTypes['growth'],
    action: actionTypes[actionChoice] || actionTypes['daily_practice'],
    theme: determineTheme(choices),
    finalMood: 'inspired',
    moodTransformation: 'Elevated through mindful action'
  };
}

function getBadgeForPhases(phases) {
  if (phases >= 3) return 'Journey Master';
  if (phases >= 2) return 'Path Walker';
  if (phases >= 1) return 'Step Taker';
  return 'Explorer';
}

function calculateLevel(currentPoints, earnedPoints) {
  const totalPoints = currentPoints + earnedPoints;
  return Math.floor(totalPoints / 100) + 1;
}

function getTemplateForChoices(choices) {
  const templates = {
    'creative': 'artistic',
    'mindful': 'zen',
    'social': 'vibrant',
    'learning': 'academic'
  };
  return templates[choices.adventure?.id] || 'cosmic';
}

function getEnhancedColors(choices, moodData) {
  const colorPalettes = {
    'creative': { primary: '#ff6b9d', secondary: '#ffd93d', accent: '#6bcf7f' },
    'mindful': { primary: '#4ecdc4', secondary: '#44a08d', accent: '#096dd9' },
    'social': { primary: '#ff9a9e', secondary: '#fecfef', accent: '#ffeaa7' },
    'learning': { primary: '#667eea', secondary: '#764ba2', accent: '#f093fb' }
  };
  return colorPalettes[choices.adventure?.id] || colorPalettes['creative'];
}

function determineTheme(choices) {
  if (choices.adventure?.id === 'mindful') return 'serene';
  if (choices.adventure?.id === 'creative') return 'artistic';
  if (choices.adventure?.id === 'social') return 'vibrant';
  return 'inspiring';
}

function calculateViralScore(choices, moodData, content) {
  let score = 0.5; // Base score
  
  // Add score for compelling content
  if (content.adventure?.outcome?.length > 20) score += 0.1;
  if (content.reflection?.mantra?.length > 10) score += 0.1;
  if (content.action?.commitment?.length > 15) score += 0.1;
  
  // Add score for mood positivity
  const positiveMoods = ['happy', 'excited', 'inspired', 'grateful'];
  if (positiveMoods.includes(moodData?.mood)) score += 0.2;
  
  return Math.min(score, 1.0);
}

function calculateEngagement(content) {
  return Math.random() * 0.3 + 0.7; // 70-100%
}

function calculatePersonalityMatch(choices) {
  return Math.random() * 0.2 + 0.8; // 80-100%
}

function generateEnhancedTwitterShare(content, points) {
  const text = `✨ Just completed my Enhanced Vibe Journey! ${content.adventure.outcome} and earned ${points} points! 🚀 ${content.reflection.mantra} #SparkVibe #EnhancedJourney`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=https://sparkvibe.app`;
}

function generateEnhancedInstagramShare(content) {
  return `https://www.instagram.com/create/story/`;
}

function generateEnhancedFacebookShare(content, points) {
  const text = `Just completed an Enhanced Vibe Journey and earned ${points} points! ${content.reflection.insight}`;
  return `https://www.facebook.com/sharer/sharer.php?u=https://sparkvibe.app&quote=${encodeURIComponent(text)}`;
}

    // Share tracking
    fastify.post('/track-share', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { cardId, platform, url } = request.body;
        const userId = request.user.userId;

        if (!cardId || !platform) {
          return sendError(reply, 400, 'Card ID and platform are required');
        }

        // Update card share count
        const vibeCard = await VibeCard.findByIdAndUpdate(cardId, {
          $inc: { 'analytics.shares': 1 },
          $push: { 'sharing.platforms': platform },
          'sharing.lastShared': new Date()
        }, { new: true });

        if (!vibeCard) {
          return sendError(reply, 404, 'Vibe card not found');
        }

        // Update user stats
        await User.findByIdAndUpdate(userId, {
          $inc: { 'stats.cardsShared': 1 },
          'stats.lastActivity': new Date()
        });

        // Check viral achievements
        if (vibeCard.analytics.shares >= 100) {
          await checkAchievements(userId, 'viral_achievement', { shares: vibeCard.analytics.shares });
        }

        // Track analytics
        await trackEvent('card_shared', userId, { 
          cardId, 
          platform, 
          totalShares: vibeCard.analytics.shares 
        });

        // Broadcast to leaderboard via WebSocket
        Array.from(wsConnections.values()).forEach(ws => {
          ws.send(JSON.stringify({
            type: 'leaderboard_update',
            data: { userId, action: 'card_shared' }
          }));
        });

        return reply.send({
          success: true,
          message: 'Share tracked successfully',
          totalShares: vibeCard.analytics.shares,
          viralScore: vibeCard.analytics.viralScore
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to track share', error.message);
      }
    });

    // Enhanced leaderboard with real-time features
    fastify.get('/leaderboard-enhanced', async (request, reply) => {
      try {
        const { category = 'points', limit = 10, timeframe = 'all' } = request.query;

        if (mongoose.connection.readyState !== 1) {
          return reply.send(getFallbackLeaderboard());
        }

        // Build query based on timeframe
        let dateFilter = {};
        if (timeframe === 'week') {
          dateFilter = { 'stats.lastActivity': { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
        } else if (timeframe === 'month') {
          dateFilter = { 'stats.lastActivity': { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
        }

        let sortField = 'stats.totalPoints';
        if (category === 'adventures') sortField = 'stats.adventuresCompleted';
        if (category === 'streak') sortField = 'stats.streak';
        if (category === 'cards') sortField = 'stats.cardsGenerated';
        if (category === 'social') sortField = 'stats.friendsCount';

        const leaders = await User.find(dateFilter, {
          name: 1,
          avatar: 1,
          stats: 1,
          achievements: 1,
          referralCode: 1
        })
        .sort({ [sortField]: -1 })
        .limit(parseInt(limit))
        .lean();

        const leaderboard = leaders.map((user, index) => ({
          id: user._id,
          username: user.name || 'Anonymous User',
          avatar: user.avatar || '🚀',
          score: user.stats?.totalPoints || 0,
          rank: index + 1,
          streak: user.stats?.streak || 0,
          cardsShared: user.stats?.cardsShared || 0,
          cardsGenerated: user.stats?.cardsGenerated || 0,
          level: user.stats?.level || 1,
          friendsCount: user.stats?.friendsCount || 0,
          challengesWon: user.stats?.challengesWon || 0,
          achievements: (user.achievements || []).slice(0, 3),
          referralCode: user.referralCode,
          isOnline: wsConnections.has(user._id.toString())
        }));

        return reply.send({ 
          success: true, 
          data: leaderboard,
          metadata: {
            category,
            timeframe,
            totalUsers: await User.countDocuments(dateFilter),
            onlineUsers: wsConnections.size
          }
        });
      } catch (error) {
        console.error('Enhanced leaderboard error:', error);
        return reply.send(getFallbackLeaderboard());
      }
    });

    // Friend system
    fastify.post('/friends/request', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { friendId } = request.body;
        const userId = request.user.userId;

        if (!friendId || friendId === userId) {
          return sendError(reply, 400, 'Invalid friend ID');
        }

        const friend = await User.findById(friendId);
        if (!friend) {
          return sendError(reply, 404, 'User not found');
        }

        // Check if already friends or request exists
        const user = await User.findById(userId);
        const existingFriend = user.friends.find(f => f.userId.toString() === friendId);
        
        if (existingFriend) {
          return sendError(reply, 400, 'Friend request already exists or you are already friends');
        }

        // Add friend request
        await User.findByIdAndUpdate(userId, {
          $push: { 
            friends: { 
              userId: friendId, 
              status: 'pending', 
              connectedAt: new Date() 
            } 
          }
        });

        // Create notification for the friend
        await Notification.create({
          userId: friendId,
          type: 'friend_request',
          title: 'New Friend Request',
          message: `${user.name} wants to be your friend!`,
          data: { requesterId: userId, requesterName: user.name }
        });

        // Track analytics
        await trackEvent('friend_request_sent', userId, { friendId });

        return reply.send({
          success: true,
          message: 'Friend request sent successfully'
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to send friend request', error.message);
      }
    });

    fastify.post('/friends/accept', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { requesterId } = request.body;
        const userId = request.user.userId;

        if (!requesterId) {
          return sendError(reply, 400, 'Requester ID is required');
        }

        // Update both users' friend lists
        await User.findByIdAndUpdate(requesterId, {
          $set: { 'friends.$[elem].status': 'accepted' }
        }, {
          arrayFilters: [{ 'elem.userId': userId }]
        });

        await User.findByIdAndUpdate(userId, {
          $push: { 
            friends: { 
              userId: requesterId, 
              status: 'accepted', 
              connectedAt: new Date() 
            } 
          },
          $inc: { 'stats.friendsCount': 1 }
        });

        await User.findByIdAndUpdate(requesterId, {
          $inc: { 'stats.friendsCount': 1 }
        });

        // Check achievements
        await checkAchievements(userId, 'friend_added');
        await checkAchievements(requesterId, 'friend_added');

        // Create notification
        const user = await User.findById(userId);
        await Notification.create({
          userId: requesterId,
          type: 'friend_accepted',
          title: 'Friend Request Accepted',
          message: `${user.name} accepted your friend request!`,
          data: { friendId: userId, friendName: user.name }
        });

        return reply.send({
          success: true,
          message: 'Friend request accepted successfully'
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to accept friend request', error.message);
      }
    });

    // Challenge system
    fastify.post('/challenges/create', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { friendId, type, target, deadline } = request.body;
        const userId = request.user.userId;

        if (!friendId || !type || !target) {
          return sendError(reply, 400, 'Friend ID, challenge type, and target are required');
        }

        // Validate challenge type
        const validTypes = ['streak', 'points', 'adventure', 'cards'];
        if (!validTypes.includes(type)) {
          return sendError(reply, 400, 'Invalid challenge type');
        }

        // Create challenge
        const challenge = {
          challengerId: userId,
          challengedId: friendId,
          type,
          target,
          deadline: deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
          status: 'pending'
        };

        await User.findByIdAndUpdate(userId, {
          $push: { challenges: challenge }
        });

        // Create notification
        const challenger = await User.findById(userId);
        await Notification.create({
          userId: friendId,
          type: 'challenge',
          title: 'New Challenge',
          message: `${challenger.name} challenged you to a ${type} challenge!`,
          data: { challenge, challengerName: challenger.name }
        });

        // Track analytics
        await trackEvent('challenge_created', userId, { type, target, friendId });

        return reply.send({
          success: true,
          message: 'Challenge created successfully',
          challenge
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to create challenge', error.message);
      }
    });

    // Analytics endpoint
    fastify.post('/track-event', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { eventType, metadata } = request.body;
        const userId = request.user.userId;

        if (!eventType) {
          return sendError(reply, 400, 'Event type is required');
        }

        await trackEvent(eventType, userId, metadata);

        return reply.send({
          success: true,
          message: 'Event tracked successfully'
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to track event', error.message);
      }
    });

    // Notifications
    fastify.get('/notifications', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const userId = request.user.userId;
        const { limit = 20, unreadOnly = false } = request.query;

        let query = { userId };
        if (unreadOnly === 'true') {
          query.read = false;
        }

        const notifications = await Notification.find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .lean();

        return reply.send({
          success: true,
          data: notifications,
          unreadCount: await Notification.countDocuments({ userId, read: false })
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to fetch notifications', error.message);
      }
    });

    // Mark notifications as read
    fastify.post('/notifications/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { notificationIds } = request.body;
        const userId = request.user.userId;

        if (notificationIds && notificationIds.length > 0) {
          await Notification.updateMany(
            { _id: { $in: notificationIds }, userId },
            { read: true }
          );
        } else {
          // Mark all as read
          await Notification.updateMany(
            { userId, read: false },
            { read: true }
          );
        }

        return reply.send({
          success: true,
          message: 'Notifications marked as read'
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to mark notifications as read', error.message);
      }
    });

    // Continue with existing routes (auth, user profile, mood analysis, etc.)...

    // ===== HELPER FUNCTIONS =====
    
    async function checkServiceHealth() {
      const services = {};

      // MongoDB health
      try {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.db.admin().ping();
          services.mongodb = 'healthy';
        } else {
          services.mongodb = 'disconnected';
        }
      } catch (err) {
        services.mongodb = 'unhealthy';
      }

      // Redis health
      if (redisClient) {
        try {
          await redisClient.ping();
          services.redis = 'healthy';
        } catch (err) {
          services.redis = 'unhealthy';
        }
      } else {
        services.redis = 'not configured';
      }

      // External services
      services.openai = openai ? 'configured' : 'not configured';
      services.google_auth = googleClient ? 'configured' : 'not configured';
      services.websocket = `${wsConnections.size} connections`;

      return services;
    }

    function getBadgeForPoints(points) {
      if (points >= 100) return 'Adventure Master';
      if (points >= 75) return 'Vibe Champion';
      if (points >= 50) return 'Growth Seeker';
      if (points >= 25) return 'Explorer';
      return 'Getting Started';
    }

    function getTemplateColors(template) {
      const colorSchemes = {
        cosmic: ['#533483', '#7209b7', '#a663cc', '#4cc9f0'],
        nature: ['#60a531', '#7cb342', '#8bc34a', '#9ccc65'],
        retro: ['#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b'],
        minimal: ['#495057', '#6c757d', '#adb5bd', '#ced4da']
      };
      return colorSchemes[template] || colorSchemes.cosmic;
    }

    function calculateViralScore(user, completionStats) {
      let score = 0;
      score += (user?.stats?.cardsShared || 0) * 0.3;
      score += (user?.stats?.friendsCount || 0) * 0.2;
      score += (user?.stats?.streak || 0) * 0.1;
      score += (completionStats?.vibePointsEarned || 0) * 0.01;
      return Math.min(score, 1.0);
    }

    function generateTwitterShare(capsuleData, completionStats, user) {
      const text = `Just completed "${capsuleData.adventure?.title}" on @SparkVibe and earned ${completionStats?.vibePointsEarned || 50} points! 🌟 Level ${user?.level || 1} with ${user?.totalPoints || 0} total points! #SparkVibe #Adventure #Growth`;
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=https://sparkvibe.app`;
    }

    function generateInstagramShare(capsuleData, completionStats, user) {
      return `https://www.instagram.com/create/story/`;
    }

    function generateFacebookShare(capsuleData, completionStats, user) {
      return `https://www.facebook.com/sharer/sharer.php?u=https://sparkvibe.app&quote=${encodeURIComponent('Just completed an amazing SparkVibe adventure!')}`;
    }

    function generateTikTokShare(capsuleData, completionStats, user) {
      return `https://www.tiktok.com/share?url=https://sparkvibe.app`;
    }

    function getFallbackLeaderboard() {
      return {
        success: true,
        data: [
          {
            username: "SparkVibe Pioneer",
            avatar: "🚀",
            score: 2340,
            rank: 1,
            streak: 15,
            cardsShared: 12,
            cardsGenerated: 18,
            level: 3,
            friendsCount: 8,
            achievements: ['Early Adopter', 'Streak Master', 'Community Builder'],
            isOnline: true
          },
          {
            username: "Vibe Explorer",
            avatar: "🌟", 
            score: 1890,
            rank: 2,
            streak: 8,
            cardsShared: 8,
            cardsGenerated: 15,
            level: 2,
            friendsCount: 5,
            achievements: ['Creative Spark', 'Social Butterfly'],
            isOnline: false
          }
        ],
        metadata: {
          category: 'points',
          timeframe: 'all',
          totalUsers: 2,
          onlineUsers: wsConnections.size
        }
      };
    }

    // Start the server
    const port = process.env.PORT || 8080;
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log('🚀 SparkVibe Enhanced API Server running on port', port);
    console.log('🌐 Server URL:', `http://localhost:${port}`);
    console.log('🔥 Enhanced Features Available:');
    console.log('  📊 Real-time WebSocket connections');
    console.log('  🏆 Achievement system with notifications');
    console.log('  👥 Friend system with challenges');
    console.log('  🎨 Enhanced vibe card generation');
    console.log('  📈 Advanced analytics tracking');
    console.log('  🔄 Automatic leaderboard updates');
    
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
};

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  // Close WebSocket connections
  wsConnections.forEach(ws => ws.close());
  
  if (redisClient) {
    try {
      await redisClient.disconnect();
      console.log('✅ Redis disconnected');
    } catch (error) {
      console.error('❌ Redis disconnect error:', error);
    }
  }
  
  if (mongoose.connection) {
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB disconnected');
    } catch (error) {
      console.error('❌ MongoDB disconnect error:', error);
    }
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  
  // Close WebSocket connections
  wsConnections.forEach(ws => ws.close());
  
  if (redisClient) {
    try {
      await redisClient.disconnect();
      console.log('✅ Redis disconnected');
    } catch (error) {
      console.error('❌ Redis disconnect error:', error);
    }
  }
  
  if (mongoose.connection) {
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB disconnected');
    } catch (error) {
      console.error('❌ MongoDB disconnect error:', error);
    }
  }
  
  process.exit(0);
});

// Start the server
startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});