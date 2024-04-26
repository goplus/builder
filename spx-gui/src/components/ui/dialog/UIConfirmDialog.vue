<template>
  <UIDialog
    :visible="visible"
    :type="type"
    :title="title"
    style="width: 445px"
    @update:visible="emit('cancelled')"
  >
    <div>{{ content }}</div>
    <footer class="footer">
      <UIButton type="boring" @click="emit('cancelled')">
        {{ cancelText ?? config?.cancelText ?? 'Cancel' }}
      </UIButton>
      <UIButton type="primary" :loading="isConfirmLoading" @click="handleConfirm">
        {{ confirmText ?? config?.confirmText ?? 'Confirm' }}
      </UIButton>
    </footer>
  </UIDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useConfig } from '../UIConfigProvider.vue'
import UIButton from '../UIButton.vue'
import UIDialog from './UIDialog.vue'

export type Props = {
  visible: boolean
  type?: 'info' | 'warning' | 'error' | 'success'
  title: string
  content: string
  cancelText?: string
  confirmText?: string
  confirmHandler?: () => Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  type: 'warning',
  cancelText: undefined,
  confirmText: undefined,
  isConfirmLoading: false,
  confirmHandler: undefined
})

const config = useConfig().value.confirmDialog

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const isConfirmLoading = ref(false)

async function handleConfirm() {
  isConfirmLoading.value = true
  try {
    await props.confirmHandler?.()
    emit('resolved')
  } finally {
    isConfirmLoading.value = false
  }
}
</script>
<style scoped lang="scss">
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
