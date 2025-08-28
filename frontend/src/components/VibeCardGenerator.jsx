import React, { useState, useRef, useEffect } from 'react';
import { apiPost, isAuthenticated } from '../utils/safeUtils';

const VibeCardGenerator = ({ 
  capsuleData, 
  userChoices, 
  completionStats, 
  user,
  onCardGenerated 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardData, setCardData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [authError, setAuthError] = useState(false);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Card templates with dynamic styling
  const templates = {
    cosmic: {
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      colors: ['#533483', '#7209b7', '#a663cc', '#4cc9f0'],
      particles: '⭐✨🌟💫',
      font: 'futuristic'
    },
    nature: {
      background: 'linear-gradient(135deg, #2d5016 0%, #3e6b1f 50%, #4f8228 100%)',
      colors: ['#60a531', '#7cb342', '#8bc34a', '#9ccc65'],
      particles: '🍃🌿🌱🌳',
      font: 'organic'
    },
    retro: {
      background: 'linear-gradient(135deg, #ff006e 0%, #fb5607 50%, #ffbe0b 100%)',
      colors: ['#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b'],
      particles: '⚡🔥💥✨',
      font: 'neon'
    },
    minimal: {
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
      colors: ['#495057', '#6c757d', '#adb5bd', '#ced4da'],
      particles: '●○◆◇',
      font: 'clean'
    }
  };

  // ADD THIS FUNCTION PROPERLY (was missing)
  const createDemoCard = () => {
    const templateNames = ['cosmic', 'nature', 'retro', 'minimal'];
    const randomTemplate = templateNames[Math.floor(Math.random() * templateNames.length)];
    
    const demoCard = {
      content: {
        adventure: {
          title: capsuleData?.adventure?.title || 'Your Adventure Awaits',
          outcome: 'You embraced creativity and discovered new possibilities!'
        },
        achievement: {
          points: completionStats?.vibePointsEarned || 50,
          streak: Math.floor(Math.random() * 10) + 1,
          badge: 'Creative Explorer'
        }
      },
      design: { 
        template: randomTemplate 
      },
      user: { 
        name: user?.name || 'Explorer',
        totalPoints: user?.totalPoints || 1000
      },
      sharing: {
        captions: [
          'Just completed an amazing SparkVibe adventure!',
          'Level up your mindset with SparkVibe!',
          'Daily dose of inspiration unlocked!'
        ],
        hashtags: ['#SparkVibe', '#Adventure', '#Growth', '#Inspiration'],
        qrCode: 'https://github.com/reehan7086/SparkVibe'
      },
      isDemo: true
    };
    
    setCardData(demoCard);
    startAnimation();
    onCardGenerated?.(demoCard);
  };

  // ADD THESE MISSING FUNCTIONS:
  const startAnimation = () => {
    setCurrentFrame(0);
    setIsPlaying(true);
    
    const animate = () => {
      setCurrentFrame(prev => (prev + 1) % 450);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    setTimeout(() => {
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }, 15000);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      startAnimation();
    }
  };

  const downloadCard = async () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `sparkvibe-card-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const shareCard = async (platform) => {
    if (!cardData) return;
    
    try {
      const shareData = {
        title: 'Check out my SparkVibe adventure!',
        text: cardData.sharing.captions[0],
        url: cardData.sharing.qrCode
      };
      
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        const shareUrl = encodeURIComponent(shareData.url);
        const shareText = encodeURIComponent(shareData.text);
        
        const urls = {
          twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
        };
        
        if (urls[platform]) {
          window.open(urls[platform], '_blank');
        }
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // Simple drawing function (placeholder)
  const drawCard = () => {
    if (!cardData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 540;
    canvas.height = 960;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Simple background
    const template = templates[cardData.design.template];
    const gradient = ctx.createLinearGradient(0, 0, 540, 960);
    gradient.addColorStop(0, template.colors[0]);
    gradient.addColorStop(1, template.colors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 540, 960);
    
    // Simple text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(cardData.content.adventure.title, 270, 200);
    
    ctx.font = '24px Arial';
    ctx.fillText(`+${cardData.content.achievement.points} Points`, 270, 300);
    ctx.fillText(`${cardData.content.achievement.streak} Day Streak`, 270, 350);
    ctx.fillText(cardData.user.name, 270, 400);
  };

  const generateVibeCard = async () => {
    setIsGenerating(true);
    setAuthError(false);
    
    try {
      console.log('Generating Vibe Card via: /generate-vibe-card');
      
      // Check if user is authenticated before making the request
      if (!isAuthenticated()) {
        setAuthError(true);
        createDemoCard();
        return;
      }
      
      const result = await apiPost('/generate-vibe-card', {
        capsuleData,
        userChoices,
        completionStats,
        user
      });

      if (result.success) {
        setCardData(result.card);
        startAnimation();
        onCardGenerated?.(result.card);
        console.log('Card generated:', result.card);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (error) {
      console.error('Failed to generate Vibe Card:', error);
      
      // Check if it's an authentication error
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        setAuthError(true);
      }
      
      createDemoCard();
    }
    setIsGenerating(false);
  };

  // Animation effect
  useEffect(() => {
    if (isPlaying && cardData) {
      drawCard();
    }
  }, [currentFrame, cardData, isPlaying]);

  return (
    <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          Create Your Vibe Card
        </h2>
        <p className="text-blue-200">Turn your adventure into shareable magic!</p>
      </div>

      {/* Add auth error message */}
      {authError && (
        <div className="bg-red-600/20 border border-red-500 rounded-xl p-4 mb-4 text-center">
          <p className="text-red-200 font-semibold">
            🔒 Authentication required
          </p>
          <p className="text-red-300 text-sm mt-1">
            Please sign in to generate real Vibe Cards. Using demo mode for now.
          </p>
        </div>
      )}

      {!cardData ? (
        <div className="text-center">
          <button
            onClick={generateVibeCard}
            disabled={isGenerating}
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generating Magic...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isAuthenticated() ? 'Generate Vibe Card' : 'Try Demo Mode'}
              </div>
            )}
          </button>
          
          {/* Show sign in prompt if not authenticated */}
          {!isAuthenticated() && (
            <p className="text-blue-300 text-sm mt-3">
              Sign in for personalized AI-generated cards!
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Canvas Preview */}
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl mx-auto max-w-sm">
            <canvas
              ref={canvasRef}
              className="w-full block"
              style={{ aspectRatio: '9/16' }}
            />
            
            {/* Show demo badge if in demo mode */}
            {cardData.isDemo && (
              <div className="absolute top-4 right-4 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                DEMO
              </div>
            )}
            
            {/* Playback Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
              <button
                onClick={togglePlayback}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 p-3 rounded-full transition-all duration-300"
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              
              <button
                onClick={() => startAnimation()}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 p-3 rounded-full transition-all duration-300"
              >
                🔄
              </button>
            </div>
          </div>

          {/* Card Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-3">Your Adventure Summary</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Adventure:</span> {cardData.content.adventure.title}</p>
              <p><span className="font-semibold">Points Earned:</span> +{cardData.content.achievement.points}</p>
              <p><span className="font-semibold">Streak:</span> {cardData.content.achievement.streak} days</p>
              <p><span className="font-semibold">Template:</span> {cardData.design.template.charAt(0).toUpperCase() + cardData.design.template.slice(1)}</p>
              {cardData.isDemo && (
                <p className="text-yellow-400"><span className="font-semibold">Mode:</span> Demo (Sign in for AI-generated cards)</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={downloadCard}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300"
            >
              📥 Download
            </button>
            
            <button
              onClick={() => shareCard('twitter')}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-300"
            >
              📤 Share
            </button>
          </div>

          {/* Social Sharing Options */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: 'TikTok', color: 'bg-pink-600', emoji: '🎵' },
              { name: 'Instagram', color: 'bg-purple-600', emoji: '📸' },
              { name: 'Twitter', color: 'bg-blue-500', emoji: '🐦' },
              { name: 'Snapchat', color: 'bg-yellow-500', emoji: '👻' }
            ].map((platform) => (
              <button
                key={platform.name}
                onClick={() => shareCard(platform.name.toLowerCase())}
                className={`${platform.color} hover:opacity-80 p-3 rounded-xl text-center transition-all duration-300 transform hover:scale-105`}
              >
                <div className="text-2xl mb-1">{platform.emoji}</div>
                <div className="text-xs font-semibold">{platform.name}</div>
              </button>
            ))}
          </div>

          <div className="text-center text-sm text-blue-200">
            <p className="mb-2">Every share helps grow the SparkVibe community!</p>
            <p className="text-xs opacity-75">
              {cardData.sharing.hashtags.join(' ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VibeCardGenerator;