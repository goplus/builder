<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId } from 'vue'

import { useContentSize } from '@/utils/dom'

import CopilotChat from './CopilotChat.vue'
import CopilotTrigger from './CopilotTrigger.vue'
import { useCopilot } from './context'

const copilot = useCopilot()
const panelRef = ref<HTMLElement | null>(null)
const panelSize = useContentSize(panelRef)
const gradientId = useId()
const panelOutline = computed(() => {
  if (panelSize.value == null || panelRef.value == null) return null
  const width = panelSize.value.width + 2
  const height = panelSize.value.height + 2
  const radius = parseFloat(getComputedStyle(panelRef.value).borderTopLeftRadius)
  const arc = `${radius - 0.5} ${radius - 0.5} 0 0 1`
  const pointerX = width - radius - 12
  return {
    width,
    height,
    path: `M ${radius} 0.5 H ${width - radius}
      A ${arc} ${width - 0.5} ${radius} V ${height - radius}
      A ${arc} ${width - radius} ${height - 0.5}
      H ${pointerX + 8} L ${pointerX} ${height + 7.5} L ${pointerX - 8} ${height - 0.5}
      H ${radius} A ${arc} 0.5 ${height - radius}
      V ${radius} A ${arc} ${radius} 0.5 Z`
  }
})

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
      ref="panelRef"
      class="copilot-panel absolute right-0 bottom-[calc(100%+18px)] w-90 rounded-lg bg-grey-100 p-px shadow-lg"
    >
      <svg
        v-if="panelOutline != null"
        class="pointer-events-none absolute top-0 left-0 overflow-visible"
        :width="panelOutline.width"
        :height="panelOutline.height + 8"
        aria-hidden="true"
      >
        <defs>
          <linearGradient :id="gradientId" gradientUnits="userSpaceOnUse" x1="0" :x2="panelOutline.width" y1="0" y2="0">
            <stop stop-color="#72bbff" />
            <stop offset="1" stop-color="#c390ff" />
          </linearGradient>
        </defs>
        <path
          :d="panelOutline.path"
          fill="var(--ui-color-grey-100)"
          :stroke="`url(#${gradientId})`"
          stroke-linejoin="round"
        />
      </svg>
      <CopilotChat class="relative rounded-lg" />
    </div>
  </div>
</template>
