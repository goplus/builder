<script setup lang="ts">
import type { Sprite } from '@/models/spx/sprite'
import type { SpriteGen } from '@/models/spx/gen/sprite-gen'
import { UIFormModal } from '@/components/ui'
import SpriteGenComp from './SpriteGen.vue'

defineProps<{
  visible: boolean
  gen: SpriteGen
}>()

const emit = defineEmits<{
  resolved: [Sprite]
  cancelled: []
}>()
</script>

<template>
  <UIFormModal
    :radar="{ name: 'Sprite generation modal', desc: 'Modal for sprite generation' }"
    :title="$t({ zh: '生成精灵', en: 'Sprite Generator' })"
    :visible="visible"
    :style="{ width: '1076px', height: '800px' }"
    :body-style="{ flex: '1 1 0', padding: '0' }"
    @update:visible="emit('cancelled')"
  >
    <SpriteGenComp :gen="gen" @collapse="emit('cancelled')" @finished="emit('resolved', $event)" />
  </UIFormModal>
</template>

<style lang="scss" scoped></style>
