// src/components/LoginScreen.jsx
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

  // Initialize Google OAuth
  useEffect(() => {
    const initGoogle = async () => {
      try {
        const ready = await AuthService.initializeGoogleAuth();
        setGoogleReady(ready);
        
        // Set global callback handlers
        window.handleGoogleLoginSuccess = (userData) => {
          console.log('Google login successful:', userData);
          onLoginSuccess(userData);
        };
        
        window.handleGoogleLoginError = (errorMessage) => {
          console.error('Google login error:', errorMessage);
          setError(errorMessage);
        };
        
        // Render Google button after a short delay to ensure DOM is ready
        setTimeout(() => {
          if (ready) {
            try {
              AuthService.renderGoogleButton('google-signin-button');
            } catch (error) {
              console.warn('Failed to render Google button:', error);
            }
          }
        }, 500);
      } catch (error) {
        console.error('Google initialization error:', error);
      }
    };

    // Load Google Identity Services script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      script.onerror = () => {
        console.error('Failed to load Google Identity Services');
        setError('Google sign-in unavailable');
      };
      document.head.appendChild(script);
    } else {
      initGoogle();
    }

    // Cleanup
    return () => {
      delete window.handleGoogleLoginSuccess;
      delete window.handleGoogleLoginError;
    };
  }, [onLoginSuccess]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;
      if (isLogin) {
        response = await AuthService.login(formData.email, formData.password);
      } else {
        if (!formData.name.trim()) {
          throw new Error('Name is required');
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        response = await AuthService.register(formData.email, formData.password, formData.name);
      }

      if (response.success) {
        onLoginSuccess(response.user);
      }
    } catch (error) {
      setError(error.message || `${isLogin ? 'Login' : 'Registration'} failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    try {
      setError('');
      AuthService.signInWithGoogle();
    } catch (error) {
      setError(error.message || 'Google sign-in failed');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    });
  };

  const handleGuestLogin = () => {
    const guestUser = {
      id: `guest_${Date.now()}`,
      name: 'Guest Explorer',
      email: 'guest@sparkvibe.demo',
      avatar: '👤',
      emailVerified: true,
      isGuest: true,
      stats: {
        totalPoints: 0,
        level: 1,
        streak: 0,
        cardsGenerated: 0,
        cardsShared: 0,
      },
      preferences: {
        adventureTypes: ['general'],
        difficulty: 'easy',
      },
    };
    
    // Store guest session
    localStorage.setItem('sparkvibe_token', `guest_token_${Date.now()}`);
    localStorage.setItem('sparkvibe_user', JSON.stringify(guestUser));
    
    onLoginSuccess(guestUser);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo and Header */}
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
          <p className="text-blue-200">
            {isLogin ? 'Welcome back!' : 'Start your journey'} 
          </p>
        </div>

        {/* Login/Register Form */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-sm rounded-xl p-6 md:p-8"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-white text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                placeholder="Enter your password"
              />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-white text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!isLogin}
                  minLength={6}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  placeholder="Confirm your password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-all duration-300 flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-blue-200 hover:text-white text-sm underline"
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-white/30"></div>
            <span className="px-4 text-white/60 text-sm">or</span>
            <div className="flex-1 border-t border-white/30"></div>
          </div>

          {/* Google Sign In Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-gray-900 font-semibold transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Google Sign In Container for Rendered Button */}
            <div id="google-signin-button" className="w-full flex justify-center"></div>

            {/* Guest Login Button */}
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-white font-medium transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <span className="text-lg">👤</span>
              <span>Continue as Guest</span>
            </button>
          </div>

          {/* Features showcase */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-center text-sm text-white/60 mb-4">
              Transform your mood into meaningful moments
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="text-white/60">
                <div className="text-2xl mb-1">🧠</div>
                <p className="text-xs">AI Mood Analysis</p>
              </div>
              <div className="text-white/60">
                <div className="text-2xl mb-1">🎨</div>
                <p className="text-xs">Viral Card Generation</p>
              </div>
              <div className="text-white/60">
                <div className="text-2xl mb-1">🏆</div>
                <p className="text-xs">Social Challenges</p>
              </div>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="mt-4 text-center">
            <p className="text-xs text-white/50">
              By continuing, you agree to our{' '}
              <a href="/terms" className="underline hover:text-white">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;