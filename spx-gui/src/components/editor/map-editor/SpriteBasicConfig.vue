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
import PivotCollisionEditorModal from '../sprite/PivotCollisionEditorModal.vue'
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

const isCollisionEditingEnabled = computed(() => {
  if (!props.project.stage.physics.enabled) return false
  if (props.sprite.physicsMode === PhysicsMode.NoPhysics) return false
  return true
})

const editPivotCollision = useModal(PivotCollisionEditorModal)
const handleEditPivotCollision = useMessageHandle(
  () =>
    editPivotCollision({
      sprite: props.sprite,
      collisionEditingEnabled: true
    }),
  {
    en: 'Failed to update sprite pivot or collision',
    zh: '更新精灵参考点或碰撞体失败'
  }
).fn
const handleEditPivot = useMessageHandle(
  () =>
    editPivotCollision({
      sprite: props.sprite,
      collisionEditingEnabled: false
    }),
  {
    en: 'Failed to update sprite pivot',
    zh: '更新精灵参考点失败'
  }
).fn
</script>

<template>
  <div class="h-7 flex items-center text-title">
    <AssetName>{{ sprite.name }}</AssetName>
    <UIIcon
      v-radar="{ name: 'Rename button', desc: 'Button to rename the sprite' }"
      class="ml-md cursor-pointer text-grey-900 transition-colors hover:text-grey-800 active:text-grey-1000"
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
  <div class="flex flex-col gap-xl">
    <SpritePositionSize :sprite="sprite" :project="project" />
    <div class="flex items-center">
      <div class="mr-4 whitespace-nowrap">{{ $t({ en: 'Rotation', zh: '旋转' }) }}</div>
      <SpriteDirection :sprite="sprite" :project="project" />
    </div>
    <div class="flex items-center">
      <div class="mr-4 whitespace-nowrap">{{ $t({ en: 'Show', zh: '显示' }) }}</div>
      <SpriteVisible :sprite="sprite" :project="project" />
    </div>
    <div v-if="project.stage.physics.enabled" class="flex items-center">
      <div class="mr-4 whitespace-nowrap">{{ $t({ en: 'Physics', zh: '物理特性' }) }}</div>
      <SpritePhysics :sprite="sprite" :project="project" />
    </div>
    <div class="flex items-center">
      <div class="mr-4 whitespace-nowrap">
        {{
          $t({
            en: `Pivot${isCollisionEditingEnabled ? ' & collision' : ''}`,
            zh: `参考点${isCollisionEditingEnabled ? '和碰撞体' : ''}`
          })
        }}
      </div>
      <template v-if="isCollisionEditingEnabled">
        <UITooltip>
          {{
            $t({
              en: 'Set the pivot point of the sprite and adjust the collision area',
              zh: '设置精灵的坐标基准，并调整可发生碰撞的范围'
            })
          }}
          <template #trigger>
            <UIButton shape="square" icon="setting" type="white" @click="handleEditPivotCollision"></UIButton>
          </template>
        </UITooltip>
      </template>
      <template v-else>
        <UITooltip>
          {{
            $t({
              en: 'Set the pivot point of the sprite',
              zh: '设置精灵的坐标基准'
            })
          }}
          <template #trigger>
            <UIButton shape="square" icon="setting" type="white" @click="handleEditPivot"></UIButton>
          </template>
        </UITooltip>
      </template>
    </div>
  </div>
</template>
