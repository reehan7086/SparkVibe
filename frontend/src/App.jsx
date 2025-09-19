// Fixed App.jsx - Main application component with proper flow and error handling
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

  console.log('App render - Current step:', currentStep, 'Auth:', isAuthenticated, 'Loading:', loading);

  // Initialize WebSocket connection
  useEffect(() => {
    if (isAuthenticated && user && !user.isGuest) {
      console.log('Initializing WebSocket for user:', user.id);
      wsManager.current = new WebSocketManager(user.id, {
        onAchievement: (achievement) => {
          console.log('New achievement received:', achievement);
          setNewAchievements(prev => [...prev, achievement]);
          setTimeout(() => {
            setNewAchievements(prev => prev.filter(a => a.id !== achievement.id));
          }, 5000);
        },
        onLeaderboardUpdate: () => {
          window.dispatchEvent(new CustomEvent('leaderboardUpdate'));
        },
        onNotification: (notification) => {
          console.log('New notification:', notification);
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        },
        onFriendUpdate: () => {
          fetchFriends();
        },
        onChallengeUpdate: (challenge) => {
          console.log('Challenge update:', challenge);
          setChallenges(prev => prev.map(c => c.id === challenge.id ? challenge : c));
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
    console.log('Updating user data:', updatedUser);
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
      console.log('Notifications response:', response);
      if (response.success) {
        setNotifications(response.data || []);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.warn('Failed to fetch notifications:', error);
    }
  };

  const fetchFriends = async () => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    try {
      const response = await apiGet('/friends');
      console.log('Friends response:', response);
      if (response.success) {
        setFriends(response.data || []);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.warn('Failed to fetch friends:', error);
      setFriends([]);
    }
  };

  const fetchChallenges = async () => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    console.log('Fetching challenges for user:', user.id);
    try {
      const response = await apiGet('/challenges');
      console.log('Challenges response:', response);
      if (response.success) {
        setChallenges(response.challenges || response.data || []);
      } else if (response.challenges) {
        setChallenges(response.challenges);
      } else {
        setChallenges([]);
      }
    } catch (error) {
      console.warn('Failed to fetch challenges:', error);
      setChallenges([]);
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
      console.log('Initializing app...');
      try {
        const isAuth = AuthService.isAuthenticated();
        console.log('Authentication check:', isAuth);
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          console.log('Fetching user data...');
          const currentUser = AuthService.getCurrentUser();
          console.log('User data:', currentUser);
          
          if (currentUser) {
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
              console.log('Fetching initial data...');
              await Promise.all([
                fetchNotifications(),
                fetchFriends(),
                fetchChallenges()
              ]);
            }
          } else {
            console.warn('No user data found, treating as unauthenticated');
            setIsAuthenticated(false);
          }
        }
        
        // Check server health
        try {
          console.log('Checking server health...');
          const healthResponse = await apiGet('/health');
          console.log('Health response:', healthResponse);
          setHealth(healthResponse.status || 'Online');
        } catch (error) {
          console.warn('Server health check failed:', error);
          setHealth('Offline - Running in Demo Mode');
        }
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setHealth('Error initializing app');
      } finally {
        console.log('Loading complete');
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Handle mood analysis completion - FIXED: Update step properly
  const handleMoodAnalysisComplete = (analysisData) => {
    console.log('Mood analysis complete:', analysisData);
    setMoodData(analysisData);
    setCurrentStep('capsule');
    trackEvent('mood_analysis_completed', { 
      mood: analysisData.primaryMood || analysisData.mood,
      confidence: analysisData.confidence 
    });
  };

  // Handle capsule generation - FIXED: New step for capsule experience
  const handleCapsuleGenerated = (capsuleData) => {
    console.log('Capsule generated:', capsuleData);
    setCapsuleData(capsuleData);
    setCurrentStep('experience');
    trackEvent('capsule_generated', { 
      adventureType: capsuleData.adventure?.category 
    });
  };

  // Handle experience completion - FIXED: Move to vibe card generation
  const handleExperienceComplete = (stats) => {
    console.log('Experience complete:', stats);
    setCompletionStats(stats);
    setCurrentStep('vibe-card');
    
    // Award completion points
    if (user) {
      const completionPoints = stats.vibePointsEarned || 50;
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

  // Handle vibe card generation
  const handleVibeCardGenerated = (cardData) => {
    console.log('Vibe card generated:', cardData);
    setCapsuleData(cardData);
    setCurrentStep('summary');
    
    // Update user stats
    if (user) {
      const updatedUser = {
        ...user,
        cardsGenerated: (user.cardsGenerated || 0) + 1,
        totalPoints: (user.totalPoints || 0) + 25, // Points for generating a card
        stats: {
          ...user.stats,
          cardsGenerated: (user.stats?.cardsGenerated || 0) + 1,
          totalPoints: (user.stats?.totalPoints || 0) + 25
        }
      };
      updateUserData(updatedUser);
    }
    
    trackEvent('vibe_card_generated', { 
      cardType: cardData.type,
      mood: moodData?.primaryMood || moodData?.mood
    });
  };

  // Reset experience
  const resetExperience = () => {
    console.log('Resetting experience...');
    setCurrentStep('mood');
    setMoodData(null);
    setCapsuleData(null);
    setUserChoices({});
    setCompletionStats({ vibePointsEarned: 0 });
  };

  // Handle logout
  const handleLogout = () => {
    console.log('Logging out...');
    AuthService.signOut();
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
      console.log('Login success from LoginScreen:', userData);
      setIsAuthenticated(true);
      setUser(userData);
      setLoading(false);
    }} />;
  }

  return (
    <ErrorBoundary fallback={<div className="text-red-400 text-center p-4">Something went wrong. Please refresh the page.</div>}>
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
          <div className="max-w-4xl mx-auto">
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
                    onMoodAnalyzed={handleMoodAnalysisComplete}
                    isActive={true}
                  />
                </motion.div>
              )}

              {currentStep === 'capsule' && (
                <motion.div
                  key="capsule"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-indigo-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-white mb-2">Generating Your Adventure</h2>
                      <p className="text-blue-200">Based on your mood, we're creating a personalized experience...</p>
                    </div>
                    
                    <div className="flex items-center justify-center mb-6">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={() => {
                          // Generate a simple capsule based on mood
                          const mockCapsule = {
                            adventure: {
                              title: `${moodData?.mood === 'happy' ? 'Joy Amplifier' : moodData?.mood === 'anxious' ? 'Calm Creator' : 'Curiosity Quest'}`,
                              prompt: `A perfect adventure for your ${moodData?.mood} mood today!`,
                              category: 'Personal Growth',
                              difficulty: 'easy',
                              estimatedTime: '10 minutes'
                            },
                            brainBite: {
                              question: 'Did you know?',
                              answer: 'Your mood directly influences your creativity and problem-solving abilities!'
                            },
                            habitNudge: 'Consider making this a daily practice to build positive momentum.',
                            id: `capsule_${Date.now()}`
                          };
                          handleCapsuleGenerated(mockCapsule);
                        }}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-xl text-white font-semibold"
                      >
                        Generate Adventure
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 'experience' && capsuleData && (
                <motion.div
                  key="experience"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <CapsuleExperience
                    capsuleData={capsuleData}
                    moodData={moodData}
                    onComplete={() => handleExperienceComplete({ vibePointsEarned: 50 })}
                    onUserChoice={(choice) => setUserChoices(prev => ({ ...prev, [Date.now()]: choice }))}
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
                  <div className="space-y-8">
                    <CompletionCelebration 
                      completionStats={completionStats}
                      moodData={moodData}
                    />
                    
                    <MoodSummary moodData={moodData} />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <Leaderboard />
                      <TrendingAdventures />
                    </div>

                    <div className="text-center">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Sidebar Content - FIXED: Only show on summary step */}
        {currentStep === 'summary' && (
          <div className="fixed right-4 top-20 z-20 space-y-4">
            <EnhancedLeaderboard />
            <ChallengeSystem 
              challenges={challenges}
              user={user}
              updateUserData={updateUserData}
            />
          </div>
        )}

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