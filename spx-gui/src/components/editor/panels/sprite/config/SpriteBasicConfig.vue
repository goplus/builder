<script setup lang="ts">
import { UIIcon, UITooltip } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { type Sprite } from '@/models/sprite'
import { type Project } from '@/models/project'
import { useRenameSprite } from '@/components/asset'
import AssetName from '@/components/asset/AssetName.vue'
import SpritePositionSize from '@/components/editor/common/config/sprite/SpritePositionSize.vue'
import SpriteDirection from '@/components/editor/common/config/sprite/SpriteDirection.vue'
import SpriteVisible from '@/components/editor/common/config/sprite/SpriteVisible.vue'

const props = defineProps<{
  sprite: Sprite
  project: Project
}>()

const emit = defineEmits<{
  collapse: []
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
    <UITooltip>
      <template #trigger>
        <UIIcon
          v-radar="{ name: 'Collapse button', desc: 'Button to collapse the sprite basic configuration panel' }"
          class="icon"
          type="doubleArrowDown"
          @click="emit('collapse')"
        />
      </template>
      {{
        $t({
          en: 'Collapse',
          zh: '收起'
        })
      }}
    </UITooltip>
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
  </div>
</template>

<style scoped lang="scss">
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
