<template>
  <UIFormModal
    size="large"
    :title="$t({ en: 'Import assets from Scratch', zh: '从 Scratch 导入资源' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <LoadFromScratch
      :project="project"
      :scratch-assets="exportedScratchAssets"
      @imported="emit('resolved')"
    />
  </UIFormModal>
</template>
<script setup lang="ts">
import type { Project } from '@/models/project'
import { UIFormModal } from '../ui'
import LoadFromScratch from './LoadFromScratch.vue'
import type { ExportedScratchAssets } from '@/utils/scratch'

defineProps<{
  project: Project
  exportedScratchAssets: ExportedScratchAssets
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()
</script>
