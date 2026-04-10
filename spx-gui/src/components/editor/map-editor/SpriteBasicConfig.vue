<script setup lang="ts">
import { computed } from 'vue'

import type { SpxProject } from '@/models/spx/project'
import { PhysicsMode, type Sprite } from '@/models/spx/sprite'
import { useMessageHandle } from '@/utils/exception'

import SpritePositionSize from '@/components/editor/common/config/sprite/SpritePositionSize.vue'
import SpriteDirection from '@/components/editor/common/config/sprite/SpriteDirection.vue'
import SpriteVisible from '@/components/editor/common/config/sprite/SpriteVisible.vue'
import SpritePhysics from '@/components/editor/common/config/sprite/SpritePhysics.vue'
import { UIButton, UIIcon, UITooltip, useModal } from '@/components/ui'
import SpriteCollisionEditorModal from '../sprite/SpriteCollisionEditorModal.vue'
import { useRenameSprite } from '@/components/asset'
import AssetName from '@/components/asset/AssetName.vue'

const props = defineProps<{
  sprite: Sprite
  project: SpxProject
}>()

const emit = defineEmits<{
  collapse: []
}>()

const renameSprite = useRenameSprite()
const handleNameEdit = useMessageHandle(() => renameSprite(props.sprite), {
  en: 'Failed to rename sprite',
  zh: '重命名精灵失败'
}).fn

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
  <div class="h-7 flex items-center text-title">
    <AssetName>{{ sprite.name }}</AssetName>
    <UIIcon
      v-radar="{ name: 'Rename button', desc: 'Button to rename the sprite' }"
      class="cursor-pointer text-grey-900 transition-colors hover:text-grey-800 active:text-grey-1000"
      :title="$t({ en: 'Rename', zh: '重命名' })"
      type="edit"
      @click="handleNameEdit"
    />
    <div class="flex-1" />
    <UITooltip>
      <template #trigger>
        <UIIcon
          v-radar="{ name: 'Collapse button', desc: 'Button to collapse the sprite basic configuration panel' }"
          class="cursor-pointer text-grey-900 transition-colors hover:text-grey-800 active:text-grey-1000"
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
  <div class="flex flex-col gap-middle">
    <SpritePositionSize :sprite="sprite" :project="project" />
    <div class="flex items-center">
      <div class="mr-middle whitespace-nowrap">{{ $t({ en: 'Rotation', zh: '旋转' }) }}</div>
      <SpriteDirection :sprite="sprite" :project="project" />
    </div>
    <div class="flex items-center">
      <div class="mr-middle whitespace-nowrap">{{ $t({ en: 'Show', zh: '显示' }) }}</div>
      <SpriteVisible :sprite="sprite" :project="project" />
    </div>
    <div v-if="project.stage.physics.enabled" class="flex items-center">
      <div class="mr-middle whitespace-nowrap">{{ $t({ en: 'Physics', zh: '物理特性' }) }}</div>
      <SpritePhysics :sprite="sprite" :project="project" />
    </div>
    <div v-if="isCollisionSettingsEnabled" class="flex items-center">
      <div class="mr-middle whitespace-nowrap">{{ $t({ en: 'Collision settings', zh: '碰撞设置' }) }}</div>
      <UIButton icon="setting" color="secondary" variant="flat" @click="handleEditCollision"></UIButton>
    </div>
  </div>
</template>
