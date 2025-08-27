import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Determine API URL based on environment
  const getApiUrl = () => {
    if (mode === 'production') {
      return 'https://api.sparkvibe.app';
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
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: true, // Set to true for HTTPS
          rewrite: (path) => path, // Don't rewrite the path
        },
      },
    },
    preview: {
      port: 8080,
      host: true,
      allowedHosts: [
        'sparkvibe.app',
        'www.sparkvibe.app',
        'api.sparkvibe.app'
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
      minify: 'esbuild', // Use esbuild instead of terser (faster and no extra dependency)
    },
  };
});