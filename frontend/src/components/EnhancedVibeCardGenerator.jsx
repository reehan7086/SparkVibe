import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiPostWithFallback } from '../utils/safeUtils';

const EnhancedVibeCardGenerator = ({ 
  moodData, 
  userChoices, 
  setUserChoices, 
  onComplete, 
  user, 
  updateUserData,
  capsuleData,
  completionStats
}) => {
  console.log('CapsuleData received:', capsuleData);
  const [currentPhase, setCurrentPhase] = useState('adventure');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCard, setGeneratedCard] = useState(null);
  const [error, setError] = useState(null);
  
  const canvasRef = useRef(null);

  // Mock data for demonstration
  const mockMoodData = moodData || { mood: 'excited', energy: 'high', timeOfDay: 'morning' };
  const mockUser = user || { name: 'Vibe Explorer', totalPoints: 150, level: 2, avatar: '🚀' };
  const mockUserChoices = userChoices || {};

  const handlePhaseComplete = async (choice) => {
    const newChoices = { ...mockUserChoices, [currentPhase]: choice };
    setUserChoices?.(newChoices);

    // Award points for each phase
    const phasePoints = 15;
    if (updateUserData) {
      const updatedUser = {
        ...mockUser,
        totalPoints: (mockUser.totalPoints || 0) + phasePoints,
        stats: {
          ...mockUser.stats,
          totalPoints: (mockUser.stats?.totalPoints || 0) + phasePoints,
          choices: [...(mockUser.stats?.choices || []), choice]
        }
      };
      await updateUserData(updatedUser);
    }

    // Progress through phases
    if (currentPhase === 'adventure') {
      setCurrentPhase('reflection');
    } else if (currentPhase === 'reflection') {
      setCurrentPhase('action');
    } else {
      generateVibeCard(newChoices);
    }
  };

  const generateVibeCard = async (choices) => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Extract capsuleId from capsuleData
      const capsuleId = capsuleData?.capsuleId || capsuleData?.id || `capsule_${Date.now()}`;
      console.log('Attempting to generate vibe card with capsuleId:', capsuleId);
      
      // Try multiple endpoints with fallback
      const endpoints = [
        '/generate-enhanced-vibe-card',
        '/generate-vibe-card',
        '/create-vibe-card'
      ];
      
      let cardData = null;
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          const payload = {
            capsuleId,
            template: 'cosmic',
            moodData: mockMoodData,
            completionStats: completionStats || { vibePointsEarned: 45 },
            userChoices: choices,
            user: {
              id: mockUser.id,
              name: mockUser.name,
              level: mockUser.level,
              totalPoints: mockUser.totalPoints
            }
          };
          
          const result = await apiPostWithFallback(endpoint, payload);
          
          if (result.success || result.card || result.data) {
            cardData = result.card || result.data || result;
            console.log('Successfully generated card from endpoint:', endpoint);
            break;
          }
        } catch (endpointError) {
          console.warn(`Endpoint ${endpoint} failed:`, endpointError);
          lastError = endpointError;
          continue;
        }
      }
      
      if (!cardData) {
        throw lastError || new Error('All endpoints failed');
      }
      
      setGeneratedCard(cardData);
      onComplete?.(cardData);
      
    } catch (error) {
      console.error('Failed to generate enhanced vibe card:', error);
      setError('Failed to generate vibe card from server');
      
      // Enhanced fallback card generation
      const fallbackCard = createFallbackCard(choices);
      setGeneratedCard(fallbackCard);
      onComplete?.(fallbackCard);
    } finally {
      setIsGenerating(false);
    }
  };

  const createFallbackCard = (choices) => {
    console.log('Creating fallback card with choices:', choices);
    
    return {
      id: `enhanced_${Date.now()}`,
      design: { 
        template: 'cosmic', 
        animated: true,
        colors: ['#533483', '#7209b7', '#a663cc', '#4cc9f0']
      },
      content: {
        adventure: { 
          title: choices.adventure?.title || 'Your Creative Journey', 
          outcome: choices.adventure?.description || 'Embraced new possibilities' 
        },
        reflection: { 
          insight: choices.reflection?.description || 'Growth happens outside comfort zones' 
        },
        action: { 
          commitment: choices.action?.description || 'Continue exploring new perspectives' 
        },
        summary: `You chose ${choices.adventure?.title || 'creativity'}, reflected on ${choices.reflection?.title || 'growth'}, and committed to ${choices.action?.title || 'action'}.`
      },
      user: {
        name: mockUser.name,
        level: mockUser.level,
        totalPoints: mockUser.totalPoints,
        avatar: mockUser.avatar
      },
      points: {
        earned: 45,
        breakdown: {
          adventure: 15,
          reflection: 15,
          action: 15
        }
      },
      sharing: {
        captions: [
          `Just completed an amazing SparkVibe adventure! 🌟 #SparkVibe #PersonalGrowth`,
          `Level up complete! 🚀 Thanks @SparkVibe for the daily inspiration #Adventure`,
          `Another day, another vibe! ✨ Who else is on their growth journey? #SparkVibe`
        ],
        hashtags: ['#SparkVibe', '#Adventure', '#Growth', '#Inspiration'],
        qrCode: 'https://github.com/reehan7086/SparkVibe'
      },
      fallback: true,
      timestamp: new Date().toISOString()
    };
  };

  // Generate animated canvas background
  useEffect(() => {
    if (generatedCard && canvasRef.current) {
      drawCard();
    }
  }, [generatedCard]);

  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 500;

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 500);
    if (generatedCard.design?.colors) {
      generatedCard.design.colors.forEach((color, index) => {
        gradient.addColorStop(index / (generatedCard.design.colors.length - 1), color);
      });
    } else {
      gradient.addColorStop(0, '#7c3aed');
      gradient.addColorStop(0.5, '#ec4899');
      gradient.addColorStop(1, '#3b82f6');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 500);

    // Add animated elements
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 300;
      const y = Math.random() * 500;
      const size = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add content text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    ctx.fillText('Enhanced Vibe Card', 150, 50);
    
    ctx.font = '16px Arial';
    ctx.fillText(`${mockUser.name}`, 150, 100);
    ctx.fillText(`Level ${mockUser.level}`, 150, 130);
    ctx.fillText(`${mockUser.totalPoints} Points`, 150, 160);
    
    if (generatedCard.points?.earned) {
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText(`+${generatedCard.points.earned} Points`, 150, 200);
    }
    
    // Add phase completion indicators
    const phases = ['Adventure', 'Reflection', 'Action'];
    phases.forEach((phase, index) => {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '12px Arial';
      ctx.fillText(`✓ ${phase}`, 150, 250 + (index * 20));
    });

    ctx.shadowBlur = 0;
  };

  if (isGenerating) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-indigo-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center"
      >
        <div className="relative mb-6">
          <div className="w-20 h-20 mx-auto border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 mx-auto mt-2 border-2 border-pink-400 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Creating your personalized vibe card...</h3>
        <p className="text-purple-200">AI is crafting something special based on your journey</p>
        
        {error && (
          <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-400/30 rounded-lg">
            <p className="text-yellow-200 text-sm">{error}</p>
            <p className="text-yellow-300 text-xs mt-1">Creating fallback card...</p>
          </div>
        )}
      </motion.div>
    );
  }

  if (generatedCard) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-indigo-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-8"
      >
        <h2 className="text-3xl font-bold text-white text-center mb-6">Your Enhanced Vibe Card</h2>
        
        {generatedCard.fallback && (
          <div className="mb-4 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg text-center">
            <p className="text-blue-200 text-sm">
              🔄 Generated locally - Backend endpoints unavailable
            </p>
          </div>
        )}
        
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl mx-auto max-w-sm">
          <canvas
            ref={canvasRef}
            className="w-full block"
            style={{ aspectRatio: '9/16' }}
          />
          
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
            <button 
              onClick={() => {
                const link = document.createElement('a');
                link.download = `sparkvibe-card-${Date.now()}.png`;
                link.href = canvasRef.current.toDataURL();
                link.click();
              }}
              className="bg-white/20 backdrop-blur-md hover:bg-white/30 p-3 rounded-full transition-all duration-300"
            >
              📥
            </button>
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'My SparkVibe Card',
                    text: generatedCard.sharing?.captions[0] || 'Check out my SparkVibe adventure!',
                    url: generatedCard.sharing?.qrCode || window.location.href
                  });
                } else {
                  // Fallback to clipboard
                  navigator.clipboard.writeText(generatedCard.sharing?.qrCode || window.location.href);
                  alert('Link copied to clipboard!');
                }
              }}
              className="bg-white/20 backdrop-blur-md hover:bg-white/30 p-3 rounded-full transition-all duration-300"
            >
              📤
            </button>
          </div>
        </div>

        {/* Card Summary */}
        <div className="mt-6 space-y-4">
          <div className="bg-white/10 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Journey Summary</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold text-purple-300">Adventure:</span> <span className="text-white/80">{generatedCard.content?.adventure?.title}</span></p>
              <p><span className="font-semibold text-blue-300">Reflection:</span> <span className="text-white/80">{generatedCard.content?.reflection?.insight}</span></p>
              <p><span className="font-semibold text-green-300">Action:</span> <span className="text-white/80">{generatedCard.content?.action?.commitment}</span></p>
              {generatedCard.points && (
                <p><span className="font-semibold text-yellow-300">Points Earned:</span> <span className="text-white/80">+{generatedCard.points.earned}</span></p>
              )}
            </div>
          </div>

          {/* Sharing Options */}
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => {
                const link = document.createElement('a');
                link.download = `sparkvibe-enhanced-card-${Date.now()}.png`;
                link.href = canvasRef.current.toDataURL();
                link.click();
              }}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-xl text-white font-semibold transition-colors"
            >
              Download Card
            </button>
            <button 
              onClick={() => {
                const shareText = generatedCard.sharing?.captions[0] || 'Check out my SparkVibe adventure!';
                const shareUrl = generatedCard.sharing?.qrCode || window.location.href;
                
                if (navigator.share) {
                  navigator.share({
                    title: 'My Enhanced SparkVibe Card',
                    text: shareText,
                    url: shareUrl
                  });
                } else {
                  // Fallback - copy to clipboard and open Twitter
                  navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                }
              }}
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-xl text-white font-semibold transition-colors"
            >
              Share Card
            </button>
          </div>

          {/* Progress to Next Adventure */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-xl p-4 text-center">
            <h4 className="font-semibold text-white mb-2">Ready for Your Next Adventure?</h4>
            <p className="text-white/80 text-sm mb-3">You've earned {generatedCard.points?.earned || 45} points and completed all phases!</p>
            <button 
              onClick={() => {
                setGeneratedCard(null);
                setCurrentPhase('adventure');
                if (onComplete) {
                  onComplete(generatedCard);
                }
              }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-4 py-2 rounded-xl text-white font-medium transition-all duration-300"
            >
              Start New Adventure
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Phase content definitions
  const phaseData = {
    adventure: {
      title: "Choose Your Adventure",
      subtitle: "What kind of experience calls to you today?",
      emoji: "🚀",
      options: [
        {
          id: 'creative',
          title: 'Creative Expression',
          description: 'Channel your energy into art, writing, or music',
          icon: '🎨',
          color: 'from-pink-500 to-purple-600'
        },
        {
          id: 'mindful',
          title: 'Mindful Moment',
          description: 'Find peace through meditation or reflection',
          icon: '🧘‍♀️',
          color: 'from-green-500 to-teal-600'
        },
        {
          id: 'social',
          title: 'Social Connection',
          description: 'Reach out and strengthen your relationships',
          icon: '💫',
          color: 'from-blue-500 to-indigo-600'
        },
        {
          id: 'learning',
          title: 'Learn Something New',
          description: 'Expand your mind with fresh knowledge',
          icon: '📚',
          color: 'from-orange-500 to-red-600'
        }
      ]
    },
    reflection: {
      title: "Reflection Time",
      subtitle: "What insight resonates with you right now?",
      emoji: "🌟",
      options: [
        {
          id: 'growth',
          title: 'Personal Growth',
          description: 'I am becoming more resilient every day',
          icon: '🌱',
          color: 'from-emerald-500 to-green-600'
        },
        {
          id: 'gratitude',
          title: 'Gratitude Focus',
          description: 'I appreciate the small moments of joy',
          icon: '🙏',
          color: 'from-yellow-500 to-orange-600'
        },
        {
          id: 'purpose',
          title: 'Clear Purpose',
          description: 'My actions align with my deeper values',
          icon: '🎯',
          color: 'from-purple-500 to-pink-600'
        },
        {
          id: 'connection',
          title: 'Deep Connection',
          description: 'I am part of something greater than myself',
          icon: '🌐',
          color: 'from-blue-500 to-cyan-600'
        }
      ]
    },
    action: {
      title: "Take Action",
      subtitle: "How will you carry this forward?",
      emoji: "⚡",
      options: [
        {
          id: 'daily_practice',
          title: 'Daily Practice',
          description: 'Commit to 10 minutes daily of this activity',
          icon: '⏰',
          color: 'from-indigo-500 to-purple-600'
        },
        {
          id: 'share_journey',
          title: 'Share Your Journey',
          description: 'Inspire others by sharing your experience',
          icon: '📢',
          color: 'from-pink-500 to-rose-600'
        },
        {
          id: 'build_habit',
          title: 'Build a Habit',
          description: 'Create a sustainable routine around this',
          icon: '🏗️',
          color: 'from-cyan-500 to-blue-600'
        },
        {
          id: 'explore_deeper',
          title: 'Explore Deeper',
          description: 'Research and learn more about this topic',
          icon: '🔍',
          color: 'from-teal-500 to-green-600'
        }
      ]
    }
  };

  const currentPhaseData = phaseData[currentPhase];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-indigo-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Enhanced Adventure Experience</h2>
        <p className="text-blue-200 text-sm">Complete this multi-phase journey for a personalized vibe card</p>
        
        {/* Progress Indicator */}
        <div className="flex justify-center mt-4 space-x-2">
          {['adventure', 'reflection', 'action'].map((phase, index) => (
            <div
              key={phase}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                phase === currentPhase 
                  ? 'bg-purple-400 w-6' 
                  : index < ['adventure', 'reflection', 'action'].indexOf(currentPhase)
                    ? 'bg-green-400'
                    : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhase}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="text-center mb-8"
        >
          <div className="text-6xl mb-4">{currentPhaseData.emoji}</div>
          <h3 className="text-2xl font-bold text-white mb-2">{currentPhaseData.title}</h3>
          <p className="text-white/70 mb-6">{currentPhaseData.subtitle}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentPhaseData.options.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePhaseComplete(option)}
                className={`bg-gradient-to-r ${option.color} p-6 rounded-xl text-white text-left shadow-lg hover:shadow-xl transition-all duration-300 border border-white/10`}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{option.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-2">{option.title}</h4>
                    <p className="text-white/90 text-sm">{option.description}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Phase indicator at bottom */}
      <div className="text-center text-sm text-white/60 mt-6">
        Phase {['adventure', 'reflection', 'action'].indexOf(currentPhase) + 1} of 3
        <br />
        <span className="text-xs">+15 points per phase completed</span>
      </div>
    </motion.div>
  );
};

export default EnhancedVibeCardGenerator;