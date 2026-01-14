/// <reference types="vitest" />

import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const resolve = (dir: string) => path.join(__dirname, dir)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve('src'),
      '@docs': resolve('../docs')
    }
  },
  test: {
    environment: 'happy-dom',
    alias: [
      {
        find: /^monaco-editor$/,
        replacement: resolve('node_modules/monaco-editor/esm/vs/editor/editor.api')
      }
    ]
  }
})
