<template>
  <UIFormModal
    class="rename-modal"
    style="width: 512px"
    :title="$t({ en: 'Rename', zh: '重命名' })"
    :visible="visible"
    @update:visible="emit('cancel')"
  >
    <slot></slot>
  </UIFormModal>
</template>

<script setup lang="ts">
import { UIFormModal } from '@/components/ui'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancel: []
}>()
</script>
