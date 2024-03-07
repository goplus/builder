/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-27 17:11:17
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-07 18:28:34
 * @FilePath: \spx-gui\src\widgets\widget.config.ts
 * @Description:
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import buildLoader from './build-loader'
const resolve = (dir: string) => path.join(__dirname, dir)
const BASEURL = 'https://qiniu.com/'
export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {
  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.includes('-')
          }
        }
      }),
      {
        name: 'build',
        // writeBundle hook can't get the baseurl
        writeBundle: (outputOptions) => buildLoader(outputOptions, BASEURL)
      }
    ],
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      target: 'esnext',
      outDir: 'spx-widgets',
      minify: 'terser',
      manifest: true,
      rollupOptions: {
        input: 'src/widgets/spx-runner/index.ts'
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
