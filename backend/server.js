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
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ Connected to MongoDB');

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
          // Add your frontend deployment URLs here
        ];
        
        // In development, allow localhost
        if (process.env.NODE_ENV !== 'production') {
          allowedOrigins.push(
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:8080'
          );
        }
        
        const allowed = allowedOrigins.includes(origin);
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
      crossOriginOpenerPolicy: false,
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
    
    // Root endpoint
    fastify.get('/', async (request, reply) => {
      const services = await checkServiceHealth();
      return reply.send({
        message: 'SparkVibe API Server - Production v2.1.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        services,
        environment: process.env.NODE_ENV || 'development'
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
      };
      return reply.send(health);
    });

    // === AUTHENTICATION ROUTES ===
    
    // Email signup (simplified)
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
          emailVerified: true, // Skip verification for now
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
        try {
          const { token } = request.body;
          
          if (!token) {
            return reply.status(400).send({
              success: false,
              message: 'Google token is required'
            });
          }

          const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID, // Fixed: was VITE_GOOGLE_CLIENT_ID
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
    
    // Mood analysis (simplified)
    fastify.post('/analyze-mood', { preHandler: [fastify.authenticate] }, async (request, reply) => {
      try {
        const { textInput } = request.body;
        const userId = request.user.userId;

        let analysis;
        
        // Try OpenAI if available
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

        // Update user activity
        await User.findByIdAndUpdate(userId, {
          'stats.lastActivity': new Date(),
        });

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

        const user = await User.findById(userId);
        let capsuleData;

        // Try AI generation if OpenAI is available
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

        // Update user stats
        await User.findByIdAndUpdate(userId, {
          $inc: { 'stats.adventuresCompleted': 1 },
          'stats.lastActivity': new Date(),
        });

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

        const user = await User.findById(userId);
        if (!user) {
          return reply.status(404).send({
            success: false,
            message: 'User not found'
          });
        }

        // Update user points
        const pointsToAdd = points || 10;
        user.stats.totalPoints += pointsToAdd;
        user.stats.lastActivity = new Date();

        // Update streak if daily activity
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

    // Leaderboard
    fastify.get('/leaderboard', async (request, reply) => {
      try {
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
          achievements: user.achievements.slice(0, 3),
        }));

        return reply.send(leaderboard);
      } catch (error) {
        console.error('Leaderboard fetch failed:', error);
        return reply.status(500).send({ 
          success: false,
          error: 'Leaderboard fetch failed' 
        });
      }
    });

    // Trending adventures
    fastify.get('/trending-adventures', async (request, reply) => {
      try {
        const { category } = request.query;
        let filter = { isActive: true };
        
        if (category && category !== 'all') {
          filter.category = sanitize(category);
        }

        const trending = await Adventure.find(filter)
          .sort({ completions: -1, shares: -1 })
          .limit(10);

        const response = {
          success: true,
          trending: trending.map(formatAdventureResponse),
          metadata: {
            totalAdventures: await Adventure.countDocuments({ isActive: true }),
            category,
            generatedAt: new Date().toISOString(),
          },
        };

        return reply.send(response);
      } catch (error) {
        console.error('Trending fetch failed:', error);
        return reply.status(500).send({ 
          success: false,
          error: 'Trending fetch failed' 
        });
      }
    });

    // Seed data for testing
    fastify.get('/seed-data', async (request, reply) => {
      try {
        // Clear existing data
        await User.deleteMany({});
        await Adventure.deleteMany({});

        // Create test users
        const users = await User.insertMany([
          {
            name: "Alice Johnson",
            email: "alice@example.com",
            avatar: "🚀",
            emailVerified: true,
            stats: {
              totalPoints: 1200,
              streak: 7,
              cardsGenerated: 15,
              cardsShared: 8,
              level: 3,
              lastActivity: new Date()
            }
          },
          {
            name: "Bob Smith",
            email: "bob@example.com",
            avatar: "🌟",
            emailVerified: true,
            stats: {
              totalPoints: 950,
              streak: 4,
              cardsGenerated: 12,
              cardsShared: 6,
              level: 2,
              lastActivity: new Date()
            }
          },
          {
            name: "Carol Davis",
            email: "carol@example.com",
            avatar: "🎯",
            emailVerified: true,
            stats: {
              totalPoints: 750,
              streak: 2,
              cardsGenerated: 9,
              cardsShared: 4,
              level: 2,
              lastActivity: new Date()
            }
          }
        ]);

        // Create test adventures
        const adventures = await Adventure.insertMany([
          {
            title: "Morning Sunrise Meditation",
            description: "Start your day with peaceful meditation",
            category: "Mindfulness",
            completions: 156,
            shares: 67,
            viralPotential: 0.85,
            template: "cosmic",
            averageRating: 4.8,
            difficulty: "easy",
            estimatedTime: "10 minutes"
          },
          {
            title: "Urban Photography Walk",
            description: "Capture the beauty of city life",
            category: "Creativity",
            completions: 134,
            shares: 89,
            viralPotential: 0.92,
            template: "nature",
            averageRating: 4.6,
            difficulty: "medium",
            estimatedTime: "30 minutes"
          },
          {
            title: "Gratitude Journal Challenge",
            description: "Write three things you're grateful for",
            category: "Mindfulness",
            completions: 98,
            shares: 34,
            viralPotential: 0.73,
            template: "minimal",
            averageRating: 4.4,
            difficulty: "easy",
            estimatedTime: "5 minutes"
          }
        ]);

        return reply.send({ 
          success: true, 
          message: "Test data seeded successfully",
          users: users.length,
          adventures: adventures.length
        });
      } catch (error) {
        console.error('Seed data failed:', error);
        return reply.status(500).send({ 
          success: false,
          error: "Seed data failed",
          details: error.message 
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