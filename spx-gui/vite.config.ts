/// <reference types="vitest" />

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueDevTools from 'vite-plugin-vue-devtools'
import { ViteEjsPlugin } from 'vite-plugin-ejs'
import vercel from 'vite-plugin-vercel'
import path from 'path'
// https://vitejs.dev/config/
const resolve = (dir: string) => path.join(__dirname, dir)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue(), VueDevTools(), ViteEjsPlugin(), vercel()],
    resolve: {
      alias: {
        '@': resolve('src'),
        '@docs': resolve('../docs')
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve('index.html'),
          'spx-runner': resolve('src/widgets/spx-runner/index.ts')
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'main') {
              return 'assets/[name]-[hash].js'
            }
            return 'widgets/[name].js'
          }
        }
      }
    },
    optimizeDeps: {
      include: [`monaco-editor/esm/vs/editor/editor.worker`]
    },
    test: { environment: 'happy-dom' },
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    vercel: {
      // TODO: check cache for `public/runner/*`
      // prevent redirection from `/runner/*/runner.html` to `/runner/*/runner`
      cleanUrls: false,
      rewrites: [
        {
          source: '/api/(.*)',
          destination: (env.VITE_VERCEL_PROXIED_API_BASE_URL as string) + '/$1'
        },
        {
          source: '/(.*)',
          destination: '/index.html'
        }
      ],
      headers: [
        {
          source: '/assets/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable'
            }
          ]
        },
        {
          source: '/widgets/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=300'
            }
          ]
        },
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Cross-Origin-Embedder-Policy',
              value: 'credentialless'
            },
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin'
            }
          ]
        },
        {
          source: '/runner/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable'
            }
          ]
        }
      ]
    }
  }
})
