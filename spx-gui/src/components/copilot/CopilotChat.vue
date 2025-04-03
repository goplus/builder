<script setup lang="ts">
/**
 * Copilot Chat component setup
 * Provides a container for the Copilot UI with responsive layout
 */
import { inject } from 'vue'
import CopilotUI from '@/components/copilot/CopilotUI.vue'
import type { CopilotController } from '@/components/copilot'
import { useCopilotChat } from './init'

/**
 * Inject the Copilot controller from the application context
 * The controller manages all communication with the AI assistant
 */
const controller = inject('copilotController') as CopilotController | undefined

/**
 * Access the chat visibility state and control methods
 * @property {Ref<boolean>} isVisible - Reactive reference to chat visibility state
 * @property {Function} close - Function to hide the chat interface
 */
const { isVisible, close: closeChat } = useCopilotChat()
</script>

<template>
  <!-- 
    Main container for the Copilot chat UI
    Only rendered when both visible state is true and controller is available
  -->
  <aside v-if="isVisible && controller" class="copilot-chat-container">
      <!-- 
        Render the Copilot UI component with the injected controller
        Passes the close event handler to allow closing from child components
      -->
      <CopilotUI
        :controller="controller"
        class="copilot-ui"
        @close="closeChat"
      />
  </aside>
</template>

<style lang="scss" scoped>
/**
 * Main container styles for the Copilot chat sidebar
 * Creates a fixed position panel on the left side of the screen
 */
.copilot-chat-container {
  /* Positioning and dimensions */
  position: fixed;
  top: 0;
  left: 0;
  width: 25%; /* Desktop default: occupies 1/4 of the viewport width */
  height: 100vh;
  
  /* Visual styling */
  background-color: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  
  /* Layout */
  display: flex;
  flex-direction: column;
  z-index: 1000; /* Ensure chat appears above other UI elements */

  /**
   * Styles for the nested CopilotUI component
   * Ensures the UI fills the available container space
   */
  .copilot-ui {
    flex: 1;
    /* Override any default width constraints from CopilotUI */
    width: 100% !important;
    max-width: 100% !important;
  }
}

/**
 * Responsive layout adjustments for medium screens
 * Switches to a fixed width when viewport width is below 1200px
 */
@media (max-width: 1200px) {
  .copilot-chat-container {
    width: 300px; /* Fixed width for medium screens */
  }
}

/**
 * Responsive layout adjustments for small screens and mobile devices
 * Takes up full screen width on mobile to maximize usable space
 */
@media (max-width: 768px) {
  .copilot-chat-container {
    width: 100%; /* Full width for mobile devices */
  }
}
</style>