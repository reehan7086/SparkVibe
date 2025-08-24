import React, { useState, useRef, useEffect } from 'react';

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

  const generateVibeCard = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:5000/api/generate-vibe-card-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          capsuleData,
          userChoices,
          completionStats
        })
      });

      const result = await response.json();
      if (result.success) {
        setCardData(result.card);
        startAnimation();
        onCardGenerated?.(result.card);
      }
    } catch (error) {
      console.error('Failed to generate Vibe Card:', error);
    }
    setIsGenerating(false);
  };

  const startAnimation = () => {
    setCurrentFrame(0);
    setIsPlaying(true);
    
    const animate = () => {
      setCurrentFrame(prev => (prev + 1) % 450); // 15 seconds at 30fps
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    // Auto-stop after 15 seconds
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

  const drawCard = () => {
    if (!cardData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const template = templates[cardData.design.template];

    // Set canvas size for mobile video (9:16 aspect ratio)
    canvas.width = 540; // Reduced for display
    canvas.height = 960;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw animated background
    drawAnimatedBackground(ctx, template, currentFrame);
    
    // Draw content layers
    drawAdventureSection(ctx, template, cardData, currentFrame);
    drawStatsSection(ctx, template, cardData, currentFrame);
    drawUserInfo(ctx, template, cardData, currentFrame);
    drawBranding(ctx, template, currentFrame);
  };

  const drawAnimatedBackground = (ctx, template, frame) => {
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 540, 960);
    const colors = template.colors;
    
    // Animated color shifting
    const colorIndex = Math.floor((frame / 30) % colors.length);
    const nextColorIndex = (colorIndex + 1) % colors.length;
    
    gradient.addColorStop(0, colors[colorIndex]);
    gradient.addColorStop(0.5, colors[nextColorIndex]);
    gradient.addColorStop(1, colors[(colorIndex + 2) % colors.length]);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 540, 960);

    // Draw floating particles
    drawParticles(ctx, template, frame);
  };

  const drawParticles = (ctx, template, frame) => {
    const particles = template.particles.split('');
    ctx.font = '30px Arial';
    
    for (let i = 0; i < 10; i++) {
      const x = (i * 54 + frame * 2) % 540;
      const y = (i * 96 + Math.sin(frame * 0.1 + i) * 25) % 960;
      const opacity = 0.3 + Math.sin(frame * 0.05 + i) * 0.2;
      
      ctx.globalAlpha = opacity;
      ctx.fillText(
        particles[i % particles.length], 
        x, 
        y
      );
    }
    ctx.globalAlpha = 1;
  };

  const drawAdventureSection = (ctx, template, card, frame) => {
    const centerX = 270;
    const startY = 150;
    
    // Animated entry effect
    const slideIn = Math.min(frame / 60, 1);
    const currentY = startY + (1 - slideIn) * 100;
    
    ctx.globalAlpha = slideIn;
    
    // Adventure title with glow effect
    ctx.shadowColor = template.colors[0];
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    
    // Wrap text if too long
    const title = card.content.adventure.title;
    const maxWidth = 450;
    wrapText(ctx, title, centerX, currentY, maxWidth, 40);
    
    // Choice outcome with typewriter effect
    ctx.shadowBlur = 5;
    ctx.font = '24px Arial';
    ctx.fillStyle = template.colors[1];
    
    const outcome = card.content.adventure.outcome;
    const typewriterLength = Math.min(Math.floor(frame / 3), outcome.length);
    const displayOutcome = outcome.substring(0, typewriterLength);
    
    wrapText(ctx, displayOutcome, centerX, currentY + 80, maxWidth, 30);
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  };

  const drawStatsSection = (ctx, template, card, frame) => {
    const statsY = 600;
    const bounceEffect = Math.sin(frame * 0.2) * 5;
    
    // Points earned with pulsing effect
    const pulseScale = 1 + Math.sin(frame * 0.3) * 0.1;
    ctx.save();
    ctx.translate(270, statsY + bounceEffect);
    ctx.scale(pulseScale, pulseScale);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`+${card.content.achievement.points}`, 0, 0);
    
    ctx.font = '24px Arial';
    ctx.fillText('VIBE POINTS', 0, 30);
    ctx.restore();
    
    // Streak counter with fire animation
    ctx.fillStyle = template.colors[2];
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `🔥 ${card.content.achievement.streak} DAY STREAK`, 
      270, 
      statsY + 100 + bounceEffect
    );
    
    // Badge with glow
    if (card.content.achievement.badge) {
      ctx.shadowColor = template.colors[0];
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 28px Arial';
      ctx.fillText(card.content.achievement.badge, 270, statsY + 150);
      ctx.shadowBlur = 0;
    }
  };

  const drawUserInfo = (ctx, template, card, frame) => {
    const userY = 750;
    
    // User name with elegant styling
    ctx.fillStyle = '#ffffff';
    ctx.font = '27px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`@${card.user.name}`, 270, userY);
    
    // Total points counter
    ctx.fillStyle = template.colors[1];
    ctx.font = '21px Arial';
    ctx.fillText(
      `${card.user.totalPoints.toLocaleString()} Total Points`, 
      270, 
      userY + 40
    );
  };

  const drawBranding = (ctx, template, frame) => {
    const logoY = 850;
    
    // SparkVibe logo with sparkle animation
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('✨ SparkVibe', 270, logoY);
    
    // Animated tagline
    const taglines = [
      'Daily Adventures Await',
      'Spark Your Curiosity',
      'Level Up Your Mindset',
      'Discover. Grow. Shine.'
    ];
    
    const taglineIndex = Math.floor((frame / 90) % taglines.length);
    ctx.fillStyle = template.colors[0];
    ctx.font = '18px Arial';
    ctx.fillText(taglines[taglineIndex], 270, logoY + 30);
  };

  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  };

  const downloadCard = async () => {
    if (!canvasRef.current) return;
    
    // Generate static image
    drawCard();
    
    const link = document.createElement('a');
    link.download = `sparkvibe-card-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const shareCard = async (platform) => {
    if (!cardData) return;
    
    try {
      // Generate share content
      const shareData = {
        title: 'Check out my SparkVibe adventure!',
        text: cardData.sharing.captions[0],
        url: cardData.sharing.qrCode
      };
      
      if (navigator.share) {
        // Native sharing on mobile
        await navigator.share(shareData);
      } else {
        // Fallback for desktop
        const shareUrl = encodeURIComponent(shareData.url);
        const shareText = encodeURIComponent(shareData.text);
        
        const urls = {
          twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
          instagram: '#',
          tiktok: '#'
        };
        
        if (urls[platform]) {
          window.open(urls[platform], '_blank');
        }
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // Animation loop
  useEffect(() => {
    if (isPlaying && cardData) {
      drawCard();
    }
  }, [currentFrame, cardData, isPlaying]);

  return (
    <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl p-8 text-white">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          ✨ Create Your Vibe Card ✨
        </h2>
        <p className="text-blue-200">Turn your adventure into shareable magic!</p>
      </div>

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
                ✨ Generate Vibe Card ✨
              </div>
            )}
          </button>
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
            <p className="mb-2">✨ Every share helps grow the SparkVibe community!</p>
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