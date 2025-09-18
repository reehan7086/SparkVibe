// Complete App.jsx - Main application component
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPost, safeIncludes } from './utils/safeUtils';
import MoodAnalyzer from './components/MoodAnalyzer';
import VibeCardGenerator from './components/VibeCardGenerator';
import EnhancedVibeCardGenerator from './components/EnhancedVibeCardGenerator';
import Leaderboard from './components/Leaderboard';
import EnhancedLeaderboard from './components/EnhancedLeaderboard';
import TrendingAdventures from './components/TrendingAdventures';
import LoginScreen from './components/LoginScreen';
import ConnectionStatus from './components/ConnectionStatus';
import FriendSystem from './components/FriendSystem';
import ChallengeSystem from './components/ChallengeSystem';
import NotificationCenter from './components/NotificationCenter';
import AchievementDisplay from './components/AchievementDisplay';
import SocialSharing from './components/SocialSharing';
import WebSocketManager from './utils/WebSocketManager';
import AuthService from './services/AuthService';
import CapsuleExperience from './components/CapsuleExperience';
import MoodSummary from './components/MoodSummary';
import CompletionCelebration from './components/CompletionCelebration';
import ErrorBoundary from './components/ErrorBoundary';

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
  
  // Enhanced features state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [friends, setFriends] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [newAchievements, setNewAchievements] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [isEnhancedMode, setIsEnhancedMode] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(0);

  // WebSocket reference
  const wsManager = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (isAuthenticated && user) {
      wsManager.current = new WebSocketManager(user.id, {
        onAchievement: (achievement) => {
          setNewAchievements(prev => [...prev, achievement]);
          // Auto-hide after 5 seconds
          setTimeout(() => {
            setNewAchievements(prev => prev.filter(a => a.id !== achievement.id));
          }, 5000);
        },
        onLeaderboardUpdate: () => {
          // Trigger leaderboard refresh
          window.dispatchEvent(new CustomEvent('leaderboardUpdate'));
        },
        onNotification: (notification) => {
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        },
        onFriendUpdate: () => {
          fetchFriends();
        }
      });

      return () => {
        if (wsManager.current) {
          wsManager.current.disconnect();
        }
      };
    }
  }, [isAuthenticated, user]);

  // Enhanced user data update with event dispatching
  const updateUserData = async (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('sparkvibe_user', JSON.stringify(updatedUser));
    
    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent('userDataUpdated', { 
      detail: { user: updatedUser, timestamp: Date.now() } 
    }));

    // Sync with backend if not a guest user
    if (!updatedUser.isGuest && !updatedUser.provider?.includes('demo')) {
      try {
        const syncResult = await apiPost('/user/sync-stats', {
          userId: updatedUser.id,
          stats: updatedUser.stats,
          totalPoints: updatedUser.totalPoints,
          level: updatedUser.level,
          streak: updatedUser.streak,
          cardsGenerated: updatedUser.cardsGenerated,
          cardsShared: updatedUser.cardsShared
        });
        
        if (syncResult.success) {
          console.log('Points synced with backend successfully');
        }
      } catch (error) {
        console.warn('Failed to sync points with backend:', error.message);
      }
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    try {
      const response = await apiGet('/notifications');
      if (response.success) {
        setNotifications(response.data);
        setUnreadCount(response.unreadCount);
      }
    } catch (error) {
      console.warn('Failed to fetch notifications:', error);
    }
  };

  // Fetch friends
  const fetchFriends = async () => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    try {
      const response = await apiGet('/friends');
      if (response.success) {
        setFriends(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch friends:', error);
    }
  };

  // Fetch challenges
  const fetchChallenges = async () => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    try {
      const response = await apiGet('/challenges');
      if (response.success) {
        setChallenges(response.data);
      }
    } catch (error) {
      console.warn('Failed to fetch challenges:', error);
    }
  };

  // Mark notifications as read
  const markNotificationsAsRead = async (notificationIds = null) => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    try {
      await apiPost('/notifications/read', { notificationIds });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.warn('Failed to mark notifications as read:', error);
    }
  };

  // Track analytics event
  const trackEvent = async (eventType, metadata = {}) => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    try {
      await apiPost('/track-event', { eventType, metadata });
    } catch (error) {
      console.warn('Failed to track event:', error);
    }
  };

  // Check authentication and load user data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const isAuth = AuthService.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          const currentUser = AuthService.getCurrentUser();
          
          const userData = {
            ...currentUser,
            name: currentUser.name || currentUser.given_name || 'SparkVibe Explorer',
            totalPoints: currentUser.totalPoints || currentUser.stats?.totalPoints || 0,
            level: currentUser.level || currentUser.stats?.level || 1,
            streak: currentUser.streak || currentUser.stats?.streak || 0,
            cardsGenerated: currentUser.cardsGenerated || currentUser.stats?.cardsGenerated || 0,
            cardsShared: currentUser.cardsShared || currentUser.stats?.cardsShared || 0,
            stats: {
              totalPoints: currentUser.totalPoints || currentUser.stats?.totalPoints || 0,
              level: currentUser.level || currentUser.stats?.level || 1,
              streak: currentUser.streak || currentUser.stats?.streak || 0,
              cardsGenerated: currentUser.cardsGenerated || currentUser.stats?.cardsGenerated || 0,
              cardsShared: currentUser.cardsShared || currentUser.stats?.cardsShared || 0,
              lastActiveDate: currentUser.stats?.lastActiveDate || new Date().toISOString(),
              bestStreak: currentUser.stats?.bestStreak || 0,
              adventuresCompleted: currentUser.stats?.adventuresCompleted || 0,
              moodHistory: currentUser.stats?.moodHistory || [],
              choices: currentUser.stats?.choices || []
            }
          };
          
          setUser(userData);
          
          // Fetch initial data for authenticated users
          if (!userData.isGuest && !userData.provider?.includes('demo')) {
            await Promise.all([
              fetchNotifications(),
              fetchFriends(),
              fetchChallenges()
            ]);
          }
        }
        
        // Check server health
        try {
          const healthResponse = await apiGet('/health');
          setHealth(healthResponse.status || 'Online');
        } catch (error) {
          console.warn('Server health check failed:', error);
          setHealth('Offline - Running in Demo Mode');
        }
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setHealth('Error initializing app');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Handle mood analysis completion
  const handleMoodAnalysisComplete = (analysisData) => {
    setMoodData(analysisData);
    setCurrentStep('vibe-card');
    trackEvent('mood_analysis_completed', { 
      mood: analysisData.primaryMood,
      confidence: analysisData.confidence 
    });
  };

  // Handle vibe card generation
  const handleVibeCardGenerated = (cardData) => {
    setCapsuleData(cardData);
    setCurrentStep('summary');
    
    // Update user stats
    if (user) {
      const updatedUser = {
        ...user,
        cardsGenerated: (user.cardsGenerated || 0) + 1,
        totalPoints: (user.totalPoints || 0) + 50, // Points for generating a card
        stats: {
          ...user.stats,
          cardsGenerated: (user.stats?.cardsGenerated || 0) + 1,
          totalPoints: (user.stats?.totalPoints || 0) + 50
        }
      };
      updateUserData(updatedUser);
    }
    
    trackEvent('vibe_card_generated', { 
      cardType: cardData.type,
      mood: moodData?.primaryMood 
    });
  };

  // Handle experience completion
  const handleExperienceComplete = (stats) => {
    setCompletionStats(stats);
    setCurrentStep('celebration');
    
    // Award completion points
    if (user) {
      const completionPoints = stats.vibePointsEarned || 100;
      const updatedUser = {
        ...user,
        totalPoints: (user.totalPoints || 0) + completionPoints,
        streak: (user.streak || 0) + 1,
        stats: {
          ...user.stats,
          totalPoints: (user.stats?.totalPoints || 0) + completionPoints,
          streak: (user.stats?.streak || 0) + 1,
          lastActiveDate: new Date().toISOString()
        }
      };
      updateUserData(updatedUser);
    }
    
    trackEvent('experience_completed', stats);
  };

  // Reset experience
  const resetExperience = () => {
    setCurrentStep('mood');
    setMoodData(null);
    setCapsuleData(null);
    setUserChoices({});
    setCompletionStats({ vibePointsEarned: 0 });
  };

  // Handle logout
  const handleLogout = () => {
    AuthService.logout();
    if (wsManager.current) {
      wsManager.current.disconnect();
    }
    setIsAuthenticated(false);
    setUser(null);
    setNotifications([]);
    setFriends([]);
    setChallenges([]);
    setAchievements([]);
    resetExperience();
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-white mb-2">SparkVibe</h1>
          <p className="text-purple-200">Initializing your mood journey...</p>
        </motion.div>
      </div>
    );
  }

  // Login screen for unauthenticated users
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={(userData) => {
      setIsAuthenticated(true);
      setUser(userData);
      setLoading(false);
    }} />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 p-4 flex justify-between items-center">
          <motion.div 
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-2xl font-bold text-white">SparkVibe</h1>
            <ConnectionStatus status={health} />
          </motion.div>
          
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-4">
                <motion.div 
                  className="text-white text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="font-medium">{user.name}</span>
                  <div className="text-xs text-purple-200">
                    Level {user.level || 1} • {user.totalPoints || 0} points
                  </div>
                </motion.div>
                
                {/* Notification Bell */}
                <motion.button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5v-5a5 5 0 00-10 0v5l-5 5h5m10 0v1a3 3 0 01-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </motion.button>

                {/* Friends Button */}
                <motion.button
                  onClick={() => setShowFriends(!showFriends)}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </motion.button>

                {/* Logout Button */}
                <motion.button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm text-white bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Logout
                </motion.button>
              </div>
            )}
          </div>
        </header>

        {/* Notification Center */}
        <NotificationCenter 
          isVisible={showNotifications}
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAsRead={markNotificationsAsRead}
        />

        {/* Friends System */}
        <FriendSystem 
          isVisible={showFriends}
          friends={friends}
          onClose={() => setShowFriends(false)}
          user={user}
        />

        {/* Achievement Notifications */}
        <AnimatePresence>
          {newAchievements.map((achievement) => (
            <AchievementDisplay
              key={achievement.id}
              achievement={achievement}
              onClose={(id) => setNewAchievements(prev => prev.filter(a => a.id !== id))}
            />
          ))}
        </AnimatePresence>

        {/* Main Content */}
        <main className="relative z-10 container mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {currentStep === 'mood' && (
              <motion.div
                key="mood"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <MoodAnalyzer 
                  onComplete={handleMoodAnalysisComplete}
                  user={user}
                  updateUserData={updateUserData}
                />
              </motion.div>
            )}

            {currentStep === 'vibe-card' && (
              <motion.div
                key="vibe-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                {isEnhancedMode ? (
                  <EnhancedVibeCardGenerator
                    moodData={moodData}
                    userChoices={userChoices}
                    setUserChoices={setUserChoices}
                    onComplete={handleVibeCardGenerated}
                    user={user}
                    updateUserData={updateUserData}
                  />
                ) : (
                  <VibeCardGenerator
                    capsuleData={capsuleData}
                    userChoices={userChoices}
                    completionStats={completionStats}
                    user={user}
                    moodData={moodData}
                    onCardGenerated={handleVibeCardGenerated}
                  />
                )}
              </motion.div>
            )}

            {currentStep === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <MoodSummary moodData={moodData} />
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Leaderboard />
                  <TrendingAdventures />
                </div>
              </motion.div>
            )}

            {currentStep === 'celebration' && (
              <motion.div
                key="celebration"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
              >
                <CompletionCelebration 
                  completionStats={completionStats}
                  moodData={moodData}
                />
                <div className="mt-8 text-center">
                  <motion.button
                    onClick={resetExperience}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 
                               px-8 py-4 rounded-2xl font-bold text-white 
                               transition-all duration-300 transform hover:scale-105 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Start New Adventure ✨
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sidebar Content */}
          <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-20 space-y-4">
            {isEnhancedMode && (
              <>
                <EnhancedLeaderboard />
                <ChallengeSystem 
                  challenges={challenges}
                  user={user}
                  updateUserData={updateUserData}
                />
              </>
            )}
          </div>
        </main>

        {/* Social Sharing Component */}
        {capsuleData && (
          <SocialSharing 
            capsuleData={capsuleData}
            user={user}
            onShare={(platform) => trackEvent('social_share', { platform })}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;