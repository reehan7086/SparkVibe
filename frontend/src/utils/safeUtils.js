import axios from 'axios';

// API URL detection function
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

// Connection health tracking
let connectionHealth = {
  isHealthy: true,
  consecutiveFailures: 0,
  lastSuccessTime: Date.now(),
  backoffMultiplier: 1
};

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
    if (connectionHealth.consecutiveFailures >= 3) {
      connectionHealth.isHealthy = false;
      connectionHealth.backoffMultiplier = Math.min(
        connectionHealth.backoffMultiplier * 1.5,
        10
      );
    }
  }
};

// Get dynamic timeout based on connection health
const getDynamicTimeout = (baseTimeout = 10000) => {
  if (!connectionHealth.isHealthy) {
    return Math.min(baseTimeout * connectionHealth.backoffMultiplier, 30000);
  }
  return baseTimeout;
};

// Enhanced API GET with improved connection handling
export const apiGet = async (endpoint, options = {}) => {
  const { retries = 3, timeout, headers = {} } = options;
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

      if (error.code === 'ECONNABORTED') {
        console.warn(`Request timeout after ${dynamicTimeout}ms`);
      }

      if (attempt === retries) {
        console.warn(`All ${retries} attempts failed for ${endpoint}, using fallback`);
        return getFallbackData(endpoint);
      }

      const baseDelay = attempt * 1000 * connectionHealth.backoffMultiplier;
      const jitter = Math.random() * 500;
      const delay = baseDelay + jitter;
      console.log(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Enhanced API POST with improved connection handling
export const apiPost = async (endpoint, data, options = {}) => {
  const { retries = 3, timeout, headers = {} } = options;
  const dynamicTimeout = getDynamicTimeout(timeout || 15000);

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

      if (error.code === 'ECONNABORTED') {
        console.warn(`Request timeout after ${dynamicTimeout}ms`);
      }

      if (attempt === retries) {
        console.warn(`All ${retries} attempts failed for ${endpoint}, using fallback`);
        return getPostFallbackData(endpoint, data);
      }

      const baseDelay = attempt * 1000 * connectionHealth.backoffMultiplier;
      const jitter = Math.random() * 500;
      const delay = baseDelay + jitter;
      console.log(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Additional HTTP methods
export const apiPut = async (endpoint, data, options = {}) => {
  const { retries = 3, timeout, headers = {} } = options;
  const dynamicTimeout = getDynamicTimeout(timeout || 15000);

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

      if (error.code === 'ECONNABORTED') {
        console.warn(`Request timeout after ${dynamicTimeout}ms`);
      }

      if (attempt === retries) {
        console.warn(`All ${retries} attempts failed for ${endpoint}, using fallback`);
        return getPostFallbackData(endpoint, data);
      }

      const baseDelay = attempt * 1000 * connectionHealth.backoffMultiplier;
      const jitter = Math.random() * 500;
      const delay = baseDelay + jitter;
      console.log(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const apiDelete = async (endpoint, options = {}) => {
  const { retries = 3, timeout, headers = {} } = options;
  const dynamicTimeout = getDynamicTimeout(timeout || 15000);

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

      if (error.code === 'ECONNABORTED') {
        console.warn(`Request timeout after ${dynamicTimeout}ms`);
      }

      if (attempt === retries) {
        console.warn(`All ${retries} attempts failed for ${endpoint}, using fallback`);
        return getFallbackData(endpoint);
      }

      const baseDelay = attempt * 1000 * connectionHealth.backoffMultiplier;
      const jitter = Math.random() * 500;
      const delay = baseDelay + jitter;
      console.log(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
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

// Safe string inclusion check
export const safeIncludes = (str, searchString) => {
  if (typeof str !== 'string' || typeof searchString !== 'string') {
    return false;
  }
  return str.toLowerCase().includes(searchString.toLowerCase());
};

// Safe utility functions to prevent errors
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

// Fallback data for GET endpoints
const getFallbackData = (endpoint) => {
  console.log(`Returning fallback data for GET ${endpoint}`);

  if (endpoint === '/health') {
    return {
      message: 'Backend offline - Demo mode',
      status: 'offline',
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }

  if (endpoint === '/user/profile') {
    const storedUser = JSON.parse(localStorage.getItem('sparkvibe_user') || '{}');
    return {
      success: true,
      user: {
        id: storedUser.id || `offline_${Date.now()}`,
        name: storedUser.name || 'Demo User',
        email: storedUser.email || 'demo@sparkvibe.local',
        emailVerified: true,
        avatar: storedUser.avatar || '🚀',
        stats: storedUser.stats || {
          totalPoints: 0,
          level: 1,
          streak: 0,
          cardsGenerated: 0,
          cardsShared: 0
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
    return {
      success: true,
      data: [
        {
          username: 'SparkVibe Pioneer',
          avatar: '🚀',
          score: 2340,
          rank: 1,
          streak: 15,
          cardsShared: 12,
          cardsGenerated: 18,
          level: 3
        },
        {
          username: 'Vibe Explorer',
          avatar: '🌟',
          score: 1890,
          rank: 2,
          streak: 8,
          cardsShared: 8,
          cardsGenerated: 15,
          level: 2
        },
        {
          username: 'Mood Master',
          avatar: '🎨',
          score: 1456,
          rank: 3,
          streak: 6,
          cardsShared: 6,
          cardsGenerated: 12,
          level: 2
        }
      ],
      fallback: true
    };
  }

  if (endpoint === '/trending-adventures') {
    return {
      success: true,
      trending: [
        {
          id: 'demo-1',
          title: 'Morning Gratitude Practice',
          description: 'Start your day by writing down three things you\'re grateful for',
          completions: 347,
          shares: 89,
          viralPotential: 0.85,
          category: 'Mindfulness',
          template: 'cosmic',
          averageRating: 4.7,
          difficulty: 'easy',
          estimatedTime: '5 minutes'
        },
        {
          id: 'demo-2',
          title: 'Random Act of Kindness',
          description: 'Brighten someone\'s day with an unexpected gesture',
          completions: 256,
          shares: 92,
          viralPotential: 0.92,
          category: 'Social',
          template: 'retro',
          averageRating: 4.9,
          difficulty: 'easy',
          estimatedTime: '10 minutes'
        },
        {
          id: 'demo-3',
          title: 'Creative Photo Walk',
          description: 'Capture beauty in ordinary moments around you',
          completions: 198,
          shares: 67,
          viralPotential: 0.78,
          category: 'Adventure',
          template: 'nature',
          averageRating: 4.5,
          difficulty: 'medium',
          estimatedTime: '15 minutes'
        }
      ],
      viralAdventure: {
        title: 'Random Act of Kindness',
        description: 'Brighten someone\'s day with an unexpected gesture',
        completions: 256,
        shares: 92,
        viralPotential: 0.92,
        category: 'Social',
        template: 'retro'
      },
      metadata: {
        totalAdventures: 3,
        generatedAt: new Date().toISOString(),
        fallback: true
      }
    };
  }

  if (endpoint.includes('/analytics/dashboard')) {
    return {
      success: true,
      data: {
        overview: {
          totalCards: 10,
          totalPoints: 500,
          level: 5,
          streak: 3,
          cardGrowth: 10,
          streakGrowth: 5,
          shares: 5,
          shareGrowth: 15
        },
        cardActivity: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          data: [2, 3, 1, 4, 2]
        },
        pointHistory: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          data: [100, 150, 50, 200, 100]
        },
        moodDistribution: {
          labels: ['Joy', 'Sadness', 'Anger'],
          data: [40, 30, 20]
        }
      },
      fallback: true
    };
  }

  if (endpoint === '/notifications/subscribe') {
    return {
      success: true,
      message: 'Subscribed to push notifications (demo mode)',
      fallback: true
    };
  }

  return {
    error: 'No fallback available',
    fallback: true
  };
};

// Fallback data for POST endpoints
const getPostFallbackData = (endpoint, data) => {
  console.log(`Returning fallback data for POST ${endpoint}`);

  if (endpoint === '/user/sync-stats') {
    console.log('Demo mode: Points sync simulated for user:', data.userId, 'Points:', data.totalPoints);
    return {
      success: true,
      message: 'User stats synced (demo mode)',
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
      id: `google_${Date.now()}`,
      name: data.userData?.name || 'Google User',
      email: data.userData?.email || 'user@gmail.com',
      avatar: data.userData?.picture || '👤',
      emailVerified: true,
      provider: 'google',
      stats: {
        totalPoints: 0,
        level: 1,
        streak: 0,
        cardsGenerated: 0,
        cardsShared: 0
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
      user,
      fallback: true
    };
  }

  if (endpoint === '/auth/signin') {
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }
    const user = {
      id: `email_${Date.now()}`,
      name: data.email.split('@')[0],
      email: data.email,
      avatar: '📧',
      emailVerified: true,
      provider: 'email',
      stats: {
        totalPoints: 0,
        level: 1,
        streak: 0,
        cardsGenerated: 0,
        cardsShared: 0
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
      id: `signup_${Date.now()}`,
      name: data.name,
      email: data.email,
      avatar: '✨',
      emailVerified: true,
      provider: 'email',
      stats: {
        totalPoints: 0,
        level: 1,
        streak: 0,
        cardsGenerated: 0,
        cardsShared: 0
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
      user,
      fallback: true
    };
  }

  if (endpoint === '/analyze-mood') {
    const text = data.textInput ? data.textInput.toLowerCase() : '';
    let mood, confidence, emotions, recommendations, suggestedTemplate, energyLevel, socialMood;

    if (safeIncludes(text, 'excited') || safeIncludes(text, 'happy') || safeIncludes(text, 'great')) {
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
    } else if (safeIncludes(text, 'nervous') || safeIncludes(text, 'anxious') || safeIncludes(text, 'worried')) {
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
    } else if (safeIncludes(text, 'tired') || safeIncludes(text, 'exhausted')) {
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

  if (endpoint === '/generate-capsule-simple') {
    const mood = data.mood || 'curious';
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
            before: data.capsuleData?.moodData?.mood || 'curious',
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
          totalPoints: data.user?.totalPoints || 1000,
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
    const { moodData, choices, user } = data;
    const completedPhases = Object.keys(choices || {}).length;
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
            choice: choices?.adventure?.title || 'Creative Expression',
            outcome: 'Unleashed your creative potential',
            impact: 'Discovered new forms of self-expression',
            visual: '🎨'
          },
          reflection: {
            choice: choices?.reflection?.title || 'Personal Growth',
            insight: 'Every challenge is a stepping stone to strength',
            wisdom: 'Resilience grows through embracing discomfort',
            mantra: 'I am becoming stronger every day'
          },
          action: {
            choice: choices?.action?.title || 'Daily Practice',
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

  if (endpoint === '/upload-media') {
    return {
      success: true,
      message: 'Media uploaded successfully (demo mode)',
      media: {
        url: 'https://sparkvibe.app/uploads/demo-media.jpg',
        type: data instanceof FormData ? data.get('media')?.type || 'image/jpeg' : 'image/jpeg'
      },
      fallback: true
    };
  }

  if (endpoint === '/notifications/subscribe') {
    return {
      success: true,
      message: 'Subscribed to push notifications (demo mode)',
      fallback: true
    };
  }

  if (endpoint === '/premium/create-checkout') {
    return {
      success: true,
      message: 'Checkout session created (demo mode)',
      checkoutUrl: 'https://sparkvibe.app/demo-checkout',
      fallback: true
    };
  }

  if (endpoint.includes('/user/save-')) {
    const dataType = endpoint.split('-')[1];
    const storageKey = `${dataType}_history`;
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    history.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem(storageKey, JSON.stringify(history.slice(-20)));
    return {
      success: true,
      message: `${dataType} saved locally (demo mode)`,
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

// Enhanced API calls with automatic fallback
export const apiGetWithFallback = async (endpoint) => {
  try {
    return await apiGet(endpoint);
  } catch (error) {
    console.warn(`API call failed for ${endpoint}, using fallback:`, error.message);
    return getFallbackData(endpoint);
  }
};

export const apiPostWithFallback = async (endpoint, data) => {
  try {
    return await apiPost(endpoint, data);
  } catch (error) {
    console.warn(`API call failed for ${endpoint}, using fallback:`, error.message);
    return getPostFallbackData(endpoint, data);
  }
};