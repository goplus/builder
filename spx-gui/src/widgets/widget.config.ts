/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-27 17:11:17
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-10 20:46:23
 * @FilePath: \spx-gui\src\widgets\widget.config.ts
 * @Description:
 */
import { defineConfig , loadEnv} from 'vite'

import vue from '@vitejs/plugin-vue'
import path from 'path'
import buildLoader from './scripts/build-loader-plugin'
const resolve = (dir: string) => path.join(__dirname, dir)
export default defineConfig(({mode}) => {
  // get the project root's env
  const env = loadEnv(mode, resolve("../../"), '')
  return {
    plugins: [
      vue(
        {
          customElement:true
        }
      ),
      {
        name: 'build',
        writeBundle: (outputOptions) => buildLoader(outputOptions, env.VITE_PUBLISH_BASE_URL)
      }
    ],
    base:env.VITE_PUBLISH_BASE_URL,
    // define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      target: 'esnext',
      outDir: 'dist',
      manifest: true,
      // Do not empty the spx-gui content that has been built
      emptyOutDir:false,
      rollupOptions: {
        input: {
          'spx-runner': resolve('./widget/spx-runner/index.ts'),
        }
      }
    },
    resolve: {
      alias: {
        // '@': fileURLToPath(new URL('./src', import.meta.url))
        '@': resolve('../../src'),
        comps: resolve('../components'),
        apis: resolve('../apis'),
        views: resolve('../views'),
        utils: resolve('../utils'),
        routes: resolve('../routes'),
        styles: resolve('../styles'),
        store: resolve('../store')
      }
    }
  }
})
