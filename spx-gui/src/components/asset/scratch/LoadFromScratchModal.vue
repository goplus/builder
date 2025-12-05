<template>
  <UIFormModal
    :radar="{ name: 'Load from Scratch modal', desc: 'Modal for importing assets from Scratch' }"
    :title="$t({ en: 'Import assets from Scratch', zh: '从 Scratch 项目文件导入素材' })"
    :visible="visible"
    style="width: 928px"
    @update:visible="emit('cancelled')"
  >
    <LoadFromScratch
      :project="project"
      :scratch-assets="exportedScratchAssets"
      @imported="(imported) => emit('resolved', imported)"
    />
  </UIFormModal>
</template>
<script setup lang="ts">
import type { Project } from '@/models/project'
import { UIFormModal } from '@/components/ui'
import type { ExportedScratchAssets } from '@/utils/scratch'
import type { AssetModel } from '@/models/common/asset'
import LoadFromScratch from './LoadFromScratch.vue'

defineProps<{
  project: Project
  exportedScratchAssets: ExportedScratchAssets
  visible: boolean
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [AssetModel[]]
}>()
</script>
