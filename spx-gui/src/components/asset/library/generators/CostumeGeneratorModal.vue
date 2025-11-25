<template>
  <UIFormModal
    :title="$t({ en: 'Generate Costume', zh: '生成造型' })"
    :visible="props.visible"
    style="width: 928px"
    @update:visible="emit('cancelled')"
  >
    <div class="generator-content">
      <CostumeGenerator :sprite="props.sprite" :settings="props.settings" @generated="handleGenerated" />
    </div>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UIFormModal } from '@/components/ui'
import type { Sprite } from '@/models/sprite'
import type { Costume } from '@/models/costume'
import type { AssetSettings } from '@/models/common/asset'
import CostumeGenerator from './CostumeGenerator.vue'

const props = defineProps<{
  visible: boolean
  sprite: Sprite
  settings?: AssetSettings
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [costume: Costume]
}>()

function handleGenerated(costume: Costume) {
  emit('resolved', costume)
}
</script>

<style lang="scss" scoped>
.generator-content {
  min-height: 400px;
}
</style>
