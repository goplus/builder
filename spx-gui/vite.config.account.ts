import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin, ProxyOptions } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import browserslistToEsbuild from 'browserslist-to-esbuild'

import { createBrowserHijackPlugin } from './build/vite-plugins/browser-hijack-plugin.js'
import { createAppHtmlEntryPlugin } from './build/vite-plugins/app-html-entry-plugin.js'

const resolve = (dir: string) => path.join(__dirname, dir)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const accountWebOrigin = env.VITE_ACCOUNT_WEB_ORIGIN ?? ''
  const accountAPIProxyTarget = env.VITE_ACCOUNT_API_PROXY_TARGET ?? ''

  const accountBrowserHijackPlugins: Plugin[] = []
  if (mode === 'development') {
    if (accountWebOrigin === '') throw new Error('VITE_ACCOUNT_WEB_ORIGIN is required for Account development')
    accountBrowserHijackPlugins.push(
      createBrowserHijackPlugin({
        origin: accountWebOrigin,
        routes: ['/sign-in', '/api/identity-providers/*/callback'],
        chromeStartURL: 'http://localhost:5173'
      })
    )
  }

  const proxy: Record<string, ProxyOptions> = {}
  if (accountAPIProxyTarget !== '') {
    if (accountWebOrigin === '') throw new Error('VITE_ACCOUNT_WEB_ORIGIN is required for Account API proxy')
    const accountWebURL = new URL(accountWebOrigin)
    proxy['/api'] = {
      target: accountAPIProxyTarget,
      // Let http-proxy use the target host for HTTPS connection setup and certificate validation.
      // The headers seen by the backend are still overwritten below to match Account Web origin.
      changeOrigin: true,
      configure(proxy) {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader('Host', accountWebURL.host)
          proxyReq.setHeader('Origin', accountWebURL.origin)
          proxyReq.setHeader('X-Forwarded-Host', accountWebURL.host)
          proxyReq.setHeader('X-Forwarded-Proto', accountWebURL.protocol.slice(0, -1))
        })
      }
    }
  }

  return {
    plugins: [
      ...accountBrowserHijackPlugins,
      createAppHtmlEntryPlugin(resolve('src/apps/account/index.html')),
      vue(),
      tailwindcss()
    ],
    resolve: {
      alias: {
        '@': resolve('src'),
        '@docs': resolve('../docs')
      }
    },
    // Now account app doesn't have static assets.
    // Setting `publicDir` to false can speed up the build by skipping unnecessary files.
    publicDir: false,
    build: {
      target: browserslistToEsbuild()
    },
    server: { proxy }
  }
})
