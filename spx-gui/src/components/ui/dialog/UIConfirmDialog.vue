<template>
  <UIDialog
    style="width: 445px"
    :visible="visible"
    :type="type"
    :title="title"
    :mask-closable="false"
    @update:visible="emit('cancelled')"
  >
    <div>{{ content }}</div>
    <footer class="footer">
      <UIButton
        v-radar="{ name: 'Cancel button', desc: 'Click to cancel current action' }"
        color="boring"
        @click="emit('cancelled')"
      >
        {{ cancelText ?? config?.cancelText ?? 'Cancel' }}
      </UIButton>
      <UIButton
        ref="confirmBtnRef"
        v-radar="{ name: 'Confirm button', desc: 'Click to confirm current action' }"
        color="primary"
        :loading="isConfirmLoading"
        @click="handleConfirm"
      >
        {{ confirmText ?? config?.confirmText ?? 'Confirm' }}
      </UIButton>
    </footer>
  </UIDialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { untilNotNull } from '@/utils/utils'
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
  confirmHandler?: () => unknown
  autoConfirm?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'warning',
  cancelText: undefined,
  confirmText: undefined,
  confirmHandler: undefined,
  autoConfirm: false
})

const config = useConfig().confirmDialog

const emit = defineEmits<{
  cancelled: []
  resolved: []
}>()

const confirmBtnRef = ref<InstanceType<typeof UIButton>>()
watch(
  () => props.visible,
  async (visible) => {
    if (!visible) return
    const confirmBtn = await untilNotNull(confirmBtnRef)
    confirmBtn.focus()
  }
)

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

onMounted(() => {
  if (props.autoConfirm) handleConfirm()
})
</script>
<style scoped lang="scss">
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
