const fastify = require('fastify')({ 
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});
const fastifyCors = require('@fastify/cors');
const fastifyHelmet = require('@fastify/helmet');
const fastifyJwt = require('@fastify/jwt');
const fastifyMultipart = require('@fastify/multipart');
const fastifyRateLimit = require('@fastify/rate-limit');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const sanitize = require('mongo-sanitize');
require('dotenv').config();

// ONLY require essential environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters long for security');
  process.exit(1);
}

// Initialize optional services
let openai, googleClient, redisClient, hf, emailTransporter;

// OpenAI (optional)
if (process.env.OPENAI_API_KEY) {
  try {
    const { OpenAI } = require('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('✅ OpenAI initialized');
  } catch (error) {
    console.warn('⚠️ OpenAI initialization failed:', error.message);
  }
}

// Google OAuth (optional)
if (process.env.GOOGLE_CLIENT_ID) {
  try {
    const { OAuth2Client } = require('google-auth-library');
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    console.log('✅ Google OAuth initialized');
  } catch (error) {
    console.warn('⚠️ Google OAuth initialization failed:', error.message);
  }
}

// Redis (optional)
if (process.env.REDIS_URL) {
  try {
    const Redis = require('redis');
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: 5000, lazyConnect: true }
    });
    redisClient.on('error', (err) => console.warn('Redis error:', err.message));
  } catch (error) {
    console.warn('⚠️ Redis initialization failed:', error.message);
  }
}

// Cloudinary (optional)
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  try {
    const { v2: cloudinary } = require('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('✅ Cloudinary initialized');
  } catch (error) {
    console.warn('⚠️ Cloudinary initialization failed:', error.message);
  }
}

// Email (optional)
if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  try {
    const nodemailer = require('nodemailer');
    emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('✅ Email transporter initialized');
  } catch (error) {
    console.warn('⚠️ Email initialization failed:', error.message);
  }
}

// MongoDB Models
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: String,
  googleId: String,
  password: String,
  emailVerified: { type: Boolean, default: true }, // Skip verification for now
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
  preferences: {
    notifications: { type: Boolean, default: true },
    interests: [String],
    aiPersonality: { type: String, default: 'encouraging' },
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
  },
  achievements: [{ id: String, unlockedAt: Date, type: String }],
  createdAt: { type: Date, default: Date.now },
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
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', UserSchema);
const Adventure = mongoose.model('Adventure', AdventureSchema);

const startServer = async () => {
  try {
    // Enhanced MongoDB connection with replica set support
    console.log('Connecting to MongoDB...');
    console.log('MongoDB URI (sanitized):', process.env.MONGODB_URI?.replace(/:([^:@]*)@/, ':***@'));
    
    const mongooseOptions = {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      writeConcern: {
        w: 'majority'
      }
    };

    // Add replica set specific options if detected
    if (process.env.MONGODB_URI?.includes('replicaSet') || process.env.MONGODB_URI?.includes('mongo.ondigitalocean.com')) {
      mongooseOptions.readPreference = 'primaryPreferred';
      mongooseOptions.directConnection = false;
    }

    let connected = false;
    let connectionAttempts = 0;
    const maxAttempts = 3;

    while (!connected && connectionAttempts < maxAttempts) {
      try {
        connectionAttempts++;
        console.log(`MongoDB connection attempt ${connectionAttempts}/${maxAttempts}`);
        
        await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
        
        // Test the connection
        await mongoose.connection.db.admin().ping();
        console.log('✅ Connected to MongoDB successfully');
        console.log('  - Host:', mongoose.connection.host);
        console.log('  - Database:', mongoose.connection.name);
        console.log('  - Ready State:', mongoose.connection.readyState);
        
        connected = true;
        
      } catch (connectError) {
        console.error(`❌ MongoDB connection attempt ${connectionAttempts} failed:`, connectError.message);
        
        if (connectError.message.includes('ReplicaSetNoPrimary')) {
          console.log('🔄 Replica set has no primary, retrying in 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else if (connectError.message.includes('ENOTFOUND') || connectError.message.includes('private-')) {
          console.error('❌ DNS/Network issue detected. Check connection string uses PUBLIC hostname');
          console.log('   Expected format: mongodb://user:pass@PUBLIC-HOST:27017/db?authSource=admin&replicaSet=SET_NAME');
          break;
        } else {
          console.log(`⏳ Waiting 3 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        if (connectionAttempts === maxAttempts) {
          console.error('❌ Failed to connect to MongoDB after all attempts');
          console.log('🚀 Starting server anyway with fallback data...');
          // Don't exit - continue with fallback data
          break;
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
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return cb(null, true);
        
        const allowedOrigins = [
          'https://sparkvibe.app',
          'https://www.sparkvibe.app',
          'https://walrus-app-cczj4.ondigitalocean.app',
        ];
        
        // In development, allow localhost
        if (process.env.NODE_ENV !== 'production') {
          allowedOrigins.push(
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:8080'
          );
        }
        
        console.log(`CORS check for origin: ${origin}`);
        const allowed = allowedOrigins.includes(origin);
        console.log(`Origin ${origin} ${allowed ? 'allowed' : 'denied'}`);
        
        cb(null, allowed);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400,
    });

await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Preferred for security
    // crossOriginOpenerPolicy: { policy: 'unsafe-none' }, // Less secure, use as fallback
    crossOriginResourcePolicy: { policy: 'cross-origin' },
});

    await fastify.register(fastifyJwt, {
      secret: process.env.JWT_SECRET,
    });

    await fastify.register(fastifyMultipart);

    await fastify.register(fastifyRateLimit, {
      max: 100,
      timeWindow: '1 minute',
      errorResponseBuilder: () => ({
        success: false,
        message: 'Rate limit exceeded. Please try again later.',
      }),
    });

    // Error handler
    fastify.setErrorHandler((error, request, reply) => {
      console.error('Server error:', error);
      reply.status(error.statusCode || 500).send({
        success: false,
        message: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    });

    // Authentication decorator
    fastify.decorate('authenticate', async function (request, reply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({ success: false, error: 'Authentication required' });
      }
    });

    // === BASIC ROUTES ===
    
    // Root endpoint with MongoDB status
    fastify.get('/', async (request, reply) => {
      const services = await checkServiceHealth();
      return reply.send({
        message: 'SparkVibe API Server - Production v2.1.0',
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

    // Health check
    fastify.get('/health', async (request, reply) => {
      const health = {
        status: 'OK',
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

      // Check collection counts if connected
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

    // Database connection test
    fastify.get('/test-db-connection', async (request, reply) => {
      const result = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        mongodb: {}
      };

      try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
          result.mongodb.error = 'MONGODB_URI environment variable not set';
          return reply.status(500).send(result);
        }

        const cleanUri = mongoUri.replace(/:([^:@]*)@/, ':***@');
        result.mongodb.connectionString = cleanUri;

        result.mongodb.connectionState = {
          current: mongoose.connection.readyState,
          description: {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
          }[mongoose.connection.readyState]
        };

        if (mongoose.connection.readyState === 1) {
          result.mongodb.host = mongoose.connection.host;
          result.mongodb.port = mongoose.connection.port;
          result.mongodb.name = mongoose.connection.name;

          try {
            const pingResult = await mongoose.connection.db.admin().ping();
            result.mongodb.ping = 'success';
          } catch (pingError) {
            result.mongodb.ping = 'failed';
            result.mongodb.pingError = pingError.message;
          }

          try {
            const userCount = await User.countDocuments();
            const adventureCount = await Adventure.countDocuments();
            result.mongodb.counts = { users: userCount, adventures: adventureCount };
          } catch (countError) {
            result.mongodb.countError = countError.message;
          }
        }

        return reply.send(result);

      } catch (error) {
        result.mongodb.error = error.message;
        return reply.status(500).send(result);
      }
    });

    // === AUTHENTICATION ROUTES ===
    
    // Email signup
    fastify.post('/auth/signup', async (request, reply) => {
      try {
        console.log('Signup attempt:', request.body);
        const { name, email, password } = request.body;
        
        if (!name || !email || !password) {
          return reply.status(400).send({
            success: false,
            message: 'Name, email and password are required'
          });
        }

        if (mongoose.connection.readyState !== 1) {
          return reply.status(503).send({
            success: false,
            message: 'Database connection unavailable. Please try again later.'
          });
        }

        const sanitizedEmail = sanitize(email.toLowerCase());
        const sanitizedName = sanitize(name);

        // Check if user exists
        const existingUser = await User.findOne({ email: sanitizedEmail });
        if (existingUser) {
          return reply.status(400).send({
            success: false,
            message: 'User with this email already exists',
          });
        }

        // Create user
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({
          name: sanitizedName,
          email: sanitizedEmail,
          password: hashedPassword,
          authProvider: 'email',
          emailVerified: true,
          preferences: {
            interests: ['wellness', 'creativity'],
            aiPersonality: 'encouraging',
          },
        });

        await user.save();
        console.log('User created successfully:', user._id);

        // Generate JWT
        const jwtToken = fastify.jwt.sign({ userId: user._id.toString() });

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
          },
        });
      } catch (error) {
        console.error('Signup error:', error);
        return reply.status(500).send({
          success: false,
          message: 'Account creation failed',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });

    // Email signin
    fastify.post('/auth/signin', async (request, reply) => {
      try {
        const { email, password } = request.body;
        
        if (!email || !password) {
          return reply.status(400).send({
            success: false,
            message: 'Email and password are required',
          });
        }

        if (mongoose.connection.readyState !== 1) {
          return reply.status(503).send({
            success: false,
            message: 'Database connection unavailable. Please try again later.'
          });
        }

        const sanitizedEmail = sanitize(email.toLowerCase());

        const user = await User.findOne({ email: sanitizedEmail, authProvider: 'email' });
        if (!user) {
          return reply.status(401).send({
            success: false,
            message: 'Invalid email or password',
          });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return reply.status(401).send({
            success: false,
            message: 'Invalid email or password',
          });
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
            emailVerified: user.emailVerified,
            stats: user.stats,
            achievements: user.achievements,
            preferences: user.preferences,
          },
        });
      } catch (error) {
        console.error('Signin error:', error);
        return reply.status(500).send({
          success: false,
          message: 'Sign in failed',
        });
      }
    });

    // Google OAuth (optional)
    if (googleClient) {
      fastify.post('/auth/google', async (request, reply) => {
        reply.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        try {
          const { token } = request.body;
          
          if (!token) {
            return reply.status(400).send({
              success: false,
              message: 'Google token is required'
            });
          }

          if (mongoose.connection.readyState !== 1) {
            return reply.status(503).send({
              success: false,
              message: 'Database connection unavailable. Please try again later.'
            });
          }

          const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          
          const payload = ticket.getPayload();
          const googleId = payload.sub;
          
          let user = await User.findOne({ googleId });
          
          if (!user) {
            user = await User.findOne({ email: payload.email });
            if (user) {
              user.googleId = googleId;
              user.avatar = payload.picture;
              user.authProvider = 'google';
              user.emailVerified = true;
              await user.save();
            } else {
              user = new User({
                email: payload.email,
                name: payload.name,
                avatar: payload.picture,
                googleId,
                authProvider: 'google',
                emailVerified: true,
                preferences: {
                  interests: ['wellness', 'creativity'],
                  aiPersonality: 'encouraging',
                },
              });
              await user.save();
            }
          }
          
          const jwtToken = fastify.jwt.sign({ userId: user._id.toString() });
          
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
              preferences: user.preferences,
            },
          });
        } catch (error) {
          console.error('Google auth error:', error);
          return reply.status(401).send({ 
            success: false, 
            error: 'Invalid Google token' 
          });
        }
      });
    }

    // === CORE APP ROUTES ===
    
    // Mood analysis
    fastify.post('/analyze-mood', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { textInput } = request.body;
        const userId = request.user.userId;

        let analysis;
        
        if (openai && textInput) {
          try {
            analysis = await analyzeWithOpenAI(textInput);
          } catch (error) {
            console.warn('OpenAI analysis failed:', error.message);
            analysis = generateFallbackMoodAnalysis(textInput);
          }
        } else {
          analysis = generateFallbackMoodAnalysis(textInput);
        }

        // Update user activity if DB connected
        if (mongoose.connection.readyState === 1) {
          await User.findByIdAndUpdate(userId, {
            'stats.lastActivity': new Date(),
          });
        }

        return reply.send(analysis);
      } catch (error) {
        console.error('Mood analysis failed:', error);
        return reply.status(500).send({
          success: false,
          message: 'Mood analysis failed'
        });
      }
    });

    // Simple capsule generation
    fastify.post('/generate-capsule-simple', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { mood, interests, timeOfDay } = request.body;
        const userId = request.user.userId;

        let capsuleData;

        if (openai) {
          try {
            capsuleData = await generateWithOpenAI(mood, interests, timeOfDay);
          } catch (error) {
            console.warn('OpenAI capsule generation failed:', error.message);
            capsuleData = generateFallbackCapsule(mood, timeOfDay, interests);
          }
        } else {
          capsuleData = generateFallbackCapsule(mood, timeOfDay, interests);
        }

        // Update user stats if DB connected
        if (mongoose.connection.readyState === 1) {
          await User.findByIdAndUpdate(userId, {
            $inc: { 'stats.adventuresCompleted': 1 },
            'stats.lastActivity': new Date(),
          });
        }

        return reply.send(capsuleData);
      } catch (error) {
        console.error('Capsule generation failed:', error);
        return reply.status(500).send({
          success: false,
          message: 'Capsule generation failed'
        });
      }
    });

    // Update points
    fastify.post('/update-points', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { points, action } = request.body;
        const userId = request.user.userId;

        if (mongoose.connection.readyState !== 1) {
          return reply.status(503).send({
            success: false,
            message: 'Database connection unavailable. Points not saved.'
          });
        }

        const user = await User.findById(userId);
        if (!user) {
          return reply.status(404).send({
            success: false,
            message: 'User not found'
          });
        }

        const pointsToAdd = points || 10;
        user.stats.totalPoints += pointsToAdd;
        user.stats.lastActivity = new Date();

        if (action === 'daily_adventure') {
          const today = new Date().toDateString();
          const lastActivity = user.stats.lastActivity ? user.stats.lastActivity.toDateString() : null;
          
          if (lastActivity !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastActivity === yesterday.toDateString()) {
              user.stats.streak += 1;
            } else {
              user.stats.streak = 1;
            }
            
            if (user.stats.streak > user.stats.bestStreak) {
              user.stats.bestStreak = user.stats.streak;
            }
          }
        }

        await user.save();

        return reply.send({
          success: true,
          vibePoints: user.stats.totalPoints,
          streak: user.stats.streak,
          pointsAdded: pointsToAdd,
          message: `Great job! You earned ${pointsToAdd} points!`
        });
      } catch (error) {
        console.error('Update points failed:', error);
        return reply.status(500).send({
          success: false,
          message: 'Failed to update points'
        });
      }
    });

    // Robust Leaderboard with fallback
    fastify.get('/leaderboard', async (request, reply) => {
      try {
        console.log('Leaderboard request received');
        
        if (mongoose.connection.readyState !== 1) {
          console.log('MongoDB not connected, returning fallback leaderboard');
          return reply.send(getFallbackLeaderboard());
        }

        const { category = 'points', timeframe = 'all' } = request.query;
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

        console.log('Querying users with filter:', dateFilter, 'sortField:', sortField);

        const leaders = await User.find(dateFilter)
          .sort({ [sortField]: -1 })
          .limit(50)
          .select('name avatar stats achievements')
          .lean();

        console.log(`Found ${leaders.length} users`);

        if (leaders.length === 0) {
          console.log('No users found, returning fallback data');
          return reply.send(getFallbackLeaderboard());
        }

        const leaderboard = leaders.map((user, index) => ({
          username: user.name || 'Anonymous User',
          avatar: user.avatar || '🚀',
          score: user.stats?.totalPoints || 0,
          rank: index + 1,
          streak: user.stats?.streak || 0,
          cardsShared: user.stats?.cardsShared || 0,
          cardsGenerated: user.stats?.cardsGenerated || 0,
          level: user.stats?.level || 1,
          achievements: (user.achievements || []).slice(0, 3),
        }));

        console.log('Successfully returning leaderboard with', leaderboard.length, 'users');
        return reply.send(leaderboard);
        
      } catch (error) {
        console.error('Leaderboard fetch failed:', error);
        console.error('Error stack:', error.stack);
        return reply.send(getFallbackLeaderboard());
      }
    });

    // Robust Trending adventures with fallback
    fastify.get('/trending-adventures', async (request, reply) => {
      try {
        console.log('Trending adventures request received');
        
        if (mongoose.connection.readyState !== 1) {
          console.log('MongoDB not connected, returning fallback trending');
          return reply.send(getFallbackTrending());
        }

        const { category } = request.query;
        let filter = { isActive: true };
        
        if (category && category !== 'all') {
          filter.category = sanitize(category);
        }

        console.log('Querying adventures with filter:', filter);

        const trending = await Adventure.find(filter)
          .sort({ completions: -1, shares: -1 })
          .limit(10)
          .lean();

        console.log(`Found ${trending.length} adventures`);

        if (trending.length === 0) {
          console.log('No adventures found, returning fallback data');
          return reply.send(getFallbackTrending());
        }

        const response = {
          success: true,
          trending: trending.map(formatAdventureResponse),
          metadata: {
            totalAdventures: await Adventure.countDocuments({ isActive: true }),
            category: category || null,
            generatedAt: new Date().toISOString(),
          },
        };

        console.log('Successfully returning trending adventures');
        return reply.send(response);
        
      } catch (error) {
        console.error('Trending fetch failed:', error);
        console.error('Error stack:', error.stack);
        return reply.send(getFallbackTrending());
      }
    });

    // Enhanced seed data with proper auth handling
    fastify.get('/seed-data', async (request, reply) => {
      try {
        console.log('Seed data request received');
        
        // Check database connection first
        if (mongoose.connection.readyState !== 1) {
          console.error('MongoDB not connected. Connection state:', mongoose.connection.readyState);
          return reply.status(500).send({ 
            success: false,
            error: "Database connection failed",
            details: `MongoDB connection state: ${mongoose.connection.readyState}. Please check your MONGODB_URI environment variable.`,
            connectionStates: {
              0: 'disconnected',
              1: 'connected',
              2: 'connecting',
              3: 'disconnecting'
            }
          });
        }

        // Test database permissions first with a simple operation
        try {
          console.log('Testing database permissions...');
          const testResult = await mongoose.connection.db.admin().ping();
          console.log('Database ping successful:', testResult);
        } catch (permError) {
          console.error('Database permission test failed:', permError.message);
          return reply.status(500).send({ 
            success: false,
            error: "Database permission denied",
            details: `Database authentication failed: ${permError.message}. Please check your MongoDB credentials.`,
            suggestion: "Verify your MONGODB_URI has correct username, password, and database permissions."
          });
        }

        // Check existing data first instead of deleting
        const existingUsers = await User.countDocuments();
        const existingAdventures = await Adventure.countDocuments();
        
        console.log(`Found ${existingUsers} existing users and ${existingAdventures} existing adventures`);
        
        // Only seed if no data exists, or use upsert operations
        let usersCreated = 0;
        let adventuresCreated = 0;

        if (existingUsers === 0) {
          console.log('Creating seed users...');
          
          // Create users individually with upsert to avoid duplicates
          const seedUsers = [
            {
              name: "Alice Johnson",
              email: "alice@example.com",
              avatar: "🚀",
              emailVerified: true,
              authProvider: 'email',
              stats: {
                totalPoints: 1200,
                streak: 7,
                cardsGenerated: 15,
                cardsShared: 8,
                level: 3,
                lastActivity: new Date(),
                bestStreak: 7,
                adventuresCompleted: 15
              },
              achievements: [
                { id: 'early_adopter', unlockedAt: new Date(), type: 'milestone' },
                { id: 'streak_master', unlockedAt: new Date(), type: 'achievement' }
              ]
            },
            {
              name: "Bob Smith",
              email: "bob@example.com",
              avatar: "🌟",
              emailVerified: true,
              authProvider: 'email',
              stats: {
                totalPoints: 950,
                streak: 4,
                cardsGenerated: 12,
                cardsShared: 6,
                level: 2,
                lastActivity: new Date(),
                bestStreak: 4,
                adventuresCompleted: 12
              },
              achievements: [
                { id: 'creative_mind', unlockedAt: new Date(), type: 'achievement' }
              ]
            },
            {
              name: "Carol Davis",
              email: "carol@example.com",
              avatar: "🎯",
              emailVerified: true,
              authProvider: 'email',
              stats: {
                totalPoints: 750,
                streak: 2,
                cardsGenerated: 9,
                cardsShared: 4,
                level: 2,
                lastActivity: new Date(),
                bestStreak: 2,
                adventuresCompleted: 9
              },
              achievements: [
                { id: 'getting_started', unlockedAt: new Date(), type: 'milestone' }
              ]
            }
          ];

          for (const userData of seedUsers) {
            try {
              const user = await User.findOneAndUpdate(
                { email: userData.email },
                userData,
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );
              if (user) usersCreated++;
              console.log(`User created/updated: ${userData.email}`);
            } catch (userError) {
              console.error(`Failed to create user ${userData.email}:`, userError.message);
            }
          }
        } else {
          console.log('Users already exist, skipping user creation');
        }

        if (existingAdventures === 0) {
          console.log('Creating seed adventures...');
          
          const seedAdventures = [
            {
              title: "Morning Sunrise Meditation",
              description: "Start your day with peaceful meditation as the sun rises",
              category: "Mindfulness",
              completions: 156,
              shares: 67,
              viralPotential: 0.85,
              template: "cosmic",
              averageRating: 4.8,
              difficulty: "easy",
              estimatedTime: "10 minutes",
              isActive: true
            },
            {
              title: "Urban Photography Walk",
              description: "Capture the beauty of city life through your unique lens",
              category: "Creativity",
              completions: 134,
              shares: 89,
              viralPotential: 0.92,
              template: "nature",
              averageRating: 4.6,
              difficulty: "medium",
              estimatedTime: "30 minutes",
              isActive: true
            },
            {
              title: "Gratitude Journal Challenge",
              description: "Write three things you're grateful for and feel the positive shift",
              category: "Mindfulness",
              completions: 98,
              shares: 34,
              viralPotential: 0.73,
              template: "minimal",
              averageRating: 4.4,
              difficulty: "easy",
              estimatedTime: "5 minutes",
              isActive: true
            },
            {
              title: "Random Act of Kindness",
              description: "Brighten someone's day with an unexpected gesture of kindness",
              category: "Social",
              completions: 210,
              shares: 95,
              viralPotential: 0.94,
              template: "retro",
              averageRating: 4.9,
              difficulty: "easy",
              estimatedTime: "10 minutes",
              isActive: true
            }
          ];

          for (const adventureData of seedAdventures) {
            try {
              const adventure = await Adventure.findOneAndUpdate(
                { title: adventureData.title },
                adventureData,
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );
              if (adventure) adventuresCreated++;
              console.log(`Adventure created/updated: ${adventureData.title}`);
            } catch (adventureError) {
              console.error(`Failed to create adventure ${adventureData.title}:`, adventureError.message);
            }
          }
        } else {
          console.log('Adventures already exist, skipping adventure creation');
        }

        // Final counts
        const totalUsers = await User.countDocuments();
        const totalAdventures = await Adventure.countDocuments();

        const result = { 
          success: true, 
          message: "Seed data process completed successfully!",
          created: {
            users: usersCreated,
            adventures: adventuresCreated
          },
          totals: {
            users: totalUsers,
            adventures: totalAdventures
          },
          database: {
            connected: mongoose.connection.readyState === 1,
            name: mongoose.connection.name,
            host: mongoose.connection.host
          }
        };

        console.log('Seed process completed:', result);
        return reply.send(result);

      } catch (error) {
        console.error('Seed data failed:', error);
        return reply.status(500).send({ 
          success: false,
          error: "Seed data failed",
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          suggestions: [
            "Check your MONGODB_URI environment variable",
            "Ensure your MongoDB user has read/write permissions",
            "Verify your database connection is stable"
          ]
        });
      }
    });

    // Start server
    const port = process.env.PORT || 8080;
    await fastify.listen({
      port,
      host: '0.0.0.0',
    });
    
    console.log(`🚀 SparkVibe API Server running on port ${port}`);
    console.log(`🌐 Server URL: http://localhost:${port}`);
    console.log('📋 Available endpoints:');
    console.log('  GET  / - Server info');
    console.log('  GET  /health - Health check');
    console.log('  GET  /test-db-connection - Database connection test');
    console.log('  POST /auth/signup - User registration');
    console.log('  POST /auth/signin - User login');
    console.log('  POST /auth/google - Google OAuth (if configured)');
    console.log('  POST /analyze-mood - Mood analysis (auth required)');
    console.log('  POST /generate-capsule-simple - Generate adventure (auth required)');
    console.log('  POST /update-points - Update user points (auth required)');
    console.log('  GET  /leaderboard - User leaderboard');
    console.log('  GET  /trending-adventures - Trending adventures');
    console.log('  GET  /seed-data - Create test data');

  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
};

// Helper functions
async function checkServiceHealth() {
  const services = {};

  try {
    await mongoose.connection.db.admin().ping();
    services.mongodb = 'healthy';
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
  
  return services;
}

async function analyzeWithOpenAI(textInput) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a mood analyst. Respond with JSON containing: mood, confidence, emotions, recommendations, suggestedTemplate, energyLevel, socialMood.',
      },
      {
        role: 'user',
        content: `Analyze this mood: "${textInput}"`,
      },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  return JSON.parse(completion.choices[0].message.content);
}

function generateFallbackMoodAnalysis(textInput) {
  const moodKeywords = {
    happy: ['happy', 'joy', 'excited', 'great', 'awesome', 'love'],
    sad: ['sad', 'down', 'depressed', 'upset', 'cry'],
    anxious: ['worried', 'anxiety', 'nervous', 'stress'],
    angry: ['angry', 'mad', 'frustrated', 'annoyed'],
    calm: ['calm', 'peaceful', 'relaxed', 'zen']
  };

  let detectedMood = 'curious';
  const text = textInput?.toLowerCase() || '';
  
  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      detectedMood = mood;
      break;
    }
  }

  return {
    mood: detectedMood,
    confidence: 0.7,
    emotions: [detectedMood, 'hopeful'],
    recommendations: ['Try something new today', 'Take care of yourself'],
    suggestedTemplate: 'cosmic',
    energyLevel: 'medium',
    socialMood: 'balanced',
  };
}

async function generateWithOpenAI(mood, interests, timeOfDay) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'Generate a personalized adventure capsule. Respond with JSON containing: capsule, adventure (object with title, prompt, difficulty, estimatedTime, category), moodBoost, brainBite, habitNudge, viralPotential.',
      },
      {
        role: 'user',
        content: `Create an adventure for someone feeling ${mood} at ${timeOfDay}. Interests: ${interests?.join(', ')}.`,
      },
    ],
    max_tokens: 400,
    temperature: 0.8,
  });

  return JSON.parse(completion.choices[0].message.content);
}

function generateFallbackCapsule(mood, timeOfDay, interests) {
  const timeGreeting = {
    morning: 'Good morning',
    afternoon: 'Good afternoon', 
    evening: 'Good evening',
    night: 'Good night'
  };

  const moodActivities = {
    happy: { 
      title: '✨ Spread Joy', 
      activity: 'Share your positive energy with someone today',
      moodBoost: 'Your happiness is contagious! Keep shining bright! 🌟',
      habitNudge: 'Smile at 3 people today and watch the magic happen!'
    },
    sad: { 
      title: '🌱 Gentle Care', 
      activity: 'Take a mindful walk and appreciate the small beauties around you',
      moodBoost: 'Every step forward is progress, no matter how small 💙',
      habitNudge: 'Practice one act of self-compassion each day'
    },
    anxious: { 
      title: '🧘 Find Peace', 
      activity: 'Practice deep breathing for 5 minutes - in for 4, hold for 4, out for 6',
      moodBoost: 'You have the strength to handle whatever comes your way 🕊️',
      habitNudge: 'Start each morning with 2 minutes of mindful breathing'
    },
    angry: { 
      title: '💪 Channel Energy', 
      activity: 'Do some physical exercise to transform that energy into strength',
      moodBoost: 'Your passion can fuel positive change in the world 🔥',
      habitNudge: 'When frustrated, take 10 deep breaths before responding'
    },
    curious: { 
      title: '🔍 Explore & Discover', 
      activity: 'Learn something completely new that sparks your interest',
      moodBoost: 'Your curiosity is your superpower - it opens endless doors! 🚀',
      habitNudge: 'Read about something new for 5 minutes each day'
    },
    calm: { 
      title: '🌊 Stay Centered', 
      activity: 'Practice gratitude by writing down 3 things you appreciate right now',
      moodBoost: 'Your peaceful energy brings harmony to everything around you ☮️',
      habitNudge: 'End each day by noting one moment of gratitude'
    }
  };

  const selectedActivity = moodActivities[mood] || moodActivities.curious;
  const greeting = timeGreeting[timeOfDay] || 'Hello';
  const interestCategory = interests?.[0] || 'mindfulness';

  return {
    success: true,
    capsule: `${greeting}! Your ${mood} energy is perfect for growth today.`,
    adventure: {
      title: selectedActivity.title,
      prompt: selectedActivity.activity,
      difficulty: 'easy',
      estimatedTime: '10 minutes',
      category: interestCategory,
      options: [
        'Start this adventure now',
        'Save for later',
        'Share with a friend'
      ]
    },
    moodBoost: selectedActivity.moodBoost,
    brainBite: {
      question: 'Did you know?',
      answer: 'Taking just 5 minutes for yourself each day can improve your mental wellbeing by up to 23%! 🧠✨'
    },
    habitNudge: selectedActivity.habitNudge,
    viralPotential: 0.7,
    metadata: { 
      fallback: true, 
      generated_at: new Date().toISOString(),
      mood_detected: mood,
      time_context: timeOfDay
    },
  };
}

function formatAdventureResponse(adventure) {
  return {
    id: adventure._id,
    title: adventure.title,
    description: adventure.description,
    completions: adventure.completions,
    shares: adventure.shares,
    viralScore: adventure.viralPotential,
    category: adventure.category,
    template: adventure.template || 'cosmic',
    averageRating: adventure.averageRating,
    difficulty: adventure.difficulty,
    estimatedTime: adventure.estimatedTime,
    createdAt: adventure.createdAt
  };
}

// Fallback data functions
function getFallbackLeaderboard() {
  return [
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
      achievements: ['Creative Mind', 'Daily Achiever']
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
      username: "Adventure Seeker",
      avatar: "⚡",
      score: 987,
      rank: 4,
      streak: 4,
      cardsShared: 4,
      cardsGenerated: 8,
      level: 1,
      achievements: ['Getting Started']
    }
  ];
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
        viralScore: 0.85,
        category: "Mindfulness",
        template: "cosmic",
        averageRating: 4.7,
        difficulty: "easy",
        estimatedTime: "5 minutes"
      },
      {
        id: 'fallback-2',
        title: "Urban Photo Adventure",
        description: "Capture the hidden beauty in your neighborhood",
        completions: 256,
        shares: 67,
        viralScore: 0.78,
        category: "Creativity",
        template: "nature",
        averageRating: 4.5,
        difficulty: "medium",
        estimatedTime: "15 minutes"
      },
      {
        id: 'fallback-3',
        title: "Random Act of Kindness",
        description: "Brighten someone's day with an unexpected gesture",
        completions: 198,
        shares: 92,
        viralScore: 0.92,
        category: "Social",
        template: "retro",
        averageRating: 4.9,
        difficulty: "easy",
        estimatedTime: "10 minutes"
      },
      {
        id: 'fallback-4',
        title: "Mindful Breathing Break",
        description: "Take 5 minutes to focus on your breath and center yourself",
        completions: 423,
        shares: 78,
        viralScore: 0.73,
        category: "Wellness",
        template: "minimal",
        averageRating: 4.4,
        difficulty: "easy",
        estimatedTime: "5 minutes"
      }
    ],
    viralAdventure: {
      title: "Random Act of Kindness",
      description: "Brighten someone's day with an unexpected gesture",
      completions: 198,
      shares: 92,
      viralScore: 0.92
    },
    metadata: {
      totalAdventures: 4,
      category: null,
      generatedAt: new Date().toISOString(),
      fallback: true,
      reason: "Database connection issue or empty collections"
    }
  };
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  if (redisClient) {
    await redisClient.disconnect();
  }
  
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  
  if (redisClient) {
    await redisClient.disconnect();
  }
  
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});