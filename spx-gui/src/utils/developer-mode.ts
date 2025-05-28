import { ref } from 'vue'

// Storage key for persisting developer mode state
const DEV_MODE_STORAGE_KEY = 'xb_dev_mode_enabled'

// Create reactive state for developer mode
const isDeveloperMode = ref(false)

// Create reactive state for workflow ID
export const workflowID = ref<string | null>(null)

/**
 * Initialize developer mode state
 * Reads settings from localStorage or other storage
 */
export function initDeveloperMode() {
  try {
    // Retrieve setting from local storage
    const storedValue = localStorage.getItem(DEV_MODE_STORAGE_KEY)
    isDeveloperMode.value = storedValue === 'true'

    // Set up console command listeners
    setupConsoleCommands()
  } catch (e) {
    console.error('Failed to initialize developer mode:', e)
  }
}

/**
 * Setup console commands to control developer mode
 * Adds global methods accessible from browser console
 * @private
 */
function setupConsoleCommands() {
  // Add commands to window object
  window.__xb_enable_dev_mode = () => {
    isDeveloperMode.value = true
    localStorage.setItem(DEV_MODE_STORAGE_KEY, 'true')
    return true
  }

  window.__xb_disable_dev_mode = () => {
    isDeveloperMode.value = false
    localStorage.setItem(DEV_MODE_STORAGE_KEY, 'false')
    return false
  }

  window.__xb_dev_mode_status = () => {
    return isDeveloperMode.value
  }

  window.__xb_setWorkflowID = (id: string) => {
    if (isDeveloperMode.value) {
      workflowID.value = id
      console.log(`Workflow ID set to: ${id}`)
    } else {
      console.warn('Developer mode is not enabled. Cannot set workflow ID.')
    }
  }
}

/**
 * Check if developer mode is enabled
 * Composition function to access developer mode state
 *
 * @returns Object containing reactive developer mode state
 */
export function useDeveloperMode() {
  return {
    isDeveloperMode
  }
}

// Add TypeScript global type definitions
declare global {
  interface Window {
    /**
     * Enable developer mode
     * @returns Current developer mode state (true)
     */
    __xb_enable_dev_mode: () => boolean

    /**
     * Disable developer mode
     * @returns Current developer mode state (false)
     */
    __xb_disable_dev_mode: () => boolean

    /**
     * Check current developer mode status
     * @returns Current developer mode state
     */
    __xb_dev_mode_status: () => boolean

    /**
     * Set the workflow ID for debugging
     * @param workflowID - The workflow ID to set
     */
    __xb_setWorkflowID: (workflowID: string) => void
  }
}
