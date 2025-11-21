<template>
  <!-- Using v-show preserves some page states, e.g. code editor scroll pos -->
  <UICard
    v-show="isPreviewMode"
    v-radar="{ name: `Editor for ${selected.type}`, desc: `Main editor panel for editing ${selected.type}` }"
    class="main"
  >
    <!--
      TODO: optimize performance for switching between editors, which corresponds to selection change.
      There's known issue with Vue `KeepAlive`:
      * It increases difficulty of implementing the inner components.
        For example: we need to listen to extra events (activated/deactivated) to do initialization and cleanup.
      * We use custom directive to capture UI information, which does not work well with KeepAlive.
        For details, see: https://github.com/vuejs/core/issues/2349
    -->
    <SoundEditor v-if="selected.type === 'sound' && selected.sound != null" :sound="selected.sound" />
    <SpriteEditor
      v-else-if="selected.type === 'sprite' && selected.sprite != null"
      :sprite="selected.sprite"
      :state="editorCtx.state.spriteState!"
    />
    <StageEditor v-else-if="selected.type === 'stage'" :stage="project.stage" :state="editorCtx.state.stageState" />
    <EditorPlaceholder v-else />
  </UICard>
  <div v-show="isPreviewMode" class="sider">
    <EditorPreview />
    <EditorPanels />
  </div>
  <MapEditor
    v-if="!isPreviewMode"
    :project="editorCtx.project"
    :selected-sprite-id="editorCtx.state.selectedSprite?.id ?? null"
    @update:selected-sprite-id="handleSpriteSelect"
  />
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
import { useAgentCopilotCtx } from '@/components/agent-copilot/CopilotProvider.vue'
import {
  addSpriteFromCanvasToolDescription,
  AddSpriteFromCanvasArgsSchema,
  addStageBackdropFromCanvasToolDescription,
  AddStageBackdropFromCanvasArgsSchema,
  addMonitorToolDescription,
  AddMonitorArgsSchema,
  listMonitorsToolDescription,
  ListMonitorsArgsSchema
} from '@/components/agent-copilot/mcp/definitions'
import { genSpriteFromCanvas, genBackdropFromCanvas } from '@/models/common/asset'
import { computed, watchEffect } from 'vue'
import type { z } from 'zod'
import { Monitor } from '@/models/widget/monitor'
import { EditMode } from './editor-state'
import MapEditor from './map-editor/MapEditor.vue'

const editorCtx = useEditorCtx()
const copilotCtx = useAgentCopilotCtx()
const project = computed(() => editorCtx.project)
const selected = computed(() => editorCtx.state.selected)
const isPreviewMode = computed(() => editorCtx.state.selectedEditMode === EditMode.Default)

type AddSpriteFromCanvaOptions = z.infer<typeof AddSpriteFromCanvasArgsSchema>
type AddStageBackdropFromCanvasOptions = z.infer<typeof AddStageBackdropFromCanvasArgsSchema>
type AddMonitorOptions = z.infer<typeof AddMonitorArgsSchema>

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
  editorCtx.state.selectSprite(sprite.id)
  project.value.saveToCloud()
  return {
    success: true,
    message: `Successfully added sprite "${args.spriteName}" to project "${project.value.name}"`
  }
}

async function addBackdropFromCanvas(args: AddStageBackdropFromCanvasOptions) {
  const backdrop = await genBackdropFromCanvas(args.backdropName, 800, 600, args.color)
  project.value.stage.addBackdrop(backdrop)
  editorCtx.state.selectBackdrop(backdrop.id)
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

function handleSpriteSelect(spriteId: string | null) {
  if (spriteId == null) return
  editorCtx.state.selectSprite(spriteId)
}

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
