<script setup lang="ts">
import { type Sprite } from '@/models/sprite'
import { type Project } from '@/models/project'
import SpritePositionSize from '@/components/editor/common/config/sprite/SpritePositionSize.vue'
import SpriteDirection from '@/components/editor/common/config/sprite/SpriteDirection.vue'
import SpriteVisible from '@/components/editor/common/config/sprite/SpriteVisible.vue'
import SpriteConfigPanel from '@/components/editor/common/config/sprite/SpriteConfigPanel.vue'

defineProps<{
  sprite: Sprite
  project: Project
}>()
</script>

<template>
  <SpriteConfigPanel :project="project" :sprite="sprite">
    <div class="config-wrapper">
      <SpritePositionSize :sprite="sprite" :project="project" />
      <div class="config-item">
        <div class="label">{{ $t({ en: 'Rotation', zh: '旋转' }) }}</div>
        <SpriteDirection :sprite="sprite" :project="project" />
      </div>
      <div class="config-item">
        <div class="label">{{ $t({ en: 'Show', zh: '显示' }) }}</div>
        <SpriteVisible :sprite="sprite" :project="project" />
      </div>
    </div>
  </SpriteConfigPanel>
</template>

<style scoped lang="scss">
.config-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap-middle);

  .config-item {
    display: flex;
    align-items: center;

    .label {
      white-space: nowrap;
      margin-right: 16px;
    }
  }
}
</style>
