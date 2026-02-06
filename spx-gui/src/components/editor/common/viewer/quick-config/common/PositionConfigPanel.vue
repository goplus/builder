<script lang="ts" setup>
import { debounce } from 'lodash'
import { UINumberInput } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import type { LocalConfig } from '../utils'

const props = defineProps<{
  name: 'sprite' | 'monitor'
  localConfig: LocalConfig
}>()

const handleUpdateX = debounce((x: number) => {
  props.localConfig.setX(x)
  props.localConfig.sync()
}, 300)
const handleUpdateY = debounce((y: number) => {
  props.localConfig.setY(y)
  props.localConfig.sync()
}, 300)
</script>

<template>
  <ConfigPanel>
    <div class="position-config-wrapper">
      <UINumberInput
        v-radar="{ name: 'X position input', desc: `Input to set ${name} X position` }"
        :value="localConfig.x"
        @update:value="handleUpdateX($event ?? 0)"
      >
        <template #prefix>X</template>
      </UINumberInput>
      <UINumberInput
        v-radar="{ name: 'Y position input', desc: `Input to set ${name} Y position` }"
        :value="localConfig.y"
        @update:value="handleUpdateY($event ?? 0)"
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
