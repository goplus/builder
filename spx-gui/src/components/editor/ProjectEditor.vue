<template>
  <UICard class="main">
    <KeepAlive>
      <SoundEditor v-if="editorCtx.project.selectedSound != null" :sound="editorCtx.project.selectedSound" />
      <SpriteEditor v-else-if="editorCtx.project.selectedSprite != null" :sprite="editorCtx.project.selectedSprite" />
      <StageEditor v-else-if="editorCtx.project.selected?.type === 'stage'" :stage="editorCtx.project.stage" />
      <EditorPlaceholder v-else />
    </KeepAlive>
  </UICard>
  <div class="sider">
    <EditorPreview />
    <EditorPanels />
  </div>
</template>

<script setup lang="ts">
import { UICard } from '@/components/ui'
import SoundEditor from './sound/SoundEditor.vue'
import SpriteEditor from './sprite/SpriteEditor.vue'
import StageEditor from './stage/StageEditor.vue'
import EditorPreview from './preview/EditorPreview.vue'
import EditorPanels from './panels/EditorPanels.vue'
import EditorPlaceholder from './common/placeholder/EditorPlaceholder.vue'
import { useEditorCtx } from './EditorContextProvider.vue'
import { onMounted, onBeforeUnmount } from 'vue'
import { useCopilotCtx } from '@/components/copilot/CopilotProvider.vue'
import {
  addSpriteFromAssetArgsSchema,
  addSpriteFromAssetToolDescription,
  searchSpriteFromAssetArgsSchema,
  searchSpriteFromAssetToolDescription,
  addSpriteFromCanvasToolDescription,
  AddSpriteFromCanvasArgsSchema,
  addStageBackdropFromCanvasToolDescription,
  AddStageBackdropFromCanvasArgsSchema,
  addMonitorToolDescription,
  AddMonitorArgsSchema,
  listMonitorsToolDescription,
  ListMonitorsArgsSchema
} from '@/components/copilot/mcp/definitions'
import { selectAsset } from '@/components/asset/index'
import { genSpriteFromCanvas, genBackdropFromCanvas } from '@/models/common/asset'
import { computed, watchEffect } from 'vue'
import type { z } from 'zod'
import { Monitor } from '@/models/widget/monitor'
import { getAsset, listAsset, AssetType, Visibility } from '@/apis/asset'
import { asset2Sprite } from '@/models/common/asset'

const editorCtx = useEditorCtx()
const copilotCtx = useCopilotCtx()
const project = computed(() => editorCtx.project)

type AddSpriteFromCanvaOptions = z.infer<typeof AddSpriteFromCanvasArgsSchema>
type AddStageBackdropFromCanvasOptions = z.infer<typeof AddStageBackdropFromCanvasArgsSchema>
type AddMonitorOptions = z.infer<typeof AddMonitorArgsSchema>
type AddSpriteFromAssetOptions = z.infer<typeof addSpriteFromAssetArgsSchema>
type SearchSpriteFromAssetOptions = z.infer<typeof searchSpriteFromAssetArgsSchema>

async function listMonitors() {
  const monitors = project.value.stage.widgets.filter((widget) => widget instanceof Monitor)
  return {
    success: true,
    message: `Successfully listed ${monitors.length} monitors in project "${project.value.name}"`,
    monitors: monitors.map((monitor) => ({
      name: monitor.name,
      label: monitor.label,
      variableName: monitor.variableName,
      x: monitor.x,
      y: monitor.y,
      size: monitor.size,
      visible: monitor.visible
    }))
  }
}

async function addMonitor(args: AddMonitorOptions) {
  const monitor = await Monitor.create()
  const size = args.size === 0 ? 1 : args.size
  monitor.setName(args.monitorName)
  monitor.setLabel(args.label)
  monitor.setVariableName(args.variableName)
  monitor.setX(args.x)
  monitor.setY(args.y)
  monitor.setSize(size)
  monitor.setVisible(args.visible !== undefined ? args.visible : true)
  project.value.stage.addWidget(monitor)
  return {
    success: true,
    message: `Successfully added monitor "${monitor.name}" to project "${project.value.name}"`
  }
}

async function addSpriteFromCanvas(args: AddSpriteFromCanvaOptions) {
  const sprite = await genSpriteFromCanvas(args.spriteName, args.size, args.size, args.color)
  project.value.addSprite(sprite)
  await sprite.autoFit()
  selectAsset(project.value, sprite)
  project.value.saveToCloud()
  return {
    success: true,
    message: `Successfully added sprite "${args.spriteName}" to project "${project.value.name}"`
  }
}

/**
 * Adds a sprite to the project from an existing asset library.
 * 
 * @param {AddSpriteFromAssetOptions} args - The options for adding the sprite.
 * @param {string} args.assetId - The ID of the asset to convert into a sprite.
 * @returns {Promise<{success: boolean, message: string}>} A promise resolving to an object indicating success and a message.
 */
async function addSpriteFromAsset(args: AddSpriteFromAssetOptions) {
  const asset = await getAsset(args.assetId)
  const sprite = await asset2Sprite(asset)
  project.value.addSprite(sprite)
  await sprite.autoFit()
  selectAsset(project.value, sprite)
  project.value.saveToCloud()
  return {
    success: true,
    message: `Successfully added assetID "${args.assetId}" to project "${project.value.name}"`
  }
}

/**
 * Searches for sprites in the asset library based on a keyword.
 * 
 * @param {SearchSpriteFromAssetOptions} args - The options for searching sprites.
 * @param {string} args.keyword - The keyword to search for.
 * @returns {Promise<{success: boolean, message: string, sprites: Array<{id: string, displayName: string}>}>} A promise resolving to an object indicating success, a message, and the list of found sprites.
 */
async function searchSpriteFromAsset(args: SearchSpriteFromAssetOptions) {
  const assets = await listAsset({
    pageSize: 3,
    pageIndex: 1,
    type: AssetType.Sprite,
    keyword: args.keyword,
    orderBy: 'displayName',
    owner: '*',
    visibility: Visibility.Public
  })

  const sprites = assets.data.map((asset) => ({
    id: asset.id,
    displayName: asset.displayName
  }))
  return {
    success: true,
    message: `Successfully listed sprites matching "${args.keyword}" in project "${project.value.name}"`,
    sprites: sprites
  }
}

async function addBackdropFromCanvas(args: AddStageBackdropFromCanvasOptions) {
  const backdrop = await genBackdropFromCanvas(args.backdropName, 800, 600, args.color)
  project.value.stage.addBackdrop(backdrop)
  selectAsset(project.value, backdrop)
  project.value.saveToCloud()
  return {
    success: true,
    message: `Successfully added backdrop "${args.backdropName}" to project "${project.value.name}"`
  }
}

// Register the tools with the provided descriptions and implementations
function registerProjectTools() {
  copilotCtx.mcp.registry?.registerTools(
    [
      {
        description: addSpriteFromCanvasToolDescription,
        implementation: {
          validate: (args) => {
            const result = AddSpriteFromCanvasArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(`Invalid arguments for ${addSpriteFromCanvasToolDescription.name}: ${result.error}`)
            }
            return result.data
          },
          execute: async (args: AddSpriteFromCanvaOptions) => {
            return addSpriteFromCanvas(args)
          }
        }
      },
      {
        description: addSpriteFromAssetToolDescription,
        implementation: {
          validate: (args) => {
            const result = addSpriteFromAssetArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(`Invalid arguments for ${addSpriteFromAssetToolDescription.name}: ${result.error}`)
            }
            return result.data
          },
          execute: async (args: AddSpriteFromAssetOptions) => {
            return addSpriteFromAsset(args)
          }
        }
      },
      {
        description: searchSpriteFromAssetToolDescription,
        implementation: {
          validate: (args) => {
            const result = searchSpriteFromAssetArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(`Invalid arguments for ${searchSpriteFromAssetToolDescription.name}: ${result.error}`)
            }
            return result.data
          },
          execute: async (args: SearchSpriteFromAssetOptions) => {
            return searchSpriteFromAsset(args)
          }
        }
      },
      {
        description: addStageBackdropFromCanvasToolDescription,
        implementation: {
          validate: (args) => {
            const result = AddStageBackdropFromCanvasArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(
                `Invalid arguments for ${addStageBackdropFromCanvasToolDescription.name}: ${result.error}`
              )
            }
            return result.data
          },
          execute: async (args: AddStageBackdropFromCanvasOptions) => {
            return addBackdropFromCanvas(args)
          }
        }
      },
      {
        description: addMonitorToolDescription,
        implementation: {
          validate: (args) => {
            const result = AddMonitorArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(`Invalid arguments for ${addMonitorToolDescription.name}: ${result.error}`)
            }
            return result.data
          },
          execute: async (args: AddMonitorOptions) => {
            return addMonitor(args)
          }
        }
      },
      {
        description: listMonitorsToolDescription,
        implementation: {
          validate: (args) => {
            const result = ListMonitorsArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(`Invalid arguments for ${listMonitorsToolDescription.name}: ${result.error}`)
            }
            return result.data
          },
          execute: async () => {
            return listMonitors()
          }
        }
      }
    ],
    'project-editor'
  )
}

watchEffect(() => {
  copilotCtx.mcp.collector?.setEnvironmentVar('project_id', project.value.id)
})

// Register the tools when the component is mounted
onMounted(() => {
  registerProjectTools()
})

// Unregister the tools when the component is unmounted
onBeforeUnmount(() => {
  copilotCtx.mcp.registry?.unregisterProviderTools('project-editor')
})
</script>

<style scoped lang="scss">
.main {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: visible; // avoid cutting dropdown menu of CodeTextEditor (monaco)
}
.sider {
  flex: 0 0 492px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);
}
</style>
