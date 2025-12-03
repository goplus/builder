<template>
  <UIFormModal
    :title="$t({ en: 'Generate Animation', zh: '生成动画' })"
    :visible="props.visible"
    style="width: 928px"
    @update:visible="emit('cancelled')"
  >
    <div class="generator-content">
      <AnimationGenerator :sprite="props.sprite" :settings="props.settings" @generated="handleGenerated" />
    </div>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UIFormModal } from '@/components/ui'
import type { Sprite } from '@/models/sprite'
import type { Animation } from '@/models/animation'
import type { AssetSettings } from '@/models/common/asset'
import AnimationGenerator from './AnimationGenerator.vue'

const props = defineProps<{
  visible: boolean
  sprite: Sprite
  settings?: AssetSettings
}>()

const emit = defineEmits<{
  cancelled: []
  resolved: [animation: Animation]
}>()

function handleGenerated(animation: Animation) {
  emit('resolved', animation)
}
</script>

<style lang="scss" scoped>
.generator-content {
  min-height: 400px;
}
</style>
