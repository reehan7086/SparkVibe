# SparkVibe Setup Guide

## Prerequisites

- Node.js 20.x or higher (recommended: 20.11.0)
- npm 10.x or higher
- MongoDB (local or cloud instance) - *Optional, app runs in demo mode without it*
- Google OAuth credentials - *Optional for Google Sign-In*

## Quick Start (Demo Mode)

If you want to try SparkVibe quickly without setting up external services:

```bash
# 1. Clone and install
git clone https://github.com/reehan7086/SparkVibe
cd SparkVibe
npm run install-all

# 2. Create minimal environment file
cp env.example .env

# 3. Edit .env and add at minimum:
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters-long

# 4. Build and run
npm run build-frontend
cd backend && npm run dev
# In another terminal:
cd frontend && npm run dev
```

The app will run in demo mode with local data storage.

## Full Setup with All Features

### 1. Environment Setup

```bash
# Copy the environment template
cp env.example .env
```

### 2. Configure Required Variables

Edit `.env` and add these **required** variables:

```bash
# Required for authentication
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters-long

# Required for database (optional - runs in demo mode without it)
MONGODB_URI=mongodb://localhost:27017/sparkvibe
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sparkvibe

# Required for Google OAuth (optional - email auth still works)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Get Google OAuth Credentials (Optional)

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized origins:
   - `http://localhost:5173` (development)
   - `https://your-domain.com` (production)
7. Copy the Client ID to your `.env` file

### 4. Set Up MongoDB (Optional)

**Option A: Local MongoDB**
```bash
# Install MongoDB locally
brew install mongodb/brew/mongodb-community  # macOS
# or follow MongoDB installation guide for your OS

# Start MongoDB
brew services start mongodb/brew/mongodb-community

# Use local connection
MONGODB_URI=mongodb://localhost:27017/sparkvibe
```

**Option B: MongoDB Atlas (Recommended)**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create free cluster
3. Create database user
4. Get connection string
5. Add to `.env`:
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sparkvibe
```

### 5. Optional Services

Add these to `.env` for enhanced features:

```bash
# AI/NLP for enhanced mood analysis (optional)
NLP_CLOUD_API_KEY=your-nlp-cloud-api-key
OPENAI_API_KEY=your-openai-api-key

# Redis for better performance (optional)
REDIS_URL=redis://localhost:6379

# Email service for notifications (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cloudinary for image uploads (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Installation

```bash
# Install all dependencies (frontend + backend)
npm run install-all

# Build the frontend
npm run build-frontend
```

## Running the Application

### Development Mode

1. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend (in another terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080

### Production Mode

```bash
# Build everything
npm run build

# Start the backend
cd backend
npm start
```

## Features Status

✅ **Always Available:**
- User authentication (email + password)
- Mood analysis (basic fallback)
- Adventure generation
- Vibe card creation
- Local leaderboards
- Demo mode with local storage

✅ **With MongoDB:**
- Persistent user data
- Friend system
- Challenges
- Analytics tracking
- Achievement system
- Real leaderboards

✅ **With Google OAuth:**
- Google Sign-In
- Faster registration

✅ **With AI APIs:**
- Enhanced mood analysis
- Better adventure recommendations
- Personalized content

## API Endpoints

### Authentication
- `POST /auth/signup` - User registration  
- `POST /auth/signin` - Email/password login
- `POST /auth/google` - Google OAuth login

### Core Features  
- `POST /analyze-mood` - Mood analysis
- `POST /generate-capsule-simple` - Adventure generation
- `POST /generate-enhanced-vibe-card` - Enhanced vibe card
- `GET /user/profile` - User profile
- `POST /user/sync-stats` - Sync statistics

### Social Features
- `GET /friends` - User's friends
- `POST /friends/request` - Send friend request  
- `POST /friends/accept` - Accept request
- `GET /challenges` - User challenges
- `POST /challenges/create` - Create challenge

### Analytics & Data
- `POST /track-event` - Track user events
- `POST /track-share` - Track card sharing
- `GET /leaderboard` - Get leaderboard
- `GET /leaderboard-enhanced` - Enhanced leaderboard with filters
- `GET /trending-adventures` - Get trending adventures
- `GET /notifications` - Get notifications
- `POST /notifications/read` - Mark notifications as read

## Troubleshooting

### Common Issues

1. **"JWT_SECRET must be at least 32 characters"**
   ```bash
   # Generate a secure JWT secret
   openssl rand -base64 48
   # Or use online generator: https://generate-secret.vercel.app/32
   ```

2. **MongoDB Connection Failed**
   - Check your `MONGODB_URI` in `.env`
   - Ensure MongoDB is running (if local)
   - Verify network connectivity for Atlas
   - **Solution:** App runs in demo mode without MongoDB

3. **Google OAuth Not Working**
   - Check `GOOGLE_CLIENT_ID` in `.env`
   - Verify OAuth credentials in Google Console
   - Ensure authorized origins are correct
   - **Solution:** Use email authentication instead

4. **Frontend Can't Connect to Backend**
   - Check `VITE_API_URL` in `.env`
   - Ensure backend is running on correct port
   - Verify CORS settings in server.js

5. **Build Errors**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   rm -rf frontend/node_modules frontend/package-lock.json  
   rm -rf backend/node_modules backend/package-lock.json
   npm cache clean --force
   npm run install-all
   ```

6. **Node Version Issues**
   ```bash
   # Use Node 20.x
   nvm install 20.11.0
   nvm use 20.11.0
   ```

### Demo Mode vs Full Mode

**Demo Mode (No External Services):**
- ✅ All core features work
- ✅ Local data storage  
- ✅ Basic mood analysis
- ❌ No data persistence between sessions
- ❌ No real-time features
- ❌ No social features

**Full Mode (With MongoDB + Services):**
- ✅ All features enabled
- ✅ Data persistence  
- ✅ Real-time WebSocket features
- ✅ Social features (friends, challenges)
- ✅ Enhanced AI features
- ✅ Analytics and insights

### Development Tips

1. **Check server status:**
   ```bash
   curl http://localhost:8080/health
   ```

2. **View logs:**
   ```bash
   # Backend logs
   cd backend && npm run dev

   # Frontend logs  
   cd frontend && npm run dev
   ```

3. **Test API endpoints:**
   ```bash
   # Health check
   curl http://localhost:8080/health
   
   # Leaderboard
   curl http://localhost:8080/leaderboard
   ```

4. **Reset demo data:**
   - Clear browser localStorage
   - Restart backend server

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JWT_SECRET` | ✅ | Authentication secret (32+ chars) | `your-secret-key-32-chars-minimum` |
| `MONGODB_URI` | ❌ | Database connection string | `mongodb://localhost:27017/sparkvibe` |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID | `123456789.apps.googleusercontent.com` |
| `VITE_GOOGLE_CLIENT_ID` | ❌ | Same as above for frontend | Same as `GOOGLE_CLIENT_ID` |
| `NLP_CLOUD_API_KEY` | ❌ | AI mood analysis | `your-nlp-cloud-key` |
| `OPENAI_API_KEY` | ❌ | OpenAI integration | `sk-your-openai-key` |
| `REDIS_URL` | ❌ | Cache/session store | `redis://localhost:6379` |
| `NODE_ENV` | ❌ | Environment | `development` or `production` |
| `PORT` | ❌ | Backend port | `8080` |
| `VITE_API_URL` | ❌ | Frontend API URL | `http://localhost:8080` |

## Deployment

### Backend Deployment (DigitalOcean App Platform)

1. **Create app.yaml:**
   ```yaml
   name: sparkvibe-backend
   services:
   - name: backend
     source_dir: /backend
     github:
       repo: your-username/SparkVibe
       branch: main
     run_command: node server.js
     environment_slug: node-js
     instance_size_slug: basic-xxs
     envs:
       - key: NODE_ENV
         value: production
       - key: JWT_SECRET
         value: your-production-secret
       - key: MONGODB_URI
         value: your-mongodb-atlas-uri
   ```

2. **Deploy:**
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Deploy setup"
   git push origin main
   
   # Deploy on DigitalOcean App Platform
   # Connect GitHub repo and deploy
   ```

### Frontend Deployment (Vercel/Netlify)

1. **Build command:** `cd frontend && npm run build`
2. **Publish directory:** `frontend/dist`
3. **Environment variables:**
   ```bash
   VITE_API_URL=https://your-backend-url
   VITE_GOOGLE_CLIENT_ID=your-google-client-id
   ```

## Security Notes

- Use strong JWT secrets (32+ characters)
- Enable MongoDB authentication in production
- Use HTTPS in production
- Set secure CORS origins
- Keep API keys private
- Use environment variables, never commit secrets
- Consider using a secret management service

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly in both demo and full modes
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Open a GitHub issue
- **Demo**: The app includes comprehensive demo mode for testing

## Version History

- **v2.5.0**: Enhanced features with demo mode support
- **v2.1.0**: Added social features and challenges  
- **v2.0.0**: Complete UI/UX overhaul with AI integration
- **v1.0.0**: Initial release with core mood tracking