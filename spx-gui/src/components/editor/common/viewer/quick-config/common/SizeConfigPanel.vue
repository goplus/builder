<script lang="ts" setup>
import { UINumberInput } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import { round } from '@/utils/utils'
import type { LocalConfig } from '../utils'

const props = defineProps<{
  name: 'sprite' | 'monitor'
  localConfig: LocalConfig
}>()

function handleSizePercentUpdate(sizeInPercent: number | null) {
  if (sizeInPercent == null) return
  props.localConfig.setSize(round(sizeInPercent / 100, 2))
  props.localConfig.syncSize()
}
</script>

<template>
  <ConfigPanel>
    <UINumberInput
      v-radar="{ name: 'Size input', desc: `Input to set ${name} size percentage` }"
      class="size-input"
      :min="0"
      :value="round(localConfig.size * 100)"
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
