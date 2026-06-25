import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const targetRaw = (env.VITE_BACKEND_URL || 'http://127.0.0.1:3001').trim()
  const target = targetRaw.replace(/\/+$/, '')

  return {
    plugins: [react()],
    base: '/vendor/',
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
          ws: true,
          timeout: 120000,
          proxyTimeout: 120000
        },
        '/uploads': {
          target,
          changeOrigin: true,
          secure: false,
          timeout: 120000,
          proxyTimeout: 120000
        }
      }
    },
    css: {
      postcss: {
        plugins: []
      }
    }
  }
})
