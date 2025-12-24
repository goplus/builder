<script lang="ts" setup>
import { ref } from 'vue'
import { UIDropdown, UINumberInput } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import { RotationStyle, type Sprite } from '@/models/sprite'
import AnglePicker from '@/components/editor/common/AnglePicker.vue'

defineProps<{
  sprite: Sprite
  heading: number
}>()

defineEmits<{
  'update:heading': [number]
}>()

const rotateDropdownVisible = ref(false)
</script>

<template>
  <ConfigPanel>
    <UIDropdown
      trigger="manual"
      placement="top"
      :visible="rotateDropdownVisible"
      :disabled="sprite.rotationStyle === RotationStyle.None"
      @click-outside="rotateDropdownVisible = false"
    >
      <template #trigger>
        <UINumberInput
          v-radar="{ name: 'Heading input', desc: 'Input to set sprite heading angle' }"
          class="heading-input"
          :disabled="sprite.rotationStyle === RotationStyle.None"
          :min="-180"
          :max="180"
          :value="heading"
          @update:value="$emit('update:heading', $event ?? 0)"
          @focus="rotateDropdownVisible = true"
        >
          <template #prefix>{{ $t({ en: 'Heading', zh: '朝向' }) }}</template>
        </UINumberInput>
      </template>
      <div class="rotation-heading-container">
        <AnglePicker :model-value="heading" @update:model-value="$emit('update:heading', $event ?? 0)" />
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
