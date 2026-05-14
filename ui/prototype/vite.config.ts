import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const prototypeRoot = fileURLToPath(new URL('.', import.meta.url))
const prototypeSrc = fileURLToPath(new URL('./src', import.meta.url))
const uiImagesRoot = fileURLToPath(new URL('../images', import.meta.url))

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': prototypeSrc,
      '@ui-images': uiImagesRoot
    }
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true
  },
  server: {
    fs: {
      allow: [prototypeRoot, uiImagesRoot, fileURLToPath(new URL('..', import.meta.url))]
    }
  }
})
