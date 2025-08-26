import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  console.log('Loaded env in mode', mode, ':', env);
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
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying request to:', req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Proxy response from:', req.url, 'Status:', proxyRes.statusCode);
            });
          },
        },
        '/manifest.json': {
          target: 'https://github.dev/pf-signin?id=interesting-cat-m56qmdz&cluster=inc1&name=fluffy-acorn-p6557vwpq5fg46&port=5173',
          changeOrigin: true,
          rewrite: (path) => path.replace('/manifest.json', '/auth/postback/tunnel?rd=%2Fmanifest.json&tunnel=1'),
        },
      },
    },
    define: {
      'process.env': env, // Expose env variables to the client
    },
  };
});