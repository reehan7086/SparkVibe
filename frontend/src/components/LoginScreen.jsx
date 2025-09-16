// LoginScreen.jsx
import { useState, useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import AuthService from '../services/AuthService';

const LoginScreen = ({ onAuthSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailFormData, setEmailFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [isSignUp, setIsSignUp] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [googleRetries, setGoogleRetries] = useState(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [containerRef] = useAutoAnimate();
  const [errorRef] = useAutoAnimate();

  useEffect(() => {
    const initializeGoogleWithRetry = async (retries = 3, delay = 2000) => {
      for (let i = 0; i < retries; i++) {
        try {
          await AuthService.initializeGoogle();
          console.log('Google Sign-In initialized');
          return;
        } catch (err) {
          console.error(`Google init attempt ${i + 1} failed:`, err);
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      setError('Failed to initialize Google Sign-In. Please use email sign-in.');
    };
    initializeGoogleWithRetry();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 10000); // Clear error after 10s
      return () => clearTimeout(timer);
    }
  }, [error]);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Starting Google Sign-In...');
      const user = await AuthService.signInWithGoogle();
      console.log('Google Sign-In successful:', user);
      const enhancedUser = {
        id: user.id,
        name: user.name || 'Google User',
        email: user.email,
        avatar: user.avatar || '🚀',
        emailVerified: user.emailVerified,
        stats: user.stats || {
          totalPoints: 0,
          level: 1,
          streak: 0,
          cardsGenerated: 0,
          cardsShared: 0,
        },
        preferences: user.preferences || { adventureTypes: ['general'], difficulty: 'easy' },
        loginTimestamp: new Date().toISOString(),
      };
      onAuthSuccess(enhancedUser);
    } catch (error) {
      console.error('Google sign-in error:', error);
      const retryCount = googleRetries + 1;
      setGoogleRetries(retryCount);
      if (error.message.includes('popup')) {
        setError('Pop-up blocked. Please allow pop-ups and try again.');
      } else if (error.message.includes('cancelled') || error.message.includes('closed')) {
        setError('Sign-in cancelled. Please try again.');
      } else if (error.message.includes('Client ID') || error.message.includes('configuration')) {
        setError('Google Sign-In setup issue. Please use email sign-in.');
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        setError('Network error. Please check your connection and try again.');
      } else if (retryCount >= 3) {
        setError('Google Sign-In failed multiple times. Please use email sign-in or try again later.');
        setShowTroubleshooting(true);
      } else {
        setError('Google Sign-In failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        if (!validateEmail(emailFormData.email)) {
          setError('Please enter a valid email address.');
          return;
        }
        if (emailFormData.password !== emailFormData.confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        if (emailFormData.password.length < 6) {
          setError('Password must be at least 6 characters long.');
          return;
        }
        if (!emailFormData.name.trim()) {
          setError('Name is required.');
          return;
        }
        const result = await AuthService.signUpWithEmail(emailFormData);
        if (result.success) {
          setVerificationSent(true);
        } else {
          setError(result.message || 'Sign-up failed. Please try again.');
        }
      } else {
        if (!validateEmail(emailFormData.email)) {
          setError('Please enter a valid email address.');
          return;
        }
        const user = await AuthService.signInWithEmail({
          email: emailFormData.email,
          password: emailFormData.password,
        });
        const enhancedUser = {
          id: user.id,
          name: user.name || emailFormData.email.split('@')[0],
          email: user.email,
          avatar: user.avatar || '📧',
          emailVerified: user.emailVerified,
          stats: user.stats || {
            totalPoints: 0,
            level: 1,
            streak: 0,
            cardsGenerated: 0,
            cardsShared: 0,
          },
          preferences: user.preferences || { adventureTypes: ['general'], difficulty: 'easy' },
          loginTimestamp: new Date().toISOString(),
        };
        onAuthSuccess(enhancedUser);
      }
    } catch (error) {
      setError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await AuthService.resendVerificationEmail(emailFormData.email);
      if (result.success) {
        setError('Verification email resent successfully.');
      } else {
        setError(result.message || 'Failed to resend verification email.');
      }
    } catch (error) {
      setError(error.message || 'Failed to resend verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = () => {
    const guestUser = {
      id: `guest_${Date.now()}`,
      name: 'Guest Explorer',
      email: 'guest@sparkvibe.local',
      emailVerified: true,
      avatar: '👤',
      stats: {
        totalPoints: 0,
        level: 1,
        streak: 0,
        cardsGenerated: 0,
        cardsShared: 0,
      },
      preferences: { adventureTypes: ['general'], difficulty: 'easy' },
      loginTimestamp: new Date().toISOString(),
    };
    AuthService.setAuthData(`guest_token_${Date.now()}`, guestUser);
    onAuthSuccess(guestUser);
    setError('Guest mode: Some features may be limited.');
  };

  const handleDemoAccess = () => {
    const demoUser = {
      id: `demo_${Date.now()}`,
      name: 'Demo User',
      email: 'demo@sparkvibe.local',
      emailVerified: true,
      avatar: '🎭',
      stats: {
        totalPoints: 150,
        level: 1,
        streak: 3,
        cardsGenerated: 2,
        cardsShared: 1,
      },
      preferences: { adventureTypes: ['creativity', 'mindfulness'], difficulty: 'medium' },
      loginTimestamp: new Date().toISOString(),
    };
    AuthService.setAuthData(`demo_token_${Date.now()}`, demoUser);
    onAuthSuccess(demoUser);
    setError('Demo mode: Some features may be limited.');
  };

  const resetEmailForm = () => {
    setShowEmailForm(false);
    setEmailFormData({ email: '', password: '', confirmPassword: '', name: '' });
    setIsSignUp(false);
    setVerificationSent(false);
    setError(null);
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="text-4xl sm:text-6xl mb-4">📧</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Check Your Email</h2>
            <p className="text-blue-200 mb-6 text-sm sm:text-base">
              We've sent a verification link to <strong className="break-all">{emailFormData.email}</strong>.
              Please check your email and click the link to activate your account.
            </p>
            <div className="space-y-3">
              <button
                onClick={resetEmailForm}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
              >
                Back to Login
              </button>
              <button
                onClick={handleResendVerification}
                disabled={isLoading}
                className="w-full text-blue-200 hover:text-white text-sm underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Resending...' : 'Resend verification email'}
              </button>
            </div>
            {error && (
              <div className="mt-4 bg-red-500/20 border border-red-400/50 rounded-xl p-3">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div ref={containerRef} className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-3 sm:mb-4">
            SparkVibe
          </h1>
          <p className="text-lg sm:text-xl text-blue-200 mb-2">
            AI-Powered Daily Adventures
          </p>
          <p className="text-xs sm:text-sm text-white/60">
            Transform your mood into meaningful moments
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-4 sm:mb-6">
            {showEmailForm ? (isSignUp ? 'Create Account' : 'Sign In') : 'Welcome Back'}
          </h2>

          <div ref={errorRef}>
            {error && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-3 mb-4 max-h-32 overflow-auto">
                <p className="text-red-200 text-xs sm:text-sm">{error}</p>
              </div>
            )}
          </div>

          {showEmailForm ? (
            <form onSubmit={handleEmailAuth} className="space-y-3 sm:space-y-4">
              {isSignUp && (
                <div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={emailFormData.name}
                    onChange={(e) => {
                      setEmailFormData({ ...emailFormData, name: e.target.value });
                      setError(null);
                    }}
                    required
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/60 py-2 sm:py-3 px-3 sm:px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              )}
              <div>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={emailFormData.email}
                  onChange={(e) => {
                    setEmailFormData({ ...emailFormData, email: e.target.value });
                    setError(null);
                  }}
                  required
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/60 py-2 sm:py-3 px-3 sm:px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password (min. 6 characters)"
                  value={emailFormData.password}
                  onChange={(e) => {
                    setEmailFormData({ ...emailFormData, password: e.target.value });
                    setError(null);
                  }}
                  required
                  minLength="6"
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/60 py-2 sm:py-3 px-3 sm:px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              {isSignUp && (
                <div>
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={emailFormData.confirmPassword}
                    onChange={(e) => {
                      setEmailFormData({ ...emailFormData, confirmPassword: e.target.value });
                      setError(null);
                    }}
                    required
                    minLength="6"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/60 py-2 sm:py-3 px-3 sm:px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 sm:py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-[1.02] text-sm sm:text-base"
              >
                {isLoading ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                )}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="text-blue-200 hover:text-white text-xs sm:text-sm underline"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                </button>
              </div>
              <div className="text-center">
                <button
                  type="button"
                  onClick={resetEmailForm}
                  className="text-white/60 hover:text-white text-xs sm:text-sm"
                >
                  ← Back to options
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-medium py-2 sm:py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 sm:space-x-3 shadow-lg transform hover:scale-[1.02] text-sm sm:text-base"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" className="sm:w-5 sm:h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isLoading ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Continue with Google</span>
                )}
              </button>
              {googleRetries > 0 && (
                <button
                  onClick={() => {
                    setGoogleRetries(0);
                    setError(null);
                    handleGoogleSignIn();
                  }}
                  className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-400/50 text-blue-200 font-medium py-2 px-4 rounded-xl transition-all duration-200 text-xs sm:text-sm"
                >
                  🔄 Retry Google Sign-In ({3 - googleRetries} attempts left)
                </button>
              )}
              <button
                onClick={() => {
                  setShowEmailForm(true);
                  setError(null);
                }}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/30 text-white font-medium py-2 sm:py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 sm:space-x-3 transform hover:scale-[1.02] text-sm sm:text-base"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" className="sm:w-5 sm:h-5">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <span>Continue with Email</span>
              </button>
              <div className="relative flex items-center my-4 sm:my-6">
                <div className="flex-1 border-t border-white/20"></div>
                <span className="px-3 text-xs sm:text-sm text-white/60">or</span>
                <div className="flex-1 border-t border-white/20"></div>
              </div>
              <button
                onClick={handleGuestAccess}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-medium py-2 sm:py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-[1.02] text-sm sm:text-base"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" className="sm:w-5 sm:h-5">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>Continue as Guest</span>
              </button>
              <button
                onClick={handleDemoAccess}
                className="w-full bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30 border border-green-400/30 text-green-200 font-medium py-2 px-4 rounded-xl transition-all duration-200 text-xs sm:text-sm"
              >
                🚀 Quick Demo (No Sign-Up Required)
              </button>
            </div>
          )}
          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs text-white/50">
              By continuing, you agree to our{' '}
              <a href="/terms" className="underline hover:text-white">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="underline hover:text-white">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
        <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-3 sm:gap-4 text-center">
          <div className="text-white/60">
            <div className="text-xl sm:text-2xl mb-1">🧠</div>
            <p className="text-xs">AI Mood Analysis</p>
          </div>
          <div className="text-white/60">
            <div className="text-xl sm:text-2xl mb-1">🎨</div>
            <p className="text-xs">Viral Card Generation</p>
          </div>
          <div className="text-white/60">
            <div className="text-xl sm:text-2xl mb-1">🏆</div>
            <p className="text-xs">Social Challenges</p>
          </div>
        </div>
        {import.meta.env.DEV && (
          <div className="mt-4 p-3 bg-black/30 rounded-xl text-xs text-white/60">
            <p>Debug Info:</p>
            <p>Google Client ID: {import.meta.env.VITE_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}</p>
            <p>API Base: {import.meta.env.VITE_API_URL || '❌ Missing'}</p>
            <p>Retries: {googleRetries}</p>
            <p>Screen: {window.innerWidth}x{window.innerHeight}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;