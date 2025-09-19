// Fixed LoginScreen.jsx - Proper callback handling and Google button alignment
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AuthService from '../services/AuthService';

const LoginScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setDebugInfo('Initializing authentication...');
        
        // Check environment
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        console.log('=== Auth Debug ===');
        console.log('Client ID exists:', !!clientId);
        console.log('Client ID preview:', clientId ? clientId.substring(0, 20) + '...' : 'MISSING');
        
        if (!clientId) {
          setError('Google Client ID not configured');
          setDebugInfo('VITE_GOOGLE_CLIENT_ID is missing from environment variables');
          return;
        }

        // FIXED: Set up callback directly on AuthService
        AuthService.setGoogleLoginSuccessCallback((userData) => {
          console.log('✅ Google login success callback triggered:', userData);
          setLoading(false);
          setError('');
          setDebugInfo('Authentication successful!');
          onLoginSuccess(userData);
        });

        // Set up global error handler
        window.handleGoogleLoginError = (errorMessage) => {
          console.error('❌ Google login error callback:', errorMessage);
          setLoading(false);
          setError(errorMessage);
          setDebugInfo(`Error: ${errorMessage}`);
        };

        // Initialize Google
        setDebugInfo('Loading Google services...');
        const ready = await AuthService.initializeGoogleAuth();
        
        if (ready) {
          setGoogleReady(true);
          setDebugInfo('Google services ready');
          
          // Render button after DOM is ready with proper width calculation
          setTimeout(() => {
            const container = document.getElementById('google-button-container');
            if (container) {
              // Set container width to match input fields
              const inputField = document.querySelector('input[type="email"]');
              if (inputField) {
                const inputWidth = inputField.offsetWidth;
                container.style.width = `${inputWidth}px`;
                container.style.margin = '0 auto';
              }
              
              const success = AuthService.renderGoogleButton('google-button-container');
              setDebugInfo(success ? 'Google button rendered with proper width' : 'Button render failed');
              
              // Show the container if button rendered successfully
              if (success) {
                container.style.display = 'block';
                container.parentElement.querySelector('.custom-google-button').style.display = 'none';
              }
            }
          }, 500);
        }

      } catch (error) {
        console.error('Auth initialization failed:', error);
        setError(error.message);
        setDebugInfo(`Initialization failed: ${error.message}`);
      }
    };

    initializeAuth();

    return () => {
      // Clean up callbacks
      delete window.handleGoogleLoginError;
      // Note: AuthService callback is cleaned up internally
    };
  }, [onLoginSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await AuthService.login(formData.email, formData.password);
      } else {
        if (!formData.name.trim()) throw new Error('Name is required');
        if (formData.password !== formData.confirmPassword) throw new Error('Passwords do not match');
        if (formData.password.length < 6) throw new Error('Password must be at least 6 characters');
        
        result = await AuthService.register(formData.email, formData.password, formData.name);
      }

      if (result.success) {
        onLoginSuccess(result.user);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleClick = () => {
    if (!googleReady) {
      setError('Google Sign-In not ready yet');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setDebugInfo('Starting Google sign-in...');
      AuthService.signInWithGoogle();
    } catch (error) {
      setLoading(false);
      setError(error.message);
      setDebugInfo(`Google sign-in failed: ${error.message}`);
    }
  };

  const handleGuestLogin = () => {
    const guestUser = {
      id: `guest_${Date.now()}`,
      name: 'Guest User',
      email: 'guest@demo.com',
      avatar: '👤',
      emailVerified: true,
      isGuest: true,
      provider: 'guest',
      totalPoints: 0,
      level: 1,
      streak: 0,
      cardsGenerated: 0,
      cardsShared: 0,
      stats: { 
        totalPoints: 0, 
        level: 1, 
        streak: 0, 
        cardsGenerated: 0, 
        cardsShared: 0,
        lastActivity: new Date(),
        bestStreak: 0,
        adventuresCompleted: 0,
        moodHistory: [],
        choices: []
      }
    };
    
    localStorage.setItem('sparkvibe_token', `guest_${Date.now()}`);
    localStorage.setItem('sparkvibe_user', JSON.stringify(guestUser));
    onLoginSuccess(guestUser);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-yellow-500 rounded-full flex items-center justify-center"
          >
            <span className="text-white font-bold text-3xl">S</span>
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2">SparkVibe</h1>
          <p className="text-blue-200">{isLogin ? 'Welcome back!' : 'Start your journey'}</p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6"
        >
          {/* Debug Info */}
          {import.meta.env.DEV && debugInfo && (
            <div className="mb-4 p-2 bg-blue-500/20 rounded text-blue-200 text-xs">
              <strong>Debug:</strong> {debugInfo}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Google Sign-In Section */}
          <div className="mb-6">
            {/* Custom Google Button (fallback) */}
            <button
              type="button"
              onClick={handleCustomGoogleClick}
              disabled={loading || !googleReady}
              className="custom-google-button w-full py-3 bg-white hover:bg-gray-50 disabled:opacity-50 rounded-lg text-gray-900 font-semibold transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Official Google Button Container */}
            <div 
              id="google-button-container" 
              className="mt-2 w-full"
              style={{ 
                display: 'none',
                width: '100%',
                textAlign: 'center'
              }}
            ></div>
          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-white/30"></div>
            <span className="px-4 text-white/60 text-sm">or</span>
            <div className="flex-1 border-t border-white/30"></div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
                required={!isLogin}
              />
            )}

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
              required
              minLength={6}
            />

            {!isLogin && (
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
                required={!isLogin}
                minLength={6}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 rounded-lg text-white font-semibold transition-all flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setFormData({ email: '', password: '', name: '', confirmPassword: '' });
                }}
                className="text-blue-200 hover:text-white text-sm underline"
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>

          {/* Guest Option */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white font-medium transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>👤</span>
              <span>Continue as Guest</span>
            </button>
            <p className="text-xs text-white/60 text-center mt-2">
              Guest mode uses demo features and stores data locally
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;