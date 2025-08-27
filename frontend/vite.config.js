import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const getApiUrl = () => {
    if (mode === 'production') {
      return 'https://backend-sv-3n4v6.ondigitalocean.app'; // Your backend URL
    }
    return env.VITE_API_URL || 'http://localhost:5000';
  };
  
  const apiUrl = getApiUrl();
  
  return {
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    server: {
      port: 5173,
    },
    preview: {
      port: 8080,
      host: '0.0.0.0', // Important: bind to all interfaces for static sites
    },
    define: {
      'process.env': {
        VITE_API_URL: JSON.stringify(apiUrl),
        VITE_ENV: JSON.stringify(env.VITE_ENV || mode),
        NODE_ENV: JSON.stringify(mode),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
    },
    optimizeDeps: {
    include: ['framer-motion'],
    exclude: [], // Ensure nothing is excluded
  },
        resolve: {
        alias: {
          // Fallback for framer-motion ESM issues
          'framer-motion/dist/es': 'framer-motion/dist/es',
        },
      },
  };
});