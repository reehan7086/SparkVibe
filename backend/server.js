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
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️ Missing optional environment variables:', missingEnvVars.join(', '));
  console.log('✅ Running in demo mode with fallback features');
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long for security');
  process.exit(1);
}

// Optional service initialization
let googleClient, redisClient, emailTransporter, cloudinary;

// Google OAuth initialization
try {
  if (process.env.GOOGLE_CLIENT_ID) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    console.log('✅ Google OAuth initialized');
  }
} catch (error) {
  console.warn('⚠️ Google OAuth initialization failed:', error.message);
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
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: { 
    type: String, 
    required: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  avatar: { 
    type: String,
    maxlength: [200, 'Avatar URL cannot exceed 200 characters']
  },
  googleId: { 
    type: String,
    sparse: true
  },
  password: { 
    type: String,
    minlength: [8, 'Password must be at least 8 characters long']
  },
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
    totalPoints: { type: Number, default: 0, min: [0, 'Points cannot be negative'] },
    streak: { type: Number, default: 0, min: [0, 'Streak cannot be negative'] },
    level: { type: Number, default: 1, min: [1, 'Level must be at least 1'] },
    cardsGenerated: { type: Number, default: 0, min: [0, 'Cards generated cannot be negative'] },
    cardsShared: { type: Number, default: 0, min: [0, 'Cards shared cannot be negative'] },
    lastActivity: { type: Date, default: Date.now },
    bestStreak: { type: Number, default: 0, min: [0, 'Best streak cannot be negative'] },
    adventuresCompleted: { type: Number, default: 0, min: [0, 'Adventures completed cannot be negative'] },
    friendsCount: { type: Number, default: 0, min: [0, 'Friends count cannot be negative'] },
    challengesWon: { type: Number, default: 0, min: [0, 'Challenges won cannot be negative'] },
    challengesLost: { type: Number, default: 0, min: [0, 'Challenges lost cannot be negative'] },
    referralsCount: { type: Number, default: 0, min: [0, 'Referrals count cannot be negative'] },
    moodHistory: [{ mood: { type: Object, required: true }, timestamp: { type: Date, default: Date.now } }],
    choices: [{ choice: { type: String, required: true }, capsuleId: { type: String, required: true }, timestamp: { type: Date, default: Date.now } }],
    completions: [{ capsuleId: { type: String, required: true }, completedAt: { type: Date, default: Date.now }, points: { type: Number, required: true, min: 0 } }]
  },
  achievements: [{ id: String, unlockedAt: Date, type: String, title: String, description: String, icon: String }],
  friends: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' }, connectedAt: Date }],
  challenges: [{
    challengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    challengedId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: String,
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
  rewards: { points: { type: Number, default: 25 }, badge: String, unlocks: [String] },
  aiGenerated: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const VibeCardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  capsuleId: String,
  content: { adventure: Object, achievement: Object, mood: Object, user: Object },
  design: { template: String, colors: [String], style: String },
  sharing: { platforms: [String], shareCount: { type: Number, default: 0 }, lastShared: Date },
  analytics: { views: { type: Number, default: 0 }, likes: { type: Number, default: 0 }, shares: { type: Number, default: 0 }, viralScore: { type: Number, default: 0 } },
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
  type: { type: String, required: true },
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

// Initialize models only if MongoDB is available
let User, Adventure, VibeCard, Analytics, Notification;

// WebSocket connections store
const wsConnections = new Map();

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

// Utility functions
const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const checkAchievements = async (userId, actionType, metadata = {}) => {
  if (!User) return [];
  
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const newAchievements = [];
    const existingAchievementIds = user.achievements.map(a => a.id);

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

    if (newAchievements.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $push: { achievements: { $each: newAchievements } },
        $inc: { 'stats.totalPoints': newAchievements.reduce((sum, a) => sum + a.points, 0) }
      });

      for (const achievement of newAchievements) {
        if (Notification) {
          await Notification.create({
            userId,
            type: 'achievement',
            title: 'Achievement Unlocked!',
            message: `You've earned the "${achievement.title}" achievement!`,
            data: { achievement }
          });
        }
      }

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

const createVibeCardImage = async (cardData) => {
  try {
    const canvas = Canvas.createCanvas(540, 960);
    const ctx = canvas.getContext('2d');

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

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    
    const title = cardData.content.adventure.title;
    ctx.fillText(title, 270, 200);
    
    ctx.font = '24px Arial';
    ctx.fillText(`+${cardData.content.achievement.points} Points`, 270, 300);
    
    ctx.fillText(`${cardData.content.achievement.streak} Day Streak`, 270, 350);
    
    ctx.font = 'bold 20px Arial';
    ctx.fillText(cardData.content.user.name, 270, 800);

    return canvas.toBuffer('image/png');
  } catch (error) {
    console.error('Vibe card image creation failed:', error);
    return null;
  }
};

const trackEvent = async (eventType, userId, metadata = {}, sessionId = null) => {
  if (!Analytics) return;
  
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

// Start server function
const startServer = async () => {
  try {
    // MongoDB Connection (optional)
    let dbConnected = false;
    if (process.env.MONGODB_URI) {
      console.log('🔌 Attempting MongoDB connection...');
      mongoose.connection.on('connected', () => {
        console.log('✅ MongoDB connected:', mongoose.connection.host, mongoose.connection.name);
        dbConnected = true;
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB error:', err.message);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
        dbConnected = false;
      });

      let connectionAttempts = 0;
      const maxAttempts = 3;

      while (!dbConnected && connectionAttempts < maxAttempts) {
        try {
          connectionAttempts++;
          await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
          await mongoose.connection.db.admin().ping();
          console.log('✅ MongoDB ping successful');
          
          // Initialize models after successful connection
          User = mongoose.model('User', UserSchema);
          Adventure = mongoose.model('Adventure', AdventureSchema);
          VibeCard = mongoose.model('VibeCard', VibeCardSchema);
          Analytics = mongoose.model('Analytics', AnalyticsSchema);
          Notification = mongoose.model('Notification', NotificationSchema);
          
          dbConnected = true;
        } catch (connectError) {
          console.error(`❌ MongoDB connection attempt ${connectionAttempts}/${maxAttempts} failed:`, connectError.message);
          if (connectError.message.includes('ReplicaSetNoPrimary')) {
            console.log('🔄 Replica set has no primary, retrying in 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            console.log(`⏳ Waiting 3 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          if (connectionAttempts === maxAttempts) {
            console.warn('⚠️ MongoDB connection failed after all attempts, running without database');
            dbConnected = false;
          }
        }
      }
    } else {
      console.log('⚠️ No MONGODB_URI provided, running without database');
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
          'http://localhost:8080',
          'https://backend-sv-3n4v6.ondigitalocean.app'
        ];
        if (process.env.NODE_ENV !== 'production') {
          allowedOrigins.push(/^http:\/\/localhost:(3000|5173|8080)$/);
          allowedOrigins.push(/^https:\/\/.*\.app\.github\.dev$/);
          allowedOrigins.push(/^https:\/\/.*\.gitpod\.io$/);
        }
        const allowed = !origin || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin));
        cb(null, allowed);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires'],
      credentials: true,
      maxAge: 86400
    });

    await fastify.register(fastifyHelmet, {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    });

    // Only register JWT if we have a secret
    if (process.env.JWT_SECRET) {
      await fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET,
        sign: { expiresIn: '7d' },
        verify: { maxAge: '7d' }
      });
    }

    await fastify.register(fastifyMultipart);
    await fastify.register(fastifyWebsocket);
    await fastify.register(fastifyRateLimit, {
      max: async (request) => {
        if (request.url.includes('/auth/')) return 5;
        if (request.url.includes('/generate-')) return 20;
        return request.user ? 100 : 50;
      },
      timeWindow: '1 minute',
      keyGenerator: (request) => request.ip + ':' + (request.user?.userId || 'anonymous'),
      errorResponseBuilder: () => ({
        success: false,
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 60
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

    // Authentication decorator (only if JWT is available)
    if (process.env.JWT_SECRET) {
      fastify.decorate('authenticate', async function (request, reply) {
        try {
          await request.jwtVerify();
          console.log(`🔐 JWT verified for user: ${request.user.userId}`);
        } catch (err) {
          sendError(reply, 401, 'Authentication required', err.message);
        }
      });
    } else {
      // Mock authentication for demo mode
      fastify.decorate('authenticate', async function (request, reply) {
        // Allow all requests in demo mode
        request.user = { userId: 'demo_user' };
      });
    }

    // Basic Routes
    fastify.get('/', async (request, reply) => {
      const services = await checkServiceHealth();
      return reply.send({
        message: 'SparkVibe API Server - v2.5.0 Enhanced',
        status: 'running',
        timestamp: new Date().toISOString(),
        services,
        environment: process.env.NODE_ENV || 'development',
        mongodb: {
          connected: dbConnected,
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
          'Friend Challenges',
          dbConnected ? 'Full Database' : 'Demo Mode'
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
          connected: dbConnected,
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          collections: {}
        },
        websockets: { connections: wsConnections.size },
        mode: dbConnected ? 'full' : 'demo'
      };
    
      if (dbConnected && User) {
        try {
          health.mongodb.collections.users = await User.countDocuments();
          health.mongodb.collections.adventures = await Adventure.countDocuments();
          health.mongodb.collections.vibeCards = await VibeCard.countDocuments();
          health.mongodb.collections.analytics = await Analytics.countDocuments();
        } catch (error) {
          health.mongodb.error = error.message;
        }
      }
    
      const isHealthy = (!process.env.MONGODB_URI || dbConnected) && (!redisClient || health.services.redis === 'healthy');
      reply.status(isHealthy ? 200 : 503).send(health);
    });

    // FIXED: Complete Authentication Routes
    fastify.post('/auth/signup', async (request, reply) => {
      try {
        const { name, email, password } = request.body;
        if (!name || !email || !password) {
          return sendError(reply, 400, 'Name, email, and password are required');
        }
        if (password.length < 6) { // More lenient password requirement
          return sendError(reply, 400, 'Password must be at least 6 characters long');
        }

        const sanitizedEmail = sanitize(email.toLowerCase());
        const sanitizedName = sanitize(name);
        
        if (User) {
          const existingUser = await User.findOne({ email: sanitizedEmail });
          if (existingUser) {
            return sendError(reply, 400, 'User with this email already exists');
          }
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const referralCode = generateReferralCode();
        
        const userData = {
          name: sanitizedName,
          email: sanitizedEmail,
          password: hashedPassword,
          authProvider: 'email',
          emailVerified: true, // Auto-verify for demo
          referralCode,
          preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging' },
          stats: {
            totalPoints: 0,
            level: 1,
            streak: 0,
            cardsGenerated: 0,
            cardsShared: 0,
            lastActivity: new Date(),
            bestStreak: 0,
            adventuresCompleted: 0,
            friendsCount: 0,
            challengesWon: 0,
            challengesLost: 0,
            referralsCount: 0,
            moodHistory: [],
            choices: [],
            completions: []
          }
        };

        let user;
        if (User) {
          user = new User(userData);
          await user.save();
        } else {
          user = { _id: `demo_${Date.now()}`, ...userData };
        }

        let jwtToken = `demo_token_${Date.now()}`;
        if (process.env.JWT_SECRET) {
          jwtToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });
        }

        await trackEvent('user_signup', user._id, { provider: 'email' });
        
        return reply.send({
          success: true,
          token: jwtToken,
          message: 'Account created successfully!',
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar || '👤',
            emailVerified: user.emailVerified,
            stats: user.stats,
            achievements: user.achievements || [],
            preferences: user.preferences,
            referralCode: user.referralCode
          }
        });
      } catch (error) {
        return sendError(reply, 500, 'Account creation failed', error.message);
      }
    });

    fastify.post('/auth/signin', async (request, reply) => {
      try {
        const { email, password } = request.body;
        if (!email || !password) {
          return sendError(reply, 400, 'Email and password are required');
        }

        const sanitizedEmail = sanitize(email.toLowerCase());
        
        let user;
        if (User) {
          user = await User.findOne({ email: sanitizedEmail });
          if (!user || !user.password) {
            return sendError(reply, 401, 'Invalid email or password');
          }

          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) {
            return sendError(reply, 401, 'Invalid email or password');
          }
        } else {
          // Demo mode - create temporary user
          user = {
            _id: `demo_signin_${Date.now()}`,
            name: sanitizedEmail.split('@')[0],
            email: sanitizedEmail,
            avatar: '👤',
            emailVerified: true,
            authProvider: 'email',
            stats: {
              totalPoints: 0,
              level: 1,
              streak: 0,
              cardsGenerated: 0,
              cardsShared: 0,
              lastActivity: new Date(),
              bestStreak: 0,
              adventuresCompleted: 0,
              friendsCount: 0,
              challengesWon: 0,
              challengesLost: 0,
              referralsCount: 0,
              moodHistory: [],
              choices: [],
              completions: []
            },
            achievements: [],
            preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging' },
            referralCode: generateReferralCode()
          };
        }

        let jwtToken = `demo_token_${Date.now()}`;
        if (process.env.JWT_SECRET) {
          jwtToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });
        }

        await trackEvent('user_login', user._id, { provider: 'email' });
        
        if (User && user.save) {
          user.stats.lastActivity = new Date();
          await user.save();
        }
        
        return reply.send({
          success: true,
          token: jwtToken,
          message: 'Login successful!',
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar || '👤',
            emailVerified: user.emailVerified,
            stats: user.stats,
            achievements: user.achievements || [],
            preferences: user.preferences,
            referralCode: user.referralCode
          }
        });
      } catch (error) {
        return sendError(reply, 500, 'Login failed', error.message);
      }
    });

    fastify.post('/auth/google', async (request, reply) => {
      try {
        const { token } = request.body;
        if (!token) {
          return sendError(reply, 400, 'No token provided');
        }
        if (!googleClient) {
          return sendError(reply, 500, 'Google OAuth not configured');
        }
        
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        
        let user;
        if (User) {
          user = await User.findOne({ googleId: payload.sub });
          if (!user) {
            user = new User({
              googleId: payload.sub,
              email: sanitize(payload.email),
              name: sanitize(payload.name),
              avatar: payload.picture,
              emailVerified: payload.email_verified,
              authProvider: 'google',
              referralCode: generateReferralCode(),
              preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging' }
            });
            await user.save();
          }
        } else {
          // Demo mode
          user = {
            _id: `demo_google_${Date.now()}`,
            googleId: payload.sub,
            email: payload.email,
            name: payload.name,
            avatar: payload.picture,
            emailVerified: payload.email_verified,
            authProvider: 'google',
            stats: {
              totalPoints: 0,
              level: 1,
              streak: 0,
              cardsGenerated: 0,
              cardsShared: 0,
              lastActivity: new Date()
            },
            achievements: [],
            preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging' },
            referralCode: generateReferralCode()
          };
        }
        
        let jwtToken = `demo_google_token_${Date.now()}`;
        if (process.env.JWT_SECRET) {
          jwtToken = fastify.jwt.sign({ userId: user._id, email: user.email, name: user.name, googleId: user.googleId }, { expiresIn: '7d' });
        }

        await trackEvent('user_login', user._id, { provider: 'google' });
        
        return reply.send({
          success: true,
          token: jwtToken,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            totalPoints: user.stats?.totalPoints || 0,
            emailVerified: user.emailVerified,
            preferences: user.preferences,
            referralCode: user.referralCode,
            stats: user.stats
          }
        });
      } catch (error) {
        console.error('Google auth error:', error);
        return sendError(reply, 500, 'Authentication failed', error.message);
      }
    });

    // FIXED: User Profile Routes
    fastify.get('/user/profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const userId = request.user.userId;
        
        if (!User) {
          return reply.send({
            success: true,
            message: 'Profile retrieved from demo mode',
            user: {
              id: userId,
              email: 'demo@sparkvibe.app',
              name: 'Demo User',
              avatar: '🌟',
              preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging' },
              stats: { totalPoints: 0, level: 1, streak: 0, cardsGenerated: 0, cardsShared: 0 },
              achievements: [],
              referralCode: 'DEMO123',
              emailVerified: true,
              fallback: true
            }
          });
        }
        
        const user = await User.findById(userId).select('email name avatar preferences stats achievements referralCode emailVerified');
        if (!user) {
          return sendError(reply, 404, 'User not found');
        }

        await trackEvent('profile_view', userId, { timestamp: new Date().toISOString() });
        
        return reply.send({
          success: true,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            preferences: user.preferences,
            stats: user.stats,
            achievements: user.achievements,
            referralCode: user.referralCode,
            emailVerified: user.emailVerified,
            fallback: false
          }
        });
      } catch (error) {
        console.error('Profile fetch error:', error);
        return sendError(reply, 500, 'Failed to fetch profile', error.message);
      }
    });

    // FIXED: Leaderboard Route
    fastify.get('/leaderboard', async (request, reply) => {
      try {
        if (!User) {
          return reply.send(getFallbackLeaderboard());
        }
        
        const leaders = await User.find()
          .sort({ 'stats.totalPoints': -1 })
          .limit(10)
          .select('name avatar stats.totalPoints stats.level stats.streak')
          .lean();
          
        const leaderboard = leaders.map((user, index) => ({
          id: user._id,
          username: user.name || 'Anonymous User',
          avatar: user.avatar || '🚀',
          score: user.stats.totalPoints || 0,
          rank: index + 1,
          level: user.stats.level || 1,
          streak: user.stats.streak || 0
        }));

        return reply.send({
          success: true,
          data: leaderboard,
          fallback: false,
          metadata: {
            totalUsers: await User.countDocuments(),
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Leaderboard error:', error);
        return reply.send(getFallbackLeaderboard());
      }
    });

    // FIXED: Enhanced Leaderboard Route
    fastify.get('/leaderboard-enhanced', async (request, reply) => {
      try {
        const { category = 'points', limit = 10, timeframe = 'all' } = request.query;
        
        if (!User) {
          return reply.send(getFallbackLeaderboard());
        }
        
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
        }).sort({ [sortField]: -1 }).limit(parseInt(limit)).lean();
        
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

    // FIXED: Trending Adventures Route
    fastify.get('/trending-adventures', async (request, reply) => {
      try {
        let trending = [];
        let viralAdventure = null;
        
        if (Adventure) {
          trending = await Adventure.find()
            .sort({ completions: -1 })
            .limit(10)
            .lean();
          viralAdventure = trending[0] || null;
        }
        
        // Fallback data if no adventures or no database
        if (trending.length === 0) {
          trending = [
            {
              _id: 'demo1',
              title: 'Morning Gratitude Practice',
              description: 'Start your day with three things you\'re grateful for',
              category: 'Mindfulness',
              completions: 347,
              shares: 89,
              viralPotential: 0.85,
              template: 'nature',
              difficulty: 'easy',
              estimatedTime: '5 minutes'
            },
            {
              _id: 'demo2',
              title: 'Random Act of Kindness',
              description: 'Brighten someone\'s day with unexpected kindness',
              category: 'Social',
              completions: 256,
              shares: 92,
              viralPotential: 0.92,
              template: 'cosmic',
              difficulty: 'easy',
              estimatedTime: '10 minutes'
            },
            {
              _id: 'demo3',
              title: 'Creative Photo Walk',
              description: 'Capture beauty in ordinary moments around you',
              category: 'Adventure',
              completions: 198,
              shares: 67,
              viralPotential: 0.78,
              template: 'retro',
              difficulty: 'medium',
              estimatedTime: '15 minutes'
            }
          ];
          viralAdventure = trending[1]; // Random act of kindness
        }

        return reply.send({
          success: true,
          trending,
          viralAdventure,
          metadata: { 
            lastUpdated: new Date().toISOString(), 
            fallback: !Adventure 
          }
        });
      } catch (error) {
        console.error('Trending adventures error:', error);
        return reply.send({
          success: true,
          trending: [],
          viralAdventure: {},
          metadata: { lastUpdated: new Date().toISOString(), fallback: true }
        });
      }
    });

    // FIXED: User Stats Sync Route
    fastify.post('/user/sync-stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const userId = request.user.userId;
        const { totalPoints, level, streak, cardsGenerated, cardsShared } = request.body;
        
        if (!User) {
          return reply.send({
            success: true,
            message: 'Stats synced locally (demo mode)',
            synced: { totalPoints, level, streak, cardsGenerated, cardsShared },
            fallback: true
          });
        }
        
        const user = await User.findById(userId);
        if (!user) {
          return sendError(reply, 404, 'User not found');
        }

        user.stats.totalPoints = totalPoints !== undefined ? totalPoints : user.stats.totalPoints;
        user.stats.level = level !== undefined ? level : user.stats.level;
        user.stats.streak = streak !== undefined ? streak : user.stats.streak;
        user.stats.cardsGenerated = cardsGenerated !== undefined ? cardsGenerated : user.stats.cardsGenerated;
        user.stats.cardsShared = cardsShared !== undefined ? cardsShared : user.stats.cardsShared;
        user.stats.lastActivity = new Date();
        
        await user.save();
        await checkAchievements(userId, 'stats_updated');
        
        return reply.send({
          success: true,
          message: 'User stats synchronized successfully',
          synced: {
            totalPoints: user.stats.totalPoints,
            level: user.stats.level,
            streak: user.stats.streak,
            cardsGenerated: user.stats.cardsGenerated,
            cardsShared: user.stats.cardsShared
          },
          fallback: false
        });
      } catch (error) {
        console.error('Sync stats error:', error);
        return sendError(reply, 500, 'Failed to sync user stats', error.message);
      }
    });

    // FIXED: Mood Analysis Route
    fastify.post('/analyze-mood', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { textInput } = request.body;
        if (!textInput || textInput.trim().length < 3) {
          return sendError(reply, 400, 'Text input is required and must be at least 3 characters');
        }

        // Simple mood analysis fallback (since NLP_CLOUD_API_KEY is optional)
        const text = textInput.toLowerCase();
        let mood, confidence, emotions, recommendations, suggestedTemplate, energyLevel, socialMood;

        if (text.includes('happy') || text.includes('excited') || text.includes('great')) {
          mood = 'happy';
          confidence = 0.92;
          emotions = [{ emotion: 'joy', score: 0.92 }, { emotion: 'excitement', score: 0.85 }];
          recommendations = [
            'Channel your positive energy into a creative project',
            'Share your enthusiasm with someone special',
            'Try a high-energy adventure'
          ];
          suggestedTemplate = 'cosmic';
          energyLevel = 'high';
          socialMood = 'outgoing';
        } else if (text.includes('sad') || text.includes('down') || text.includes('depressed')) {
          mood = 'sad';
          confidence = 0.88;
          emotions = [{ emotion: 'sadness', score: 0.88 }, { emotion: 'melancholy', score: 0.75 }];
          recommendations = [
            'Practice self-compassion with a journaling session',
            'Reach out to a friend for support',
            'Try a calming activity like meditation'
          ];
          suggestedTemplate = 'minimal';
          energyLevel = 'low';
          socialMood = 'introspective';
        } else if (text.includes('anxious') || text.includes('worried') || text.includes('nervous')) {
          mood = 'anxious';
          confidence = 0.85;
          emotions = [{ emotion: 'anxiety', score: 0.85 }, { emotion: 'worry', score: 0.78 }];
          recommendations = [
            'Practice deep breathing to calm your mind',
            'Break tasks into smaller, manageable steps',
            'Try a grounding exercise'
          ];
          suggestedTemplate = 'nature';
          energyLevel = 'medium-low';
          socialMood = 'cautious';
        } else {
          mood = 'curious';
          confidence = 0.65;
          emotions = [{ emotion: 'curiosity', score: 0.65 }, { emotion: 'openness', score: 0.70 }];
          recommendations = [
            'Try something new and unexpected today',
            'Explore a topic that sparks your interest',
            'Stay open to surprising opportunities'
          ];
          suggestedTemplate = 'cosmic';
          energyLevel = 'medium';
          socialMood = 'balanced';
        }

        const userId = request.user.userId;
        if (User && userId !== 'demo_user') {
          await User.findByIdAndUpdate(userId, {
            $push: { 
              'stats.moodHistory': { 
                mood: { emotion: mood, score: confidence }, 
                timestamp: new Date() 
              } 
            }
          });
        }

        await trackEvent('mood_analyzed', userId, { mood, confidence, textLength: textInput.length });

        return reply.send({
          success: true,
          mood,
          confidence,
          emotions,
          recommendations,
          suggestedTemplate,
          energyLevel,
          socialMood,
          analyzedAt: new Date().toISOString(),
          primaryMood: mood,
          suggestedActivities: recommendations.slice(0, 2)
        });
      } catch (error) {
        return sendError(reply, 500, 'Mood analysis failed', error.message);
      }
    });

    // FIXED: Capsule Generation Route
    fastify.post('/generate-capsule-simple', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { mood, interests = ['general'], timeOfDay = 'afternoon', userId } = request.body;
        if (!mood) {
          return sendError(reply, 400, 'Mood is required');
        }

        // Generate adventure based on mood
        let adventure;
        if (mood === 'happy') {
          adventure = {
            title: '✨ Joy Amplifier Challenge',
            prompt: 'Spend 10 minutes doing something that makes you smile, then share that joy with someone else.',
            difficulty: 'easy',
            estimatedTime: '10 minutes',
            category: 'Social'
          };
        } else if (mood === 'anxious') {
          adventure = {
            title: '🧘 Calm Creator Practice',
            prompt: 'Take 5 deep breaths, then write down three things you can control in this moment.',
            difficulty: 'easy', 
            estimatedTime: '5 minutes',
            category: 'Mindfulness'
          };
        } else if (mood === 'sad') {
          adventure = {
            title: '🌱 Gentle Growth Moment',
            prompt: 'Write a kind note to yourself as if you were comforting a good friend.',
            difficulty: 'easy',
            estimatedTime: '8 minutes',
            category: 'Self-Care'
          };
        } else {
          adventure = {
            title: '🔍 Curiosity Quest',
            prompt: 'Spend 10 minutes learning about something completely new to you.',
            difficulty: 'easy',
            estimatedTime: '10 minutes', 
            category: 'Learning'
          };
        }

        const capsuleId = `capsule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        if (User && userId && userId !== 'demo_user') {
          await User.findByIdAndUpdate(userId, {
            $push: { 
              'stats.choices': { 
                choice: adventure.title, 
                capsuleId, 
                timestamp: new Date() 
              } 
            },
            $inc: { 'stats.cardsGenerated': 1 }
          });
        }

        await trackEvent('capsule_generated', userId, { mood, category: adventure.category, timeOfDay });

        return reply.send({
          success: true,
          capsule: `Good ${timeOfDay}! Your ${mood} energy is perfect for growth today.`,
          adventure,
          moodBoost: `Your ${mood} mood is a superpower - use it to create positive change!`,
          brainBite: {
            question: 'Did you know?',
            answer: 'Engaging in novel activities creates new neural pathways, enhancing cognitive flexibility and creativity.'
          },
          habitNudge: `Build on today's ${mood} energy by making this a daily practice!`,
          viralPotential: 0.7,
          id: capsuleId
        });
      } catch (error) {
        return sendError(reply, 500, 'Capsule generation failed', error.message);
      }
    });

    // FIXED: Enhanced Vibe Card Generation Route
    fastify.post('/generate-enhanced-vibe-card', async (request, reply) => {
      try {
        const { moodData, choices, user } = request.body;
        const completedPhases = Object.keys(choices || {}).length;
        const basePoints = 25;
        const phaseBonus = completedPhases * 15;
        const totalPoints = basePoints + phaseBonus;

        const enhancedVibeCard = {
          id: `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'enhanced',
          version: '2.0',
          content: {
            title: 'Your Enhanced Journey',
            subtitle: 'Multi-Phase Adventure Complete',
            adventure: {
              choice: choices.adventure?.title || 'Creative Expression',
              outcome: 'Embraced new possibilities and creative potential',
              impact: 'Discovered new forms of self-expression',
              visual: '🎨'
            },
            reflection: {
              choice: choices.reflection?.title || 'Personal Growth',
              insight: 'Every challenge is a stepping stone to strength',
              wisdom: 'Resilience grows through embracing discomfort',
              mantra: 'I am becoming stronger every day'
            },
            action: {
              choice: choices.action?.title || 'Daily Practice',
              commitment: 'Dedicate 10 minutes daily to growth',
              strategy: 'Small consistent steps create transformation',
              timeline: 'Starting today, building for 30 days'
            },
            achievement: {
              totalPoints: totalPoints,
              phasesCompleted: completedPhases,
              badge: completedPhases >= 3 ? 'Journey Master' : completedPhases >= 2 ? 'Path Walker' : 'Step Taker',
              level: Math.floor(((user?.totalPoints || 0) + totalPoints) / 100) + 1,
              streak: Math.floor(Math.random() * 10) + 1,
              timestamp: new Date().toISOString()
            },
            moodJourney: {
              before: moodData?.mood || 'curious',
              after: 'inspired',
              transformation: 'Elevated through mindful action',
              energyBoost: `+${Math.floor(Math.random() * 25) + 15}%`
            }
          },
          design: {
            template: 'cosmic',
            theme: 'inspiring',
            colors: ['#ff6b9d', '#ffd93d', '#6bcf7f'],
            animations: ['morphGradient', 'particleField', 'pulseGlow'],
            layout: 'multi-phase',
            effects: { background: 'cosmic-particles', transitions: 'smooth-morph', highlights: 'neon-glow' }
          },
          user: {
            name: user?.name || 'Vibe Explorer',
            avatar: user?.avatar || '🌟',
            level: Math.floor(((user?.totalPoints || 0) + totalPoints) / 100) + 1,
            totalPoints: (user?.totalPoints || 0) + totalPoints,
            streak: user?.streak || 1,
            badgeCount: (user?.badgeCount || 0) + 1
          },
          sharing: {
            title: `${user?.name || 'Someone'}'s Enhanced Vibe Journey`,
            description: `Completed a ${completedPhases}-phase adventure and earned ${totalPoints} points!`,
            captions: [
              `🚀 Just completed my Enhanced Vibe Journey and earned ${totalPoints} points!`,
              `✨ Embraced new possibilities and creative potential #SparkVibeJourney`,
              `🌟 ${completedPhases} phases, infinite possibilities. I am becoming stronger every day`,
              `⚡ Dedicate 10 minutes daily to growth. Starting today!`
            ],
            hashtags: ['#SparkVibe', '#EnhancedJourney', '#MindfulAdventure', '#PersonalGrowth', '#VibeCard', '#Transformation'],
            qrCode: `https://sparkvibe.app/card/${enhancedVibeCard.id}`,
            shareUrl: `https://sparkvibe.app/shared/${enhancedVibeCard.id}`
          },
          analytics: {
            viralScore: Math.random() * 0.3 + 0.7,
            engagementPotential: Math.random() * 0.3 + 0.7,
            personalityMatch: Math.random() * 0.2 + 0.8,
            uniqueness: Math.random() * 0.3 + 0.7
          },
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

    // WebSocket Routes
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
        
        connection.socket.on('close', (code, reason) => {
          if (userId) {
            wsConnections.delete(userId);
            console.log(`WebSocket disconnected: ${userId}, Code: ${code}, Reason: ${reason || 'No reason'}`);
          }
        });
      });
    });

    // FIXED: Social and Challenge Routes
    fastify.get('/friends', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const userId = request.user.userId;
        
        if (!User || userId === 'demo_user') {
          return reply.send({
            success: true,
            message: 'Friends retrieved from demo mode',
            data: [
              { 
                id: 'demo-friend-1', 
                name: 'Vibe Explorer', 
                avatar: '🌟', 
                status: 'accepted', 
                connectedAt: new Date().toISOString() 
              }
            ],
            fallback: true
          });
        }
        
        const user = await User.findById(userId).populate('friends.userId', 'name avatar').lean();
        if (!user) {
          return sendError(reply, 404, 'User not found');
        }

        const friendsData = user.friends.map(friend => ({
          id: friend.userId._id,
          name: friend.userId.name,
          avatar: friend.userId.avatar || '👤',
          status: friend.status,
          connectedAt: friend.connectedAt.toISOString()
        }));

        await trackEvent('friends_view', userId, { friendCount: friendsData.length });
        
        return reply.send({
          success: true,
          data: friendsData,
          metadata: { 
            totalFriends: friendsData.length, 
            timestamp: new Date().toISOString(), 
            fallback: false 
          }
        });
      } catch (error) {
        console.error('Friends fetch error:', error);
        return sendError(reply, 500, 'Failed to fetch friends', error.message);
      }
    });

    fastify.get('/challenges', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const userId = request.user.userId;
        
        if (!User || userId === 'demo_user') {
          return reply.send({
            success: true,
            message: 'Challenges retrieved from demo mode',
            challenges: [
              {
                id: 'demo-challenge-1',
                title: 'Daily Wellness Challenge',
                description: 'Complete a 10-minute meditation session',
                category: 'Wellness',
                points: 50,
                status: 'available',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              },
              {
                id: 'demo-challenge-2',
                title: 'Creative Writing Challenge',
                description: 'Write a 100-word story',
                category: 'Creativity',
                points: 75,
                status: 'available',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              }
            ],
            fallback: true
          });
        }
        
        const user = await User.findById(userId).select('challenges').lean();
        if (!user) {
          return sendError(reply, 404, 'User not found');
        }

        const challenges = user.challenges.map(challenge => ({
          id: challenge._id || `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: `${challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1)} Challenge`,
          description: `Complete a ${challenge.type} challenge with target ${challenge.target}`,
          category: challenge.type === 'streak' ? 'Consistency' : 
                    challenge.type === 'points' ? 'Points' : 
                    challenge.type === 'adventure' ? 'Adventure' : 'Creativity',
          points: challenge.target || 50,
          status: challenge.status,
          createdAt: challenge.createdAt.toISOString(),
          expiresAt: challenge.deadline.toISOString(),
          challengerId: challenge.challengerId,
          challengedId: challenge.challengedId
        }));

        await trackEvent('challenges_view', userId, { challengeCount: challenges.length });
        
        return reply.send({
          success: true,
          challenges,
          metadata: { 
            totalChallenges: challenges.length, 
            timestamp: new Date().toISOString(), 
            fallback: false 
          }
        });
      } catch (error) {
        console.error('Challenges fetch error:', error);
        return sendError(reply, 500, 'Failed to fetch challenges', error.message);
      }
    });

    // FIXED: Track Event Route
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

    // FIXED: Notifications Routes
    fastify.get('/notifications', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const userId = request.user.userId;
        const { limit = 20, unreadOnly = false } = request.query;
        
        if (!Notification || userId === 'demo_user') {
          return reply.send({
            success: true,
            data: [],
            unreadCount: 0,
            fallback: true
          });
        }

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

    fastify.post('/notifications/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { notificationIds } = request.body;
        const userId = request.user.userId;
        
        if (!Notification || userId === 'demo_user') {
          return reply.send({
            success: true,
            message: 'Notifications marked as read (demo mode)',
            fallback: true
          });
        }

        if (notificationIds && notificationIds.length > 0) {
          await Notification.updateMany(
            { _id: { $in: notificationIds }, userId },
            { read: true }
          );
        } else {
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

    // Helper Functions
    function getFallbackLeaderboard() {
      return {
        success: true,
        data: [
          { id: '1', username: 'Vibe Master', avatar: '🚀', score: 2450, rank: 1, level: 5, streak: 25 },
          { id: '2', username: 'Adventure Seeker', avatar: '🌟', score: 1890, rank: 2, level: 3, streak: 12 },
          { id: '3', username: 'Mood Explorer', avatar: '🧘‍♀️', score: 1456, rank: 3, level: 2, streak: 8 }
        ],
        metadata: { totalUsers: 3, timestamp: new Date().toISOString(), fallback: true }
      };
    }

    async function checkServiceHealth() {
      const services = {
        mongodb: User ? 'healthy' : 'not_configured',
        redis: redisClient ? 'healthy' : 'not_configured',
        google: googleClient ? 'healthy' : 'not_configured'
      };
      return services;
    }

    // Start the server
    const port = process.env.PORT || 8080;
    const host = process.env.HOST || '0.0.0.0';
    
    fastify.listen({ port, host }, (err, address) => {
      if (err) {
        console.error('❌ Server failed to start:', err);
        process.exit(1);
      }
      console.log(`✅ SparkVibe Server running at ${address}`);
      console.log(`🌟 Mode: ${dbConnected ? 'Full Database' : 'Demo Mode'}`);
      console.log(`📊 Features: ${dbConnected ? 'All features enabled' : 'Limited to demo features'}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('🛑 Shutting down server...');
      try {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
          console.log('✅ MongoDB connection closed');
        }
        if (redisClient) {
          await redisClient.quit();
          console.log('✅ Redis connection closed');
        }
        await fastify.close();
        console.log('✅ Server shut down gracefully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Shutdown error:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

// Execute server start
startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});