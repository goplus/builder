<template>
  <div class="line">
    {{ sprite.name }}
    <UIIcon class="edit-icon" :title="$t({ en: 'Rename', zh: '重命名' })" type="edit" @click="handleNameEdit" />
  </div>
  <div class="line">
    <UINumberInput type="number" :value="sprite.x" @update:value="(x) => sprite.setX(x ?? 0)">
      <template #prefix>X:</template>
    </UINumberInput>
    <UINumberInput type="number" :value="sprite.y" @update:value="(y) => sprite.setY(y ?? 0)">
      <template #prefix>Y:</template>
    </UINumberInput>
    <UINumberInput
      type="number"
      :min="0"
      :value="sprite.size * 100"
      @update:value="(s) => sprite.setSize((s ?? 100) / 100)"
    >
      <template #prefix>
        {{ $t({ en: 'Size', zh: '大小' }) }}:
      </template>
    </UINumberInput>
  </div>
  <div class="line">
    <UINumberInput
      type="number"
      :min="-180"
      :max="180"
      :value="sprite.heading"
      @update:value="(h) => sprite.setHeading(h ?? 0)"
    >
      <template #prefix>
        {{
          $t({
            en: 'Heading',
            zh: '朝向'
          })
        }}:
      </template>
    </UINumberInput>
    <p class="with-label">
      {{ $t({ en: 'Show', zh: '显示' }) }}:
      <VisibleInput
        :value="sprite.visible"
        @update:value="(visible) => sprite.setVisible(visible)"
      />
    </p>
  </div>
  <div class="line">
    <!-- Entry for "add to library", its appearance or position may change later -->
    <UIButton @click="handleAddToLibrary(sprite)">Add to library</UIButton>
  </div>
</template>

<script setup lang="ts">
import { UINumberInput, UIButton, UIIcon, useModal } from '@/components/ui'
import type { Sprite } from '@/models/sprite'
import type { Project } from '@/models/project'
import { useAddAssetToLibrary } from '@/components/library'
import VisibleInput from '../common/VisibleInput.vue'
import SpriteRenameModal from './SpriteRenameModal.vue'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const renameSprite = useModal(SpriteRenameModal)

function handleNameEdit() {
  renameSprite({
    sprite: props.sprite,
    project: props.project
  })
}

const addToLibrary = useAddAssetToLibrary()

function handleAddToLibrary(sprite: Sprite) {
  addToLibrary(sprite)
}
</script>

<style scoped lang="scss">
.line {
  display: flex;
  gap: 12px;
  align-items: center;
}

.edit-icon {
  cursor: pointer;
}

.with-label {
  display: flex;
  gap: 4px;
  align-items: center;
}
</style>
