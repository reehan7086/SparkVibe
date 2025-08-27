const fastify = require('fastify')({ logger: true });
const fastifyCors = require('@fastify/cors');
const fastifyHelmet = require('@fastify/helmet');
require('dotenv').config();

const startServer = async () => {
  try {
    // CORS configuration
    await fastify.register(fastifyCors, {
      origin: [
        'https://sparkvibe.app', 
        'https://www.sparkvibe.app', 
        'https://walrus-app-cczj4.ondigitalocean.app',
        'http://localhost:5173'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400,
    });

    // Security headers
    await fastify.register(fastifyHelmet, {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    });

    // Root endpoint
    fastify.get('/', async (request, reply) => {
      return reply.send({
        message: 'SparkVibe API Server',
        version: '2.0.0',
        status: 'running',
        features: ['AI-Generated Vibes', 'Mood Detection', 'Viral Card Generation'],
        endpoints: [
          'GET /health',
          'GET /leaderboard',
          'POST /generate-capsule-simple',
          'POST /generate-vibe-card',
          'POST /track-share',
          'POST /analyze-mood',
          'GET /trending-adventures',
          'POST /challenge-friend'
        ]
      });
    });

    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
      return reply.send({
        status: 'OK',
        message: 'Health Check',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Enhanced leaderboard with viral metrics
    fastify.get('/leaderboard', async (request, reply) => {
      return reply.send([
        { 
          username: 'SparkMaster', 
          score: 2850, 
          rank: 1, 
          streak: 15, 
          cardsShared: 45,
          viralCoefficient: 0.8,
          achievements: ['Cosmic Explorer', 'Share Champion', 'Streak Legend']
        },
        { 
          username: 'VibeExplorer', 
          score: 2180, 
          rank: 2, 
          streak: 8, 
          cardsShared: 32,
          viralCoefficient: 0.6,
          achievements: ['Nature Lover', 'Creative Spirit']
        },
        { 
          username: 'AdventureSeeker', 
          score: 1950, 
          rank: 3, 
          streak: 12, 
          cardsShared: 28,
          viralCoefficient: 0.7,
          achievements: ['Adventure Master', 'Mood Booster']
        },
        { 
          username: 'CreativeSpirit', 
          score: 1720, 
          rank: 4, 
          streak: 6, 
          cardsShared: 22,
          viralCoefficient: 0.5,
          achievements: ['Retro Enthusiast']
        },
        { 
          username: 'DreamWeaver', 
          score: 1495, 
          rank: 5, 
          streak: 9, 
          cardsShared: 18,
          viralCoefficient: 0.4,
          achievements: ['Minimal Designer']
        }
      ]);
    });

    // AI-Enhanced mood analysis
    fastify.post('/analyze-mood', async (request, reply) => {
      const { textInput, timeOfDay, weather, recentActivities } = request.body || {};
      
      // Mock AI mood analysis (replace with actual AI service)
      const moodAnalysis = analyzeMoodWithAI(textInput, timeOfDay, weather, recentActivities);
      
      return reply.send({
        success: true,
        mood: moodAnalysis.primaryMood,
        confidence: moodAnalysis.confidence,
        emotions: moodAnalysis.emotions,
        recommendations: moodAnalysis.recommendations,
        suggestedTemplate: moodAnalysis.suggestedTemplate,
        energyLevel: moodAnalysis.energyLevel,
        socialMood: moodAnalysis.socialMood
      });
    });

    // Enhanced capsule generation with AI
    fastify.post('/generate-capsule-simple', async (request, reply) => {
      const { mood, interests, moodAnalysis, location, timeOfDay } = request.body || {};
      
      const enhancedCapsules = generateAIEnhancedCapsule(mood, interests, moodAnalysis, location, timeOfDay);
      const selectedCapsule = enhancedCapsules[Math.floor(Math.random() * enhancedCapsules.length)];
      
      return reply.send({
        success: true,
        capsule: selectedCapsule.text,
        adventure: { 
          title: selectedCapsule.title, 
          prompt: selectedCapsule.prompt,
          difficulty: selectedCapsule.difficulty,
          estimatedTime: selectedCapsule.estimatedTime,
          category: selectedCapsule.category
        },
        moodBoost: selectedCapsule.moodBoost,
        brainBite: selectedCapsule.brainBite,
        habitNudge: selectedCapsule.habitNudge,
        metadata: { 
          mood: mood || 'neutral', 
          interests: interests || [], 
          generated_at: new Date().toISOString(),
          aiGenerated: true,
          viralPotential: selectedCapsule.viralPotential
        }
      });
    });

    // Enhanced vibe card generation
    fastify.post('/generate-vibe-card', async (request, reply) => {
      const { capsuleData, userChoices, completionStats, user, moodData } = request.body || {};
      
      const cardData = generateEnhancedVibeCard(capsuleData, userChoices, completionStats, user, moodData);
      
      return reply.send({ 
        success: true, 
        card: cardData, 
        processingTime: '1.2s', 
        message: 'Enhanced Vibe card generated successfully!',
        viralScore: cardData.viralScore,
        sharePrompts: cardData.sharePrompts
      });
    });

    // Share tracking endpoint
    fastify.post('/track-share', async (request, reply) => {
      const { cardId, platform, userId, shareType } = request.body || {};
      
      // Mock analytics tracking
      const shareData = {
        shareId: `share_${Date.now()}`,
        cardId,
        platform,
        userId,
        shareType,
        timestamp: new Date().toISOString(),
        viralPotential: calculateViralPotential(platform, shareType),
        bonusPoints: 5
      };
      
      return reply.send({
        success: true,
        shareData,
        message: `+${shareData.bonusPoints} points! Thanks for sharing your vibe!`,
        nextMilestone: 'Share 3 more cards to unlock Retro template'
      });
    });

    // Trending adventures endpoint
    fastify.get('/trending-adventures', async (request, reply) => {
      return reply.send({
        success: true,
        trending: [
          {
            title: "Cosmic Coffee Ritual",
            description: "Start your day with mindful coffee brewing",
            completions: 2847,
            shares: 1203,
            viralScore: 0.85,
            category: "morning",
            template: "cosmic"
          },
          {
            title: "Nature Photo Walk",
            description: "Find beauty in your neighborhood",
            completions: 1932,
            shares: 856,
            viralScore: 0.72,
            category: "outdoor",
            template: "nature"
          },
          {
            title: "Digital Detox Hour",
            description: "Disconnect to reconnect with yourself",
            completions: 1654,
            shares: 743,
            viralScore: 0.68,
            category: "wellness",
            template: "minimal"
          }
        ],
        viralAdventure: {
          title: "Gratitude Graffiti",
          description: "Leave positive messages for strangers to find",
          completions: 5621,
          shares: 3247,
          viralScore: 0.95,
          category: "social",
          template: "retro"
        }
      });
    });

    // Friend challenge endpoint
    fastify.post('/challenge-friend', async (request, reply) => {
      const { challengerId, friendUsername, adventureId } = request.body || {};
      
      const challenge = {
        challengeId: `challenge_${Date.now()}`,
        challenger: challengerId,
        challenged: friendUsername,
        adventureId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        reward: 25
      };
      
      return reply.send({
        success: true,
        challenge,
        message: `Challenge sent to ${friendUsername}! They have 7 days to complete it.`
      });
    });

    // Start server
    await fastify.listen({ port: process.env.PORT || 8080, host: '0.0.0.0' });
    console.log(`SparkVibe Enhanced API Server running on port ${process.env.PORT || 8080}`);

  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
};

// AI Mood Analysis Function
function analyzeMoodWithAI(textInput, timeOfDay, weather, recentActivities) {
  // Mock AI analysis - replace with actual AI service
  const moodKeywords = {
    happy: ['great', 'awesome', 'excited', 'love', 'amazing', 'wonderful'],
    sad: ['tired', 'down', 'frustrated', 'stressed', 'overwhelmed', 'difficult'],
    energetic: ['pumped', 'ready', 'motivated', 'active', 'energized'],
    calm: ['peaceful', 'relaxed', 'centered', 'quiet', 'serene'],
    anxious: ['worried', 'nervous', 'uncertain', 'pressure', 'rush']
  };

  let primaryMood = 'neutral';
  let confidence = 0.5;

  if (textInput) {
    const text = textInput.toLowerCase();
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > 0) {
        primaryMood = mood;
        confidence = Math.min(0.9, 0.6 + (matches * 0.1));
        break;
      }
    }
  }

  return {
    primaryMood,
    confidence,
    emotions: [primaryMood, 'curious', 'hopeful'],
    recommendations: getRecommendationsForMood(primaryMood),
    suggestedTemplate: getTemplateForMood(primaryMood),
    energyLevel: getEnergyLevel(primaryMood, timeOfDay),
    socialMood: getSocialMood(primaryMood)
  };
}

// Enhanced capsule generation
function generateAIEnhancedCapsule(mood, interests, moodAnalysis, location, timeOfDay) {
  const baseCapsules = [
    {
      text: "Your creative energy is sparking new possibilities!",
      title: "Creative Spark Challenge",
      prompt: "Find 3 objects around you and imagine a creative use for each",
      difficulty: "easy",
      estimatedTime: "5 minutes",
      category: "creativity",
      moodBoost: "Creativity unlocks joy and possibility",
      brainBite: "Did you know? Creative thinking activates multiple brain regions simultaneously",
      habitNudge: "Try the 5-minute creative break every morning",
      viralPotential: 0.7
    },
    {
      text: "Adventure calls to your courageous spirit today.",
      title: "Micro Adventure Quest",
      prompt: "Take a different route and discover something new in your area",
      difficulty: "medium",
      estimatedTime: "15 minutes",
      category: "adventure",
      moodBoost: "New experiences create lasting happiness",
      brainBite: "Novel experiences strengthen neural pathways and improve memory",
      habitNudge: "Weekly micro-adventures build resilience and curiosity",
      viralPotential: 0.8
    },
    {
      text: "Your mindful presence transforms ordinary moments into magic.",
      title: "Mindfulness Moment",
      prompt: "Spend 3 minutes focusing only on your breathing and surroundings",
      difficulty: "easy",
      estimatedTime: "3 minutes",
      category: "mindfulness",
      moodBoost: "Presence is the foundation of peace",
      brainBite: "Just 3 minutes of mindfulness can reduce cortisol levels",
      habitNudge: "Daily mindfulness builds emotional regulation skills",
      viralPotential: 0.6
    }
  ];

  // Filter based on mood and enhance
  return baseCapsules.map(capsule => ({
    ...capsule,
    moodMatch: calculateMoodMatch(capsule.category, mood),
    personalizedPrompt: personalizePrompt(capsule.prompt, interests, timeOfDay)
  }));
}

// Enhanced vibe card generation
function generateEnhancedVibeCard(capsuleData, userChoices, completionStats, user, moodData) {
  const templates = ['cosmic', 'nature', 'retro', 'minimal'];
  const selectedTemplate = moodData?.suggestedTemplate || templates[Math.floor(Math.random() * templates.length)];
  
  const basePoints = 25;
  const choiceBonus = Object.keys(userChoices || {}).length * 5;
  const completionBonus = completionStats?.vibePointsEarned || 0;
  const moodBonus = moodData ? 10 : 0;
  const totalPoints = basePoints + choiceBonus + completionBonus + moodBonus;
  
  const viralScore = calculateViralScore(capsuleData, selectedTemplate, totalPoints);
  
  return {
    content: {
      adventure: {
        title: capsuleData?.adventure?.title || "Your Daily Vibe Adventure",
        outcome: generatePersonalizedOutcome(moodData, capsuleData),
        moodBoost: capsuleData?.moodBoost || "You're doing amazing!",
        brainBite: capsuleData?.brainBite || "Every small step creates positive change"
      },
      achievement: { 
        points: totalPoints, 
        streak: Math.floor(Math.random() * 30) + 1,
        badge: selectBadge(capsuleData?.category, totalPoints),
        moodImprovement: moodData ? '+15% mood boost' : 'Great work!'
      }
    },
    design: { 
      template: selectedTemplate,
      animations: ['slideIn', 'pulse', 'sparkle', 'glow'],
      moodColors: getMoodColors(moodData?.primaryMood)
    },
    user: { 
      name: user?.name || 'Explorer',
      totalPoints: (user?.totalPoints || 1000) + totalPoints,
      level: Math.floor(((user?.totalPoints || 1000) + totalPoints) / 500) + 1,
      nextLevelProgress: ((user?.totalPoints || 1000) + totalPoints) % 500
    },
    sharing: {
      captions: generateViralCaptions(capsuleData, totalPoints, moodData),
      hashtags: ['#SparkVibe', '#DailyVibes', '#MoodBoost', '#MindfulMoments', '#VibeCheck'],
      qrCode: 'https://sparkvibe.app',
      sharePrompts: generateSharePrompts(viralScore)
    },
    viralScore: viralScore,
    sharePrompts: generateSharePrompts(viralScore),
    metadata: { 
      generatedAt: new Date().toISOString(), 
      version: '2.0', 
      sessionId: `session_${Date.now()}`,
      aiEnhanced: true,
      moodAnalyzed: !!moodData
    }
  };
}

// Helper functions
function getRecommendationsForMood(mood) {
  const recommendations = {
    happy: ["Share your joy with others", "Try a creative challenge", "Plan something fun"],
    sad: ["Practice gentle self-care", "Connect with a friend", "Take a mindful walk"],
    energetic: ["Channel energy into movement", "Start a new project", "Help someone else"],
    calm: ["Enjoy the peaceful moment", "Practice gratitude", "Meditate or reflect"],
    anxious: ["Try breathing exercises", "Ground yourself in the present", "Reach out for support"]
  };
  return recommendations[mood] || recommendations.happy;
}

function getTemplateForMood(mood) {
  const templates = {
    happy: 'cosmic',
    sad: 'nature', 
    energetic: 'retro',
    calm: 'minimal',
    anxious: 'nature'
  };
  return templates[mood] || 'cosmic';
}

function getEnergyLevel(mood, timeOfDay) {
  if (mood === 'energetic') return 'high';
  if (mood === 'calm' || mood === 'sad') return 'low';
  if (timeOfDay === 'morning') return 'medium-high';
  if (timeOfDay === 'evening') return 'medium-low';
  return 'medium';
}

function getSocialMood(mood) {
  if (mood === 'happy' || mood === 'energetic') return 'social';
  if (mood === 'sad' || mood === 'anxious') return 'introspective';
  return 'balanced';
}

function calculateMoodMatch(category, mood) {
  const matches = {
    creativity: ['happy', 'energetic', 'curious'],
    adventure: ['energetic', 'happy', 'brave'],
    mindfulness: ['calm', 'anxious', 'stressed']
  };
  return matches[category]?.includes(mood) ? 0.8 : 0.5;
}

function personalizePrompt(basePrompt, interests, timeOfDay) {
  if (interests?.includes('creativity') && basePrompt.includes('creative')) {
    return basePrompt + " Focus on something that sparks your artistic side.";
  }
  if (timeOfDay === 'morning') {
    return basePrompt + " Perfect way to start your day!";
  }
  return basePrompt;
}

function generatePersonalizedOutcome(moodData, capsuleData) {
  if (moodData?.primaryMood === 'happy') {
    return "Your positive energy created ripples of joy around you!";
  }
  if (moodData?.primaryMood === 'sad') {
    return "You showed courage by taking care of yourself today.";
  }
  return "You embraced growth and discovered new possibilities!";
}

function selectBadge(category, points) {
  if (points > 50) return "Achievement Unlocked";
  if (category === 'creativity') return "Creative Explorer";
  if (category === 'adventure') return "Bold Adventurer";
  return "Vibe Champion";
}

function getMoodColors(mood) {
  const colors = {
    happy: ['#FFD700', '#FF6B6B', '#4ECDC4'],
    sad: ['#6C7B7F', '#9AA3AF', '#C0C8CE'],
    energetic: ['#FF3366', '#FF6B35', '#F7931E'],
    calm: ['#6BCF7F', '#4D9DE0', '#7FB069']
  };
  return colors[mood] || colors.happy;
}

function generateViralCaptions(capsuleData, points, moodData) {
  const base = [
    `Just completed an amazing SparkVibe adventure and earned ${points} points! 🚀`,
    `Mood boosted and vibes elevated! ${points} points closer to my next level ✨`,
    `Daily dose of inspiration: ${capsuleData?.adventure?.title || 'completed'} 🌟`
  ];
  
  if (moodData) {
    base.push(`Turned my ${moodData.primaryMood} mood into positive action! 💪`);
  }
  
  return base;
}

function calculateViralScore(capsuleData, template, points) {
  let score = 0.5;
  if (points > 50) score += 0.2;
  if (template === 'retro' || template === 'cosmic') score += 0.1;
  if (capsuleData?.category === 'adventure') score += 0.1;
  return Math.min(0.95, score);
}

function generateSharePrompts(viralScore) {
  if (viralScore > 0.8) {
    return [
      "Your friends will love this adventure! Share on TikTok? 🎵",
      "Show off your growth streak! 🔥",
      "This could inspire someone's day! Share it? ✨"
    ];
  }
  return [
    "Share your vibe with friends? 😊",
    "Spread some positivity today! 🌟"
  ];
}

function calculateViralPotential(platform, shareType) {
  const multipliers = {
    tiktok: 0.9,
    instagram: 0.8,
    twitter: 0.7,
    snapchat: 0.6
  };
  return multipliers[platform] || 0.5;
}

startServer();