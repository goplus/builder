<script lang="ts" setup>
import { UINumberInput } from '@/components/ui'
import ConfigPanel, { useSyncFastSlowValue } from '../common/ConfigPanel.vue'
import type { Project } from '@/models/project'
import { round } from '@/utils/utils'
import type { Widget } from '@/models/widget'
import { debounce } from 'lodash'

const props = defineProps<{
  widget: Widget
  project: Project
  size: number
}>()

const sizePercent = useSyncFastSlowValue(
  () => props.size,
  () => props.widget.size,
  (size) => round(size * 100)
)
const handleSizePercentUpdate = debounce((sizeInPercent: number | null) => {
  const name = props.widget.name
  const action = { name: { en: `Configure widget ${name}`, zh: `修改控件 ${name} 配置` } }
  props.project.history.doAction(action, () => {
    if (sizeInPercent == null) return
    props.widget.setSize(round(sizeInPercent / 100, 2))
  })
}, 300)
</script>

<template>
  <ConfigPanel>
    <UINumberInput
      v-radar="{ name: 'Size input', desc: 'Input field for monitor size' }"
      class="size-input"
      :min="0"
      :value="sizePercent"
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
