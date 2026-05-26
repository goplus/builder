<script setup lang="ts">
import type { Sprite } from '@/models/spx/sprite'
import { UIFormModal } from '@/components/ui'
import PivotCollisionEditor from './PivotCollisionEditor.vue'

defineProps<{
  sprite: Sprite
  collisionEditingEnabled: boolean
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()
</script>

<template>
  <UIFormModal
    :radar="{
      name: `Sprite pivot${collisionEditingEnabled ? ' & collision ' : ' '}modal`,
      desc: `Modal for editing sprite pivot${collisionEditingEnabled ? ' and collision ' : ' '}settings.`
    }"
    style="width: 712px"
    :title="
      $t({
        en: `Sprite pivot${collisionEditingEnabled ? ' & collision ' : ' '}editor`,
        zh: `精灵参考点${collisionEditingEnabled ? '和碰撞体' : ''}编辑器`
      })
    "
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <PivotCollisionEditor
      style="height: 456px"
      :sprite="sprite"
      :collision-editing-enabled="collisionEditingEnabled"
      @update-success="emit('resolved')"
    />
  </UIFormModal>
</template>
