import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendDirectory = fileURLToPath(new URL('../backend/', import.meta.url));
  const backendPort = loadEnv(mode, backendDirectory, 'PORT').PORT || '3000';
  const target = env.LEXIMIND_API_TARGET || 'http://127.0.0.1:' + backendPort;
  const proxy = { '/api': { target, changeOrigin: true } };

  return { plugins: [react()], server: { proxy }, preview: { proxy } };
});
