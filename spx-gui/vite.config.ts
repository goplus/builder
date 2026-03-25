/// <reference types="vitest" />

import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { ViteEjsPlugin } from 'vite-plugin-ejs'
import browserslistToEsbuild from 'browserslist-to-esbuild'

import { createVercelOutputPlugin } from './vercel-output-plugin.js'

const resolve = (dir: string) => path.join(__dirname, dir)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const vercelProxiedApiBaseURL = env.VITE_VERCEL_PROXIED_API_BASE_URL == null ? null : env.VITE_VERCEL_PROXIED_API_BASE_URL

  return {
    plugins: [
      vue(),
      ViteEjsPlugin(),
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
            source: '/widgets/(.*)',
            headers: [
              {
                key: 'Cache-Control',
                value: 'public, max-age=300'
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
          },
          {
            source: '/spx_(.*)',
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
    build: {
      target: browserslistToEsbuild(),
      rolldownOptions: {
        input: {
          main: resolve('index.html'),
          'spx-runner': resolve('src/widgets/spx-runner/index.ts')
        },
        output: {
          entryFileNames: (chunkInfo: { name: string }) => {
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
    test: {
      environment: 'happy-dom',
      alias: [
        // Alias for `monaco-editor` to avoid `Failed to resolve entry for package "monaco-editor"`, for details: https://github.com/vitest-dev/vitest/discussions/1806
        {
          find: /^monaco-editor$/,
          replacement: resolve('node_modules/monaco-editor/esm/vs/editor/editor.api')
        }
      ]
    },
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      },
      proxy: (() => {
        const target = env.VITE_DEV_PROXIED_API_BASE_URL
        if (!target) return undefined
        return {
          '/api': {
            target,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/api/, '')
          }
        }
      })()
    }
  }
})
