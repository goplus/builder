<script setup lang="ts">
import { computed } from 'vue'
import { UITooltip } from '@/components/ui'
import { EditingMode, SavingState, type Editing } from '../editing'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import offlineSvg from './icons/offline.svg?raw'
import savingSvg from './icons/saving.svg?raw'
import failedToSaveSvg from './icons/failed-to-save.svg?raw'
import cloudCheckSvg from './icons/cloud-check.svg?raw'

const props = defineProps<{
  editing: Editing | null
}>()

const i18n = useI18n()
const { isOnline } = useNetwork()

const icon = computed(() => {
  const editing = props.editing
  if (editing == null) return null
  switch (editing.mode) {
    case EditingMode.EffectFree:
      return null
    case EditingMode.AutoSave: {
      if (!isOnline.value) return { svg: offlineSvg, desc: { en: 'No internet connection', zh: '无网络连接' } }
      if (!editing.dirty || editing.saving == null) return { svg: cloudCheckSvg, desc: { en: 'Saved', zh: '已保存' } }
      switch (editing.saving.state) {
        case SavingState.Pending:
          return {
            svg: savingSvg,
            stateClass: 'pending',
            desc: { en: 'Pending save', zh: '待保存' }
          }
        case SavingState.InProgress:
          return { svg: savingSvg, stateClass: 'saving', desc: { en: 'Saving', zh: '保存中' } }
        case SavingState.Completed:
          return { svg: cloudCheckSvg, desc: { en: 'Saved', zh: '已保存' } }
        case SavingState.Failed:
          return { svg: failedToSaveSvg, desc: { en: 'Failed to save', zh: '保存失败' } }
        default:
          throw new Error('unknown saving state')
      }
    }
    default:
      throw new Error(`Unknown editing mode: ${editing.mode}`)
  }
})
</script>

<template>
  <div v-if="icon != null" class="h-6 w-6 shrink-0 cursor-default">
    <UITooltip placement="right">
      <template #trigger>
        <!-- eslint-disable vue/no-v-html -->
        <div
          class="auto-save-state-icon flex h-full w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
          :class="icon.stateClass"
          v-html="icon.svg"
        ></div>
        <!-- eslint-enable vue/no-v-html -->
      </template>
      {{ i18n.t(icon.desc) }}
    </UITooltip>
  </div>
</template>

<style scoped>
.auto-save-state-icon.pending :deep(svg) path,
.auto-save-state-icon.saving :deep(svg) path {
  stroke-dasharray: 2;
}

.auto-save-state-icon.saving :deep(svg) path {
  animation: dash 1s linear infinite;
}

@keyframes dash {
  to {
    stroke-dashoffset: 24;
  }
}
</style>
