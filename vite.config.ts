import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// changeOrigin: true 가 반드시 필요하다.
// 백엔드가 Origin 헤더로 CSRF를 검사하므로, dev 서버(localhost:5173)에서 보내는
// Origin을 target(127.0.0.1:8000)과 같게 맞춰줘야 403이 안 난다.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
      },
      '/qr': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/inspect': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
