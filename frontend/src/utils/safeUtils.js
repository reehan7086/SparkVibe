import axios from 'axios';

// API URL detection function with enhanced fallback handling
const getApiUrl = () => {
  // Production: Use DigitalOcean App Platform URL
  if (import.meta.env.PROD) {
    return 'https://backend-sv-3n4v6.ondigitalocean.app';
  }

  // Environment variable fallback
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Construct from current hostname for development environments
  const hostname = window.location.hostname || '';
  if (hostname.includes('app.github.dev') || hostname.includes('gitpod.io')) {
    const baseUrl = hostname.replace('-5173', '-8080');
    return `https://${baseUrl}`;
  }

  // Default localhost for local development
  return 'http://localhost:8080';
};

const API_BASE = getApiUrl();
console.log('API_BASE configured as:', API_BASE);

// Enhanced connection health tracking
let connectionHealth = {
  isHealthy: true,
  consecutiveFailures: 0,
  lastSuccessTime: Date.now(),
  backoffMultiplier: 1,
  isOnline: navigator.onLine
};

// Monitor online/offline status
window.addEventListener('online', () => {
  connectionHealth.isOnline = true;
  console.log('Network connection restored');
});

window.addEventListener('offline', () => {
  connectionHealth.isOnline = false;
  console.log('Network connection lost');
});

// Token management utilities
export const getAuthToken = () => {
  return localStorage.getItem('sparkvibe_token') || '';
};

export const setAuthToken = (token) => {
  if (typeof token === 'string' && token) {
    localStorage.setItem('sparkvibe_token', token);
  }
};

export const removeAuthToken = () => {
  localStorage.removeItem('sparkvibe_token');
  localStorage.removeItem('sparkvibe_user');
};

// Decode JWT to check expiration
const isTokenExpired = (token) => {
  try {
    if (!token) return true;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return true;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token || isTokenExpired(token)) {
    removeAuthToken();
    return false;
  }
  return true;
};

// Update connection health tracking
const updateConnectionHealth = (success) => {
  if (success) {
    connectionHealth.isHealthy = true;
    connectionHealth.consecutiveFailures = 0;
    connectionHealth.lastSuccessTime = Date.now();
    connectionHealth.backoffMultiplier = 1;
  } else {
    connectionHealth.consecutiveFailures++;
    if (connectionHealth.consecutiveFailures >= 1) { // Changed from 2 to 1 for faster fallback
      connectionHealth.isHealthy = false;
      connectionHealth.backoffMultiplier = Math.min(
        connectionHealth.backoffMultiplier * 1.5,
        3 // Reduced from 5 to 3
      );
    }
  }
};

// Get dynamic timeout based on connection health
const getDynamicTimeout = (baseTimeout = 5000) => { // Reduced from 8000 to 5000
  if (!connectionHealth.isHealthy || !connectionHealth.isOnline) {
    return Math.min(baseTimeout * connectionHealth.backoffMultiplier, 8000); // Reduced from 15000
  }
  return baseTimeout;
};

// Enhanced API GET with immediate fallback for critical failures
export const apiGet = async (endpoint, options = {}) => {
  const { retries = 1, timeout, headers = {}, forceFallback = false } = options; // Reduced retries from 2 to 1
  
  // Immediate fallback for offline or forced fallback
  if (!connectionHealth.isOnline || forceFallback) {
    console.log(`Network offline or forced fallback for GET ${endpoint}`);
    return getFallbackData(endpoint);
  }

  const dynamicTimeout = getDynamicTimeout(timeout);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const token = getAuthToken();
      if (token && isTokenExpired(token)) {
        removeAuthToken();
        throw new Error('Authentication expired. Please sign in again.');
      }

      const response = await axios.get(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers
        },
        timeout: dynamicTimeout
      });

      console.log(`API GET success for ${endpoint}`);
      updateConnectionHealth(true);
      return response.data;
      
    } catch (error) {
      console.error(`API GET attempt ${attempt}/${retries} failed for ${endpoint}:`, error.message);
      updateConnectionHealth(false);

      // IMMEDIATE fallback for ANY error to prevent loading loops
      console.log(`Using fallback immediately due to ${error.response?.status || error.code || 'unknown error'}`);
      return getFallbackData(endpoint);
    }
  }
};

// Enhanced API POST with immediate fallback for critical failures
export const apiPost = async (endpoint, data, options = {}) => {
  const { retries = 1, timeout, headers = {}, forceFallback = false } = options; // Reduced retries from 2 to 1
  
  // Immediate fallback for offline or forced fallback
  if (!connectionHealth.isOnline || forceFallback) {
    console.log(`Network offline or forced fallback for POST ${endpoint}`);
    return getPostFallbackData(endpoint, data);
  }

  const dynamicTimeout = getDynamicTimeout(timeout || 5000); // Reduced from 10000

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const token = getAuthToken();
      if (token && isTokenExpired(token)) {
        removeAuthToken();
        throw new Error('Authentication expired. Please sign in again.');
      }

      const response = await axios.post(`${API_BASE}${endpoint}`, data, {
        headers: {
          'Content-Type': headers['Content-Type'] || 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers
        },
        timeout: dynamicTimeout,
        onUploadProgress: options.onUploadProgress
      });

      console.log(`API POST success for ${endpoint}`);
      updateConnectionHealth(true);
      return response.data;
      
    } catch (error) {
      console.error(`API POST attempt ${attempt}/${retries} failed for ${endpoint}:`, error.message);
      updateConnectionHealth(false);

      // IMMEDIATE fallback for ANY error to prevent loading loops
      console.log(`Using fallback immediately due to ${error.response?.status || error.code || 'unknown error'}`);
      return getPostFallbackData(endpoint, data);
    }
  }
};

// Additional HTTP methods with enhanced fallback
export const apiPut = async (endpoint, data, options = {}) => {
  const { retries = 1, timeout, headers = {} } = options;
  
  if (!connectionHealth.isOnline) {
    return getPostFallbackData(endpoint, data);
  }

  const dynamicTimeout = getDynamicTimeout(timeout || 5000);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const token = getAuthToken();
      if (token && isTokenExpired(token)) {
        removeAuthToken();
        throw new Error('Authentication expired. Please sign in again.');
      }

      const response = await axios.put(`${API_BASE}${endpoint}`, data, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers
        },
        timeout: dynamicTimeout
      });

      console.log(`API PUT success for ${endpoint}`);
      updateConnectionHealth(true);
      return response.data;
      
    } catch (error) {
      console.error(`API PUT attempt ${attempt}/${retries} failed for ${endpoint}:`, error.message);
      updateConnectionHealth(false);
      return getPostFallbackData(endpoint, data);
    }
  }
};

export const apiDelete = async (endpoint, options = {}) => {
  const { retries = 1, timeout, headers = {} } = options;
  
  if (!connectionHealth.isOnline) {
    return getFallbackData(endpoint);
  }

  const dynamicTimeout = getDynamicTimeout(timeout || 5000);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const token = getAuthToken();
      if (token && isTokenExpired(token)) {
        removeAuthToken();
        throw new Error('Authentication expired. Please sign in again.');
      }

      const response = await axios.delete(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers
        },
        timeout: dynamicTimeout
      });

      console.log(`API DELETE success for ${endpoint}`);
      updateConnectionHealth(true);
      return response.data;
      
    } catch (error) {
      console.error(`API DELETE attempt ${attempt}/${retries} failed for ${endpoint}:`, error.message);
      updateConnectionHealth(false);
      return getFallbackData(endpoint);
    }
  }
};

// Get connection health status
export const getConnectionHealth = () => {
  return {
    ...connectionHealth,
    timeSinceLastSuccess: Date.now() - connectionHealth.lastSuccessTime
  };
};

// Safe utility functions
export const safeIncludes = (str, searchString) => {
  if (typeof str !== 'string' || typeof searchString !== 'string') {
    return false;
  }
  return str.toLowerCase().includes(searchString.toLowerCase());
};

export const safeMap = (array, callback) => {
  if (!Array.isArray(array)) return [];
  return array.map(callback);
};

export const safeFilter = (array, callback) => {
  if (!Array.isArray(array)) return [];
  return array.filter(callback);
};

export const safeFind = (array, callback) => {
  if (!Array.isArray(array)) return undefined;
  return array.find(callback);
};

// Enhanced fallback data for GET endpoints
const getFallbackData = (endpoint) => {
  console.log(`Returning enhanced fallback data for GET ${endpoint}`);

  if (endpoint === '/health') {
    return {
      message: 'Running in demo mode - Backend temporarily unavailable',
      status: 'demo',
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }

  if (endpoint === '/user/profile') {
    const storedUser = JSON.parse(localStorage.getItem('sparkvibe_user') || '{}');
    return {
      success: true,
      user: {
        id: storedUser.id || `demo_${Date.now()}`,
        name: storedUser.name || 'Demo Explorer',
        email: storedUser.email || 'demo@sparkvibe.local',
        emailVerified: true,
        avatar: storedUser.avatar || '🚀',
        totalPoints: storedUser.totalPoints || 0,
        level: storedUser.level || 1,
        streak: storedUser.streak || 0,
        cardsGenerated: storedUser.cardsGenerated || 0,
        cardsShared: storedUser.cardsShared || 0,
        stats: {
          totalPoints: storedUser.totalPoints || 0,
          level: storedUser.level || 1,
          streak: storedUser.streak || 0,
          cardsGenerated: storedUser.cardsGenerated || 0,
          cardsShared: storedUser.cardsShared || 0,
          lastActiveDate: new Date().toISOString(),
          bestStreak: storedUser.stats?.bestStreak || 0,
          adventuresCompleted: storedUser.stats?.adventuresCompleted || 0,
          moodHistory: storedUser.stats?.moodHistory || [],
          choices: storedUser.stats?.choices || []
        },
        preferences: storedUser.preferences || {
          adventureTypes: ['general'],
          difficulty: 'easy'
        }
      },
      fallback: true
    };
  }

  if (endpoint === '/leaderboard') {
    const currentUser = JSON.parse(localStorage.getItem('sparkvibe_user') || '{}');
    const demoUsers = [
      {
        username: 'SparkVibe Pioneer',
        avatar: '🚀',
        score: 2340,
        rank: 1,
        streak: 15,
        cardsShared: 12,
        cardsGenerated: 18,
        level: 24
      },
      {
        username: 'Vibe Explorer',
        avatar: '🌟',
        score: 1890,
        rank: 2,
        streak: 8,
        cardsShared: 8,
        cardsGenerated: 15,
        level: 19
      },
      {
        username: 'Mood Master',
        avatar: '🎨',
        score: 1456,
        rank: 3,
        streak: 6,
        cardsShared: 6,
        cardsGenerated: 12,
        level: 15
      }
    ];

    // Add current user to leaderboard if they have points
    if (currentUser.totalPoints > 0) {
      demoUsers.push({
        username: currentUser.name || 'You',
        avatar: currentUser.avatar || '👤',
        score: currentUser.totalPoints,
        rank: 4,
        streak: currentUser.streak || 0,
        cardsShared: currentUser.cardsShared || 0,
        cardsGenerated: currentUser.cardsGenerated || 0,
        level: currentUser.level || 1,
        isCurrentUser: true
      });
    }

    return {
      success: true,
      data: demoUsers,
      fallback: true
    };
  }

  if (endpoint === '/notifications') {
    return {
      success: true,
      data: [],
      unreadCount: 0,
      fallback: true
    };
  }

  if (endpoint === '/friends') {
    return {
      success: true,
      data: [],
      fallback: true
    };
  }

  if (endpoint === '/challenges') {
    return {
      success: true,
      challenges: [],
      data: [],
      fallback: true
    };
  }

  return {
    error: 'No fallback available',
    fallback: true
  };
};

// Enhanced fallback data for POST endpoints
const getPostFallbackData = (endpoint, data) => {
  console.log(`Returning enhanced fallback data for POST ${endpoint}`);

  if (endpoint === '/user/sync-stats') {
    console.log('Demo mode: User stats sync simulated for:', data.userId, 'Points:', data.totalPoints);
    return {
      success: true,
      message: 'User stats synced successfully (demo mode)',
      stats: data.stats,
      synced: {
        totalPoints: data.totalPoints || 0,
        level: data.level || 1,
        streak: data.streak || 0,
        cardsGenerated: data.cardsGenerated || 0,
        cardsShared: data.cardsShared || 0
      },
      fallback: true
    };
  }

  if (endpoint === '/auth/google') {
    const user = {
      id: `google_demo_${Date.now()}`,
      name: data.userData?.name || 'Google Demo User',
      email: data.userData?.email || 'demo@gmail.com',
      avatar: data.userData?.picture || '👤',
      emailVerified: true,
      provider: 'google_demo',
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
        lastActiveDate: new Date().toISOString(),
        bestStreak: 0,
        adventuresCompleted: 0,
        moodHistory: [],
        choices: []
      },
      preferences: {
        adventureTypes: ['general'],
        difficulty: 'easy'
      }
    };
    const mockToken = `demo_google_token_${Date.now()}`;
    setAuthToken(mockToken);
    localStorage.setItem('sparkvibe_user', JSON.stringify(user));
    return {
      success: true,
      message: 'Google authentication successful (demo mode)',
      token: mockToken,
      data: { token: mockToken, user },
      user,
      fallback: true
    };
  }

  if (endpoint === '/auth/signin') {
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }
    const user = {
      id: `email_demo_${Date.now()}`,
      name: data.email.split('@')[0],
      email: data.email,
      avatar: '📧',
      emailVerified: true,
      provider: 'email_demo',
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
        lastActiveDate: new Date().toISOString(),
        bestStreak: 0,
        adventuresCompleted: 0,
        moodHistory: [],
        choices: []
      },
      preferences: {
        adventureTypes: ['general'],
        difficulty: 'easy'
      }
    };
    const mockToken = `demo_email_token_${Date.now()}`;
    setAuthToken(mockToken);
    localStorage.setItem('sparkvibe_user', JSON.stringify(user));
    return {
      success: true,
      message: 'Sign-in successful (demo mode)',
      token: mockToken,
      data: { token: mockToken, user },
      user,
      fallback: true
    };
  }

  if (endpoint === '/auth/signup') {
    if (!data.email || !data.password || !data.name) {
      throw new Error('Name, email, and password are required');
    }
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    const user = {
      id: `signup_demo_${Date.now()}`,
      name: data.name,
      email: data.email,
      avatar: '✨',
      emailVerified: true,
      provider: 'email_demo',
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
        lastActiveDate: new Date().toISOString(),
        bestStreak: 0,
        adventuresCompleted: 0,
        moodHistory: [],
        choices: []
      },
      preferences: {
        adventureTypes: ['general'],
        difficulty: 'easy'
      }
    };
    const mockToken = `demo_signup_token_${Date.now()}`;
    setAuthToken(mockToken);
    localStorage.setItem('sparkvibe_user', JSON.stringify(user));
    return {
      success: true,
      message: 'Account created successfully (demo mode)',
      token: mockToken,
      data: { token: mockToken, user },
      user,
      fallback: true
    };
  }

  if (endpoint === '/analyze-mood') {
    const text = data.textInput ? data.textInput.toLowerCase() : '';
    let mood, confidence, emotions, recommendations, suggestedTemplate, energyLevel, socialMood;

    if (safeIncludes(text, 'excited') || safeIncludes(text, 'happy') || safeIncludes(text, 'great') || safeIncludes(text, 'amazing')) {
      mood = 'happy';
      confidence = 0.92;
      emotions = ['excited', 'joyful', 'optimistic'];
      recommendations = [
        'Channel your positive energy into a creative project',
        'Share your enthusiasm with someone special',
        'Try a high-energy adventure'
      ];
      suggestedTemplate = 'cosmic';
      energyLevel = 'high';
      socialMood = 'outgoing';
    } else if (safeIncludes(text, 'nervous') || safeIncludes(text, 'anxious') || safeIncludes(text, 'worried') || safeIncludes(text, 'stress')) {
      mood = 'anxious';
      confidence = 0.88;
      emotions = ['nervous', 'concerned', 'thoughtful'];
      recommendations = [
        'Practice deep breathing exercises',
        'Break tasks into smaller, manageable steps',
        'Try a calming mindfulness exercise'
      ];
      suggestedTemplate = 'minimal';
      energyLevel = 'medium-low';
      socialMood = 'introspective';
    } else if (safeIncludes(text, 'tired') || safeIncludes(text, 'exhausted') || safeIncludes(text, 'calm') || safeIncludes(text, 'peaceful')) {
      mood = 'calm';
      confidence = 0.85;
      emotions = ['tired', 'peaceful', 'relaxed'];
      recommendations = [
        'Focus on gentle, restorative activities',
        'Practice gratitude for small moments',
        'Try a short nature walk'
      ];
      suggestedTemplate = 'nature';
      energyLevel = 'low';
      socialMood = 'quiet';
    } else if (safeIncludes(text, 'sad') || safeIncludes(text, 'down') || safeIncludes(text, 'blue') || safeIncludes(text, 'lonely')) {
      mood = 'sad';
      confidence = 0.80;
      emotions = ['melancholy', 'reflective', 'gentle'];
      recommendations = [
        'Reach out to a friend or loved one',
        'Practice self-compassion and kindness',
        'Engage in a comforting activity'
      ];
      suggestedTemplate = 'minimal';
      energyLevel = 'low';
      socialMood = 'seeking connection';
    } else {
      mood = 'curious';
      confidence = 0.65;
      emotions = ['curious', 'open', 'exploratory'];
      recommendations = [
        'Try something new and unexpected today',
        'Explore a topic that sparks your interest',
        'Stay open to surprising opportunities'
      ];
      suggestedTemplate = 'cosmic';
      energyLevel = 'medium';
      socialMood = 'balanced';
    }

    return {
      success: true,
      mood,
      confidence,
      emotions,
      recommendations,
      suggestedTemplate,
      energyLevel,
      socialMood,
      analyzedAt: new Date().toISOString(),
      primaryMood: mood,
      suggestedActivities: recommendations.slice(0, 2),
      fallback: true
    };
  }

  if (endpoint === '/generate-capsule-simple' || endpoint === '/generate-capsule') {
    const mood = data.mood || data.moodData?.mood || 'curious';
    const interests = data.interests || ['general'];
    const timeOfDay = data.timeOfDay || 'afternoon';

    let adventure;
    if (mood === 'happy') {
      adventure = {
        title: '✨ Spread Joy Challenge',
        prompt: 'Send a heartfelt message to three people telling them why they matter to you.',
        difficulty: 'easy',
        estimatedTime: '10 minutes',
        category: 'Social'
      };
    } else if (mood === 'anxious') {
      adventure = {
        title: '🧘 Grounding Ritual',
        prompt: 'Practice the 5-4-3-2-1 technique: Notice 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.',
        difficulty: 'easy',
        estimatedTime: '5 minutes',
        category: 'Mindfulness'
      };
    } else if (mood === 'calm') {
      adventure = {
        title: '🌿 Gentle Gratitude Walk',
        prompt: 'Take a slow, mindful walk and find three things in nature that bring you peace.',
        difficulty: 'easy',
        estimatedTime: '15 minutes',
        category: 'Nature'
      };
    } else if (mood === 'sad') {
      adventure = {
        title: '💙 Self-Care Moment',
        prompt: 'Create a cozy space and do one thing that brings you comfort - make tea, listen to music, or call someone you trust.',
        difficulty: 'easy',
        estimatedTime: '15 minutes',
        category: 'Self-Care'
      };
    } else {
      adventure = {
        title: '🎨 Creative Discovery',
        prompt: 'Set a timer for 10 minutes and create something with whatever materials you have nearby.',
        difficulty: 'easy',
        estimatedTime: '10 minutes',
        category: 'Creativity'
      };
    }

    return {
      success: true,
      capsule: `Good ${timeOfDay}! Your ${mood} energy is perfect for growth today.`,
      adventure,
      moodBoost: `Your ${mood} mood is a superpower - use it to create positive change!`,
      brainBite: {
        question: 'Did you know?',
        answer: 'Engaging in novel activities creates new neural pathways, enhancing cognitive flexibility and creativity.'
      },
      habitNudge: `Build on today's ${mood} energy by making this a daily practice!`,
      viralPotential: 0.7,
      id: `demo_capsule_${Date.now()}`,
      fallback: true
    };
  }

  if (endpoint === '/generate-vibe-card') {
    const templateNames = ['cosmic', 'nature', 'retro', 'minimal'];
    const randomTemplate = templateNames[Math.floor(Math.random() * templateNames.length)];

    return {
      success: true,
      card: {
        id: `demo_vibe_card_${Date.now()}`,
        content: {
          adventure: {
            title: data.capsuleData?.adventure?.title || 'Your Adventure Awaits',
            outcome: 'You embraced creativity and discovered new possibilities!',
            category: data.capsuleData?.adventure?.category || 'Personal Growth'
          },
          achievement: {
            points: data.completionStats?.vibePointsEarned || 50,
            streak: Math.floor(Math.random() * 10) + 1,
            badge: 'Creative Explorer',
            level: data.user?.level || 1
          },
          mood: {
            before: data.moodData?.mood || 'curious',
            after: 'Accomplished',
            boost: '+15%'
          }
        },
        design: {
          template: randomTemplate,
          colors: getTemplateColors(randomTemplate),
          style: 'modern',
          animations: ['slideIn', 'pulse', 'sparkle']
        },
        user: {
          name: data.user?.name || 'Explorer',
          level: data.user?.level || 1,
          totalPoints: data.user?.totalPoints || 0,
          avatar: data.user?.avatar || '🌟'
        },
        sharing: {
          captions: [
            'Just completed an amazing SparkVibe adventure!',
            'Level up your mindset with SparkVibe!',
            'Daily dose of inspiration unlocked!'
          ],
          hashtags: ['#SparkVibe', '#Adventure', '#Growth', '#Inspiration'],
          qrCode: 'https://sparkvibe.app',
          socialLinks: {
            twitter: 'https://twitter.com/intent/tweet?text=Just%20completed%20a%20SparkVibe%20adventure!',
            instagram: 'https://www.instagram.com/create/story/',
            facebook: 'https://www.facebook.com/sharer/sharer.php?u=https://sparkvibe.app'
          }
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          fallback: true,
          version: '2.1.0'
        },
        isDemo: true
      },
      message: 'Vibe card generated successfully (demo mode)!',
      fallback: true
    };
  }

  if (endpoint === '/generate-enhanced-vibe-card') {
    const { moodData, userChoices, user } = data;
    const completedPhases = Object.keys(userChoices || {}).length;
    const totalPoints = 25 + (completedPhases * 15);

    return {
      success: true,
      card: {
        id: `demo_enhanced_${Date.now()}`,
        type: 'enhanced',
        version: '2.0',
        content: {
          title: 'Your Creative Journey',
          subtitle: 'Multi-Phase Adventure Complete',
          adventure: {
            choice: userChoices?.adventure?.title || 'Creative Expression',
            outcome: 'Unleashed your creative potential',
            impact: 'Discovered new forms of self-expression',
            visual: '🎨'
          },
          reflection: {
            choice: userChoices?.reflection?.title || 'Personal Growth',
            insight: 'Every challenge is a stepping stone to strength',
            wisdom: 'Resilience grows through embracing discomfort',
            mantra: 'I am becoming stronger every day'
          },
          action: {
            choice: userChoices?.action?.title || 'Daily Practice',
            commitment: 'Dedicate 10 minutes daily to growth',
            strategy: 'Small consistent steps create transformation',
            timeline: 'Starting today, building for 30 days'
          },
          achievement: {
            totalPoints: totalPoints,
            phasesCompleted: completedPhases,
            badge: completedPhases >= 3 ? 'Journey Master' : 'Path Walker',
            level: Math.floor(((user?.totalPoints || 0) + totalPoints) / 100) + 1,
            streak: Math.floor(Math.random() * 10) + 1
          },
          moodJourney: {
            before: moodData?.mood || 'curious',
            after: 'inspired',
            transformation: 'Elevated through mindful action',
            energyBoost: `+${Math.floor(Math.random() * 25) + 15}%`
          }
        },
        design: {
          template: 'cosmic',
          theme: 'inspiring',
          colors: { primary: '#ff6b9d', secondary: '#ffd93d', accent: '#6bcf7f' },
          animations: ['morphGradient', 'particleField', 'pulseGlow'],
          layout: 'multi-phase'
        },
        user: {
          name: user?.name || 'Vibe Explorer',
          avatar: user?.avatar || '🌟',
          level: Math.floor(((user?.totalPoints || 0) + totalPoints) / 100) + 1,
          totalPoints: (user?.totalPoints || 0) + totalPoints
        },
        sharing: {
          title: `Enhanced Vibe Journey Complete!`,
          description: `Completed a 3-phase adventure and earned ${totalPoints} points!`,
          captions: [
            `🚀 Just completed my Enhanced Vibe Journey and earned ${totalPoints} points!`,
            `✨ Unleashed my creative potential #SparkVibeJourney`,
            `🌟 Three phases, infinite possibilities. I am becoming stronger every day.`,
            `⚡ Dedicate 10 minutes daily to growth. Starting today!`
          ],
          hashtags: ['#SparkVibe', '#EnhancedJourney', '#MindfulAdventure', '#PersonalGrowth'],
          shareUrl: 'https://sparkvibe.app/share/demo',
          socialLinks: {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just completed my Enhanced Vibe Journey and earned ${totalPoints} points!`)}&url=https://sparkvibe.app/share/demo`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=https://sparkvibe.app/share/demo`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(`Completed a 3-phase adventure and earned ${totalPoints} points! https://sparkvibe.app/share/demo`)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=https://sparkvibe.app/share/demo`
          }
        },
        analytics: {
          viralScore: Math.random() * 0.3 + 0.7,
          engagementPotential: Math.random() * 0.3 + 0.7,
          uniqueness: Math.random() * 0.3 + 0.7
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          type: 'enhanced-multi-phase',
          fallback: true,
          phases: completedPhases,
          processingTime: '2.1s'
        }
      },
      message: '🎨 Enhanced vibe card generated (demo mode)',
      pointsEarned: totalPoints,
      fallback: true
    };
  }

  if (endpoint === '/adventure/complete') {
    const points = Math.floor(Math.random() * 50) + 25;
    return {
      success: true,
      message: 'Adventure completed successfully (demo mode)!',
      vibePointsEarned: points,
      completion: {
        id: `demo_completion_${Date.now()}`,
        points,
        completedAt: new Date().toISOString()
      },
      fallback: true
    };
  }

  if (endpoint === '/track-event') {
    console.log('Demo mode: Event tracked -', data.eventType, data.metadata);
    return {
      success: true,
      message: 'Event tracked (demo mode)',
      fallback: true
    };
  }

  if (endpoint === '/notifications/read') {
    return {
      success: true,
      message: 'Notifications marked as read (demo mode)',
      fallback: true
    };
  }

  return {
    error: 'No fallback available for this endpoint',
    fallback: true
  };
};

// Utility function for template colors
function getTemplateColors(template) {
  const colorSchemes = {
    cosmic: ['#533483', '#7209b7', '#a663cc', '#4cc9f0'],
    nature: ['#60a531', '#7cb342', '#8bc34a', '#9ccc65'],
    retro: ['#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b'],
    minimal: ['#495057', '#6c757d', '#adb5bd', '#ced4da']
  };
  return colorSchemes[template] || colorSchemes.cosmic;
}

// AGGRESSIVE fallback functions that NEVER fail
export const apiGetWithFallback = async (endpoint) => {
  console.log(`apiGetWithFallback called for ${endpoint}`);
  try {
    const result = await apiGet(endpoint);
    console.log(`apiGetWithFallback success for ${endpoint}:`, result);
    return result;
  } catch (error) {
    console.warn(`apiGetWithFallback failed for ${endpoint}, using fallback:`, error.message);
    const fallbackResult = getFallbackData(endpoint);
    console.log(`apiGetWithFallback fallback result:`, fallbackResult);
    return fallbackResult;
  }
};

export const apiPostWithFallback = async (endpoint, data = {}) => {
  console.log(`apiPostWithFallback called for ${endpoint} with data:`, data);
  
  // IMMEDIATE fallback for enhanced vibe card since we know it doesn't exist
  if (endpoint === '/generate-enhanced-vibe-card') {
    console.log('Immediate fallback for enhanced vibe card');
    return getPostFallbackData(endpoint, data);
  }
  
  // Try multiple endpoints since backend might have different routes
  const endpoints = [
    endpoint,
    endpoint.replace('enhanced-', ''),
    '/generate-vibe-card',
    '/vibe-card/create',
    '/cards/generate'
  ];
  
  for (const tryEndpoint of endpoints) {
    try {
      console.log(`Trying endpoint: ${tryEndpoint}`);
      const response = await apiPost(tryEndpoint, data);
      if (response && (response.success || response.card || response.data)) {
        console.log(`Success with endpoint: ${tryEndpoint}`, response);
        return response;
      }
    } catch (error) {
      console.warn(`Endpoint ${tryEndpoint} failed:`, error.message);
      continue;
    }
  }
  
  // All endpoints failed, use fallback
  console.log('All backend endpoints unavailable, using fallback');
  const fallbackResult = getPostFallbackData(endpoint, data);
  console.log(`apiPostWithFallback fallback result:`, fallbackResult);
  return fallbackResult;
};