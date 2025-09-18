# SparkVibe Setup Guide

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- MongoDB (local or cloud instance)
- Google OAuth credentials (optional)

## Environment Setup

1. Copy the environment template:
   ```bash
   cp env.example .env
   ```

2. Fill in your environment variables in `.env`:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure secret key (minimum 32 characters)
   - `GOOGLE_CLIENT_ID`: Google OAuth client ID
   - `VITE_GOOGLE_CLIENT_ID`: Same as above for frontend
   - Optional services: OpenAI, Redis, Email, Cloudinary

## Installation

1. Install all dependencies:
   ```bash
   npm run install-all
   ```

2. Build the frontend:
   ```bash
   npm run build-frontend
   ```

## Running the Application

### Development Mode

1. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

### Production Mode

1. Build everything:
   ```bash
   npm run build
   ```

2. Start the backend:
   ```bash
   cd backend
   npm start
   ```

## Features Fixed

✅ **Critical Issues Fixed:**
- Fixed syntax error in backend server
- Added missing authentication endpoints (`/auth/signin`)
- Added missing API endpoints (`/analyze-mood`, `/generate-capsule-simple`)
- Improved JWT configuration (7-day expiration)
- Enhanced password validation
- Fixed CORS configuration
- Improved rate limiting with endpoint-specific limits

✅ **Security Improvements:**
- Added password strength validation
- Enhanced input sanitization
- Improved error handling
- Better JWT token management

✅ **Performance Optimizations:**
- Added code splitting in Vite config
- Optimized WebSocket connection handling
- Improved service worker caching
- Enhanced bundle optimization

✅ **Code Quality:**
- Removed console.log statements from production
- Added MongoDB schema validation
- Improved error boundary implementation
- Enhanced state management utilities
- Fixed Node.js version consistency

✅ **Configuration:**
- Fixed Node.js version mismatches
- Improved Vite build configuration
- Enhanced service worker functionality
- Better environment variable handling

## API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/signin` - Email/password login
- `POST /auth/google` - Google OAuth login

### Core Features
- `POST /analyze-mood` - Mood analysis
- `POST /generate-capsule-simple` - Simple capsule generation
- `POST /generate-enhanced-vibe-card` - Enhanced vibe card generation
- `GET /user/profile` - Get user profile
- `POST /user/sync-stats` - Sync user statistics

### Social Features
- `GET /friends` - Get user's friends
- `POST /friends/request` - Send friend request
- `POST /friends/accept` - Accept friend request
- `GET /challenges` - Get user challenges
- `POST /challenges/create` - Create challenge

### Analytics
- `POST /track-event` - Track user events
- `POST /track-share` - Track card sharing
- `GET /leaderboard` - Get leaderboard
- `GET /notifications` - Get notifications

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check your `MONGODB_URI` in `.env`
   - Ensure MongoDB is running
   - Verify network connectivity

2. **Google OAuth Not Working**
   - Check `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`
   - Verify OAuth credentials in Google Console
   - Ensure redirect URIs are configured

3. **JWT Errors**
   - Ensure `JWT_SECRET` is at least 32 characters
   - Check token expiration settings
   - Verify token format

4. **Build Errors**
   - Run `npm run install-all` to ensure all dependencies are installed
   - Check Node.js version compatibility
   - Clear npm cache if needed: `npm cache clean --force`

### Development Tips

- Use `npm run dev` in both frontend and backend for development
- Check browser console for frontend errors
- Check server logs for backend errors
- Use the `/health` endpoint to verify backend status

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
