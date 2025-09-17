import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPost, safeIncludes } from './utils/safeUtils';
import MoodAnalyzer from './components/MoodAnalyzer';
import VibeCardGenerator from './components/VibeCardGenerator';
import Leaderboard from './components/Leaderboard';
import TrendingAdventures from './components/TrendingAdventures';
import LoginScreen from './components/LoginScreen';
import ConnectionStatus from './components/ConnectionStatus';
import AuthService from './services/AuthService';

const App = () => {
  const [health, setHealth] = useState('Checking...');
  const [capsuleData, setCapsuleData] = useState(null);
  const [userChoices, setUserChoices] = useState({});
  const [completionStats, setCompletionStats] = useState({ vibePointsEarned: 0 });
  const [moodData, setMoodData] = useState(null);
  const [currentStep, setCurrentStep] = useState('mood');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication and load user data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const isAuth = AuthService.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          const currentUser = AuthService.getCurrentUser();
          console.log('Current user:', currentUser);
          
          // Load user stats from backend
          try {
            const userStats = await apiGet('/user/profile');
            setUser({
              ...currentUser,
              ...userStats.user,
              name: currentUser.name || userStats.user?.name || 'SparkVibe Explorer'
            });
          } catch (error) {
            console.warn('Failed to load user stats:', error);
            setUser({
              ...currentUser,
              name: currentUser.name || 'SparkVibe Explorer',
              totalPoints: currentUser.totalPoints || 0,
              level: currentUser.level || 1,
              streak: currentUser.streak || 0,
              cardsGenerated: currentUser.cardsGenerated || 0,
              cardsShared: currentUser.cardsShared || 0
            });
          }
        }
      } catch (error) {
        console.error('App initialization failed:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Health check with improved error handling
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await apiGet('/health');
        
        // Check if response indicates fallback mode
        if (response?.fallback) {
          setHealth('Backend Offline - Demo Mode');
        } else {
          setHealth(response?.message || 'Connected');
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setHealth('Backend Offline - Demo Mode');
      }
    };

    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAuthSuccess = async (userData) => {
    console.log('Auth success with user data:', userData);
    setIsAuthenticated(true);
    
    // Store user in backend if not guest
    if (!userData.isGuest && userData.provider !== 'demo') {
      try {
        const savedUser = await apiPost('/user/save-profile', {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          provider: userData.provider,
          avatar: userData.picture || userData.avatar,
          stats: userData.stats || {
            totalPoints: 0,
            level: 1,
            streak: 0,
            cardsGenerated: 0,
            cardsShared: 0
          }
        });
        
        setUser(savedUser);
        console.log('User saved to backend:', savedUser);
      } catch (error) {
        console.warn('Failed to save user to backend:', error);
        setUser({
          ...userData,
          name: userData.name || 'SparkVibe Explorer',
          totalPoints: userData.totalPoints || 0,
          level: userData.level || 1,
          streak: userData.streak || 0,
          cardsGenerated: userData.cardsGenerated || 0,
          cardsShared: userData.cardsShared || 0
        });
      }
    } else {
      setUser({
        ...userData,
        name: userData.name || 'SparkVibe Explorer'
      });
    }
  };

  const handleMoodAnalyzed = async (mood) => {
    setMoodData(mood);
    
    // Save mood data to backend
    if (user && !user.isGuest) {
      try {
        await apiPost('/user/save-mood', {
          userId: user.id,
          moodData: mood,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Failed to save mood data:', error);
      }
    }
    
    generatePersonalizedCapsule(mood);
    setCurrentStep('capsule');
  };

  const generatePersonalizedCapsule = async (mood) => {
    try {
      const capsuleRequest = {
        userId: user?.id,
        mood: mood.mood,
        interests: ['creativity', 'adventure'],
        moodAnalysis: mood,
        location: 'user_location',
        timeOfDay: getTimeOfDay(),
        userPreferences: user?.preferences || {}
      };

      const response = await apiPost('/generate-capsule-simple', capsuleRequest);
      setCapsuleData(response);
      console.log('Personalized capsule generated:', response);
      
      // Show fallback notification if needed
      if (response?.fallback) {
        console.log('Using fallback capsule generation');
      }
    } catch (error) {
      console.error('Capsule fetch failed:', error);
      setCapsuleData({
        id: 'demo',
        adventure: {
          title: 'Demo Adventure',
          prompt: 'Welcome to SparkVibe! This is a demo while we connect to the backend.'
        },
        fallback: true
      });
    }
  };

  const handleUserChoice = async (choice) => {
    const choiceData = { [Date.now()]: choice };
    setUserChoices(prev => ({ ...prev, ...choiceData }));
    
    // Save user choice to backend
    if (user && !user.isGuest) {
      try {
        await apiPost('/user/save-choice', {
          userId: user.id,
          choice: choice,
          timestamp: new Date().toISOString(),
          capsuleId: capsuleData?.id
        });
      } catch (error) {
        console.warn('Failed to save user choice:', error);
      }
    }
    
    const points = 10;
    setCompletionStats(prev => ({ 
      vibePointsEarned: (prev.vibePointsEarned || 0) + points 
    }));
    
    // Update user points
    if (user) {
      setUser(prev => ({
        ...prev,
        totalPoints: (prev.totalPoints || 0) + points
      }));
    }
  };

  const handleCapsuleComplete = async () => {
    setCurrentStep('card');
    const bonusPoints = 25;
    setCompletionStats(prev => ({
      ...prev,
      vibePointsEarned: (prev.vibePointsEarned || 0) + bonusPoints
    }));
    
    // Update user stats
    if (user) {
      const newStats = {
        ...user,
        totalPoints: (user.totalPoints || 0) + bonusPoints,
        streak: (user.streak || 0) + 1
      };
      
      setUser(newStats);
      
      // Save completion to backend
      if (!user.isGuest) {
        try {
          await apiPost('/user/save-completion', {
            userId: user.id,
            capsuleId: capsuleData?.id,
            pointsEarned: bonusPoints,
            completedAt: new Date().toISOString()
          });
        } catch (error) {
          console.warn('Failed to save completion:', error);
        }
      }
    }
  };

  const getHealthStatusColor = () => {
    const healthStr = String(health || '');
    if (!healthStr || healthStr === 'Checking...') return 'text-yellow-400';
    if (safeIncludes(healthStr.toLowerCase(), 'failed') || 
        safeIncludes(healthStr.toLowerCase(), 'error') ||
        safeIncludes(healthStr.toLowerCase(), 'offline')) return 'text-red-400';
    if (safeIncludes(healthStr.toLowerCase(), 'ok') || 
        safeIncludes(healthStr.toLowerCase(), 'connected')) return 'text-green-400';
    return 'text-blue-400';
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const resetFlow = () => {
    setCurrentStep('mood');
    setMoodData(null);
    setCapsuleData(null);
    setUserChoices({});
    setCompletionStats({ vibePointsEarned: 0 });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mb-4"></div>
          <p className="text-white text-lg">Loading SparkVibe...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-start gap-4 sm:gap-6 p-2 sm:p-4 lg:p-8">
      {/* Header - Made more responsive */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center w-full max-w-4xl px-2"
      >
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2 sm:mb-4">
          SparkVibe
        </h1>
        <p className="text-lg sm:text-xl text-blue-200 mb-2">AI-Powered Daily Adventures</p>
        
        {/* User Welcome - NEW */}
        {user && (
          <div className="mb-3">
            <p className="text-white text-sm sm:text-base">
              Welcome back, <span className="font-semibold text-purple-300">{user.name}</span>! 
              {user.provider && !user.isGuest && (
                <span className="text-blue-300 text-xs ml-2">
                  via {user.provider}
                </span>
              )}
            </p>
          </div>
        )}
        
        {/* User Stats Bar - Made responsive */}
        <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 mb-4">
          <div className="flex items-center space-x-1 sm:space-x-2 bg-white/10 rounded-full px-2 sm:px-4 py-1 sm:py-2">
            <span className="text-yellow-400 text-sm sm:text-base">⚡</span>
            <span className="text-white font-semibold text-sm sm:text-base">{user?.totalPoints || 0}</span>
            <span className="text-white/60 text-xs sm:text-sm">points</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 bg-white/10 rounded-full px-2 sm:px-4 py-1 sm:py-2">
            <span className="text-orange-400 text-sm sm:text-base">🔥</span>
            <span className="text-white font-semibold text-sm sm:text-base">{user?.streak || 0}</span>
            <span className="text-white/60 text-xs sm:text-sm">day streak</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 bg-white/10 rounded-full px-2 sm:px-4 py-1 sm:py-2">
            <span className="text-purple-400 text-sm sm:text-base">🏆</span>
            <span className="text-white font-semibold text-xs sm:text-base">Level {user?.level || 1}</span>
          </div>
        </div>

        {/* Progress Indicator - Made responsive */}
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 mb-4">
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${currentStep === 'mood' ? 'bg-purple-400' : currentStep === 'capsule' || currentStep === 'card' ? 'bg-purple-400' : 'bg-white/30'}`}></div>
          <div className="w-8 sm:w-12 h-0.5 bg-white/30">
            <div className={`h-full bg-purple-400 transition-all duration-500 ${currentStep === 'capsule' || currentStep === 'card' ? 'w-full' : 'w-0'}`}></div>
          </div>
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${currentStep === 'capsule' ? 'bg-purple-400' : currentStep === 'card' ? 'bg-purple-400' : 'bg-white/30'}`}></div>
          <div className="w-8 sm:w-12 h-0.5 bg-white/30">
            <div className={`h-full bg-purple-400 transition-all duration-500 ${currentStep === 'card' ? 'w-full' : 'w-0'}`}></div>
          </div>
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${currentStep === 'card' ? 'bg-purple-400' : 'bg-white/30'}`}></div>
        </div>

        {/* Backend Status - Made more compact on mobile with Connection Status */}
        <div className="flex items-center justify-center gap-4">
          <p className="text-sm sm:text-base text-gray-300">
            Backend Status:{" "}
            <span className={getHealthStatusColor()}>
              {health}
            </span>
          </p>
          <ConnectionStatus health={health} />
        </div>
      </motion.div>

      {/* Main Content - Improved responsive layout */}
      <div className="w-full max-w-7xl px-2">
        <AnimatePresence mode="wait">
          {currentStep === 'mood' && (
            <motion.div
              key="mood-step"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="grid lg:grid-cols-3 gap-3 sm:gap-6"
            >
              <div className="lg:col-span-2">
                <MoodAnalyzer 
                  onMoodAnalyzed={handleMoodAnalyzed}
                  isActive={true}
                />
              </div>
              <div className="space-y-3 sm:space-y-6">
                <TrendingAdventures />
                <Leaderboard />
              </div>
            </motion.div>
          )}

          {currentStep === 'capsule' && capsuleData && (
            <motion.div
              key="capsule-step"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="grid lg:grid-cols-3 gap-3 sm:gap-6"
            >
              <div className="lg:col-span-2">
                <CapsuleExperience 
                  capsuleData={capsuleData}
                  moodData={moodData}
                  onComplete={handleCapsuleComplete}
                  onUserChoice={handleUserChoice}
                />
              </div>
              <div className="space-y-3 sm:space-y-6">
                <MoodSummary moodData={moodData} />
                <Leaderboard />
              </div>
            </motion.div>
          )}

          {currentStep === 'card' && (
            <motion.div
              key="card-step"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="grid lg:grid-cols-3 gap-3 sm:gap-6"
            >
              <div className="lg:col-span-2">
                <VibeCardGenerator
                  capsuleData={capsuleData}
                  userChoices={userChoices}
                  completionStats={completionStats}
                  user={user}
                  moodData={moodData}
                  onCardGenerated={(card) => {
                    console.log('Card generated:', card);
                    const newUser = {
                      ...user,
                      cardsGenerated: (user.cardsGenerated || 0) + 1,
                      totalPoints: (user.totalPoints || 0) + (card.content?.achievement?.points || 25)
                    };
                    setUser(newUser);
                    
                    // Save card generation to backend
                    if (!user.isGuest) {
                      apiPost('/user/save-card-generation', {
                        userId: user.id,
                        cardData: card,
                        generatedAt: new Date().toISOString()
                      }).catch(console.warn);
                    }
                  }}
                />
                
                <div className="mt-6 text-center">
                  <button
                    onClick={resetFlow}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-6 sm:px-8 py-2 sm:py-3 rounded-2xl font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base"
                  >
                    Start New Adventure ✨
                  </button>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-6">
                <CompletionCelebration 
                  completionStats={completionStats}
                  moodData={moodData}
                />
                <Leaderboard />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer - Made responsive */}
      <div className="text-center text-xs sm:text-sm text-blue-300 opacity-75 mt-4 sm:mt-8 px-4">
        <p>Create • Share • Inspire</p>
        <p>Powered by AI to boost your daily vibes</p>
        {user && !user.isGuest && (
          <button
            onClick={() => {
              AuthService.signOut();
              setIsAuthenticated(false);
              setUser(null);
            }}
            className="text-blue-400 hover:text-blue-300 underline mt-2 text-xs"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
};