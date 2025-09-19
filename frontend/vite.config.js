// Fixed frontend/vite.config.js - Critical Issues Resolved
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // CRITICAL FIX: Proper API URL detection
  const getApiUrl = () => {
    // Production: Use DigitalOcean backend URL
    if (mode === 'production') {
      return 'https://backend-sv-3n4v6.ondigitalocean.app';
    }
    
    // Development: Use environment variable or localhost
    return env.VITE_API_URL || 'http://localhost:8080';
  };

  const apiUrl = getApiUrl();
  console.log(`🔗 API URL configured: ${apiUrl} (mode: ${mode})`);

  return {
    plugins: [react()],
    
    // CRITICAL FIX: Proper path resolution
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      alias: {
        '@': '/src'
      }
    },
    
    // CRITICAL FIX: Development server configuration
    server: {
      port: 5173,
      host: '0.0.0.0',
      strictPort: true,
      // CRITICAL: Proxy API calls in development
      proxy: mode === 'development' ? {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: apiUrl.startsWith('https'),
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      } : undefined
    },
    
    // CRITICAL FIX: Preview server for production testing
    preview: {
      port: 8080,
      host: '0.0.0.0',
      strictPort: true
    },
    
    // CRITICAL FIX: Environment variables
    define: {
      'process.env': {
        VITE_API_URL: JSON.stringify(apiUrl),
        VITE_ENV: JSON.stringify(env.VITE_ENV || mode),
        VITE_GOOGLE_CLIENT_ID: JSON.stringify(env.VITE_GOOGLE_CLIENT_ID || ''),
        NODE_ENV: JSON.stringify(mode)
      }
    },
    
    // CRITICAL FIX: Build configuration
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'esbuild' : false,
      
      // CRITICAL: Proper chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            motion: ['framer-motion'],
            utils: ['axios']
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      
      // CRITICAL: Target modern browsers
      target: 'es2020',
      cssCodeSplit: true,
      
      // CRITICAL: Proper asset handling
      assetsDir: 'assets',
      copyPublicDir: true
    },
    
    // CRITICAL FIX: Dependency optimization
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'framer-motion', 
        '@formkit/auto-animate',
        'axios'
      ],
      exclude: []
    },
    
    // CRITICAL FIX: ESBuild configuration
    esbuild: {
      target: 'es2020',
      drop: mode === 'production' ? ['console', 'debugger'] : []
    },
    
    // CRITICAL FIX: CSS configuration
    css: {
      postcss: './postcss.config.js',
      devSourcemap: mode === 'development'
    }
  };
});