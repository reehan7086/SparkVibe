// App.jsx - COMPLETE FIXED VERSION - All request flooding issues resolved
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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

// CRITICAL FIX 1: Request Cache to prevent duplicate API calls
class RequestCache {
  constructor(defaultTTL = 60000) {
    this.cache = new Map();
    this.pending = new Map();
    this.defaultTTL = defaultTTL;
  }

  async get(key, fetcher, ttl = this.defaultTTL) {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    if (this.pending.has(key)) {
      return this.pending.get(key);
    }

    const promise = fetcher().then(data => {
      this.cache.set(key, {
        data,
        expiry: Date.now() + ttl
      });
      this.pending.delete(key);
      return data;
    }).catch(error => {
      this.pending.delete(key);
      throw error;
    });

    this.pending.set(key, promise);
    return promise;
  }

  clear() {
    this.cache.clear();
    this.pending.clear();
  }

  delete(key) {
    this.cache.delete(key);
    this.pending.delete(key);
  }
}

// CRITICAL FIX 2: Debounce utility to prevent spam requests
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// CRITICAL FIX 3: Global request cache instance
const requestCache = new RequestCache();

// CRITICAL FIX 4: Enhanced API wrapper with built-in rate limiting
class APIService {
  constructor() {
    this.lastRequestTime = 0;
    this.minInterval = 2000;
    this.requestQueue = [];
    this.isProcessing = false;
  }

  async queueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        fn: requestFn,
        resolve,
        reject
      });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const { fn, resolve, reject } = this.requestQueue.shift();
      
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minInterval) {
        await new Promise(r => setTimeout(r, this.minInterval - timeSinceLastRequest));
      }
      
      try {
        const result = await fn();
        this.lastRequestTime = Date.now();
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
    
    this.isProcessing = false;
  }

  async get(endpoint, cacheKey = endpoint, cacheTTL = 60000) {
    return requestCache.get(cacheKey, () => 
      this.queueRequest(() => apiGet(endpoint)), cacheTTL
    );
  }

  async post(endpoint, data) {
    return this.queueRequest(() => apiPost(endpoint, data));
  }
}

const apiService = new APIService();

const App = () => {
  // Core state
  const [health, setHealth] = useState('Checking...');
  const [currentStep, setCurrentStep] = useState('mood');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Flow data
  const [moodData, setMoodData] = useState(null);
  const [capsuleData, setCapsuleData] = useState(null);
  const [cardData, setCardData] = useState(null);
  const [userChoices, setUserChoices] = useState({});
  const [completionStats, setCompletionStats] = useState({ vibePointsEarned: 0 });

  // Enhanced features state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [friends, setFriends] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [newAchievements, setNewAchievements] = useState([]);
  
  // UI state
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [isEnhancedMode, setIsEnhancedMode] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // WebSocket and refs
  const wsManager = useRef(null);
  const mountedRef = useRef(true);
  const fetchTimeoutRef = useRef(null);
  const lastFetchRef = useRef({
    notifications: 0,
    friends: 0,
    challenges: 0
  });

  console.log('App render - Current step:', currentStep, 'Auth:', isAuthenticated, 'Loading:', loading);
  
  // CRITICAL FIX 5: Optimized viewport height
  useEffect(() => {
    let resizeTimeout;
    let rafId;
    
    const setVH = () => {
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const vh = window.innerHeight * 0.01;
          document.documentElement.style.setProperty('--vh', `${vh}px`);
        }, 200);
      });
    };
    
    setVH();
    
    const events = ['resize', 'orientationchange', 'visibilitychange'];
    events.forEach(event => {
      const target = event === 'visibilitychange' ? document : window;
      target.addEventListener(event, setVH, { passive: true });
    });
    
    return () => {
      clearTimeout(resizeTimeout);
      if (rafId) cancelAnimationFrame(rafId);
      events.forEach(event => {
        const target = event === 'visibilitychange' ? document : window;
        target.removeEventListener(event, setVH);
      });
    };
  }, []);

  // FIXED: Prevent iOS bounce scrolling
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
    
    return () => {
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehavior = '';
    };
  }, []);

  // CRITICAL FIX 6: Debounced OAuth redirect handler
  useEffect(() => {
    const handleOAuthRedirect = debounce(async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        const storedState = sessionStorage.getItem('google_oauth_state');
        console.log('OAuth redirect - Stored State:', storedState, 'Received State:', state);
        
        if (state === storedState) {
          try {
            const result = await apiService.post('/auth/google', { code });
            if (result.success && result.data) {
              AuthService.setAuthData(result.data.token, result.data.user);
              if (mountedRef.current) {
                setIsAuthenticated(true);
                setUser(result.data.user);
                setError('');
              }
            }
          } catch (error) {
            console.error('OAuth code exchange failed:', error);
            if (mountedRef.current) {
              setError('Authentication failed. Please try again.');
            }
          } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          if (mountedRef.current) {
            setError('Invalid authentication state');
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        sessionStorage.removeItem('google_oauth_state');
      }
    }, 1000);
    
    handleOAuthRedirect();
  }, []);

  // CRITICAL FIX 7: Heavily optimized updateUserData with sync throttling
  const updateUserData = useCallback(
    debounce(async (updatedUser) => {
      if (!mountedRef.current) return;
      
      console.log('Updating user data:', updatedUser);
      setUser(updatedUser);
      localStorage.setItem('sparkvibe_user', JSON.stringify(updatedUser));
      
      debounce(() => {
        window.dispatchEvent(new CustomEvent('userDataUpdated', { 
          detail: { user: updatedUser, timestamp: Date.now() } 
        }));
      }, 2000)();

      if (!updatedUser.isGuest && !updatedUser.provider?.includes('demo')) {
        const lastSync = localStorage.getItem('lastUserSync');
        const now = Date.now();
        
        if (!lastSync || (now - parseInt(lastSync)) > 60000) {
          try {
            localStorage.setItem('lastUserSync', now.toString());
            
            const syncResult = await apiService.post('/user/sync-stats', {
              userId: updatedUser.id,
              stats: updatedUser.stats,
              totalPoints: updatedUser.totalPoints,
              level: updatedUser.level,
              streak: updatedUser.streak,
              cardsGenerated: updatedUser.cardsGenerated,
              cardsShared: updatedUser.cardsShared
            });
            
            if (syncResult.success) {
              console.log('User stats synced with backend successfully');
            }
          } catch (error) {
            console.warn('Failed to sync user stats with backend:', error.message);
            localStorage.removeItem('lastUserSync');
          }
        }
      }
    }, 3000),
    []
  );

  // CRITICAL FIX 8: Optimized fetch functions with caching and rate limiting
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user || user.isGuest || !mountedRef.current) return;
    
    const now = Date.now();
    if (now - lastFetchRef.current.notifications < 120000) return;
    
    try {
      const response = await apiService.get('/notifications', 'notifications', 300000);
      if (response.success && mountedRef.current) {
        setNotifications(response.data || []);
        setUnreadCount(response.unreadCount || 0);
        lastFetchRef.current.notifications = now;
      }
    } catch (error) {
      console.warn('Failed to fetch notifications:', error);
    }
  }, [isAuthenticated, user]);

  const fetchFriends = useCallback(async () => {
    if (!isAuthenticated || !user || user.isGuest || !mountedRef.current) return;
    
    const now = Date.now();
    if (now - lastFetchRef.current.friends < 300000) return;
    
    try {
      const response = await apiService.get('/friends', 'friends', 600000);
      if (response.success && mountedRef.current) {
        setFriends(response.data || []);
        lastFetchRef.current.friends = now;
      }
    } catch (error) {
      console.warn('Failed to fetch friends:', error);
      if (mountedRef.current) {
        setFriends([]);
      }
    }
  }, [isAuthenticated, user]);

  const fetchChallenges = useCallback(async () => {
    if (!isAuthenticated || !user || user.isGuest || !mountedRef.current) return;
    
    const now = Date.now();
    if (now - lastFetchRef.current.challenges < 300000) return;
    
    try {
      const response = await apiService.get('/challenges', 'challenges', 600000);
      if (response.success && mountedRef.current) {
        setChallenges(response.challenges || response.data || []);
        lastFetchRef.current.challenges = now;
      }
    } catch (error) {
      console.warn('Failed to fetch challenges:', error);
      if (mountedRef.current) {
        setChallenges([]);
      }
    }
  }, [isAuthenticated, user]);
  
  // CRITICAL FIX 9: Heavily debounced functions
  const markNotificationsAsRead = useCallback(
    debounce(async (notificationIds = null) => {
      if (!isAuthenticated || !user || user.isGuest) return;
      
      try {
        await apiService.post('/notifications/read', { notificationIds });
        if (mountedRef.current) {
          setUnreadCount(0);
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          requestCache.delete('notifications');
        }
      } catch (error) {
        console.warn('Failed to mark notifications as read:', error);
      }
    }, 3000),
    [isAuthenticated, user]
  );

  const trackEvent = useCallback(
    debounce(async (eventType, metadata = {}) => {
      if (!isAuthenticated || !user || user.isGuest) return;
      
      try {
        await apiService.post('/track-event', { eventType, metadata });
      } catch (error) {
        console.warn('Failed to track event:', error);
      }
    }, 2000),
    [isAuthenticated, user]
  );

  // CRITICAL FIX 10: Smart polling system
  const useSmartPolling = useCallback(() => {
    const pollingIntervalRef = useRef(null);
    const [isVisible, setIsVisible] = useState(true);
    
    useEffect(() => {
      const handleVisibilityChange = () => {
        setIsVisible(!document.hidden);
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);
    
    const startPolling = useCallback(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      if (!isAuthenticated || !user || user.isGuest || !isVisible) return;
      if (wsManager.current && wsManager.current.isConnected) return;
      
      console.log('Starting fallback polling (WebSocket unavailable)');
      
      pollingIntervalRef.current = setInterval(() => {
        console.log('Fallback polling tick');
        
        setTimeout(() => fetchNotifications(), 1000);
        setTimeout(() => fetchFriends(), 5000);
        setTimeout(() => fetchChallenges(), 10000);
      }, 600000);
    }, [isAuthenticated, user, isVisible]);
    
    const stopPolling = useCallback(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('Stopped fallback polling');
      }
    }, []);
    
    return { startPolling, stopPolling };
  }, [isAuthenticated, user, fetchNotifications, fetchFriends, fetchChallenges]);

  const { startPolling, stopPolling } = useSmartPolling();

  // CRITICAL FIX 11: Optimized WebSocket initialization
  useEffect(() => {
    if (isAuthenticated && user && !user.isGuest && user.id) {
      wsManager.current = new WebSocketManager(user.id, {
        onAchievement: (achievement) => {
          if (!mountedRef.current) return;
          setNewAchievements(prev => [...prev, achievement]);
          setTimeout(() => {
            if (mountedRef.current) {
              setNewAchievements(prev => prev.filter(a => a.id !== achievement.id));
            }
          }, 5000);
        },
        onLeaderboardUpdate: debounce(() => {
          window.dispatchEvent(new CustomEvent('leaderboardUpdate'));
        }, 5000),
        onNotification: (notification) => {
          if (!mountedRef.current) return;
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          requestCache.delete('notifications');
        },
        onFriendUpdate: debounce(() => {
          if (mountedRef.current) {
            requestCache.delete('friends');
            setTimeout(() => fetchFriends(), 2000);
          }
        }, 3000),
        onChallengeUpdate: (challenge) => {
          if (!mountedRef.current) return;
          setChallenges(prev => prev.map(c => c.id === challenge.id ? challenge : c));
          requestCache.delete('challenges');
        }
      });

      const checkWebSocketConnection = setTimeout(() => {
        if (!wsManager.current || !wsManager.current.isConnected) {
          console.log('WebSocket failed to connect, starting fallback polling');
          startPolling();
        } else {
          console.log('WebSocket connected successfully, no polling needed');
          stopPolling();
        }
      }, 10000);

      return () => {
        clearTimeout(checkWebSocketConnection);
        if (wsManager.current) {
          wsManager.current.disconnect();
          wsManager.current = null;
        }
        stopPolling();
      };
    }
  }, [isAuthenticated, user, startPolling, stopPolling]);

  // CRITICAL FIX 12: Heavily debounced flow handlers
  const handleMoodAnalysisComplete = useCallback(
    debounce((analysisData) => {
      if (!mountedRef.current) return;
      console.log('Mood analysis complete:', analysisData);
      setMoodData(analysisData);
      setCurrentStep('capsule');
      
      setTimeout(() => {
        trackEvent('mood_analysis_completed', { 
          mood: analysisData.primaryMood || analysisData.mood,
          confidence: analysisData.confidence 
        });
      }, 1000);
    }, 2000),
    [trackEvent]
  );

  const handleCapsuleGenerated = useCallback(
    debounce((generatedCapsuleData) => {
      if (!mountedRef.current) return;
      console.log('Capsule generated:', generatedCapsuleData);
      setCapsuleData(generatedCapsuleData);
      setCurrentStep('experience');
      
      setTimeout(() => {
        trackEvent('capsule_generated', { 
          adventureType: generatedCapsuleData.adventure?.category 
        });
      }, 1000);
    }, 2000),
    [trackEvent]
  );

  const handleExperienceComplete = useCallback(
    debounce(async (stats = {}) => {
      if (!mountedRef.current) return;
      console.log('Experience complete:', stats);
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
            lastActiveDate: new Date().toISOString(),
            adventuresCompleted: (user.stats?.adventuresCompleted || 0) + 1
          }
        };
        
        setTimeout(() => {
          updateUserData(updatedUser);
        }, 500);
      }
      
      setTimeout(() => {
        trackEvent('experience_completed', stats);
      }, 1000);
    }, 3000),
    [user, updateUserData, trackEvent]
  );

  const handleCardGenerated = useCallback(
    debounce(async (generatedCardData) => {
      if (!mountedRef.current) return;
      console.log('Card generated:', generatedCardData);
      setCardData(generatedCardData);
      setCurrentStep('summary');
      
      if (user) {
        const cardPoints = 25;
        const updatedUser = {
          ...user,
          cardsGenerated: (user.cardsGenerated || 0) + 1,
          totalPoints: (user.totalPoints || 0) + cardPoints,
          stats: {
            ...user.stats,
            cardsGenerated: (user.stats?.cardsGenerated || 0) + 1,
            totalPoints: (user.stats?.totalPoints || 0) + cardPoints
          }
        };
        
        setTimeout(() => {
          updateUserData(updatedUser);
        }, 500);
      }
      
      setTimeout(() => {
        trackEvent('card_generated', { 
          cardType: generatedCardData.type || 'standard',
          mood: moodData?.primaryMood || moodData?.mood
        });
      }, 1000);
    }, 3000),
    [user, updateUserData, trackEvent, moodData]
  );

  const handleUserChoice = useCallback(
    debounce((choiceType, choiceData) => {
      if (!mountedRef.current) return;
      console.log('User choice made:', choiceType, choiceData);
      setUserChoices(prev => ({
        ...prev,
        [choiceType]: choiceData
      }));
    }, 1000),
    []
  );
 
  const resetFlow = useCallback(
    debounce(() => {
      if (!mountedRef.current) return;
      console.log('Resetting flow');
      setCurrentStep('mood');
      setMoodData(null);
      setCapsuleData(null);
      setCardData(null);
      setUserChoices({});
      setCompletionStats({ vibePointsEarned: 0 });
      
      requestCache.delete('mood_analysis');
      requestCache.delete('capsule_generation');
    }, 2000),
    []
  );

  const shareCard = useCallback(
    debounce(async () => {
      if (!cardData) {
        console.warn('No card data to share');
        return;
      }
      
      try {
        if (user) {
          const sharePoints = 15;
          const updatedUser = {
            ...user,
            cardsShared: (user.cardsShared || 0) + 1,
            totalPoints: (user.totalPoints || 0) + sharePoints,
            stats: {
              ...user.stats,
              cardsShared: (user.stats?.cardsShared || 0) + 1,
              totalPoints: (user.stats?.totalPoints || 0) + sharePoints
            }
          };
          
          setTimeout(() => {
            updateUserData(updatedUser);
          }, 500);
        }
        
        const shareData = {
          title: 'Check out my SparkVibe card!',
          text: `I just created an awesome mood card with SparkVibe! ${cardData.adventure?.title || 'Check it out!'}`,
          url: window.location.href
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
        } else {
          const shareText = `${shareData.text} - ${shareData.url}`;
          await navigator.clipboard.writeText(shareText);
          
          const toast = document.createElement('div');
          toast.textContent = 'Share link copied to clipboard!';
          toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded z-50';
          document.body.appendChild(toast);
          setTimeout(() => {
            if (document.body.contains(toast)) {
              document.body.removeChild(toast);
            }
          }, 3000);
        }
        
        setTimeout(() => {
          trackEvent('card_shared', { 
            cardType: cardData.type || 'standard',
            method: navigator.share ? 'native' : 'clipboard'
          });
        }, 1000);
      } catch (error) {
        console.error('Failed to share card:', error);
        try {
          await navigator.clipboard.writeText(window.location.href);
          
          const toast = document.createElement('div');
          toast.textContent = 'Link copied to clipboard!';
          toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded z-50';
          document.body.appendChild(toast);
          setTimeout(() => {
            if (document.body.contains(toast)) {
              document.body.removeChild(toast);
            }
          }, 3000);
        } catch (clipboardError) {
          console.error('Failed to copy to clipboard:', clipboardError);
        }
      }
    }, 5000),
    [cardData, user, updateUserData, trackEvent]
  );

  const handleLogout = useCallback(
    debounce(() => {
      console.log('Logging out user');
      AuthService.signOut();
      
      requestCache.clear();
      
      if (wsManager.current) {
        wsManager.current.disconnect();
        wsManager.current = null;
      }
      
      stopPolling();
      
      if (mountedRef.current) {
        setIsAuthenticated(false);
        setUser(null);
        setNotifications([]);
        setFriends([]);
        setChallenges([]);
        setAchievements([]);
        resetFlow();
      }
    }, 2000),
    [resetFlow, stopPolling]
  );

  // CRITICAL FIX 13: Optimized initialization
  useEffect(() => {
    let isCancelled = false;
    
    const initializeApp = debounce(async () => {
      try {
        const isAuth = AuthService.isAuthenticated();
        
        if (!isCancelled && mountedRef.current) {
          setIsAuthenticated(isAuth);
        }
        
        if (isAuth && !isCancelled && mountedRef.current) {
          const currentUser = AuthService.getCurrentUser();
          
          if (currentUser && mountedRef.current) {
            const userData = {
              ...currentUser,
              name: currentUser.name || currentUser.given_name || 'SparkVibe Explorer',
              totalPoints: currentUser.totalPoints || currentUser.stats?.totalPoints || 0,
              level: currentUser.level || Math.floor((currentUser.totalPoints || currentUser.stats?.totalPoints || 0) / 100) + 1,
              streak: currentUser.streak || currentUser.stats?.streak || 0,
              cardsGenerated: currentUser.cardsGenerated || currentUser.stats?.cardsGenerated || 0,
              cardsShared: currentUser.cardsShared || currentUser.stats?.cardsShared || 0,
              stats: {
                totalPoints: currentUser.totalPoints || currentUser.stats?.totalPoints || 0,
                level: currentUser.level || Math.floor((currentUser.totalPoints || currentUser.stats?.totalPoints || 0) / 100) + 1,
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
            localStorage.setItem('sparkvibe_user', JSON.stringify(userData));
            
            if (!userData.isGuest && !userData.provider?.includes('demo')) {
              setTimeout(() => fetchNotifications(), 2000);
              setTimeout(() => fetchFriends(), 5000);
              setTimeout(() => fetchChallenges(), 8000);
            }
          } else if (mountedRef.current) {
            setIsAuthenticated(false);
          }
        }
        
        fetchTimeoutRef.current = setTimeout(async () => {
          try {
            const healthResponse = await apiService.get('/health', 'health', 600000);
            if (!isCancelled && mountedRef.current) {
              setHealth(healthResponse.status || 'Online');
            }
          } catch (error) {
            if (!isCancelled && mountedRef.current) {
              setHealth('Offline - Running in Demo Mode');
            }
          }
        }, 3000);
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
        if (!isCancelled && mountedRef.current) {
          setHealth('Error initializing app');
        }
      } finally {
        if (!isCancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    }, 1000);

    initializeApp();
    
    return () => {
      isCancelled = true;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchNotifications, fetchFriends, fetchChallenges]);

  // CRITICAL FIX 14: Memoized header components
  const headerButtonHandlers = useMemo(() => ({
    notifications: debounce(() => setShowNotifications(prev => !prev), 500),
    friends: debounce(() => setShowFriends(prev => !prev), 500),
    leaderboard: debounce(() => setCurrentStep('leaderboard'), 500),
    logout: handleLogout
  }), [handleLogout]);

  const HeaderButton = React.memo(({ onClick, children, className, title, ...props }) => (
    <motion.button
      onClick={onClick}
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={title}
      {...props}
    >
      {children}
    </motion.button>
  ));

  const optimizedHeaderButtons = useMemo(() => [
    {
      key: 'notifications',
      onClick: headerButtonHandlers.notifications,
      icon: (
        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5v-5a5 5 0 00-10 0v5l-5 5h5m10 0v1a3 3 0 01-6 0v-1m6 0H9" />
        </svg>
      ),
      badge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : null,
      title: 'Notifications'
    },
    {
      key: 'friends',
      onClick: headerButtonHandlers.friends,
      icon: (
        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M17.5 10.5a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      badge: null,
      title: 'Friends'
    },
    {
      key: 'leaderboard',
      onClick: headerButtonHandlers.leaderboard,
      icon: (
        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      badge: user?.totalPoints > 0 ? Math.min(Math.floor(user.totalPoints / 100) + 1, 99) : null,
      title: 'Leaderboard'
    }
  ], [headerButtonHandlers, unreadCount, user?.totalPoints]);

  const HeaderSection = React.memo(() => (
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
            
            {optimizedHeaderButtons.map(button => (
              <HeaderButton
                key={button.key}
                onClick={button.onClick}
                className="relative p-2 text-white hover:bg-white/10 rounded-full transition-colors touch-target"
                title={button.title}
                aria-label={button.title}
              >
                {button.icon}
                {button.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center">
                    {button.badge}
                  </span>
                )}
              </HeaderButton>
            ))}
            
            <HeaderButton
              onClick={headerButtonHandlers.logout}
              className="px-2 py-1 md:px-3 md:py-1 text-xs md:text-sm text-white bg-white/20 hover:bg-white/30 rounded-full transition-colors touch-target"
            >
              Logout
            </HeaderButton>
          </div>
        )}
      </div>
    </header>
  ));

  // CRITICAL FIX 15: Final cleanup
  useEffect(() => {
    mountedRef.current = true;
    
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault();
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      mountedRef.current = false;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      
      requestCache.clear();
      
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      if (wsManager.current) {
        wsManager.current.disconnect();
        wsManager.current = null;
      }
      
      stopPolling();
    };
  }, [stopPolling]);

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
      if (mountedRef.current) {
        setIsAuthenticated(true);
        setUser(userData);
        setLoading(false);
      }
    }} />;
  }
  
  return (
    <ErrorBoundary fallback={<div className="text-red-400 text-center p-4">Something went wrong. Please refresh the page.</div>}>
      <div className="min-h-screen min-h-screen-dynamic bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative no-scroll-x">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 md:w-64 md:h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-32 h-32 md:w-64 md:h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        </div>

        <HeaderSection />

        <NotificationCenter 
          isVisible={showNotifications}
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAsRead={markNotificationsAsRead}
        />

        <FriendSystem 
          isVisible={showFriends}
          friends={friends}
          onClose={() => setShowFriends(false)}
          user={user}
        />

        <AnimatePresence>
          {newAchievements.map((achievement) => (
            <AchievementDisplay
              key={achievement.id}
              achievement={achievement}
              onClose={(id) => setNewAchievements(prev => prev.filter(a => a.id !== id))}
            />
          ))}
        </AnimatePresence>

        <main className="relative z-10 mobile-container py-4 md:py-8">
          <div className="max-w-4xl mx-auto">
            <ErrorBoundary fallback={<div className="text-red-400 text-center p-4">Something went wrong with this step. Please try again.</div>}>
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
                          onClick={debounce(() => {
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
                          }, 2000)} 
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
                      capsuleData={capsuleData || {}}
                      moodData={moodData || {}}
                      onComplete={handleExperienceComplete}
                      onUserChoice={handleUserChoice}
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
                        moodData={moodData || {}}
                        userChoices={userChoices || {}}
                        setUserChoices={setUserChoices}      
                        onComplete={handleCardGenerated}
                        user={user || {}}                          
                        updateUserData={updateUserData}
                        capsuleData={capsuleData || {}}
                        completionStats={completionStats || {}}
                        isActive={true}
                      />
                    ) : (
                      <VibeCardGenerator 
                        moodData={moodData || {}}                  
                        capsuleData={capsuleData || {}}           
                        completionStats={completionStats || {}}   
                        user={user || {}}                         
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

                {currentStep === 'leaderboard' && (
                  <motion.div 
                    key="leaderboard" 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -20 }} 
                    transition={{ duration: 0.5 }}
                  >
                    <EnhancedLeaderboard 
                      user={user}
                      onClose={() => setCurrentStep('mood')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </ErrorBoundary>
          </div>
        </main>

        <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
          {currentStep !== 'mood' && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={resetFlow}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 touch-target"
              title="Start Over"
              aria-label="Start Over"
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
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 touch-target"
              title="Share Your Vibe"
              aria-label="Share Your Vibe"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </motion.button>
          )}
        </div>

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
                    onClick={debounce(() => setCurrentStep('vibe-card'), 1000)}
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
                    className="text-blue-200 hover:text-white transition-colors touch-target"
                    disabled={!cardData}
                    title="Share to Social"
                    aria-label="Share to Social"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                  </button>
                  <button 
                    onClick={debounce(() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'Check out my SparkVibe card!',
                          url: window.location.href
                        });
                      }
                    }, 2000)}
                    className="text-blue-200 hover:text-white transition-colors touch-target"
                    title="Share Link"
                    aria-label="Share Link"
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