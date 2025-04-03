import { ref, readonly, type App } from 'vue'
import { Copilot } from './copilot'
import { CopilotController } from './index'
import { initMcpClient } from './mcp/client'
import { initMcpServer } from './mcp/server'
import { useI18n } from '@/utils/i18n'

/**
 * Reactive reference tracking Copilot Chat visibility state
 * Controls whether the chat interface is displayed to the user
 */
const isCopilotChatVisible = ref(false)

// Module state flags and instances
/**
 * Flag indicating whether Copilot module has been initialized
 * Prevents redundant initialization
 */
let isInitialized = false

/**
 * Instance of the Copilot class
 * Handles core functionality for AI assistant interaction
 */
let copilot: Copilot | null = null

/**
 * Instance of the CopilotController class
 * Provides high-level API for controlling Copilot functionality
 */
let controller: CopilotController | null = null

/**
 * Initializes the Copilot module and all related functionality
 * 
 * This function handles the creation of Copilot instances and initializes
 * the required services. It implements lazy initialization and ensures
 * that resources are only created once.
 * 
 * @returns {Promise<CopilotController>} The initialized controller instance
 * @throws {Error} If initialization fails
 */
export async function initCopilot() {
  if (isInitialized) return controller
  
  try {
    // Create and initialize Copilot instances
    const i18n = useI18n()
    copilot = new Copilot(i18n)
    controller = new CopilotController(copilot)
    controller.init()
    
    // Asynchronously initialize MCP connections without blocking
    initMcpConnections().catch(error => {
      console.error('Failed to initialize MCP connections:', error)
    })
    
    isInitialized = true
    
    return controller
  } catch (error) {
    console.error('Failed to initialize Copilot module:', error)
    throw error
  }
}

/**
 * Initializes MCP client and server connections
 * 
 * Establishes connections to the Model Context Protocol services,
 * allowing communication between AI models and the application.
 * 
 * @private
 * @async
 * @throws {Error} If MCP connection initialization fails
 */
async function initMcpConnections() {
  try {
    // Initialize client and server connections in parallel
    await Promise.all([
      initMcpClient(),
      initMcpServer()
    ])
  } catch (error) {
    console.error('MCP initialization error:', error)
    throw error
  }
}

/**
 * Vue plugin for Copilot integration
 * 
 * Provides application-level Copilot functionality by injecting
 * the controller into Vue's dependency injection system.
 */
export const createCopilot = {
  /**
   * Plugin installation method
   * 
   * @param {App} app - Vue application instance
   */
  async install(app: App) {
    const controller = await initCopilot()
    
    // Make controller available throughout the application
    app.provide('copilotController', controller)
  }
}

/**
 * Composition function to access Copilot Chat functionality
 * 
 * Provides reactive state and methods to control the Copilot Chat interface.
 * Ensures Copilot is initialized when needed.
 * 
 * @returns {Object} Object containing chat visibility state and control methods
 */
export function useCopilotChat() {
  if (!isInitialized) {
    initCopilot()
  }
  
  return {
    /**
     * Read-only reactive reference to chat visibility state
     */
    isVisible: readonly(isCopilotChatVisible),
    
    /**
     * Toggles chat visibility between shown and hidden states
     * @returns {boolean} New visibility state after toggle
     */
    toggle: () => {
      isCopilotChatVisible.value = !isCopilotChatVisible.value
      return isCopilotChatVisible.value
    },
    
    /**
     * Shows the chat interface
     */
    open: () => { isCopilotChatVisible.value = true },
    
    /**
     * Hides the chat interface
     */
    close: () => { isCopilotChatVisible.value = false }
  }
}