<template>
  <UIFormModal
    :title="$t({ en: 'Generate Sound', zh: '生成声音' })"
    :visible="props.visible"
    style="width: 928px"
    @update:visible="emit('cancelled')"
  >
    <div class="generator-content">
      <SoundGenerator :project="props.project" :settings="props.settings" @generated="handleGenerated" />
    </div>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UIFormModal } from '@/components/ui'
import type { Project } from '@/models/project'
import type { Sound } from '@/models/sound'
import type { AssetSettings } from '@/models/common/asset'
import SoundGenerator from './SoundGenerator.vue'

const props = defineProps<{
  visible: boolean
  project: Project
  settings?: AssetSettings
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [sound: Sound]
}>()

function handleGenerated(sound: Sound) {
  emit('resolved', sound)
}
</script>

<style lang="scss" scoped>
.generator-content {
  min-height: 400px;
}
</style>
