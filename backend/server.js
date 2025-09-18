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
const { OAuth2Client } = require('google-auth-library');

// Load environment variables
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID'];
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

// Google OAuth initialization
try {
  googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  console.log('✅ Google OAuth initialized');
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
          'http://localhost:8080',
          'https://backend-sv-3n4v6.ondigitalocean.app'
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
      secret: process.env.JWT_SECRET,
      sign: { expiresIn: '1h' }
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
    
    const generateReferralCode = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const checkAchievements = async (userId, actionType, metadata = {}) => {
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
            await Notification.create({
              userId,
              type: 'achievement',
              title: 'Achievement Unlocked!',
              message: `You've earned the "${achievement.title}" achievement!`,
              data: { achievement }
            });
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

        connection.socket.on('close', (code, reason) => {
          if (userId) {
            wsConnections.delete(userId);
            console.log(`WebSocket disconnected: ${userId}, Code: ${code}, Reason: ${reason || 'No reason'}`);
          }
          if (code === 1006) {
            console.warn('Abnormal WebSocket closure (1006) - Check load balancer timeout');
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

        const existingUser = await User.findOne({ email: sanitizedEmail });
        if (existingUser) {
          return sendError(reply, 400, 'User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 12);
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

        const jwtToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });
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

    // Google Auth Route
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

        let user = await User.findOne({ googleId: payload.sub });
        if (!user) {
          user = new User({
            googleId: payload.sub,
            email: sanitize(payload.email),
            name: sanitize(payload.name),
            avatar: payload.picture,
            emailVerified: payload.email_verified,
            authProvider: 'google',
            referralCode: generateReferralCode(),
            preferences: {
              interests: ['wellness', 'creativity'],
              aiPersonality: 'encouraging'
            }
          });
          await user.save();
        }

        const jwtToken = fastify.jwt.sign({
          userId: user._id,
          email: user.email,
          name: user.name,
          googleId: user.googleId
        }, { expiresIn: '1h' });

        await trackEvent('user_login', user._id, { provider: 'google' });

        return reply.send({
          success: true,
          token: jwtToken,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            points: user.stats.totalPoints,
            emailVerified: user.emailVerified,
            preferences: user.preferences,
            referralCode: user.referralCode
          }
        });
      } catch (error) {
        console.error('Google auth error:', error);
        return sendError(reply, 500, 'Authentication failed', error.message);
      }
    });

// User Profile Route
fastify.get('/user/profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;

    if (mongoose.connection.readyState !== 1) {
      return reply.send({
        success: true,
        message: 'Profile retrieved from fallback (database unavailable)',
        user: {
          id: userId,
          email: 'user@example.com',
          name: 'Anonymous User',
          avatar: '🌟',
          preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging' },
          stats: { totalPoints: 0, level: 1, streak: 0, cardsGenerated: 0, cardsShared: 0 },
          fallback: true
        }
      });
    }

    const user = await User.findById(userId).select(
      'email name avatar preferences stats achievements referralCode emailVerified'
    );
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

    // Leaderboard Route
    fastify.get('/leaderboard', async (request, reply) => {
      try {
        if (mongoose.connection.readyState !== 1) {
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

    // Trending Adventures Route
    fastify.get('/trending-adventures', async (request, reply) => {
      try {
        if (mongoose.connection.readyState !== 1) {
          return reply.send({
            success: true,
            trending: [],
            viralAdventure: {},
            metadata: { lastUpdated: new Date().toISOString(), fallback: true }
          });
        }

        const trending = await Adventure.find()
          .sort({ completions: -1 })
          .limit(3)
          .lean();

        const viralAdventure = trending[0] || {};

        return reply.send({
          success: true,
          trending,
          viralAdventure,
          metadata: { lastUpdated: new Date().toISOString(), fallback: false }
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

    // Sync Stats Route
    fastify.post('/user/sync-stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const userId = request.user.userId;
        const { totalPoints, level, streak, cardsGenerated, cardsShared } = request.body;

        if (mongoose.connection.readyState !== 1) {
          return reply.send({
            success: true,
            message: 'Stats synced locally (database unavailable)',
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

    // Save Profile Route
    fastify.post('/user/save-profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const userId = request.user.userId;
        const { name, avatar, preferences } = request.body;

        if (mongoose.connection.readyState !== 1) {
          return reply.send({
            success: true,
            message: 'Profile saved locally (database unavailable)',
            user: { id: userId, name, avatar, preferences },
            fallback: true
          });
        }

        const user = await User.findById(userId);
        if (!user) {
          return sendError(reply, 404, 'User not found');
        }

        user.name = sanitize(name) || user.name;
        user.avatar = sanitize(avatar) || user.avatar;
        if (preferences) {
          user.preferences = { ...user.preferences, ...sanitize(preferences) };
        }
        user.stats.lastActivity = new Date();

        await user.save();

        return reply.send({
          success: true,
          message: 'Profile saved successfully',
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            preferences: user.preferences
          },
          fallback: false
        });
      } catch (error) {
        console.error('Save profile error:', error);
        return sendError(reply, 500, 'Failed to save profile', error.message);
      }
    });

    // Existing routes (unchanged)
    fastify.post('/generate-enhanced-vibe-card', async (request, reply) => {
      try {
        const { moodData, choices, user } = request.body;
        
        console.log('Enhanced vibe card generation requested:', { 
          mood: moodData?.mood,
          choicesCount: Object.keys(choices || {}).length,
          userName: user?.name
        });

        const completedPhases = Object.keys(choices || {}).length;
        const basePoints = 25;
        const phaseBonus = completedPhases * 15;
        const totalPoints = basePoints + phaseBonus;

        const enhancedContent = await generateEnhancedContent(choices, moodData, user);
        
        const enhancedVibeCard = {
          id: `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'enhanced',
          version: '2.0',
          content: {
            title: enhancedContent.title,
            subtitle: 'Your Multi-Phase Adventure Journey',
            adventure: {
              choice: choices.adventure?.title || 'Creative Expression',
              outcome: enhancedContent.adventure.outcome,
              impact: enhancedContent.adventure.impact,
              visual: enhancedContent.adventure.visual
            },
            reflection: {
              choice: choices.reflection?.title || 'Personal Growth',
              insight: enhancedContent.reflection.insight,
              wisdom: enhancedContent.reflection.wisdom,
              mantra: enhancedContent.reflection.mantra
            },
            action: {
              choice: choices.action?.title || 'Daily Practice',
              commitment: enhancedContent.action.commitment,
              strategy: enhancedContent.action.strategy,
              timeline: enhancedContent.action.timeline
            },
            achievement: {
              totalPoints: totalPoints,
              phasesCompleted: completedPhases,
              badge: getBadgeForPhases(completedPhases),
              level: calculateLevel(user?.totalPoints || 0, totalPoints),
              streak: Math.floor(Math.random() * 10) + 1,
              timestamp: new Date().toISOString()
            },
            moodJourney: {
              before: moodData?.mood || 'curious',
              after: enhancedContent.finalMood,
              transformation: enhancedContent.moodTransformation,
              energyBoost: `+${Math.floor(Math.random() * 25) + 15}%`
            }
          },
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
          user: {
            name: user?.name || 'Vibe Explorer',
            avatar: user?.avatar || '🌟',
            level: calculateLevel(user?.totalPoints || 0, totalPoints),
            totalPoints: (user?.totalPoints || 0) + totalPoints,
            streak: user?.streak || 1,
            badgeCount: (user?.badgeCount || 0) + 1
          },
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
          analytics: {
            viralScore: calculateViralScore(choices, moodData, enhancedContent),
            engagementPotential: calculateEngagement(enhancedContent),
            personalityMatch: calculatePersonalityMatch(choices),
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

    // Helper functions for enhanced generation
    async function generateEnhancedContent(choices, moodData, user) {
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
      let score = 0.5;
      if (content.adventure?.outcome?.length > 20) score += 0.1;
      if (content.reflection?.mantra?.length > 10) score += 0.1;
      if (content.action?.commitment?.length > 15) score += 0.1;
      const positiveMoods = ['happy', 'excited', 'inspired', 'grateful'];
      if (positiveMoods.includes(moodData?.mood)) score += 0.2;
      return Math.min(score, 1.0);
    }

    function calculateEngagement(content) {
      return Math.random() * 0.3 + 0.7;
    }

    function calculatePersonalityMatch(choices) {
      return Math.random() * 0.2 + 0.8;
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

    fastify.post('/track-share', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { cardId, platform, url } = request.body;
        const userId = request.user.userId;

        if (!cardId || !platform) {
          return sendError(reply, 400, 'Card ID and platform are required');
        }

        const vibeCard = await VibeCard.findByIdAndUpdate(cardId, {
          $inc: { 'analytics.shares': 1 },
          $push: { 'sharing.platforms': platform },
          'sharing.lastShared': new Date()
        }, { new: true });

        if (!vibeCard) {
          return sendError(reply, 404, 'Vibe card not found');
        }

        await User.findByIdAndUpdate(userId, {
          $inc: { 'stats.cardsShared': 1 },
          'stats.lastActivity': new Date()
        });

        if (vibeCard.analytics.shares >= 100) {
          await checkAchievements(userId, 'viral_achievement', { shares: vibeCard.analytics.shares });
        }

        await trackEvent('card_shared', userId, { 
          cardId, 
          platform, 
          totalShares: vibeCard.analytics.shares 
        });

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

    fastify.get('/leaderboard-enhanced', async (request, reply) => {
      try {
        const { category = 'points', limit = 10, timeframe = 'all' } = request.query;

        if (mongoose.connection.readyState !== 1) {
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

        const user = await User.findById(userId);
        const existingFriend = user.friends.find(f => f.userId.toString() === friendId);
        
        if (existingFriend) {
          return sendError(reply, 400, 'Friend request already exists or you are already friends');
        }

        await User.findByIdAndUpdate(userId, {
          $push: { 
            friends: { 
              userId: friendId, 
              status: 'pending', 
              connectedAt: new Date() 
            } 
          }
        });

        await Notification.create({
          userId: friendId,
          type: 'friend_request',
          title: 'New Friend Request',
          message: `${user.name} wants to be your friend!`,
          data: { requesterId: userId, requesterName: user.name }
        });

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

        await checkAchievements(userId, 'friend_added');
        await checkAchievements(requesterId, 'friend_added');

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

    fastify.post('/challenges/create', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { friendId, type, target, deadline } = request.body;
        const userId = request.user.userId;

        if (!friendId || !type || !target) {
          return sendError(reply, 400, 'Friend ID, challenge type, and target are required');
        }

        const validTypes = ['streak', 'points', 'adventure', 'cards'];
        if (!validTypes.includes(type)) {
          return sendError(reply, 400, 'Invalid challenge type');
        }

        const challenge = {
          challengerId: userId,
          challengedId: friendId,
          type,
          target,
          deadline: deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending'
        };

        await User.findByIdAndUpdate(userId, {
          $push: { challenges: challenge }
        });

        const challenger = await User.findById(userId);
        await Notification.create({
          userId: friendId,
          type: 'challenge',
          title: 'New Challenge',
          message: `${challenger.name} challenged you to a ${type} challenge!`,
          data: { challenge, challengerName: challenger.name }
        });

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

// Get User Challenges Route
fastify.get('/challenges', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;

    if (mongoose.connection.readyState !== 1) {
      return reply.send({
        success: true,
        message: 'Challenges retrieved from fallback (database unavailable)',
        challenges: [
          {
            id: 'offline-challenge-1',
            title: 'Daily Wellness Challenge',
            description: 'Complete a 10-minute meditation session',
            category: 'Wellness',
            points: 50,
            status: 'available',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'offline-challenge-2',
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

    // Transform challenges to match client-side expectations
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

// Add to server.js before startServer()
fastify.get('/friends', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const userId = request.user.userId;

    if (mongoose.connection.readyState !== 1) {
      return reply.send({
        success: true,
        message: 'Friends retrieved from fallback (database unavailable)',
        data: [
          {
            id: 'fallback-friend-1',
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

    async function checkServiceHealth() {
      const services = {};

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

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
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

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});