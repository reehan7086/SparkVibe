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
      proxy: {
        '/api': {
          target: 'https://fluffy-acorn-p6557vwpq5fg46-5000.app.github.dev',
          changeOrigin: true,
          secure: false,
          // No rewrite needed - we want to keep /api in the path
        }
      },
    },
    define: {
      'process.env': env,
    },
  };
});