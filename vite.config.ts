import type { ProxyOptions } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const DEV_PROXY_PREFIX = '/__pulse_proxy__'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawPulseBaseUrl = env.VITE_PULSE_BASE_URL?.trim()

  let proxy: Record<string, ProxyOptions> | undefined

  if (rawPulseBaseUrl) {
    try {
      const parsed = new URL(rawPulseBaseUrl)
      const basePath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')

      proxy = {
        [DEV_PROXY_PREFIX]: {
          target: parsed.origin,
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => {
            const nextPath = path.slice(DEV_PROXY_PREFIX.length)
            return `${basePath}${nextPath}` || '/'
          },
        },
      }
    } catch {
      proxy = undefined
    }
  }

  return {
    plugins: [vue()],
    server: proxy ? { proxy } : undefined,
  }
})
