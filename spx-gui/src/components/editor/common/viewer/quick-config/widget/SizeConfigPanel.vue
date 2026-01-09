<script lang="ts" setup>
import { UINumberInput } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import { round } from '@/utils/utils'
import type { Widget } from '@/models/widget'

defineProps<{
  widget: Widget
  size: number
}>()

const emit = defineEmits<{
  'update:size': [number]
}>()

function handleSizePercentUpdate(sizeInPercent: number | null) {
  if (sizeInPercent == null) return
  emit('update:size', round(sizeInPercent / 100, 2))
}
</script>

<template>
  <ConfigPanel>
    <UINumberInput
      v-radar="{ name: 'Size input', desc: 'Input field for monitor size' }"
      class="size-input"
      :min="0"
      :value="round(size * 100)"
      @update:value="handleSizePercentUpdate"
    >
      <template #prefix>{{ $t({ en: 'Size', zh: '大小' }) }}</template>
      <template #suffix>%</template>
    </UINumberInput>
  </ConfigPanel>
</template>

<style lang="scss" scoped>
.size-input {
  width: 102px;
}
</style>
