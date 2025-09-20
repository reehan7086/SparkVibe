// App.jsx - REVERTED VERSION with all features working
import { useEffect, useState, useRef, useCallback } from 'react';
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
  // State declarations
  const [health, setHealth] = useState('Checking...');
  const [capsuleData, setCapsuleData] = useState(null);
  const [userChoices, setUserChoices] = useState({});
  const [completionStats, setCompletionStats] = useState({ vibePointsEarned: 0 });
  const [moodData, setMoodData] = useState(null);
  const [currentStep, setCurrentStep] = useState('mood');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState(null);
  const [error, setError] = useState('');
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
  
  // Mobile sidebar state
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // WebSocket reference
  const wsManager = useRef(null);

  console.log('App render - Current step:', currentStep, 'Auth:', isAuthenticated, 'Loading:', loading);
  
  // MOBILE VIEWPORT HEIGHT FIX - Critical for mobile responsiveness
  useEffect(() => {
    const setVH = () => {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

// Add this useEffect after the viewport height fix
useEffect(() => {
  const handleOAuthRedirect = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    if (code && state) {
      const storedState = sessionStorage.getItem('google_oauth_state');
      console.log('Stored State:', storedState, 'Received State:', state); // Debug
      if (state === storedState) {
        apiPost('/auth/google', { code })
          .then(result => {
            if (result.success && result.data) {
              AuthService.setAuthData(result.data.token, result.data.user);
              setIsAuthenticated(true);
              setUser(result.data.user);
              window.history.replaceState({}, document.title, window.location.pathname);
              setError(''); // Clear error on success
            }
          })
          .catch(error => {
            console.error('OAuth code exchange failed:', error);
            setError('Authentication failed. Please try again.');
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      } else {
        setError('Invalid authentication state');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      sessionStorage.removeItem('google_oauth_state');
    }
  };
  handleOAuthRedirect();
  window.addEventListener('popstate', handleOAuthRedirect);
  return () => window.removeEventListener('popstate', handleOAuthRedirect);
}, []);
  // Enhanced user data update with event dispatching
  const updateUserData = useCallback(async (updatedUser) => {
    console.log('Updating user data:', updatedUser);
    setUser(updatedUser);
    localStorage.setItem('sparkvibe_user', JSON.stringify(updatedUser));
    
    window.dispatchEvent(new CustomEvent('userDataUpdated', { 
      detail: { user: updatedUser, timestamp: Date.now() } 
    }));

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
  }, []);

  // Fetch functions
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    try {
      const response = await apiGet('/notifications');
      if (response.success) {
        setNotifications(response.data || []);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.warn('Failed to fetch notifications:', error);
    }
  }, [isAuthenticated, user?.isGuest]);

  const fetchFriends = useCallback(async () => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    try {
      const response = await apiGet('/friends');
      if (response.success) {
        setFriends(response.data || []);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.warn('Failed to fetch friends:', error);
      setFriends([]);
    }
  }, [isAuthenticated, user?.isGuest]);

  const fetchChallenges = useCallback(async () => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    try {
      const response = await apiGet('/challenges');
      if (response.success) {
        setChallenges(response.challenges || response.data || []);
      } else {
        setChallenges([]);
      }
    } catch (error) {
      console.warn('Failed to fetch challenges:', error);
      setChallenges([]);
    }
  }, [isAuthenticated, user?.isGuest, user?.id]);
  
  const markNotificationsAsRead = useCallback(async (notificationIds = null) => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    try {
      await apiPost('/notifications/read', { notificationIds });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.warn('Failed to mark notifications as read:', error);
    }
  }, [isAuthenticated, user?.isGuest]);

  const trackEvent = useCallback(async (eventType, metadata = {}) => {
    if (!isAuthenticated || !user || user.isGuest) return;
    
    try {
      await apiPost('/track-event', { eventType, metadata });
    } catch (error) {
      console.warn('Failed to track event:', error);
    }
  }, [isAuthenticated, user?.isGuest]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (isAuthenticated && user && !user.isGuest && user.id) {
      wsManager.current = new WebSocketManager(user.id, {
        onAchievement: (achievement) => {
          setNewAchievements(prev => [...prev, achievement]);
          setTimeout(() => {
            setNewAchievements(prev => prev.filter(a => a.id !== achievement.id));
          }, 5000);
        },
        onLeaderboardUpdate: () => {
          window.dispatchEvent(new CustomEvent('leaderboardUpdate'));
        },
        onNotification: (notification) => {
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        },
        onFriendUpdate: () => {
          fetchFriends();
        },
        onChallengeUpdate: (challenge) => {
          setChallenges(prev => prev.map(c => c.id === challenge.id ? challenge : c));
        }
      });

      return () => {
        if (wsManager.current) {
          wsManager.current.disconnect();
        }
      };
    }
  }, [isAuthenticated, user?.isGuest, user?.id, fetchFriends]);

  // Handle mood analysis completion
  const handleMoodAnalysisComplete = useCallback((analysisData) => {
    setMoodData(analysisData);
    setCurrentStep('capsule');
    trackEvent('mood_analysis_completed', { 
      mood: analysisData.primaryMood || analysisData.mood,
      confidence: analysisData.confidence 
    });
  }, [trackEvent]);

  // Handle capsule generation
  const handleCapsuleGenerated = useCallback((capsuleData) => {
    setCapsuleData(capsuleData);
    setCurrentStep('experience');
    trackEvent('capsule_generated', { 
      adventureType: capsuleData.adventure?.category 
    });
  }, [trackEvent]);

  // Handle experience completion
  const handleExperienceComplete = useCallback(async (stats) => {
    setCompletionStats(stats);
    setCurrentStep('vibe-card');
    
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
      await updateUserData(updatedUser);
    }
    
    trackEvent('experience_completed', stats);
  }, [user, updateUserData, trackEvent]);

  // FIXED: Handle vibe card generation (now uses setCardData)
  const handleVibeCardGenerated = useCallback(async (cardData) => {
    setCardData(cardData); // FIXED: was setCapsuleData
    setCurrentStep('summary');
    
    if (user) {
      const updatedUser = {
        ...user,
        cardsGenerated: (user.cardsGenerated || 0) + 1,
        totalPoints: (user.totalPoints || 0) + 25,
        stats: {
          ...user.stats,
          cardsGenerated: (user.stats?.cardsGenerated || 0) + 1,
          totalPoints: (user.stats?.totalPoints || 0) + 25
        }
      };
      await updateUserData(updatedUser);
    }
    
    trackEvent('vibe_card_generated', { 
      cardType: cardData.type,
      mood: moodData?.primaryMood || moodData?.mood
    });
  }, [user, updateUserData, trackEvent, moodData]);

  const handleCardGenerated = useCallback(async (generatedCardData) => {
    setCardData(generatedCardData);
    setCurrentStep('summary');
    
    if (user) {
      const updatedUser = {
        ...user,
        cardsGenerated: (user.cardsGenerated || 0) + 1,
        totalPoints: (user.totalPoints || 0) + 25,
        stats: {
          ...user.stats,
          cardsGenerated: (user.stats?.cardsGenerated || 0) + 1,
          totalPoints: (user.stats?.totalPoints || 0) + 25
        }
      };
      await updateUserData(updatedUser);
    }
    
    trackEvent('card_generated', { 
      cardType: generatedCardData.type,
      mood: moodData?.primaryMood || moodData?.mood
    });
  }, [user, updateUserData, trackEvent, moodData]);

  const resetFlow = useCallback(() => {
    setCurrentStep('mood');
    setMoodData(null);
    setCapsuleData(null);
    setCardData(null);
    setUserChoices({});
    setCompletionStats({ vibePointsEarned: 0 });
  }, []);

  const shareCard = useCallback(async () => {
    if (!cardData) return;
    
    try {
      if (user) {
        const updatedUser = {
          ...user,
          cardsShared: (user.cardsShared || 0) + 1,
          totalPoints: (user.totalPoints || 0) + 15,
          stats: {
            ...user.stats,
            cardsShared: (user.stats?.cardsShared || 0) + 1,
            totalPoints: (user.stats?.totalPoints || 0) + 15
          }
        };
        await updateUserData(updatedUser);
      }
      
      if (navigator.share) {
        await navigator.share({
          title: 'Check out my SparkVibe card!',
          text: `I just created an awesome mood card with SparkVibe! ${cardData.adventure?.title || 'Check it out!'}`,
          url: window.location.href
        });
      } else {
        const shareText = `Check out my SparkVibe card: ${cardData.adventure?.title || 'Mood adventure!'} - ${window.location.href}`;
        await navigator.clipboard.writeText(shareText);
        alert('Share link copied to clipboard!');
      }
      
      trackEvent('card_shared', { 
        cardType: cardData.type,
        method: navigator.share ? 'native' : 'clipboard'
      });
    } catch (error) {
      console.error('Failed to share card:', error);
    }
  }, [cardData, user, updateUserData, trackEvent]);

  const handleLogout = useCallback(() => {
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
    resetFlow();
  }, [resetFlow]);
  
  // Check authentication and load user data
  useEffect(() => {
    let mounted = true;
    
    const initializeApp = async () => {
      try {
        const isAuth = AuthService.isAuthenticated();
        
        if (mounted) {
          setIsAuthenticated(isAuth);
        }
        
        if (isAuth && mounted) {
          const currentUser = AuthService.getCurrentUser();
          
          if (currentUser && mounted) {
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
            
            if (!userData.isGuest && !userData.provider?.includes('demo')) {
              await Promise.all([
                fetchNotifications(),
                fetchFriends(),
                fetchChallenges()
              ]);
            }
          } else if (mounted) {
            setIsAuthenticated(false);
          }
        }
        
        try {
          const healthResponse = await apiGet('/health');
          if (mounted) {
            setHealth(healthResponse.status || 'Online');
          }
        } catch (error) {
          if (mounted) {
            setHealth('Offline - Running in Demo Mode');
          }
        }
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        if (mounted) {
          setHealth('Error initializing app');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeApp();
    
    return () => {
      mounted = false;
    };
  }, [fetchNotifications, fetchFriends, fetchChallenges]);
  
  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen min-h-screen-dynamic bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
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

  // Login screen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={(userData) => {
      setIsAuthenticated(true);
      setUser(userData);
      setLoading(false);
    }} />;
  }
  
  return (
    <ErrorBoundary fallback={<div className="text-red-400 text-center p-4">Something went wrong. Please refresh the page.</div>}>
      <div className="min-h-screen min-h-screen-dynamic bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative no-scroll-x">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 md:w-64 md:h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-32 h-32 md:w-64 md:h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 safe-area-inset">
          <motion.div 
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-xl md:text-2xl font-bold text-white">SparkVibe</h1>
            <ConnectionStatus status={health} />
          </motion.div>
          
          <div className="flex items-center space-x-2 md:space-x-4 w-full sm:w-auto justify-between sm:justify-end">
            {user && (
              <div className="flex items-center space-x-2 md:space-x-4">
                <motion.div 
                  className="text-white text-xs md:text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="font-medium truncate-mobile">{user.name}</span>
                  <div className="text-xs text-purple-200">
                    Level {user.level || 1} • {user.totalPoints || 0} points
                  </div>
                </motion.div>
                
                <motion.button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-white hover:bg-white/10 rounded-full transition-colors touch-target"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5v-5a5 5 0 00-10 0v5l-5 5h5m10 0v1a3 3 0 01-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </motion.button>

                <motion.button
                  onClick={() => setShowFriends(!showFriends)}
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors touch-target"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </motion.button>

                <motion.button
                  onClick={handleLogout}
                  className="px-2 py-1 md:px-3 md:py-1 text-xs md:text-sm text-white bg-white/20 hover:bg-white/30 rounded-full transition-colors touch-target"
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

        {/* Achievement Notifications - FIXED: Added missing section */}
        <AnimatePresence>
          {newAchievements.map((achievement) => (
            <AchievementDisplay
              key={achievement.id}
              achievement={achievement}
              onClose={(id) => setNewAchievements(prev => prev.filter(a => a.id !== id))}
            />
          ))}
        </AnimatePresence>

        {/* Main Content - SINGLE AnimatePresence */}
        <main className="relative z-10 mobile-container py-4 md:py-8">
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
                  <MoodAnalyzer onMoodAnalyzed={handleMoodAnalysisComplete} isActive={true} />
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
                  <div className="card-mobile mb-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Generating Your Adventure</h2>
                      <p className="text-blue-200">Based on your mood, we're creating a personalized experience...</p>
                    </div>
                    <div className="flex items-center justify-center mb-6">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
                    </div>
                    <div className="text-center">
                      <button 
                        onClick={() => {
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
                        className="btn-mobile w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        Generate Adventure
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 'experience' && (
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
                    onComplete={handleExperienceComplete}
                    onChoicesMade={setUserChoices}
                    isActive={true}
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
                      capsuleData={capsuleData}
                      completionStats={completionStats}
                      userChoices={userChoices}
                      onCardGenerated={handleCardGenerated}
                      isActive={true}
                    />
                  ) : (
                    <VibeCardGenerator 
                      moodData={moodData}
                      capsuleData={capsuleData}
                      onCardGenerated={handleCardGenerated}
                      isActive={true}
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
                  <MoodSummary 
                    moodData={moodData}
                    capsuleData={capsuleData}
                    cardData={cardData}
                    completionStats={completionStats}
                    onStartNew={resetFlow}
                    onShare={shareCard}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile-optimized floating action buttons */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {currentStep !== 'mood' && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={resetFlow}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              title="Start Over"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </motion.button>
          )}
          
          {cardData && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={shareCard}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              title="Share Your Vibe"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </motion.button>
          )}
        </div>

        {/* Footer with mobile-friendly navigation */}
        <footer className="relative z-10 border-t border-purple-800/20 bg-black/30 backdrop-blur-sm">
          <div className="mobile-container py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">SparkVibe</h3>
                <p className="text-blue-200 text-sm">AI-powered mood adventures that turn your daily vibes into shareable moments.</p>
              </div>
              <div>
                <h4 className="text-md font-semibold text-white mb-2">Quick Actions</h4>
                <div className="space-y-1">
                  <button 
                    onClick={resetFlow}
                    className="block text-blue-200 hover:text-white text-sm transition-colors mx-auto md:mx-0"
                  >
                    New Mood Check
                  </button>
                  <button 
                    onClick={() => setCurrentStep('vibe-card')}
                    className="block text-blue-200 hover:text-white text-sm transition-colors mx-auto md:mx-0"
                    disabled={!capsuleData}
                  >
                    Create Card
                  </button>
                </div>
              </div>
              <div>
                <h4 className="text-md font-semibold text-white mb-2">Share Your Vibe</h4>
                <div className="flex justify-center md:justify-start space-x-4">
                  <button 
                    onClick={shareCard}
                    className="text-blue-200 hover:text-white transition-colors"
                    disabled={!cardData}
                    title="Share to Social"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                  </button>
                  <button 
                    onClick={() => navigator.share && navigator.share({
                      title: 'Check out my SparkVibe card!',
                      url: window.location.href
                    })}
                    className="text-blue-200 hover:text-white transition-colors"
                    title="Share Link"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="border-t border-purple-800/20 mt-6 pt-4 text-center">
              <p className="text-blue-200 text-sm">
                Made with ✨ for spreading good vibes • {new Date().getFullYear()} SparkVibe
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;