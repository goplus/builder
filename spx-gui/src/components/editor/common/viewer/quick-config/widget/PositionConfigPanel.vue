<script lang="ts" setup>
import { UINumberInput } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import type { Widget } from '@/models/widget'
import type { Project } from '@/models/project'
import { debounce } from 'lodash'

const props = defineProps<{
  widget: Widget
  project: Project
}>()

// copy form spx-gui/src/components/editor/stage/widget/detail/MonitorDetail.vue
function wrapUpdateHandler<Args extends any[]>(
  handler: (...args: Args) => unknown,
  withDebounce = true
): (...args: Args) => void {
  const name = props.widget.name
  const action = { name: { en: `Configure widget ${name}`, zh: `修改控件 ${name} 配置` } }
  const wrapped = (...args: Args) => props.project.history.doAction(action, () => handler(...args))
  return withDebounce ? debounce(wrapped, 300) : wrapped
}
const handleXUpdate = wrapUpdateHandler((x: number | null) => props.widget.setX(x ?? 0))
const handleYUpdate = wrapUpdateHandler((y: number | null) => props.widget.setY(y ?? 0))
</script>

<template>
  <ConfigPanel>
    <div class="position-config-wrapper">
      <UINumberInput
        v-radar="{ name: 'X position input', desc: 'Input field for monitor X position' }"
        :value="widget.x"
        @update:value="handleXUpdate"
      >
        <template #prefix>X</template>
      </UINumberInput>
      <UINumberInput
        v-radar="{ name: 'Y position input', desc: 'Input field for monitor Y position' }"
        :value="widget.y"
        @update:value="handleYUpdate"
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
