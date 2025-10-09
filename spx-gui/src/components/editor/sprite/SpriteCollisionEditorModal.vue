<script setup lang="ts">
import { ref } from 'vue'

import type { Sprite } from '@/models/sprite'
import { useMessageHandle } from '@/utils/exception'

import { UIButton, UIFormModal } from '@/components/ui'

import SpriteCollisionEditor, { type CollisionParams } from './SpriteCollisionEditor.vue'
import type { Project } from '@/models/project'

const props = defineProps<{
  sprite: Sprite
  project: Project
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

/** Whether the values have been modified */
const dirty = ref(false)
const collisionParams = ref<CollisionParams>({
  pivotPos: { x: 0, y: 0 },
  colliderSize: { width: 0, height: 0 },
  colliderPos: { x: 0, y: 0 }
})

function handleUpdateCollisionParams(params: CollisionParams) {
  dirty.value = true
  collisionParams.value = params
}

const { fn: handleConfirm } = useMessageHandle(
  async () => {
    const sprite = props.sprite
    const defaultCostume = props.sprite.defaultCostume
    if (defaultCostume == null) throw new Error('Sprite has no default costume')

    await props.project.history.doAction({ name: { en: 'Update sprite collision', zh: '更新精灵碰撞' } }, () => {
      const { pivotPos, colliderSize, colliderPos } = collisionParams.value
      sprite.applyCostumesPivotChange({
        x: pivotPos.x - defaultCostume.pivot.x,
        y: pivotPos.y - defaultCostume.pivot.y
      })
      sprite.setCollisionPivot({
        x: colliderPos.x + colliderSize.width / 2 - pivotPos.x,
        y: -(colliderPos.y + colliderSize.height / 2 - pivotPos.y)
      })
      sprite.setCollisionShapeRect(colliderSize.width, colliderSize.height)
    })
    dirty.value = false
    emit('resolved')
  },
  {
    en: 'Failed to save sprite collision params',
    zh: '保存精灵碰撞参数失败'
  },
  {
    en: 'Save sprite collision params successfully',
    zh: '保存精灵碰撞参数成功'
  }
)
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Collision modal', desc: 'Collision editor modal, which includes collision, pivot editing, etc.' }"
    style="width: 712px"
    :title="$t({ en: 'Collision Editor', zh: '碰撞编辑器' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <SpriteCollisionEditor class="editor" :sprite="sprite" @update-collision-params="handleUpdateCollisionParams" />

    <div class="action">
      <UIButton
        v-radar="{ name: 'Save button', desc: 'Click to save sprite collision params' }"
        type="primary"
        :disabled="!dirty"
        @click="handleConfirm"
      >
        {{ $t({ en: 'Save', zh: '保存' }) }}
      </UIButton>
    </div>
  </UIFormModal>
</template>

<style scoped lang="scss">
.checkbox {
  margin-top: 20px;
}
.editor {
  height: 456px;
  border-radius: var(--ui-border-radius-2);
}
.action {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>
