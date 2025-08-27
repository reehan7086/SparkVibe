import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const getApiUrl = () => {
    if (mode === 'production') {
      return 'https://sparkvibe.app/api'; // Include /api for production
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
      // Remove proxy entirely - not needed in App Platform
    },
    preview: {
      port: 8080,
      host: true,
      // Simplified allowed hosts
      allowedHosts: [
        'sparkvibe.app',
        'www.sparkvibe.app'
      ],
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
  };
});