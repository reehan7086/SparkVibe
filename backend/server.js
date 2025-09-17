// backend/server.js - SparkVibe Backend Server - COMPLETE RESOLVED VERSION
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
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const sanitize = require('mongo-sanitize');

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

// MongoDB Schemas
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
    pushSubscription: Object
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
    moodHistory: [{ mood: Object, timestamp: Date }],
    choices: [{ choice: String, capsuleId: String, timestamp: Date }]
  },
  achievements: [{ id: String, unlockedAt: Date, type: String }],
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
  createdAt: { type: Date, default: Date.now }
});

// Create indexes
UserSchema.index({ email: 1 }, { unique: true });
AdventureSchema.index({ category: 1, completions: -1 });

const User = mongoose.model('User', UserSchema);
const Adventure = mongoose.model('Adventure', AdventureSchema);

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

    // Register Fastify plugins
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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

    // ===== BASIC ROUTES =====
    fastify.get('/', async (request, reply) => {
      const services = await checkServiceHealth();
      return reply.send({
        message: 'SparkVibe API Server - v2.1.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        services,
        environment: process.env.NODE_ENV || 'development',
        mongodb: {
          connected: mongoose.connection.readyState === 1,
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        }
      });
    });

    fastify.get('/health', async (request, reply) => {
      const health = {
        status: 'OK',
        message: 'SparkVibe Backend is healthy',
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
        }
      };

      if (mongoose.connection.readyState === 1) {
        try {
          health.mongodb.collections.users = await User.countDocuments();
          health.mongodb.collections.adventures = await Adventure.countDocuments();
        } catch (error) {
          health.mongodb.error = error.message;
        }
      }

      return reply.send(health);
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

        // Create user
        const user = new User({
          name: sanitizedName,
          email: sanitizedEmail,
          password: hashedPassword,
          authProvider: 'email',
          emailVerified: process.env.NODE_ENV === 'development' ? true : false,
          preferences: { 
            interests: ['wellness', 'creativity'], 
            aiPersonality: 'encouraging' 
          }
        });

        await user.save();

        // Generate JWT token
        const jwtToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });

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
            preferences: user.preferences
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

        if (mongoose.connection.readyState !== 1) {
          return sendError(reply, 503, 'Database connection unavailable');
        }

        const sanitizedEmail = sanitize(email.toLowerCase());
        
        // Find user
        const user = await User.findOne({ email: sanitizedEmail, authProvider: 'email' });
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return sendError(reply, 401, 'Invalid email or password');
        }

        // Check email verification (skip in development)
        if (!user.emailVerified && process.env.NODE_ENV !== 'development') {
          return sendError(reply, 403, 'Email not verified');
        }

        // Update last activity
        user.stats.lastActivity = new Date();
        await user.save();

        // Generate JWT token
        const jwtToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });

        return reply.send({
          success: true,
          token: jwtToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            emailVerified: user.emailVerified,
            stats: user.stats,
            achievements: user.achievements,
            preferences: user.preferences
          }
        });
      } catch (error) {
        return sendError(reply, 500, 'Sign in failed', error.message);
      }
    });

    if (googleClient) {
      fastify.post('/auth/google', async (request, reply) => {
        try {
          const { token } = request.body;
          
          console.log('Google auth request received');
          console.log('Token type:', typeof token);
          console.log('Token length:', token?.length);
          console.log('Token preview:', token?.substring(0, 50) + '...');
          
          if (!token) {
            return sendError(reply, 400, 'Google token is required');
          }

          if (typeof token !== 'string') {
            return sendError(reply, 400, 'Google token must be a string');
          }

          // Check if token looks like a valid JWT (3 parts separated by dots)
          const tokenParts = token.split('.');
          if (tokenParts.length !== 3) {
            console.error(`Invalid JWT format: ${tokenParts.length} segments instead of 3`);
            return sendError(reply, 401, `Invalid Google token format: ${tokenParts.length} segments`);
          }

          if (mongoose.connection.readyState !== 1) {
            return sendError(reply, 503, 'Database connection unavailable');
          }

          console.log('Attempting to verify Google ID token...');

          let ticket;
          try {
            // Verify Google ID token
            ticket = await googleClient.verifyIdToken({
              idToken: token.trim(), // Trim any whitespace
              audience: process.env.GOOGLE_CLIENT_ID
            });
          } catch (verifyError) {
            console.error('Google token verification failed:', verifyError.message);
            
            // More specific error handling
            if (verifyError.message.includes('Wrong number of segments')) {
              return sendError(reply, 401, 'Invalid Google token format - token appears corrupted');
            }
            if (verifyError.message.includes('Invalid token signature')) {
              return sendError(reply, 401, 'Invalid Google token signature');
            }
            if (verifyError.message.includes('Token used too early')) {
              return sendError(reply, 401, 'Google token used too early');
            }
            if (verifyError.message.includes('Token used too late')) {
              return sendError(reply, 401, 'Google token expired');
            }
            
            return sendError(reply, 401, `Google token verification failed: ${verifyError.message}`);
          }

          const payload = ticket.getPayload();
          if (!payload) {
            return sendError(reply, 401, 'Invalid Google token payload');
          }

          console.log('Google token verified successfully');
          console.log('User email:', payload.email);
          console.log('User name:', payload.name);

          const { sub: googleId, name, email, picture: avatar, email_verified } = payload;

          if (!email_verified) {
            return sendError(reply, 401, 'Google account email is not verified');
          }

          // Sanitize user data
          const sanitizedEmail = sanitize(email.toLowerCase());
          const sanitizedName = sanitize(name);

          // Find or create user
          let user = await User.findOne({ googleId });
          
          if (!user) {
            // Check if user exists with this email but different provider
            user = await User.findOne({ email: sanitizedEmail });
            
            if (user) {
              // Link existing account to Google
              console.log('Linking existing account to Google');
              user.googleId = googleId;
              user.avatar = avatar;
              user.authProvider = 'google';
              user.emailVerified = true;
            } else {
              // Create new user
              console.log('Creating new Google user');
              user = new User({
                email: sanitizedEmail,
                name: sanitizedName,
                avatar,
                googleId,
                authProvider: 'google',
                emailVerified: true,
                preferences: { 
                  interests: ['wellness', 'creativity'], 
                  aiPersonality: 'encouraging' 
                }
              });
            }
            
            await user.save();
            console.log('User saved successfully');
          } else {
            console.log('Existing Google user found');
            // Update user info if needed
            if (user.avatar !== avatar) {
              user.avatar = avatar;
              await user.save();
            }
          }

          // Update last activity
          user.stats.lastActivity = new Date();
          await user.save();

          // Generate JWT token for our app
          const jwtToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });

          return reply.send({
            success: true,
            message: 'Google authentication successful',
            token: jwtToken,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              emailVerified: user.emailVerified,
              stats: user.stats,
              achievements: user.achievements,
              preferences: user.preferences,
              provider: 'google'
            }
          });
        } catch (error) {
          console.error('Google authentication error:', error);
          return sendError(reply, 500, 'Google authentication failed', error.message);
        }
      });
    }

    // ===== USER ROUTES =====
    fastify.get('/user/profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const userId = request.user.userId;
        const user = await User.findById(userId).select('-password').lean();
        
        if (!user) {
          return sendError(reply, 404, 'User not found');
        }

        return reply.send({
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            emailVerified: user.emailVerified,
            stats: user.stats,
            achievements: user.achievements,
            preferences: user.preferences
          }
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to fetch profile', error.message);
      }
    });

    // ===== MOOD AND ADVENTURE ROUTES =====
    fastify.post('/analyze-mood', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { textInput, timeOfDay } = request.body;
        
        if (!textInput) {
          return sendError(reply, 400, 'Text input is required');
        }

        const userId = request.user.userId;
        let analysis;

        if (openai) {
          try {
            analysis = await analyzeWithOpenAI(textInput, timeOfDay);
          } catch (error) {
            console.warn('OpenAI analysis failed:', error.message);
            analysis = generateFallbackMoodAnalysis(textInput, timeOfDay);
          }
        } else {
          analysis = generateFallbackMoodAnalysis(textInput, timeOfDay);
        }

        // Update user's last activity
        if (mongoose.connection.readyState === 1) {
          await User.findByIdAndUpdate(userId, {
            'stats.lastActivity': new Date(),
            $push: { 'stats.moodHistory': { mood: analysis, timestamp: new Date() } }
          });
        }

        return reply.send(analysis);
      } catch (error) {
        return sendError(reply, 500, 'Mood analysis failed', error.message);
      }
    });

    fastify.post('/generate-capsule-simple', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { mood, interests, timeOfDay, moodAnalysis } = request.body;
        
        if (!mood) {
          return sendError(reply, 400, 'Mood is required');
        }

        const userId = request.user.userId;
        let capsuleData;

        if (openai) {
          try {
            capsuleData = await generateWithOpenAI(mood, interests, timeOfDay, moodAnalysis);
          } catch (error) {
            console.warn('OpenAI capsule generation failed:', error.message);
            capsuleData = generateFallbackCapsule(mood, timeOfDay, interests);
          }
        } else {
          capsuleData = generateFallbackCapsule(mood, timeOfDay, interests);
        }

        // Update user stats
        if (mongoose.connection.readyState === 1) {
          await User.findByIdAndUpdate(userId, {
            'stats.lastActivity': new Date()
          });
        }

        return reply.send(capsuleData);
      } catch (error) {
        return sendError(reply, 500, 'Capsule generation failed', error.message);
      }
    });

    fastify.post('/adventure/complete', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { capsuleId, completionData } = request.body;
        const userId = request.user.userId;
        
        if (!capsuleId) {
          return sendError(reply, 400, 'Capsule ID is required');
        }

        const vibePoints = Math.floor(Math.random() * 50) + 25;

        // Update user stats
        if (mongoose.connection.readyState === 1) {
          await User.findByIdAndUpdate(userId, {
            $inc: { 
              'stats.totalPoints': vibePoints,
              'stats.adventuresCompleted': 1
            },
            'stats.lastActivity': new Date(),
            $push: { 
              'stats.choices': { 
                choice: 'adventure_completed', 
                capsuleId, 
                timestamp: new Date() 
              }
            }
          });
        }

        return reply.send({
          success: true,
          message: 'Adventure completed successfully',
          vibePointsEarned: vibePoints,
          completion: {
            id: `completion_${Date.now()}`,
            capsuleId,
            completionData,
            vibePointsEarned: vibePoints,
            completedAt: new Date()
          }
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to complete adventure', error.message);
      }
    });

    // ===== LEADERBOARD AND SOCIAL ROUTES =====
    fastify.get('/leaderboard', async (request, reply) => {
      try {
        const { category = 'points', limit = 10 } = request.query;

        if (mongoose.connection.readyState !== 1) {
          return reply.send(getFallbackLeaderboard());
        }

        let sortField = 'stats.totalPoints';
        if (category === 'adventures') sortField = 'stats.adventuresCompleted';
        if (category === 'streak') sortField = 'stats.streak';
        if (category === 'cards') sortField = 'stats.cardsGenerated';

        const leaders = await User.find({}, {
          name: 1,
          avatar: 1,
          stats: 1,
          achievements: 1
        })
        .sort({ [sortField]: -1 })
        .limit(parseInt(limit))
        .lean();

        const leaderboard = leaders.map((user, index) => ({
          username: user.name || 'Anonymous User',
          avatar: user.avatar || '🚀',
          score: user.stats?.totalPoints || 0,
          rank: index + 1,
          streak: user.stats?.streak || 0,
          cardsShared: user.stats?.cardsShared || 0,
          cardsGenerated: user.stats?.cardsGenerated || 0,
          level: user.stats?.level || 1,
          achievements: (user.achievements || []).slice(0, 3)
        }));

        return reply.send({ 
          success: true, 
          data: leaderboard 
        });
      } catch (error) {
        console.error('Leaderboard error:', error);
        return reply.send(getFallbackLeaderboard());
      }
    });

    fastify.get('/trending-adventures', async (request, reply) => {
      try {
        const { category } = request.query;

        if (mongoose.connection.readyState !== 1) {
          return reply.send(getFallbackTrending());
        }

        let filter = { isActive: true };
        if (category && category !== 'all') {
          filter.category = sanitize(category);
        }

        const trending = await Adventure.find(filter)
          .sort({ completions: -1, shares: -1 })
          .limit(10)
          .lean();

        if (trending.length === 0) {
          return reply.send(getFallbackTrending());
        }

        const response = {
          success: true,
          trending: trending.map(formatAdventureResponse),
          metadata: {
            totalAdventures: await Adventure.countDocuments({ isActive: true }),
            category: category || null,
            generatedAt: new Date().toISOString()
          }
        };

        return reply.send(response);
      } catch (error) {
        console.error('Trending fetch failed:', error);
        return reply.send(getFallbackTrending());
      }
    });

    // ===== DATA PERSISTENCE ROUTES =====
    const saveUserDataRoute = (endpoint, dataField) => {
      fastify.post(endpoint, { preHandler: [fastify.authenticate] }, async (request, reply) => {
        try {
          const userId = request.user.userId;
          const data = { ...request.body, savedAt: new Date() };

          if (mongoose.connection.readyState === 1) {
            await User.findByIdAndUpdate(userId, {
              $push: { [dataField]: data },
              'stats.lastActivity': new Date()
            });
          }

          return reply.send({ 
            success: true, 
            message: `${dataField.replace('stats.', '')} saved successfully` 
          });
        } catch (error) {
          return sendError(reply, 500, `Failed to save ${dataField}`, error.message);
        }
      });
    };

    // Create save routes
    saveUserDataRoute('/user/save-mood', 'stats.moodHistory');
    saveUserDataRoute('/user/save-choice', 'stats.choices');
    saveUserDataRoute('/user/save-completion', 'stats.completions');
    saveUserDataRoute('/user/save-card-generation', 'stats.cardHistory');

    // Push notification subscription
    fastify.post('/subscribe-push', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { subscription } = request.body;
        
        if (!subscription) {
          return sendError(reply, 400, 'Subscription data is required');
        }

        const userId = request.user.userId;
        
        if (mongoose.connection.readyState === 1) {
          await User.findByIdAndUpdate(userId, {
            $set: { 'preferences.pushSubscription': subscription }
          });
        }

        return reply.send({ 
          success: true, 
          message: 'Push subscription saved' 
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to save push subscription', error.message);
      }
    });

    // Start the server
    const port = process.env.PORT || 8080;
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log('🚀 SparkVibe API Server running on port', port);
    console.log('🌐 Server URL:', `http://localhost:${port}`);
    console.log('📋 Available endpoints:');
    console.log('  GET  / - Server info');
    console.log('  GET  /health - Health check');
    console.log('  POST /auth/signup - User registration');
    console.log('  POST /auth/signin - User login');
    console.log('  POST /auth/google - Google OAuth (if configured)');
    console.log('  GET  /user/profile - User profile (auth required)');
    console.log('  POST /analyze-mood - Mood analysis (auth required)');
    console.log('  POST /generate-capsule-simple - Generate adventure (auth required)');
    console.log('  POST /adventure/complete - Complete adventure (auth required)');
    console.log('  GET  /leaderboard - User leaderboard');
    console.log('  GET  /trending-adventures - Trending adventures');
    console.log('  POST /user/save-mood - Save mood (auth required)');
    console.log('  POST /user/save-choice - Save choice (auth required)');
    console.log('  POST /user/save-completion - Save completion (auth required)');
    console.log('  POST /user/save-card-generation - Save card generation (auth required)');
    console.log('  POST /subscribe-push - Save push subscription (auth required)');

  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
};

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
  services.cloudinary = cloudinary ? 'configured' : 'not configured';

  return services;
}

async function analyzeWithOpenAI(textInput, timeOfDay = 'afternoon') {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a mood analyst. Respond with JSON containing: mood, confidence, emotions, recommendations, suggestedTemplate, energyLevel, socialMood, primaryMood, suggestedActivities.'
        },
        {
          role: 'user',
          content: `Analyze this mood at ${timeOfDay}: "${textInput}"`
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('OpenAI mood analysis error:', error);
    throw error;
  }
}

function generateFallbackMoodAnalysis(textInput, timeOfDay = 'afternoon') {
  const text = textInput?.toLowerCase() || '';
  
  const moodKeywords = {
    happy: ['happy', 'joy', 'excited', 'great', 'awesome', 'love', 'wonderful', 'fantastic'],
    sad: ['sad', 'down', 'depressed', 'upset', 'cry', 'blue', 'melancholy'],
    anxious: ['worried', 'anxiety', 'nervous', 'stress', 'overwhelmed', 'tense'],
    angry: ['angry', 'mad', 'frustrated', 'annoyed', 'furious', 'irritated'],
    calm: ['calm', 'peaceful', 'relaxed', 'zen', 'serene', 'tranquil'],
    energetic: ['energetic', 'pumped', 'motivated', 'ready', 'active'],
    tired: ['tired', 'exhausted', 'drained', 'weary', 'sleepy']
  };

  let detectedMood = 'curious';
  let confidence = 0.6;

  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    const matches = keywords.filter(keyword => text.includes(keyword)).length;
    if (matches > 0) {
      detectedMood = mood;
      confidence = Math.min(0.95, 0.7 + (matches * 0.1));
      break;
    }
  }

  const moodResponses = {
    happy: {
      emotions: ['joyful', 'optimistic', 'enthusiastic'],
      recommendations: ['Share your positivity with others', 'Try a creative project', 'Plan something fun'],
      suggestedTemplate: 'cosmic',
      energyLevel: 'high',
      socialMood: 'outgoing'
    },
    sad: {
      emotions: ['melancholic', 'reflective', 'sensitive'],
      recommendations: ['Practice self-compassion', 'Connect with a friend', 'Try gentle movement'],
      suggestedTemplate: 'minimal',
      energyLevel: 'low',
      socialMood: 'introspective'
    },
    anxious: {
      emotions: ['concerned', 'restless', 'vigilant'],
      recommendations: ['Practice deep breathing', 'Break tasks into smaller steps', 'Try grounding exercises'],
      suggestedTemplate: 'nature',
      energyLevel: 'medium-low',
      socialMood: 'cautious'
    },
    default: {
      emotions: ['curious', 'open', 'exploratory'],
      recommendations: ['Try something new', 'Explore your interests', 'Stay curious'],
      suggestedTemplate: 'cosmic',
      energyLevel: 'medium',
      socialMood: 'balanced'
    }
  };

  const response = moodResponses[detectedMood] || moodResponses.default;

  return {
    mood: detectedMood,
    primaryMood: detectedMood,
    confidence,
    emotions: response.emotions,
    recommendations: response.recommendations,
    suggestedTemplate: response.suggestedTemplate,
    energyLevel: response.energyLevel,
    socialMood: response.socialMood,
    suggestedActivities: response.recommendations.slice(0, 2),
    analyzedAt: new Date().toISOString(),
    timeOfDay
  };
}

async function generateWithOpenAI(mood, interests = [], timeOfDay = 'afternoon', moodAnalysis = {}) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Generate a personalized adventure capsule. Respond with JSON containing: success, capsule, adventure (object with title, prompt, difficulty, estimatedTime, category), moodBoost, brainBite (object with question and answer), habitNudge, viralPotential, id.'
        },
        {
          role: 'user',
          content: `Create an adventure for someone feeling ${mood} at ${timeOfDay}. Interests: ${interests?.join(', ') || 'general'}. Energy level: ${moodAnalysis?.energyLevel || 'medium'}`
        }
      ],
      max_tokens: 500,
      temperature: 0.8
    });

    const result = JSON.parse(completion.choices[0].message.content);
    result.id = `ai_capsule_${Date.now()}`;
    return result;
  } catch (error) {
    console.error('OpenAI capsule generation error:', error);
    throw error;
  }
}

function generateFallbackCapsule(mood, timeOfDay = 'afternoon', interests = []) {
  const timeGreeting = {
    morning: 'Good morning',
    afternoon: 'Good afternoon', 
    evening: 'Good evening',
    night: 'Good night'
  };

  const moodActivities = {
    happy: {
      title: 'Spread Joy Challenge',
      activity: 'Share your positive energy by complimenting three different people today',
      moodBoost: 'Your happiness is contagious! Keep shining bright and lifting others up!',
      habitNudge: 'Make it a daily habit to spread one genuine compliment',
      category: 'Social'
    },
    sad: {
      title: 'Gentle Self-Care',
      activity: 'Create a cozy space and write down three things you appreciate about yourself',
      moodBoost: 'Every step toward self-compassion is progress. You deserve kindness',
      habitNudge: 'End each day by acknowledging one thing you did well',
      category: 'Wellness'
    },
    anxious: {
      title: 'Grounding Ritual',
      activity: 'Practice the 5-4-3-2-1 technique: 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste',
      moodBoost: 'You have the inner strength to handle whatever comes your way',
      habitNudge: 'When anxiety rises, return to your breath - it is always there to center you',
      category: 'Mindfulness'
    },
    default: {
      title: 'Curious Explorer',
      activity: 'Spend 10 minutes learning something completely new that sparks your curiosity',
      moodBoost: 'Your curiosity is your superpower - it opens endless doors to growth and discovery',
      habitNudge: 'Feed your curiosity daily - ask one new question and seek its answer',
      category: 'Growth'
    }
  };

  const selectedActivity = moodActivities[mood] || moodActivities.default;
  const greeting = timeGreeting[timeOfDay] || 'Hello';
  const interestCategory = interests?.[0] || selectedActivity.category;

  return {
    success: true,
    id: `fallback_capsule_${Date.now()}`,
    capsule: `${greeting}! Your ${mood} energy is perfect for meaningful action today.`,
    adventure: {
      title: selectedActivity.title,
      prompt: selectedActivity.activity,
      difficulty: 'easy',
      estimatedTime: '10 minutes',
      category: interestCategory
    },
    moodBoost: selectedActivity.moodBoost,
    brainBite: {
      question: 'Did you know?',
      answer: 'Taking just 10 minutes for intentional action can improve your mental wellbeing by up to 23% and create positive momentum that lasts all day!'
    },
    habitNudge: selectedActivity.habitNudge,
    viralPotential: Math.random() * 0.3 + 0.6,
    metadata: {
      fallback: true,
      generated_at: new Date().toISOString(),
      mood_detected: mood,
      time_context: timeOfDay
    }
  };
}

function formatAdventureResponse(adventure) {
  return {
    id: adventure._id,
    title: adventure.title,
    description: adventure.description,
    completions: adventure.completions,
    shares: adventure.shares,
    viralPotential: adventure.viralPotential,
    category: adventure.category,
    template: adventure.template || 'cosmic',
    averageRating: adventure.averageRating,
    difficulty: adventure.difficulty,
    estimatedTime: adventure.estimatedTime,
    createdAt: adventure.createdAt
  };
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
        achievements: ['Early Adopter', 'Streak Master', 'Community Builder']
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
        achievements: ['Creative Spark', 'Social Butterfly']
      },
      {
        username: "Mood Master",
        avatar: "🎨",
        score: 1456,
        rank: 3,
        streak: 6,
        cardsShared: 6,
        cardsGenerated: 12,
        level: 2,
        achievements: ['Consistent Creator']
      },
      {
        username: "Daily Adventurer",
        avatar: "⚡",
        score: 987,
        rank: 4,
        streak: 4,
        cardsShared: 4,
        cardsGenerated: 8,
        level: 1,
        achievements: ['Getting Started']
      }
    ]
  };
}

function getFallbackTrending() {
  return {
    success: true,
    trending: [
      {
        id: 'fallback-1',
        title: "Morning Gratitude Practice",
        description: "Start your day by writing down three things you're grateful for",
        completions: 347,
        shares: 89,
        viralPotential: 0.85,
        category: "Mindfulness",
        template: "cosmic",
        averageRating: 4.7,
        difficulty: "easy",
        estimatedTime: "5 minutes"
      },
      {
        id: 'fallback-2',
        title: "Random Act of Kindness",
        description: "Brighten someone's day with an unexpected gesture of kindness",
        completions: 256,
        shares: 92,
        viralPotential: 0.92,
        category: "Social",
        template: "retro",
        averageRating: 4.9,
        difficulty: "easy",
        estimatedTime: "10 minutes"
      },
      {
        id: 'fallback-3',
        title: "Creative Photo Walk",
        description: "Explore your neighborhood and capture beauty in ordinary moments",
        completions: 198,
        shares: 67,
        viralPotential: 0.78,
        category: "Adventure", 
        template: "nature",
        averageRating: 4.5,
        difficulty: "medium",
        estimatedTime: "15 minutes"
      }
    ],
    metadata: {
      totalAdventures: 3,
      generatedAt: new Date().toISOString(),
      fallback: true
    }
  };
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
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