// src/utils/safeUtils.js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

// Token management utilities
export const getAuthToken = () => {
  return localStorage.getItem('sparkvibe_token') || localStorage.getItem('authToken');
};

export const setAuthToken = (token) => {
  localStorage.setItem('sparkvibe_token', token);
  localStorage.setItem('authToken', token); // Backward compatibility
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

// Generate a random user for demo purposes
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
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString()
});

// Safe API call functions with error handling and authentication
export const apiGet = async (endpoint) => {
  try {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // For demo purposes, return mock data for certain endpoints
    if (endpoint === '/health') {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { message: 'Health check OK - Demo mode', status: 'demo' };
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers,
    });
    
    if (response.status === 401) {
      // Token is invalid or expired
      removeAuthToken();
      throw new Error('Authentication expired. Please sign in again.');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API GET request failed for ${endpoint}: ${error.message}`);
    
    // Return demo data for specific endpoints when in demo mode
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
    
    throw error;
  }
};

export const apiPost = async (endpoint, data) => {
  try {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Mock authentication endpoints
    if (endpoint === '/auth/google' || endpoint === '/auth/google-oauth') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const user = generateDemoUser('google');
      const mockToken = `google_token_${Date.now()}`;
      
      return {
        success: true,
        message: 'Google authentication successful',
        token: mockToken,
        user: user
      };
    }

    if (endpoint === '/auth/signup') {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulate validation
      if (!data.email || !data.password || !data.name) {
        throw new Error('All fields are required');
      }
      
      if (data.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      return {
        success: true,
        message: 'Account created successfully. Please check your email for verification.',
        requiresVerification: true
      };
    }

    if (endpoint === '/auth/signin') {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simulate validation
      if (!data.email || !data.password) {
        throw new Error('Email and password are required');
      }
      
      // Simulate login failure for demo
      if (data.email === 'fail@test.com') {
        throw new Error('Invalid email or password');
      }
      
      const user = generateDemoUser('email');
      user.email = data.email;
      const mockToken = `email_token_${Date.now()}`;
      
      return {
        success: true,
        message: 'Sign in successful',
        token: mockToken,
        user: user
      };
    }

    if (endpoint === '/auth/verify-email') {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        message: 'Email verified successfully'
      };
    }

    if (endpoint === '/auth/resend-verification') {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        message: 'Verification email sent'
      };
    }

    if (endpoint === '/auth/reset-password') {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        message: 'Password reset email sent'
      };
    }

    // For demo purposes, return mock data for certain endpoints
    if (endpoint === '/analyze-mood') {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Enhanced mood analysis based on text input
      const text = data.textInput.toLowerCase();
      let mood, confidence, emotions, recommendations, suggestedTemplate, energyLevel, socialMood;

      if (text.includes('excited') || text.includes('happy') || text.includes('great') || text.includes('amazing') || text.includes('wonderful')) {
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
      } else if (text.includes('nervous') || text.includes('anxious') || text.includes('worried') || text.includes('stressed')) {
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
      } else if (text.includes('tired') || text.includes('exhausted') || text.includes('drained') || text.includes('sleepy')) {
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
      } else if (text.includes('sad') || text.includes('down') || text.includes('lonely') || text.includes('blue')) {
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
        // Default analysis for unclear input
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
        timeOfDay: data.timeOfDay || 'unknown'
      };
    }

    if (endpoint === '/generate-capsule-simple') {
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Generate different adventures based on mood
      const mood = data.moodAnalysis?.mood || 'curious';
      let adventure;

      if (mood === 'happy') {
        adventure = {
          title: 'Spread Joy Challenge',
          prompt: 'Your positive energy is contagious! Send a heartfelt message to three people telling them why they matter to you. Watch how your joy multiplies when shared.',
          estimatedTime: '10 mins',
          difficulty: 'Easy',
          category: 'Social'
        };
      } else if (mood === 'anxious') {
        adventure = {
          title: 'Grounding Ritual',
          prompt: 'Find a quiet space and practice the 5-4-3-2-1 technique: Notice 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.',
          estimatedTime: '5 mins',
          difficulty: 'Easy',
          category: 'Mindfulness'
        };
      } else if (mood === 'calm') {
        adventure = {
          title: 'Gentle Gratitude Walk',
          prompt: 'Take a slow, mindful walk and find three things in nature that bring you peace. Take a moment to appreciate their quiet beauty.',
          estimatedTime: '15 mins',
          difficulty: 'Easy',
          category: 'Nature'
        };
      } else {
        adventure = {
          title: 'Creative Discovery Session',
          prompt: 'Set a timer for 10 minutes and create something with whatever materials you have nearby. Don\'t judge the result - just enjoy the process of making.',
          estimatedTime: '10 mins',
          difficulty: 'Easy',
          category: 'Creativity'
        };
      }

      return {
        id: `capsule_${Date.now()}`,
        adventure,
        brainBite: 'Neuroscience shows that engaging in novel activities creates new neural pathways, enhancing cognitive flexibility and creativity by up to 23%.',
        habitNudge: 'Research suggests that micro-adventures lasting just 5-10 minutes can significantly boost mood and productivity throughout the day.',
        personalizedInsights: [
          `This adventure was tailored to your ${mood} mood`,
          `Optimal timing based on ${data.timeOfDay || 'current'} energy patterns`,
          'Designed to build on your current emotional state'
        ]
      };
    }

    if (endpoint === '/generate-vibe-card') {
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Enhanced vibe card generation
      const templates = ['cosmic', 'nature', 'retro', 'minimal'];
      const selectedTemplate = data.capsuleData?.moodData?.suggestedTemplate || templates[Math.floor(Math.random() * templates.length)];
      
      return {
        success: true,
        card: {
          content: {
            adventure: {
              title: data.capsuleData?.adventure?.title || 'Your Mindful Adventure',
              outcome: 'You embraced growth and discovered new possibilities within yourself!',
              category: data.capsuleData?.adventure?.category || 'Personal Growth'
            },
            achievement: {
              points: data.completionStats?.vibePointsEarned || 35,
              streak: Math.floor(Math.random() * 15) + 1,
              badge: 'Vibe Trailblazer',
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
              `Just earned ${data.completionStats?.vibePointsEarned || 35} points on my SparkVibe journey! 🌟`,
              'Transforming daily moments into meaningful adventures with SparkVibe ✨',
              'Level up your mindset, one vibe at a time! 🚀'
            ],
            hashtags: ['#SparkVibe', '#DailyVibes', '#MindfulMoments', '#PersonalGrowth'],
            qrCode: 'https://sparkvibe.app/card/' + Date.now()
          },
          viralScore: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
          metadata: {
            generatedAt: new Date().toISOString(),
            version: '2.1',
            aiEnhanced: true,
            renderTime: '2.3s',
            uniqueElements: Math.floor(Math.random() * 5) + 8
          }
        },
        cardId: 'enhanced_card_' + Date.now(),
        processingTime: '2.3s',
        message: '🎨 AI-enhanced Vibe card generated successfully!',
        analytics: {
          expectedEngagement: Math.floor(Math.random() * 50) + 70,
          viralPotential: 'High',
          shareability: Math.floor(Math.random() * 30) + 70
        }
      };
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    
    if (response.status === 401) {
      // Token is invalid or expired
      removeAuthToken();
      throw new Error('Authentication expired. Please sign in again.');
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API POST request failed:', error);
    
    // Return demo data for specific endpoints when network fails
    if (endpoint === '/analyze-mood') {
      return {
        mood: 'curious',
        confidence: 0.6,
        emotions: ['curious', 'hopeful'],
        recommendations: ['Try something new today', 'Embrace your curiosity'],
        suggestedTemplate: 'cosmic',
        energyLevel: 'medium',
        socialMood: 'balanced',
        analyzedAt: new Date().toISOString()
      };
    }
    
    if (endpoint === '/generate-capsule-simple') {
      return {
        id: 'demo-capsule-001',
        adventure: {
          title: 'Demo Adventure: Creative Break',
          prompt: 'Take 5 minutes to doodle or write freely without judgment. This stimulates creativity and reduces stress.',
          estimatedTime: '5 mins',
          difficulty: 'Easy',
          category: 'Creativity'
        },
        brainBite: 'Regular creative breaks can increase problem-solving ability by up to 60% according to recent studies.',
        habitNudge: 'Schedule 5-minute creative breaks throughout your day to maintain mental freshness.'
      };
    }

    if (endpoint === '/generate-vibe-card') {
      return {
        success: true,
        card: {
          content: {
            adventure: {
              title: data.capsuleData?.adventure?.title || 'Demo Adventure',
              outcome: 'You completed an amazing adventure today!'
            },
            achievement: {
              points: 25,
              streak: 1,
              badge: 'Demo Badge'
            }
          },
          design: {
            template: 'cosmic',
            animations: ['slideIn']
          },
          user: {
            name: 'Demo User',
            totalPoints: 25,
            level: 1
          },
          sharing: {
            captions: ['Demo vibe card - try the real thing!'],
            hashtags: ['#SparkVibe'],
            qrCode: 'https://sparkvibe.app'
          },
          viralScore: 0.5,
          metadata: {
            generatedAt: new Date().toISOString(),
            version: 'demo',
            aiEnhanced: false
          }
        },
        cardId: 'demo-fallback-card',
        processingTime: '0.5s',
        message: 'Demo Vibe card generated!'
      };
    }
    
    // For authentication endpoints that fail, throw specific errors
    if (endpoint.startsWith('/auth/')) {
      if (error.message.includes('fetch')) {
        throw new Error('Unable to connect to authentication server. Please try again later.');
      }
      throw error;
    }
    
    throw error;
  }
};

// Safe string inclusion check
export const safeIncludes = (str, searchString) => {
  if (typeof str !== 'string' || typeof searchString !== 'string') {
    return false;
  }
  return str.includes(searchString);
};