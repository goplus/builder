<script lang="ts" setup>
import type { BackdropGen } from '@/models/gen/backdrop-gen'
import { UIButton } from '@/components/ui'
import GenModal from '../common/GenModal.vue'
import BackdropGenComp from './BackdropGen.vue'

defineProps<{
  visible: boolean
  gen: BackdropGen
}>()

const emit = defineEmits<{
  resolved: []
  cancelled: []
}>()
</script>

<template>
  <GenModal
    :title="$t({ zh: '生成背景', en: 'Backdrop Generator' })"
    :visible="visible"
    @update:visible="emit('cancelled')"
  >
    <BackdropGenComp :gen="gen" />
    <template #footer>
      <UIButton color="secondary">{{ $t({ zh: '收起', en: 'Minimize' }) }}</UIButton>
      <UIButton>{{ $t({ zh: '采用', en: 'Use' }) }}</UIButton>
    </template>
  </GenModal>
</template>

<style lang="scss" scoped></style>
