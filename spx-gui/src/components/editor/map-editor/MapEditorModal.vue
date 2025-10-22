<script setup lang="ts">
import { UIFullScreenModal, UIFullScreenModalHeader } from '@/components/ui'
import type { Project } from '@/models/project'
import MapEditor from './MapEditor.vue'

defineProps<{
  visible: boolean
  project: Project
  selectedSpriteId: string | null
}>()

const emit = defineEmits<{
  resolved: []
  cancelled: []
}>()
</script>

<template>
  <UIFullScreenModal :visible="visible" @update:visible="emit('cancelled')">
    <UIFullScreenModalHeader @close="emit('cancelled')">
      <h2 class="title">
        {{
          $t({
            en: 'Edit map',
            zh: '编辑地图'
          })
        }}
      </h2>
    </UIFullScreenModalHeader>
    <MapEditor class="editor" :project="project" :selected-sprite-id="selectedSpriteId" />
  </UIFullScreenModal>
</template>

<style lang="scss" scoped>
.title {
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor {
  padding: var(--ui-gap-middle);
}
</style>
