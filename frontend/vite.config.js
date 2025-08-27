import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
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
        VITE_API_URL: JSON.stringify(env.VITE_API_URL || 'http://localhost:5000'),
        VITE_ENV: JSON.stringify(env.VITE_ENV || 'production'),
      },
    },
  };
});
