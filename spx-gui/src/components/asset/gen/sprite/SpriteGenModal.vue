<script setup lang="ts">
import type { Sprite } from '@/models/sprite'
import type { SpriteGen } from '@/models/gen/sprite-gen'
import GenModal from '../common/GenModal.vue'
import SpriteGenComp from './SpriteGen.vue'

defineProps<{
  visible: boolean
  gen: SpriteGen
}>()

const emit = defineEmits<{
  resolved: [SpriteGen | Sprite]
  cancelled: []
}>()
</script>

<template>
  <GenModal
    :title="$t({ zh: '生成精灵', en: 'Sprite Generator' })"
    :visible="visible"
    :style="{ width: '1076px', height: '800px' }"
    @update:visible="emit('cancelled')"
  >
    <SpriteGenComp :gen="gen" @collapse="emit('resolved', gen)" @finished="emit('resolved', $event)" />
  </GenModal>
</template>

<style lang="scss" scoped></style>
