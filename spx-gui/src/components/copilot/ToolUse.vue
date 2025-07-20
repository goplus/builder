<script lang="ts">
import { z } from 'zod'
import zodToJsonSchema from 'zod-to-json-schema'

export const tagName = 'tool-use'

export const description = `Use a tool and get the result. \
The client provides various tools with specific capabilities and input schemas that define their required and optional parameters. \
For example, <tool-use id="hmztvy" tool="example-tool" parameters='{"foo":"bar"}'></tool-use> invokes the tool named "example-tool" with parameters \`{"foo":"bar"}\`. \
DO NOT output any content after this element, as you should wait for the result to continue.`

export const attributes = zodToJsonSchema(
  z.object({
    id: z.string().describe('Unique identifier for this tool execution'),
    tool: z.string().describe('Tool name to execute'),
    parameters: z.string().describe('Tool parameters in JSON string format')
  })
)
</script>

<script setup lang="ts">
import { computed } from 'vue'
import { useCopilot } from './CopilotRoot.vue'

export type Props = {
  id: string // Unique identifier for this tool execution
  tool: string // Tool name to execute
  parameters: string // Tool parameters in JSON string format
}

const props = defineProps<Props>()

const copilot = useCopilot()
const execution = computed(() => copilot.executor.getExecution(props.id))
</script>

<template>
  <div class="tool-use">
    <h3>Tool use ({{ id }}), Tool: {{ tool }}</h3>
    <pre>Parameters: {{ props.parameters }}</pre>
    <pre>Execution: {{ JSON.stringify(execution) }}</pre>
  </div>
</template>

<style lang="scss" scoped>
.tool-use {
  padding: 16px;
  border-radius: var(--ui-border-radius-1);
  background-color: var(--ui-color-grey-300);
  overflow-x: auto;
}
</style>
