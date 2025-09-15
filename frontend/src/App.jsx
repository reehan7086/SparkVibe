import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPost, safeIncludes } from './utils/safeUtils';
import MoodAnalyzer from './components/MoodAnalyzer';
import VibeCardGenerator from './components/VibeCardGenerator';
import Leaderboard from './components/Leaderboard';
import TrendingAdventures from './components/TrendingAdventures';
import LoginScreen from './components/LoginScreen'; // ADD THIS IMPORT
import AuthService from './services/AuthService'; // ADD THIS IMPORT

const App = () => {
  const [health, setHealth] = useState('Checking...');
  const [capsuleData, setCapsuleData] = useState(null);
  const [userChoices, setUserChoices] = useState({});
  const [completionStats, setCompletionStats] = useState({ vibePointsEarned: 0 });
  const [moodData, setMoodData] = useState(null);
  const [currentStep, setCurrentStep] = useState('mood');
  const [isAuthenticated, setIsAuthenticated] = useState(false); // ADD AUTH STATE
  const [user, setUser] = useState({ 
    name: 'SparkVibe Explorer', 
    totalPoints: 1250,
    level: 3,
    streak: 5,
    cardsGenerated: 12,
    cardsShared: 8
  });

  // ADD AUTH HANDLER
  const handleAuthSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser({
      ...user,
      ...userData,
      name: userData.name || 'SparkVibe Explorer'
    });
  };

useEffect(() => {
    const checkAuth = () => {
        const isAuth = AuthService.isAuthenticated();
        setIsAuthenticated(isAuth);
        if (isAuth) {
            const currentUser = AuthService.getCurrentUser();
            setUser(prev => ({
                ...prev,
                ...currentUser,
                name: currentUser.name || prev.name
            }));
        }
    };

    checkAuth();
}, []);

  const handleMoodAnalyzed = (mood) => {
    setMoodData(mood);
    generatePersonalizedCapsule(mood);
    setCurrentStep('capsule');
  };

  const generatePersonalizedCapsule = async (mood) => {
    try {
      const capsuleRequest = {
        mood: mood.mood,
        interests: ['creativity', 'adventure'],
        moodAnalysis: mood,
        location: 'user_location',
        timeOfDay: getTimeOfDay()
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

  const handleUserChoice = (choice) => {
    setUserChoices(prev => ({ ...prev, [Date.now()]: choice }));
    setCompletionStats(prev => ({ 
      vibePointsEarned: (prev.vibePointsEarned || 0) + 10 
    }));
  };

  const handleCapsuleComplete = () => {
    setCurrentStep('card');
    setCompletionStats(prev => ({
      ...prev,
      vibePointsEarned: (prev.vibePointsEarned || 0) + 25
    }));
  };

  const getHealthStatusColor = () => {
    const healthStr = String(health || '');
    if (!healthStr || healthStr === 'Checking...') return 'text-yellow-400';
    if (safeIncludes(healthStr.toLowerCase(), 'failed') || 
        safeIncludes(healthStr.toLowerCase(), 'error') ||
        safeIncludes(healthStr.toLowerCase(), 'forbidden')) return 'text-red-400';
    if (safeIncludes(healthStr.toLowerCase(), 'ok') || 
        safeIncludes(healthStr.toLowerCase(), 'connected') ||
        safeIncludes(healthStr.toLowerCase(), 'health check')) {
      return 'text-green-400';
    }
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

  if (!isAuthenticated) {
    return <LoginScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-start gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center w-full max-w-4xl"
      >
        <h1 className="text-6xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
          SparkVibe
        </h1>
        <p className="text-xl text-blue-200 mb-2">AI-Powered Daily Adventures</p>
        
        {/* User Stats Bar */}
        <div className="flex justify-center items-center space-x-6 mb-4">
          <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
            <span className="text-yellow-400">⚡</span>
            <span className="text-white font-semibold">{user.totalPoints}</span>
            <span className="text-white/60 text-sm">points</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
            <span className="text-orange-400">🔥</span>
            <span className="text-white font-semibold">{user.streak}</span>
            <span className="text-white/60 text-sm">day streak</span>
          </div>
          <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
            <span className="text-purple-400">🏆</span>
            <span className="text-white font-semibold">Level {user.level}</span>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className={`w-3 h-3 rounded-full ${currentStep === 'mood' ? 'bg-purple-400' : currentStep === 'capsule' || currentStep === 'card' ? 'bg-purple-400' : 'bg-white/30'}`}></div>
          <div className="w-12 h-0.5 bg-white/30">
            <div className={`h-full bg-purple-400 transition-all duration-500 ${currentStep === 'capsule' || currentStep === 'card' ? 'w-full' : 'w-0'}`}></div>
          </div>
          <div className={`w-3 h-3 rounded-full ${currentStep === 'capsule' ? 'bg-purple-400' : currentStep === 'card' ? 'bg-purple-400' : 'bg-white/30'}`}></div>
          <div className="w-12 h-0.5 bg-white/30">
            <div className={`h-full bg-purple-400 transition-all duration-500 ${currentStep === 'card' ? 'w-full' : 'w-0'}`}></div>
          </div>
          <div className={`w-3 h-3 rounded-full ${currentStep === 'card' ? 'bg-purple-400' : 'bg-white/30'}`}></div>
        </div>

        <p className="mt-4 text-lg text-gray-300">
          Backend Status:{" "}
          <span className={getHealthStatusColor()}>
            {health}
          </span>
        </p>
      </motion.div>

      {/* Main Content */}
      <div className="w-full max-w-7xl">
        <AnimatePresence mode="wait">
          {currentStep === 'mood' && (
            <motion.div
              key="mood-step"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2">
                <MoodAnalyzer 
                  onMoodAnalyzed={handleMoodAnalyzed}
                  isActive={true}
                />
              </div>
              <div className="space-y-6">
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
              className="grid lg:grid-cols-3 gap-6"
            >
              <div className="lg:col-span-2">
                <CapsuleExperience 
                  capsuleData={capsuleData}
                  moodData={moodData}
                  onComplete={handleCapsuleComplete}
                  onUserChoice={handleUserChoice}
                />
              </div>
              <div className="space-y-6">
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
              className="grid lg:grid-cols-3 gap-6"
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
                    setUser(prev => ({
                      ...prev,
                      cardsGenerated: prev.cardsGenerated + 1,
                      totalPoints: prev.totalPoints + (card.content?.achievement?.points || 25)
                    }));
                  }}
                />
                
                <div className="mt-6 text-center">
                  <button
                    onClick={resetFlow}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-8 py-3 rounded-2xl font-bold text-white transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Start New Adventure ✨
                  </button>
                </div>
              </div>
              <div className="space-y-6">
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

      {/* Footer */}
      <div className="text-center text-sm text-blue-300 opacity-75 mt-8">
        <p>Create • Share • Inspire</p>
        <p>Powered by AI to boost your daily vibes</p>
      </div>
    </div>
  );
};

// Capsule Experience Component
const CapsuleExperience = ({ capsuleData, moodData, onComplete, onUserChoice }) => {
  const [currentPhase, setCurrentPhase] = useState('adventure'); // adventure, brainbite, habit
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
        className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-2xl p-8 text-center"
      >
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold text-white mb-2">Adventure Complete!</h3>
        <p className="text-green-200">You've earned bonus points for completing all phases</p>
        <div className="animate-pulse mt-4 text-yellow-400 font-bold">+25 Vibe Points</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-indigo-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">{capsuleData.adventure?.title}</h2>
        <div className="flex items-center justify-center space-x-4 text-sm text-white/60">
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
            className="space-y-6"
          >
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Your Adventure</h3>
              <p className="text-white/80 text-lg leading-relaxed">{capsuleData.adventure?.prompt}</p>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  onUserChoice('adventure_completed');
                  handlePhaseComplete();
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-3 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105"
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
            className="space-y-6"
          >
            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🧠</span>
                <h3 className="text-xl font-semibold text-white">Brain Bite</h3>
              </div>
              <p className="text-white/80 text-lg">{capsuleData.brainBite}</p>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  onUserChoice('brainbite_read');
                  handlePhaseComplete();
                }}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-8 py-3 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-105"
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
            className="space-y-6"
          >
            <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/30 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">💡</span>
                <h3 className="text-xl font-semibold text-white">Habit Nudge</h3>
              </div>
              <p className="text-white/80 text-lg mb-4">{capsuleData.habitNudge}</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    onUserChoice('habit_accepted');
                    completeExperience();
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300"
                >
                  I'll Try This! (+10 bonus points)
                </button>
                <button
                  onClick={() => {
                    onUserChoice('habit_skipped');
                    completeExperience();
                  }}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 rounded-xl font-medium text-white transition-all duration-300"
                >
                  Maybe Next Time
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-2 mt-6">
        <div className={`w-2 h-2 rounded-full ${currentPhase === 'adventure' ? 'bg-purple-400' : 'bg-purple-400'}`}></div>
        <div className={`w-2 h-2 rounded-full ${currentPhase === 'brainbite' ? 'bg-blue-400' : currentPhase === 'habit' ? 'bg-blue-400' : 'bg-white/30'}`}></div>
        <div className={`w-2 h-2 rounded-full ${currentPhase === 'habit' ? 'bg-emerald-400' : 'bg-white/30'}`}></div>
      </div>
    </motion.div>
  );
};

// Mood Summary Component
const MoodSummary = ({ moodData }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6"
  >
    <h3 className="text-xl font-bold text-white mb-4">Your Vibe Today</h3>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white/80">Mood</span>
        <span className="text-white font-semibold capitalize">{moodData?.mood}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/80">Energy</span>
        <span className="text-white font-semibold capitalize">{moodData?.energyLevel}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/80">Social Mood</span>
        <span className="text-white font-semibold capitalize">{moodData?.socialMood}</span>
      </div>
    </div>
  </motion.div>
);

// Completion Celebration Component
const CompletionCelebration = ({ completionStats, moodData }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border border-yellow-400/30 rounded-2xl p-6 text-center"
  >
    <div className="text-4xl mb-3">🎉</div>
    <h3 className="text-xl font-bold text-white mb-2">Mission Accomplished!</h3>
    <div className="space-y-2 text-white/80">
      <p>Points Earned: <span className="text-yellow-400 font-bold">+{completionStats.vibePointsEarned}</span></p>
      {moodData && <p>Mood Boost: <span className="text-green-400 font-bold">+15%</span></p>}
      <p className="text-sm">You're building amazing habits! 🌟</p>
    </div>
  </motion.div>
);

export default App;