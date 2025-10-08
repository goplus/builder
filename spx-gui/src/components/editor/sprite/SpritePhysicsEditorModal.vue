<script setup lang="ts">
import { ref } from 'vue'

import type { Sprite } from '@/models/sprite'
import { useMessageHandle } from '@/utils/exception'

import { UIButton, UIFormModal } from '@/components/ui'

import SpritePhysicsEditor, { type PhysicsParams } from './SpritePhysicsEditor.vue'
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
const physicsParams = ref<PhysicsParams>({
  pivotPos: { x: 0, y: 0 },
  colliderSize: { width: 0, height: 0 },
  colliderPos: { x: 0, y: 0 }
})

function handleUpdatePhysicsParams(params: PhysicsParams) {
  dirty.value = true
  physicsParams.value = params
}

const { fn: handleConfirm } = useMessageHandle(
  async () => {
    const sprite = props.sprite
    const defaultCostume = props.sprite.defaultCostume
    if (defaultCostume == null) throw new Error('Sprite has no default costume')

    await props.project.history.doAction({ name: { en: 'Update sprite settings', zh: '更新精灵设置' } }, () => {
      const { pivotPos, colliderSize, colliderPos } = physicsParams.value
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
    en: 'Failed to save sprite settings',
    zh: '保存精灵设置失败'
  }
)
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Physics modal', desc: 'Physics settings modal, which includes collision, pivot editing, etc.' }"
    style="width: 560px"
    :title="$t({ en: 'Physics', zh: '物理' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <SpritePhysicsEditor class="editor" :sprite="sprite" @update-physics-params="handleUpdatePhysicsParams" />

    <div class="action">
      <UIButton
        v-radar="{ name: 'Save button', desc: 'Click to save sprite physics' }"
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
}
.action {
  margin-top: 40px;
}
</style>
