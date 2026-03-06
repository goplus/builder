<script lang="ts" setup>
import { onBeforeUnmount } from 'vue'
import { debounce } from 'lodash'
import { UIDivider, UINumberInput, UITooltip } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import ConfigItem from '../common/ConfigItem.vue'
import { round } from '@/utils/utils'
import type { LocalConfig } from '../utils'

const props = defineProps<{
  name: 'sprite' | 'monitor'
  localConfig: LocalConfig
}>()

const emit = defineEmits<{
  back: []
}>()

const handleSizePercentUpdate = debounce((sizeInPercent: number | null) => {
  if (sizeInPercent == null) return
  props.localConfig.setSize(round(sizeInPercent / 100, 2))
  props.localConfig.sync()
}, 300)

onBeforeUnmount(() => handleSizePercentUpdate.cancel())
</script>

<template>
  <ConfigPanel>
    <div class="size-config-wrapper">
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

<style lang="scss" scoped>
.size-config-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.size-input {
  width: 102px;
}
</style>
