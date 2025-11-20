<template>
  <UIFormModal
    :title="$t({ en: 'Generate Sprite', zh: '生成精灵' })"
    :visible="props.visible"
    @update:visible="emit('cancelled')"
  >
    <div class="generator-content">
      <SpriteGenerator :project="props.project" :settings="props.settings" @generated="handleGenerated" />
    </div>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UIFormModal } from '@/components/ui'
import type { Project } from '@/models/project'
import type { Sprite } from '@/models/sprite'
import type { AssetSettings } from '@/models/common/asset'
import SpriteGenerator from './SpriteGenerator.vue'

const props = defineProps<{
  visible: boolean
  project: Project
  settings?: AssetSettings
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [sprite: Sprite]
}>()

function handleGenerated(sprite: Sprite) {
  emit('resolved', sprite)
}
</script>

<style lang="scss" scoped>
.generator-content {
  min-height: 400px;
}
</style>
