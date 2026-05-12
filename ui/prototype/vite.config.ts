import { fileURLToPath, URL } from 'node:url'

import { defineConfig, mergeConfig, type ConfigEnv, type UserConfig, type UserConfigExport } from 'vite'

import spxGuiConfig from '../../spx-gui/vite.config'

const prototypeRoot = fileURLToPath(new URL('.', import.meta.url))
const prototypeSrc = fileURLToPath(new URL('./src', import.meta.url))
const prototypeTutorialsPage = fileURLToPath(new URL('./src/pages/tutorials/index.vue', import.meta.url))
const uiImagesRoot = fileURLToPath(new URL('../images', import.meta.url))
const spxGuiRoot = fileURLToPath(new URL('../../spx-gui', import.meta.url))
const spxGuiRouter = fileURLToPath(new URL('../../spx-gui/src/router.ts', import.meta.url))

async function resolveUserConfig(config: UserConfigExport, env: ConfigEnv): Promise<UserConfig> {
  if (typeof config === 'function') {
    return await config(env)
  }
  return await config
}

async function loadSpxGuiConfig(env: ConfigEnv) {
  const originalCwd = process.cwd()
  process.chdir(spxGuiRoot)
  try {
    return await resolveUserConfig(spxGuiConfig, env)
  } finally {
    process.chdir(originalCwd)
  }
}

export default defineConfig(async (env) => {
  const baseConfig = await loadSpxGuiConfig(env)

  return mergeConfig(baseConfig, {
    root: spxGuiRoot,
    envDir: spxGuiRoot,
    plugins: [
      {
        name: 'prototype-home-redirect',
        enforce: 'pre',
        transform(code, id) {
          if (id !== spxGuiRouter) return
          return code.replace(
            `{
        path: '/',
        name: homePageName,
        component: () => import('@/pages/community/home.vue')
      }`,
            `{
        path: '/',
        name: homePageName,
        redirect: '/tutorials'
      }`
          )
        }
      }
    ],
    resolve: {
      alias: [
        {
          find: /^@\/pages\/tutorials\/index\.vue$/,
          replacement: prototypeTutorialsPage
        },
        {
          find: '@prototype',
          replacement: prototypeSrc
        },
        {
          find: '@ui-images',
          replacement: uiImagesRoot
        },
        {
          find: 'vue',
          replacement: fileURLToPath(
            new URL('../../spx-gui/node_modules/vue/dist/vue.runtime.esm-bundler.js', import.meta.url)
          )
        },
        {
          find: 'vue-router',
          replacement: fileURLToPath(
            new URL('../../spx-gui/node_modules/vue-router/dist/vue-router.mjs', import.meta.url)
          )
        }
      ]
    },
    build: {
      outDir: fileURLToPath(new URL('./dist', import.meta.url)),
      emptyOutDir: true
    },
    server: {
      fs: {
        allow: [spxGuiRoot, prototypeRoot, uiImagesRoot, fileURLToPath(new URL('../..', import.meta.url))]
      }
    }
  })
})
