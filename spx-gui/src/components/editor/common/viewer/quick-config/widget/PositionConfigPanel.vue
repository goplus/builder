<script lang="ts" setup>
import { UINumberInput } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import type { Widget } from '@/models/widget'

defineProps<{
  widget: Widget
  x: number
  y: number
}>()

defineEmits<{
  'update:pos': [{ x: number; y: number }]
}>()
</script>

<template>
  <ConfigPanel>
    <div class="position-config-wrapper">
      <UINumberInput
        v-radar="{ name: 'X position input', desc: 'Input field for monitor X position' }"
        :value="x"
        @update:value="$emit('update:pos', { x: $event ?? 0, y })"
      >
        <template #prefix>X</template>
      </UINumberInput>
      <UINumberInput
        v-radar="{ name: 'Y position input', desc: 'Input field for monitor Y position' }"
        :value="y"
        @update:value="$emit('update:pos', { x, y: $event ?? 0 })"
      >
        <template #prefix>Y</template>
      </UINumberInput>
    </div>
  </ConfigPanel>
</template>

<style lang="scss" scoped>
.position-config-wrapper {
  display: flex;
  gap: 4px;
  width: 158px;
}
</style>
