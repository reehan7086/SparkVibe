export class AdvancedCanvasAnimations {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animations = [];
    this.isRunning = false;
  }

  // Particle system for vibe cards
  initParticleEffect(color = '#ff6b6b', count = 50) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: Math.random() * 3 + 1,
        color: color,
        alpha: Math.random(),
        life: 1
      });
    }
  }

  // Typewriter effect for text
  typewriterEffect(text, x, y, speed = 50) {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = '24px Inter';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(text.substring(0, index), x, y);
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);
  }

  // Pulse animation
  pulseAnimation(x, y, radius, color) {
    let scale = 1;
    let growing = true;
    
    const animate = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius * scale, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
      
      if (growing) {
        scale += 0.02;
        if (scale > 1.5) growing = false;
      } else {
        scale -= 0.02;
        if (scale < 1) growing = true;
      }
      
      if (this.isRunning) {
        requestAnimationFrame(animate);
      }
    };
    
    this.isRunning = true;
    animate();
  }

  // Morph animation between shapes
  morphAnimation(startPoints, endPoints, duration = 2000) {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.beginPath();
      
      startPoints.forEach((start, i) => {
        const end = endPoints[i];
        const x = start.x + (end.x - start.x) * progress;
        const y = start.y + (end.y - start.y) * progress;
        
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      
      this.ctx.closePath();
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.fill();
      
      if (progress < 1 && this.isRunning) {
        requestAnimationFrame(animate);
      }
    };
    
    this.isRunning = true;
    animate();
  }

  stop() {
    this.isRunning = false;
  }
}