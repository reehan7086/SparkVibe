import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const getApiUrl = () => {
    if (mode === 'production') {
      return 'https://backend-sv-3n4v6.ondigitalocean.app';
    }
    return env.VITE_API_URL || 'http://localhost:8080';
  };

  const apiUrl = getApiUrl();

  return {
    plugins: [react()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    server: {
      port: 5173,
      host: '0.0.0.0'
    },
    preview: {
      port: 8080,
      host: '0.0.0.0'
    },
    define: {
      'process.env': {
        VITE_API_URL: JSON.stringify(apiUrl),
        VITE_ENV: JSON.stringify(env.VITE_ENV || mode),
        NODE_ENV: JSON.stringify(mode)
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            motion: ['framer-motion']
          }
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'framer-motion', '@formkit/auto-animate']
    },
    esbuild: {
      target: 'es2020'
    }
  };
});