<<<<<<< HEAD
// Fixed backend/server.js - Critical Issues Resolved
=======
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
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
<<<<<<< HEAD
=======
const fastifyWebsocket = require('@fastify/websocket');
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
const fastifyStatic = require('@fastify/static');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const sanitize = require('mongo-sanitize');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
<<<<<<< HEAD
require('dotenv').config();

// CRITICAL FIX: Validate required environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL: JWT_SECRET must be at least 32 characters long');
  console.error('Current JWT_SECRET length:', JWT_SECRET ? JWT_SECRET.length : 0);
  console.error('Please set a proper JWT_SECRET in your environment variables');
  process.exit(1);
=======
const axios = require('axios');
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️ Missing required environment variables:', missingEnvVars.join(', '));
  console.log('✅ Running in demo mode with fallback features');
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
}

console.log('✅ JWT_SECRET validated successfully');

<<<<<<< HEAD
// Optional service initialization with proper error handling
let googleClient;
=======
// Optional service initialization
let googleClient, redisClient, cloudinary;

// Google OAuth initialization
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
try {
  if (process.env.GOOGLE_CLIENT_ID) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    console.log('✅ Google OAuth initialized');
<<<<<<< HEAD
  } else {
    console.log('ℹ️ Google OAuth not configured (optional)');
=======
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
  }
} catch (error) {
  console.warn('⚠️ Google OAuth initialization failed:', error.message);
}

<<<<<<< HEAD
// CRITICAL FIX: Proper CORS configuration
const registerPlugins = async () => {
  await fastify.register(fastifyCors, {
    origin: (origin, cb) => {
      // FIXED: Proper origin handling for production
      const allowedOrigins = [
        'https://sparkvibe.app',
        'https://www.sparkvibe.app',
        'https://frontend-sv-3n4v6.ondigitalocean.app'
      ];
      
      // Allow development origins in non-production
      if (process.env.NODE_ENV !== 'production') {
        allowedOrigins.push(
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:8080'
        );
      }
      
      // Allow any origin for development, specific origins for production
      const allowed = !origin || allowedOrigins.includes(origin);
      cb(null, allowed);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400
  });

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  });

  // CRITICAL FIX: Proper JWT configuration
  await fastify.register(fastifyJwt, {
    secret: JWT_SECRET,
=======
// Cloudinary initialization for media uploads
try {
  if (process.env.CLOUDINARY_URL) {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({ url: process.env.CLOUDINARY_URL });
    console.log('✅ Cloudinary initialized');
  }
} catch (error) {
  console.warn('⚠️ Cloudinary initialization failed:', error.message);
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

// MongoDB Connection Options
const mongooseOptions = {
  serverSelectionTimeoutMS: 60000, // Increased for stability
  connectTimeoutMS: 60000, // Increased for stability
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  writeConcern: { w: 'majority' }
};

// Error handler
const sendError = (reply, status, message, details) => {
  console.error(`❌ Error [${status}]: ${message}`, details);
  reply.status(status).send({
    success: false,
    message,
    details: process.env.NODE_ENV === 'development' ? details : undefined
  });
};

// Register plugins
const registerPlugins = async () => {
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

  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'demo-secret-1234567890abcdef1234567890abcdef',
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
    sign: { expiresIn: '7d' },
    verify: { maxAge: '7d' }
  });

  await fastify.register(fastifyMultipart, {
<<<<<<< HEAD
    limits: { fileSize: 10 * 1024 * 1024 }
  });

  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute'
=======
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 1
    }
  });

  await fastify.register(fastifyWebsocket);

  await fastify.register(fastifyRateLimit, {
    max: async (request) => {
      if (request.url.includes('/auth/')) return 5;
      if (request.url.includes('/generate-') || request.url.includes('/upload-media')) return 20;
      if (request.url.includes('/premium/create-checkout')) return 5;
      return request.user ? 100 : 50;
    },
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip + ':' + (request.user?.userId || 'anonymous'),
    errorResponseBuilder: () => ({
      success: false,
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60
    })
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
  });

  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, 'uploads'),
<<<<<<< HEAD
    prefix: '/uploads/'
  });

  // CRITICAL FIX: Proper authentication decorator
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      console.error('Authentication failed:', err.message);
      reply.status(401).send({
        success: false,
        message: 'Authentication required',
        error: 'UNAUTHORIZED'
      });
=======
    prefix: '/uploads/',
    decorateReply: false
  });

  // Authentication decorator
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
      console.log(`🔐 JWT verified for user: ${request.user.userId}`);
    } catch (err) {
      sendError(reply, 401, 'Authentication required', err.message);
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
    }
  });
};

<<<<<<< HEAD
// CRITICAL FIX: MongoDB connection with proper error handling
const connectMongoDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.log('ℹ️ MongoDB not configured - running in demo mode');
    return false;
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });
      console.log('✅ MongoDB connected successfully');
      return true;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) {
        console.warn('⚠️ MongoDB connection failed - running in demo mode');
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// CRITICAL FIX: Proper user schema with validation
=======
// MongoDB Schemas
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
  },
  name: { 
    type: String, 
    required: true,
<<<<<<< HEAD
    minlength: 2,
    maxlength: 50
=======
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
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
  },
  password: { 
    type: String,
    minlength: 8
  },
  googleId: String,
  avatar: String,
  emailVerified: { type: Boolean, default: false },
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
<<<<<<< HEAD
  stats: {
    totalPoints: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    cardsGenerated: { type: Number, default: 0 },
    cardsShared: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  },
  preferences: {
    interests: [String],
    difficulty: { type: String, default: 'easy' }
  },
  createdAt: { type: Date, default: Date.now }
});

let User;

// CRITICAL FIX: Health check endpoint
fastify.get('/health', async (request, reply) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: !!mongoose.connection.readyState,
    google_oauth: !!googleClient
  };
  
  reply.send(health);
});

// CRITICAL FIX: Authentication routes with proper error handling
fastify.post('/auth/signup', async (request, reply) => {
  try {
    const { name, email, password } = request.body;
    
    // Validation
    if (!name || !email || !password) {
      return reply.status(400).send({
        success: false,
        message: 'Name, email, and password are required'
      });
    }
    
    if (password.length < 8) {
      return reply.status(400).send({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    const sanitizedEmail = sanitize(email.toLowerCase());
    const sanitizedName = sanitize(name);
    
    // Check if user exists (only if MongoDB is available)
    if (User) {
      const existingUser = await User.findOne({ email: sanitizedEmail });
      if (existingUser) {
        return reply.status(400).send({
          success: false,
          message: 'User with this email already exists'
        });
=======
  preferences: {
    notifications: { type: Boolean, default: true },
    interests: [String],
    aiPersonality: { type: String, default: 'encouraging' },
    pushSubscription: Object, // For push notifications
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
    mediaUploads: { type: Number, default: 0, min: [0, 'Media uploads cannot be negative'] },
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
  premiumStatus: {
    active: { type: Boolean, default: false },
    subscriptionId: String,
    plan: { type: String, enum: ['basic', 'pro', 'enterprise'], default: 'basic' },
    startDate: Date,
    endDate: Date
  },
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

const MediaSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'video', 'audio'], required: true },
  metadata: {
    size: Number,
    filename: String,
    mimeType: String
  },
  createdAt: { type: Date, default: Date.now }
});

// Create indexes
UserSchema.index({ email: 1 });
AdventureSchema.index({ category: 1, completions: -1 });
AnalyticsSchema.index({ eventType: 1, timestamp: -1 });
VibeCardSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
MediaSchema.index({ userId: 1, createdAt: -1 });

// Initialize models only if MongoDB is available
let User, Adventure, VibeCard, Analytics, Notification, Media;

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
  viral_star: { title: 'Viral Star', description: 'Get 100 shares on a vibe card', icon: '⭐', points: 300 },
  media_maven: { title: 'Media Maven', description: 'Upload 5 media files', icon: '📸', points: 100 },
  premium_pioneer: { title: 'Premium Pioneer', description: 'Activate a premium subscription', icon: '💎', points: 150 }
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

    if (user.stats.friendsCount >= 5 && !existingAchievementIds.includes('social_butterfly')) {
      newAchievements.push({
        id: 'social_butterfly',
        ...ACHIEVEMENTS.social_butterfly,
        unlockedAt: new Date(),
        type: 'social'
      });
    }

    if (user.stats.challengesWon >= 1 && !existingAchievementIds.includes('challenger')) {
      newAchievements.push({
        id: 'challenger',
        ...ACHIEVEMENTS.challenger,
        unlockedAt: new Date(),
        type: 'challenge'
      });
    }

    if (user.stats.mediaUploads >= 5 && !existingAchievementIds.includes('media_maven')) {
      newAchievements.push({
        id: 'media_maven',
        ...ACHIEVEMENTS.media_maven,
        unlockedAt: new Date(),
        type: 'media'
      });
    }

    if (user.premiumStatus.active && !existingAchievementIds.includes('premium_pioneer')) {
      newAchievements.push({
        id: 'premium_pioneer',
        ...ACHIEVEMENTS.premium_pioneer,
        unlockedAt: new Date(),
        type: 'premium'
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
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
      }

      const wsConnection = wsConnections.get(userId.toString());
      if (wsConnection) {
        wsConnection.send(JSON.stringify({
          type: 'achievement',
          data: newAchievements
        }));
      }
    }

<<<<<<< HEAD
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const userData = {
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
      authProvider: 'email',
      emailVerified: true,
      stats: {
        totalPoints: 0,
        level: 1,
        streak: 0,
        cardsGenerated: 0,
        cardsShared: 0,
        lastActivity: new Date()
=======
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

const uploadMediaToCloudinary = async (file) => {
  if (!cloudinary) {
    throw new Error('Cloudinary not configured');
  }
  try {
    const result = await cloudinary.uploader.upload_stream({
      resource_type: 'auto',
      folder: 'sparkvibe_uploads',
      public_id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }).end(file.data);
    return {
      url: result.secure_url,
      public_id: result.public_id,
      type: result.resource_type,
      metadata: {
        size: result.bytes,
        mimeType: result.format
      }
    };
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw error;
  }
};

const uploadMediaToLocal = async (file) => {
  const uploadDir = path.join(__dirname, 'uploads');
  const fs = require('fs').promises;
  await fs.mkdir(uploadDir, { recursive: true });
  
  const fileName = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.filename)}`;
  const filePath = path.join(uploadDir, fileName);
  
  await fs.writeFile(filePath, file.data);
  
  return {
    url: `/uploads/${fileName}`,
    type: file.mimetype.startsWith('image') ? 'image' : file.mimetype.startsWith('video') ? 'video' : 'audio',
    metadata: {
      size: file.size,
      mimeType: file.mimetype,
      filename: fileName
    }
  };
};

const trackEvent = async (eventType, userId, metadata = {}, sessionId = null) => {
  if (!Analytics) return;
  
  try {
    await Analytics.create({
      eventType,
      userId,
      metadata,
      sessionId,
      userAgent: fastify.request ? fastify.request.headers['user-agent'] : 'unknown',
      ip: fastify.request ? fastify.request.ip : 'unknown',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Analytics tracking failed:', error);
  }
};

const getFallbackLeaderboard = () => ({
  success: true,
  data: [
    { id: 'demo1', username: 'VibeMaster', avatar: '🌟', score: 1500, rank: 1, level: 5, streak: 7, mediaUploads: 3 },
    { id: 'demo2', username: 'SparkSeeker', avatar: '🚀', score: 1200, rank: 2, level: 4, streak: 5, mediaUploads: 2 },
    { id: 'demo3', username: 'MoodMover', avatar: '🎉', score: 1000, rank: 3, level: 3, streak: 3, mediaUploads: 1 }
  ],
  metadata: { totalUsers: 3, timestamp: new Date().toISOString(), fallback: true }
});

// Authentication Routes
fastify.post('/auth/signup', async (request, reply) => {
  try {
    const { name, email, password } = request.body;
    if (!name || !email || !password) {
      return sendError(reply, 400, 'Name, email, and password are required');
    }
    if (password.length < 8) {
      return sendError(reply, 400, 'Password must be at least 8 characters long');
    }

    const sanitizedEmail = sanitize(email.toLowerCase());
    const sanitizedName = sanitize(name);
    
    if (User) {
      const existingUser = await User.findOne({ email: sanitizedEmail });
      if (existingUser) {
        return sendError(reply, 400, 'User with this email already exists');
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
      }
    };

    let user;
    if (User) {
      user = new User(userData);
      await user.save();
    } else {
      // Demo mode
      user = { _id: `demo_${Date.now()}`, ...userData };
    }

<<<<<<< HEAD
    const token = fastify.jwt.sign({ 
      userId: user._id,
      email: user.email 
    });
    
    reply.send({
      success: true,
      data: {
        token,
=======
    const hashedPassword = await bcrypt.hash(password, 12);
    const referralCode = generateReferralCode();
    
    const userData = {
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
      authProvider: 'email',
      emailVerified: true, // Auto-verify for demo
      referralCode,
      preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging', adventureTypes: ['general'], difficulty: 'easy' },
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
        mediaUploads: 0,
        moodHistory: [],
        choices: [],
        completions: []
      },
      premiumStatus: { active: false, plan: 'basic' }
    };

    let user;
    if (User) {
      user = new User(userData);
      await user.save();
    } else {
      user = { _id: `demo_${Date.now()}`, ...userData };
    }

    const jwtToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });
    await trackEvent('user_signup', user._id, { provider: 'email' });

    const wsConnection = wsConnections.get(user._id.toString());
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'signup',
        data: { message: 'Welcome to SparkVibe!' }
      }));
    }
    
    return reply.send({
      success: true,
      data: {
        token: jwtToken,
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || '👤',
<<<<<<< HEAD
          stats: user.stats
        }
      },
      message: 'Account created successfully!'
    });
  } catch (error) {
    console.error('Signup error:', error);
    reply.status(500).send({
      success: false,
      message: 'Account creation failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// CRITICAL FIX: Sign-in route
fastify.post('/auth/signin', async (request, reply) => {
  try {
    const { email, password } = request.body;
    
    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        message: 'Email and password are required'
      });
    }

=======
          emailVerified: user.emailVerified,
          stats: user.stats,
          achievements: user.achievements || [],
          preferences: user.preferences,
          referralCode: user.referralCode,
          premiumStatus: user.premiumStatus
        }
      },
      message: 'Account created successfully!',
      metadata: { timestamp: new Date().toISOString(), fallback: !User }
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

>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
    const sanitizedEmail = sanitize(email.toLowerCase());
    
    let user;
    if (User) {
      user = await User.findOne({ email: sanitizedEmail });
      if (!user || !user.password) {
<<<<<<< HEAD
        return reply.status(401).send({
          success: false,
          message: 'Invalid email or password'
        });
=======
        return sendError(reply, 401, 'Invalid email or password');
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
<<<<<<< HEAD
        return reply.status(401).send({
          success: false,
          message: 'Invalid email or password'
        });
      }
    } else {
      // Demo mode
      user = {
        _id: `demo_${Date.now()}`,
        name: sanitizedEmail.split('@')[0],
        email: sanitizedEmail,
        avatar: '👤',
=======
        return sendError(reply, 401, 'Invalid email or password');
      }
    } else {
      user = {
        _id: `demo_signin_${Date.now()}`,
        name: sanitizedEmail.split('@')[0],
        email: sanitizedEmail,
        avatar: '👤',
        emailVerified: true,
        authProvider: 'email',
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
        stats: {
          totalPoints: 0,
          level: 1,
          streak: 0,
          cardsGenerated: 0,
          cardsShared: 0,
<<<<<<< HEAD
          lastActivity: new Date()
        }
      };
    }

    const token = fastify.jwt.sign({ 
      userId: user._id,
      email: user.email 
    });
    
    reply.send({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || '👤',
          stats: user.stats
        }
      },
      message: 'Login successful!'
    });
  } catch (error) {
    console.error('Signin error:', error);
    reply.status(500).send({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// CRITICAL FIX: Google auth route
fastify.post('/auth/google', async (request, reply) => {
  try {
    const { token } = request.body;
    
    if (!token) {
      return reply.status(400).send({
        success: false,
        message: 'No token provided'
      });
    }
    
    if (!googleClient) {
      return reply.status(500).send({
        success: false,
        message: 'Google OAuth not configured'
      });
    }
    
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
=======
          mediaUploads: 0,
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
        preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging', adventureTypes: ['general'], difficulty: 'easy' },
        referralCode: generateReferralCode(),
        premiumStatus: { active: false, plan: 'basic' }
      };
    }

    const jwtToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });
    await trackEvent('user_login', user._id, { provider: 'email' });
    
    if (User && user.save) {
      user.stats.lastActivity = new Date();
      await user.save();
    }

    const wsConnection = wsConnections.get(user._id.toString());
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'signin',
        data: { message: 'Successfully signed in!' }
      }));
    }
    
    return reply.send({
      success: true,
      data: {
        token: jwtToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || '👤',
          emailVerified: user.emailVerified,
          stats: user.stats,
          achievements: user.achievements || [],
          preferences: user.preferences,
          referralCode: user.referralCode,
          premiumStatus: user.premiumStatus
        }
      },
      message: 'Login successful!',
      metadata: { timestamp: new Date().toISOString(), fallback: !User }
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
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
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
<<<<<<< HEAD
=======
          referralCode: generateReferralCode(),
          preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging', adventureTypes: ['general'], difficulty: 'easy' },
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
          stats: {
            totalPoints: 0,
            level: 1,
            streak: 0,
            cardsGenerated: 0,
            cardsShared: 0,
<<<<<<< HEAD
            lastActivity: new Date()
          }
=======
            mediaUploads: 0,
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
          premiumStatus: { active: false, plan: 'basic' }
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
        });
        await user.save();
      }
    } else {
<<<<<<< HEAD
      // Demo mode
=======
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
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
<<<<<<< HEAD
          lastActivity: new Date()
        }
      };
    }
    
    const jwtToken = fastify.jwt.sign({ 
      userId: user._id,
      email: user.email 
    });
    
    reply.send({
=======
          mediaUploads: 0,
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
        preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging', adventureTypes: ['general'], difficulty: 'easy' },
        referralCode: generateReferralCode(),
        premiumStatus: { active: false, plan: 'basic' }
      };
    }
    
    const jwtToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });
    await trackEvent('user_login', user._id, { provider: 'google' });

    const wsConnection = wsConnections.get(user._id.toString());
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'google_signin',
        data: { message: 'Successfully signed in with Google!' }
      }));
    }
    
    return reply.send({
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
      success: true,
      data: {
        token: jwtToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          emailVerified: user.emailVerified,
<<<<<<< HEAD
          stats: user.stats
        }
      },
      message: 'Google login successful!'
=======
          stats: user.stats,
          achievements: user.achievements || [],
          preferences: user.preferences,
          referralCode: user.referralCode,
          premiumStatus: user.premiumStatus
        }
      },
      message: 'Google login successful!',
      metadata: { timestamp: new Date().toISOString(), fallback: !User }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return sendError(reply, 500, 'Authentication failed', error.message);
  }
});

fastify.get('/user/profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    
    if (!User) {
      return reply.send({
        success: true,
        data: {
          user: {
            id: userId,
            email: 'demo@sparkvibe.app',
            name: 'Demo User',
            avatar: '🌟',
            preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging', adventureTypes: ['general'], difficulty: 'easy' },
            stats: { totalPoints: 0, level: 1, streak: 0, cardsGenerated: 0, cardsShared: 0, mediaUploads: 0 },
            achievements: [],
            referralCode: 'DEMO123',
            emailVerified: true,
            premiumStatus: { active: false, plan: 'basic' }
          }
        },
        message: 'Profile retrieved from demo mode',
        metadata: { timestamp: new Date().toISOString(), fallback: true }
      });
    }
    
    const user = await User.findById(userId).select('email name avatar preferences stats achievements referralCode emailVerified premiumStatus');
    if (!user) {
      return sendError(reply, 404, 'User not found');
    }

    await trackEvent('profile_view', userId, { timestamp: new Date().toISOString() });
    
    return reply.send({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || '👤',
          preferences: user.preferences,
          stats: user.stats,
          achievements: user.achievements,
          referralCode: user.referralCode,
          emailVerified: user.emailVerified,
          premiumStatus: user.premiumStatus
        }
      },
      message: 'Profile retrieved successfully',
      metadata: { timestamp: new Date().toISOString(), fallback: false }
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
    });
  } catch (error) {
    console.error('Google auth error:', error);
    reply.status(500).send({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

<<<<<<< HEAD
// Server startup with proper error handling
const startServer = async () => {
  try {
    await registerPlugins();
    
    const isMongoConnected = await connectMongoDB();
    if (isMongoConnected) {
      User = mongoose.model('User', UserSchema);
    }

    const port = process.env.PORT || 8080;
    const host = '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log(`🚀 Server running on ${host}:${port}`);
    console.log(`🔄 Demo mode: ${!isMongoConnected}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
=======
fastify.post('/user/sync-stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { totalPoints, level, streak, cardsGenerated, cardsShared, mediaUploads } = request.body;
    
    if (!User) {
      return reply.send({
        success: true,
        data: {
          synced: { totalPoints, level, streak, cardsGenerated, cardsShared, mediaUploads }
        },
        message: 'Stats synced locally (demo mode)',
        metadata: { timestamp: new Date().toISOString(), fallback: true }
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
    user.stats.mediaUploads = mediaUploads !== undefined ? mediaUploads : user.stats.mediaUploads;
    user.stats.lastActivity = new Date();
    
    await user.save();
    await checkAchievements(userId, 'stats_updated');
    
    const wsConnection = wsConnections.get(userId.toString());
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'stats_updated',
        data: { message: 'User stats updated successfully!' }
      }));
    }

    return reply.send({
      success: true,
      data: {
        synced: {
          totalPoints: user.stats.totalPoints,
          level: user.stats.level,
          streak: user.stats.streak,
          cardsGenerated: user.stats.cardsGenerated,
          cardsShared: user.stats.cardsShared,
          mediaUploads: user.stats.mediaUploads
        }
      },
      message: 'User stats synchronized successfully',
      metadata: { timestamp: new Date().toISOString(), fallback: false }
    });
  } catch (error) {
    console.error('Sync stats error:', error);
    return sendError(reply, 500, 'Failed to sync user stats', error.message);
  }
});

fastify.get('/leaderboard', async (request, reply) => {
  try {
    if (!User) {
      return reply.send(getFallbackLeaderboard());
    }
    
    const leaders = await User.find()
      .sort({ 'stats.totalPoints': -1 })
      .limit(10)
      .select('name avatar stats.totalPoints stats.level stats.streak stats.mediaUploads')
      .lean();
      
    const leaderboard = leaders.map((user, index) => ({
      id: user._id,
      username: user.name || 'Anonymous User',
      avatar: user.avatar || '🚀',
      score: user.stats.totalPoints || 0,
      rank: index + 1,
      level: user.stats.level || 1,
      streak: user.stats.streak || 0,
      mediaUploads: user.stats.mediaUploads || 0
    }));

    await trackEvent('leaderboard_view', null, { totalUsers: leaderboard.length });

    return reply.send({
      success: true,
      data: leaderboard,
      metadata: {
        totalUsers: await User.countDocuments(),
        timestamp: new Date().toISOString(),
        fallback: false
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return reply.send(getFallbackLeaderboard());
  }
});

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
    if (category === 'media') sortField = 'stats.mediaUploads';
    
    const leaders = await User.find(dateFilter)
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit))
      .select('name avatar stats achievements referralCode premiumStatus')
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
      mediaUploads: user.stats?.mediaUploads || 0,
      level: user.stats?.level || 1,
      friendsCount: user.stats?.friendsCount || 0,
      challengesWon: user.stats?.challengesWon || 0,
      achievements: (user.achievements || []).slice(0, 3),
      referralCode: user.referralCode,
      isOnline: wsConnections.has(user._id.toString()),
      isPremium: user.premiumStatus?.active || false
    }));
    
    await trackEvent('leaderboard_enhanced_view', null, { category, timeframe, totalUsers: leaderboard.length });

    return reply.send({
      success: true,
      data: leaderboard,
      metadata: {
        category,
        timeframe,
        totalUsers: await User.countDocuments(dateFilter),
        onlineUsers: wsConnections.size,
        timestamp: new Date().toISOString(),
        fallback: false
      }
    });
  } catch (error) {
    console.error('Enhanced leaderboard error:', error);
    return reply.send(getFallbackLeaderboard());
  }
});

fastify.get('/analytics/dashboard', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    
    if (!Analytics || !User || userId === 'demo_user') {
      return reply.send({
        success: true,
        data: {
          overview: {
            totalCards: 10,
            totalPoints: 500,
            level: 5,
            streak: 3,
            cardGrowth: 10,
            streakGrowth: 5,
            shares: 5,
            shareGrowth: 15,
            mediaUploads: 2
          },
          cardActivity: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            data: [2, 3, 1, 4, 2]
          },
          pointHistory: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            data: [100, 150, 50, 200, 100]
          },
          moodDistribution: {
            labels: ['Joy', 'Sadness', 'Anger'],
            data: [40, 30, 20]
          },
          mediaUploads: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            data: [0, 1, 0, 1, 0]
          }
        },
        message: 'Analytics dashboard data retrieved (demo mode)',
        metadata: { timestamp: new Date().toISOString(), fallback: true }
      });
    }

    const user = await User.findById(userId).select('stats');
    if (!user) {
      return sendError(reply, 404, 'User not found');
    }

    const analytics = await Analytics.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          lastEvent: { $max: '$timestamp' }
      }}
    ]);

    const cardActivity = await Analytics.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId), eventType: 'capsule_generated', timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
      }},
      { $sort: { '_id': 1 } }
    ]);

    const pointHistory = await Analytics.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId), eventType: 'points_earned', timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          points: { $sum: '$metadata.points' }
      }},
      { $sort: { '_id': 1 } }
    ]);

    const moodHistory = await User.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(userId) } },
      { $unwind: '$stats.moodHistory' },
      { $group: {
          _id: '$stats.moodHistory.mood.emotion',
          count: { $sum: 1 }
      }}
    ]);

    const mediaUploads = await Analytics.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId), eventType: 'media_uploaded', timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
      }},
      { $sort: { '_id': 1 } }
    ]);

    const analyticsData = {
      overview: {
        totalCards: user.stats.cardsGenerated || 0,
        totalPoints: user.stats.totalPoints || 0,
        level: user.stats.level || 1,
        streak: user.stats.streak || 0,
        cardGrowth: cardActivity.length ? cardActivity.reduce((sum, a) => sum + a.count, 0) : 0,
        streakGrowth: user.stats.bestStreak || 0,
        shares: user.stats.cardsShared || 0,
        shareGrowth: user.stats.cardsGenerated ? Math.round((user.stats.cardsShared / (user.stats.cardsGenerated || 1)) * 100) : 0,
        mediaUploads: user.stats.mediaUploads || 0
      },
      cardActivity: {
        labels: cardActivity.map(a => a._id),
        data: cardActivity.map(a => a.count)
      },
      pointHistory: {
        labels: pointHistory.map(p => p._id),
        data: pointHistory.map(p => p.points)
      },
      moodDistribution: {
        labels: moodHistory.map(m => m._id),
        data: moodHistory.map(m => m.count)
      },
      mediaUploads: {
        labels: mediaUploads.map(m => m._id),
        data: mediaUploads.map(m => m.count)
      }
    };

    await trackEvent('dashboard_view', userId, { timestamp: new Date().toISOString() });

    return reply.send({
      success: true,
      data: analyticsData,
      message: 'Analytics dashboard data retrieved',
      metadata: { timestamp: new Date().toISOString(), fallback: false }
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return sendError(reply, 500, 'Failed to fetch dashboard analytics', error.message);
  }
});

fastify.post('/upload-media', { preHandler: [fastify.authenticate, fastify.multipart] }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const file = await reply.file();
    
    if (!file) {
      return sendError(reply, 400, 'No file uploaded');
    }

    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/') && !file.mimetype.startsWith('audio/')) {
      return sendError(reply, 400, 'Unsupported file type');
    }

    let mediaData;
    try {
      mediaData = cloudinary ? await uploadMediaToCloudinary(file) : await uploadMediaToLocal(file);
    } catch (error) {
      console.error('Media upload error:', error);
      return sendError(reply, 500, 'Failed to upload media', error.message);
    }

    if (Media && userId !== 'demo_user') {
      const media = await Media.create({
        userId,
        url: mediaData.url,
        type: mediaData.type,
        metadata: mediaData.metadata
      });

      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.mediaUploads': 1 }
      });

      await checkAchievements(userId, 'media_uploaded');
    }

    await trackEvent('media_uploaded', userId, {
      type: mediaData.type,
      size: mediaData.metadata.size,
      mimeType: mediaData.metadata.mimeType
    });

    const wsConnection = wsConnections.get(userId.toString());
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'media_uploaded',
        data: { message: 'Media uploaded successfully!', url: mediaData.url }
      }));
    }

    return reply.send({
      success: true,
      data: {
        url: mediaData.url,
        type: mediaData.type,
        metadata: mediaData.metadata
      },
      message: 'Media uploaded successfully',
      metadata: { timestamp: new Date().toISOString(), fallback: !Media }
    });
  } catch (error) {
    console.error('Media upload error:', error);
    return sendError(reply, 500, 'Failed to upload media', error.message);
  }
});

fastify.post('/notifications/subscribe', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { subscription } = request.body;

    if (!subscription || !subscription.endpoint) {
      return sendError(reply, 400, 'Invalid subscription data');
    }

    if (User && userId !== 'demo_user') {
      await User.findByIdAndUpdate(userId, {
        $set: { 'preferences.pushSubscription': subscription }
      });

      if (Notification) {
        await Notification.create({
          userId,
          type: 'subscription',
          title: 'Push Notifications Enabled',
          message: 'You have successfully subscribed to push notifications!',
          data: { subscription }
        });
      }
    }

    const wsConnection = wsConnections.get(userId.toString());
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'subscription',
        data: { message: 'Successfully subscribed to push notifications!' }
      }));
    }

    await trackEvent('notification_subscription', userId, { endpoint: subscription.endpoint });

    return reply.send({
      success: true,
      message: 'Successfully subscribed to push notifications',
      metadata: { timestamp: new Date().toISOString(), fallback: !User }
    });
  } catch (error) {
    console.error('Notification subscription error:', error);
    return sendError(reply, 500, 'Failed to subscribe to notifications', error.message);
  }
});

fastify.post('/premium/create-checkout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { plan } = request.body;

    if (!['basic', 'pro', 'enterprise'].includes(plan)) {
      return sendError(reply, 400, 'Invalid plan type');
    }

    const checkoutSession = {
      id: `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: `https://checkout.stripe.com/pay/cs_test_${Date.now()}`,
      plan,
      createdAt: new Date().toISOString()
    };

    if (User && userId !== 'demo_user') {
      await User.findByIdAndUpdate(userId, {
        $set: {
          'premiumStatus.active': true,
          'premiumStatus.plan': plan,
          'premiumStatus.subscriptionId': checkoutSession.id,
          'premiumStatus.startDate': new Date(),
          'premiumStatus.endDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      await checkAchievements(userId, 'premium_subscription');

      if (Notification) {
        await Notification.create({
          userId,
          type: 'premium',
          title: 'Premium Subscription Activated',
          message: `Your ${plan} premium plan has been activated!`,
          data: { plan, subscriptionId: checkoutSession.id }
        });
      }
    }

    const wsConnection = wsConnections.get(userId.toString());
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'premium_subscription',
        data: { message: `Your ${plan} premium plan has been activated!`, plan }
      }));
    }

    await trackEvent('premium_checkout', userId, { plan, sessionId: checkoutSession.id });

    return reply.send({
      success: true,
      data: checkoutSession,
      message: 'Checkout session created successfully',
      metadata: { timestamp: new Date().toISOString(), fallback: !User }
    });
  } catch (error) {
    console.error('Premium checkout error:', error);
    return sendError(reply, 500, 'Failed to create checkout session', error.message);
  }
});

fastify.get('/trending-adventures', async (request, reply) => {
  try {
    if (!Adventure) {
      return reply.send({
        success: true,
        data: [
          { id: 'demo1', title: 'Mindful Moments', category: 'wellness', completions: 100, shares: 50, viralPotential: 0.8 },
          { id: 'demo2', title: 'Creative Spark', category: 'creativity', completions: 80, shares: 40, viralPotential: 0.7 }
        ],
        message: 'Trending adventures retrieved (demo mode)',
        metadata: { timestamp: new Date().toISOString(), fallback: true }
      });
    }

    const adventures = await Adventure.find({ isActive: true })
      .sort({ completions: -1, shares: -1, viralPotential: -1 })
      .limit(10)
      .select('title description category completions shares viralPotential isFeatured tags rewards');

    return reply.send({
      success: true,
      data: adventures,
      message: 'Trending adventures retrieved',
      metadata: { timestamp: new Date().toISOString(), total: adventures.length, fallback: false }
    });
  } catch (error) {
    console.error('Trending adventures error:', error);
    return sendError(reply, 500, 'Failed to fetch trending adventures', error.message);
  }
});

fastify.post('/analyze-mood', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { emotion, intensity } = request.body;

    if (!emotion || intensity === undefined) {
      return sendError(reply, 400, 'Emotion and intensity are required');
    }

    const moodData = { emotion, intensity, timestamp: new Date() };

    if (User && userId !== 'demo_user') {
      await User.findByIdAndUpdate(userId, {
        $push: { 'stats.moodHistory': moodData }
      });
    }

    await trackEvent('mood_analyzed', userId, { emotion, intensity });

    const wsConnection = wsConnections.get(userId.toString());
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'mood_analyzed',
        data: { message: 'Mood analyzed successfully!', emotion }
      }));
    }

    return reply.send({
      success: true,
      data: moodData,
      message: 'Mood analyzed successfully',
      metadata: { timestamp: new Date().toISOString(), fallback: !User }
    });
  } catch (error) {
    console.error('Mood analysis error:', error);
    return sendError(reply, 500, 'Failed to analyze mood', error.message);
  }
});

fastify.post('/generate-capsule-simple', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { category, difficulty } = request.body;

    if (!category) {
      return sendError(reply, 400, 'Category is required');
    }

    let adventure;
    if (Adventure) {
      adventure = await Adventure.findOne({ category, isActive: true }).sort({ completions: -1 });
    }

    if (!adventure) {
      adventure = {
        title: 'Sample Adventure',
        description: 'A fun sample adventure for demo mode',
        category,
        difficulty: difficulty || 'easy',
        rewards: { points: 25 },
        template: 'cosmic'
      };
    }

    const capsule = {
      capsuleId: `cap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adventure,
      createdAt: new Date()
    };

    if (VibeCard && userId !== 'demo_user') {
      await VibeCard.create({
        userId,
        capsuleId: capsule.capsuleId,
        content: { adventure },
        design: { template: adventure.template || 'cosmic', colors: ['#1a1a2e', '#533483'], style: 'modern' }
      });

      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.cardsGenerated': 1 }
      });

      await checkAchievements(userId, 'capsule_generated');
    }

    await trackEvent('capsule_generated', userId, { category, difficulty });

    const wsConnection = wsConnections.get(userId.toString());
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'capsule_generated',
        data: { message: 'Capsule generated successfully!', capsuleId: capsule.capsuleId }
      }));
    }

    return reply.send({
      success: true,
      data: capsule,
      message: 'Capsule generated successfully',
      metadata: { timestamp: new Date().toISOString(), fallback: !Adventure }
    });
  } catch (error) {
    console.error('Capsule generation error:', error);
    return sendError(reply, 500, 'Failed to generate capsule', error.message);
  }
});

fastify.post('/generate-enhanced-vibe-card', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { capsuleId, template = 'cosmic' } = request.body;

    if (!capsuleId) {
      return sendError(reply, 400, 'Capsule ID is required');
    }

    let vibeCard, user;
    if (VibeCard && User && userId !== 'demo_user') {
      vibeCard = await VibeCard.findOne({ capsuleId, userId });
      user = await User.findById(userId).select('name stats');
      if (!vibeCard || !user) {
        return sendError(reply, 404, 'Capsule or user not found');
      }
    } else {
      user = { name: 'Demo User', stats: { totalPoints: 500, streak: 3 } };
      vibeCard = {
        capsuleId,
        content: {
          adventure: { title: 'Sample Adventure', rewards: { points: 25 } },
          achievement: { points: 25, streak: 3 },
          user: { name: 'Demo User' }
        }
      };
    }

    const cardData = {
      content: {
        adventure: vibeCard.content.adventure,
        achievement: { points: user.stats.totalPoints, streak: user.stats.streak },
        user: { name: user.name }
      },
      design: { template, colors: ['#1a1a2e', '#533483'], style: 'modern' }
    };

    const imageBuffer = await createVibeCardImage(cardData);
    if (!imageBuffer) {
      return sendError(reply, 500, 'Failed to generate vibe card image');
    }

    let imageUrl;
    if (cloudinary) {
      const uploadResult = await cloudinary.uploader.upload_stream({
        resource_type: 'image',
        folder: 'sparkvibe_cards',
        public_id: `card_${capsuleId}_${Date.now()}`
      }).end(imageBuffer);
      imageUrl = uploadResult.secure_url;
    } else {
      const fileName = `card_${capsuleId}_${Date.now()}.png`;
      const filePath = path.join(__dirname, 'uploads', fileName);
      await require('fs').promises.writeFile(filePath, imageBuffer);
      imageUrl = `/uploads/${fileName}`;
    }

    if (VibeCard && userId !== 'demo_user') {
      await VibeCard.findOneAndUpdate(
        { capsuleId, userId },
        { $set: { 'design.template': template, 'content.imageUrl': imageUrl } }
      );
    }

    await trackEvent('vibe_card_generated', userId, { capsuleId, template });

    const wsConnection = wsConnections.get(userId.toString());
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'vibe_card_generated',
        data: { message: 'Vibe card generated successfully!', imageUrl }
      }));
    }

    return reply.send({
      success: true,
      data: { imageUrl, capsuleId, template },
      message: 'Vibe card generated successfully',
      metadata: { timestamp: new Date().toISOString(), fallback: !VibeCard }
    });
  } catch (error) {
    console.error('Vibe card generation error:', error);
    return sendError(reply, 500, 'Failed to generate vibe card', error.message);
  }
});

fastify.get('/friends', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;

    if (!User) {
      return reply.send({
        success: true,
        data: [
          { userId: 'demo1', username: 'Friend1', avatar: '😊', status: 'accepted' },
          { userId: 'demo2', username: 'Friend2', avatar: '🚀', status: 'pending' }
        ],
        message: 'Friends retrieved (demo mode)',
        metadata: { timestamp: new Date().toISOString(), fallback: true }
      });
    }

    const user = await User.findById(userId).select('friends').populate('friends.userId', 'name avatar');
    if (!user) {
      return sendError(reply, 404, 'User not found');
    }

    const friends = user.friends.map(f => ({
      userId: f.userId._id,
      username: f.userId.name,
      avatar: f.userId.avatar || '👤',
      status: f.status,
      connectedAt: f.connectedAt
    }));

    await trackEvent('friends_view', userId, { totalFriends: friends.length });

    return reply.send({
      success: true,
      data: friends,
      message: 'Friends retrieved successfully',
      metadata: { timestamp: new Date().toISOString(), totalFriends: friends.length, fallback: false }
    });
  } catch (error) {
    console.error('Friends fetch error:', error);
    return sendError(reply, 500, 'Failed to fetch friends', error.message);
  }
});

fastify.get('/challenges', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;

    if (!User) {
      return reply.send({
        success: true,
        data: [
          { id: 'demo1', type: 'streak', target: 5, status: 'active', deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          { id: 'demo2', type: 'points', target: 100, status: 'pending', deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }
        ],
        message: 'Challenges retrieved (demo mode)',
        metadata: { timestamp: new Date().toISOString(), fallback: true }
      });
    }

    const user = await User.findById(userId).select('challenges').populate('challenges.challengerId challenges.challengedId', 'name avatar');
    if (!user) {
      return sendError(reply, 404, 'User not found');
    }

    const challenges = user.challenges.map(c => ({
      id: c._id,
      challenger: c.challengerId ? { id: c.challengerId._id, name: c.challengerId.name, avatar: c.challengerId.avatar || '👤' } : null,
      challenged: c.challengedId ? { id: c.challengedId._id, name: c.challengedId.name, avatar: c.challengedId.avatar || '👤' } : null,
      type: c.type,
      status: c.status,
      target: c.target,
      deadline: c.deadline,
      createdAt: c.createdAt,
      completedAt: c.completedAt,
      winner: c.winner ? { id: c.winner._id, name: c.winner.name, avatar: c.winner.avatar || '👤' } : null
    }));

    await trackEvent('challenges_view', userId, { totalChallenges: challenges.length });

    return reply.send({
      success: true,
      data: challenges,
      message: 'Challenges retrieved successfully',
      metadata: { timestamp: new Date().toISOString(), totalChallenges: challenges.length, fallback: false }
    });
  } catch (error) {
    console.error('Challenges fetch error:', error);
    return sendError(reply, 500, 'Failed to fetch challenges', error.message);
  }
});

fastify.post('/track-event', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { eventType, metadata } = request.body;

    if (!eventType) {
      return sendError(reply, 400, 'Event type is required');
    }

    await trackEvent(eventType, userId, metadata);

    return reply.send({
      success: true,
      message: 'Event tracked successfully',
      metadata: { timestamp: new Date().toISOString(), fallback: !Analytics }
    });
  } catch (error) {
    console.error('Event tracking error:', error);
    return sendError(reply, 500, 'Failed to track event', error.message);
  }
});

fastify.get('/notifications', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;

    if (!Notification) {
      return reply.send({
        success: true,
        data: [
          { id: 'demo1', type: 'achievement', title: 'First Steps', message: 'You completed your first adventure!', read: false, createdAt: new Date() },
          { id: 'demo2', type: 'subscription', title: 'Notifications Enabled', message: 'Push notifications activated!', read: true, createdAt: new Date() }
        ],
        message: 'Notifications retrieved (demo mode)',
        metadata: { timestamp: new Date().toISOString(), fallback: true }
      });
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    await trackEvent('notifications_view', userId, { totalNotifications: notifications.length });

    return reply.send({
      success: true,
      data: notifications,
      message: 'Notifications retrieved successfully',
      metadata: { timestamp: new Date().toISOString(), totalNotifications: notifications.length, fallback: false }
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return sendError(reply, 500, 'Failed to fetch notifications', error.message);
  }
});

fastify.post('/notifications/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;
    const { notificationIds } = request.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return sendError(reply, 400, 'Notification IDs must be an array');
    }

    if (Notification && userId !== 'demo_user') {
      await Notification.updateMany(
        { userId, _id: { $in: notificationIds } },
        { $set: { read: true } }
      );
    }

    await trackEvent('notifications_read', userId, { count: notificationIds.length });

    const wsConnection = wsConnections.get(userId.toString());
    if (wsConnection) {
      wsConnection.send(JSON.stringify({
        type: 'notifications_read',
        data: { message: 'Notifications marked as read', count: notificationIds.length }
      }));
    }

    return reply.send({
      success: true,
      message: 'Notifications marked as read',
      metadata: { timestamp: new Date().toISOString(), count: notificationIds.length, fallback: !Notification }
    });
  } catch (error) {
    console.error('Notifications read error:', error);
    return sendError(reply, 500, 'Failed to mark notifications as read', error.message);
  }
});

// WebSocket Setup
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    try {
      const userId = req.query.userId || `anonymous_${Date.now()}`;
      
      wsConnections.set(userId.toString(), connection.socket);
      console.log(`🔗 WebSocket connected for user: ${userId}`);

      connection.socket.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          console.log(`📩 WebSocket message received from ${userId}:`, data);

          if (data.type === 'ping') {
            connection.socket.send(JSON.stringify({ type: 'pong', data: { message: 'Pong!' } }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
          connection.socket.send(JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' }
          }));
        }
      });

      connection.socket.on('close', () => {
        wsConnections.delete(userId.toString());
        console.log(`🔌 WebSocket disconnected for user: ${userId}`);
      });

      connection.socket.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
        wsConnections.delete(userId.toString());
      });

      // Send initial connection message
      connection.socket.send(JSON.stringify({
        type: 'connection',
        data: { message: 'WebSocket connection established' }
      }));
    } catch (error) {
      console.error('WebSocket setup error:', error);
      connection.socket.close();
    }
  });
});

// MongoDB Connection with Retry Logic
const connectMongoDB = async () => {
  const maxRetries = 5;
  let attempt = 1;

  while (attempt <= maxRetries) {
    try {
      if (process.env.MONGODB_URI) {
        await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
        console.log('✅ MongoDB connected successfully');

        // Initialize models
        User = mongoose.model('User', UserSchema);
        Adventure = mongoose.model('Adventure', AdventureSchema);
        VibeCard = mongoose.model('VibeCard', VibeCardSchema);
        Analytics = mongoose.model('Analytics', AnalyticsSchema);
        Notification = mongoose.model('Notification', NotificationSchema);
        Media = mongoose.model('Media', MediaSchema);

        return true;
      } else {
        console.warn('⚠️ MONGODB_URI not provided, running in demo mode');
        return false;
      }
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) {
        console.warn('⚠️ Max retries reached, running in demo mode');
        return false;
      }
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`⏳ Retrying MongoDB connection in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
};

// Redis Connection (Optional)
const connectRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.connect();
      console.log('✅ Redis connected successfully');
      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      return false;
    }
  }
  return false;
};

// Server Startup
const startServer = async () => {
  try {
    await registerPlugins();

    const isMongoConnected = await connectMongoDB();
    await connectRedis();

    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
    console.log(`🔄 Demo mode: ${!isMongoConnected}`);
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

<<<<<<< HEAD
// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('⏳ Shutting down server...');
  try {
    await fastify.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    console.log('✅ Server closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

startServer();
=======
// Graceful Shutdown
const shutdown = async () => {
  console.log('⏳ Initiating graceful shutdown...');

  // Close WebSocket connections
  for (const [userId, socket] of wsConnections.entries()) {
    socket.send(JSON.stringify({
      type: 'shutdown',
      data: { message: 'Server is shutting down' }
    }));
    socket.close();
    wsConnections.delete(userId);
  }

  // Close MongoDB connection
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      console.log('✅ MongoDB connection closed');
    } catch (error) {
      console.error('❌ Error closing MongoDB connection:', error.message);
    }
  }

  // Close Redis connection
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.quit();
      console.log('✅ Redis connection closed');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error.message);
    }
  }

  // Close Fastify server
  try {
    await fastify.close();
    console.log('✅ Server closed successfully');
  } catch (error) {
    console.error('❌ Error closing server:', error.message);
  }

  process.exit(0);
};

// Handle process termination
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
startServer();
>>>>>>> b52517883f3974d6d175c2d3467a7fd3145dd5ee
