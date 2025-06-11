<script lang="ts">
import type { InjectionKey } from 'vue'
import { until } from '@/utils/utils'

export type McpConnectionStatus = {
  client: boolean
  server: boolean
  lastUpdate: number
}

export type RequestHistoryItem = {
  tool: string
  params: any
  response: string
  time: string
  error?: boolean
}

/**
 * Copilot context interface
 * Defines the shared state and controls for the Copilot system
 */
export type CopilotCtx = {
  controller: CopilotController | null
  copilot: ICopilot | null
  visible: boolean
  mcpDebuggerVisible: boolean
  mcp: {
    client: Ref<Client | null>
    server: Ref<Server | null>
    status: {
      client: boolean
      server: boolean
      lastUpdate: number
    }
    history: {
      requests: Ref<RequestHistoryItem[]>
      addRequest: (item: RequestHistoryItem) => void
      updateLastResponse: (response: string, isError?: boolean) => void
      clear: () => void
    }
    collector: Collector | null
    registry: ToolRegistry | null
  }
  controls: {
    open: (problem?: string, prompt?: string) => Promise<boolean>
    close: () => void
    toggle: () => Promise<boolean>
    mcpDebugger: {
      open: () => Promise<boolean>
      close: () => void
      toggle: () => Promise<boolean>
    }
    env: {
      open: () => void
      close: () => void
      toggle: () => void
    }
  }
}

/**
 * Injection key for Copilot context
 */
const copilotCtxInjectionKey: InjectionKey<CopilotCtx> = Symbol('copilot-ctx')

/**
 * Hook to access Copilot context
 * @throws Error if used outside CopilotProvider
 */
export function useCopilotCtx() {
  const ctx = inject(copilotCtxInjectionKey)
  if (ctx == null) throw new Error('useCopilotCtx should be called inside of CopilotProvider')
  return ctx
}
</script>

<script setup lang="ts">
/**
 * CopilotProvider Component
 *
 * Provides Copilot context and services to all child components.
 * Handles initialization of Copilot, MCP connections, and UI rendering.
 */
import { reactive, inject, ref, provide, onBeforeUnmount, computed, type Ref, watch } from 'vue'
import { computedShallowReactive } from '@/utils/utils'
import { useI18n } from '@/utils/i18n'
import { Copilot } from './copilot'
import { CopilotController, type ICopilot } from './index'
import { createMcpClient } from './mcp/client'
import { createMcpServer } from './mcp/server'
import { createMcpTransports } from './mcp/transport'
import { ToolRegistry } from './mcp/registry'
import { Collector } from './mcp/collector'
import CopilotUI from './CopilotUI.vue'
import { z } from 'zod'
import { useUserStore } from '@/stores/user'
import { createProjectToolDescription, CreateProjectArgsSchema } from './mcp/definitions'
import { getProject, Visibility } from '@/apis/project'
import { useRouter } from 'vue-router'
import { getProjectEditorRoute } from '@/router'
import { Project } from '@/models/project'
import { genAssetFromCanvas } from '@/models/common/asset'
import McpDebugger from './mcp/McpDebugger.vue'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import dockLeft from './dock-left.svg?raw'
import dockRight from './dock-right.svg?raw'
import dockBottom from './dock-bottom.svg?raw'
import dockFloating from './dock-floating.svg?raw'
import EnvPanel from './EnvPanel.vue'

// Component state using refs
const visible = ref(false)
const mcpDebuggerVisible = ref(false)
const showEnvPanel = ref(false)
const router = useRouter()

const toggleEnvPanel = () => {
  showEnvPanel.value = !showEnvPanel.value
}

// MCP connection status
const mcpConnectionStatus = reactive<McpConnectionStatus>({
  client: false,
  server: false,
  lastUpdate: Date.now()
})

// MCP request history
const mcpRequests = ref<RequestHistoryItem[]>([])

// History management methods
const mcpHistory = {
  requests: mcpRequests,
  addRequest: (item: RequestHistoryItem) => {
    mcpRequests.value.unshift(item)
  },
  updateLastResponse: (response: string, isError = false) => {
    if (mcpRequests.value.length > 0) {
      mcpRequests.value[0].response = response
      if (isError) {
        mcpRequests.value[0].error = true
      }
    }
  },
  clear: () => {
    mcpRequests.value = []
  }
}

type CreateProjectOptions = z.infer<typeof CreateProjectArgsSchema>

const registry = new ToolRegistry()
const collector = new Collector()

const initBasicTools = async () => {
  return registry.registerTools(
    [
      {
        description: createProjectToolDescription,
        implementation: {
          validate: (args) => {
            const result = CreateProjectArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(`Invalid arguments for ${createProjectToolDescription.name}: ${result.error}`)
            }
            return result.data
          },
          execute: async (args: CreateProjectOptions) => {
            return createProject(args)
          }
        }
      }
    ],
    'basic-tools'
  )
}

async function createProject(options: CreateProjectOptions) {
  const projectName = options.projectName

  // Check if user is signed in
  const userStore = useUserStore()
  const signedInUser = computed(() => userStore.getSignedInUser())
  if (signedInUser.value == null) {
    return {
      success: false,
      message: 'Please sign in to create a project'
    }
  }

  const username = signedInUser.value.name

  try {
    // Check if project already exists
    const project = await getProject(username, options.projectName)
    if (project != null) {
      return {
        success: false,
        message: `Project "${projectName}" already exists`
      }
    }
  } catch (e) {
    // Handle error checking project existence
  }

  const project = new Project(username, projectName)
  project.setVisibility(Visibility.Private)

  try {
    const thumbnail = await genAssetFromCanvas('stage.png', 800, 600, '#000000')
    project.setThumbnail(thumbnail)
    await project.saveToCloud()

    const projectRoute = getProjectEditorRoute(projectName)

    router.push(projectRoute)
    await waitToolRegister()
    return {
      success: true,
      message: `Project "${projectName}" created successfully; please create Sprite and Stage Backdrop before inserting the code`
    }
  } catch (error) {
    // Handle project creation error
    const errorMessage = error instanceof Error ? error.message : String(error)

    return {
      success: false,
      message: `Failed to create project: ${errorMessage}`
    }
  }
}

/**
 * Wait for tool registration
 */
async function waitToolRegister(): Promise<void> {
  return until(() => registry.isToolRegistered('write_to_file'))
}

type DockPosition = 'left' | 'bottom' | 'right' | 'floating'
const copilotPosition = ref<DockPosition>('floating')

const showCopilotPositionMenu = ref(false)

const toggleCopilotPositionMenu = () => {
  showCopilotPositionMenu.value = !showCopilotPositionMenu.value
}

const hidePositionMenus = () => {
  showCopilotPositionMenu.value = false
}

const changeCopilotPosition = (position: DockPosition) => {
  copilotPosition.value = position
  hidePositionMenus()
}

const copilotContainerStyle = computed(() => {
  switch (copilotPosition.value) {
    case 'left':
      return {
        top: '0',
        left: '0',
        width: copilotSize.width,
        height: '100vh',
        flexDirection: 'column' as const
      }
    case 'right':
      return {
        top: '0',
        right: '0',
        width: copilotSize.width,
        height: '100vh',
        flexDirection: 'column' as const
      }
    case 'bottom':
      return {
        bottom: '0',
        left: '0',
        width: '100%',
        height: copilotSize.height,
        flexDirection: 'row' as const
      }
    case 'floating':
      return {
        top: `${copilotFloatingPosition.y}px`,
        left: `${copilotFloatingPosition.x}px`,
        width: copilotSize.width,
        height: copilotSize.height,
        flexDirection: 'column' as const
      }
    default:
      return {
        top: `${copilotFloatingPosition.y}px`,
        left: `${copilotFloatingPosition.x}px`,
        width: copilotSize.width,
        height: copilotSize.height,
        flexDirection: 'column' as const
      }
  }
})

const positionOptions = [
  { id: 'floating', label: 'Floating', icon: 'dockFloating' as const },
  { id: 'left', label: 'Left', icon: 'dockLeft' as const },
  { id: 'bottom', label: 'Bottom', icon: 'dockBottom' as const },
  { id: 'right', label: 'Right', icon: 'dockRight' as const }
]

const positionMenuStyle = computed(() => {
  const headerHeight = 48

  switch (copilotPosition.value) {
    case 'left':
      return {
        top: `${headerHeight}px`,
        left: '12px',
        zIndex: 1002
      }
    case 'right':
      return {
        top: `${headerHeight}px`,
        right: '12px',
        zIndex: 1002
      }
    case 'bottom':
      return {
        top: `${headerHeight}px`,
        right: '12px',
        zIndex: 1002,
        width: '250px' // Set specific width for bottom position
      }
    case 'floating':
      return {
        top: `${headerHeight}px`,
        right: '12px',
        zIndex: 1002
      }
    default:
      return {
        top: `${headerHeight}px`,
        left: '12px',
        zIndex: 1002
      }
  }
})

const copilotSize = reactive({
  width: '400px',
  height: '600px',
  dragging: false,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0
})

// Position state for floating mode
const copilotFloatingPosition = reactive({
  x: Math.max(100, (window.innerWidth - 400) / 2), // Center horizontally
  y: Math.max(100, (window.innerHeight - 600) / 2), // Center vertically
  dragging: false,
  startX: 0,
  startY: 0,
  startPosX: 0,
  startPosY: 0
})

const handleDragStart = (event: MouseEvent) => {
  copilotSize.dragging = true
  copilotSize.startX = event.clientX
  copilotSize.startY = event.clientY

  if (copilotPosition.value === 'left' || copilotPosition.value === 'right') {
    // Convert percentage width to pixels before starting the drag
    if (copilotSize.width.endsWith('%')) {
      const containerWidth = window.innerWidth
      const percentValue = parseFloat(copilotSize.width)
      copilotSize.startWidth = (containerWidth * percentValue) / 100
      // Update the width to pixel value before starting the drag
      copilotSize.width = `${copilotSize.startWidth}px`
    } else {
      copilotSize.startWidth = parseFloat(copilotSize.width)
    }
  } else if (copilotPosition.value === 'floating') {
    copilotSize.startWidth = parseFloat(copilotSize.width)
    copilotSize.startHeight = parseFloat(copilotSize.height)
  } else {
    copilotSize.startHeight = parseFloat(copilotSize.height)
  }

  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)

  if (copilotPosition.value === 'floating') {
    document.body.style.cursor = 'nwse-resize'
  } else {
    document.body.style.cursor = copilotPosition.value === 'bottom' ? 'ns-resize' : 'ew-resize'
  }
  document.body.style.userSelect = 'none'
}

// Handle position dragging for floating mode
const handlePositionDragStart = (event: MouseEvent) => {
  if (copilotPosition.value !== 'floating') return
  
  copilotFloatingPosition.dragging = true
  copilotFloatingPosition.startX = event.clientX
  copilotFloatingPosition.startY = event.clientY
  copilotFloatingPosition.startPosX = copilotFloatingPosition.x
  copilotFloatingPosition.startPosY = copilotFloatingPosition.y

  document.addEventListener('mousemove', handlePositionDragMove)
  document.addEventListener('mouseup', handlePositionDragEnd)

  document.body.style.cursor = 'move'
  document.body.style.userSelect = 'none'
}

const handlePositionDragMove = (event: MouseEvent) => {
  if (!copilotFloatingPosition.dragging) return

  const deltaX = event.clientX - copilotFloatingPosition.startX
  const deltaY = event.clientY - copilotFloatingPosition.startY

  const newX = copilotFloatingPosition.startPosX + deltaX
  const newY = copilotFloatingPosition.startPosY + deltaY

  // Constrain to viewport with some padding
  const padding = 20
  const maxX = Math.max(padding, window.innerWidth - parseFloat(copilotSize.width) - padding)
  const maxY = Math.max(padding, window.innerHeight - parseFloat(copilotSize.height) - padding)

  copilotFloatingPosition.x = Math.max(padding, Math.min(newX, maxX))
  copilotFloatingPosition.y = Math.max(padding, Math.min(newY, maxY))
}

const handlePositionDragEnd = () => {
  copilotFloatingPosition.dragging = false

  document.removeEventListener('mousemove', handlePositionDragMove)
  document.removeEventListener('mouseup', handlePositionDragEnd)

  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

const handleDragMove = (event: MouseEvent) => {
  if (!copilotSize.dragging) return

  if (copilotPosition.value === 'left') {
    const deltaX = event.clientX - copilotSize.startX
    const newWidth = copilotSize.startWidth + deltaX
    const minWidth = 100
    const maxWidth = window.innerWidth * 0.4
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      copilotSize.width = `${newWidth}px`
    }
  } else if (copilotPosition.value === 'right') {
    const deltaX = copilotSize.startX - event.clientX
    const newWidth = copilotSize.startWidth + deltaX
    const minWidth = 100
    const maxWidth = window.innerWidth * 0.4

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      copilotSize.width = `${newWidth}px`
    }
  } else if (copilotPosition.value === 'bottom') {
    const deltaY = copilotSize.startY - event.clientY
    const newHeight = copilotSize.startHeight + deltaY
    const minHeight = 150
    const maxHeight = window.innerHeight * 0.6

    if (newHeight >= minHeight && newHeight <= maxHeight) {
      copilotSize.height = `${newHeight}px`
    }
  } else if (copilotPosition.value === 'floating') {
    const deltaX = event.clientX - copilotSize.startX
    const deltaY = event.clientY - copilotSize.startY
    
    const newWidth = copilotSize.startWidth + deltaX
    const newHeight = copilotSize.startHeight + deltaY
    
    const minWidth = 300
    const maxWidth = window.innerWidth * 0.8
    const minHeight = 200
    const maxHeight = window.innerHeight * 0.8

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      copilotSize.width = `${newWidth}px`
    }
    if (newHeight >= minHeight && newHeight <= maxHeight) {
      copilotSize.height = `${newHeight}px`
    }
  }
}

const handleDragEnd = () => {
  copilotSize.dragging = false

  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)

  const container = document.querySelector('.copilot-chat-container') as HTMLElement
  if (container) {
    container.classList.remove('dragging')
  }

  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

watch(
  () => copilotPosition.value,
  () => {
    if (copilotPosition.value === 'left' || copilotPosition.value === 'right') {
      copilotSize.width = '15%'
    } else if (copilotPosition.value === 'bottom') {
      copilotSize.height = '300px'
    } else if (copilotPosition.value === 'floating') {
      copilotSize.width = '400px'
      copilotSize.height = '600px'
    }
  }
)

/**
 * Visibility controls with automatic initialization
 */
const controls = {
  /**
   * Open the chat UI, ensuring Copilot is initialized first
   */
  open: async (problem?: string, prompt?: string): Promise<boolean> => {
    visible.value = true
    if (prompt != null) {
      copilotController.startChat(problem ?? '', prompt)
    }
    return true
  },

  /**
   * Close the chat UI
   */
  close: () => {
    visible.value = false
  },

  /**
   * Toggle chat UI visibility
   * Ensures Copilot is initialized before showing UI
   */
  toggle: async (): Promise<boolean> => {
    if (visible.value) {
      controls.close()
      return false
    } else {
      return await controls.open()
    }
  },

  /**
   * McpDebugger Controls
   */
  mcpDebugger: {
    open: async (): Promise<boolean> => {
      mcpDebuggerVisible.value = true
      return true
    },

    close: () => {
      mcpDebuggerVisible.value = false
    },

    toggle: async (): Promise<boolean> => {
      if (mcpDebuggerVisible.value) {
        controls.mcpDebugger.close()
        return false
      } else {
        return await controls.mcpDebugger.open()
      }
    }
  },
  env: {
    open: () => {
      showEnvPanel.value = true
    },
    close: () => {
      showEnvPanel.value = false
    },
    toggle: () => {
      toggleEnvPanel()
    }
  },
  position: {
    copilot: {
      set: (position: DockPosition) => {
        copilotPosition.value = position
      },
      get: () => copilotPosition.value,
      toggle: toggleCopilotPositionMenu,
      setFloatingPosition: (x: number, y: number) => {
        if (copilotPosition.value === 'floating') {
          copilotFloatingPosition.x = x
          copilotFloatingPosition.y = y
        }
      }
    }
  }
}

// Create transports
const { clientTransport, serverTransport } = createMcpTransports()

// Create client
const client = ref<Client | null>(null)
createMcpClient(clientTransport)
  .then((c) => {
    client.value = c
    mcpConnectionStatus.client = true
    mcpConnectionStatus.lastUpdate = Date.now()
    collector.setMcpClient(c)
  })
  .catch((e) => {
    console.error('Failed to create MCP client:', e)
  })

// Create server
const server = ref<Server | null>(null)
createMcpServer(serverTransport, {
  history: mcpHistory,
  registry: registry
})
  .then((s) => {
    server.value = s
    mcpConnectionStatus.server = true
    mcpConnectionStatus.lastUpdate = Date.now()
  })
  .catch((e) => {
    console.error('Failed to create MCP server:', e)
  })

initBasicTools()
// Get i18n in component context
const i18n = useI18n()
const copilot = new Copilot(i18n, registry)

const copilotController = new CopilotController(copilot, collector)
copilotController.init()
/**
 * Handle UI close event from CopilotUI
 */
function handleCloseUI() {
  controls.close()
}

// Initialize and handle window resize for floating position
const handleWindowResize = () => {
  if (copilotPosition.value === 'floating') {
    const padding = 20
    const maxX = Math.max(padding, window.innerWidth - parseFloat(copilotSize.width) - padding)
    const maxY = Math.max(padding, window.innerHeight - parseFloat(copilotSize.height) - padding)
    
    copilotFloatingPosition.x = Math.max(padding, Math.min(copilotFloatingPosition.x, maxX))
    copilotFloatingPosition.y = Math.max(padding, Math.min(copilotFloatingPosition.y, maxY))
  }
}

// Add window resize listener
window.addEventListener('resize', handleWindowResize)

/**
 * Clean up resources when component is destroyed
 */
onBeforeUnmount(() => {
  visible.value = false
  mcpDebuggerVisible.value = false
  window.removeEventListener('resize', handleWindowResize)
})

/**
 * Computed property that determines if the UI should be shown
 * Only true when everything is initialized and visible is true
 */
const shouldShowCopilotUI = computed(() => {
  return visible.value
})

/**
 *
 * @param position The position of the dock
 * @returns The icon for the dock position
 */
const getDockIcon = (position: string) => {
  switch (position) {
    case 'floating':
      return dockFloating
    case 'left':
      return dockLeft
    case 'right':
      return dockRight
    case 'bottom':
      return dockBottom
    default:
      return dockFloating
  }
}

/**
 * Create the consolidated context object using computedShallowReactive
 * This is similar to how CodeEditorUI creates its context
 */
const copilotCtx = computedShallowReactive<CopilotCtx>(() => ({
  controller: copilotController,
  copilot: copilot,
  visible: visible.value,
  mcpDebuggerVisible: mcpDebuggerVisible.value,
  mcp: {
    client: client as any,
    server: server as any,
    status: mcpConnectionStatus,
    history: mcpHistory,
    collector: collector,
    registry: registry
  },
  controls
}))

/**
 * Provide the consolidated context to descendants
 */
provide(copilotCtxInjectionKey, copilotCtx)

/**
 * Expose API to parent components
 */
defineExpose({
  context: copilotCtx
})
</script>

<template>
  <div class="copilot-provider">
    <!-- Render child content with context as slot props -->
    <slot :context="copilotCtx" />

    <!-- Render CopilotUI with position control -->
    <aside
      v-if="shouldShowCopilotUI"
      class="copilot-chat-container"
      :style="copilotContainerStyle"
      :class="[`position-${copilotPosition}`, { dragging: copilotSize.dragging }]"
    >
      <!-- Header drag handle for floating mode -->
      <div
        v-if="copilotPosition === 'floating'"
        class="header-drag-handle"
        @mousedown="handlePositionDragStart"
      ></div>

      <!-- Resize handle for drag resizing -->
      <div class="resize-handle" :class="`resize-${copilotPosition}`" @mousedown="handleDragStart"></div>

      <!-- Main Copilot UI component -->
      <CopilotUI
        :controller="copilotController"
        class="copilot-ui"
        :position="copilotPosition"
        :position-options="positionOptions"
        :show-position-menu="showCopilotPositionMenu"
        @close="handleCloseUI"
        @toggle-position-menu="toggleCopilotPositionMenu"
        @change-position="changeCopilotPosition"
        @toggle-env-panel="toggleEnvPanel"
      />

      <div v-show="showCopilotPositionMenu" class="position-menu" :style="positionMenuStyle">
        <div class="position-menu-header">
          <span>Dock side</span>
          <div class="position-options-container">
            <button
              v-for="option in positionOptions"
              :key="option.id"
              class="position-icon-button"
              :class="{ active: copilotPosition === option.id }"
              :title="option.label"
              @click.stop="changeCopilotPosition(option.id as DockPosition)"
            >
              <!-- eslint-disable-next-line vue/no-lone-template, vue/no-v-html -->
              <span class="icon" v-html="getDockIcon(option.id)"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Render environment panel -->
      <EnvPanel v-if="showEnvPanel" :style="positionMenuStyle" @close="toggleEnvPanel" />
    </aside>

    <!-- Render MCP Debugger when needed -->
    <McpDebugger :is-visible="mcpDebuggerVisible" @close="controls.mcpDebugger.close" />
  </div>
</template>

<style lang="scss" scoped>
.copilot-provider {
  /* This is a wrapper component, it shouldn't affect layout */
  display: contents;
}

/**
 * Main container styles for the Copilot chat sidebar
 */
.copilot-chat-container {
  /* Positioning and dimensions */
  position: fixed;

  /* Visual styling */
  background-color: white;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);

  /* Layout */
  display: flex;
  z-index: 9999;
  /* transition: all 0.3s ease; */

  /* Position-specific styles */
  &.position-left {
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  &.position-right {
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  }

  &.position-bottom {
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }

  &.position-floating {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    overflow: hidden;
  }

  .copilot-ui {
    flex: 1;
    width: 100% !important;
    max-width: 100% !important;
  }
}

/* Debugger container styles */
.debugger-container {
  position: fixed;
  z-index: 1001;
  background-color: white;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;

  &.position-left {
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  &.position-right {
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  }

  &.position-bottom {
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  }

  .debugger-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: var(--ui-color-grey-100);
    border-bottom: 1px solid var(--ui-color-grey-300);

    .debugger-title {
      font-weight: 500;
      font-size: 14px;
    }

    .debugger-controls {
      display: flex;
      gap: 8px;

      .position-selector {
        position: relative;
      }
    }
  }

  .debugger-content {
    flex: 1;
    overflow: auto;
  }
}

.env-panel {
  position: absolute;
  background-color: white;
  border: 1px solid var(--ui-color-grey-300);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 220px;
  padding: 8px 12px;
}

/* Position menu styles */
.position-menu {
  position: absolute;
  background-color: white;
  border: 1px solid var(--ui-color-grey-300);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 220px;
  padding: 8px 12px;
  top: 48px; /* Directly set top offset */
  right: 12px; /* Right align to button */

  .position-menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    span {
      font-size: 14px;
      font-weight: 500;
      color: #000000; /* Changed from var(--ui-color-grey-700) to black */
    }

    .position-options-container {
      display: flex;
      gap: 8px;
    }

    .position-icon-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background-color: transparent;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background-color: var(--ui-color-grey-100);
      }

      &.active {
        background-color: var(--ui-color-primary-50);
        color: #1976d2; /* Set blue color at parent level that will cascade to children */

        .icon {
          color: inherit; /* Inherit color from parent */
        }
      }

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;

        :deep(svg) {
          width: 16px;
          height: 16px;
          max-width: 16px;
          max-height: 16px;
        }
      }

      i {
        font-size: 16px;
      }
    }
  }

  /* Adjust width for bottom position */
  .position-bottom & {
    max-width: 250px;
  }
}

/* Button styles */
.position-button,
.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background-color: transparent;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: var(--ui-color-grey-200);
  }
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .copilot-chat-container {
    &.position-left,
    &.position-right {
      width: 300px;
    }
    
    &.position-floating {
      width: 350px !important;
      height: 500px !important;
    }
  }
}

@media (max-width: 768px) {
  .copilot-chat-container {
    &.position-left,
    &.position-right {
      width: 100%;
    }
    
    &.position-floating {
      width: 90% !important;
      height: 70% !important;
      left: 5% !important;
      top: 15% !important;
    }
  }
}

/* Add drag edge styles */
.header-drag-handle {
  position: absolute;
  top: 0;
  left: 70px;
  right: 100px;
  height: 48px; /* Height of the header */
  cursor: move;
  z-index: 1002;
}

.resize-handle {
  position: absolute;
  z-index: 1001;

  &.resize-left {
    top: 0;
    right: -2px; /* Modified: Place the drag edge on the right edge */
    width: 4px;
    height: 100%;
    cursor: ew-resize;
  }

  &.resize-right {
    top: 0;
    left: -2px; /* Modified: Place the drag edge on the left edge */
    width: 4px;
    height: 100%;
    cursor: ew-resize;
  }

  &.resize-bottom {
    top: -2px;
    left: 0;
    width: 100%;
    height: 4px;
    cursor: ns-resize;
  }

  &.resize-floating {
    bottom: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0 0 8px 0;

    &::after {
      content: '';
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-bottom: 6px solid rgba(255, 255, 255, 0.8);
    }
  }

  &:hover:not(.resize-floating) {
    background-color: rgba(0, 0, 0, 0.2);
  }
}

.copilot-chat-container.dragging {
  transition: none;
  user-select: none;
}
</style>
