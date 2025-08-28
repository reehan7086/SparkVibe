// src/utils/safeUtils.js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

// Token management utilities
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

export const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  return !!token;
};

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
          username: "Test User 1",
          avatar: "🚀",
          score: 1000,
          rank: 1,
          streak: 5,
          cardsShared: 5,
          carsGenerated: 10,
          level: 2,
          achievements: []
        },
        {
          username: "Test User 2",
          avatar: "🌟",
          score: 800,
          rank: 2,
          streak: 3,
          cardsShared: 3,
          carsGenerated: 8,
          level: 1,
          achievements: []
        }
      ];
    }
    
    if (endpoint === '/trending-adventures') {
      return {
        success: true,
        trending: [
          {
            title: "Sunset Meditation",
            description: "A calming meditation session",
            completions: 124,
            shares: 50,
            viralScore: 0.8,
            category: "Mindfulness",
            template: "cosmic",
            averageRating: 4.5,
            difficulty: "easy",
            estimatedTime: "10 mins"
          },
          {
            title: "Urban Exploration",
            description: "Explore the city",
            completions: 89,
            shares: 30,
            viralScore: 0.7,
            category: "Adventure",
            template: "nature",
            averageRating: 4.0,
            difficulty: "medium",
            estimatedTime: "20 mins"
          }
        ],
        viralAdventure: {
          title: "Sunset Meditation",
          description: "A calming meditation session",
          completions: 124,
          shares: 50,
          viralScore: 0.8,
          category: "Mindfulness",
          template: "cosmic",
          averageRating: 4.5,
          difficulty: "easy",
          estimatedTime: "10 mins"
        },
        metadata: {
          totalAdventures: 2,
          category: null,
          mood: null,
          generatedAt: new Date().toISOString()
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

    // For demo purposes, return mock data for certain endpoints
    if (endpoint === '/analyze-mood') {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simple mood analysis based on text input
      const text = data.textInput.toLowerCase();
      let mood, confidence, emotions, recommendations, suggestedTemplate, energyLevel, socialMood;

      if (text.includes('excited') || text.includes('happy') || text.includes('great')) {
        mood = 'happy';
        confidence = 0.85;
        emotions = ['excited', 'optimistic', 'energetic'];
        recommendations = ['Share your positive energy with others', 'Try something adventurous today'];
        suggestedTemplate = 'cosmic';
        energyLevel = 'high';
        socialMood = 'outgoing';
      } else if (text.includes('nervous') || text.includes('anxious') || text.includes('worried')) {
        mood = 'anxious';
        confidence = 0.75;
        emotions = ['nervous', 'concerned', 'thoughtful'];
        recommendations = ['Take deep breaths', 'Break tasks into smaller steps', 'Practice mindfulness'];
        suggestedTemplate = 'calm';
        energyLevel = 'medium';
        socialMood = 'reserved';
      } else if (text.includes('tired') || text.includes('exhausted') || text.includes('drained')) {
        mood = 'calm';
        confidence = 0.8;
        emotions = ['tired', 'peaceful', 'relaxed'];
        recommendations = ['Rest and recharge', 'Gentle movement or stretching', 'Hydrate well'];
        suggestedTemplate = 'serene';
        energyLevel = 'low';
        socialMood = 'quiet';
      } else {
        // Default analysis
        mood = 'curious';
        confidence = 0.6;
        emotions = ['curious', 'hopeful', 'open'];
        recommendations = ['Try something new today', 'Explore your interests', 'Stay open to possibilities'];
        suggestedTemplate = 'explorer';
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
        analyzedAt: new Date().toISOString()
      };
    }

    if (endpoint === '/generate-capsule-simple') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        id: 'demo-capsule-001',
        adventure: {
          title: 'Mindful Observation Challenge',
          prompt: 'Take a moment to observe your surroundings. Find three things you haven\'t noticed before. This simple practice can boost creativity and mindfulness.',
          estimatedTime: '5 mins',
          difficulty: 'Easy', 
          category: 'Mindfulness'
        },
        brainBite: 'The average person overlooks 90% of their visual environment. Training yourself to notice details can enhance memory and observational skills.',
        habitNudge: 'Try the "3 New Things" game daily - it only takes a minute and builds powerful observation habits.'
      };
    }

    if (endpoint === '/generate-vibe-card') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Demo vibe card response
      return {
        success: true,
        card: {
          content: {
            adventure: {
              title: data.capsuleData?.adventure?.title || 'Your Daily Vibe Adventure',
              outcome: 'You embraced growth and discovered new possibilities!'
            },
            achievement: {
              points: 25,
              streak: 1,
              badge: 'Vibe Champion'
            }
          },
          design: {
            template: 'cosmic',
            animations: ['slideIn', 'pulse']
          },
          user: {
            name: 'Demo User',
            totalPoints: 25,
            level: 1
          },
          sharing: {
            captions: ['Just earned 25 points on my SparkVibe journey!'],
            hashtags: ['#SparkVibe', '#DailyVibes'],
            qrCode: 'https://sparkvibe.app'
          },
          viralScore: 0.7,
          metadata: {
            generatedAt: new Date().toISOString(),
            version: '2.1',
            aiEnhanced: true
          }
        },
        cardId: 'demo-card-' + Date.now(),
        processingTime: '2.3s',
        message: 'Enhanced Vibe card generated successfully!'
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
    
    // Return demo data for specific endpoints
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