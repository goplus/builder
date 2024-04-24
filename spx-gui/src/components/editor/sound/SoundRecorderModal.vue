<template>
  <UIFormModal
    :visible="visible"
    :title="
      $t({
        en: 'Record Sound',
        zh: '录制声音'
      })
    "
    center-title
    @update:visible="handleUpdateShowRecorder"
  >
    <SoundRecorder @saved="handleClose" @record-started="recordStarted = true" />
    <UIConfirmDialog
      :visible="showDialog"
      type="warning"
      :title="$t({ en: 'Quit recording?', zh: '退出录音？' })"
      :content="
        $t({
          en: 'The current content will not be saved. Are you sure you want to quit?',
          zh: '当前内容不会被保存，确定要退出吗？'
        })
      "
      :confirm-text="$t({ en: 'Quit', zh: '退出' })"
      @cancelled="showDialog = false"
      @resolved="handleClose"
    />
  </UIFormModal>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { UIFormModal, UIConfirmDialog } from '@/components/ui'
import SoundRecorder from './SoundRecorder.vue'

const recordStarted = ref(false)
const showDialog = ref(false)

defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
}>()

const handleUpdateShowRecorder = (visible: boolean) => {
  if (!visible) {
    if (recordStarted.value) {
      showDialog.value = true
    } else {
      handleClose()
    }
  } else {
    emit('update:visible', true)
  }
}

const handleClose = () => {
  emit('update:visible', false)
  recordStarted.value = false
  showDialog.value = false
}
</script>
