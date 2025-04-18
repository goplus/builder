<script lang="ts">
import type { InjectionKey } from 'vue'

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
    collector: ToolResultCollector | null
    registry: ToolRegistry | null
  }
  controls: {
    open: () => Promise<boolean>
    close: () => void
    toggle: () => Promise<boolean>
    mcpDebugger: {
      open: () => Promise<boolean>
      close: () => void
      toggle: () => Promise<boolean>
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
import { reactive, inject, ref, provide, onBeforeUnmount, computed, type Ref } from 'vue'
import { computedShallowReactive } from '@/utils/utils'
import { useI18n } from '@/utils/i18n'
import { Copilot } from './copilot'
import { CopilotController, type ICopilot } from './index'
import { createMcpClient } from './mcp/client'
import { createMcpServer } from './mcp/server'
import { createMcpTransports } from './mcp/transport'
import { ToolRegistry } from './mcp/registry'
import { ToolResultCollector } from './mcp/collector'
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

// Component state using refs
const visible = ref(false)
const mcpDebuggerVisible = ref(false)
const router = useRouter()

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
const collector = new ToolResultCollector()

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
 * Visibility controls with automatic initialization
 */
const controls = {
  /**
   * Open the chat UI, ensuring Copilot is initialized first
   */
  open: async (): Promise<boolean> => {
    visible.value = true
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

/**
 * Clean up resources when component is destroyed
 */
onBeforeUnmount(() => {
  visible.value = false
  mcpDebuggerVisible.value = false
})

/**
 * Computed property that determines if the UI should be shown
 * Only true when everything is initialized and visible is true
 */
const shouldShowCopilotUI = computed(() => {
  return visible.value
})

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

    <!-- Render CopilotUI directly when needed -->
    <aside v-if="shouldShowCopilotUI" class="copilot-chat-container">
      <CopilotUI :controller="copilotController" class="copilot-ui" @close="handleCloseUI" />
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
  top: 0;
  left: 0;
  width: 15%;
  height: 100vh;

  /* Visual styling */
  background-color: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);

  /* Layout */
  display: flex;
  flex-direction: column;
  z-index: 1000;

  .copilot-ui {
    flex: 1;
    width: 100% !important;
    max-width: 100% !important;
  }
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .copilot-chat-container {
    width: 300px;
  }
}

@media (max-width: 768px) {
  .copilot-chat-container {
    width: 100%;
  }
}
</style>
