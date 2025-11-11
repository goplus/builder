<script setup lang="ts">
import { computed } from 'vue'

import type { Project } from '@/models/project'
import { PhysicsMode, type Sprite } from '@/models/sprite'
import { useMessageHandle } from '@/utils/exception'

import SpritePositionSize from '@/components/editor/common/config/sprite/SpritePositionSize.vue'
import SpriteDirection from '@/components/editor/common/config/sprite/SpriteDirection.vue'
import SpriteVisible from '@/components/editor/common/config/sprite/SpriteVisible.vue'
import SpritePhysics from '@/components/editor/common/config/sprite/SpritePhysics.vue'
import { UIIcon, useModal } from '@/components/ui'
import SpriteCollisionEditorModal from '../sprite/SpriteCollisionEditorModal.vue'
import SpriteConfigPanel from '../common/config/sprite/SpriteConfigPanel.vue'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const isCollisionSettingsEnabled = computed(() => {
  if (!props.project.stage.physics.enabled) return false
  if (props.sprite.physicsMode === PhysicsMode.NoPhysics) return false
  return true
})

const editSpriteCollision = useModal(SpriteCollisionEditorModal)
const handleEditCollision = useMessageHandle(
  () => editSpriteCollision({ sprite: props.sprite, project: props.project }),
  {
    en: 'Failed to update sprite collision',
    zh: '更新精灵碰撞失败'
  }
).fn
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
      <div v-if="project.stage.physics.enabled" class="config-item">
        <div class="label">{{ $t({ en: 'Physics', zh: '物理特性' }) }}</div>
        <SpritePhysics :sprite="sprite" :project="project" />
      </div>
      <div v-if="isCollisionSettingsEnabled" class="config-item">
        <div class="label">{{ $t({ en: 'Collision settings', zh: '碰撞设置' }) }}</div>
        <button class="edit-collision-button" @click="handleEditCollision">
          <UIIcon type="setting" />
        </button>
      </div>
    </div>
  </SpriteConfigPanel>
</template>

<style lang="scss" scoped>
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

.edit-collision-button {
  border: none;
  outline: none;
  border-radius: var(--ui-border-radius-1);
  padding: 8px;
  color: var(--ui-color-grey-900);
  background-color: var(--ui-color-grey-300);
  cursor: pointer;

  &:hover {
    color: var(--ui-color-primary-400);
    background-color: var(--ui-color-primary-200);
  }
  &:active {
    color: var(--ui-color-primary-500);
    background-color: var(--ui-color-primary-300);
  }
}
</style>
