<script lang="ts" setup>
import { debounce } from 'lodash'
import { UIDivider, UINumberInput, UITooltip } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import ConfigItem from '../common/ConfigItem.vue'
import type { LocalConfig } from '../utils'

const props = defineProps<{
  name: 'sprite' | 'monitor'
  localConfig: LocalConfig
  onBack: () => void
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
        class="position-input"
        v-radar="{ name: 'X position input', desc: `Input to set ${name} X position` }"
        :value="localConfig.x"
        @update:value="handleUpdateX($event ?? 0)"
      >
        <template #prefix>X</template>
      </UINumberInput>
      <UINumberInput
        class="position-input"
        v-radar="{ name: 'Y position input', desc: `Input to set ${name} Y position` }"
        :value="localConfig.y"
        @update:value="handleUpdateY($event ?? 0)"
      >
        <template #prefix>Y</template>
      </UINumberInput>
      <UIDivider vertical />
      <UITooltip>
        {{ $t({ en: 'Back', zh: '返回' }) }}
        <template #trigger>
          <ConfigItem icon="back" @click="props.onBack" />
        </template>
      </UITooltip>
    </div>
  </ConfigPanel>
</template>

<style lang="scss" scoped>
.position-config-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.position-input {
  width: 72px;
}
</style>
