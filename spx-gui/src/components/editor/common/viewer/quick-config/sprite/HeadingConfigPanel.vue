<script lang="ts" setup>
import { ref } from 'vue'
import { UIDropdown, UINumberInput } from '@/components/ui'
import ConfigPanel from '../common/ConfigPanel.vue'
import { RotationStyle, type Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import { wrapUpdateHandler } from '@/components/editor/common/config/utils'
import AnglePicker from '@/components/editor/common/AnglePicker.vue'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const spriteContext = () => ({
  sprite: props.sprite,
  project: props.project
})

const rotateDropdownVisible = ref(false)
const handleHeadingUpdate = wrapUpdateHandler(
  (h: number | null) => props.sprite.setHeading(h ?? 0),
  spriteContext,
  false
)
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
          :value="sprite.heading"
          @update:value="handleHeadingUpdate"
          @focus="rotateDropdownVisible = true"
        >
          <template #prefix>{{ $t({ en: 'Heading', zh: '朝向' }) }}</template>
        </UINumberInput>
      </template>
      <div class="rotation-heading-container">
        <AnglePicker :model-value="sprite.heading" @update:model-value="handleHeadingUpdate" />
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
