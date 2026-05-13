import { fileURLToPath, URL } from 'node:url'

import { defineConfig, mergeConfig, type ConfigEnv, type UserConfig, type UserConfigExport } from 'vite'

import spxGuiConfig from '../../spx-gui/vite.config'

const prototypeRoot = fileURLToPath(new URL('.', import.meta.url))
const prototypeSrc = fileURLToPath(new URL('./src', import.meta.url))
const prototypeTutorialsPage = fileURLToPath(new URL('./src/pages/tutorials/index.vue', import.meta.url))
const prototypeCourseSeriesItem = fileURLToPath(
  new URL('./src/components/tutorials/CourseSeriesItem.vue', import.meta.url)
)
const prototypeTutorialsBanner = fileURLToPath(
  new URL('./src/components/tutorials/TutorialsBanner.vue', import.meta.url)
)
const prototypeCommunityNavbar = fileURLToPath(
  new URL('./src/components/community/CommunityNavbar.vue', import.meta.url)
)
const prototypeCenteredWrapper = fileURLToPath(
  new URL('./src/components/community/CenteredWrapper.vue', import.meta.url)
)
const prototypeNavbarWrapper = fileURLToPath(new URL('./src/components/navbar/NavbarWrapper.vue', import.meta.url))
const prototypeEditorPage = fileURLToPath(new URL('./src/pages/editor/index.vue', import.meta.url))
const prototypeProjectEditor = fileURLToPath(new URL('./src/components/editor/ProjectEditor.vue', import.meta.url))
const prototypeSpriteEditor = fileURLToPath(new URL('./src/components/editor/sprite/SpriteEditor.vue', import.meta.url))
const prototypeCostumesEditor = fileURLToPath(
  new URL('./src/components/editor/sprite/CostumesEditor.vue', import.meta.url)
)
const prototypeAnimationEditor = fileURLToPath(
  new URL('./src/components/editor/sprite/AnimationEditor.vue', import.meta.url)
)
const prototypeWasmRoot = fileURLToPath(new URL('./src/assets/wasm', import.meta.url))
const uiImagesRoot = fileURLToPath(new URL('../images', import.meta.url))
const spxGuiRoot = fileURLToPath(new URL('../../spx-gui', import.meta.url))

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
        name: 'prototype-wasm-assets',
        enforce: 'pre',
        resolveId(source) {
          if (!source.startsWith('@/assets/wasm/')) return
          return fileURLToPath(
            new URL(`./src/assets/wasm/${source.slice('@/assets/wasm/'.length)}`, import.meta.url)
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
          find: /^@\/components\/tutorials\/CourseSeriesItem\.vue$/,
          replacement: prototypeCourseSeriesItem
        },
        {
          find: /^@\/components\/tutorials\/TutorialsBanner\.vue$/,
          replacement: prototypeTutorialsBanner
        },
        {
          find: /^@\/components\/community\/CommunityNavbar\.vue$/,
          replacement: prototypeCommunityNavbar
        },
        {
          find: /^@\/components\/community\/CenteredWrapper\.vue$/,
          replacement: prototypeCenteredWrapper
        },
        {
          find: /^@\/components\/navbar\/NavbarWrapper\.vue$/,
          replacement: prototypeNavbarWrapper
        },
        {
          find: /^@\/pages\/editor\/index\.vue$/,
          replacement: prototypeEditorPage
        },
        {
          find: /^@\/components\/editor\/ProjectEditor\.vue$/,
          replacement: prototypeProjectEditor
        },
        {
          find: /^@\/components\/editor\/sprite\/SpriteEditor\.vue$/,
          replacement: prototypeSpriteEditor
        },
        {
          find: /^@\/components\/editor\/sprite\/CostumesEditor\.vue$/,
          replacement: prototypeCostumesEditor
        },
        {
          find: /^@\/components\/editor\/sprite\/AnimationEditor\.vue$/,
          replacement: prototypeAnimationEditor
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
          find: '@/assets/wasm',
          replacement: prototypeWasmRoot
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
