<script setup lang="ts">
import type { Sprite } from '@/models/spx/sprite'

import { UIFormModal } from '@/components/ui'

import SpriteCollisionEditor from './SpriteCollisionEditor.vue'
import type { SpxProject } from '@/models/spx/project'

defineProps<{
  sprite: Sprite
  project: SpxProject
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
    <SpriteCollisionEditor
      style="height: 456px"
      :sprite="sprite"
      :project="project"
      @update-success="emit('resolved')"
    />
  </UIFormModal>
</template>
