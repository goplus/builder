<script setup lang="ts">
import type { Sprite } from '@/models/sprite'

import { UIFormModal } from '@/components/ui'

import SpriteCollisionEditor from './SpriteCollisionEditor.vue'
import type { Project } from '@/models/project'

defineProps<{
  sprite: Sprite
  project: Project
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
      name: 'Sprite Collision Modal',
      desc: 'Sprite collision editor modal, which includes collision, pivot editing, etc.'
    }"
    style="width: 712px"
    :title="$t({ en: 'Sprite Collision Editor', zh: '精灵碰撞编辑器' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <SpriteCollisionEditor class="editor" :sprite="sprite" :project="project" @update-success="emit('resolved')" />
  </UIFormModal>
</template>

<style scoped lang="scss">
.checkbox {
  margin-top: 20px;
}
.editor {
  height: 456px;
}
</style>
