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
    <UIDialog
      v-model:visible="showDialog"
      type="warning"
      :title="
        $t({
          en: 'Quit Recording?',
          zh: '退出录音？'
        })
      "
      size="small"
    >
      <div>
        <div>
          {{
            $t({
              en: 'The current content will not be saved. Are you sure you want to quit?',
              zh: '当前内容不会被保存，确定要退出吗？'
            })
          }}
        </div>
        <div class="button-container">
          <UIButton type="boring" @click="showDialog = false">
            {{
              $t({
                en: 'Cancel',
                zh: '取消'
              })
            }}
          </UIButton>
          <UIButton type="primary" @click="handleClose">
            {{
              $t({
                en: 'Leave',
                zh: '离开'
              })
            }}
          </UIButton>
        </div>
      </div>
    </UIDialog>
  </UIFormModal>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { UIFormModal, UIDialog, UIButton } from '@/components/ui'
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
<style lang="scss" scoped>
.button-container {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 16px;
}
</style>
