<script lang="ts">
import type { InjectionKey, Ref, ComputedRef } from 'vue'

export type CopilotCtx = {
  controller: Ref<CopilotController | null>
  copilot: Ref<ICopilot | null>
  initialized: Ref<boolean>
  visible: Ref<boolean>
  controls: {
    open: () => Promise<boolean>
    close: () => void
    toggle: () => Promise<boolean>
  }
  error: Ref<Error | null>
}

const copilotCtxInjectionKey: InjectionKey<ComputedRef<CopilotCtx>> = Symbol('copilot-ctx')
export function useCopilotCtx() {
  const ctx = inject(copilotCtxInjectionKey)
  if (ctx == null) throw new Error('useCopilotCtx should be called inside of CopilotProvider')
  return ctx.value
}
</script>

<script setup lang="ts">
/**
 * CopilotProvider Component
 * 
 * Provides Copilot context and services to all child components.
 * Handles initialization of Copilot, MCP connections, and UI rendering.
 */
import { watch, inject, ref, provide, readonly, onMounted, onBeforeUnmount, computed } from 'vue'
import { useI18n } from '@/utils/i18n'
import { Copilot } from './copilot'
import { CopilotController, type ICopilot } from './index'
import { initMcpClient } from './mcp/client'
import { initMcpServer } from './mcp/server'
import CopilotUI from './CopilotUI.vue'

// Component state
const controller = ref<CopilotController | null>(null)
const copilot = ref<ICopilot | null>(null)
const initialized = ref(false)
const initializing = ref(false)
const error = ref<Error | null>(null)
const visible = ref(false)

// Get i18n in component context
const i18n = useI18n()

/**
 * Initialize MCP client and server connections in background
 * This doesn't block the UI or throw errors
 */
async function initMcpConnections() {
  try {
    await Promise.all([
      initMcpClient(),
      initMcpServer()
    ])
    return true
  } catch (err) {
    console.error('MCP initialization error:', err)
    return false
  }
}

/**
 * Internal function that ensures Copilot is initialized
 * Returns true if initialization was successful, false otherwise
 */
async function ensureInitialized(): Promise<boolean> {
  // Already initialized, nothing to do
  if (initialized.value) {
    return true
  }
  
  // Already initializing, wait for it to complete
  if (initializing.value) {
    // Wait until initialization is complete
    return new Promise((resolve) => {
      const unwatch = watch(initialized, (isInitialized) => {
        if (isInitialized) {
          unwatch()
          resolve(true)
        }
      })
      
      // Also watch for errors
      const errorUnwatch = watch(error, (err) => {
        if (err) {
          errorUnwatch()
          unwatch()
          resolve(false)
        }
      })
    })
  }
  
  // Start initialization
  initializing.value = true
  error.value = null
  
  try {
    // Create instances
    const copilotInstance = new Copilot(i18n)
    copilot.value = copilotInstance
    
    const controllerInstance = new CopilotController(copilotInstance)
    controller.value = controllerInstance
    controllerInstance.init()
    
    // Initialize MCP connections in background
    initMcpConnections()
    
    initialized.value = true
    return true
  } catch (err) {
    const errorObj = err instanceof Error ? err : new Error('Failed to initialize Copilot')
    error.value = errorObj
    console.error('Copilot initialization error:', err)
    return false
  } finally {
    initializing.value = false
  }
}

/**
 * Chat visibility controls with automatic initialization
 */
const controls = {
  /**
   * Open the chat UI, ensuring Copilot is initialized first
   */
  open: async (): Promise<boolean> => {
    const isReady = await ensureInitialized()
    if (!isReady) {
      console.warn('Cannot open Copilot UI: initialization failed')
      return false
    }
    
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
  }
}

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
  // Dispose controller
  if (controller.value) {
    controller.value.dispose()
    controller.value = null
  }
  
  // Reset state
  copilot.value = null
  initialized.value = false
  visible.value = false
})

/**
 * Computed property that determines if the UI should be shown
 * Only true when everything is initialized and visible is true
 */
const shouldShowCopilotUI = computed(() => {
  return initialized.value && controller.value !== null && visible.value
})

/**
 * Create the consolidated context object
 */
 const copilotCtx = computed(() => {
  return {
    controller: readonly(controller),
    copilot: readonly(copilot),
    initialized: readonly(initialized),
    visible: readonly(visible),
    controls,
    error: readonly(error)
  }
})

/**
 * Provide the consolidated context to descendants
 */
 provide(copilotCtxInjectionKey, copilotCtx)

/**
 * Auto-initialize on mount
 */
onMounted(() => {
  // Start initialization but don't wait for it
  ensureInitialized()
})

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
      <CopilotUI
        :controller="controller.value"
        class="copilot-ui"
        @close="handleCloseUI"
      />
    </aside>
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
  width: 25%;
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