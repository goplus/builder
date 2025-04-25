<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useCopilotCtx } from '@/components/copilot/CopilotProvider.vue'

const props = defineProps<{
  /**
   * Environment variable name
   */
   kname?: string,
  
  /**
   * Environment variable value
   */
  value?: any,
  
  /**
   * Any other attribute will be treated as environment variables
   */
  [key: string]: any
}>()

// Get the copilot context which contains the collector
const copilotCtx = useCopilotCtx()


// Check if the MCP collector is initialized
if (!copilotCtx?.mcp?.collector) {
  throw new Error('MCP collector is not initialized')
}

// Get the collector from the context
const collector = computed(() => copilotCtx.mcp.collector!)

// Process environment variables on component mount
onMounted(() => {
    if (!collector.value) {
      throw new Error('Collector not available')
    }

  // If a specific name/value pair is provided
  if (props.kname && props.value !== undefined) {
    collector.value.setEnvironmentVar(props.kname, props.value)
    return
  }
})
</script>

<template>
  <!-- Render nothing, this is a processing component -->
  <span style="display: none;"></span>
</template>