<script setup lang="ts">
import { UIDropdownWithTooltip, UIIcon } from '@/components/ui'
import { useFeedbackDemoModel } from '@/components/feedback-demo/model'
import type { RadarNodeMeta } from '@/utils/radar'

const props = defineProps<{
  triggerRadar: RadarNodeMeta
}>()
const feedbackDemo = useFeedbackDemoModel()

function closeNotificationAfterMenuToggle() {
  void Promise.resolve().then(() => feedbackDemo.closeNotificationCenter())
}
</script>

<template>
  <UIDropdownWithTooltip placement="bottom-start">
    <template #trigger="{ expanded }">
      <button
        v-radar="triggerRadar"
        type="button"
        class="h-full cursor-pointer flex items-center border-0 bg-transparent px-3 text-grey-1000 hover:bg-grey-400 focus-visible:outline-2 focus-visible:outline-primary-main"
        aria-haspopup="menu"
        :aria-expanded="expanded"
        :aria-label="props.triggerRadar.name"
        @click="closeNotificationAfterMenuToggle"
      >
        <slot name="trigger"></slot>
        <UIIcon type="arrowMini" class="w-2 ml-1" />
      </button>
    </template>
    <template #tooltip-content>项目</template>
    <template #dropdown-content>
      <slot></slot>
    </template>
  </UIDropdownWithTooltip>
</template>
