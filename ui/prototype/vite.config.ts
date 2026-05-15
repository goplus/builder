import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type PluginOption, type UserConfig } from 'vite'

import spxGuiConfig from '../../spx-gui/vite.config'

const prototypeRoot = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = path.resolve(prototypeRoot, '../..')
const spxGuiRoot = path.resolve(repoRoot, 'spx-gui')
const uiRoot = path.resolve(repoRoot, 'ui')
const spriteItemOverride = path.resolve(
  prototypeRoot,
  'src/overrides/components/ui/block-items/UIEditorSpriteItem.vue'
)
const realSpriteItem = path.resolve(spxGuiRoot, 'src/components/ui/block-items/UIEditorSpriteItem.vue')
const realUiIndex = path.resolve(spxGuiRoot, 'src/components/ui/index.ts')

function flattenPlugins(plugins: PluginOption[] | undefined): PluginOption[] {
  if (plugins == null) return []
  return plugins.flatMap((plugin) => (Array.isArray(plugin) ? flattenPlugins(plugin) : [plugin]))
}

function withoutVercelOutputPlugin(config: UserConfig): PluginOption[] {
  return flattenPlugins(config.plugins).filter((plugin) => {
    if (plugin == null || typeof plugin === 'boolean' || Array.isArray(plugin)) return true
    return plugin.name !== 'local-vercel-output'
  })
}

function prototypeOverlayPlugin(): PluginOption {
  return {
    name: 'builder-prototype-overlay',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source === '@/components/ui/block-items/UIEditorSpriteItem.vue') {
        return spriteItemOverride
      }

      if (source === './block-items/UIEditorSpriteItem.vue' && importer === realUiIndex) {
        return spriteItemOverride
      }

      if (source === realSpriteItem) {
        return spriteItemOverride
      }

      return null
    }
  }
}

export default defineConfig(async (env) => {
  const baseConfig = typeof spxGuiConfig === 'function' ? await spxGuiConfig(env) : spxGuiConfig

  return {
    ...baseConfig,
    root: spxGuiRoot,
    plugins: [prototypeOverlayPlugin(), ...withoutVercelOutputPlugin(baseConfig)],
    build: {
      ...baseConfig.build,
      outDir: path.resolve(prototypeRoot, 'dist'),
      emptyOutDir: true
    },
    server: {
      ...baseConfig.server,
      fs: {
        ...baseConfig.server?.fs,
        allow: Array.from(new Set([...(baseConfig.server?.fs?.allow ?? []), spxGuiRoot, uiRoot, repoRoot]))
      }
    }
  }
})
