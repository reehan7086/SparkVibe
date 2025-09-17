// src/utils/safeUtils.js - Improved error handling and connection stability
// API URL detection function
const getApiUrl = () => {
  // First check environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Fallback: construct from current hostname
  const hostname = window.location.hostname || '';
  if (hostname.includes('app.github.dev') || hostname.includes('gitpod.io')) {
    const baseUrl = hostname.replace('-5173', '-8080');
    return `https://${baseUrl}`;
  }
  
  // Default localhost for development
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
  return localStorage.getItem('sparkvibe_token');
};

export const setAuthToken = (token) => {
  localStorage.setItem('sparkvibe_token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('sparkvibe_token');
  localStorage.removeItem('sparkvibe_user');
};

// Decode JWT to check expiration
const isTokenExpired = (token) => {
  try {
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
  const { retries = 3, timeout } = options;
  const dynamicTimeout = getDynamicTimeout(timeout);

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), dynamicTimeout);

    try {
      const token = getAuthToken();
      if (token && isTokenExpired(token)) {
        removeAuthToken();
        throw new Error('Authentication expired. Please sign in again.');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log(`API GET attempt ${attempt}/${retries} to: ${API_BASE}${endpoint}`);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
        // Add connection options for better reliability
        keepalive: false,
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        removeAuthToken();
        throw new Error('Session expired. Please sign in again.');
      }

      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error;
        } catch {
          errorText = await response.text();
        }
        throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
      }

      const data = await response.json();
      console.log(`API GET success for ${endpoint}`);
      updateConnectionHealth(true);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`API GET attempt ${attempt}/${retries} failed for ${endpoint}:`, error.message);
      updateConnectionHealth(false);

      // Handle specific error types
      if (error.name === 'AbortError') {
        console.warn(`Request timeout after ${dynamicTimeout}ms`);
      }
      
      if (attempt === retries) {
        console.warn(`All ${retries} attempts failed for ${endpoint}, using fallback`);
        return getFallbackData(endpoint);
      }

      // Exponential backoff with jitter
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
  const { retries = 3, timeout, headers: customHeaders = {} } = options;
  const dynamicTimeout = getDynamicTimeout(timeout || 15000);

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), dynamicTimeout);

    try {
      const token = getAuthToken();
      if (token && isTokenExpired(token)) {
        removeAuthToken();
        throw new Error('Authentication expired. Please sign in again.');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...customHeaders,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log(`API POST attempt ${attempt}/${retries} to: ${API_BASE}${endpoint}`);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
        keepalive: false,
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        removeAuthToken();
        throw new Error('Session expired. Please sign in again.');
      }

      if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
        } catch {
          errorMessage = await response.text() || `HTTP ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log(`API POST success for ${endpoint}`);
      updateConnectionHealth(true);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`API POST attempt ${attempt}/${retries} failed for ${endpoint}:`, error.message);
      updateConnectionHealth(false);

      if (error.name === 'AbortError') {
        console.warn(`Request timeout after ${dynamicTimeout}ms`);
      }
      
      if (attempt === retries) {
        console.warn(`All ${retries} attempts failed for ${endpoint}, using fallback`);
        return getPostFallbackData(endpoint, data);
      }

      // Exponential backoff with jitter
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
          cardsShared: 0,
        },
        preferences: storedUser.preferences || { 
          adventureTypes: ['general'], 
          difficulty: 'easy' 
        },
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
          level: 3,
        },
        {
          username: 'Vibe Explorer',
          avatar: '🌟',
          score: 1890,
          rank: 2,
          streak: 8,
          cardsShared: 8,
          cardsGenerated: 15,
          level: 2,
        },
        {
          username: 'Mood Master',
          avatar: '🎨',
          score: 1456,
          rank: 3,
          streak: 6,
          cardsShared: 6,
          cardsGenerated: 12,
          level: 2,
        },
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
          estimatedTime: '5 minutes',
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
          estimatedTime: '10 minutes',
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
          estimatedTime: '15 minutes',
        },
      ],
      viralAdventure: {
        title: 'Random Act of Kindness',
        description: 'Brighten someone\'s day with an unexpected gesture',
        completions: 256,
        shares: 92,
        viralPotential: 0.92,
        category: 'Social',
        template: 'retro',
      },
      metadata: {
        totalAdventures: 3,
        generatedAt: new Date().toISOString(),
        fallback: true,
      }
    };
  }

  throw new Error(`No fallback data available for GET ${endpoint}`);
};

// Fallback data for POST endpoints
const getPostFallbackData = (endpoint, data) => {
  console.log(`Returning fallback data for POST ${endpoint}`);

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
        cardsShared: 0,
      },
      preferences: {
        adventureTypes: ['general'],
        difficulty: 'easy',
      },
    };
    const mockToken = `demo_google_token_${Date.now()}`;
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
        cardsShared: 0,
      },
      preferences: {
        adventureTypes: ['general'],
        difficulty: 'easy',
      },
    };
    const mockToken = `demo_email_token_${Date.now()}`;
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
        cardsShared: 0,
      },
      preferences: {
        adventureTypes: ['general'],
        difficulty: 'easy',
      },
    };
    const mockToken = `demo_signup_token_${Date.now()}`;
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

    // Simple keyword-based mood analysis
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

  if (endpoint === '/adventure/complete') {
    const points = Math.floor(Math.random() * 50) + 25;
    return {
      success: true,
      message: 'Adventure completed successfully (demo mode)!',
      vibePointsEarned: points,
      completion: {
        id: `demo_completion_${Date.now()}`,
        points,
        completedAt: new Date().toISOString(),
      },
      fallback: true
    };
  }

  // Data persistence endpoints
  if (endpoint.includes('/user/save-')) {
    const dataType = endpoint.split('-')[1];
    const storageKey = `${dataType}_history`;
    const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    history.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem(storageKey, JSON.stringify(history.slice(-20)));
    return { 
      success: true, 
      message: `${dataType} saved locally`,
      fallback: true 
    };
  }

  throw new Error(`No fallback data available for POST ${endpoint}`);
};