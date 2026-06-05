import path from 'node:path'
import fs from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import browserslistToEsbuild from 'browserslist-to-esbuild'

import { createVercelOutputPlugin } from './vercel-output-plugin.js'

const resolve = (dir: string) => path.join(__dirname, dir)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const vercelProxiedApiBaseURL =
    env.VITE_VERCEL_PROXIED_API_BASE_URL == null ? null : env.VITE_VERCEL_PROXIED_API_BASE_URL
  const accountWebTestOrigin = env.VITE_ACCOUNT_WEB_TEST_ORIGIN?.trim() || null
  const accountWebTestHost = accountWebTestOrigin == null ? null : new URL(accountWebTestOrigin).host

  return {
    plugins: [
      {
        name: 'account-web-rename-output-html',
        apply: 'build',
        closeBundle() {
          const from = resolve('dist/account.html')
          const to = resolve('dist/index.html')
          if (fs.existsSync(from)) fs.renameSync(from, to)
        }
      },
      {
        name: 'account-web-dev-spa-fallback',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url == null) return next()
            const pathname = new URL(req.url, 'http://localhost').pathname
            // Skip Vite internal requests
            if (pathname.startsWith('/@')) return next()
            // Skip requests for static assets (have file extensions)
            if (pathname.includes('.')) return next()
            // Skip API proxy requests
            if (pathname.startsWith('/api/')) return next()
            // Skip the entry HTML itself
            if (pathname === '/account.html') return next()
            // SPA fallback: serve account.html for unmatched HTML routes (e.g. /sign-in)
            req.url = '/account.html'
            next()
          })
        }
      },
      vue(),
      tailwindcss(),
      createVercelOutputPlugin({
        headers: [
          {
            source: '/(.*)',
            headers: [
              {
                key: 'Cache-Control',
                value: 'public, max-age=300'
              },
              {
                key: 'Cross-Origin-Embedder-Policy',
                value: 'require-corp'
              },
              {
                key: 'Cross-Origin-Opener-Policy',
                value: 'same-origin'
              }
            ]
          },
          {
            source: '/assets/(.*)',
            headers: [
              {
                key: 'Cache-Control',
                value: 'public, max-age=31536000, immutable'
              }
            ]
          }
        ],
        rewrites: [
          {
            source: '/api/(.*)',
            destination: vercelProxiedApiBaseURL == null ? null : `${vercelProxiedApiBaseURL}/$1`
          },
          {
            source: '/(.*)',
            destination: '/index.html'
          }
        ]
      })
    ],
    resolve: {
      alias: {
        '@': resolve('src'),
        '@docs': resolve('../docs')
      }
    },
    publicDir: false,
    build: {
      target: browserslistToEsbuild(),
      rolldownOptions: {
        input: {
          'sign-in': resolve('account.html')
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js'
        }
      }
    },
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      },
      allowedHosts: accountWebTestHost == null ? undefined : [accountWebTestHost],
      proxy: (() => {
        const target = env.VITE_API_BASE_URL
        if (!target) return undefined
        return {
          '/api': {
            target,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/api/, '/account'),
            configure(proxy) {
              if (accountWebTestOrigin == null) return
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('Origin', accountWebTestOrigin)
              })
            }
          }
        }
      })()
    }
  }
})
