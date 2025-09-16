// server.js
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

// Required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
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
let openai, googleClient, redisClient, emailTransporter;

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
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  try {
    const { v2: cloudinary } = require('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('✅ Cloudinary initialized');
  } catch (error) {
    console.warn('⚠️ Cloudinary initialization failed:', error.message);
  }
}

// Email (optional)
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    const nodemailer = require('nodemailer');
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    emailTransporter.verify((error, success) => {
      if (error) {
        console.warn('⚠️ SMTP verification failed:', error.message);
      } else {
        console.log('✅ Email transporter initialized');
      }
    });
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
  emailVerified: { type: Boolean, default: false }, // Changed to false to enforce verification
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
UserSchema.index({ email: 1 }, { unique: true });

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
AdventureSchema.index({ category: 1, completions: -1 });

const User = mongoose.model('User', UserSchema);
const Adventure = mongoose.model('Adventure', AdventureSchema);

// MongoDB Connection
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  retryWrites: true,
  writeConcern: { w: 'majority' },
  serverApi: { version: '1', strict: true, deprecationErrors: true }
};

if (process.env.MONGODB_URI?.includes('replicaSet') || process.env.MONGODB_URI?.includes('mongo.ondigitalocean.com')) {
  mongooseOptions.readPreference = 'primaryPreferred';
  mongooseOptions.directConnection = false;
}

const startServer = async () => {
  try {
    // MongoDB Connection with Event Listeners
    console.log('Connecting to MongoDB...');
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
        console.log(`MongoDB connection attempt ${connectionAttempts}/${maxAttempts}`);
        await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
        await mongoose.connection.db.admin().ping();
        console.log('✅ MongoDB ping successful');
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

    // Register Plugins
    await fastify.register(fastifyCors, {
      origin: (origin, cb) => {
        const allowedOrigins = [
          'https://sparkvibe.app',
          'https://www.sparkvibe.app',
          'https://walrus-app-cczj4.ondigitalocean.app',
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:8080'
        ];
        if (process.env.NODE_ENV !== 'production') {
          allowedOrigins.push(/^http:\/\/localhost:\d+$/);
        }
        console.log(`CORS check for origin: ${origin}`);
        const allowed = !origin || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin));
        console.log(`Origin ${origin} ${allowed ? 'allowed' : 'denied'}`);
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

    // Error Handler
    const sendError = (reply, status, message, details) => {
      console.error(`Error [${status}]: ${message}`, details);
      reply.status(status).send({
        success: false,
        message,
        details: process.env.NODE_ENV === 'development' ? details : undefined
      });
    };

    fastify.setErrorHandler((error, request, reply) => {
      sendError(reply, error.statusCode || 500, error.message || 'Internal server error', error.stack);
    });

    // Authentication Decorator
    fastify.decorate('authenticate', async function (request, reply) {
      try {
        await request.jwtVerify();
        console.log(`JWT verified for user: ${request.user.userId}`);
      } catch (err) {
        sendError(reply, 401, 'Authentication required', err.message);
      }
    });

    // === BASIC ROUTES ===
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
        result.mongodb.connectionString = mongoUri.replace(/:([^:@]*)@/, ':***@');
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
          const pingResult = await mongoose.connection.db.admin().ping();
          result.mongodb.ping = 'success';
          const userCount = await User.countDocuments();
          const adventureCount = await Adventure.countDocuments();
          result.mongodb.counts = { users: userCount, adventures: adventureCount };
        }
        return reply.send(result);
      } catch (error) {
        result.mongodb.error = error.message;
        return reply.status(500).send(result);
      }
    });

    // === AUTHENTICATION ROUTES ===
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
        const user = new User({
          name: sanitizedName,
          email: sanitizedEmail,
          password: hashedPassword,
          authProvider: 'email',
          emailVerified: false,
          preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging' }
        });
        await user.save();
        if (emailTransporter) {
          const verificationToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '1h' });
          await emailTransporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Verify Your SparkVibe Account',
            text: `Click here to verify your email: ${process.env.APP_URL}/verify?token=${verificationToken}`
          });
        }
        const jwtToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });
        return reply.send({
          success: true,
          token: jwtToken,
          message: 'Account created successfully! Please verify your email.',
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
        const user = await User.findOne({ email: sanitizedEmail, authProvider: 'email' });
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return sendError(reply, 401, 'Invalid email or password');
        }
        if (!user.emailVerified) {
          return sendError(reply, 403, 'Email not verified');
        }
        user.stats.lastActivity = new Date();
        await user.save();
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
        reply.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
        try {
          const { token } = request.body;
          if (!token) {
            return sendError(reply, 400, 'Google token is required');
          }
          if (mongoose.connection.readyState !== 1) {
            return sendError(reply, 503, 'Database connection unavailable');
          }
          const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
          });
          const payload = ticket.getPayload();
          if (!payload) {
            return sendError(reply, 401, 'Invalid Google token');
          }
          const { sub: googleId, name, email, picture: avatar } = payload;
          let user = await User.findOne({ googleId });
          if (!user) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = googleId;
              user.avatar = avatar;
              user.authProvider = 'google';
              user.emailVerified = true;
            } else {
              user = new User({
                email,
                name: sanitize(name),
                avatar,
                googleId,
                authProvider: 'google',
                emailVerified: true,
                preferences: { interests: ['wellness', 'creativity'], aiPersonality: 'encouraging' }
              });
            }
            await user.save();
          }
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
          return sendError(reply, 401, 'Google authentication failed', error.message);
        }
      });
    }

    fastify.post('/auth/refresh-token', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const userId = request.user.userId;
        const user = await User.findById(userId);
        if (!user) {
          return sendError(reply, 404, 'User not found');
        }
        const newToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '7d' });
        return reply.send({ success: true, token: newToken });
      } catch (error) {
        return sendError(reply, 500, 'Token refresh failed', error.message);
      }
    });

    fastify.post('/auth/resend-verification', async (request, reply) => {
      try {
        const { email } = request.body;
        if (!email) {
          return sendError(reply, 400, 'Email is required');
        }
        if (!emailTransporter) {
          return sendError(reply, 503, 'Email service not configured');
        }
        const user = await User.findOne({ email: sanitize(email.toLowerCase()) });
        if (!user) {
          return sendError(reply, 404, 'User not found');
        }
        if (user.emailVerified) {
          return sendError(reply, 400, 'Email already verified');
        }
        const verificationToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '1h' });
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject: 'Verify Your SparkVibe Account',
          text: `Click here to verify your email: ${process.env.APP_URL}/verify?token=${verificationToken}`
        });
        return reply.send({ success: true, message: 'Verification email sent' });
      } catch (error) {
        return sendError(reply, 500, 'Failed to resend verification email', error.message);
      }
    });

    fastify.post('/auth/verify-email', async (request, reply) => {
      try {
        const { token } = request.body;
        if (!token) {
          return sendError(reply, 400, 'Token is required');
        }
        const decoded = fastify.jwt.verify(token);
        const user = await User.findById(decoded.userId);
        if (!user) {
          return sendError(reply, 404, 'User not found');
        }
        if (user.emailVerified) {
          return sendError(reply, 400, 'Email already verified');
        }
        user.emailVerified = true;
        await user.save();
        return reply.send({ success: true, message: 'Email verified successfully' });
      } catch (error) {
        return sendError(reply, 401, 'Invalid or expired token', error.message);
      }
    });

    fastify.post('/auth/reset-password', async (request, reply) => {
      try {
        const { email } = request.body;
        if (!email) {
          return sendError(reply, 400, 'Email is required');
        }
        if (!emailTransporter) {
          return sendError(reply, 503, 'Email service not configured');
        }
        const user = await User.findOne({ email: sanitize(email.toLowerCase()) });
        if (!user) {
          return sendError(reply, 404, 'User not found');
        }
        const resetToken = fastify.jwt.sign({ userId: user._id }, { expiresIn: '1h' });
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject: 'Reset Your SparkVibe Password',
          text: `Click here to reset your password: ${process.env.APP_URL}/reset-password?token=${resetToken}`
        });
        return reply.send({ success: true, message: 'Password reset email sent' });
      } catch (error) {
        return sendError(reply, 500, 'Failed to send reset email', error.message);
      }
    });

    fastify.post('/auth/reset-password/confirm', async (request, reply) => {
      try {
        const { token, password } = request.body;
        if (!token || !password) {
          return sendError(reply, 400, 'Token and password are required');
        }
        const decoded = fastify.jwt.verify(token);
        const user = await User.findById(decoded.userId);
        if (!user) {
          return sendError(reply, 404, 'User not found');
        }
        user.password = await bcrypt.hash(password, 12);
        await user.save();
        return reply.send({ success: true, message: 'Password reset successfully' });
      } catch (error) {
        return sendError(reply, 401, 'Invalid or expired token', error.message);
      }
    });
fastify.post('/auth/update-profile', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const { name, preferences } = request.body;
    const userId = request.user.userId;
    const updateData = {};
    if (name) updateData.name = sanitize(name);
    if (preferences) updateData.preferences = preferences;
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
    if (!user) {
      return sendError(reply, 404, 'User not found');
    }
    return reply.send({ success: true, user });
  } catch (error) {
    return sendError(reply, 500, 'Profile update failed', error.message);
  }
});

fastify.post('/auth/change-password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  try {
    const { currentPassword, newPassword } = request.body;
    if (!currentPassword || !newPassword) {
      return sendError(reply, 400, 'Current and new password are required');
    }
    const userId = request.user.userId;
    const user = await User.findById(userId);
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return sendError(reply, 401, 'Invalid current password');
    }
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return reply.send({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return sendError(reply, 500, 'Password change failed', error.message);
  }
});
    // === USER ROUTES ===
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
            stats: user.stats,
            achievements: user.achievements,
            preferences: user.preferences
          }
        });
      } catch (error) {
        return sendError(reply, 500, 'Failed to fetch profile', error.message);
      }
    });

    fastify.post('/user/save-mood', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { userId, moodData, timestamp } = request.body;
        if (!userId || !moodData || !timestamp) {
          return sendError(reply, 400, 'Missing required fields');
        }
        if (mongoose.connection.readyState !== 1) {
          return sendError(reply, 503, 'Database connection unavailable');
        }
        await User.findByIdAndUpdate(userId, {
          $push: { 'stats.moodHistory': { mood: moodData, timestamp } },
          'stats.lastActivity': new Date()
        });
        return reply.send({ success: true, message: 'Mood saved' });
      } catch (error) {
        return sendError(reply, 500, 'Failed to save mood', error.message);
      }
    });

    fastify.post('/user/save-choice', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { userId, choice, timestamp, capsuleId } = request.body;
        if (!userId || !choice || !timestamp || !capsuleId) {
          return sendError(reply, 400, 'Missing required fields');
        }
        if (mongoose.connection.readyState !== 1) {
          return sendError(reply, 503, 'Database connection unavailable');
        }
        await User.findByIdAndUpdate(userId, {
          $push: { 'stats.choices': { choice, capsuleId, timestamp } },
          'stats.lastActivity': new Date()
        });
        return reply.send({ success: true, message: 'Choice saved' });
      } catch (error) {
        return sendError(reply, 500, 'Failed to save choice', error.message);
      }
    });

    fastify.post('/user/save-completion', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { userId, capsuleId, pointsEarned, completedAt } = request.body;
        if (!userId || !capsuleId || !pointsEarned || !completedAt) {
          return sendError(reply, 400, 'Missing required fields');
        }
        if (mongoose.connection.readyState !== 1) {
          return sendError(reply, 503, 'Database connection unavailable');
        }
        await User.findByIdAndUpdate(userId, {
          $inc: { 'stats.adventuresCompleted': 1, 'stats.totalPoints': pointsEarned },
          'stats.lastActivity': new Date()
        });
        return reply.send({ success: true, message: 'Completion saved' });
      } catch (error) {
        return sendError(reply, 500, 'Failed to save completion', error.message);
      }
    });

    fastify.post('/user/save-card-generation', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { userId, cardData, generatedAt } = request.body;
        if (!userId || !cardData || !generatedAt) {
          return sendError(reply, 400, 'Missing required fields');
        }
        if (mongoose.connection.readyState !== 1) {
          return sendError(reply, 503, 'Database connection unavailable');
        }
        await User.findByIdAndUpdate(userId, {
          $inc: { 'stats.cardsGenerated': 1 },
          'stats.lastActivity': new Date()
        });
        return reply.send({ success: true, message: 'Card generation saved' });
      } catch (error) {
        return sendError(reply, 500, 'Failed to save card generation', error.message);
      }
    });

    fastify.post('/subscribe-push', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { subscription } = request.body;
        if (!subscription) {
          return sendError(reply, 400, 'Subscription data is required');
        }
        if (mongoose.connection.readyState !== 1) {
          return sendError(reply, 503, 'Database connection unavailable');
        }
        const userId = request.user.userId;
        await User.findByIdAndUpdate(userId, {
          $set: { 'preferences.pushSubscription': subscription }
        });
        return reply.send({ success: true, message: 'Push subscription saved' });
      } catch (error) {
        return sendError(reply, 500, 'Failed to save push subscription', error.message);
      }
    });

    // === CORE APP ROUTES ===
    fastify.post('/analyze-mood', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { textInput } = request.body;
        if (!textInput) {
          return sendError(reply, 400, 'Text input is required');
        }
        const userId = request.user.userId;
        let analysis;
        if (openai) {
          try {
            analysis = await analyzeWithOpenAI(textInput);
          } catch (error) {
            console.warn('OpenAI analysis failed:', error.message);
            analysis = generateFallbackMoodAnalysis(textInput);
          }
        } else {
          analysis = generateFallbackMoodAnalysis(textInput);
        }
        if (mongoose.connection.readyState === 1) {
          await User.findByIdAndUpdate(userId, {
            'stats.lastActivity': new Date()
          });
        }
        return reply.send(analysis);
      } catch (error) {
        return sendError(reply, 500, 'Mood analysis failed', error.message);
      }
    });

    fastify.post('/generate-capsule-simple', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { mood, interests, timeOfDay } = request.body;
        if (!mood || !interests || !timeOfDay) {
          return sendError(reply, 400, 'Mood, interests, and timeOfDay are required');
        }
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
        if (mongoose.connection.readyState === 1) {
          await User.findByIdAndUpdate(userId, {
            $inc: { 'stats.adventuresCompleted': 1 },
            'stats.lastActivity': new Date()
          });
        }
        return reply.send(capsuleData);
      } catch (error) {
        return sendError(reply, 500, 'Capsule generation failed', error.message);
      }
    });

    fastify.post('/update-points', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { points, action } = request.body;
        if (!points || !action) {
          return sendError(reply, 400, 'Points and action are required');
        }
        if (mongoose.connection.readyState !== 1) {
          return sendError(reply, 503, 'Database connection unavailable');
        }
        const userId = request.user.userId;
        const user = await User.findById(userId);
        if (!user) {
          return sendError(reply, 404, 'User not found');
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
        return sendError(reply, 500, 'Failed to update points', error.message);
      }
    });

    fastify.get('/leaderboard', async (request, reply) => {
      try {
        if (!fastify.mongodbConnected) {
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
        const leaders = await User.find(dateFilter)
          .sort({ [sortField]: -1 })
          .limit(50)
          .select('name avatar stats achievements')
          .lean();
        if (leaders.length === 0) {
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
          achievements: (user.achievements || []).slice(0, 3)
        }));
        return reply.send({ success: true, data: leaderboard });
      } catch (error) {
        return sendError(reply, 500, 'Leaderboard fetch failed', error.message, getFallbackLeaderboard());
      }
    });

    fastify.get('/trending-adventures', async (request, reply) => {
      try {
        if (!fastify.mongodbConnected) {
          return reply.send(getFallbackTrending());
        }
        const { category } = request.query;
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
        return sendError(reply, 500, 'Trending fetch failed', error.message, getFallbackTrending());
      }
    });

    fastify.get('/seed-data', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        if (mongoose.connection.readyState !== 1) {
          return sendError(reply, 500, 'Database connection failed', `MongoDB connection state: ${mongoose.connection.readyState}`);
        }
        const existingUsers = await User.countDocuments();
        const existingAdventures = await Adventure.countDocuments();
        let usersCreated = 0;
        let adventuresCreated = 0;

        if (existingUsers === 0) {
          const seedUsers = [
            {
              name: "Alice Johnson",
              email: "alice@example.com",
              avatar: "🚀",
              emailVerified: true,
              authProvider: 'email',
              password: await bcrypt.hash('password123', 12),
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
            // ... other seed users (omitted for brevity)
          ];
          for (const userData of seedUsers) {
            try {
              const user = await User.findOneAndUpdate(
                { email: userData.email },
                userData,
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );
              if (user) usersCreated++;
            } catch (userError) {
              console.error(`Failed to create user ${userData.email}:`, userError.message);
            }
          }
        }

        if (existingAdventures === 0) {
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
            // ... other seed adventures (omitted for brevity)
          ];
          for (const adventureData of seedAdventures) {
            try {
              const adventure = await Adventure.findOneAndUpdate(
                { title: adventureData.title },
                adventureData,
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );
              if (adventure) adventuresCreated++;
            } catch (adventureError) {
              console.error(`Failed to create adventure ${adventureData.title}:`, adventureError.message);
            }
          }
        }

        const totalUsers = await User.countDocuments();
        const totalAdventures = await Adventure.countDocuments();
        return reply.send({
          success: true,
          message: "Seed data process completed successfully!",
          created: { users: usersCreated, adventures: adventuresCreated },
          totals: { users: totalUsers, adventures: totalAdventures },
          database: {
            connected: mongoose.connection.readyState === 1,
            name: mongoose.connection.name,
            host: mongoose.connection.host
          }
        });
      } catch (error) {
        return sendError(reply, 500, 'Seed data failed', error.message);
      }
    });

    // Start server
    const port = process.env.PORT || 8080;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 SparkVibe API Server running on port ${port}`);
    console.log(`🌐 Server URL: http://localhost:${port}`);
    console.log('📋 Available endpoints:');
    console.log('  GET  / - Server info');
    console.log('  GET  /health - Health check');
    console.log('  GET  /test-db-connection - Database connection test');
    console.log('  POST /auth/signup - User registration');
    console.log('  POST /auth/signin - User login');
    console.log('  POST /auth/google - Google OAuth (if configured)');
    console.log('  POST /auth/refresh-token - Refresh JWT');
    console.log('  POST /auth/resend-verification - Resend verification email');
    console.log('  POST /auth/verify-email - Verify email');
    console.log('  POST /auth/reset-password - Request password reset');
    console.log('  POST /auth/reset-password/confirm - Confirm password reset');
    console.log('  GET  /user/profile - User profile (auth required)');
    console.log('  POST /user/save-mood - Save mood (auth required)');
    console.log('  POST /user/save-choice - Save choice (auth required)');
    console.log('  POST /user/save-completion - Save completion (auth required)');
    console.log('  POST /user/save-card-generation - Save card generation (auth required)');
    console.log('  POST /subscribe-push - Save push subscription (auth required)');
    console.log('  POST /analyze-mood - Mood analysis (auth required)');
    console.log('  POST /generate-capsule-simple - Generate adventure (auth required)');
    console.log('  POST /update-points - Update user points (auth required)');
    console.log('  GET  /leaderboard - User leaderboard');
    console.log('  GET  /trending-adventures - Trending adventures');
    console.log('  GET  /seed-data - Create test data (auth required)');

  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
};

// Helper Functions (unchanged from original where possible)
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
        content: 'You are a mood analyst. Respond with JSON containing: mood, confidence, emotions, recommendations, suggestedTemplate, energyLevel, socialMood.'
      },
      {
        role: 'user',
        content: `Analyze this mood: "${textInput}"`
      }
    ],
    max_tokens: 200,
    temperature: 0.7
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
    socialMood: 'balanced'
  };
}

async function generateWithOpenAI(mood, interests, timeOfDay) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'Generate a personalized adventure capsule. Respond with JSON containing: capsule, adventure (object with title, prompt, difficulty, estimatedTime, category), moodBoost, brainBite, habitNudge, viralPotential.'
      },
      {
        role: 'user',
        content: `Create an adventure for someone feeling ${mood} at ${timeOfDay}. Interests: ${interests?.join(', ')}`
      }
    ],
    max_tokens: 400,
    temperature: 0.8
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
      options: ['Start this adventure now', 'Save for later', 'Share with a friend']
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
    viralScore: adventure.viralPotential,
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
      // ... other fallback leaderboard entries (omitted for brevity)
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
        viralScore: 0.85,
        category: "Mindfulness",
        template: "cosmic",
        averageRating: 4.7,
        difficulty: "easy",
        estimatedTime: "5 minutes"
      },
      // ... other fallback trending entries (omitted for brevity)
    ],
    metadata: {
      totalAdventures: 4,
      category: null,
      generatedAt: new Date().toISOString(),
      fallback: true,
      reason: "Database connection issue or empty collections"
    }
  };
}

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  if (redisClient) await redisClient.disconnect();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  if (redisClient) await redisClient.disconnect();
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});