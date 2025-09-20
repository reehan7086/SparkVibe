// Fixed LoginScreen.jsx - Updated for Google Identity Services
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
  const [googleError, setGoogleError] = useState('');

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const ready = await AuthService.initializeGoogleAuth();
        setGoogleReady(ready);
        
        if (ready) {
          // Render Google button after a short delay
          setTimeout(() => {
            AuthService.renderGoogleButton('google-signin-button', {
              width: Math.min(window.innerWidth - 64, 320),
              theme: 'outline',
              size: 'large',
              text: 'signin_with'
            });
          }, 500);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        setGoogleError('Google Sign-In unavailable');
      }
    };

    // Listen for Google auth events
    const handleGoogleSuccess = (event) => {
      setLoading(false);
      setError('');
      onLoginSuccess(event.detail.user);
    };

    const handleGoogleError = (event) => {
      setLoading(false);
      setError(event.detail.error);
    };

    window.addEventListener('googleLoginSuccess', handleGoogleSuccess);
    window.addEventListener('googleLoginError', handleGoogleError);

    initializeAuth();

    return () => {
      window.removeEventListener('googleLoginSuccess', handleGoogleSuccess);
      window.removeEventListener('googleLoginError', handleGoogleError);
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

  const handleGoogleClick = async () => {
    if (!googleReady) {
      setError('Google Sign-In not ready yet');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await AuthService.signInWithGoogle();
    } catch (error) {
      setLoading(false);
      setError(error.message);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Mobile-optimized background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-pink-500/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Main container */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-yellow-500 rounded-full flex items-center justify-center"
            >
              <span className="text-white font-bold text-2xl">S</span>
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">SparkVibe</h1>
            <p className="text-blue-200 text-sm">{isLogin ? 'Welcome back!' : 'Start your journey'}</p>
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 space-y-6"
          >
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* Google Sign-In */}
            <div className="space-y-3">
              {/* Google Button Container */}
              <div 
                id="google-signin-button" 
                className="w-full flex justify-center"
                style={{ minHeight: '40px' }}
              />
              
              {/* Fallback Google Button */}
              {!googleReady && (
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={loading}
                  className="w-full py-3 bg-white hover:bg-gray-50 disabled:opacity-50 rounded-lg text-gray-900 font-semibold transition-all flex items-center justify-center space-x-2"
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
              )}

              {googleError && (
                <p className="text-yellow-400 text-xs text-center">{googleError}</p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center">
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
                  autocomplete="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  required={!isLogin}
                />
              )}

              <input
                type="email"
                name="email"
                placeholder="Email"
                autocomplete="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                required
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
                autocomplete="current-password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
            <div className="pt-4 border-t border-white/20">
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

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-white/40">
              By continuing, you agree to our Terms & Privacy Policy
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginScreen;