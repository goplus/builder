<script setup lang="ts">
import type { Sprite } from '@/models/spx/sprite'
import { UIFormModal } from '@/components/ui'
import PivotCollisionEditor from './PivotCollisionEditor.vue'

defineProps<{
  sprite: Sprite
  enableCollisionEditing: boolean
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
      name: `Sprite Pivot${enableCollisionEditing ? ' & Collision ' : ' '}Modal`,
      desc: `Modal for editing sprite pivot${enableCollisionEditing ? ' and collision ' : ' '}settings.`
    }"
    style="width: 712px"
    :title="
      $t({
        en: `Sprite Pivot${enableCollisionEditing ? ' & Collision ' : ' '}Editor`,
        zh: `精灵参考点${enableCollisionEditing ? '和碰撞体' : ''}编辑器`
      })
    "
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <PivotCollisionEditor
      style="height: 456px"
      :sprite="sprite"
      :enable-collision-editing="enableCollisionEditing"
      @update-success="emit('resolved')"
    />
  </UIFormModal>
</template>
