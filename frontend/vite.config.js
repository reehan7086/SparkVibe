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
      port: 5173, // Development server port (optional, default is 5173)
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'https://fluffy-acorn-p6557vwpq5fg46-5000.app.github.dev',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: 8080, // Set preview port to match DigitalOcean readiness probe
      host: true, // Expose to network for containerized environments
    },
    define: {
      'process.env': {
        VITE_API_URL: JSON.stringify(env.VITE_API_URL || 'https://fluffy-acorn-p6557vwpq5fg46-5000.app.github.dev'),
        VITE_ENV: JSON.stringify(env.VITE_ENV || 'production'),
      },
    },
  };
});