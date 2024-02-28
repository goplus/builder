/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-02-27 17:11:17
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-28 11:19:49
 * @FilePath: \builder\spx-gui\src\widgets\widget.config.ts
 * @Description:
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
const resolve = (dir: string) => path.join(__dirname, dir)
export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {
  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.includes('-')
          }
        }
      })
    ],

    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      target: 'esnext',
      outDir: 'spx-widgets',
      minify: 'terser',
      lib: {
        entry: 'src/widgets/spx-runner/index.ts',
        formats: ['es'],
        name: 'spxWidgets',
        fileName: 'spx-widgets'
      },
      rollupOptions: {
        external: ['../../public/**'] 
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
