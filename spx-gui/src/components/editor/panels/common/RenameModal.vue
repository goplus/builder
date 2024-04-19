<template>
  <UIFormModal
    class="rename-modal"
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

<style scoped lang="scss">
.rename-modal {
  // TODO: this (`width`) is not working
  // the data-v-xxx of this component is not correctly added to the modal element
  width: 512px;
}
</style>
