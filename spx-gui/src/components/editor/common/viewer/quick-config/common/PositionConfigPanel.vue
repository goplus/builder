<script lang="ts" setup>
import { onBeforeUnmount } from 'vue'
import { debounce } from 'lodash'
import { UIDivider, UINumberInput, UITooltip } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import ConfigItem from '../common/ConfigItem.vue'
import type { LocalConfig } from '../utils'

const props = defineProps<{
  name: 'sprite' | 'monitor'
  localConfig: LocalConfig
}>()

const emit = defineEmits<{
  back: []
}>()

const handleUpdateX = debounce((x: number) => {
  props.localConfig.setX(x)
  props.localConfig.sync()
}, 300)
const handleUpdateY = debounce((y: number) => {
  props.localConfig.setY(y)
  props.localConfig.sync()
}, 300)

onBeforeUnmount(() => {
  handleUpdateX.cancel()
  handleUpdateY.cancel()
})
</script>

<template>
  <ConfigPanel>
    <div class="flex items-center gap-1">
      <UINumberInput
        v-radar="{ name: 'X position input', desc: `Input to set ${name} X position` }"
        class="w-18"
        :value="localConfig.x"
        @update:value="handleUpdateX($event ?? 0)"
      >
        <template #prefix>X</template>
      </UINumberInput>
      <UINumberInput
        v-radar="{ name: 'Y position input', desc: `Input to set ${name} Y position` }"
        class="w-18"
        :value="localConfig.y"
        @update:value="handleUpdateY($event ?? 0)"
      >
        <template #prefix>Y</template>
      </UINumberInput>
      <UIDivider vertical />
      <UITooltip>
        {{ $t({ en: 'Back', zh: '返回' }) }}
        <template #trigger>
          <ConfigItem icon="back" @click="emit('back')" />
        </template>
      </UITooltip>
    </div>
  </ConfigPanel>
</template>
