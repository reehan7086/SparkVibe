/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Mobile-first breakpoints
      screens: {
        'xs': '320px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        // Custom mobile breakpoints
        'mobile': {'max': '767px'},
        'tablet': {'min': '768px', 'max': '1023px'},
        'desktop': {'min': '1024px'},
      },
      
      // Dynamic viewport height support
      height: {
        'screen-dynamic': '100dvh',
        'screen-small': '100svh',
        'screen-large': '100lvh',
      },
      
      minHeight: {
        'screen-dynamic': '100dvh',
        'screen-small': '100svh',
        'screen-large': '100lvh',
      },
      
      maxHeight: {
        'screen-dynamic': '100dvh',
        'screen-small': '100svh',
        'screen-large': '100lvh',
      },
      
      // Mobile-optimized spacing
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      
      // Touch-friendly sizing
      minWidth: {
        'touch': '44px',
      },
      
      minHeight: {
        'touch': '44px',
      },
      
      // Mobile-optimized font sizes
      fontSize: {
        'xs-mobile': ['0.75rem', { lineHeight: '1rem' }],
        'sm-mobile': ['0.875rem', { lineHeight: '1.25rem' }],
        'base-mobile': ['1rem', { lineHeight: '1.5rem' }],
        'lg-mobile': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl-mobile': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl-mobile': ['1.5rem', { lineHeight: '2rem' }],
        '3xl-mobile': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl-mobile': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      
      // Animation performance
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'mobile-safe': 'mobileSafe 0.1s ease-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        mobileSafe: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      
      // Mobile-optimized backdrop blur
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      
      // Z-index management for mobile
      zIndex: {
        'modal': '1000',
        'overlay': '1100',
        'popover': '1200',
        'tooltip': '1300',
        'toast': '1400',
        'mobile-nav': '1500',
      },
      
      // Mobile-optimized gradients
      backgroundImage: {
        'gradient-mobile': 'linear-gradient(135deg, var(--tw-gradient-stops))',
        'gradient-mobile-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'sparkvibe-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'cosmic-gradient': 'linear-gradient(135deg, #1a1a2e 0%, #533483 50%, #7209b7 100%)',
        'nature-gradient': 'linear-gradient(135deg, #2d5016 0%, #60a531 50%, #8bc34a 100%)',
        'retro-gradient': 'linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)',
        'minimal-gradient': 'linear-gradient(135deg, #f8f9fa 0%, #495057 50%, #dee2e6 100%)',
      },
      
      // Mobile touch enhancements
      scale: {
        '102': '1.02',
        '105': '1.05',
        '98': '0.98',
        '95': '0.95',
      },
      
      // Mobile-optimized shadows
      boxShadow: {
        'mobile-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'mobile': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'mobile-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'mobile-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'mobile-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(124, 58, 237, 0.5)',
        'glow-strong': '0 0 30px rgba(124, 58, 237, 0.8)',
      },
    },
  },
  plugins: [
    // Custom utilities for mobile responsiveness
    function({ addUtilities, theme, addComponents }) {
      const newUtilities = {
        // Mobile-safe containers
        '.mobile-container': {
          width: '100%',
          maxWidth: '100vw',
          paddingLeft: theme('spacing.4'),
          paddingRight: theme('spacing.4'),
          marginLeft: 'auto',
          marginRight: 'auto',
          overflowX: 'hidden',
        },
        
        // Touch-friendly elements
        '.touch-target': {
          minHeight: '44px',
          minWidth: '44px',
          touchAction: 'manipulation',
        },
        
        // Prevent zoom on inputs (iOS)
        '.input-no-zoom': {
          fontSize: '16px !important',
        },
        
        // Safe area support
        '.safe-area-inset': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
        
        // Prevent horizontal scroll
        '.no-scroll-x': {
          overflowX: 'hidden',
          maxWidth: '100vw',
        },
        
        // Mobile-optimized text truncation
        '.truncate-mobile': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '200px',
          '@screen sm': {
            maxWidth: '300px',
          },
          '@screen md': {
            maxWidth: 'none',
          },
        },
        
        // Hardware acceleration
        '.hardware-accelerated': {
          willChange: 'transform',
          transform: 'translateZ(0)',
        },
        
        // Mobile-optimized flexbox
        '.flex-mobile-col': {
          display: 'flex',
          flexDirection: 'column',
          '@screen sm': {
            flexDirection: 'row',
          },
        },
        
        // Dynamic viewport height
        '.h-screen-dynamic': {
          height: '100vh',
          height: '100dvh',
        },
        
        '.min-h-screen-dynamic': {
          minHeight: '100vh',
          minHeight: '100dvh',
        },
        
        // Mobile navigation
        '.mobile-nav': {
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        
        // Mobile modal
        '.mobile-modal': {
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          height: '100vh',
          height: '100dvh',
          overflowY: 'auto',
          '-webkit-overflow-scrolling': 'touch',
        },
        
        // Reduce motion for accessibility
        '@media (prefers-reduced-motion: reduce)': {
          '.motion-safe': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      };
      
      addUtilities(newUtilities);
      
      // Mobile-optimized components
      const newComponents = {
        '.btn-mobile': {
          padding: `${theme('spacing.3')} ${theme('spacing.6')}`,
          borderRadius: theme('borderRadius.lg'),
          fontWeight: theme('fontWeight.semibold'),
          fontSize: theme('fontSize.base'),
          minHeight: '44px',
          touchAction: 'manipulation',
          userSelect: 'none',
          transition: 'all 0.2s ease-in-out',
          '@screen xs': {
            padding: `${theme('spacing.2')} ${theme('spacing.4')}`,
            fontSize: theme('fontSize.sm'),
          },
        },
        
        '.card-mobile': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          borderRadius: theme('borderRadius.2xl'),
          padding: theme('spacing.6'),
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '@screen xs': {
            padding: theme('spacing.4'),
            borderRadius: theme('borderRadius.xl'),
          },
        },
        
        '.input-mobile': {
          width: '100%',
          padding: `${theme('spacing.3')} ${theme('spacing.4')}`,
          fontSize: '16px', // Prevents zoom on iOS
          borderRadius: theme('borderRadius.lg'),
          border: '2px solid rgba(255, 255, 255, 0.2)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          '&::placeholder': {
            color: 'rgba(255, 255, 255, 0.6)',
          },
          '&:focus': {
            outline: 'none',
            borderColor: theme('colors.purple.400'),
            boxShadow: `0 0 0 3px ${theme('colors.purple.400')}33`,
          },
        },
      };
      
      addComponents(newComponents);
    },
  ],
};