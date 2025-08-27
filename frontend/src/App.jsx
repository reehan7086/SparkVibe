import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPost, safeIncludes } from './utils/safeUtils';
import AuthService from './services/AuthService';
import LoginScreen from './components/LoginScreen';

function App() {
  const [currentStep, setCurrentStep] = useState('mood');
  const [mood, setMood] = useState('');
  const [capsule, setCapsule] = useState('');
  const [vibeCard, setVibeCard] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);

  // Check authentication on app load
  useEffect(() => {
    const token = AuthService.token;
    const userData = AuthService.user;
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(userData);
      // Load user stats
      loadUserStats();
    }

    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered:', registration))
        .catch(error => console.log('SW registration failed:', error));
    }
  }, []);

  const loadUserStats = async () => {
    try {
      const stats = await apiGet('/api/user/stats');
      if (stats.success) {
        setStreak(stats.data.streak || 0);
        setPoints(stats.data.points || 0);
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const handleAuthSuccess = (userData, token) => {
    setIsAuthenticated(true);
    setUser(userData);
    loadUserStats();
  };

  const handleLogout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setStreak(0);
    setPoints(0);
    // Reset app state
    setCurrentStep('mood');
    setMood('');
    setCapsule('');
    setVibeCard('');
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const moods = [
    { emoji: '😊', label: 'Happy', color: 'from-yellow-400 to-orange-500' },
    { emoji: '😢', label: 'Sad', color: 'from-blue-400 to-blue-600' },
    { emoji: '😡', label: 'Angry', color: 'from-red-400 to-red-600' },
    { emoji: '😰', label: 'Anxious', color: 'from-purple-400 to-purple-600' },
    { emoji: '😴', label: 'Tired', color: 'from-gray-400 to-gray-600' },
    { emoji: '🤔', label: 'Thoughtful', color: 'from-green-400 to-green-600' },
    { emoji: '😎', label: 'Confident', color: 'from-indigo-400 to-indigo-600' },
    { emoji: '💖', label: 'Loving', color: 'from-pink-400 to-pink-600' }
  ];

  const generateCapsule = async (selectedMood) => {
    setIsLoading(true);
    try {
      const response = await apiPost('/api/generate-capsule', {
        mood: selectedMood.label,
        emoji: selectedMood.emoji
      });
      
      if (response.success) {
        setCapsule(response.data.capsule);
        setCurrentStep('capsule');
      } else {
        // Fallback capsules
        const fallbackCapsules = {
          'Happy': "Share your joy with someone who needs a smile today! 🌟",
          'Sad': "Take 5 deep breaths and write down one thing you're grateful for 💙",
          'Angry': "Go for a 10-minute walk and let the fresh air calm your mind 🌿",
          'Anxious': "Practice the 5-4-3-2-1 grounding technique right now ✨",
          'Tired': "Rest is productive too. Give yourself permission to pause 🌙",
          'Thoughtful': "Journal for 10 minutes about what's on your mind 📝",
          'Confident': "Take on one challenge you've been avoiding today! 🚀",
          'Loving': "Send a heartfelt message to someone special ❤️"
        };
        setCapsule(fallbackCapsules[selectedMood.label] || "Take a moment to breathe and appreciate this moment 🌸");
        setCurrentStep('capsule');
      }
    } catch (error) {
      console.error('Error generating capsule:', error);
      setCapsule("Take a moment to breathe and appreciate this moment 🌸");
      setCurrentStep('capsule');
    }
    setIsLoading(false);
  };

  const generateVibeCard = async () => {
    setIsLoading(true);
    try {
      const response = await apiPost('/api/generate-vibe-card', {
        mood: mood.label,
        capsule: capsule
      });
      
      if (response.success) {
        setVibeCard(response.data.imageUrl);
        // Update user stats
        setPoints(prev => prev + 10);
        
        // Check for streak update
        const statsResponse = await apiGet('/api/user/stats');
        if (statsResponse.success) {
          setStreak(statsResponse.data.streak || 0);
          setPoints(statsResponse.data.points || 0);
        }
        
        setCurrentStep('share');
      }
    } catch (error) {
      console.error('Error generating vibe card:', error);
      // Create a simple text-based vibe card as fallback
      setVibeCard(`data:image/svg+xml;base64,${btoa(`
        <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="400" height="600" fill="url(#grad)"/>
          <text x="200" y="200" text-anchor="middle" fill="white" font-size="48">${mood.emoji}</text>
          <text x="200" y="300" text-anchor="middle" fill="white" font-size="20" font-weight="bold">${mood.label}</text>
          <foreignObject x="40" y="350" width="320" height="200">
            <div xmlns="http://www.w3.org/1999/xhtml" style="color: white; text-align: center; font-size: 16px; line-height: 1.4;">
              ${capsule}
            </div>
          </foreignObject>
          <text x="200" y="570" text-anchor="middle" fill="white" font-size="12">SparkVibe Daily</text>
        </svg>
      `)}`);
      setCurrentStep('share');
    }
    setIsLoading(false);
  };

  const shareVibeCard = async (platform) => {
    try {
      // Track sharing
      await apiPost('/api/track-share', {
        platform,
        mood: mood.label
      });

      // Award points for sharing
      setPoints(prev => prev + 5);

      const shareData = {
        title: `My ${mood.label} Vibe Today`,
        text: `${capsule} - Generated by SparkVibe`,
        url: window.location.href
      };

      if (platform === 'native' && navigator.share) {
        await navigator.share(shareData);
      } else {
        // Platform-specific sharing URLs
        const shareUrls = {
          twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`,
          whatsapp: `https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`,
          telegram: `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.text)}`
        };
        
        if (shareUrls[platform]) {
          window.open(shareUrls[platform], '_blank', 'width=600,height=400');
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const resetFlow = () => {
    setCurrentStep('mood');
    setMood('');
    setCapsule('');
    setVibeCard('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header with user info */}
      <div className="flex justify-between items-center p-4 text-white">
        <div className="flex items-center gap-4">
          <img 
            src={user?.picture || '/default-avatar.png'} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border-2 border-white/20"
          />
          <div>
            <p className="font-semibold">{user?.name || 'SparkVibe User'}</p>
            <p className="text-sm opacity-75">🔥 {streak} day streak • ⭐ {points} points</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {currentStep === 'mood' && (
            <motion.div
              key="mood"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold text-white mb-2">SparkVibe</h1>
              <p className="text-xl text-purple-200 mb-8">How are you feeling right now?</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {moods.map((moodOption) => (
                  <motion.button
                    key={moodOption.label}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setMood(moodOption);
                      generateCapsule(moodOption);
                    }}
                    className={`p-6 rounded-2xl bg-gradient-to-br ${moodOption.color} text-white shadow-lg hover:shadow-xl transition-all duration-300`}
                  >
                    <div className="text-4xl mb-2">{moodOption.emoji}</div>
                    <div className="font-semibold">{moodOption.label}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 'capsule' && (
            <motion.div
              key="capsule"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-2xl mx-auto"
            >
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br ${mood.color} text-4xl mb-6`}>
                {mood.emoji}
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">Your Daily Spark</h2>
              
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8"
              >
                <p className="text-xl text-white leading-relaxed">{capsule}</p>
              </motion.div>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={resetFlow}
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  Try Again
                </button>
                
                <button
                  onClick={generateVibeCard}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 px-8 py-3 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50"
                >
                  {isLoading ? 'Creating Magic...' : 'Create Vibe Card ✨'}
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 'share' && (
            <motion.div
              key="share"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-lg mx-auto"
            >
              <h2 className="text-3xl font-bold text-white mb-6">Your Vibe Card is Ready!</h2>
              
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
                <img
                  src={vibeCard}
                  alt="Your Vibe Card"
                  className="w-full max-w-sm mx-auto rounded-2xl shadow-2xl"
                />
              </motion.div>
              
              <p className="text-purple-200 mb-6">Share your vibe and inspire others! (+5 points per share)</p>
              
              <div className="flex flex-wrap gap-3 justify-center mb-6">
                <button
                  onClick={() => shareVibeCard('twitter')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  🐦 Twitter
                </button>
                
                <button
                  onClick={() => shareVibeCard('facebook')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  📘 Facebook
                </button>
                
                <button
                  onClick={() => shareVibeCard('whatsapp')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  📱 WhatsApp
                </button>
                
                {navigator.share && (
                  <button
                    onClick={() => shareVibeCard('native')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    📤 Share
                  </button>
                )}
              </div>
              
              <button
                onClick={resetFlow}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-8 py-3 rounded-2xl font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Create Another Vibe ✨
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-2xl p-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-gray-800 font-semibold">Creating your personalized experience...</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default App;