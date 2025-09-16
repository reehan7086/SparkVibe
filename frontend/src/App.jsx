import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPost, safeIncludes } from './utils/safeUtils';
import MoodAnalyzer from './components/MoodAnalyzer';
import VibeCardGenerator from './components/VibeCardGenerator';
import Leaderboard from './components/Leaderboard';
import TrendingAdventures from './components/TrendingAdventures';
import LoginScreen from './components/LoginScreen';
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
              ...userStats,
              name: currentUser.name || userStats.name || 'SparkVibe Explorer'
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

  // Health check
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await apiGet('/health');
        setHealth(response?.message || 'Connected');
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
    if (!userData.isGuest && !userData.provider === 'demo') {
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
    } catch (error) {
      console.error('Capsule fetch failed:', error);
      setCapsuleData({
        id: 'demo',
        adventure: {
          title: 'Demo Adventure',
          prompt: 'Welcome to SparkVibe! This is a demo while we connect to the backend.'
        }
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

        {/* Backend Status - Made more compact on mobile */}
        <p className="mt-2 text-sm sm:text-base text-gray-300">
          Backend Status:{" "}
          <span className={getHealthStatusColor()}>
            {health}
          </span>
        </p>
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

// Rest of components remain the same...
const CapsuleExperience = ({ capsuleData, moodData, onComplete, onUserChoice }) => {
  const [currentPhase, setCurrentPhase] = useState('adventure');
  const [isCompleting, setIsCompleting] = useState(false);

  const handlePhaseComplete = () => {
    if (currentPhase === 'adventure') {
      setCurrentPhase('brainbite');
    } else if (currentPhase === 'brainbite') {
      setCurrentPhase('habit');
    } else {
      completeExperience();
    }
  };

  const completeExperience = () => {
    setIsCompleting(true);
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  if (isCompleting) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-2xl p-4 sm:p-8 text-center"
      >
        <div className="text-4xl sm:text-6xl mb-4">🎉</div>
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Adventure Complete!</h3>
        <p className="text-green-200 text-sm sm:text-base">You've earned bonus points for completing all phases</p>
        <div className="animate-pulse mt-4 text-yellow-400 font-bold">+25 Vibe Points</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-indigo-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6"
    >
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{capsuleData.adventure?.title}</h2>
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-white/60">
          <span>⏱️ {capsuleData.adventure?.estimatedTime}</span>
          <span>📊 {capsuleData.adventure?.difficulty}</span>
          <span>🎯 {capsuleData.adventure?.category}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentPhase === 'adventure' && (
          <motion.div
            key="adventure"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="bg-white/5 rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Your Adventure</h3>
              <p className="text-white/80 text-base sm:text-lg leading-relaxed">{capsuleData.adventure?.prompt}</p>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  onUserChoice('adventure_completed');
                  handlePhaseComplete();
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              >
                I Did It! ✨
              </button>
            </div>
          </motion.div>
        )}

        {currentPhase === 'brainbite' && (
          <motion.div
            key="brainbite"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-xl sm:text-2xl">🧠</span>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Brain Bite</h3>
              </div>
              <p className="text-white/80 text-base sm:text-lg">{capsuleData.brainBite}</p>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  onUserChoice('brainbite_read');
                  handlePhaseComplete();
                }}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              >
                Fascinating! Continue →
              </button>
            </div>
          </motion.div>
        )}

        {currentPhase === 'habit' && (
          <motion.div
            key="habit"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/30 rounded-xl p-4 sm:p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-xl sm:text-2xl">💡</span>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Habit Nudge</h3>
              </div>
              <p className="text-white/80 text-base sm:text-lg mb-4">{capsuleData.habitNudge}</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    onUserChoice('habit_accepted');
                    completeExperience();
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-white transition-all duration-300 text-sm sm:text-base"
                >
                  I'll Try This! (+10 bonus points)
                </button>
                <button
                  onClick={() => {
                    onUserChoice('habit_skipped');
                    completeExperience();
                  }}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium text-white transition-all duration-300 text-sm sm:text-base"
                >
                  Maybe Next Time
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-2 mt-4 sm:mt-6">
        <div className={`w-2 h-2 rounded-full ${currentPhase === 'adventure' ? 'bg-purple-400' : 'bg-purple-400'}`}></div>
        <div className={`w-2 h-2 rounded-full ${currentPhase === 'brainbite' ? 'bg-blue-400' : currentPhase === 'habit' ? 'bg-blue-400' : 'bg-white/30'}`}></div>
        <div className={`w-2 h-2 rounded-full ${currentPhase === 'habit' ? 'bg-emerald-400' : 'bg-white/30'}`}></div>
      </div>
    </motion.div>
  );
};

const MoodSummary = ({ moodData }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6"
  >
    <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Your Vibe Today</h3>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white/80 text-sm sm:text-base">Mood</span>
        <span className="text-white font-semibold capitalize text-sm sm:text-base">{moodData?.mood}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/80 text-sm sm:text-base">Energy</span>
        <span className="text-white font-semibold capitalize text-sm sm:text-base">{moodData?.energyLevel}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/80 text-sm sm:text-base">Social Mood</span>
        <span className="text-white font-semibold capitalize text-sm sm:text-base">{moodData?.socialMood}</span>
      </div>
    </div>
  </motion.div>
);

const CompletionCelebration = ({ completionStats, moodData }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 rounded-2xl p-4 sm:p-6 text-center"
  >
    <div className="text-3xl sm:text-4xl mb-3">🎉</div>
    <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Mission Accomplished!</h3>
    <div className="space-y-2 text-white/80 text-sm sm:text-base">
      <p>Points Earned: <span className="text-yellow-400 font-bold">+{completionStats.vibePointsEarned}</span></p>
      {moodData && <p>Mood Boost: <span className="text-green-400 font-bold">+15%</span></p>}
      <p className="text-xs sm:text-sm">You're building amazing habits! 🌟</p>
    </div>
  </motion.div>
);

export default App;