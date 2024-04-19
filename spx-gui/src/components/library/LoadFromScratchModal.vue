<template>
  <UIFormModal v-model:visible="visible" title="Load from scratch" size="large">
    <LoadFromScratch
      v-if="scratchAssets"
      :project="project"
      :scratch-assets="scratchAssets"
      @imported="visible = false"
    />
  </UIFormModal>
</template>
<script setup lang="ts">
import type { Project } from '@/models/project'
import { UIFormModal } from '../ui'
import LoadFromScratch from './LoadFromScratch.vue'
import { ref } from 'vue'
import { parseScratchFileAssets, type ExportedScratchAssets } from '@/utils/scratch'
import { selectFile } from '@/utils/file'

defineProps<{
  project: Project
}>()

const scratchAssets = ref<ExportedScratchAssets | null>(null)
const visible = ref(false)

defineExpose({
  open: async () => {
    const file = await selectFile({ accept: '.sb3' })
    const exportedScratchAssets = await parseScratchFileAssets(file)
    scratchAssets.value = exportedScratchAssets
    visible.value = true
  }
})
</script>
