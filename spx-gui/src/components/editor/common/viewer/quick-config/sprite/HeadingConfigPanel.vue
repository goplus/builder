<script lang="ts" setup>
import { ref } from 'vue'
import { UIDropdown, UINumberInput } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import { RotationStyle } from '@/models/spx/sprite'
import AnglePicker from '@/components/editor/common/AnglePicker.vue'
import type { SpriteLocalConfig } from '../utils'
import { debounce } from 'lodash'

const props = defineProps<{
  localConfig: SpriteLocalConfig
}>()

const rotateDropdownVisible = ref(false)

function handleUpdateHeading(heading: number) {
  props.localConfig.setHeading(heading)
  props.localConfig.sync()
}
const handleUpdateHeadingDebounced = debounce(handleUpdateHeading, 300)
</script>

<template>
  <ConfigPanel>
    <UIDropdown
      trigger="manual"
      placement="top"
      :visible="rotateDropdownVisible"
      :disabled="localConfig.rotationStyle !== RotationStyle.Normal"
      @click-outside="rotateDropdownVisible = false"
    >
      <template #trigger>
        <UINumberInput
          v-radar="{ name: 'Heading input', desc: 'Input to set sprite heading angle' }"
          class="heading-input"
          :disabled="localConfig.rotationStyle !== RotationStyle.Normal"
          :min="-180"
          :max="180"
          :value="localConfig.heading"
          @update:value="handleUpdateHeadingDebounced($event ?? 0)"
          @focus="rotateDropdownVisible = true"
        >
          <template #prefix>{{ $t({ en: 'Heading', zh: '朝向' }) }}</template>
        </UINumberInput>
      </template>
      <div class="rotation-heading-container">
        <AnglePicker :model-value="localConfig.heading" @update:model-value="handleUpdateHeading($event ?? 0)" />
      </div>
    </UIDropdown>
  </ConfigPanel>
</template>

<style lang="scss" scoped>
.heading-input {
  width: 130px;
}

.rotation-heading-container {
  padding: 12px;
  width: max-content;
}
</style>
