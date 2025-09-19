// Fixed backend/server.js - Critical Issues Resolved
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
const fastifyStatic = require('@fastify/static');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const sanitize = require('mongo-sanitize');
const path = require('path');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

// CRITICAL FIX: Validate required environment variables
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL: JWT_SECRET must be at least 32 characters long');
  console.error('Current JWT_SECRET length:', JWT_SECRET ? JWT_SECRET.length : 0);
  console.error('Please set a proper JWT_SECRET in your environment variables');
  process.exit(1);
}

console.log('✅ JWT_SECRET validated successfully');

// Optional service initialization with proper error handling
let googleClient;
try {
  if (process.env.GOOGLE_CLIENT_ID) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    console.log('✅ Google OAuth initialized');
  } else {
    console.log('ℹ️ Google OAuth not configured (optional)');
  }
} catch (error) {
  console.warn('⚠️ Google OAuth initialization failed:', error.message);
}

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
    sign: { expiresIn: '7d' },
    verify: { maxAge: '7d' }
  });

  await fastify.register(fastifyMultipart, {
    limits: { fileSize: 10 * 1024 * 1024 }
  });

  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, 'uploads'),
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
    }
  });
};

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
    minlength: 2,
    maxlength: 50
  },
  password: { 
    type: String,
    minlength: 8
  },
  googleId: String,
  avatar: String,
  emailVerified: { type: Boolean, default: false },
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
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
      }
    }

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

    const sanitizedEmail = sanitize(email.toLowerCase());
    
    let user;
    if (User) {
      user = await User.findOne({ email: sanitizedEmail });
      if (!user || !user.password) {
        return reply.status(401).send({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
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
        stats: {
          totalPoints: 0,
          level: 1,
          streak: 0,
          cardsGenerated: 0,
          cardsShared: 0,
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
          stats: {
            totalPoints: 0,
            level: 1,
            streak: 0,
            cardsGenerated: 0,
            cardsShared: 0,
            lastActivity: new Date()
          }
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
        }
      };
    }
    
    const jwtToken = fastify.jwt.sign({ 
      userId: user._id,
      email: user.email 
    });
    
    reply.send({
      success: true,
      data: {
        token: jwtToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          emailVerified: user.emailVerified,
          stats: user.stats
        }
      },
      message: 'Google login successful!'
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
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

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