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
import { registerTools, unregisterProviderTools } from '@/components/copilot/mcp/registry'
import {
  addSpriteFromCanvasToolDescription,
  AddSpriteFromCanvasArgsSchema,
  addStageBackdropFromCanvasToolDescription,
  AddStageBackdropFromCanvasArgsSchema,
  RunGameArgsSchema,
  runGameToolDescription,
  StopGameArgsSchema,
  stopGameToolDescription
} from '@/components/copilot/mcp/definitions'
import { selectAsset } from '@/components/asset/index'
import { genSpriteFromCanvas, genBackdropFromCanvas } from '@/models/common/asset'
import { computed } from 'vue'
import type { z } from 'zod'

// 注入必要的依赖
const editorCtx = useEditorCtx()
const project = computed(() => editorCtx.project)
const runtime = computed(() => editorCtx.runtime)

// 工具参数类型定义
type AddSpriteFromCanvaOptions = z.infer<typeof AddSpriteFromCanvasArgsSchema>
type AddStageBackdropFromCanvasOptions = z.infer<typeof AddStageBackdropFromCanvasArgsSchema>
type RunGameOptions = z.infer<typeof RunGameArgsSchema>
type StopGameOptions = z.infer<typeof StopGameArgsSchema>

// 从代码编辑器迁移过来的方法
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

async function runGame(args: RunGameOptions) {
  if (project.value.name != args.projectName) {
    return {
      success: false,
      message: `Failed to runGame: Project name mismatch. Expected "${args.projectName}", but got "${project.value.name}"`
    }
  }
  try {
    runtime.value.setRunning({ mode: 'debug', initializing: true })
    return {
      success: true,
      message: `Successfully runned the project "${project.value.name}"`
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to runGame:`, errorMessage)

    return {
      success: false,
      message: `Failed to runGame: ${errorMessage}`
    }
  }
}

async function stopGame(args: StopGameOptions) {
  if (project.value.name != args.projectName) {
    return {
      success: false,
      message: `Failed to stopGame: Project name mismatch. Expected "${args.projectName}", but got "${project.value.name}"`
    }
  }
  try {
    runtime.value.setRunning({ mode: 'none' })
    return {
      success: true,
      message: `Successfully stopped the project "${project.value.name}"`
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to stopGame:`, errorMessage)

    return {
      success: false,
      message: `Failed to stopGame: ${errorMessage}`
    }
  }
}

// 注册 MCP 工具
function registerProjectTools() {
  registerTools(
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
        description: runGameToolDescription,
        implementation: {
          validate: (args) => {
            const result = RunGameArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(`Invalid arguments for ${runGameToolDescription.name}: ${result.error}`)
            }
            return result.data
          },
          execute: async (args: RunGameOptions) => {
            return runGame(args)
          }
        }
      },
      {
        description: stopGameToolDescription,
        implementation: {
          validate: (args) => {
            const result = StopGameArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(`Invalid arguments for ${stopGameToolDescription.name}: ${result.error}`)
            }
            return result.data
          },
          execute: async (args: StopGameOptions) => {
            return stopGame(args)
          }
        }
      }
    ],
    'project-editor'
  )
}

// 在组件挂载时注册工具
onMounted(() => {
  registerProjectTools()
})

// 在组件卸载前取消注册
onBeforeUnmount(() => {
  unregisterProviderTools('project-editor')
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
