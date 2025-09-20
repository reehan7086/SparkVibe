// frontend/src/components/CanvasAnimationEngine.jsx
import { useRef, useEffect, useState } from 'react';

const CanvasAnimationEngine = ({ 
  width = 400, 
  height = 600, 
  template = 'cosmic',
  isPlaying = true,
  onFrame = null,
  cardData = null 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Animation templates
  const templates = {
    cosmic: {
      background: ['#1a1a2e', '#16213e', '#0f3460'],
      particles: '⭐✨🌟💫',
      colors: ['#533483', '#7209b7', '#a663cc', '#4cc9f0'],
      speed: 1
    },
    nature: {
      background: ['#2d5016', '#3e6b1f', '#4f8228'],
      particles: '🍃🌿🌱🌳',
      colors: ['#60a531', '#7cb342', '#8bc34a', '#9ccc65'],
      speed: 0.8
    },
    retro: {
      background: ['#ff006e', '#fb5607', '#ffbe0b'],
      particles: '⚡🔥💥✨',
      colors: ['#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b'],
      speed: 1.5
    },
    minimal: {
      background: ['#f8f9fa', '#e9ecef', '#dee2e6'],
      particles: '●○◆◇',
      colors: ['#495057', '#6c757d', '#adb5bd', '#ced4da'],
      speed: 0.5
    }
  };

  const currentTemplate = templates[template] || templates.cosmic;

  // Particle system
  const [particles, setParticles] = useState([]);

  // Initialize particles
  useEffect(() => {
    const newParticles = [];
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        symbol: currentTemplate.particles[Math.floor(Math.random() * currentTemplate.particles.length)],
        color: currentTemplate.colors[Math.floor(Math.random() * currentTemplate.colors.length)]
      });
    }
    setParticles(newParticles);
  }, [width, height, template]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = () => {
      setCurrentFrame(prev => prev + 1);
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, particles, template]);

  // Drawing function
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    currentTemplate.background.forEach((color, index) => {
      gradient.addColorStop(index / (currentTemplate.background.length - 1), color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Update and draw particles
    setParticles(prevParticles => 
      prevParticles.map(particle => {
        // Update position
        const newParticle = {
          ...particle,
          x: particle.x + particle.vx * currentTemplate.speed,
          y: particle.y + particle.vy * currentTemplate.speed,
          opacity: particle.opacity + Math.sin(currentFrame * 0.02) * 0.01
        };

        // Wrap around edges
        if (newParticle.x < 0) newParticle.x = width;
        if (newParticle.x > width) newParticle.x = 0;
        if (newParticle.y < 0) newParticle.y = height;
        if (newParticle.y > height) newParticle.y = 0;

        // Draw particle
        ctx.save();
        ctx.globalAlpha = Math.max(0.1, Math.min(1, newParticle.opacity));
        ctx.fillStyle = newParticle.color;
        ctx.font = `${newParticle.size * 10}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(newParticle.symbol, newParticle.x, newParticle.y);
        ctx.restore();

        return newParticle;
      })
    );

    // Draw card content if provided
    if (cardData) {
      drawCardContent(ctx);
    }

    // Call frame callback
    if (onFrame) {
      onFrame(currentFrame, ctx);
    }
  };

  // Draw card content
  const drawCardContent = (ctx) => {
    ctx.save();
    
    // Title
    if (cardData.title) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(cardData.title, width / 2, 100);
    }

    // Points
    if (cardData.points) {
      ctx.fillStyle = '#ffeb3b';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`+${cardData.points} Points`, width / 2, 140);
    }

    // User name
    if (cardData.userName) {
      ctx.fillStyle = '#e3f2fd';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(cardData.userName, width / 2, height - 80);
    }

    // Level
    if (cardData.level) {
      ctx.fillStyle = '#90caf9';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Level ${cardData.level}`, width / 2, height - 60);
    }

    ctx.restore();
  };

  // Control functions
  const play = () => {
    if (!isPlaying && animationRef.current === null) {
      setCurrentFrame(0);
      const animate = () => {
        setCurrentFrame(prev => prev + 1);
        draw();
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  const pause = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const reset = () => {
    setCurrentFrame(0);
    draw();
  };

  const exportFrame = () => {
    if (canvasRef.current) {
      return canvasRef.current.toDataURL('image/png');
    }
    return null;
  };

  return (
    <div className="canvas-animation-engine">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block mx-auto rounded-lg shadow-lg"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Frame: {currentFrame} | Template: {template} | Playing: {isPlaying ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  );
};

// Export control functions for external use
export const useCanvasAnimation = (canvasRef) => {
  const play = () => {
    // Implementation for external control
  };

  const pause = () => {
    // Implementation for external control
  };

  const reset = () => {
    // Implementation for external control
  };

  const exportFrame = () => {
    if (canvasRef.current) {
      return canvasRef.current.toDataURL('image/png');
    }
    return null;
  };

  return { play, pause, reset, exportFrame };
};

export default CanvasAnimationEngine;