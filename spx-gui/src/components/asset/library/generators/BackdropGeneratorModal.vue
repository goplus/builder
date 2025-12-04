<template>
  <UIFormModal
    :title="$t({ en: 'Generate Backdrop', zh: '生成背景' })"
    :visible="props.visible"
    style="width: 928px"
    @update:visible="emit('cancelled')"
  >
    <div class="generator-content">
      <BackdropGenerator :project="props.project" :settings="props.settings" @generated="handleGenerated" />
    </div>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UIFormModal } from '@/components/ui'
import type { Project } from '@/models/project'
import type { Backdrop } from '@/models/backdrop'
import type { AssetSettings } from '@/models/common/asset'
import BackdropGenerator from './BackdropGenerator.vue'

const props = defineProps<{
  visible: boolean
  project: Project
  settings?: AssetSettings
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [backdrop: Backdrop]
}>()

function handleGenerated(backdrop: Backdrop) {
  emit('resolved', backdrop)
}
</script>

<style lang="scss" scoped>
.generator-content {
  min-height: 400px;
}
</style>
