/*
 * @Author: Xu Ning
 * @Date: 2024-01-12 11:15:15
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-01 15:44:27
 * @FilePath: /builder/spx-gui/vite.config.ts
 * @Description:
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueDevTools from 'vite-plugin-vue-devtools'
// import wasm from "vite-plugin-wasm";
// import topLevelAwait from "vite-plugin-top-level-await";
import path from 'path'
// https://vitejs.dev/config/
const resolve = (dir: string) => path.join(__dirname, dir)
export default defineConfig({
  plugins: [
    vue(),
    VueDevTools(),
    // wasm(),
    // topLevelAwait()
  ],
  resolve: {
    alias: {
      // '@': fileURLToPath(new URL('./src', import.meta.url))
      '@': resolve('src'),
      comps: resolve('src/components'),
      apis: resolve('src/apis'),
      views: resolve('src/views'),
      utils: resolve('src/utils'),
      routes: resolve('src/routes'),
      styles: resolve('src/styles'),
      store: resolve('src/store')
    }
  },
  optimizeDeps: {
    include: [
      `monaco-editor/esm/vs/editor/editor.worker`
    ]
  }
})
