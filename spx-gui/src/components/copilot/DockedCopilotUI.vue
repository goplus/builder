<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

import CopilotChat from './CopilotChat.vue'
import CopilotTrigger from './CopilotTrigger.vue'
import { useCopilot } from './context'

const copilot = useCopilot()

onMounted(() => {
  copilot.disableGlobalUI()
  if (copilot.active) copilot.close()
})

onUnmounted(() => copilot.enableGlobalUI())

function toggle() {
  if (copilot.active) copilot.close()
  else copilot.open()
}
</script>

<template>
  <div class="relative">
    <CopilotTrigger
      v-radar="{ name: 'copilot-trigger', desc: 'Open Copilot for course help' }"
      class="transition-transform hover:-translate-y-0.5"
      :active="copilot.active"
      @click="toggle"
    />
    <div
      v-if="copilot.active"
      class="absolute right-0 bottom-[calc(100%+18px)] w-90 rounded-lg bg-linear-to-r from-[#72bbff] to-[#c390ff] p-px shadow-lg"
    >
      <CopilotChat class="rounded-lg" />
      <div class="absolute right-5 -bottom-1.5 h-3 w-3 rotate-45 bg-grey-100 shadow-sm"></div>
    </div>
  </div>
</template>
