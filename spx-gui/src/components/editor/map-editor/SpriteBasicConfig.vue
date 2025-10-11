<script setup lang="ts">
import type { Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'

import SpritePositionSize from '@/components/editor/common/config/sprite/SpritePositionSize.vue'
import SpriteDirection from '@/components/editor/common/config/sprite/SpriteDirection.vue'
import SpriteVisible from '@/components/editor/common/config/sprite/SpriteVisible.vue'
import SpritePhysics from '@/components/editor/common/config/sprite/SpritePhysics.vue'
import AssetName from '@/components/asset/AssetName.vue'
import { UIIcon } from '@/components/ui'
import { useRenameSprite } from '@/components/asset'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const renameSprite = useRenameSprite()
const handleNameEdit = useMessageHandle(() => renameSprite(props.sprite), {
  en: 'Failed to rename sprite',
  zh: '重命名精灵失败'
}).fn
</script>

<template>
  <div class="header">
    <AssetName>{{ sprite.name }}</AssetName>
    <UIIcon
      v-radar="{ name: 'Rename button', desc: 'Button to rename the sprite' }"
      class="icon"
      :title="$t({ en: 'Rename', zh: '重命名' })"
      type="edit"
      @click="handleNameEdit"
    />
    <div class="spacer" />
  </div>
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
  </div>
</template>

<style lang="scss" scoped>
.header {
  height: 28px;
  color: var(--ui-color-title);
  display: flex;
  align-items: center;
}

.icon {
  cursor: pointer;
  color: var(--ui-color-grey-900);
  &:hover {
    color: var(--ui-color-grey-800);
  }
  &:active {
    color: var(--ui-color-grey-1000);
  }
}

.spacer {
  flex: 1;
}

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
