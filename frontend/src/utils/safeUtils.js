// src/utils/safeUtils.js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// For debugging
console.log('API_BASE configured as:', API_BASE);
console.log('Environment:', import.meta.env.MODE);

// Token management utilities
export const getAuthToken = () => {
  return localStorage.getItem('sparkvibe_token') || localStorage.getItem('authToken');
};

export const setAuthToken = (token) => {
  localStorage.setItem('sparkvibe_token', token);
  localStorage.setItem('authToken', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('sparkvibe_token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('sparkvibe_user');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  const user = JSON.parse(localStorage.getItem('sparkvibe_user') || '{}');
  return !!token && (user.emailVerified || user.isGuest || user.provider === 'google' || user.provider === 'demo');
};

// Enhanced demo user generator
const generateDemoUser = (provider = 'google') => ({
  id: `${provider}_user_${Date.now()}`,
  name: provider === 'google' ? 'Google User' : 'Email User',
  email: `demo@example.com`,
  provider: provider,
  emailVerified: true,
  isGuest: false,
  avatar: provider === 'google' ? '🚀' : '📧',
  stats: {
    totalPoints: Math.floor(Math.random() * 500) + 100,
    streak: Math.floor(Math.random() * 10) + 1,
    level: Math.floor(Math.random() * 3) + 1,
    cardsGenerated: Math.floor(Math.random() * 20) + 1,
    cardsShared: Math.floor(Math.random() * 10) + 1
  },
  preferences: {
    adventureTypes: ['mindfulness', 'creativity'],
    difficulty: 'medium',
    timeOfDay: ['morning', 'evening']
  },
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString()
});

// Enhanced API GET with retry logic
export const apiGet = async (endpoint, options = {}) => {
  const { retries = 3, timeout = 10000 } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log(`API GET attempt ${attempt}/${retries} to: ${API_BASE}${endpoint}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 401) {
        removeAuthToken();
        throw new Error('Authentication expired. Please sign in again.');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`API GET success for ${endpoint}:`, data);
      return data;
      
    } catch (error) {
      console.error(`API GET attempt ${attempt}/${retries} failed for ${endpoint}:`, error.message);
      
      if (attempt === retries) {
        // Final attempt - return fallback data for specific endpoints
        return getFallbackData(endpoint);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

// Enhanced API POST with retry logic
export const apiPost = async (endpoint, data, options = {}) => {
  const { retries = 3, timeout = 15000 } = options;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log(`API POST attempt ${attempt}/${retries} to: ${API_BASE}${endpoint}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.status === 401) {
        removeAuthToken();
        throw new Error('Authentication expired. Please sign in again.');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`API POST success for ${endpoint}:`, result);
      return result;
      
    } catch (error) {
      console.error(`API POST attempt ${attempt}/${retries} failed for ${endpoint}:`, error.message);
      
      if (attempt === retries) {
        // Final attempt - return fallback data for specific endpoints
        return getPostFallbackData(endpoint, data);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
};

// Fallback data for GET endpoints
const getFallbackData = (endpoint) => {
  console.log(`Returning fallback data for ${endpoint}`);
  
  if (endpoint === '/health') {
    return { message: 'Backend Offline - Demo Mode', status: 'offline', timestamp: new Date().toISOString() };
  }
  
  if (endpoint === '/user/profile') {
    const storedUser = JSON.parse(localStorage.getItem('sparkvibe_user') || '{}');
    return {
      ...storedUser,
      totalPoints: storedUser.totalPoints || 0,
      level: storedUser.level || 1,
      streak: storedUser.streak || 0,
      cardsGenerated: storedUser.cardsGenerated || 0,
      cardsShared: storedUser.cardsShared || 0
    };
  }
  
  if (endpoint === '/leaderboard') {
    return [
      {
        username: "SparkViber Pro",
        avatar: "🚀",
        score: 2340,
        rank: 1,
        streak: 15,
        cardsShared: 12,
        cardsGenerated: 18,
        level: 3,
        achievements: ['Early Adopter', 'Streak Master']
      },
      {
        username: "Vibe Explorer", 
        avatar: "🌟",
        score: 1890,
        rank: 2,
        streak: 8,
        cardsShared: 8,
        cardsGenerated: 15,
        level: 2,
        achievements: ['Creative Mind']
      },
      {
        username: "Mood Master",
        avatar: "🎨", 
        score: 1456,
        rank: 3,
        streak: 6,
        cardsShared: 6,
        cardsGenerated: 12,
        level: 2,
        achievements: ['Consistent Creator']
      },
      {
        username: "Daily Adventurer",
        avatar: "⚡",
        score: 987,
        rank: 4,
        streak: 4,
        cardsShared: 4,
        cardsGenerated: 8,
        level: 1,
        achievements: ['Getting Started']
      }
    ];
  }
  
  if (endpoint === '/trending-adventures') {
    return {
      success: true,
      trending: [
        {
          title: "Gratitude Morning Pages",
          description: "Write three things you're grateful for to start your day with positivity",
          completions: 347,
          shares: 89,
          viralPotential: 0.85,
          category: "Mindfulness",
          template: "cosmic",
          averageRating: 4.7,
          difficulty: "easy",
          estimatedTime: "5 mins"
        },
        {
          title: "Urban Photography Walk",
          description: "Capture the hidden beauty in your neighborhood with fresh eyes",
          completions: 256,
          shares: 67,
          viralPotential: 0.78,
          category: "Adventure", 
          template: "nature",
          averageRating: 4.5,
          difficulty: "medium",
          estimatedTime: "15 mins"
        },
        {
          title: "Random Act of Kindness",
          description: "Brighten someone's day with an unexpected gesture of kindness",
          completions: 198,
          shares: 92,
          viralPotential: 0.92,
          category: "Social",
          template: "retro",
          averageRating: 4.9,
          difficulty: "easy", 
          estimatedTime: "10 mins"
        },
        {
          title: "Mindful Coffee Moment",
          description: "Transform your coffee break into a meditation on presence and appreciation",
          completions: 423,
          shares: 78,
          viralPotential: 0.73,
          category: "Morning",
          template: "minimal",
          averageRating: 4.4,
          difficulty: "easy",
          estimatedTime: "5 mins"
        }
      ],
      viralAdventure: {
        title: "Random Act of Kindness",
        description: "Brighten someone's day with an unexpected gesture of kindness", 
        completions: 198,
        shares: 92,
        viralPotential: 0.92,
        category: "Social",
        template: "retro",
        averageRating: 4.9,
        difficulty: "easy",
        estimatedTime: "10 mins"
      },
      metadata: {
        totalAdventures: 4,
        category: null,
        mood: null,
        generatedAt: new Date().toISOString(),
        totalUsers: 1247,
        totalCompletions: 1224
      }
    };
  }
  
  throw new Error(`No fallback data available for ${endpoint}`);
};

// Fallback data for POST endpoints
const getPostFallbackData = (endpoint, data) => {
  console.log(`Returning fallback data for POST ${endpoint}`, data);
  
  // Authentication endpoints
  if (endpoint === '/auth/google' || endpoint === '/auth/google-oauth') {
    const user = generateDemoUser('google');
    const mockToken = `offline_google_token_${Date.now()}`;
    return {
      success: true,
      message: 'Google authentication successful (offline mode)',
      token: mockToken,
      user: user
    };
  }

  if (endpoint === '/auth/signup') {
    if (!data.email || !data.password || !data.name) {
      throw new Error('All fields are required');
    }
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    return {
      success: true,
      message: 'Account created successfully (offline mode). In real mode, check email for verification.',
      requiresVerification: false // Skip verification in offline mode
    };
  }

  if (endpoint === '/auth/signin') {
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }
    if (data.email === 'fail@test.com') {
      throw new Error('Invalid email or password');
    }
    const user = generateDemoUser('email');
    user.email = data.email;
    const mockToken = `offline_email_token_${Date.now()}`;
    return {
      success: true,
      message: 'Sign in successful (offline mode)',
      token: mockToken,
      user: user
    };
  }

  // User profile endpoints
  if (endpoint === '/user/save-profile') {
    console.log('Saving user profile locally:', data);
    const savedUser = { ...data, savedAt: new Date().toISOString() };
    localStorage.setItem('sparkvibe_user_backup', JSON.stringify(savedUser));
    return savedUser;
  }

  if (endpoint === '/user/save-mood') {
    console.log('Saving mood data locally:', data);
    const moodHistory = JSON.parse(localStorage.getItem('mood_history') || '[]');
    moodHistory.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem('mood_history', JSON.stringify(moodHistory.slice(-10))); // Keep last 10
    return { success: true, message: 'Mood saved locally' };
  }

  if (endpoint === '/user/save-choice') {
    console.log('Saving user choice locally:', data);
    const choiceHistory = JSON.parse(localStorage.getItem('choice_history') || '[]');
    choiceHistory.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem('choice_history', JSON.stringify(choiceHistory.slice(-50))); // Keep last 50
    return { success: true, message: 'Choice saved locally' };
  }

  if (endpoint === '/user/save-completion') {
    console.log('Saving completion locally:', data);
    const completionHistory = JSON.parse(localStorage.getItem('completion_history') || '[]');
    completionHistory.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem('completion_history', JSON.stringify(completionHistory.slice(-20))); // Keep last 20
    return { success: true, message: 'Completion saved locally' };
  }

  if (endpoint === '/user/save-card-generation') {
    console.log('Saving card generation locally:', data);
    const cardHistory = JSON.parse(localStorage.getItem('card_history') || '[]');
    cardHistory.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem('card_history', JSON.stringify(cardHistory.slice(-10))); // Keep last 10
    return { success: true, message: 'Card generation saved locally' };
  }

  // Mood analysis
  if (endpoint === '/analyze-mood') {
    const text = data.textInput ? data.textInput.toLowerCase() : '';
    let mood, confidence, emotions, recommendations, suggestedTemplate, energyLevel, socialMood;

    if (text.includes('excited') || text.includes('happy') || text.includes('great') || text.includes('amazing')) {
      mood = 'happy';
      confidence = 0.92;
      emotions = ['excited', 'joyful', 'optimistic', 'energetic'];
      recommendations = [
        'Channel your positive energy into a creative project',
        'Share your enthusiasm with someone special', 
        'Try a new adventure that matches your high energy'
      ];
      suggestedTemplate = 'cosmic';
      energyLevel = 'high';
      socialMood = 'outgoing';
    } else if (text.includes('nervous') || text.includes('anxious') || text.includes('worried')) {
      mood = 'anxious';
      confidence = 0.88;
      emotions = ['nervous', 'concerned', 'thoughtful', 'cautious'];
      recommendations = [
        'Practice deep breathing exercises',
        'Break overwhelming tasks into smaller steps',
        'Try a calming mindfulness exercise'
      ];
      suggestedTemplate = 'minimal';
      energyLevel = 'medium';
      socialMood = 'reserved';
    } else if (text.includes('tired') || text.includes('exhausted') || text.includes('drained')) {
      mood = 'calm';
      confidence = 0.85;
      emotions = ['tired', 'peaceful', 'relaxed', 'mellow'];
      recommendations = [
        'Focus on gentle, restorative activities',
        'Practice gratitude for small moments',
        'Consider a short nature walk for gentle energy'
      ];
      suggestedTemplate = 'nature';
      energyLevel = 'low';
      socialMood = 'quiet';
    } else if (text.includes('sad') || text.includes('down') || text.includes('lonely')) {
      mood = 'reflective';
      confidence = 0.82;
      emotions = ['contemplative', 'introspective', 'sensitive', 'thoughtful'];
      recommendations = [
        'Connect with someone who cares about you',
        'Express your feelings through journaling or art',
        'Practice self-compassion and gentle self-care'
      ];
      suggestedTemplate = 'retro';
      energyLevel = 'low';
      socialMood = 'seeking connection';
    } else {
      mood = 'curious';
      confidence = 0.65;
      emotions = ['curious', 'open', 'exploratory', 'hopeful'];
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
      insights: `Your mood analysis suggests you're feeling ${mood} with ${Math.round(confidence * 100)}% confidence.`,
      analyzedAt: new Date().toISOString(),
      timeOfDay: data.timeOfDay || 'unknown',
      isOffline: true
    };
  }

  // Capsule generation
  if (endpoint === '/generate-capsule-simple') {
    const mood = data.moodAnalysis?.mood || 'curious';
    let adventure;

    if (mood === 'happy') {
      adventure = {
        title: 'Spread Joy Challenge',
        prompt: 'Your positive energy is contagious! Send a heartfelt message to three people telling them why they matter to you.',
        estimatedTime: '10 mins',
        difficulty: 'Easy',
        category: 'Social'
      };
    } else if (mood === 'anxious') {
      adventure = {
        title: 'Grounding Ritual',
        prompt: 'Practice the 5-4-3-2-1 technique: Notice 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.',
        estimatedTime: '5 mins',
        difficulty: 'Easy',
        category: 'Mindfulness'
      };
    } else if (mood === 'calm') {
      adventure = {
        title: 'Gentle Gratitude Walk',
        prompt: 'Take a slow, mindful walk and find three things in nature that bring you peace.',
        estimatedTime: '15 mins',
        difficulty: 'Easy',
        category: 'Nature'
      };
    } else {
      adventure = {
        title: 'Creative Discovery Session',
        prompt: 'Set a timer for 10 minutes and create something with whatever materials you have nearby.',
        estimatedTime: '10 mins',
        difficulty: 'Easy',
        category: 'Creativity'
      };
    }

    return {
      id: `offline_capsule_${Date.now()}`,
      adventure,
      brainBite: 'Neuroscience shows that engaging in novel activities creates new neural pathways, enhancing cognitive flexibility.',
      habitNudge: 'Research suggests that micro-adventures lasting 5-10 minutes can significantly boost mood and productivity.',
      personalizedInsights: [
        `This adventure was tailored to your ${mood} mood`,
        `Optimal timing based on ${data.timeOfDay || 'current'} energy patterns`,
        'Designed to build on your current emotional state'
      ],
      isOffline: true
    };
  }

  // Vibe card generation
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
            category: data.capsuleData?.adventure?.category || 'Personal Growth'
          },
          achievement: {
            points: data.completionStats?.vibePointsEarned || 35,
            streak: Math.floor(Math.random() * 15) + 1,
            badge: 'Offline Vibe Trailblazer',
            level: data.user?.level || 1
          },
          mood: {
            before: data.moodData?.mood || 'curious',
            after: 'inspired',
            improvement: '+15%'
          }
        },
        design: {
          template: selectedTemplate,
          animations: ['slideIn', 'pulse', 'sparkle'],
          colors: {
            primary: selectedTemplate === 'cosmic' ? '#7c3aed' : '#10b981',
            secondary: selectedTemplate === 'cosmic' ? '#ec4899' : '#3b82f6'
          }
        },
        user: {
          name: data.user?.name || 'Vibe Explorer',
          totalPoints: (data.user?.totalPoints || 100) + (data.completionStats?.vibePointsEarned || 35),
          level: data.user?.level || 1,
          avatar: data.user?.avatar || '🚀'
        },
        sharing: {
          captions: [
            `Just earned ${data.completionStats?.vibePointsEarned || 35} points on my SparkVibe journey (offline mode)! 🌟`,
            'Transforming daily moments into meaningful adventures with SparkVibe ✨',
            'Level up your mindset, one vibe at a time! 🚀'
          ],
          hashtags: ['#SparkVibe', '#OfflineMode', '#MindfulMoments', '#PersonalGrowth'],
          qrCode: 'https://sparkvibe.app/offline-card/' + Date.now()
        },
        viralScore: Math.random() * 0.4 + 0.6,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '2.1-offline',
          aiEnhanced: false,
          renderTime: '0.5s',
          uniqueElements: Math.floor(Math.random() * 5) + 8,
          isOffline: true
        }
      },
      cardId: 'offline_enhanced_card_' + Date.now(),
      processingTime: '0.5s',
      message: '🎨 Offline Vibe card generated successfully!',
      analytics: {
        expectedEngagement: Math.floor(Math.random() * 50) + 70,
        viralPotential: 'Medium (offline mode)',
        shareability: Math.floor(Math.random() * 30) + 70
      },
      isOffline: true
    };
  }

  throw new Error(`No fallback data available for POST ${endpoint}`);
};

// Safe string inclusion check
export const safeIncludes = (str, searchString) => {
  if (typeof str !== 'string' || typeof searchString !== 'string') {
    return false;
  }
  return str.includes(searchString);
};

// Utility to sync local data when connection is restored
export const syncOfflineData = async () => {
  const offlineData = {
    userProfile: localStorage.getItem('sparkvibe_user_backup'),
    moodHistory: localStorage.getItem('mood_history'),
    choiceHistory: localStorage.getItem('choice_history'),
    completionHistory: localStorage.getItem('completion_history'),
    cardHistory: localStorage.getItem('card_history')
  };

  try {
    const result = await apiPost('/sync-offline-data', offlineData);
    console.log('Offline data synced successfully:', result);
    
    // Clear local offline data after successful sync
    localStorage.removeItem('sparkvibe_user_backup');
    localStorage.removeItem('mood_history');
    localStorage.removeItem('choice_history');
    localStorage.removeItem('completion_history');
    localStorage.removeItem('card_history');
    
    return result;
  } catch (error) {
    console.warn('Failed to sync offline data:', error);
    throw error;
  }
};