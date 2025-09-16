// src/utils/safeUtils.js
const API_BASE = import.meta.env.VITE_API_URL;

if (!API_BASE) {
  console.error('VITE_API_URL is not set in environment variables');
  throw new Error('API configuration missing');
}

// Validate API_BASE is a valid URL
try {
  new URL(API_BASE);
} catch (error) {
  console.error('Invalid VITE_API_URL:', API_BASE);
  throw new Error('Invalid API base URL');
}

console.log('API_BASE configured as:', API_BASE);
console.log('Environment:', import.meta.env.MODE);

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
  const user = JSON.parse(localStorage.getItem('sparkvibe_user') || '{}');
  return !!user.emailVerified;
};

// Demo user generator aligned with server.js schema
const generateDemoUser = () => ({
  id: `demo_${Date.now()}`,
  name: 'Demo User',
  email: `demo_${Date.now()}@sparkvibe.local`,
  emailVerified: true,
  avatar: '🚀',
  stats: {
    totalPoints: Math.floor(Math.random() * 500) + 100,
    level: Math.floor(Math.random() * 3) + 1,
    streak: Math.floor(Math.random() * 10) + 1,
    cardsGenerated: Math.floor(Math.random() * 20) + 1,
    cardsShared: Math.floor(Math.random() * 10) + 1,
  },
  preferences: {
    adventureTypes: ['mindfulness', 'creativity'],
    difficulty: 'medium',
  },
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString(),
});

// Enhanced API GET with retry logic
export const apiGet = async (endpoint, options = {}) => {
  const { retries = 3, timeout = 10000 } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const token = getAuthToken();
      if (token && isTokenExpired(token)) {
        removeAuthToken();
        throw new Error('Authentication expired. Please sign in again.');
      }

      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log(`API GET attempt ${attempt}/${retries} to: ${API_BASE}${endpoint}`);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        removeAuthToken();
        throw new Error('Session expired. Please sign in again.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Request failed'}`);
      }

      const data = await response.json();
      console.log(`API GET success for ${endpoint}:`, data);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`API GET attempt ${attempt}/${retries} failed for ${endpoint}:`, error.message);

      if (attempt === retries) {
        return getFallbackData(endpoint);
      }

      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    } finally {
      controller.signal.aborted || controller.abort();
    }
  }
};

// Enhanced API POST with retry logic
export const apiPost = async (endpoint, data, options = {}) => {
  const { retries = 3, timeout = 15000, headers: customHeaders = {} } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const token = getAuthToken();
      if (token && isTokenExpired(token)) {
        removeAuthToken();
        throw new Error('Authentication expired. Please sign in again.');
      }

      const headers = {
        'Content-Type': 'application/json',
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
      console.log(`API POST success for ${endpoint}:`, result);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`API POST attempt ${attempt}/${retries} failed for ${endpoint}:`, error.message);

      if (attempt === retries) {
        return getPostFallbackData(endpoint, data);
      }

      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    } finally {
      controller.signal.aborted || controller.abort();
    }
  }
};

// Fallback data for GET endpoints
const getFallbackData = (endpoint) => {
  console.log(`Returning fallback data for GET ${endpoint}`);

  if (endpoint === '/health') {
    return { message: 'Backend offline - Demo mode', status: 'offline', timestamp: new Date().toISOString() };
  }

  if (endpoint === '/user/profile') {
    const storedUser = JSON.parse(localStorage.getItem('sparkvibe_user') || '{}');
    return {
      id: storedUser.id || `offline_${Date.now()}`,
      name: storedUser.name || 'Offline User',
      email: storedUser.email || 'offline@sparkvibe.local',
      emailVerified: true,
      avatar: storedUser.avatar || '🚀',
      stats: storedUser.stats || {
        totalPoints: 0,
        level: 1,
        streak: 0,
        cardsGenerated: 0,
        cardsShared: 0,
      },
      preferences: storedUser.preferences || { adventureTypes: ['general'], difficulty: 'easy' },
    };
  }

  if (endpoint === '/leaderboard') {
    return [
      {
        name: 'SparkViber Pro',
        avatar: '🚀',
        stats: { totalPoints: 2340, rank: 1, streak: 15, cardsShared: 12, cardsGenerated: 18, level: 3 },
      },
      {
        name: 'Vibe Explorer',
        avatar: '🌟',
        stats: { totalPoints: 1890, rank: 2, streak: 8, cardsShared: 8, cardsGenerated: 15, level: 2 },
      },
      {
        name: 'Mood Master',
        avatar: '🎨',
        stats: { totalPoints: 1456, rank: 3, streak: 6, cardsShared: 6, cardsGenerated: 12, level: 2 },
      },
      {
        name: 'Daily Adventurer',
        avatar: '⚡',
        stats: { totalPoints: 987, rank: 4, streak: 4, cardsShared: 4, cardsGenerated: 8, level: 1 },
      },
    ];
  }

  if (endpoint === '/trending-adventures') {
    return {
      success: true,
      trending: [
        {
          title: 'Gratitude Morning Pages',
          description: 'Write three things you\'re grateful for to start your day with positivity',
          stats: { completions: 347, shares: 89 },
          viralPotential: 0.85,
          category: 'Mindfulness',
          template: 'cosmic',
          averageRating: 4.7,
          difficulty: 'easy',
          estimatedTime: '5 mins',
        },
        {
          title: 'Urban Photography Walk',
          description: 'Capture the hidden beauty in your neighborhood with fresh eyes',
          stats: { completions: 256, shares: 67 },
          viralPotential: 0.78,
          category: 'Adventure',
          template: 'nature',
          averageRating: 4.5,
          difficulty: 'medium',
          estimatedTime: '15 mins',
        },
        {
          title: 'Random Act of Kindness',
          description: 'Brighten someone\'s day with an unexpected gesture of kindness',
          stats: { completions: 198, shares: 92 },
          viralPotential: 0.92,
          category: 'Social',
          template: 'retro',
          averageRating: 4.9,
          difficulty: 'easy',
          estimatedTime: '10 mins',
        },
        {
          title: 'Mindful Coffee Moment',
          description: 'Transform your coffee break into a meditation on presence and appreciation',
          stats: { completions: 423, shares: 78 },
          viralPotential: 0.73,
          category: 'Morning',
          template: 'minimal',
          averageRating: 4.4,
          difficulty: 'easy',
          estimatedTime: '5 mins',
        },
      ],
      viralAdventure: {
        title: 'Random Act of Kindness',
        description: 'Brighten someone\'s day with an unexpected gesture of kindness',
        stats: { completions: 198, shares: 92 },
        viralPotential: 0.92,
        category: 'Social',
        template: 'retro',
        averageRating: 4.9,
        difficulty: 'easy',
        estimatedTime: '10 mins',
      },
      metadata: {
        totalAdventures: 4,
        totalUsers: 1247,
        totalCompletions: 1224,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  throw new Error(`No fallback data available for GET ${endpoint}`);
};

// Fallback data for POST endpoints
const getPostFallbackData = (endpoint, data) => {
  console.log(`Returning fallback data for POST ${endpoint}`, data);

  if (endpoint === '/auth/google') {
    const user = generateDemoUser();
    const mockToken = `offline_google_token_${Date.now()}`;
    return {
      success: true,
      message: 'Google authentication successful (offline mode)',
      token: mockToken,
      user,
    };
  }

  if (endpoint === '/auth/signup') {
    if (!data.email || !data.password || !data.name) {
      throw new Error('Name, email, and password are required');
    }
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    return {
      success: true,
      message: 'Account created successfully (offline mode). Please sign in.',
      requiresVerification: false,
    };
  }

  if (endpoint === '/auth/signin') {
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }
    const user = generateDemoUser();
    user.email = data.email;
    user.name = data.email.split('@')[0];
    const mockToken = `offline_email_token_${Date.now()}`;
    return {
      success: true,
      message: 'Sign-in successful (offline mode)',
      token: mockToken,
      user,
    };
  }

  if (endpoint === '/auth/resend-verification') {
    if (!data.email) {
      throw new Error('Email is required');
    }
    return {
      success: true,
      message: 'Verification email resent successfully (offline mode)',
    };
  }

  if (endpoint === '/auth/verify-email') {
    if (!data.token) {
      throw new Error('Verification token is required');
    }
    return {
      success: true,
      message: 'Email verified successfully (offline mode)',
    };
  }

  if (endpoint === '/auth/reset-password') {
    if (!data.email) {
      throw new Error('Email is required');
    }
    return {
      success: true,
      message: 'Password reset email sent (offline mode)',
    };
  }

  if (endpoint === '/auth/reset-password/confirm') {
    if (!data.token || !data.password) {
      throw new Error('Token and new password are required');
    }
    return {
      success: true,
      message: 'Password reset successfully (offline mode)',
    };
  }

  if (endpoint === '/user/save-profile') {
    const savedUser = { ...data, savedAt: new Date().toISOString() };
    localStorage.setItem('sparkvibe_user', JSON.stringify(savedUser));
    return {
      success: true,
      message: 'Profile saved locally',
      user: savedUser,
    };
  }

  if (endpoint === '/user/save-mood') {
    const moodHistory = JSON.parse(localStorage.getItem('mood_history') || '[]');
    moodHistory.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem('mood_history', JSON.stringify(moodHistory.slice(-10)));
    return { success: true, message: 'Mood saved locally' };
  }

  if (endpoint === '/user/save-choice') {
    const choiceHistory = JSON.parse(localStorage.getItem('choice_history') || '[]');
    choiceHistory.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem('choice_history', JSON.stringify(choiceHistory.slice(-50)));
    return { success: true, message: 'Choice saved locally' };
  }

  if (endpoint === '/user/save-completion') {
    const completionHistory = JSON.parse(localStorage.getItem('completion_history') || '[]');
    completionHistory.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem('completion_history', JSON.stringify(completionHistory.slice(-20)));
    return { success: true, message: 'Completion saved locally' };
  }

  if (endpoint === '/user/save-card-generation') {
    const cardHistory = JSON.parse(localStorage.getItem('card_history') || '[]');
    cardHistory.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem('card_history', JSON.stringify(cardHistory.slice(-10)));
    return { success: true, message: 'Card generation saved locally' };
  }

  if (endpoint === '/analyze-mood') {
    const text = data.textInput ? data.textInput.toLowerCase() : '';
    let mood, confidence, emotions, recommendations, suggestedTemplate, energyLevel;

    if (safeIncludes(text, 'excited') || safeIncludes(text, 'happy') || safeIncludes(text, 'great')) {
      mood = 'happy';
      confidence = 0.92;
      emotions = ['excited', 'joyful', 'optimistic'];
      recommendations = [
        'Channel your positive energy into a creative project',
        'Share your enthusiasm with someone special',
        'Try a new adventure that matches your high energy',
      ];
      suggestedTemplate = 'cosmic';
      energyLevel = 'high';
    } else if (safeIncludes(text, 'nervous') || safeIncludes(text, 'anxious') || safeIncludes(text, 'worried')) {
      mood = 'anxious';
      confidence = 0.88;
      emotions = ['nervous', 'concerned', 'thoughtful'];
      recommendations = [
        'Practice deep breathing exercises',
        'Break overwhelming tasks into smaller steps',
        'Try a calming mindfulness exercise',
      ];
      suggestedTemplate = 'minimal';
      energyLevel = 'medium';
    } else if (safeIncludes(text, 'tired') || safeIncludes(text, 'exhausted') || safeIncludes(text, 'drained')) {
      mood = 'calm';
      confidence = 0.85;
      emotions = ['tired', 'peaceful', 'relaxed'];
      recommendations = [
        'Focus on gentle, restorative activities',
        'Practice gratitude for small moments',
        'Consider a short nature walk for gentle energy',
      ];
      suggestedTemplate = 'nature';
      energyLevel = 'low';
    } else if (safeIncludes(text, 'sad') || safeIncludes(text, 'down') || safeIncludes(text, 'lonely')) {
      mood = 'reflective';
      confidence = 0.82;
      emotions = ['contemplative', 'introspective', 'sensitive'];
      recommendations = [
        'Connect with someone who cares about you',
        'Express your feelings through journaling or art',
        'Practice self-compassion and gentle self-care',
      ];
      suggestedTemplate = 'retro';
      energyLevel = 'low';
    } else {
      mood = 'curious';
      confidence = 0.65;
      emotions = ['curious', 'open', 'exploratory'];
      recommendations = [
        'Try something new and unexpected today',
        'Explore a topic that sparks your interest',
        'Stay open to surprising opportunities',
      ];
      suggestedTemplate = 'cosmic';
      energyLevel = 'medium';
    }

    return {
      success: true,
      mood,
      confidence,
      emotions,
      recommendations,
      suggestedTemplate,
      energyLevel,
      insights: `Your mood analysis suggests you're feeling ${mood} with ${Math.round(confidence * 100)}% confidence.`,
      analyzedAt: new Date().toISOString(),
      isOffline: true,
    };
  }

  if (endpoint === '/generate-capsule-simple') {
    const mood = data.moodAnalysis?.mood || 'curious';
    let adventure;

    if (mood === 'happy') {
      adventure = {
        title: 'Spread Joy Challenge',
        prompt: 'Send a heartfelt message to three people telling them why they matter to you.',
        estimatedTime: '10 mins',
        difficulty: 'easy',
        category: 'Social',
      };
    } else if (mood === 'anxious') {
      adventure = {
        title: 'Grounding Ritual',
        prompt: 'Practice the 5-4-3-2-1 technique: Notice 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.',
        estimatedTime: '5 mins',
        difficulty: 'easy',
        category: 'Mindfulness',
      };
    } else if (mood === 'calm') {
      adventure = {
        title: 'Gentle Gratitude Walk',
        prompt: 'Take a slow, mindful walk and find three things in nature that bring you peace.',
        estimatedTime: '15 mins',
        difficulty: 'easy',
        category: 'Nature',
      };
    } else {
      adventure = {
        title: 'Creative Discovery Session',
        prompt: 'Set a timer for 10 minutes and create something with whatever materials you have nearby.',
        estimatedTime: '10 mins',
        difficulty: 'easy',
        category: 'Creativity',
      };
    }

    return {
      success: true,
      id: `offline_capsule_${Date.now()}`,
      adventure,
      brainBite: 'Engaging in novel activities creates new neural pathways, enhancing cognitive flexibility.',
      habitNudge: 'Micro-adventures lasting 5-10 minutes can significantly boost mood and productivity.',
      personalizedInsights: [
        `This adventure was tailored to your ${mood} mood`,
        `Optimal timing based on ${data.timeOfDay || 'current'} energy patterns`,
      ],
      isOffline: true,
    };
  }

  if (endpoint === '/generate-vibe-card') {
    const templates = ['cosmic', 'nature', 'retro', 'minimal'];
    const selectedTemplate = data.capsuleData?.moodData?.suggestedTemplate || templates[Math.floor(Math.random() * templates.length)];

    return {
      success: true,
      card: {
        content: {
          adventure: {
            title: data.capsuleData?.adventure?.title || 'Your Mindful Adventure',
            outcome: 'You embraced growth and discovered new possibilities!',
            category: data.capsuleData?.adventure?.category || 'Personal Growth',
          },
          achievement: {
            points: data.completionStats?.vibePointsEarned || 35,
            streak: Math.floor(Math.random() * 15) + 1,
            badge: 'Offline Vibe Trailblazer',
            level: data.user?.stats?.level || 1,
          },
          mood: {
            before: data.moodData?.mood || 'curious',
            after: 'inspired',
            improvement: '+15%',
          },
        },
        design: {
          template: selectedTemplate,
          animations: ['slideIn', 'pulse'],
          colors: {
            primary: selectedTemplate === 'cosmic' ? '#7c3aed' : '#10b981',
            secondary: selectedTemplate === 'cosmic' ? '#ec4899' : '#3b82f6',
          },
        },
        user: {
          name: data.user?.name || 'Vibe Explorer',
          totalPoints: (data.user?.stats?.totalPoints || 100) + (data.completionStats?.vibePointsEarned || 35),
          level: data.user?.stats?.level || 1,
          avatar: data.user?.avatar || '🚀',
        },
        sharing: {
          captions: [
            `Earned ${data.completionStats?.vibePointsEarned || 35} points on my SparkVibe journey (offline mode)! 🌟`,
            'Transforming daily moments with SparkVibe ✨',
          ],
          hashtags: ['#SparkVibe', '#MindfulMoments'],
          qrCode: `https://sparkvibe.app/offline-card/${Date.now()}`,
        },
        viralScore: Math.random() * 0.4 + 0.6,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '2.1-offline',
          isOffline: true,
        },
      },
      cardId: `offline_card_${Date.now()}`,
      message: 'Vibe card generated successfully (offline mode)',
      analytics: {
        expectedEngagement: Math.floor(Math.random() * 50) + 70,
        viralPotential: 'Medium (offline mode)',
      },
      isOffline: true,
    };
  }

  if (endpoint === '/subscribe-push') {
    return {
      success: true,
      message: 'Push subscription saved locally (offline mode)',
    };
  }

  throw new Error(`No fallback data available for POST ${endpoint}`);
};

// Safe string inclusion check
export const safeIncludes = (str, searchString) => {
  if (typeof str !== 'string' || typeof searchString !== 'string') {
    return false;
  }
  return str.toLowerCase().includes(searchString.toLowerCase());
};

// Placeholder for syncOfflineData (endpoint not implemented in server.js)
/*
export const syncOfflineData = async () => {
  const offlineData = {
    userProfile: localStorage.getItem('sparkvibe_user_backup'),
    moodHistory: localStorage.getItem('mood_history'),
    choiceHistory: localStorage.getItem('choice_history'),
    completionHistory: localStorage.getItem('completion_history'),
    cardHistory: localStorage.getItem('card_history'),
  };

  try {
    const result = await apiPost('/sync-offline-data', offlineData);
    console.log('Offline data synced successfully:', result);
    localStorage.removeItem('sparkvibe_user_backup');
    localStorage.removeItem('mood_history');
    localStorage.removeItem('choice_history');
    localStorage.removeItem('completion_history');
    localStorage.removeItem('card_history');
    return result;
  } catch (error) {
    console.warn('Failed to sync offline data:', error);
    throw new Error('Offline data sync failed');
  }
};
*/