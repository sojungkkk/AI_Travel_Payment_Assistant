import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    // 3페이지 API(/api/receipts/ocr, /api/refunds/*)는 Spring 서버로 넘긴다. 다른 포트면 API_TARGET으로 바꾼다
    proxy: { '/api': process.env.API_TARGET || 'http://localhost:8080' },
  },
});
